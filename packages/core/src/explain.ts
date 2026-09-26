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
  PIECE_ARTICLE,
  PIECE_NAMES,
  opposite,
  SAN_LETTER_EN,
  SAN_LETTER_FR,
  SIMPLE_VALUES,
} from './board.ts'
import { VERDICT_PHRASE } from './classify.ts'
import { detectMoveMotifs, detectPositionMotifs } from './motifs.ts'
import { advantageLabel } from './eval.ts'
import type { CleDeTexte, DetectedMotif, MotifId, MoveQuality, Score } from './types.ts'

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
export function localiseSan(san: string, locale: Locale, notation: Notation = 'lettres'): string {
  if (notation === 'figurine') return sanToFigurine(san)
  return locale === 'fr' ? sanToFrench(san) : san
}

/** Le glyphe figurine, et la pièce qu'il dessine. */
const FIGURINE_PIECES: Record<string, PieceSymbol> = {
  '♔': 'k',
  '♕': 'q',
  '♖': 'r',
  '♗': 'b',
  '♘': 'n',
}

/**
 * Ramène les figurines à leur lettre.
 *
 * Les explications s'écrivent désormais dans la notation choisie : quand c'est
 * la figurine, elles contiennent « ♘f3 ». La synthèse vocale, elle, lit ce
 * glyphe « symbole cavalier blanc » — ou ne le lit pas du tout. On le rend donc
 * à sa lettre avant de parler, ce qui redonne exactement la phrase d'avant.
 */
export function figurinesEnLettres(text: string, locale: Locale): string {
  const letters = locale === 'fr' ? SAN_LETTER_FR : SAN_LETTER_EN
  return text.replace(/[♔♕♖♗♘]/g, (glyph) => letters[FIGURINE_PIECES[glyph]!]!)
}

/**
 * Pourquoi un coup marche : ce qu'il attaque, et ce qui le protège.
 *
 * Le coach nommait le motif — « Fourchette » — et s'arrêtait là. C'est le mot
 * qui manque le moins : on voit bien qu'il se passe quelque chose, ce qu'on ne
 * voit pas, c'est *quoi*. Un joueur à qui l'on conseille d5 se demande d'abord
 * pourquoi ce pion ne serait pas simplement perdu ; la réponse tient en deux
 * faits — il attaque deux pièces à la fois, et la dame le couvre — dont aucun
 * n'était écrit nulle part.
 *
 * On ne détecte donc pas des figures de tactique, on énonce deux relations que
 * n'importe qui peut vérifier sur l'échiquier :
 *
 *  1. les pièces adverses que la pièce déplacée attaque depuis sa case
 *     d'arrivée — les rois et les pions sont écartés, c'est le matériel qui
 *     parle ;
 *  2. ce qui défend cette case d'arrivée, qui est la question qu'on se pose
 *     juste après.
 *
 * `null` quand il n'y a rien à dire : mieux vaut se taire qu'énoncer une
 * évidence à chaque coup.
 */
export function pourquoiCeCoup(fenBefore: string, uci: string, locale: Locale): string | null {
  const fr = locale === 'fr'

  let board: Chess
  let move
  try {
    board = new Chess(fenBefore, { skipValidation: true })
    move = board.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci[4] : undefined,
    })
  } catch {
    // Coup impossible dans cette position : on n'invente pas d'explication.
    return null
  }

  const mover = move.color
  const arrivee = move.to as Square

  // Ce que la pièce déplacée vise depuis sa nouvelle case. On ne compte que ce
  // qui vaut plus qu'un pion : « ton pion attaque un pion » n'apprend rien.
  const vises: Array<{ type: PieceSymbol; square: Square }> = []
  for (const square of SQUARES) {
    const piece = board.get(square)
    if (!piece || piece.color === mover || piece.type === 'k' || piece.type === 'p') continue
    if (board.attackers(square, mover).includes(arrivee)) {
      vises.push({ type: piece.type, square })
    }
  }
  if (vises.length === 0) return null
  // La plus grosse prise d'abord : c'est celle qu'on regarde.
  vises.sort((a, b) => SIMPLE_VALUES[b.type] - SIMPLE_VALUES[a.type])

  const nomme = (type: PieceSymbol, square: Square) =>
    fr
      ? `${PIECE_ARTICLE[type]} ${PIECE_NAMES[type].fr} en ${square}`
      : `the ${PIECE_NAMES[type].en} on ${square}`

  const piece = fr ? PIECE_NAMES[move.piece].fr : PIECE_NAMES[move.piece].en
  const sujet = fr
    ? `${PIECE_ARTICLE[move.piece]} ${piece} en ${arrivee}`
    : `the ${piece} on ${arrivee}`

  let phrase: string
  if (vises.length >= 2) {
    const deux = vises.slice(0, 2).map(({ type, square }) => nomme(type, square))
    phrase = fr
      ? `${majuscule(sujet)} attaque en même temps ${deux[0]} et ${deux[1]} : l’un des deux tombe.`
      : `${majuscule(sujet)} attacks ${deux[0]} and ${deux[1]} at once: one of them falls.`
  } else {
    const seul = nomme(vises[0]!.type, vises[0]!.square)
    phrase = fr ? `${majuscule(sujet)} attaque ${seul}.` : `${majuscule(sujet)} attacks ${seul}.`
  }

  // Ce qui couvre la case d'arrivée. C'est la question suivante — « et il ne se
  // fait pas prendre ? » — et elle vient toujours.
  const defenseurs = board
    .attackers(arrivee, mover)
    .map((square) => ({ square, piece: board.get(square) }))
    .filter((entree) => entree.piece)
  const defenseur = defenseurs[0]
  if (defenseur?.piece) {
    phrase += fr
      ? ` Il est défendu par ${nomme(defenseur.piece.type, defenseur.square)}.`
      : ` It is defended by ${nomme(defenseur.piece.type, defenseur.square)}.`
  }

  return phrase
}

