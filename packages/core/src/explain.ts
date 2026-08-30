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
  PIECE_ARTICLE,
  PIECE_NAMES,
  opposite,
  SAN_LETTER_EN,
  SAN_LETTER_FR,
  SIMPLE_VALUES,
} from './board.ts'
import { QUALITY_STYLES } from './classify.ts'
import { detectMoveMotifs, detectPositionMotifs } from './motifs.ts'
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

/**
 * Traduit une notation algébrique en **notation figurine**.
 * `Nf3` → `♘f3`, `Qxd5+` → `♕xd5+`, `O-O` reste inchangé.
 *
 * C'est la notation des livres et des revues internationales : elle ne dépend
 * d'aucune langue, et elle apprend au passage les symboles qu'on retrouve
 * partout. Les pièces sont toujours dessinées en blanc — la couleur se déduit
 * du tour, pas du glyphe, et les symboles noirs sont illisibles sur fond sombre.
 */
export function sanToFigurine(san: string): string {
  if (san.startsWith('O-O')) return san
  const map: Record<string, string> = {
    N: '♘',
    B: '♗',
    R: '♖',
    Q: '♕',
    K: '♔',
  }
  // Seule la lettre de tête désigne la pièce déplacée ; celle d'une promotion
  // suit un `=` et se remplace aussi. Les colonnes sont en minuscules, elles
  // ne risquent donc rien.
  return san.replace(/[NBRQK]/g, (letter) => map[letter] ?? letter)
}

/** Façon d'écrire les coups, choisie dans les préférences. */
export type Notation = 'lettres' | 'figurine'

/**
 * Notation dans la langue et le style demandés.
 *
 * Point d'entrée unique de tout l'affichage des coups : liste des coups,
 * commentaires, analyse, explorateur. Ajouter un style ici le rend disponible
 * partout, sans rien oublier.
 */
