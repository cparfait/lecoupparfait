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
      ? Math.max(
          0,
          winPercentFor(topLine.score, mover) - winPercentFor(secondLine.score, mover),
        )
      : 0

  // Matériel abandonné : ce que l'adversaire peut rafler après le coup.
  let sacrificed = 0
  if (move) {
    const recapture = staticExchange(move.after, move.to, opposite(mover))
    const gained = move.captured ? PIECE_VALUES[move.captured] : 0
    sacrificed = Math.max(0, recapture - gained)
  }

  const legalMoveCount = input.legalMoveCount ?? board.moves().length

  const quality = decideQuality({
    winLoss,
    winBefore,
    winAfter,
    isTopMove,
    onlyMoveMargin,
    sacrificed,
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
    hadMate &&
    (input.mover === 'w' ? input.scoreBefore.value > 0 : input.scoreBefore.value < 0)
  const mateStillOurs =
    stillMate &&
    (input.mover === 'w' ? input.scoreAfter.value > 0 : input.scoreAfter.value < 0)
  if (mateWasOurs && !mateStillOurs) return 'miss'

  // Gain décisif laissé filer : on était gagnant, on ne l'est plus du tout.
  if (input.winBefore >= 85 && input.winAfter < 60) return 'miss'

  // Sacrifice sain : on abandonne du matériel, c'est quand même le meilleur
  // coup, et la position reste au moins équilibrée. C'est le « brillant ».
  if (
    input.sacrificed >= SACRIFICE_THRESHOLD &&
    input.winLoss < 3 &&
    input.winAfter >= 45 &&
    (input.isTopMove || input.winLoss < 1)
  ) {
    return 'brilliant'
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
  label: { fr: string; en: string }
  /**
   * Ce que la classification veut dire, en une phrase.
   *
   * L'étiquette seule ne suffit pas : « Coup unique » ou « Occasion manquée »
   * sont des termes de métier, et une pastille « 📖 4 » n'apprend rien à qui ne
   * connaît pas le symbole. La définition sert d'infobulle partout où le barème
   * s'affiche — bilan de partie, résumé de précision, liste des coups.
   */
  description: { fr: string; en: string }
}

/**
 * Apparence de chaque classification.
 *
 * Les `nag` sont les annotations standard des livres d'échecs (`!!`, `?`, `?!`)
 * pour que le joueur retrouve ses repères s'il lit de la littérature papier.
 */
export const QUALITY_STYLES: Record<MoveQuality, QualityStyle> = {
  brilliant: {
    glyph: '!!',
    token: 'brilliant',
    nag: '!!',
    label: { fr: 'Brillant', en: 'Brilliant' },
    description: {
      fr: "Un sacrifice sain : du matériel donné, et la position le rend au centuple.",
      en: 'A sound sacrifice: material given up, and the position pays it back.',
    },
  },
  great: {
    glyph: '!',
    token: 'great',
    nag: '!',
    label: { fr: 'Coup unique', en: 'Great move' },
    description: {
      fr: "Le seul coup qui tenait — toute autre option perdait une part de l'avantage.",
      en: 'The only move that held — anything else gave away part of the advantage.',
    },
  },
  best: {
    glyph: '★',
    token: 'best',
    nag: '',
    label: { fr: 'Meilleur coup', en: 'Best move' },
    description: {
      fr: "Le premier choix du moteur.",
      en: 'The engine’s first choice.',
    },
  },
  excellent: {
    glyph: '✓',
    token: 'excellent',
    nag: '',
    label: { fr: 'Excellent', en: 'Excellent' },
    description: {
      fr: "Aussi bon que le meilleur, à un écart imperceptible.",
      en: 'As good as the best, by an imperceptible margin.',
    },
  },
  good: {
    glyph: '✓',
    token: 'good',
    nag: '',
    label: { fr: 'Bon coup', en: 'Good' },
    description: {
      fr: "Un coup correct, qui ne coûte presque rien.",
      en: 'A sound move that costs almost nothing.',
    },
  },
  book: {
    glyph: '📖',
    token: 'book',
    nag: '',
    label: { fr: 'Théorie', en: 'Book' },
    description: {
      fr: "Un coup de la théorie d'ouverture, joué et rejoué depuis longtemps.",
      en: 'An opening-theory move, played and replayed for a long time.',
    },
  },
  forced: {
    glyph: '⟶',
    token: 'forced',
    nag: '□',
    label: { fr: 'Coup forcé', en: 'Forced' },
    description: {
      fr: "Le seul coup légal : il n'y avait pas de choix à faire.",
      en: 'The only legal move — there was no choice to make.',
    },
  },
  inaccuracy: {
    glyph: '?!',
    token: 'inaccuracy',
    nag: '?!',
    label: { fr: 'Imprécision', en: 'Inaccuracy' },
    description: {
      fr: "Jouable, mais inférieur : une part de l'avantage s'en va.",
      en: 'Playable but inferior: part of the advantage slips away.',
    },
  },
  mistake: {
    glyph: '?',
    token: 'mistake',
    nag: '?',
    label: { fr: 'Erreur', en: 'Mistake' },
    description: {
      fr: "Une faute nette : l'évaluation bascule sensiblement.",
      en: 'A clear error: the evaluation shifts noticeably.',
    },
  },
  blunder: {
    glyph: '??',
    token: 'blunder',
    nag: '??',
    label: { fr: 'Gaffe', en: 'Blunder' },
    description: {
      fr: "Une gaffe : du matériel perdu, ou la position compromise d'un coup.",
      en: 'A blunder: material lost, or the position wrecked in one move.',
    },
  },
  miss: {
    glyph: '×',
    token: 'miss',
    nag: '?',
    label: { fr: 'Occasion manquée', en: 'Missed win' },
    description: {
      fr: "Une occasion manquée : un gain ou un mat était à portée.",
      en: 'A missed chance: a win or a mate was available.',
    },
  },
}

/** Compte les coups par qualité, pour le tableau de bord d'après-partie. */
export function countQualities(moves: AnalysedMove[], color: Color): Record<MoveQuality, number> {
  const counts = Object.fromEntries(
    Object.keys(QUALITY_STYLES).map((k) => [k, 0]),
  ) as Record<MoveQuality, number>
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
