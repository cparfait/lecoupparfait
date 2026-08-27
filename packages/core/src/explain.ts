/**
 * Générateur d'explications en langue naturelle.
 *
 * C'est la pièce qui distingue cet outil d'un simple moteur : au lieu
 * d'afficher « −2.4 », il écrit « Tu viens de laisser ton cavalier en f3 sans
 * défense : les Noirs le prennent gratuitement avec le pion g4. »
 *
 * Le texte produit sert à la fois à l'affichage écrit et à la synthèse vocale,
 * d'où la variante `speech` — plus courte, sans symboles imprononçables.
 *
 * Aucune génération probabiliste ici : ce sont des gabarits déterministes
 * alimentés par les motifs détectés. Toujours la même explication pour la même
 * position, et jamais d'affirmation inventée.
 */

import { Chess, SQUARES } from 'chess.js'
import type { Color, PieceSymbol, Square } from 'chess.js'
import {
  COLOR_NAMES,
  PIECE_NAMES,
  opposite,
  SAN_LETTER_EN,
  SAN_LETTER_FR,
  SIMPLE_VALUES,
} from './board.ts'
import { QUALITY_STYLES } from './classify.ts'
import { advantageLabel, formatScore } from './eval.ts'
import type { DetectedMotif, MotifId, MoveQuality, Score } from './types.ts'

export type Locale = 'fr' | 'en'

// ─────────────────────────────────────────────────────────────────────────────
//  Notation localisée
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Traduit une notation algébrique anglaise en notation française.
 * `Nf3` → `Cf3`, `Qxd5+` → `Dxd5+`, `O-O` reste inchangé.
 */
export function sanToFrench(san: string): string {
  if (san.startsWith('O-O')) return san
  const map: Record<string, string> = { N: 'C', B: 'F', R: 'T', Q: 'D', K: 'R' }
  return san.replace(/[NBRQK]/g, (letter) => map[letter] ?? letter)
}

/** Notation dans la langue demandée. */
export function localiseSan(san: string, locale: Locale): string {
  return locale === 'fr' ? sanToFrench(san) : san
}

/**
 * Notation épelée pour la synthèse vocale.
 * `Cf3` devient « cavalier f 3 », `O-O` devient « petit roque ».
 */