export function localiseSan(
  san: string,
  locale: Locale,
  notation: Notation = 'lettres',
): string {
  if (notation === 'figurine') return sanToFigurine(san)
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

/**
 * Traduit un coup en français ordinaire.
 *
 * `Tg2+` devient « la tour va en g2, avec échec ». La notation algébrique est
 * d'une concision admirable pour qui la connaît, et parfaitement opaque pour
 * qui l'apprend : un débutant lit « TG2+ » et n'y voit rien. Or elle est
 * partout — liste des coups, analyse, explorateur.
 *
 * Cette phrase n'a pas vocation à remplacer la notation, mais à l'accompagner
 * en info-bulle : on survole, on comprend, et à force on n'a plus besoin de
 * survoler. C'est exactement ainsi qu'on l'apprend.
 *
 * À distinguer de `sanToSpeech`, qui épelle pour la synthèse vocale
 * (« tour g 2 échec ») : lisible à l'oreille, laid à l'œil.
 */
export function describeMoveInWords(san: string, locale: Locale): string {
  const fr = locale === 'fr'
  if (san.startsWith('O-O-O')) {
    return fr
      ? 'grand roque : le roi se met à l’abri du côté de la dame'
      : 'queenside castling: the king tucks away on the queen’s side'
  }
  if (san.startsWith('O-O')) {
    return fr
      ? 'petit roque : le roi se met à l’abri du côté du roi'
      : 'kingside castling: the king tucks away on the king’s side'
  }

  const found = matchPiece(san, SAN_LETTER_EN) ?? (fr ? matchPiece(san, SAN_LETTER_FR) : null)
  const piece = found ? PIECE_NAMES[found.piece][locale] : fr ? 'pion' : 'pawn'
  const feminine = found?.piece === 'r' || found?.piece === 'q'

  let rest = found ? san.slice(found.length) : san
  const capture = rest.includes('x')
  rest = rest.replace('x', '')

  const mate = rest.endsWith('#')
  const check = rest.endsWith('+')
  rest = rest.replace(/[+#]/g, '')

  const promotion = /=([QRBNDTFC])/.exec(rest)
  rest = rest.replace(/=[QRBNDTFC]/, '')
  const target = rest.slice(-2)

  if (!fr) {
    const verb = capture ? `takes on ${target}` : `goes to ${target}`
    const suffix = mate ? ', checkmate' : check ? ', with check' : ''
    return `the ${piece} ${verb}${promotion ? ', promoting to a queen' : ''}${suffix}`
  }

  const article = feminine ? 'la' : 'le'
  const verbe = capture ? `prend en ${target}` : `va en ${target}`
  const fin = mate ? ', et c’est échec et mat' : check ? ', avec échec' : ''
  const promu = promotion ? ', et devient une dame' : ''
  return `${article} ${piece} ${verbe}${promu}${fin}`
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

/**
 * « ton cavalier », « ta dame » — ou « son cavalier » selon le lecteur.
 *
 * La pièce désignée est toujours celle de l'auteur du coup. Le contexte est
 * donc obligatoire : sans lui, on tutoierait le lecteur à propos d'une pièce
 * qui ne lui appartient pas dès qu'on explique un coup adverse.
 */
function pieceWithPossessive(type: PieceSymbol, ctx: ExplainContext): string {
  const sien = estLeLecteur(ctx)
  if (ctx.locale === 'en') return `${sien ? 'your' : 'their'} ${PIECE_NAMES[type].en}`
  const feminine = type === 'r' || type === 'q'
  const forme = feminine ? 'ta' : 'ton'
  return `${sien ? forme : TROISIEME[forme]!} ${PIECE_NAMES[type].fr}`
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
  /** Camp qui vient de jouer le coup expliqué. */
  mover: Color
  /**
   * Camp **à qui l'on parle**, quand il n'est pas celui qui vient de jouer.
   *
   * Toutes les phrases sont écrites à la deuxième personne, et elles
   * s'adressaient au joueur du coup : « Ta tour en d1 occupe une colonne
   * ouverte ». Tant qu'on n'explique que ses propres coups, les deux notions se
   * confondent et rien ne se voit.
   *
   * Elles se séparent dès qu'on explique le coup d'en face — en partie
   * commentée si l'on active l'analyse des coups de l'adversaire, et sur la
   * page d'analyse **depuis toujours**, où l'on relit une partie entière. On y
   * lisait « ta tour » à propos de la tour adverse.
   *
   * Non renseigné, le lecteur reste celui qui joue : c'est le comportement
   * d'avant, et il convient à une partie qu'on relit sans savoir de quel côté
   * était son lecteur — un PGN collé, par exemple.
   */
  lecteur?: Color | null
  /**
   * Verdict du coup, quand il est connu.
   *
   * La plupart des motifs décrivent une figure sur l'échiquier et n'en ont pas
   * besoin : une fourchette est une fourchette. Le sacrifice fait exception —
   * il ne se décrit pas sans dire s'il rapporte, et le moteur l'a déjà tranché.
   * Absent quand on décrit une position hors du contexte d'un coup.
   */
  quality?: MoveQuality
  /** Coup joué en notation localisée. */
  san: string
}

const squares = (m: DetectedMotif) => m.squares.join(', ')

/**
 * Le motif profite-t-il à celui qui vient de jouer ?
 *
 * Distinction indispensable pour tout ce qui touche au mat. `DetectedMotif`
 * porte le camp bénéficiaire depuis toujours, mais les phrases ne le
 * consultaient pas : « Mat forcé en trois coups : Cc6+ Rb3 Dc4+ Rb2 Tb5# »
 * s'affichait à l'identique qu'on soit sur le point de mater ou de se faire
 * mater. Dans le second cas, on annonçait donc une bonne nouvelle à quelqu'un
 * qui perdait la partie, variante à l'appui.
 */
function pourLeJoueur(m: DetectedMotif, ctx: ExplainContext): boolean {
  return m.side === (ctx.lecteur ?? ctx.mover)
}

/** À qui l'on parle : `true` quand c'est le lecteur qui vient de jouer. */
function estLeLecteur(ctx: ExplainContext): boolean {
  return (ctx.lecteur ?? ctx.mover) === ctx.mover
}

/** « Tu as » / « Ton adversaire a », selon le bénéficiaire du motif. */
function quiA(m: DetectedMotif, ctx: ExplainContext): string {
  const fr = ctx.locale === 'fr'
  if (pourLeJoueur(m, ctx)) return fr ? 'Tu as' : 'You have'
  return fr ? 'Ton adversaire a' : 'Your opponent has'
}

/**
 * Le possessif qui convient au bénéficiaire du motif.
 *
 * Le français accorde le possessif avec le nom qui suit, pas avec le
 * possesseur : *ta* tour, *ton* fou, *tes* pions. On passe donc la forme
 * voulue, et la fonction rend la troisième personne correspondante quand le
 * motif ne profite pas au lecteur.
 */
const TROISIEME: Record<string, string> = { ton: 'son', ta: 'sa', tes: 'ses', Ton: 'Son', Ta: 'Sa', Tes: 'Ses' }

function possessif(m: DetectedMotif, ctx: ExplainContext, forme: 'ton' | 'ta' | 'tes' | 'Ton' | 'Ta' | 'Tes'): string {
  if (ctx.locale !== 'fr') return pourLeJoueur(m, ctx) ? 'your' : 'their'
  return pourLeJoueur(m, ctx) ? forme : TROISIEME[forme]!
}

/**
 * « tu ouvres » / « ton adversaire ouvre ».
 *
 * Le français ne se contente pas de changer le pronom : il change aussi la
 * terminaison. On ne peut donc pas se borner à substituer un sujet, il faut
 * fournir les deux formes conjuguées — d'où ce petit dictionnaire, tenu à la
 * main pour les rares verbes concernés plutôt qu'obtenu par une règle qui
 * échouerait au premier verbe irrégulier.
 */
const CONJUGAISON: Record<string, { tu: string; il: string }> = {
  ouvrir: { tu: 'tu ouvres', il: 'ton adversaire ouvre' },
  retirer: { tu: 'tu retires', il: 'ton adversaire retire' },
  dominer: { tu: 'tu domines', il: 'ton adversaire domine' },
  avoir: { tu: 'tu as', il: 'ton adversaire a' },
}

function sujet(m: DetectedMotif, ctx: ExplainContext, verbe: keyof typeof CONJUGAISON): string {
  const formes = CONJUGAISON[verbe]!
  return pourLeJoueur(m, ctx) ? formes.tu : formes.il
}

/**
 * Le possessif d'une pièce **de celui qui vient de jouer**.
 *
 * `possessif` répond pour le bénéficiaire d'un motif ; celui-ci répond pour
 * l'auteur du coup. Les deux coïncident tant qu'on n'explique que ses propres
 * coups, et divergent dès qu'on explique ceux d'en face : « ton roi se met à
 * l'abri » doit devenir « son roi se met à l'abri » quand c'est l'adversaire
 * qui roque.
 */
function sonA(ctx: ExplainContext, forme: 'ton' | 'ta' | 'tes' | 'Ton' | 'Ta' | 'Tes'): string {
  if (ctx.locale !== 'fr') return estLeLecteur(ctx) ? 'your' : 'their'
  return estLeLecteur(ctx) ? forme : TROISIEME[forme]!
}

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
        return `${capitalise(pieceWithPossessive(type, ctx))} en ${square} reste sans défense suffisante : elle sera reprise, et c'est ${materialWord(gain, 'fr')} de perdus.`
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
        ? `Échec à la découverte : en libérant ${m.squares[1]}, ${sujet(m, ctx, 'ouvrir')} la ligne de ${pieceAt(ctx, m.squares[0])} en ${m.squares[0]} sur le roi. Il faut parer l'échec, et rien d'autre n'est possible.`
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
    sentence: (m, ctx) =>
      `Élimination du défenseur : la prise en ${m.squares[0]} retire le gardien de ${m.squares.slice(1).join(' et ')}, qui devient prenable.`,
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
    sentence: (m, ctx) =>
      pourLeJoueur(m, ctx)
        ? `Il y a mat en un coup, et il est pour toi.`
        : `Attention : ton adversaire a mat en un coup.`,
  },
  mateIn2: {
    name: 'Mat en deux',
    definition: 'Un mat forcé en deux coups, quelles que soient les réponses adverses.',
    sentence: (m, ctx) =>
      `${quiA(m, ctx)} un mat forcé en deux coups${m.detail?.line ? ` : ${(m.detail.line as string[]).map(sanToFrench).join(' ')}` : ''}.`,
  },
  mateIn3: {
    name: 'Mat en trois',
    definition: 'Un mat forcé en trois coups : aucune défense ne le repousse.',
    sentence: (m, ctx) =>
      `${quiA(m, ctx)} un mat forcé en trois coups${m.detail?.line ? ` : ${(m.detail.line as string[]).map(sanToFrench).join(' ')}` : ''}.`,
  },
  mateThreat: {
    name: 'Menace de mat',
    definition: 'Un mat arrive au coup suivant si rien n’est fait.',
    sentence: (m, ctx) =>
      pourLeJoueur(m, ctx)
        ? `Tu menaces le mat : si l'adversaire ne pare pas, c'est fini.`
        : `Il y a une menace de mat contre toi : il faut la parer immédiatement.`,
  },
  sacrifice: {
    name: 'Sacrifice',
    definition:
      'On abandonne volontairement du matériel pour obtenir autre chose : une attaque, une ligne ouverte, un roi exposé.',
    /*
     * Trois défauts dans la rédaction précédente, et le premier suffisait :
     * « Sacrifice de 2 points de matériel en e5 — le matériel n'est pas ce qui
     * compte ici, l'initiative si. »
     *
     *  - « matériel » deux fois en une phrase ;
     *  - « l'initiative si » est une ellipse correcte mais qui se lit comme une
     *    phrase tronquée, et « initiative » est un mot de joueur, pas un mot de
     *    débutant ;
     *  - surtout, elle **affirme** que le matériel ne compte pas ici. On n'en
     *    sait rien : un sacrifice se juge à ce qu'il rapporte, et il arrive
     *    qu'il ne rapporte rien. Décrire le coup est notre rôle ; le
     *    cautionner ne l'est pas.
     */
    sentence: (m, ctx) => {
      const perte = materialWord(Number(m.detail?.material ?? 0), 'fr')
      const ou = `Sacrifice en ${m.squares[0]}`

      // Un sacrifice ne se décrit pas sans dire s'il rapporte. La version
      // précédente l'annonçait toujours de la même façon — « donnés pour
      // prendre l'avantage ailleurs » — y compris quand le moteur venait de le
      // classer comme une gaffe. On félicitait donc quelqu'un qui venait de
      // perdre une pièce pour rien.
      switch (ctx.quality) {
        case 'blunder':
        case 'mistake':
        case 'inaccuracy':
        case 'miss':
          return `${ou} : ${perte} donnés, et rien en retour. Le moteur ne voit ni attaque ni ligne ouverte qui vaille cette perte.`
        case 'brilliant':
        case 'great':
        case 'best':
          return `${ou} : ${perte} donnés, et ils les valent — ce que la position rapporte en échange pèse plus lourd que la pièce.`
        default:
          return `${ou} : ${perte} donnés pour prendre l'avantage ailleurs — du temps, des lignes ouvertes, un roi découvert.`
      }
    },
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
    sentence: (m, ctx) =>
      pourLeJoueur(m, ctx)
        ? `Tu as la paire de fous : ouvre la position, ils vaudront de plus en plus cher.`
        : `Ton adversaire a la paire de fous : garde la position fermée, sinon ils vaudront de plus en plus cher.`,
  },
  badBishop: {
    name: 'Mauvais fou',
    definition:
      'Un fou bloqué par ses propres pions, tous placés sur des cases de sa couleur.',
    sentence: (m, ctx) =>
      `Mauvais fou en ${m.squares[0]} : ${possessif(m, ctx, 'tes')} pions occupent les cases de sa couleur et l'étouffent.`,
  },
  openFile: {
    name: 'Colonne ouverte',
    definition:
      'Une colonne sans aucun pion : c’est l’autoroute des tours, qui y pénètrent dans le camp adverse.',
    sentence: (m, ctx) =>
      `${capitalise(possessif(m, ctx, 'ta'))} tour en ${m.squares[0]} occupe une colonne ouverte — c'est sa place idéale.`,
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
    sentence: (m, ctx) =>
      pourLeJoueur(m, ctx)
        ? `Ton roi est bien à l'abri : tu peux jouer sur les ailes sans crainte.`
        : `Le roi adverse est bien à l'abri : une attaque directe contre lui coûtera cher.`,
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
    sentence: (m, ctx) =>
      pourLeJoueur(m, ctx)
        ? `Tu domines le centre — tes pièces ont plus de cases que celles de l'adversaire.`
        : `Ton adversaire domine le centre — ses pièces ont plus de cases que les tiennes.`,
  },
  oppositeCastling: {
    name: 'Roques opposés',
    definition:
      'Les rois ont roqué de côtés opposés : chacun peut lancer ses pions à l’assaut du roi adverse sans exposer le sien. Les parties deviennent très tranchantes.',
    // Les roques opposés ne profitent à personne en particulier : les deux
    // camps attaquent, et le conseil vaut pour le lecteur quel que soit
    // l'auteur du coup. On ne le décline donc pas.
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
    sentence: (m, ctx) =>
      pourLeJoueur(m, ctx)
        ? `Tu as l'opposition : c'est l'adversaire qui doit céder du terrain avec son roi.`
        : `Ton adversaire a l'opposition : c'est toi qui devras céder du terrain avec ton roi.`,
  },
  rookBehindPasser: {
    name: 'Tour derrière le pion passé',
    definition:
      'Règle de Tarrasch : les tours se placent derrière les pions passés — les siens pour les pousser, ceux de l’adversaire pour les retenir.',
    sentence: (m, ctx) =>
      `${capitalise(possessif(m, ctx, 'ta'))} tour en ${m.squares[0]} est derrière le pion passé, exactement là où elle doit être.`,
  },
  wrongBishop: {
    name: 'Fou de mauvaise couleur',
    definition:
      'Avec un pion de colonne « a » ou « h » et un fou qui ne contrôle pas la case de promotion, la finale est nulle même avec un pion de plus.',
    sentence: (m, ctx) =>
      `Fou de mauvaise couleur : ${possessif(m, ctx, 'ton')} fou ne contrôle pas la case de promotion, la finale est théoriquement nulle.`,
  },
  kingActivity: {
    name: 'Roi actif',
    definition:
      'En finale, le roi devient une pièce d’attaque. Le centraliser vaut souvent plus qu’un pion.',
    // Conseil de finale, vrai pour les deux camps : on le laisse au lecteur.
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
    sentence: (m, ctx) =>
      pourLeJoueur(m, ctx)
        ? `Tu as l'espace : évite les échanges, l'adversaire manque de cases.`
        : `Ton adversaire a l'espace : cherche les échanges, tes pièces manquent de cases.`,
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

/**
 * En deçà de combien de points de chances de victoire on ne propose rien.
 *
 * Le moteur a presque toujours une préférence : sur une position calme, il
 * départage deux coups équivalents par deux centièmes de pion. La lui faire
 * annoncer reviendrait à corriger un joueur qui n'a rien fait de mal, et à
 * chaque coup de la partie.
 *
 * Trois points de pourcentage, c'est le seuil en dessous duquel l'écart est
 * imperceptible à l'échelle d'une partie humaine — et donc inutile à signaler.
 *
 * **Cette constante est exportée pour que l'affichage s'y tienne aussi.** Le
 * texte respectait le seuil, la flèche bleue sur l'échiquier ne le respectait
 * pas : on lisait « coup conseillé » en légende sans qu'aucune phrase ne dise
 * lequel ni pourquoi. Une flèche et un paragraphe qui ne s'accordent pas sur
 * l'existence d'un meilleur coup, c'est pire que ni l'un ni l'autre.
 */
export const SEUIL_MEILLEUR_COUP = 3

/**
 * Au-dessus de ce niveau d'adversaire, on cesse de détailler les suites.
 *
 * « Tu joues d4, il répond e6, tu joues Cc3 » rend une variante lisible à qui
 * n'a pas encore l'automatisme de l'alternance. La même phrase, à quelqu'un qui
 * lit « d4 e6 Cc3 d5 » d'un coup d'œil, triple la longueur pour ne rien
 * apporter — et à chaque coup de la partie.
 *
 * Le niveau de l'adversaire choisi sert de repère, faute de mieux : personne ne
 * va affronter un bot à 1600 Elo s'il ne sait pas encore lire un coup. C'est
 * une approximation, et elle penche du bon côté — se tromper en détaillant ne
 * coûte que de la place, se tromper en abrégeant coûte la compréhension.
 */
export const SEUIL_SUITE_BREVE = 1400

/**
 * Y a-t-il lieu de proposer un meilleur coup ?
 *
 * Une seule fonction pour une seule question, parce qu'elle se pose à quatre
 * endroits — le remède rédigé, la flèche bleue sur l'échiquier, sa légende, et
 * le chiffre de la perte. Chacun y répondait à sa façon, et les réponses
 * finissaient par se contredire à l'écran.
 *
 * Deux conditions, et la seconde est la plus intéressante.
 *
 * **L'écart doit être perceptible** — au moins `SEUIL_MEILLEUR_COUP` points de
 * chances de victoire. En deçà, on corrigerait un joueur qui n'a rien fait de
 * mal, à chaque coup de la partie.
 *
 * **Le coup ne doit pas être de la théorie.** Un coup reconnu dans le livre
 * d'ouvertures a été joué et rejoué pendant des décennies ; lui opposer la
 * préférence du moteur produit une phrase qui se dément elle-même —
 * « e6 — théorie d'ouverture » suivi de « mieux valait c5 ». Les deux affirmations
 * sont vraies séparément, et ensemble elles ne veulent plus rien dire. On garde
 * la première : elle renseigne, là où la seconde ne fait que corriger.
 */
export function meriteUnMeilleurCoup(quality: MoveQuality, winLoss: number): boolean {
  if (quality === 'book') return false
  return winLoss >= SEUIL_MEILLEUR_COUP
}

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
  /**
   * Camp à qui l'explication s'adresse, s'il n'est pas celui qui joue.
   *
   * Voir `ExplainContext.lecteur`. Non renseigné, on parle à l'auteur du coup —
   * le comportement historique, qui convient tant qu'on n'explique que ses
   * propres coups, et qui reste le bon pour une partie dont on ignore de quel
   * côté était son lecteur : un PGN collé n'a pas de « toi ».
   */
  lecteur?: Color | null
  /**
   * Détailler les suites de coups.
   *
   * `true` par défaut, parce que c'est la forme qui n'exclut personne. Voir
   * `exempleDeSuite` et `SEUIL_SUITE_BREVE`.
   */
  suiteDetaillee?: boolean
  motifs: DetectedMotif[]
  /** Meilleur coup selon le moteur, en SAN anglais. */
  bestSan?: string | null
  /** Suite recommandée, en SAN anglais. */
  bestLine?: string[]
  /**
   * Position avant le coup.
   *
   * Sert à dire *pourquoi* le coup recommandé valait mieux : sans elle on ne
   * peut pas le jouer pour voir ce qu'il produit, et le remède se réduit à
   * « mieux valait Cf3 » suivi d'une liste de coups — un « quoi » sans
   * « parce que », c'est-à-dire l'inverse de ce qu'on cherche à apprendre.
   */
  fenBefore?: string
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
  const ctx: ExplainContext = {
    locale: input.locale,
    board,
    mover: input.mover,
    lecteur: input.lecteur,
    quality: input.quality,
    san,
  }

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
  //
  // Trois rédactions successives, et les deux premières ratent la même chose.
  //
  // « Une ouverture connue et analysée » ne disait rien : ni ce que ça change
  // pour celui qui joue, ni ce qu'il doit en faire. On a donc écrit « d'autres
  // l'ont analysée pour toi, il n'y a rien à inventer ici » — qui dit la bonne
  // idée dans une langue que personne ne parle. « Rien à inventer » se lit
  // comme un reproche autant que comme un encouragement, et « d'autres l'ont
  // analysée » laisse entière la question de savoir qui, et pour en faire quoi.
  //
  // Reste ce qu'un débutant a besoin d'entendre, et rien de plus : tu es en
  // terrain connu, et voici son nom.
  //
  // La rédaction précédente ajoutait « Pas besoin de calculer ici — ces
  // premiers coups sont étudiés de longue date, et le nom te permet d'en
  // retrouver la suite ». Chaque morceau se défendait ; l'ensemble ne se
  // défendait pas. « Étudiés de longue date » redit « coups connus », et le
  // reste explique à quoi sert un nom — ce qu'on n'a pas à expliquer.
  //
  // Surtout, cette phrase revient **à chaque coup de l'ouverture**, mot pour
  // mot, huit ou dix fois par partie. Une explication qu'on relit à l'identique
  // cesse d'être lue au troisième passage, et emporte avec elle celles qui la
  // suivent. La brièveté n'est pas ici une élégance, c'est ce qui lui donne une
  // chance d'être lue jusqu'au bout.
  if (input.openingName) {
    body.unshift(
      fr
        ? `Tu es encore dans les coups connus : cette position porte un nom, ${input.openingName}.`
        : `You are still in known moves: this position has a name, the ${input.openingName}.`,
    )
  }

  // Le remède : quoi jouer, pourquoi, et la suite.
  let betterMove: string | null = null
  if (
    input.bestSan &&
    input.bestSan !== input.san &&
    meriteUnMeilleurCoup(input.quality, input.winLoss)
  ) {
    const best = localiseSan(input.bestSan, input.locale)
    const line = (input.bestLine ?? []).slice(0, 4).map((s) => localiseSan(s, input.locale))
    const why = explainBetterMove(input, best)
    const example = exempleDeSuite(line, input, fr)
    betterMove = fr
      ? `Mieux valait ${best}.${why ? ` ${why}` : ''}${example}`
      : `Better was ${best}.${why ? ` ${why}` : ''}${example}`
    body.push(betterMove)
  }

  const speech = buildSpeech(input, san, body, fr)

  return {
    headline,
    body,
    betterMove,
    highlights: [...highlights],
    speech,
    /*
      Le vocabulaire du coup, **sans doublon**.

      Un même motif peut être détecté plusieurs fois sur un seul coup : deux
      clouages distincts, deux pièces en prise. Les *phrases* en gardent une
      chacune, et c'est juste — elles décrivent des choses différentes. La liste
      d'étiquettes, elle, nomme le vocabulaire employé : deux « Clouage »
      côte à côte n'apprennent rien de plus qu'un seul, et faisaient en prime
      collision de clé au rendu, React prévenant que deux enfants portaient
      l'identifiant `pin`.
    */
    motifs: [...new Set(relevant.map((m) => m.id))]
      .map((id) => {
        const copy = motifCopy(id, input.locale)
        return copy ? { id, name: copy.name, definition: copy.definition } : null
      })
      .filter((x): x is { id: MotifId; name: string; definition: string } => x !== null),
  }
}

/**
 * La suite recommandée, dite en toutes lettres.
 *
 * Elle s'écrivait « Par exemple : d4 e6 Cc3 d5. » — la notation d'une variante,
 * telle qu'on la trouve dans un livre. Le format suppose une convention qu'un
 * débutant n'a pas encore : que les coups **alternent**, un à soi, un à
 * l'adversaire. Sans elle, ce sont quatre symboles à la file, dont on ne sait
 * même pas qui les joue.
 *
 * On l'explicite donc. C'est plus long à lire, et c'est le but : la ligne n'a
 * d'intérêt que si l'on comprend qu'elle décrit un échange. Deux coups de
 * chaque camp suffisent — au-delà, la phrase devient une litanie et la variante
 * devient de toute façon incertaine.
 *
 * Le premier coup de la ligne est celui qu'on recommande, donc celui du camp
 * qui vient de jouer : « tu joues » si l'on parle au lecteur, « il joue » quand
 * on lui commente le coup d'en face.
 */
function exempleDeSuite(line: string[], input: MoveExplanationInput, fr: boolean): string {
  if (line.length < 2) return ''

  // Forme brève au-delà d'un certain niveau : « d4 e6 Cc3 d5 ». Qui lit la
  // notation couramment n'a pas besoin qu'on lui rappelle que les coups
  // alternent, et se lasserait d'une phrase de vingt mots à chaque coup.
  if (input.suiteDetaillee === false) {
    const brut = line.slice(0, 4).join(' ')
    return fr ? ` Par exemple : ${brut}.` : ` For example: ${brut}.`
  }

  const jeSuisLAuteur = (input.lecteur ?? input.mover) === input.mover

  if (!fr) {
    const moi = jeSuisLAuteur ? 'you play' : 'they play'
    const lui = jeSuisLAuteur ? 'they reply' : 'you reply'
    const parts = line.slice(0, 4).map((san, i) => `${i % 2 === 0 ? moi : lui} ${san}`)
    return ` For example: ${parts.join(', ')}.`
  }

  const moi = jeSuisLAuteur ? 'tu joues' : 'il joue'
  const lui = jeSuisLAuteur ? 'il répond' : 'tu réponds'
  const parts = line.slice(0, 4).map((san, i) => `${i % 2 === 0 ? moi : lui} ${san}`)
  return ` Par exemple : ${parts.join(', ')}.`
}

/**
 * Pourquoi le coup recommandé valait mieux.
 *
 * On le joue sur la position d'avant et on décrit ce qu'il produit, avec la
 * même machinerie que pour le coup réellement joué : un motif tactique s'il y
 * en a un, sinon la description de ce que le coup prend en main. Sans cela le
 * remède nomme un coup sans jamais dire ce qu'il apporte.
 */
function explainBetterMove(input: MoveExplanationInput, localisedBest: string): string | null {
  if (!input.fenBefore || !input.bestSan) return null
  const fr = input.locale === 'fr'

  try {
    const probe = new Chess(input.fenBefore, { skipValidation: true })
    probe.move(input.bestSan)
    const ctx: ExplainContext = {
      locale: input.locale,
      board: probe,
      mover: input.mover,
      lecteur: input.lecteur,
      // Le coup recommandé n'est pas celui qu'on juge : lui attribuer la
      // qualité du coup joué ferait dire « sacrifice sans compensation » à
      // propos du remède. On n'en passe donc aucune.
      san: localisedBest,
    }

    if (probe.isCheckmate()) return fr ? 'C’était mat.' : 'That was mate.'

    // Une prise se juge au matériel, pas au développement : décrire « une pièce
    // de plus dans le jeu » là où l'on ramasse un cavalier passe à côté.
    const done = probe.history({ verbose: true }).at(-1)
    if (done?.captured) {
      const taken = PIECE_NAMES[done.captured][input.locale]
      return fr
        ? `Ce coup prend ${PIECE_ARTICLE[done.captured]} ${taken} en ${done.to}.`
        : `This move takes the ${taken} on ${done.to}.`
    }

    // Le motif doit être *créé* par le coup. Sans cette comparaison, on
    // rapportait n'importe quel motif de la position — y compris ceux qui
    // existaient déjà, sans rapport avec le coup recommandé.
    const key = (motif: DetectedMotif) => `${motif.id}:${[...motif.squares].sort().join(',')}`
    const already = new Set(
      detectPositionMotifs(new Chess(input.fenBefore, { skipValidation: true }), {
        tacticsOnly: true,
        limit: 8,
      })
        .filter((motif) => motif.side === input.mover)
        .map(key),
    )
    const mine = detectPositionMotifs(probe, { tacticsOnly: true, limit: 4 }).find(
      (motif) => motif.side === input.mover && motif.weight >= 0.4 && !already.has(key(motif)),
    )
    if (mine) {
      const copy = motifCopy(mine.id, input.locale)
      if (copy) return copy.sentence(mine, ctx)
    }

    // Les motifs de la position jouée ne valent pas pour celle-ci : on repart
    // de zéro, sinon la description emprunterait la tactique du mauvais coup.
    const quiet = describeQuietMove(
      { ...input, san: input.bestSan, fenAfter: probe.fen(), motifs: [] },
      ctx,
    )
    return quiet.sentences[0] ?? null
  } catch {
    // Coup moteur incohérent avec la position : on préfère un remède sans
    // justification à une justification inventée.
    return null
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
          ? `${capitalise(sonA(ctx, 'ton'))} roi se met à l'abri ${side}, derrière ses pions, et ${sonA(ctx, 'ta')} tour rejoint le jeu par le centre. C'est le coup le plus rentable de l'ouverture : deux problèmes réglés d'un coup.`
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
  // Le roi est exclu : on ne « protège » pas une pièce qui ne se prend jamais,
  // et l'entendre dire brouille la notion de protection au moment où on
  // l'apprend. Les pions le sont aussi — trop courant pour être remarquable.
  const defended = targets.filter((square) => {
    const piece = board.get(square)
    return piece?.color === mover && piece.type !== 'p' && piece.type !== 'k'
  })
  const centre = targets.filter((square) => CENTRE.includes(square) && !board.get(square))

  if (enemies.length > 0) {
    const list = enemies
      .slice(0, 3)
      .map((square) => `${pieceAt(ctx, square)} en ${square}`)
      .join(fr ? ' et ' : ' and ')
    cited.push(...enemies.slice(0, 3))
    sentences.push(
      fr
        ? `Depuis ${to}, ${pieceWithPossessive(piece.type, ctx)} attaque ${list}.`
        : `From ${to}, ${pieceWithPossessive(piece.type, ctx)} attacks ${list}.`,
    )
  } else if (centre.length > 0) {
    cited.push(...centre)
    sentences.push(
      fr
        ? `Ce coup prend le contrôle de ${centre.join(' et ')} au centre — c'est l'espace qui décide de la liberté de ${sonA(ctx, 'tes')} pièces.`
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
        ? `${capitalise(pieceWithPossessive(piece.type, ctx))} en ${to} protège désormais ${pieceAt(ctx, first)} en ${first}.`
        : `Your ${PIECE_NAMES[piece.type].en} on ${to} now defends the piece on ${first}.`,
    )
  }

  // ── Développement ─────────────────────────────────────────────────────────
  const asleep = MINOR_HOME[mover].filter((square) => board.get(square))
  if ((piece.type === 'n' || piece.type === 'b') && asleep.length > 0) {
    cited.push(...asleep)
    // Le conseil s'adresse à celui qui joue, pas au lecteur. Sur le coup d'en
    // face, « il t'en reste 3 au fond » comptait les pièces de l'adversaire et
    // les attribuait au lecteur — la dernière phrase de l'audit du lecteur à
    // m'avoir échappé, et il a fallu lire une vraie analyse pour la voir.
    const sien = estLeLecteur(ctx)
    sentences.push(
      fr
        ? asleep.length === 1
          ? sien
            ? 'Une pièce de plus dans le jeu. Il t’en reste une au fond : sors-la avant de lancer quoi que ce soit.'
            : 'Une pièce de plus dans son jeu. Il lui en reste une au fond.'
          : sien
            ? `Une pièce de plus dans le jeu. Il t’en reste ${asleep.length} au fond — une attaque menée à deux pièces échoue presque toujours.`
            : `Une pièce de plus dans son jeu. Il lui en reste ${asleep.length} au fond — une attaque menée à deux pièces échoue presque toujours.`
        : `Another piece in play. ${asleep.length} still at home — an attack with two pieces almost never works.`,
    )
  }

  // ── Coups de pion tranquilles ─────────────────────────────────────────────
  //
  // Un pion qui n'attaque rien, ne défend rien et ne prend aucune case
  // centrale ne produisait aucune phrase : c'était le cas de dix-huit pour
  // cent des remèdes, presque tous des coups comme a3, b3 ou d5. Ils veulent
  // pourtant dire quelque chose de précis.
  if (piece.type === 'p' && sentences.length === 0) {
    const file = to[0]!
    const rank = Number(to[1])
    const forward = mover === 'w' ? 1 : -1

    // Le fianchetto : b3 ou g3 quand le fou est encore chez lui.
    const bishopHome = mover === 'w' ? (file === 'b' ? 'c1' : 'f1') : file === 'b' ? 'c8' : 'f8'
    const fianchetto = mover === 'w' ? `${file}2` : `${file}7`
    if (
      (file === 'b' || file === 'g') &&
      rank === (mover === 'w' ? 3 : 6) &&
      board.get(bishopHome as Square)?.type === 'b'
    ) {
      cited.push(fianchetto as Square)
      sentences.push(
        fr
          ? `Ce coup ouvre la diagonale : ${sonA(ctx, 'ton')} fou peut venir en ${fianchetto} et balayer le grand axe depuis l'abri.`
          : `This opens the diagonal: your bishop can come to ${fianchetto} and rake the long diagonal from safety.`,
      )
    }

    // Les coups de bord : ils retirent une case à l'adversaire, ou donnent de
    // l'air au roi. C'est le sens de a3 et h3, qu'on joue sans savoir dire
    // pourquoi.
    if (sentences.length === 0 && (file === 'a' || file === 'h')) {
      const denied = `${file === 'a' ? 'b' : 'g'}${rank + forward}` as Square
      sentences.push(
        fr
          ? `Ce coup retire ${denied} aux pièces adverses. C'est un coup d'attente : il ne crée rien, il empêche.`
          : `This takes ${denied} away from the enemy pieces — a waiting move: it creates nothing, it prevents.`,
      )
    }

    // Un pion qui en protège un autre : la chaîne est ce qui tient une
    // structure debout.
    if (sentences.length === 0) {
      const behind = attacksFrom(board, to, mover).filter(
        (square) => board.get(square)?.color === mover && board.get(square)?.type === 'p',
      )
      if (behind.length > 0) {
        cited.push(behind[0]!)
        sentences.push(
          fr
            ? `${capitalise(sonA(ctx, 'ton'))} pion en ${to} en soutient un autre en ${behind[0]} : deux pions qui se tiennent valent bien plus que deux pions isolés.`
            : `Your pawn on ${to} supports another on ${behind[0]} — two connected pawns are worth far more than two loose ones.`,
        )
      }
    }

    // À défaut : l'avance gagne du terrain, ce qui est déjà une raison.
    if (sentences.length === 0) {
      const advanced = mover === 'w' ? rank >= 4 : rank <= 5
      sentences.push(
        fr
          ? advanced
            ? `Ce pion avance en ${to} et prend du terrain : chaque case gagnée est une case de moins pour les pièces adverses.`
            : `Ce pion prépare le terrain sans s'exposer : il ouvre une case à ses pièces sans se mettre à portée.`
          : advanced
            ? `This pawn advances to ${to} and claims space — every square gained is one less for the enemy pieces.`
            : `This pawn prepares the ground without exposing itself.`,
      )
    }
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
          ? `La colonne ${file} est dégagée devant ${sonA(ctx, 'ta')} tour : c'est là qu'elle vaut le plus cher.`
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

// ─────────────────────────────────────────────────────────────────────────────
//  Le coup recommandé, expliqué pour lui-même
// ─────────────────────────────────────────────────────────────────────────────

export interface RecommendedExplanationInput {
  locale: Locale
  /** Position **avant** le coup joué — celle où le moteur recommande autre chose. */
  fenBefore: string
  /** Le coup du moteur, en SAN anglais. */
  bestSan: string
  /** Camp qui avait le trait. */
  mover: Color
  /** Évaluation de la position avant le coup, côté Blancs. */
  scoreBefore: Score
  /** Évaluation après le coup recommandé, côté Blancs. */
  scoreAfter: Score
  /** Suite principale après le coup recommandé, en SAN anglais. */
  bestLine?: string[]
}

/**
 * Pourquoi le coup du moteur valait mieux — en entier, et non en une phrase.
 *
 * L'explication d'un coup joué contient déjà un remède : « mieux valait Cf3 »,
 * suivi d'une ligne de ce que ce coup produit — c'est `explainBetterMove`. Une
 * phrase suffit quand on suit, et ne suffit pas quand on bloque : elle dit ce
 * que le coup fait, jamais ce qu'il devient. La suite recommandée, elle,
 * s'affiche en notation, ce qui suppose de déplacer les pièces dans sa tête —
 * précisément ce qu'un débutant ne sait pas encore faire.
 *
 * On rejoue donc le coup du moteur sur la position d'avant et on l'explique
 * **comme s'il avait été joué**, avec exactement la même machinerie : verdict,
 * cause, conséquence. Rien n'est inventé pour l'occasion, et c'est le point —
 * une seconde rédaction, écrite à part, finirait par contredire la première.
 *
 * Rend `null` si le coup est incohérent avec la position. Un remède sans
 * justification vaut mieux qu'une justification fabriquée.
 */
export function explainRecommendedMove(
  input: RecommendedExplanationInput,
): MoveExplanation | null {
  let board: Chess
  let played: ReturnType<Chess['history']>[number] | undefined
  try {
    board = new Chess(input.fenBefore, { skipValidation: true })
    board.move(input.bestSan)
    played = board.history({ verbose: true }).at(-1)
  } catch {
    return null
  }
  if (!played) return null

  // Les motifs du coup, et non ceux de la position : `detectMoveMotifs` compare
  // l'avant et l'après pour ne retenir que ce que ce coup-là vient de créer. Un
  // clouage qui existait déjà n'est pas son mérite.
  const motifs = detectMoveMotifs({
    fenBefore: input.fenBefore,
    fenAfter: board.fen(),
    from: played.from as Square,
    to: played.to as Square,
    piece: played.piece as PieceSymbol,
    captured: played.captured as PieceSymbol | undefined,
    promotion: played.promotion as PieceSymbol | undefined,
    isEnPassant: played.flags.includes('e'),
    color: input.mover,
  })

  return explainMove({
    locale: input.locale,
    san: input.bestSan,
    fenBefore: input.fenBefore,
    fenAfter: board.fen(),
    // `best` par construction : c'est le premier choix du moteur. On ne
    // recalcule pas la qualité — il n'y a rien à classer, la référence est le
    // coup lui-même.
    quality: 'best',
    scoreBefore: input.scoreBefore,
    scoreAfter: input.scoreAfter,
    winLoss: 0,
    mover: input.mover,
    motifs,
    // Ni `bestSan` ni `bestLine` en entrée : les passer ferait rédiger un
    // remède à un coup qui n'a rien à corriger — « mieux valait Cf3 » sous le
    // titre « Cf3 ». La suite reste affichée à côté, où elle a un sens.
    bestSan: null,
  })
}
