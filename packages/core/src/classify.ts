/**
 * Classification des coups joués.
 *
 * Transforme la sortie brute d'un moteur en un verdict compréhensible :
 * « meilleur coup », « imprécision », « gaffe », « brillant ». C'est ce qui
 * permet à un débutant de relire sa partie sans lire une seule évaluation
 * numérique.
 *
 * Le classement repose sur la **perte de chances de victoire**, pas sur les
 * centipions : perdre 100 centipions quand on a déjà +900 ne change rien à
 * l'issue, alors que les perdre à l'équilibre est catastrophique.
 */

import { Chess } from 'chess.js'
import type { Color } from 'chess.js'
import { PIECE_VALUES, opposite, staticExchange } from './board.ts'
import {
  centipawnLoss,
  moveAccuracy,
  qualityFromWinLoss,
  scoreForColor,
  scoreToCp,
  winPercentFor,
} from './eval.ts'
import { detectMoveMotifs } from './motifs.ts'
import type {
  AnalysedMove,
  DetectedMotif,
  EngineLine,
  MoveQuality,
  Score,
  UciMove,
  CleDeTexte,
} from './types.ts'

export interface ClassifyInput {
  /** Position avant le coup. */
  fenBefore: string
  /** Coup joué, en UCI. */
  uci: UciMove
  /** Coup joué, en SAN. */
  san: string
  /** Analyse de la position **avant** le coup (idéalement en MultiPV). */
  before: { score: Score; lines: EngineLine[] }
  /** Analyse de la position **après** le coup. */
  after: { score: Score }
  /** Vrai si la position est encore dans la théorie d'ouverture connue. */
  inBook?: boolean
  /** Nombre de coups légaux dans la position. */
  legalMoveCount?: number
}

export interface Classification {
  quality: MoveQuality
  winBefore: number
  winAfter: number
  winLoss: number
  centipawnLoss: number
  accuracy: number
  motifs: DetectedMotif[]
  /** Le coup joué était-il le premier choix du moteur ? */
  isTopMove: boolean
  /** Écart entre la meilleure et la deuxième ligne, en points de victoire. */
  onlyMoveMargin: number
  /** Matériel volontairement abandonné, en centipions (0 si aucun). */
  sacrificed: number
}

/**
 * Seuil au-delà duquel un coup unique-sauveur est qualifié de « great » :
 * si toutes les autres options perdent 12 points de victoire de plus, c'est
 * que le joueur a trouvé la seule bonne continuation.
 */
const ONLY_MOVE_MARGIN = 12

/** Matériel minimum abandonné pour parler de sacrifice. */
const SACRIFICE_THRESHOLD = 150