export function sanToSpeech(san: string, locale: Locale): string {
  const fr = locale === 'fr'
  if (san.startsWith('O-O-O')) return fr ? 'grand roque' : 'queenside castles'
  if (san.startsWith('O-O')) return fr ? 'petit roque' : 'kingside castles'

  // La notation arrive presque toujours **en anglais** : c'est ce que produit
  // chess.js, et c'est le format d'échange du projet. On la reconnaît donc en
  // premier, et on n'essaie la notation localisée qu'à défaut.
  //
  // L'ordre compte : « R » désigne la tour en anglais et le roi en français.
  // Chercher d'abord les lettres françaises faisait lire « Cf3 » à un « Nf3 »
  // qui n'y ressemble pas — aucune lettre ne correspondait, et tous les coups
  // de pièce étaient annoncés « pion ».
  const found =
    matchPiece(san, SAN_LETTER_EN) ?? (fr ? matchPiece(san, SAN_LETTER_FR) : null)

  let rest = san
  let spoken = ''
  if (found) {
    spoken = PIECE_NAMES[found.piece][locale]
    rest = san.slice(found.length)
  } else {
    spoken = fr ? 'pion' : 'pawn'
  }

  const capture = rest.includes('x')
  rest = rest.replace('x', '')

  const check = rest.endsWith('+')
  const mate = rest.endsWith('#')
  rest = rest.replace(/[+#]/g, '')

  const promotion = rest.match(/=([QRBNDTFC])/)
  rest = rest.replace(/=[QRBNDTFC]/, '')

  const target = rest.slice(-2)
  const parts = [spoken]
  if (capture) parts.push(fr ? 'prend en' : 'takes on')
  parts.push(spellSquare(target, locale))
  if (promotion) {
    parts.push(fr ? 'promu en dame' : 'promotes to queen')
  }
  if (mate) parts.push(fr ? 'échec et mat' : 'checkmate')
  else if (check) parts.push(fr ? 'échec' : 'check')
  return parts.join(' ')
}

/** Reconnaît la lettre de pièce en tête d'un coup, dans une notation donnée. */
function matchPiece(
  san: string,
  letters: Record<PieceSymbol, string>,
): { piece: PieceSymbol; length: number } | null {
  for (const [piece, letter] of Object.entries(letters) as Array<[PieceSymbol, string]>) {
    if (letter !== '' && san.startsWith(letter)) return { piece, length: letter.length }
  }
  return null
}

/** Épelle une case : `f3` → « f 3 ». */
export function spellSquare(square: string, locale: Locale): string {
  if (square.length !== 2) return square
  const file = square[0]!
  const rank = square[1]!
  // En français on épelle la lettre telle quelle ; l'accent tonique du moteur
  // vocal la rend correctement.
  return locale === 'fr' ? `${file} ${rank}` : `${file} ${rank}`
}

function pieceName(type: PieceSymbol, locale: Locale): string {
  return PIECE_NAMES[type][locale]
}

function colorName(color: Color, locale: Locale): string {
  return COLOR_NAMES[color][locale]
}

/** « le cavalier », « la dame » — accord de l'article français. */
function pieceWithArticle(type: PieceSymbol, locale: Locale): string {
  if (locale === 'en') return `the ${PIECE_NAMES[type].en}`
  const feminine = type === 'r' || type === 'q'
  return `${feminine ? 'la' : 'le'} ${PIECE_NAMES[type].fr}`
}

/** « ton cavalier », « ta dame ». */
function pieceWithPossessive(type: PieceSymbol, locale: Locale): string {
  if (locale === 'en') return `your ${PIECE_NAMES[type].en}`
  const feminine = type === 'r' || type === 'q'
  return `${feminine ? 'ta' : 'ton'} ${PIECE_NAMES[type].fr}`
}

/** Valeur en pions, pour dire « tu perds trois pions de matériel ». */
function materialWord(centipawns: number, locale: Locale): string {
  const pawns = Math.round(centipawns / 100)
  if (locale === 'en') return `${pawns} point${pawns > 1 ? 's' : ''} of material`
  return `${pawns} point${pawns > 1 ? 's' : ''} de matériel`
}

// ─────────────────────────────────────────────────────────────────────────────
//  Catalogue des motifs
// ─────────────────────────────────────────────────────────────────────────────

export interface MotifCopy {
  /** Nom court du motif, pour les étiquettes. */
  name: string
  /** Définition générale, affichée en info-bulle et dans le glossaire. */
  definition: string
  /** Phrase contextualisée dans la position courante. */
  sentence: (m: DetectedMotif, ctx: ExplainContext) => string
}

export interface ExplainContext {
  locale: Locale
  /** Position après le coup. */
  board: Chess
  /** Camp dont on explique le point de vue (celui qui vient de jouer). */
  mover: Color
  /** Coup joué en notation localisée. */
  san: string
}

const squares = (m: DetectedMotif) => m.squares.join(', ')

function pieceAt(ctx: ExplainContext, square: Square | undefined): string {
  if (!square) return ctx.locale === 'fr' ? 'la pièce' : 'the piece'
  const piece = ctx.board.get(square)
  if (!piece) return ctx.locale === 'fr' ? 'la pièce' : 'the piece'
  return pieceWithArticle(piece.type, ctx.locale)
}

/**
 * Textes français de chaque motif.
 *
 * Le ton est celui d'un entraîneur bienveillant qui tutoie : on s'adresse à un
 * débutant, pas à un lecteur d'ouvrage de théorie.
 */
const MOTIFS_FR: Partial<Record<MotifId, MotifCopy>> = {
  hangingPiece: {
    name: 'Pièce en prise',
    definition:
      "Une pièce attaquée qui n'est pas suffisamment défendue : l'adversaire peut la prendre en gagnant du matériel.",
    sentence: (m, ctx) => {
      const type = (m.detail?.piece as PieceSymbol) ?? 'p'
      const square = m.squares[0]
      const gain = Number(m.detail?.gain ?? 0)
      if (m.detail?.ownBlunder) {
        return `${capitalise(pieceWithPossessive(type, 'fr'))} en ${square} reste sans défense suffisante : l'adversaire le récupère et gagne ${materialWord(gain, 'fr')}.`
      }
      return `${capitalise(pieceWithArticle(type, 'fr'))} adverse en ${square} est en prise — ${materialWord(gain, 'fr')} à récupérer.`
    },
  },
  fork: {
    name: 'Fourchette',
    definition:
      'Une seule pièce attaque simultanément deux cibles ou plus. Comme on ne peut sauver qu’une chose à la fois, on gagne l’autre.',
    sentence: (m, ctx) => {
      const type = (m.detail?.piece as PieceSymbol) ?? 'n'
      const count = Number(m.detail?.targetCount ?? 2)
      const targets = m.squares.slice(1).join(' et ')
      return `Fourchette : ${pieceWithArticle(type, 'fr')} en ${m.squares[0]} attaque ${count} pièces d'un coup (${targets}). L'adversaire ne peut pas tout sauver.`
    },
  },
  pin: {
    name: 'Clouage',
    definition:
      'Une pièce ne peut pas bouger sans exposer une pièce plus précieuse placée derrière elle. Si c’est le roi qui est derrière, elle ne peut légalement pas bouger du tout.',
    sentence: (m, ctx) => {
      const front = m.squares[1]
      const back = m.squares[2]
      const absolute = m.detail?.absolute === true
      return absolute
        ? `Clouage absolu : ${pieceAt(ctx, front)} en ${front} est collée devant son roi en ${back}. Elle ne peut plus bouger du tout, tu peux l'attaquer à loisir.`
        : `Clouage : ${pieceAt(ctx, front)} en ${front} ne peut pas s'écarter sans livrer ${pieceAt(ctx, back)} en ${back}.`
    },
  },
  skewer: {
    name: 'Enfilade',
    definition:
      'L’inverse du clouage : la pièce de valeur est devant. Elle doit fuir, et en fuyant elle abandonne celle qui se trouvait derrière.',
    sentence: (m, ctx) =>
      `Enfilade : ${pieceAt(ctx, m.squares[1])} en ${m.squares[1]} doit s'écarter, et en partant elle laisse tomber ${pieceAt(ctx, m.squares[2])} en ${m.squares[2]}.`,
  },
  discoveredAttack: {
    name: 'Attaque à la découverte',
    definition:
      'En déplaçant une pièce, on dégage la ligne d’une autre qui frappe soudain une cible. Deux menaces naissent d’un seul coup.',
    sentence: (m, ctx) =>
      m.detail?.check
        ? `Échec à la découverte : en libérant ${m.squares[1]}, tu ouvres la ligne de ${pieceAt(ctx, m.squares[0])} en ${m.squares[0]} sur le roi. L'adversaire doit parer l'échec et ne peut rien faire d'autre.`
        : `Attaque à la découverte : la case ${m.squares[1]} libérée ouvre la ligne de ${pieceAt(ctx, m.squares[0])} sur ${m.squares[2]}.`,
  },
  doubleCheck: {
    name: 'Échec double',
    definition:
      'Deux pièces donnent échec en même temps. Aucune parade ne suffit : le roi est obligé de bouger.',
    sentence: () =>
      `Échec double ! Impossible de capturer ou d'interposer quoi que ce soit : le roi doit se déplacer, un point c'est tout.`,
  },
  removingTheDefender: {
    name: 'Élimination du défenseur',
    definition:
      'On capture ou on chasse la pièce qui défendait une cible, laquelle tombe au coup suivant.',
    sentence: (m) =>
      `Élimination du défenseur : en prenant en ${m.squares[0]}, tu retires le gardien de ${m.squares.slice(1).join(' et ')}, qui devient prenable.`,
  },
  overloadedPiece: {
    name: 'Pièce surchargée',
    definition:
      'Une pièce assure seule deux tâches défensives. Détourne-la d’un côté et l’autre s’effondre.',
    sentence: (m, ctx) =>
      `${capitalise(pieceAt(ctx, m.squares[0]))} en ${m.squares[0]} est surchargée : elle défend à la fois ${m.squares.slice(1).join(' et ')}. Attaque l'une des deux, et l'autre tombe.`,
  },
  trappedPiece: {
    name: 'Pièce piégée',
    definition:
      'Une pièce attaquée qui n’a plus aucune case de fuite sûre : elle est perdue, même si personne ne l’a encore prise.',
    sentence: (m, ctx) =>
      `${capitalise(pieceAt(ctx, m.squares[0]))} en ${m.squares[0]} est piégée : toutes ses cases de fuite sont couvertes. Elle est condamnée.`,
  },
  backRankMate: {
    name: 'Mat du couloir',
    definition:
      'Le roi roqué est enfermé par ses propres pions sur sa dernière rangée. Une tour ou une dame qui arrive sur cette rangée fait mat.',
    sentence: (m) =>
      `Attention au couloir : le roi en ${m.squares[0]} est enfermé par ses propres pions. Une tour ou une dame sur cette rangée donne mat immédiatement.`,
  },
  smotheredMate: {
    name: 'Mat étouffé',
    definition:
      'Le roi est totalement entouré de ses propres pièces ; seul un cavalier peut alors le mater, car lui seul saute par-dessus.',
    sentence: () =>
      `Mat étouffé : le roi est prisonnier de ses propres pièces, et le cavalier saute par-dessus toutes les défenses.`,
  },
  mateIn1: {
    name: 'Mat en un',
    definition: 'Un seul coup met fin à la partie.',
    sentence: () => `Il y a mat en un coup.`,
  },
  mateIn2: {
    name: 'Mat en deux',
    definition: 'Un mat forcé en deux coups, quelles que soient les réponses adverses.',
    sentence: (m) =>
      `Mat forcé en deux coups${m.detail?.line ? ` : ${(m.detail.line as string[]).map(sanToFrench).join(' ')}` : ''}.`,
  },
  mateIn3: {
    name: 'Mat en trois',
    definition: 'Un mat forcé en trois coups : aucune défense ne le repousse.',
    sentence: (m) =>
      `Mat forcé en trois coups${m.detail?.line ? ` : ${(m.detail.line as string[]).map(sanToFrench).join(' ')}` : ''}.`,
  },
  mateThreat: {
    name: 'Menace de mat',
    definition: 'Un mat arrive au coup suivant si rien n’est fait.',
    sentence: () => `Il y a une menace de mat : il faut la parer immédiatement.`,
  },
  sacrifice: {
    name: 'Sacrifice',
    definition:
      'On abandonne volontairement du matériel pour obtenir autre chose : une attaque, une ligne ouverte, un roi exposé.',
    sentence: (m) =>
      `Sacrifice de ${materialWord(Number(m.detail?.material ?? 0), 'fr')} en ${m.squares[0]} — le matériel n'est pas ce qui compte ici, l'initiative si.`,
  },
  promotion: {
    name: 'Promotion',
    definition:
      'Un pion qui atteint la dernière rangée se transforme, presque toujours en dame.',
    sentence: (m) => `Le pion arrive en ${m.squares[0]} et devient dame.`,
  },
  underPromotion: {
    name: 'Sous-promotion',
    definition:
      'Promouvoir en autre chose qu’une dame — souvent un cavalier pour donner un échec décisif, ou une tour pour éviter le pat.',
    sentence: (m) =>
      `Sous-promotion en ${m.detail?.to === 'n' ? 'cavalier' : m.detail?.to === 'r' ? 'tour' : 'fou'} : la dame ne conviendrait pas ici.`,
  },
  enPassant: {
    name: 'Prise en passant',
    definition:
      'Un pion qui avance de deux cases peut être capturé par un pion adverse comme s’il n’en avait avancé qu’une — et seulement au coup suivant.',
    sentence: (m) => `Prise en passant : ${m.squares[0]} capture le pion qui venait de doubler.`,
  },
  passedPawn: {
    name: 'Pion passé',
    definition:
      'Un pion qu’aucun pion adverse ne peut plus arrêter ni sur sa colonne, ni sur les colonnes voisines. Il vaut de l’or en finale.',
    sentence: (m) =>
      `Pion passé en ${m.squares[0]} : plus aucun pion adverse ne peut l'arrêter. En finale, c'est souvent décisif.`,
  },
  protectedPassedPawn: {
    name: 'Pion passé protégé',
    definition:
      'Un pion passé soutenu par un autre pion : l’adversaire ne peut même pas le bloquer avec son roi sans perdre.',
    sentence: (m) =>
      `Pion passé **protégé** en ${m.squares[0]} — soutenu par un pion, c'est l'un des meilleurs atouts qui existent.`,
  },
  isolatedPawn: {
    name: 'Pion isolé',
    definition:
      'Un pion sans voisin sur les colonnes adjacentes : aucun pion ne peut le défendre, il faut une pièce pour ça.',
    sentence: (m) =>
      `Pion isolé en ${m.squares[0]} : aucun pion ami ne pourra jamais le défendre. C'est une cible à long terme.`,
  },
  doubledPawns: {
    name: 'Pions doublés',
    definition:
      'Deux pions sur la même colonne : ils se gênent, avancent mal et défendent moins bien.',
    sentence: (m) => `Pions doublés en ${m.squares[0]} : ils se bloquent l'un l'autre.`,
  },
  backwardPawn: {
    name: 'Pion arriéré',
    definition:
      'Un pion resté en arrière que ses voisins ne peuvent plus soutenir, et dont la case d’avance est contrôlée par l’adversaire.',
    sentence: (m) =>
      `Pion arriéré en ${m.squares[0]} : il ne peut plus être soutenu par un pion et la case devant lui est tenue.`,
  },
  outpost: {
    name: 'Avant-poste',
    definition:
      'Une case avancée, défendue par un pion, qu’aucun pion adverse ne peut attaquer. Un cavalier y est presque intouchable.',
    sentence: (m) =>
      `Avant-poste en ${m.squares[0]} : la pièce y est soutenue par un pion et aucun pion adverse ne peut la déloger.`,
  },
  bishopPair: {
    name: 'Paire de fous',
    definition:
      'Posséder les deux fous alors que l’adversaire n’en a qu’un : ils couvrent toutes les cases et deviennent redoutables en position ouverte.',
    sentence: () =>
      `Tu as la paire de fous : ouvre la position, ils vaudront de plus en plus cher.`,
  },
  badBishop: {
    name: 'Mauvais fou',
    definition:
      'Un fou bloqué par ses propres pions, tous placés sur des cases de sa couleur.',
    sentence: (m) =>
      `Mauvais fou en ${m.squares[0]} : tes pions occupent les cases de sa couleur et l'étouffent.`,
  },
  openFile: {
    name: 'Colonne ouverte',
    definition:
      'Une colonne sans aucun pion : c’est l’autoroute des tours, qui y pénètrent dans le camp adverse.',
    sentence: (m) => `Ta tour en ${m.squares[0]} occupe une colonne ouverte — c'est sa place idéale.`,
  },
  semiOpenFile: {
    name: 'Colonne semi-ouverte',
    definition: 'Une colonne sans pion à soi mais avec un pion adverse : une cible à attaquer.',
    sentence: (m) =>
      `Colonne semi-ouverte pour la tour en ${m.squares[0]} : le pion adverse de cette colonne est une cible.`,
  },
  seventhRank: {
    name: 'Tour à la septième',
    definition:
      'Une tour sur la 7ᵉ rangée (2ᵉ pour les Noirs) mange les pions et enferme le roi. Deux tours y sont souvent gagnantes à elles seules.',
    sentence: (m) =>
      `Tour à la septième en ${m.squares[0]} : elle ratisse les pions et cloue le roi sur sa dernière rangée.`,
  },
  exposedKing: {
    name: 'Roi exposé',
    definition:
      'Un roi sans bouclier de pions et entouré de cases contrôlées par l’adversaire : l’attaque est en route.',
    sentence: (m) =>
      `Le roi adverse en ${m.squares[0]} est à découvert. C'est le moment d'amener des pièces vers lui plutôt que de compter le matériel.`,
  },
  kingSafety: {
    name: 'Roi en sécurité',
    definition: 'Un roi roqué, protégé par ses pions, loin des lignes ouvertes.',
    sentence: () => `Le roi est bien à l'abri : tu peux jouer sur les ailes sans crainte.`,
  },
  development: {
    name: 'Retard de développement',
    definition:
      'Des pièces encore sur leur case de départ. Chaque coup d’ouverture devrait en sortir une nouvelle.',
    sentence: (m) =>
      `Il reste ${m.squares.length} pièces sur leur case de départ (${squares(m)}). Sors-les avant de lancer une attaque.`,
  },
  centreControl: {
    name: 'Contrôle du centre',
    definition:
      'Les quatre cases centrales : qui les tient dirige la partie, parce que les pièces y rayonnent dans toutes les directions.',
    sentence: () => `Tu domines le centre — tes pièces ont plus de cases que celles de l'adversaire.`,
  },
  oppositeCastling: {
    name: 'Roques opposés',
    definition:
      'Les rois ont roqué de côtés opposés : chacun peut lancer ses pions à l’assaut du roi adverse sans exposer le sien. Les parties deviennent très tranchantes.',
    sentence: () =>
      `Roques opposés : lance tes pions sur le roi adverse, et compte les tempos — c'est une course.`,
  },
  fianchetto: {
    name: 'Fianchetto',
    definition:
      'Un fou développé en b2/g2 (ou b7/g7), derrière un pion avancé, qui balaie la grande diagonale.',
    sentence: (m) => `Fou en fianchetto en ${m.squares[0]} : il tient toute la grande diagonale.`,
  },
  opposition: {
    name: 'Opposition',
    definition:
      'En finale de rois et pions, les rois se font face à une case d’écart. Celui qui n’a pas le trait gagne du terrain — c’est souvent tout ce qui décide la partie.',
    sentence: () =>
      `Tu as l'opposition : c'est l'adversaire qui doit céder du terrain avec son roi.`,
  },
  rookBehindPasser: {
    name: 'Tour derrière le pion passé',
    definition:
      'Règle de Tarrasch : les tours se placent derrière les pions passés — les siens pour les pousser, ceux de l’adversaire pour les retenir.',
    sentence: (m) =>
      `Ta tour en ${m.squares[0]} est derrière le pion passé, exactement là où elle doit être.`,
  },
  wrongBishop: {
    name: 'Fou de mauvaise couleur',
    definition:
      'Avec un pion de colonne « a » ou « h » et un fou qui ne contrôle pas la case de promotion, la finale est nulle même avec un pion de plus.',
    sentence: () =>
      `Fou de mauvaise couleur : ton fou ne contrôle pas la case de promotion, la finale est théoriquement nulle.`,
  },
  kingActivity: {
    name: 'Roi actif',
    definition:
      'En finale, le roi devient une pièce d’attaque. Le centraliser vaut souvent plus qu’un pion.',
    sentence: () => `En finale, avance ton roi : il vaut une pièce mineure de plus.`,
  },
  zugzwang: {
    name: 'Zugzwang',
    definition:
      'Être obligé de jouer alors que tout coup dégrade sa position. Passer son tour sauverait — mais c’est interdit.',
    sentence: () => `Zugzwang : l'adversaire est obligé de jouer, et tout coup empire sa position.`,
  },
  blockade: {
    name: 'Blocus',
    definition:
      'Poser une pièce juste devant un pion passé adverse pour l’immobiliser. Le cavalier est le meilleur bloqueur.',
    sentence: (m) => `Blocus en ${m.squares[0]} : le pion passé adverse est stoppé net.`,
  },
  spaceAdvantage: {
    name: 'Avantage d’espace',
    definition:
      'Contrôler plus de cases que l’adversaire : ses pièces se marchent dessus, les tiennes manœuvrent.',
    sentence: () => `Tu as l'espace : évite les échanges, l'adversaire manque de cases.`,
  },
  xRayAttack: {
    name: 'Attaque en rayon X',
    definition:
      'Une pièce à longue portée agit à travers une autre : la menace existe déjà, avant même que la ligne soit dégagée.',
    sentence: (m) => `Attaque en rayon X sur ${m.squares.join(' – ')}.`,
  },
}

/** Textes anglais. Même structure, ton légèrement plus neutre. */
const MOTIFS_EN: Partial<Record<MotifId, MotifCopy>> = {
  hangingPiece: {
    name: 'Hanging piece',
    definition:
      'An attacked piece that is not defended enough — the opponent can simply take it and win material.',
    sentence: (m) => {
      const type = (m.detail?.piece as PieceSymbol) ?? 'p'
      const gain = Number(m.detail?.gain ?? 0)
      return m.detail?.ownBlunder
        ? `Your ${PIECE_NAMES[type].en} on ${m.squares[0]} is left undefended — the opponent wins ${materialWord(gain, 'en')}.`
        : `The ${PIECE_NAMES[type].en} on ${m.squares[0]} is hanging — ${materialWord(gain, 'en')} to be won.`
    },
  },
  fork: {
    name: 'Fork',
    definition:
      'One piece attacks two or more targets at once. Only one can be saved, so the other falls.',
    sentence: (m) =>
      `Fork: the ${PIECE_NAMES[(m.detail?.piece as PieceSymbol) ?? 'n'].en} on ${m.squares[0]} hits ${m.detail?.targetCount ?? 2} pieces at once (${m.squares.slice(1).join(', ')}).`,
  },
  pin: {
    name: 'Pin',
    definition:
      'A piece cannot move without exposing a more valuable one behind it. If the king is behind, it cannot legally move at all.',
    sentence: (m) =>
      m.detail?.absolute
        ? `Absolute pin: the piece on ${m.squares[1]} is stuck in front of its king on ${m.squares[2]} and cannot move at all.`
        : `Pin: the piece on ${m.squares[1]} cannot step aside without losing the piece on ${m.squares[2]}.`,
  },
  skewer: {
    name: 'Skewer',
    definition:
      'The reverse of a pin: the valuable piece is in front. It must move, abandoning what stands behind it.',
    sentence: (m) =>
      `Skewer: the piece on ${m.squares[1]} must move and gives up the one on ${m.squares[2]}.`,
  },
  discoveredAttack: {
    name: 'Discovered attack',
    definition:
      'Moving one piece opens the line of another, which suddenly hits a target. Two threats from one move.',
    sentence: (m) =>
      m.detail?.check
        ? `Discovered check: vacating ${m.squares[1]} opens the line from ${m.squares[0]} onto the king.`
        : `Discovered attack: vacating ${m.squares[1]} opens the line from ${m.squares[0]} onto ${m.squares[2]}.`,
  },
  doubleCheck: {
    name: 'Double check',
    definition: 'Two pieces give check at once. Nothing can block or capture — the king must move.',
    sentence: () => `Double check — the king is forced to move, nothing else is legal.`,
  },
  backRankMate: {
    name: 'Back-rank mate',
    definition:
      'A castled king boxed in by its own pawns. A rook or queen reaching that rank is mate.',
    sentence: (m) => `Back-rank danger: the king on ${m.squares[0]} has no escape squares.`,
  },
  fianchetto: {
    name: 'Fianchetto',
    definition: 'A bishop developed to b2/g2 (or b7/g7), raking the long diagonal.',
    sentence: (m) => `Fianchettoed bishop on ${m.squares[0]}, controlling the long diagonal.`,
  },
  passedPawn: {
    name: 'Passed pawn',
    definition:
      'A pawn no enemy pawn can stop, on its file or the adjacent ones. Gold in the endgame.',
    sentence: (m) => `Passed pawn on ${m.squares[0]} — no enemy pawn can stop it any more.`,
  },
  outpost: {
    name: 'Outpost',
    definition:
      'An advanced square defended by a pawn that no enemy pawn can attack. A knight there is untouchable.',
    sentence: (m) => `Outpost on ${m.squares[0]}: pawn-protected and unassailable by pawns.`,
  },
  seventhRank: {
    name: 'Rook on the seventh',
    definition:
      'A rook on the 7th rank eats pawns and traps the king. Two rooks there often win on their own.',
    sentence: (m) => `Rook on the seventh from ${m.squares[0]} — it rakes pawns and cages the king.`,
  },
  exposedKing: {
    name: 'Exposed king',
    definition: 'A king with no pawn shelter, surrounded by squares the opponent controls.',
    sentence: (m) => `The king on ${m.squares[0]} is exposed — bring pieces towards it.`,
  },
}

/** Catalogue par langue, avec repli sur le français si un texte manque. */
export function motifCopy(id: MotifId, locale: Locale): MotifCopy | null {
  const table = locale === 'en' ? MOTIFS_EN : MOTIFS_FR
  return table[id] ?? MOTIFS_FR[id] ?? null
}

/** Glossaire complet, pour la page « Motifs » de l'application. */
export function motifGlossary(locale: Locale): Array<{ id: MotifId; name: string; definition: string }> {
  const table = locale === 'en' ? { ...MOTIFS_FR, ...MOTIFS_EN } : MOTIFS_FR
  return (Object.entries(table) as Array<[MotifId, MotifCopy]>)
    .map(([id, copy]) => ({ id, name: copy.name, definition: copy.definition }))
    .sort((a, b) => a.name.localeCompare(b.name, locale))
}

// ─────────────────────────────────────────────────────────────────────────────
//  Composition de l'explication d'un coup
// ─────────────────────────────────────────────────────────────────────────────

export interface MoveExplanationInput {
  locale: Locale
  /** Coup joué en SAN anglais. */
  san: string
  /** Position après le coup. */
  fenAfter: string
  quality: MoveQuality
  scoreBefore: Score
  scoreAfter: Score
  winLoss: number
  mover: Color
  motifs: DetectedMotif[]
  /** Meilleur coup selon le moteur, en SAN anglais. */
  bestSan?: string | null
  /** Suite recommandée, en SAN anglais. */
  bestLine?: string[]
  /** Nom de l'ouverture si applicable. */
  openingName?: string | null
}

export interface MoveExplanation {
  /** Une phrase de verdict. */
  headline: string
  /** Le raisonnement, deux à quatre phrases. */
  body: string[]
  /** Ce qu'il aurait fallu jouer, s'il y a mieux. */
  betterMove: string | null
  /** Cases à surligner sur l'échiquier. */
  highlights: Square[]
  /** Version destinée à la synthèse vocale, sans symboles. */
  speech: string
  /** Motifs retenus, pour afficher des puces cliquables. */
  motifs: Array<{ id: MotifId; name: string; definition: string }>
}

/**
 * Rédige l'explication complète d'un coup.
 *
 * La structure est toujours la même — verdict, cause, conséquence, remède —
 * parce qu'une explication prévisible s'assimile plus vite qu'une prose variée.
 */
export function explainMove(input: MoveExplanationInput): MoveExplanation {
  const fr = input.locale === 'fr'
  const board = new Chess(input.fenAfter, { skipValidation: true })
  const san = localiseSan(input.san, input.locale)
  const style = QUALITY_STYLES[input.quality]
  const ctx: ExplainContext = { locale: input.locale, board, mover: input.mover, san }

  const headline = buildHeadline(input, san, fr)
  const body: string[] = []
  const highlights = new Set<Square>()

  // On ne garde que les motifs saillants : trois suffisent à comprendre.
  const relevant = input.motifs
    .filter((m) => m.weight >= 0.3)
    .slice(0, 3)

  for (const m of relevant) {
    const copy = motifCopy(m.id, input.locale)
    if (!copy) continue
    body.push(copy.sentence(m, ctx))
    for (const sq of m.squares) highlights.add(sq)
  }

  // Aucun motif tactique — le cas courant en ouverture et dans les positions
  // calmes. On décrit alors ce que le coup **fait** : les cases qu'il prend en
  // main, les pièces qu'il vise, le développement qu'il apporte. C'est cela
  // qu'on veut entendre ; répéter l'évaluation chiffrée n'apprend rien.
  if (body.length === 0) {
    const quiet = describeQuietMove(input, ctx)
    body.push(...quiet.sentences)
    for (const square of quiet.squares) highlights.add(square)
  }
  // Dernier recours seulement : si même la description n'a rien trouvé à dire.
  if (body.length === 0) {
    body.push(buildEvaluationSentence(input, fr))
  }

  // Ouverture reconnue.
  if (input.openingName) {
    body.unshift(
      fr
        ? `Nous sommes dans ${input.openingName} — une ouverture connue et analysée.`
        : `This is the ${input.openingName} — a well-known opening.`,
    )
  }

  // Le remède.
  let betterMove: string | null = null
  if (input.bestSan && input.bestSan !== input.san && input.winLoss >= 3) {
    const best = localiseSan(input.bestSan, input.locale)
    const line = (input.bestLine ?? []).slice(0, 4).map((s) => localiseSan(s, input.locale))
    betterMove = fr
      ? `Mieux valait ${best}${line.length > 1 ? `, par exemple ${line.join(' ')}` : ''}.`
      : `Better was ${best}${line.length > 1 ? `, for example ${line.join(' ')}` : ''}.`
    body.push(betterMove)
  }

  const speech = buildSpeech(input, san, body, fr)

  return {
    headline,
    body,
    betterMove,
    highlights: [...highlights],
    speech,
    motifs: relevant
      .map((m) => {
        const copy = motifCopy(m.id, input.locale)
        return copy ? { id: m.id, name: copy.name, definition: copy.definition } : null
      })
      .filter((x): x is { id: MotifId; name: string; definition: string } => x !== null),
  }
}

function buildHeadline(input: MoveExplanationInput, san: string, fr: boolean): string {
  const label = QUALITY_STYLES[input.quality].label[fr ? 'fr' : 'en']
  switch (input.quality) {
    case 'brilliant':
      return fr ? `${san} — brillant !` : `${san} — brilliant!`
    case 'great':
      return fr ? `${san} — le seul coup qui tient.` : `${san} — the only move that holds.`
    case 'best':
      return fr ? `${san} — meilleur coup.` : `${san} — best move.`
    case 'book':
      return fr ? `${san} — théorie d'ouverture.` : `${san} — book move.`
    case 'forced':
      return fr ? `${san} — coup forcé.` : `${san} — forced.`
    case 'blunder':
      return fr
        ? `${san} — gaffe : ${Math.round(input.winLoss)} points de chances de victoire envolés.`
        : `${san} — blunder: ${Math.round(input.winLoss)} points of winning chances lost.`
    case 'mistake':
      return fr ? `${san} — erreur.` : `${san} — mistake.`
    case 'inaccuracy':
      return fr ? `${san} — imprécision.` : `${san} — inaccuracy.`
    case 'miss':
      return fr ? `${san} — occasion manquée.` : `${san} — missed opportunity.`
    default:
      return `${san} — ${label.toLowerCase()}.`
  }
}

/**
 * Phrase d'évaluation, en français plutôt qu'en chiffres.
 *
 * L'ancienne version terminait toujours par la note du moteur : « la position
 * reste équilibrée (−0,11) ». Pour un débutant, ce nombre demande de connaître
 * une unité — le centième de pion — pour apprendre au bout du compte qu'il n'y
 * a rien à retenir. Deux règles désormais :
 *
 *  - **équilibre** : aucun chiffre. Un dixième de pion n'est pas une
 *    information, c'est du bruit de calcul.
 *  - **avantage** : on traduit l'écart en pions, l'unité que tout joueur
 *    manipule déjà en comptant son matériel. La note brute reste visible sur la
 *    barre d'évaluation et dans la liste des coups, pour qui la cherche.
 */
function buildEvaluationSentence(input: MoveExplanationInput, fr: boolean): string {
  const score = input.scoreAfter
  const label = advantageLabel(score)
  const map: Record<string, { fr: string; en: string }> = {
    blancGagne: { fr: 'les Blancs ont une position gagnante', en: 'White is winning' },
    blancMieux: { fr: 'les Blancs sont nettement mieux', en: 'White is clearly better' },
    blancLeger: { fr: 'les Blancs sont un peu mieux', en: 'White is slightly better' },
    egal: { fr: 'la position reste équilibrée', en: 'the position stays balanced' },
    noirLeger: { fr: 'les Noirs sont un peu mieux', en: 'Black is slightly better' },
    noirMieux: { fr: 'les Noirs sont nettement mieux', en: 'Black is clearly better' },
    noirGagne: { fr: 'les Noirs ont une position gagnante', en: 'Black is winning' },
  }
  const phrase = map[label]![fr ? 'fr' : 'en']

  // Mat annoncé : le nombre de coups est la seule chose qui compte, et elle se
  // comprend sans explication.
  if (score.type === 'mate') {
    const moves = Math.abs(score.value)
    const detail = fr
      ? `mat en ${moves} coup${moves > 1 ? 's' : ''}`
      : `mate in ${moves}`
    return fr
      ? `Après ce coup, ${phrase} — ${detail}.`
      : `After this move, ${phrase} — ${detail}.`
  }

  if (label === 'egal') {
    return fr ? `Après ce coup, ${phrase}.` : `After this move, ${phrase}.`
  }

  return fr ? `Après ce coup, ${phrase}.` : `After this move, ${phrase}.`
}


// ─────────────────────────────────────────────────────────────────────────────
//  Description d'un coup calme
// ─────────────────────────────────────────────────────────────────────────────

/** Les quatre cases centrales, celles qui décident de l'espace. */
const CENTRE: Square[] = ['d4', 'd5', 'e4', 'e5']

/** Cases de départ des pièces mineures, pour mesurer le développement. */
const MINOR_HOME: Record<Color, Square[]> = {
  w: ['b1', 'g1', 'c1', 'f1'],
  b: ['b8', 'g8', 'c8', 'f8'],
}

/**
 * Décrit ce qu'un coup **fait**, quand aucun motif tactique ne s'est déclenché.
 *
 * C'est le cas de la grande majorité des coups : en ouverture et dans les
 * positions calmes, il n'y a ni fourchette ni clouage à signaler. Répondre
 * « la position reste équilibrée » est exact et parfaitement inutile — cela
 * n'apprend rien sur le coup qu'on vient de jouer.
 *
 * Les phrases produites sont toutes vérifiables sur l'échiquier : les cases
 * réellement attaquées, les pièces réellement visées, les pièces réellement
 * restées au fond. Rien n'est inventé ni deviné.
 */
function describeQuietMove(
  input: MoveExplanationInput,
  ctx: ExplainContext,
): { sentences: string[]; squares: Square[] } {
  const fr = ctx.locale === 'fr'
  const board = ctx.board
  const mover = input.mover

  // Les cases nommées dans le texte sont renvoyées pour être surlignées : lire
  // « ton cavalier attaque le pion en e5 » sans savoir où est e5 ne sert à rien
  // quand on débute. La phrase et l'échiquier doivent désigner la même chose.
  const cited: Square[] = []

  if (input.san.startsWith('O-O')) {
    const side = input.san.startsWith('O-O-O')
      ? fr
        ? 'du côté de la dame'
        : 'on the queenside'
      : fr
        ? 'du côté du roi'
        : 'on the kingside'
    const king = board.findPiece({ type: 'k', color: mover })[0]
    return {
      sentences: [
        fr
          ? `Ton roi se met à l'abri ${side}, derrière ses pions, et ta tour rejoint le jeu par le centre. C'est le coup le plus rentable de l'ouverture : deux problèmes réglés d'un coup.`
          : `Your king tucks away ${side} behind its pawns, and the rook joins the game through the centre. The best-value move in the opening: two problems solved at once.`,
      ],
      squares: king ? [king] : [],
    }
  }

  const to = destinationSquare(input.san)
  const piece = to ? board.get(to) : undefined
  if (!to || !piece || piece.color !== mover) return { sentences: [], squares: [] }

  cited.push(to)

  const sentences: string[] = []

  // ── Ce que la pièce vise depuis sa nouvelle case ──────────────────────────
  const targets = attacksFrom(board, to, mover)
  const enemies = targets.filter((square) => board.get(square)?.color === opposite(mover))
  const defended = targets.filter(
    (square) => board.get(square)?.color === mover && board.get(square)?.type !== 'p',
  )
  const centre = targets.filter((square) => CENTRE.includes(square) && !board.get(square))

  if (enemies.length > 0) {
    const list = enemies
      .slice(0, 3)
      .map((square) => `${pieceAt(ctx, square)} en ${square}`)
      .join(fr ? ' et ' : ' and ')
    cited.push(...enemies.slice(0, 3))
    sentences.push(
      fr
        ? `Depuis ${to}, ${pieceWithPossessive(piece.type, 'fr')} attaque ${list}.`
        : `From ${to}, your ${PIECE_NAMES[piece.type].en} attacks ${list}.`,
    )
  } else if (centre.length > 0) {
    cited.push(...centre)
    sentences.push(
      fr
        ? `Ce coup prend le contrôle de ${centre.join(' et ')} au centre — c'est l'espace qui décide de la liberté de tes pièces.`
        : `This takes control of ${centre.join(' and ')} in the centre — space decides how freely your pieces move.`,
    )
  }

  // Une pièce qui en protège une autre fait un vrai travail : le dire évite de
  // ne parler que d'attaque, alors que la moitié des bons coups sont défensifs.
  if (sentences.length === 0 && defended.length > 0) {
    const first = defended[0]!
    cited.push(first)
    sentences.push(
      fr
        ? `${capitalise(pieceWithPossessive(piece.type, 'fr'))} en ${to} protège désormais ${pieceAt(ctx, first)} en ${first}.`
        : `Your ${PIECE_NAMES[piece.type].en} on ${to} now defends the piece on ${first}.`,
    )
  }

  // ── Développement ─────────────────────────────────────────────────────────
  const asleep = MINOR_HOME[mover].filter((square) => board.get(square))
  if ((piece.type === 'n' || piece.type === 'b') && asleep.length > 0) {
    cited.push(...asleep)
    sentences.push(
      fr
        ? asleep.length === 1
          ? 'Une pièce de plus dans le jeu. Il t’en reste une au fond : sors-la avant de lancer quoi que ce soit.'
          : `Une pièce de plus dans le jeu. Il t’en reste ${asleep.length} au fond — une attaque menée à deux pièces échoue presque toujours.`
        : `Another piece in play. ${asleep.length} still at home — an attack with two pieces almost never works.`,
    )
  }

  // ── Tour sur une colonne dégagée ──────────────────────────────────────────
  if (piece.type === 'r' && sentences.length < 2) {
    const file = to[0]!
    const pawns = board
      .findPiece({ type: 'p', color: mover })
      .filter((square) => square[0] === file)
    if (pawns.length === 0) {
      cited.push(to)
      sentences.push(
        fr
          ? `La colonne ${file} est dégagée devant ta tour : c'est là qu'elle vaut le plus cher.`
          : `The ${file}-file is clear in front of your rook — that is where it is worth most.`,
      )
    }
  }

  const kept = sentences.slice(0, 2)
  return {
    sentences: kept,
    // Aucune case si l'on n'a rien dit : surligner sans expliquer désoriente.
    squares: kept.length > 0 ? [...new Set(cited)] : [],
  }
}

/** Case d'arrivée lue dans la notation : `Nxe5+` → `e5`. */
function destinationSquare(san: string): Square | null {
  const cleaned = san.replace(/[+#]/g, '').replace(/=[QRBN]/, '')
  const match = cleaned.match(/([a-h][1-8])$/)
  return (match?.[1] as Square) ?? null
}

/**
 * Cases réellement attaquées par la pièce posée sur `from`.
 *
 * On interroge chaque case : « qui l'attaque ? », et on retient celles dont la
 * réponse contient notre pièce. C'est plus long qu'énumérer ses coups, mais
 * c'est **exact** — et la nuance compte.
 *
 * Un pion en e4 *se déplace* en e5 mais *attaque* d5 et f5 : lister ses coups
 * revenait à écrire « ce coup contrôle e5 », ce qui est faux. Une affirmation
 * fausse dans une leçon coûte plus cher qu'une phrase absente.
 */
function attacksFrom(board: Chess, from: Square, side: Color): Square[] {
  const reached: Square[] = []
  for (const square of SQUARES) {
    if (square === from) continue
    try {
      if (board.attackers(square, side).includes(from)) reached.push(square)
    } catch {
      // Case hors de portée du moteur : on l'ignore.
    }
  }
  return reached
}

/**
 * Version parlée : phrases courtes, notation épelée, pas de symboles.
 * La synthèse vocale lit « Cf3 » comme « cé eff trois » si on ne l'aide pas.
 */
function buildSpeech(
  input: MoveExplanationInput,
  san: string,
  body: string[],
  fr: boolean,
): string {
  const spoken = sanToSpeech(input.san, fr ? 'fr' : 'en')
  const verdict = QUALITY_STYLES[input.quality].label[fr ? 'fr' : 'en']
  const first = body[0] ? stripMarkup(body[0]) : ''
  const intro = fr ? `${spoken}. ${verdict}.` : `${spoken}. ${verdict}.`
  return [intro, first].filter(Boolean).join(' ')
}

function stripMarkup(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// ─────────────────────────────────────────────────────────────────────────────
//  Commentaire d'une position (mode entraînement)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Décrit une position sans référence à un coup joué : ce qui compte, ce qu'il
 * faut chercher. Utilisé par le mode « coach » et par les leçons.
 */
export function describePosition(
  fen: string,
  motifs: DetectedMotif[],
  score: Score | null,
  locale: Locale,
): { summary: string; points: string[] } {
  const fr = locale === 'fr'
  const board = new Chess(fen, { skipValidation: true })
  const turn = board.turn()
  const ctx: ExplainContext = { locale, board, mover: turn, san: '' }

  const summaryParts: string[] = []
  summaryParts.push(
    fr
      ? `Trait aux ${turn === 'w' ? 'Blancs' : 'Noirs'}.`
      : `${turn === 'w' ? 'White' : 'Black'} to move.`,
  )
  if (score) {
    const label = advantageLabel(score)
    const readable: Record<string, { fr: string; en: string }> = {
      blancGagne: { fr: 'Les Blancs gagnent.', en: 'White is winning.' },
      blancMieux: { fr: 'Les Blancs sont nettement mieux.', en: 'White is clearly better.' },
      blancLeger: { fr: 'Léger avantage blanc.', en: 'Slight edge for White.' },
      egal: { fr: 'La position est équilibrée.', en: 'The position is balanced.' },
      noirLeger: { fr: 'Léger avantage noir.', en: 'Slight edge for Black.' },
      noirMieux: { fr: 'Les Noirs sont nettement mieux.', en: 'Black is clearly better.' },
      noirGagne: { fr: 'Les Noirs gagnent.', en: 'Black is winning.' },
    }
    summaryParts.push(readable[label]![fr ? 'fr' : 'en'])
  }

  const points = motifs
    .filter((m) => m.weight >= 0.25)
    .slice(0, 5)
    .map((m) => {
      const copy = motifCopy(m.id, locale)
      return copy ? copy.sentence(m, ctx) : null
    })
    .filter((x): x is string => x !== null)

  return { summary: summaryParts.join(' '), points }
}