/** Première lettre en capitale, pour commencer une phrase. */
function majuscule(texte: string): string {
  return texte.charAt(0).toUpperCase() + texte.slice(1)
}

/**
 * Notation d'origine d'un coup à prononcer.
 *
 * Les deux alphabets ne se recouvrent que sur une lettre, et c'est justement
 * celle du roi : `R` est la **tour** en anglais et le **roi** en français. Toutes
 * les autres — `N B Q K` d'un côté, `C F T D` de l'autre — sont sans ambiguïté
 * et se reconnaissent quelle que soit la valeur donnée ici.
 *
 * D'où ce paramètre : sur un `R`, il n'existe aucun moyen de deviner, et se
 * tromper s'entend immédiatement.
 *  - `'en'` — le coup vient de chess.js ou du moteur, format d'échange du
 *    projet. C'est le cas courant, donc la valeur par défaut.
 *  - `'fr'` — le coup a déjà été traduit pour l'affichage, et on relit du texte
 *    écrit pour un lecteur français.
 */
export type SanDialect = 'en' | 'fr'

/**
 * Notation épelée pour la synthèse vocale.
 * `Cf3` devient « cavalier f 3 », `O-O` devient « petit roque ».
 */
export function sanToSpeech(san: string, locale: Locale, dialect: SanDialect = 'en'): string {
  const fr = locale === 'fr'
  if (san.startsWith('O-O-O')) return fr ? 'grand roque' : 'queenside castles'
  if (san.startsWith('O-O')) return fr ? 'petit roque' : 'kingside castles'

  // On essaie d'abord l'alphabet annoncé, l'autre ensuite : un `Nf3` anglais
  // resté dans un texte français se lit toujours « cavalier », puisque `N`
  // n'existe pas en notation française. Seul le `R` dépend vraiment du dialecte.
  const [premier, second] =
    dialect === 'fr' ? [SAN_LETTER_FR, SAN_LETTER_EN] : [SAN_LETTER_EN, SAN_LETTER_FR]
  const found = matchPiece(san, premier) ?? matchPiece(san, second)

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

  /*
    La pièce promue est *lue*, et non supposée.

    Elle était annoncée « une dame » quoi qu'il arrive, alors que la lettre
    figurait déjà dans le coup et que le sélecteur de promotion propose bien les
    quatre. Sous-promouvoir en cavalier — le cas où l'on choisit justement autre
    chose, parce qu'il donne échec ou une fourchette — s'entendait donc comme
    une promotion en dame, sur un échiquier où l'on voit un cavalier.
  */
  const promotion = /=([QRBNDTFC])/.exec(rest)
  const promu = promotion ? promotedPiece(promotion[1]!) : null
  rest = rest.replace(/=[QRBNDTFC]/, '')
  const target = rest.slice(-2)

  if (!fr) {
    const verb = capture ? `takes on ${target}` : `goes to ${target}`
    const suffix = mate ? ', checkmate' : check ? ', with check' : ''
    const becomes = promu ? `, promoting to a ${PIECE_NAMES[promu].en}` : ''
    return `the ${piece} ${verb}${becomes}${suffix}`
  }

  const article = feminine ? 'la' : 'le'
  const verbe = capture ? `prend en ${target}` : `va en ${target}`
  const fin = mate ? ', et c’est échec et mat' : check ? ', avec échec' : ''
  const devient = promu
    ? `, et devient ${PIECE_ARTICLE[promu] === 'la' ? 'une' : 'un'} ${PIECE_NAMES[promu].fr}`
    : ''
  return `${article} ${piece} ${verbe}${devient}${fin}`
}

/**
 * La lettre qui suit le `=` d'une promotion, dans l'une ou l'autre notation.
 *
 * `D` et `T` sont françaises, `Q` et `R` anglaises ; `B` est ambigu — fou en
 * anglais, rien en français — et l'on tranche pour l'anglais, qui est la
 * notation dans laquelle les coups circulent à l'intérieur de l'application.
 */