export function classifyMove(input: ClassifyInput): Classification {
  const board = new Chess(input.fenBefore, { skipValidation: true })
  const mover: Color = board.turn()

  const winBefore = winPercentFor(input.before.score, mover)
  const winAfter = winPercentFor(input.after.score, mover)
  const winLoss = Math.max(0, winBefore - winAfter)
  const cpLoss = centipawnLoss(input.before.score, input.after.score, mover)
  const accuracy = moveAccuracy(winBefore, winAfter)

  // Rejouer le coup pour obtenir son contexte complet.
  const replay = new Chess(input.fenBefore, { skipValidation: true })
  const move = safeMove(replay, input.uci)
  const motifs = move
    ? detectMoveMotifs({
        fenBefore: move.before,
        fenAfter: move.after,
        from: move.from,
        to: move.to,
        piece: move.piece,
        captured: move.captured,
        promotion: move.promotion,
        isEnPassant: move.isEnPassant(),
        color: mover,
      })
    : []

  const topLine = input.before.lines.find((l) => l.multipv === 1) ?? input.before.lines[0]
  const secondLine = input.before.lines.find((l) => l.multipv === 2)
  const isTopMove = topLine?.pv[0] === input.uci

  // Marge du « coup unique » : de combien la meilleure ligne devance la suivante.
  const onlyMoveMargin =
    topLine && secondLine
      ? Math.max(0, winPercentFor(topLine.score, mover) - winPercentFor(secondLine.score, mover))
      : 0

  // Matériel abandonné : ce que l'adversaire peut rafler après le coup.
  let sacrificed = 0
  if (move) {
    const recapture = staticExchange(move.after, move.to, opposite(mover))
    const gained = move.captured ? PIECE_VALUES[move.captured] : 0
    sacrificed = Math.max(0, recapture - gained)
  }

  // Chute d'évaluation **sans plafond**. `cpLoss` est borné à ±1000 pour les
  // courbes et l'ACPL : de −18 à −9, il ne voit que 0,8 pion. Pour juger si un
  // sacrifice rapporte, il faut la vraie chute — ici, plus que la tour donnée.
  const evalDrop = Math.max(
    0,
    scoreToCp(scoreForColor(input.before.score, mover)) -
      scoreToCp(scoreForColor(input.after.score, mover)),
  )

  const legalMoveCount = input.legalMoveCount ?? board.moves().length

  const quality = decideQuality({
    winLoss,
    winBefore,
    winAfter,
    isTopMove,
    onlyMoveMargin,
    sacrificed,
    evalDrop,
    legalMoveCount,
    inBook: input.inBook ?? false,
    scoreBefore: input.before.score,
    scoreAfter: input.after.score,
    mover,
    motifs,
  })

  return {
    quality,
    winBefore: round1(winBefore),
    winAfter: round1(winAfter),
    winLoss: round1(winLoss),
    centipawnLoss: cpLoss,
    accuracy: round1(accuracy),
    motifs,
    isTopMove,
    onlyMoveMargin: round1(onlyMoveMargin),
    sacrificed,
  }
}

interface QualityInput {
  winLoss: number
  winBefore: number
  winAfter: number
  isTopMove: boolean
  onlyMoveMargin: number
  sacrificed: number
  /** Chute d'évaluation non bornée, en centipions. */
  evalDrop: number
  legalMoveCount: number
  inBook: boolean
  scoreBefore: Score
  scoreAfter: Score
  mover: Color
  motifs: DetectedMotif[]
}

/**
 * Arbre de décision de la qualité d'un coup.
 *
 * L'ordre des tests compte : les cas particuliers (coup forcé, théorie,
 * sacrifice brillant, occasion manquée) priment sur le simple barème de perte.
 */
function decideQuality(input: QualityInput): MoveQuality {
  // Un seul coup légal : aucun mérite, aucun reproche.
  if (input.legalMoveCount <= 1) return 'forced'

  // Occasion manquée : un mat forcé était disponible et n'a pas été joué.
  const hadMate = input.scoreBefore.type === 'mate'
  const stillMate = input.scoreAfter.type === 'mate'
  const mateWasOurs =
    hadMate && (input.mover === 'w' ? input.scoreBefore.value > 0 : input.scoreBefore.value < 0)
  const mateStillOurs =
    stillMate && (input.mover === 'w' ? input.scoreAfter.value > 0 : input.scoreAfter.value < 0)
  if (mateWasOurs && !mateStillOurs) return 'miss'

  // Gain décisif laissé filer : on était gagnant, on ne l'est plus du tout.
  if (input.winBefore >= 85 && input.winAfter < 60) return 'miss'

  // Sacrifice sain : on abandonne du matériel, c'est quand même le meilleur
  // coup, et la position reste au moins équilibrée. C'est le « brillant ».
  //
  // Hors premier choix du moteur, il faut en plus que le sacrifice se paie :
  // que l'évaluation perde moins de la moitié de ce qu'on a donné. Les chances
  // de victoire seules ne le disent pas dans une position déjà gagnée — elles
  // y sont saturées. Txe3+ à −18, tour donnée pour un pion et évaluation
  // tombée à −9, passait ainsi pour « brillant ! », avec une phrase assurant
  // que la position rapportait « plus lourd que la pièce ».
  if (
    input.sacrificed >= SACRIFICE_THRESHOLD &&
    input.winLoss < 3 &&
    input.winAfter >= 45 &&
    (input.isTopMove || (input.winLoss < 1 && input.evalDrop < input.sacrificed / 2))
  ) {
    return 'brilliant'
  }

  // Sacrifice qui ne se paie pas : de la matière donnée pour rien, dans une
  // position si gagnée que les chances de victoire n'en bougent presque pas.
  // Le barème seul l'aurait dit « excellent », et la phrase du sacrifice
  // aurait parlé d'avantage pris ailleurs. Donner une tour pour un pion reste
  // la leçon à retenir, même à +18.
  if (
    !input.isTopMove &&
    input.sacrificed >= SACRIFICE_THRESHOLD &&
    input.evalDrop >= input.sacrificed / 2
  ) {
    const quality = qualityFromWinLoss(input.winLoss)
    return quality === 'excellent' || quality === 'good' ? 'inaccuracy' : quality
  }

  // Coup unique : toutes les autres options étaient nettement pires.
  if (input.isTopMove && input.onlyMoveMargin >= ONLY_MOVE_MARGIN) return 'great'

  // Coup de théorie encore dans le livre d'ouvertures.
  if (input.inBook && input.winLoss < 8) return 'book'

  if (input.isTopMove) return 'best'

  return qualityFromWinLoss(input.winLoss)
}