function promotedPiece(letter: string): PieceSymbol {
  switch (letter) {
    case 'R':
    case 'T':
      return 'r'
    case 'B':
    case 'F':
      return 'b'
    case 'N':
    case 'C':
      return 'n'
    default:
      return 'q'
  }
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
  /** Nom court du motif, pour les étiquettes. Clé de dictionnaire. */
  name: CleDeTexte
  /** Définition générale, en info-bulle et au glossaire. Clé de dictionnaire. */
  definition: CleDeTexte
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
  /**
   * Façon d'écrire les coups cités dans les phrases.
   *
   * Les explications citent des coups — le remède, la suite recommandée, la
   * variante d'un mat forcé — et elles les écrivaient toujours en lettres,
   * pendant que la liste des coups, elle, obéissait aux préférences. Avec le
   * réglage par défaut, la même partie s'affichait donc « ♘f3 » à gauche et
   * « Cf3 » dans le texte à droite, à deux centimètres l'une de l'autre.
   *
   * Absente, on garde les lettres : c'est ce que veulent l'export PGN et les
   * quelques appels qui n'ont pas de préférence sous la main.
   */
  notation?: Notation
}

/** Un coup cité dans une phrase, écrit comme le lecteur les lit. */
function citer(san: string, ctx: ExplainContext): string {
  return localiseSan(san, ctx.locale, ctx.notation)
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
const TROISIEME: Record<string, string> = {
  ton: 'son',
  ta: 'sa',
  tes: 'ses',
  Ton: 'Son',
  Ta: 'Sa',
  Tes: 'Ses',
}

function possessif(
  m: DetectedMotif,
  ctx: ExplainContext,
  forme: 'ton' | 'ta' | 'tes' | 'Ton' | 'Ta' | 'Tes',
): string {
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
 * Accord avec la pièce nommée.
 *
 * Les phrases des motifs ont été écrites pour « la pièce », puis `pieceAt` a
 * appris à dire « le cavalier » — et l'on a lu « le cavalier en b4 est
 * collée… Elle ne peut plus bouger ». Sans type connu, on reste sur « la
 * pièce », donc au féminin.
 */
function accordDe(type: PieceSymbol | undefined): { e: string; il: string; Il: string } {
  return !type || type === 'r' || type === 'q'
    ? { e: 'e', il: 'elle', Il: 'Elle' }
    : { e: '', il: 'il', Il: 'Il' }
}

function accord(ctx: ExplainContext, square: Square | undefined): ReturnType<typeof accordDe> {
  return accordDe(square ? ctx.board.get(square)?.type : undefined)
}

/**
 * Textes français de chaque motif.
 *
 * Le ton est celui d'un entraîneur bienveillant qui tutoie : on s'adresse à un
 * débutant, pas à un lecteur d'ouvrage de théorie.
 */
const MOTIFS_FR: Partial<Record<MotifId, MotifCopy>> = {
  hangingPiece: {
    name: 'motifs.hangingPiece.name',
    definition: 'motifs.hangingPiece.definition',
    sentence: (m, ctx) => {
      const type = (m.detail?.piece as PieceSymbol) ?? 'p'
      const square = m.squares[0]
      const gain = Number(m.detail?.gain ?? 0)
      if (m.detail?.ownBlunder) {
        return `${capitalise(pieceWithPossessive(type, ctx))} en ${square} reste sans défense suffisante : ${accordDe(type).il} sera repris${accordDe(type).e}, et c'est ${materialWord(gain, 'fr')} de perdus.`
      }
      return `${capitalise(pieceWithArticle(type, 'fr'))} adverse en ${square} est en prise — ${materialWord(gain, 'fr')} à récupérer.`
    },
  },
  fork: {
    name: 'motifs.fork.name',
    definition: 'motifs.fork.definition',
    sentence: (m, _ctx) => {
      const type = (m.detail?.piece as PieceSymbol) ?? 'n'
      const count = Number(m.detail?.targetCount ?? 2)
      const targets = m.squares.slice(1).join(' et ')
      return `Fourchette : ${pieceWithArticle(type, 'fr')} en ${m.squares[0]} attaque ${count} pièces d'un coup (${targets}). L'adversaire ne peut pas tout sauver.`
    },
  },
  pin: {
    name: 'motifs.pin.name',
    definition: 'motifs.pin.definition',
    sentence: (m, ctx) => {
      const front = m.squares[1]
      const back = m.squares[2]
      const absolute = m.detail?.absolute === true
      return absolute
        ? `Clouage absolu : ${pieceAt(ctx, front)} en ${front} est collé${accord(ctx, front).e} devant son roi en ${back}. ${accord(ctx, front).Il} ne peut plus bouger du tout, tu peux l'attaquer à loisir.`
        : `Clouage : ${pieceAt(ctx, front)} en ${front} ne peut pas s'écarter sans livrer ${pieceAt(ctx, back)} en ${back}.`
    },
  },
  skewer: {
    name: 'motifs.skewer.name',
    definition: 'motifs.skewer.definition',
    sentence: (m, ctx) =>
      `Enfilade : ${pieceAt(ctx, m.squares[1])} en ${m.squares[1]} doit s'écarter, et en partant ${accord(ctx, m.squares[1]).il} laisse tomber ${pieceAt(ctx, m.squares[2])} en ${m.squares[2]}.`,
  },
  discoveredAttack: {
    name: 'motifs.discoveredAttack.name',
    definition: 'motifs.discoveredAttack.definition',
    sentence: (m, ctx) =>
      m.detail?.check
        ? `Échec à la découverte : en libérant ${m.squares[1]}, ${sujet(m, ctx, 'ouvrir')} la ligne de ${pieceAt(ctx, m.squares[0])} en ${m.squares[0]} sur le roi. Il faut parer l'échec, et rien d'autre n'est possible.`
        : `Attaque à la découverte : la case ${m.squares[1]} libérée ouvre la ligne de ${pieceAt(ctx, m.squares[0])} sur ${m.squares[2]}.`,
  },
  doubleCheck: {
    name: 'motifs.doubleCheck.name',
    definition: 'motifs.doubleCheck.definition',
    sentence: () =>
      `Échec double ! Impossible de capturer ou d'interposer quoi que ce soit : le roi doit se déplacer, un point c'est tout.`,
  },
  removingTheDefender: {
    name: 'motifs.removingTheDefender.name',
    definition: 'motifs.removingTheDefender.definition',
    sentence: (m, _ctx) =>
      `Élimination du défenseur : la prise en ${m.squares[0]} retire le gardien de ${m.squares.slice(1).join(' et ')}, qui devient prenable.`,
  },
  overloadedPiece: {
    name: 'motifs.overloadedPiece.name',
    definition: 'motifs.overloadedPiece.definition',
    sentence: (m, ctx) =>
      `${capitalise(pieceAt(ctx, m.squares[0]))} en ${m.squares[0]} est surchargé${accord(ctx, m.squares[0]).e} : ${accord(ctx, m.squares[0]).il} défend à la fois ${m.squares.slice(1).join(' et ')}. Attaque l'une des deux, et l'autre tombe.`,
  },
  trappedPiece: {
    name: 'motifs.trappedPiece.name',
    definition: 'motifs.trappedPiece.definition',
    sentence: (m, ctx) =>
      `${capitalise(pieceAt(ctx, m.squares[0]))} en ${m.squares[0]} est piégé${accord(ctx, m.squares[0]).e} : toutes ses cases de fuite sont couvertes. ${accord(ctx, m.squares[0]).Il} est condamné${accord(ctx, m.squares[0]).e}.`,
  },
  backRankMate: {
    name: 'motifs.backRankMate.name',
    definition: 'motifs.backRankMate.definition',
    sentence: (m) =>
      `Attention au couloir : le roi en ${m.squares[0]} est enfermé par ses propres pions. Une tour ou une dame sur cette rangée donne mat immédiatement.`,
  },
  smotheredMate: {
    name: 'motifs.smotheredMate.name',
    definition: 'motifs.smotheredMate.definition',
    sentence: () =>
      `Mat étouffé : le roi est prisonnier de ses propres pièces, et le cavalier saute par-dessus toutes les défenses.`,
  },
  mateIn1: {
    name: 'motifs.mateIn1.name',
    definition: 'motifs.mateIn1.definition',
    sentence: (m, ctx) =>
      pourLeJoueur(m, ctx)
        ? `Il y a mat en un coup, et il est pour toi.`
        : `Attention : ton adversaire a mat en un coup.`,
  },
  mateIn2: {
    name: 'motifs.mateIn2.name',
    definition: 'motifs.mateIn2.definition',
    sentence: (m, ctx) =>
      `${quiA(m, ctx)} un mat forcé en deux coups${m.detail?.line ? ` : ${(m.detail.line as string[]).map((s) => citer(s, ctx)).join(' ')}` : ''}.`,
  },
  mateIn3: {
    name: 'motifs.mateIn3.name',
    definition: 'motifs.mateIn3.definition',
    sentence: (m, ctx) =>
      `${quiA(m, ctx)} un mat forcé en trois coups${m.detail?.line ? ` : ${(m.detail.line as string[]).map((s) => citer(s, ctx)).join(' ')}` : ''}.`,
  },
  mateThreat: {
    name: 'motifs.mateThreat.name',
    definition: 'motifs.mateThreat.definition',
    sentence: (m, ctx) =>
      pourLeJoueur(m, ctx)
        ? `Tu menaces le mat : si l'adversaire ne pare pas, c'est fini.`
        : `Il y a une menace de mat contre toi : il faut la parer immédiatement.`,
  },
  sacrifice: {
    name: 'motifs.sacrifice.name',
    definition: 'motifs.sacrifice.definition',
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
    name: 'motifs.promotion.name',
    definition: 'motifs.promotion.definition',
    sentence: (m) => `Le pion arrive en ${m.squares[0]} et devient dame.`,
  },
  underPromotion: {
    name: 'motifs.underPromotion.name',
    definition: 'motifs.underPromotion.definition',
    sentence: (m) =>
      `Sous-promotion en ${m.detail?.to === 'n' ? 'cavalier' : m.detail?.to === 'r' ? 'tour' : 'fou'} : la dame ne conviendrait pas ici.`,
  },
  enPassant: {
    name: 'motifs.enPassant.name',
    definition: 'motifs.enPassant.definition',
    sentence: (m) => `Prise en passant : ${m.squares[0]} capture le pion qui venait de doubler.`,
  },
  passedPawn: {
    name: 'motifs.passedPawn.name',
    definition: 'motifs.passedPawn.definition',
    sentence: (m) =>
      `Pion passé en ${m.squares[0]} : plus aucun pion adverse ne peut l'arrêter. En finale, c'est souvent décisif.`,
  },
  protectedPassedPawn: {
    name: 'motifs.protectedPassedPawn.name',
    definition: 'motifs.protectedPassedPawn.definition',
    sentence: (m) =>
      `Pion passé **protégé** en ${m.squares[0]} — soutenu par un pion, c'est l'un des meilleurs atouts qui existent.`,
  },
  isolatedPawn: {
    name: 'motifs.isolatedPawn.name',
    definition: 'motifs.isolatedPawn.definition',
    sentence: (m) =>
      `Pion isolé en ${m.squares[0]} : aucun pion ami ne pourra jamais le défendre. C'est une cible à long terme.`,
  },
  doubledPawns: {
    name: 'motifs.doubledPawns.name',
    definition: 'motifs.doubledPawns.definition',
    sentence: (m) => `Pions doublés en ${m.squares[0]} : ils se bloquent l'un l'autre.`,
  },
  backwardPawn: {
    name: 'motifs.backwardPawn.name',
    definition: 'motifs.backwardPawn.definition',
    sentence: (m) =>
      `Pion arriéré en ${m.squares[0]} : il ne peut plus être soutenu par un pion et la case devant lui est tenue.`,
  },
  outpost: {
    name: 'motifs.outpost.name',
    definition: 'motifs.outpost.definition',
    sentence: (m) =>
      `Avant-poste en ${m.squares[0]} : la pièce y est soutenue par un pion et aucun pion adverse ne peut la déloger.`,
  },
  bishopPair: {
    name: 'motifs.bishopPair.name',
    definition: 'motifs.bishopPair.definition',
    sentence: (m, ctx) =>
      pourLeJoueur(m, ctx)
        ? `Tu as la paire de fous : ouvre la position, ils vaudront de plus en plus cher.`
        : `Ton adversaire a la paire de fous : garde la position fermée, sinon ils vaudront de plus en plus cher.`,
  },
  badBishop: {
    name: 'motifs.badBishop.name',
    definition: 'motifs.badBishop.definition',
    sentence: (m, ctx) =>
      `Mauvais fou en ${m.squares[0]} : ${possessif(m, ctx, 'tes')} pions occupent les cases de sa couleur et l'étouffent.`,
  },
  openFile: {
    name: 'motifs.openFile.name',
    definition: 'motifs.openFile.definition',
    sentence: (m, ctx) =>
      `${capitalise(possessif(m, ctx, 'ta'))} tour en ${m.squares[0]} occupe une colonne ouverte — c'est sa place idéale.`,
  },
  semiOpenFile: {
    name: 'motifs.semiOpenFile.name',
    definition: 'motifs.semiOpenFile.definition',
    sentence: (m) =>
      `Colonne semi-ouverte pour la tour en ${m.squares[0]} : le pion adverse de cette colonne est une cible.`,
  },
  seventhRank: {
    name: 'motifs.seventhRank.name',
    definition: 'motifs.seventhRank.definition',
    sentence: (m) =>
      `Tour à la septième en ${m.squares[0]} : elle ratisse les pions et cloue le roi sur sa dernière rangée.`,
  },
  exposedKing: {
    name: 'motifs.exposedKing.name',
    definition: 'motifs.exposedKing.definition',
    sentence: (m) =>
      `Le roi adverse en ${m.squares[0]} est à découvert. C'est le moment d'amener des pièces vers lui plutôt que de compter le matériel.`,
  },
  kingSafety: {
    name: 'motifs.kingSafety.name',
    definition: 'motifs.kingSafety.definition',
    sentence: (m, ctx) =>
      pourLeJoueur(m, ctx)
        ? `Ton roi est bien à l'abri : tu peux jouer sur les ailes sans crainte.`
        : `Le roi adverse est bien à l'abri : une attaque directe contre lui coûtera cher.`,
  },
  development: {
    name: 'motifs.development.name',
    definition: 'motifs.development.definition',
    sentence: (m) =>
      `Il reste ${m.squares.length} pièces sur leur case de départ (${squares(m)}). Sors-les avant de lancer une attaque.`,
  },
  centreControl: {
    name: 'motifs.centreControl.name',
    definition: 'motifs.centreControl.definition',
    sentence: (m, ctx) =>
      pourLeJoueur(m, ctx)
        ? `Tu domines le centre — tes pièces ont plus de cases que celles de l'adversaire.`
        : `Ton adversaire domine le centre — ses pièces ont plus de cases que les tiennes.`,
  },
  oppositeCastling: {
    name: 'motifs.oppositeCastling.name',
    definition: 'motifs.oppositeCastling.definition',
    // Les roques opposés ne profitent à personne en particulier : les deux
    // camps attaquent, et le conseil vaut pour le lecteur quel que soit
    // l'auteur du coup. On ne le décline donc pas.
    sentence: () =>
      `Roques opposés : lance tes pions sur le roi adverse, et compte les tempos — c'est une course.`,
  },
  fianchetto: {
    name: 'motifs.fianchetto.name',
    definition: 'motifs.fianchetto.definition',
    sentence: (m) => `Fou en fianchetto en ${m.squares[0]} : il tient toute la grande diagonale.`,
  },
  opposition: {
    name: 'motifs.opposition.name',
    definition: 'motifs.opposition.definition',
    sentence: (m, ctx) =>
      pourLeJoueur(m, ctx)
        ? `Tu as l'opposition : c'est l'adversaire qui doit céder du terrain avec son roi.`
        : `Ton adversaire a l'opposition : c'est toi qui devras céder du terrain avec ton roi.`,
  },
  rookBehindPasser: {
    name: 'motifs.rookBehindPasser.name',
    definition: 'motifs.rookBehindPasser.definition',
    sentence: (m, ctx) =>
      `${capitalise(possessif(m, ctx, 'ta'))} tour en ${m.squares[0]} est derrière le pion passé, exactement là où elle doit être.`,
  },
  wrongBishop: {
    name: 'motifs.wrongBishop.name',
    definition: 'motifs.wrongBishop.definition',
    sentence: (m, ctx) =>
      `Fou de mauvaise couleur : ${possessif(m, ctx, 'ton')} fou ne contrôle pas la case de promotion, la finale est théoriquement nulle.`,
  },
  kingActivity: {
    name: 'motifs.kingActivity.name',
    definition: 'motifs.kingActivity.definition',
    // Conseil de finale, vrai pour les deux camps : on le laisse au lecteur.
    sentence: () => `En finale, avance ton roi : il vaut une pièce mineure de plus.`,
  },
  zugzwang: {
    name: 'motifs.zugzwang.name',
    definition: 'motifs.zugzwang.definition',
    sentence: () => `Zugzwang : l'adversaire est obligé de jouer, et tout coup empire sa position.`,
  },
  blockade: {
    name: 'motifs.blockade.name',
    definition: 'motifs.blockade.definition',
    sentence: (m) => `Blocus en ${m.squares[0]} : le pion passé adverse est stoppé net.`,
  },
  spaceAdvantage: {
    name: 'motifs.spaceAdvantage.name',
    definition: 'motifs.spaceAdvantage.definition',
    sentence: (m, ctx) =>
      pourLeJoueur(m, ctx)
        ? `Tu as l'espace : évite les échanges, l'adversaire manque de cases.`
        : `Ton adversaire a l'espace : cherche les échanges, tes pièces manquent de cases.`,
  },
  xRayAttack: {
    name: 'motifs.xRayAttack.name',
    definition: 'motifs.xRayAttack.definition',
    sentence: (m) => `Attaque en rayon X sur ${m.squares.join(' – ')}.`,
  },
}

/**
 * Les phrases anglaises, quand elles diffèrent d'une traduction mot à mot.
 *
 * Cette table portait aussi le nom et la définition de chaque motif, en clair.
 * Ils sont passés au dictionnaire, qui les rend dans les quarante et une
 * langues : les garder ici revenait à tenir une seconde version anglaise que
 * personne n'affichait plus, et que personne n'aurait pensé à corriger.
 *
 * Ce qui reste est du code de grammaire, pas du texte à traduire : accord,
 * article contracté, pluriel. Voir `MOTIFS_FR` pour la table complète.
 */
const PHRASES_EN: Partial<Record<MotifId, Pick<MotifCopy, 'sentence'>>> = {
  hangingPiece: {
    sentence: (m) => {
      const type = (m.detail?.piece as PieceSymbol) ?? 'p'
      const gain = Number(m.detail?.gain ?? 0)
      return m.detail?.ownBlunder
        ? `Your ${PIECE_NAMES[type].en} on ${m.squares[0]} is left undefended — the opponent wins ${materialWord(gain, 'en')}.`
        : `The ${PIECE_NAMES[type].en} on ${m.squares[0]} is hanging — ${materialWord(gain, 'en')} to be won.`
    },
  },
  fork: {
    sentence: (m) =>
      `Fork: the ${PIECE_NAMES[(m.detail?.piece as PieceSymbol) ?? 'n'].en} on ${m.squares[0]} hits ${m.detail?.targetCount ?? 2} pieces at once (${m.squares.slice(1).join(', ')}).`,
  },
  pin: {
    sentence: (m) =>
      m.detail?.absolute
        ? `Absolute pin: the piece on ${m.squares[1]} is stuck in front of its king on ${m.squares[2]} and cannot move at all.`
        : `Pin: the piece on ${m.squares[1]} cannot step aside without losing the piece on ${m.squares[2]}.`,
  },
  skewer: {
    sentence: (m) =>
      `Skewer: the piece on ${m.squares[1]} must move and gives up the one on ${m.squares[2]}.`,
  },
  discoveredAttack: {
    sentence: (m) =>
      m.detail?.check
        ? `Discovered check: vacating ${m.squares[1]} opens the line from ${m.squares[0]} onto the king.`
        : `Discovered attack: vacating ${m.squares[1]} opens the line from ${m.squares[0]} onto ${m.squares[2]}.`,
  },
  doubleCheck: {
    sentence: () => `Double check — the king is forced to move, nothing else is legal.`,
  },
  backRankMate: {
    sentence: (m) => `Back-rank danger: the king on ${m.squares[0]} has no escape squares.`,
  },
  fianchetto: {
    sentence: (m) => `Fianchettoed bishop on ${m.squares[0]}, controlling the long diagonal.`,
  },
  passedPawn: {
    sentence: (m) => `Passed pawn on ${m.squares[0]} — no enemy pawn can stop it any more.`,
  },
  outpost: {
    sentence: (m) => `Outpost on ${m.squares[0]}: pawn-protected and unassailable by pawns.`,
  },
  seventhRank: {
    sentence: (m) =>
      `Rook on the seventh from ${m.squares[0]} — it rakes pawns and cages the king.`,
  },
  exposedKing: {
    sentence: (m) => `The king on ${m.squares[0]} is exposed — bring pieces towards it.`,
  },
}

/** Catalogue par langue, avec repli sur le français si un texte manque. */
export function motifCopy(id: MotifId, locale: Locale): MotifCopy | null {
  const motif = MOTIFS_FR[id]
  if (!motif) return null
  const anglaise = locale === 'en' ? PHRASES_EN[id] : undefined
  return anglaise ? { ...motif, sentence: anglaise.sentence } : motif
}

/**
 * Glossaire complet, pour la page « Motifs » de l'application.
 *
 * Il prenait une langue et triait sur le nom. Les noms étant devenus des clés,
 * ce tri ordonnait `motifs.backRankMate.name` avant `motifs.fork.name` — soit
 * l'ordre de l'identifiant anglais, quelle que soit la langue lue. Le tri
 * appartient désormais à l'appelant, seul endroit où le nom existe vraiment.
 */
export function motifGlossary(): Array<{
  id: MotifId
  name: CleDeTexte
  definition: CleDeTexte
}> {
  return (Object.entries(MOTIFS_FR) as Array<[MotifId, MotifCopy]>).map(([id, copy]) => ({
    id,
    name: copy.name,
    definition: copy.definition,
  }))
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
  /**
   * Façon d'écrire les coups cités — voir `ExplainContext.notation`.
   * Par défaut les lettres, pour les appels sans préférence sous la main.
   */
  notation?: Notation
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
  const san = localiseSan(input.san, input.locale, input.notation)
  const ctx: ExplainContext = {
    locale: input.locale,
    notation: input.notation,
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
  const relevant = input.motifs.filter((m) => m.weight >= 0.3).slice(0, 3)

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
    const best = localiseSan(input.bestSan, input.locale, input.notation)
    const line = (input.bestLine ?? [])
      .slice(0, 4)
      .map((s) => localiseSan(s, input.locale, input.notation))
    const why = explainBetterMove(input, best)
    const example = exempleDeSuite(line, input, fr)
    betterMove = fr
      ? `Mieux valait ${best}.${why ? ` ${why}` : ''}${example}`
      : `Better was ${best}.${why ? ` ${why}` : ''}${example}`
    // Deuxième, juste après la cause — pas en fin de liste. Le panneau
    // commenté, sa réécoute et la relecture guidée n'affichent que deux
    // paragraphes : sur Da5, gaffe, le clouage et la pièce piégée les
    // occupaient, et « mieux valait Dh4+ » ne se lisait nulle part. Le joueur
    // voyait un coup qui cloue et piège un cavalier sous le verdict « gaffe »,
    // sans un mot de ce qu'il avait manqué. Le nom de l'ouverture, lui, peut
    // attendre.
    const ouverture = input.openingName ? body.shift() : undefined
    body.splice(1, 0, betterMove)
    if (ouverture) body.push(ouverture)
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
      notation: input.notation,
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
  const label = VERDICT_PHRASE[input.quality][fr ? 'fr' : 'en']
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
    const detail = fr ? `mat en ${moves} coup${moves > 1 ? 's' : ''}` : `mate in ${moves}`
    return fr ? `Après ce coup, ${phrase} — ${detail}.` : `After this move, ${phrase} — ${detail}.`
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

  // ── Une prise ─────────────────────────────────────────────────────────────
  //
  // Une prise passait ici comme un coup calme : après cxd4, on lisait « depuis
  // d4, ton pion attaque le cavalier en c3 et le pion en e3 », sans un mot de
  // la prise elle-même. Le joueur voyait alors un pion laissé sans défense, que
  // le pion e3 allait prendre, sous le verdict « excellent » — alors qu'il
  // venait de prendre un pion et qu'on ne faisait que le lui rendre. Ce qu'on
  // prend, et ce qu'on risque de rendre, passe avant ce qu'on attaque.
  const prise = decrirePrise(input, ctx, to, piece.type)
  if (prise) {
    sentences.push(prise.sentence)
    cited.push(...prise.squares)
  }

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
  // Une prise se juge au matériel : « une pièce de plus dans le jeu » là où
  // l'on vient de ramasser une pièce passe à côté.
  const asleep = MINOR_HOME[mover].filter((square) => board.get(square))
  if (!prise && (piece.type === 'n' || piece.type === 'b') && asleep.length > 0) {
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

/**
 * Ce qu'un coup prend, et ce qu'il risque de rendre.
 *
 * Deux faits vérifiables sur l'échiquier : la pièce ramassée, puis les reprises
 * **légales** en face — on interroge les coups de l'adversaire et non les cases
 * qu'il attaque, pour ne pas compter une pièce clouée. Le bilan n'est dit que
 * lorsqu'il est sans appel : pièce contre pièce de même valeur, gain au change,
 * ou rien pour reprendre. Quand on prend plus petit que soi et que la reprise
 * existe, il faudrait compter les défenseurs de chaque camp ; les motifs et le
 * verdict du moteur en parlent déjà, et mieux vaut se taire que se tromper.
 */
function decrirePrise(
  input: MoveExplanationInput,
  ctx: ExplainContext,
  to: Square,
  mine: PieceSymbol,
): { sentence: string; squares: Square[] } | null {
  if (!input.fenBefore || !input.san.includes('x')) return null
  let captured: PieceSymbol | undefined
  try {
    const probe = new Chess(input.fenBefore, { skipValidation: true })
    captured = probe.move(input.san).captured as PieceSymbol | undefined
  } catch {
    return null
  }
  if (!captured) return null

  const fr = ctx.locale === 'fr'
  const sien = estLeLecteur(ctx)

  // Une reprise par case de départ : une prise-promotion en compte quatre.
  const repreneurs = [
    ...new Map(
      ctx.board
        .moves({ verbose: true })
        .filter((move) => move.to === to)
        .map((move) => [move.from as Square, move.piece as PieceSymbol] as const),
    ),
  ]
    .sort((a, b) => SIMPLE_VALUES[a[1]] - SIMPLE_VALUES[b[1]])
    .slice(0, 2)
  const liste = repreneurs
    .map(([square, type]) =>
      fr
        ? `${pieceWithArticle(type, 'fr')} en ${square}`
        : `the ${PIECE_NAMES[type].en} on ${square}`,
    )
    .join(fr ? ' ou ' : ' or ')

  const nom = (type: PieceSymbol) => PIECE_NAMES[type][ctx.locale]
  const feminine = captured === 'r' || captured === 'q'
  let sentence = fr
    ? sien
      ? `Tu prends ${PIECE_ARTICLE[captured]} ${nom(captured)} en ${to}.`
      : `Ton adversaire prend ${feminine ? 'ta' : 'ton'} ${nom(captured)} en ${to}.`
    : sien
      ? `You take the ${nom(captured)} on ${to}.`
      : `Your opponent takes your ${nom(captured)} on ${to}.`

  const donne = SIMPLE_VALUES[mine]
  const recu = SIMPLE_VALUES[captured]
  if (repreneurs.length === 0) {
    sentence += fr
      ? sien
        ? ` Aucune pièce adverse ne peut reprendre en ${to}.`
        : ` Aucune de tes pièces ne peut reprendre en ${to}.`
      : sien
        ? ` Nothing can take back on ${to}.`
        : ` None of your pieces can take back on ${to}.`
  } else if (donne === recu) {
    sentence += fr
      ? sien
        ? ` Ton adversaire peut reprendre en ${to} avec ${liste}, mais c'est un échange : ${nom(captured)} contre ${nom(mine)}, le matériel reste égal.`
        : ` Tu peux reprendre en ${to} avec ${liste} : c'est un échange, ${nom(captured)} contre ${nom(mine)}, le matériel reste égal.`
      : sien
        ? ` Your opponent can take back on ${to} with ${liste}, but that is a trade: ${nom(captured)} for ${nom(mine)}, material stays level.`
        : ` You can take back on ${to} with ${liste}: a trade, ${nom(captured)} for ${nom(mine)}, material stays level.`
  } else if (recu > donne) {
    sentence += fr
      ? sien
        ? ` Même si ton adversaire reprend en ${to}, tu gagnes au change : ${nom(captured)} contre ${nom(mine)}.`
        : ` Même si tu reprends en ${to}, il gagne au change : ${nom(captured)} contre ${nom(mine)}.`
      : sien
        ? ` Even if your opponent takes back on ${to}, you come out ahead: ${nom(captured)} for ${nom(mine)}.`
        : ` Even if you take back on ${to}, they come out ahead: ${nom(captured)} for ${nom(mine)}.`
  } else {
    return { sentence, squares: [] }
  }

  return { sentence, squares: repreneurs.map(([square]) => square) }
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
  const verdict = VERDICT_PHRASE[input.quality][fr ? 'fr' : 'en']
  // Les coups cités dans la phrase reviennent à leur lettre : un glyphe ne se
  // prononce pas, et la voix sautait le mot entier.
  const first = body[0] ? figurinesEnLettres(stripMarkup(body[0]), input.locale) : ''
  const intro = fr ? `${spoken}. ${verdict}.` : `${spoken}. ${verdict}.`
  return [intro, first].filter(Boolean).join(' ')
}

function stripMarkup(text: string): string {
  return text.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()
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
  notation?: Notation,
): { summary: string; points: string[] } {
  const fr = locale === 'fr'
  const board = new Chess(fen, { skipValidation: true })
  const turn = board.turn()
  const ctx: ExplainContext = { locale, notation, board, mover: turn, san: '' }

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
  /** Façon d'écrire les coups cités — voir `ExplainContext.notation`. */
  notation?: Notation
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
export function explainRecommendedMove(input: RecommendedExplanationInput): MoveExplanation | null {
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
    notation: input.notation,
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