function safeMove(board: Chess, uci: UciMove) {
  try {
    return board.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci[4] : undefined,
    })
  } catch {
    return null
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

// ─────────────────────────────────────────────────────────────────────────────
//  Rendu visuel des classifications
// ─────────────────────────────────────────────────────────────────────────────

export interface QualityStyle {
  /** Symbole affiché sur l'échiquier et dans la liste des coups. */
  glyph: string
  /** Couleur de la pastille (variable CSS du thème). */
  token: string
  /** Annotation d'échecs traditionnelle. */
  nag: string
  label: CleDeTexte
  /**
   * Ce que la classification veut dire, en une phrase.
   *
   * L'étiquette seule ne suffit pas : « Coup unique » ou « Occasion manquée »
   * sont des termes de métier, et une pastille « 📖 4 » n'apprend rien à qui ne
   * connaît pas le symbole. La définition sert d'infobulle partout où le barème
   * s'affiche — bilan de partie, résumé de précision, liste des coups.
   */
  description: CleDeTexte
}

/**
 * Apparence de chaque classification.
 *
 * Les `nag` sont les annotations standard des livres d'échecs (`!!`, `?`, `?!`)
 * pour que le joueur retrouve ses repères s'il lit de la littérature papier.
 */
/**
 * Le verdict en un mot, pour la **composition de phrases** du cœur.
 *
 * `QUALITY_STYLES.label` est une clé de dictionnaire : c'est ce que l'interface
 * affiche, dans la langue choisie. Mais `buildHeadline` et `buildSpokenHeadline`
 * assemblent une phrase — « Cf3. Brillant. » — et n'ont pas de dictionnaire :
 * ils font de la grammaire française ou anglaise, et ces deux langues-là sont
 * les seules dans lesquelles ils savent écrire. Ils lisent donc ici.
 *
 * Ce n'est pas une duplication du dictionnaire mais son pendant : d'un côté le
 * mot affiché dans quarante-et-une langues, de l'autre le mot que deux
 * générateurs de phrases insèrent dans une syntaxe.
 */
export const VERDICT_PHRASE: Record<MoveQuality, { fr: string; en: string }> = {
  brilliant: { fr: 'Brillant', en: 'Brilliant' },
  great: { fr: 'Coup unique', en: 'Great move' },
  best: { fr: 'Meilleur coup', en: 'Best move' },
  excellent: { fr: 'Excellent', en: 'Excellent' },
  good: { fr: 'Bon coup', en: 'Good move' },
  book: { fr: 'Théorie', en: 'Book move' },
  forced: { fr: 'Forcé', en: 'Forced' },
  inaccuracy: { fr: 'Imprécision', en: 'Inaccuracy' },
  mistake: { fr: 'Erreur', en: 'Mistake' },
  miss: { fr: 'Occasion manquée', en: 'Missed win' },
  blunder: { fr: 'Gaffe', en: 'Blunder' },
}

export const QUALITY_STYLES: Record<MoveQuality, QualityStyle> = {
  brilliant: {
    glyph: '!!',
    token: 'brilliant',
    nag: '!!',
    label: 'qualites.brilliant.label',
    description: 'qualites.brilliant.description',
  },
  great: {
    glyph: '!',
    token: 'great',
    nag: '!',
    label: 'qualites.great.label',
    description: 'qualites.great.description',
  },
  best: {
    glyph: '★',
    token: 'best',
    nag: '',
    label: 'qualites.best.label',
    description: 'qualites.best.description',
  },
  excellent: {
    glyph: '✓',
    token: 'excellent',
    nag: '',
    label: 'qualites.excellent.label',
    description: 'qualites.excellent.description',
  },
  good: {
    glyph: '✓',
    token: 'good',
    nag: '',
    label: 'qualites.good.label',
    description: 'qualites.good.description',
  },
  book: {
    glyph: '📖',
    token: 'book',
    nag: '',
    label: 'qualites.book.label',
    description: 'qualites.book.description',
  },
  forced: {
    glyph: '⟶',
    token: 'forced',
    nag: '□',
    label: 'qualites.forced.label',
    description: 'qualites.forced.description',
  },
  inaccuracy: {
    glyph: '?!',
    token: 'inaccuracy',
    nag: '?!',
    label: 'qualites.inaccuracy.label',
    description: 'qualites.inaccuracy.description',
  },
  mistake: {
    glyph: '?',
    token: 'mistake',
    nag: '?',
    label: 'qualites.mistake.label',
    description: 'qualites.mistake.description',
  },
  blunder: {
    glyph: '??',
    token: 'blunder',
    nag: '??',
    label: 'qualites.blunder.label',
    description: 'qualites.blunder.description',
  },
  miss: {
    glyph: '×',
    token: 'miss',
    nag: '?',
    label: 'qualites.miss.label',
    description: 'qualites.miss.description',
  },
}

/**
 * Qualités qui méritent d'être signalées dans une liste de coups.
 *
 * Une partie est faite pour l'essentiel de coups corrects : les colorer tous
 * revient à n'en colorer aucun, puisque plus rien ne ressort. On garde donc les
 * deux extrémités — ce qui était remarquable, ce qui a coûté cher — et on
 * laisse le reste de la couleur du texte ordinaire.
 *
 * `book` en fait partie : un coup de théorie n'est pas un mérite du joueur,
 * c'est une page de livre.
 */
export function isNotableQuality(quality: MoveQuality): boolean {
  return quality !== 'good' && quality !== 'excellent' && quality !== 'forced' && quality !== 'book'
}

/** Compte les coups par qualité, pour le tableau de bord d'après-partie. */
export function countQualities(moves: AnalysedMove[], color: Color): Record<MoveQuality, number> {
  const counts = Object.fromEntries(Object.keys(QUALITY_STYLES).map((k) => [k, 0])) as Record<
    MoveQuality,
    number
  >
  for (const move of moves) {
    if (move.color !== color) continue
    counts[move.quality] += 1
  }
  return counts
}

/**
 * Moments où la partie a basculé : les coups qui ont fait passer l'avantage
 * d'un camp à l'autre, ou qui ont détruit une position gagnante.
 */
export function findTurningPoints(moves: AnalysedMove[]): number[] {
  const out: number[] = []
  for (const move of moves) {
    const before = scoreToCp(move.scoreBefore)
    const after = scoreToCp(move.scoreAfter)
    const flipped = Math.sign(before) !== Math.sign(after) && Math.abs(before - after) > 150
    const collapsed = move.winLoss >= 25
    if (flipped || collapsed) out.push(move.ply)
  }
  return out
}
