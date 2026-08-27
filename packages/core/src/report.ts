/**
 * Analyse complète d'une partie.
 *
 * Orchestre tout le reste : pour chaque coup, on demande au moteur l'évaluation
 * de la position avant et après, on classe le coup, on détecte ses motifs et on
 * rédige l'explication. Puis on agrège en un bilan — précision, ACPL, Elo de
 * performance, moments clés.
 *
 * Le moteur est injecté sous forme de fonction : le même code sert donc à
 * l'analyse serveur (Stockfish natif, profondeur 22) et à l'analyse instantanée
 * dans le navigateur (WebAssembly, profondeur 14).
 */

import { Chess } from 'chess.js'
import type { Color } from 'chess.js'
import { gamePhase } from './board.ts'
import { classifyMove, countQualities, findTurningPoints } from './classify.ts'
import {
  averageCentipawnLoss,
  estimateElo,
  gameAccuracy,
  winPercent,
} from './eval.ts'
import { explainMove } from './explain.ts'
import type { Locale, MoveExplanation } from './explain.ts'
import type { OpeningBook } from './openings.ts'
import { uciLineToSan } from './uci.ts'
import type {
  AnalysedMove,
  GamePhase,
  GameReport,
  MoveQuality,
  PositionAnalysis,
  Score,
} from './types.ts'

/**
 * Fonction d'analyse d'une position, fournie par l'appelant.
 * @param fen position à analyser
 * @param multiPv nombre de lignes souhaitées
 */
export type PositionAnalyser = (fen: string, multiPv: number) => Promise<PositionAnalysis>

export interface AnalyseGameOptions {
  /** Position de départ. */
  startFen?: string
  /** Coups de la partie, en SAN anglais. */
  moves: string[]
  analyser: PositionAnalyser
  /** Livre d'ouvertures, pour marquer les coups de théorie. */
  book?: OpeningBook
  locale?: Locale
  /** Nombre de lignes demandées au moteur (2 suffit pour classer). */
  multiPv?: number
  /** Temps de réflexion réel de chaque coup, en millisecondes. */
  thinkTimes?: number[]
  /** Appelé après chaque coup analysé, pour afficher une barre de progression. */
  onProgress?: (done: number, total: number) => void
  /** Permet d'interrompre une analyse longue. */
  signal?: AbortSignal
}

export interface FullGameReport extends GameReport {
  /** Explication rédigée de chaque coup, dans la langue demandée. */
  explanations: MoveExplanation[]
  /** Courbe d'évaluation : chances de victoire des Blancs après chaque coup. */
  evalCurve: number[]
  /** Durée totale de l'analyse, en millisecondes. */
  analysisMs: number
}

/**
 * Analyse une partie de bout en bout.
 *
 * Astuce d'implémentation : la position « après » le coup *n* est la position
 * « avant » le coup *n+1*. On n'analyse donc chaque position qu'une seule fois,
 * ce qui divise par deux le temps de calcul.
 */
export async function analyseGame(options: AnalyseGameOptions): Promise<FullGameReport> {
  const {
    startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moves,
    analyser,
    book,
    locale = 'fr',
    multiPv = 2,
    thinkTimes = [],
    onProgress,
    signal,
  } = options

  const startedAt = performanceNow()

  // 1. Rejouer la partie pour obtenir toutes les positions traversées.
  const board = new Chess(startFen, { skipValidation: true })
  const positions: string[] = [board.fen()]
  const played: Array<{ san: string; uci: string; color: Color; legalCount: number }> = []

  for (const san of moves) {
    const legalCount = board.moves().length
    let move
    try {
      move = board.move(san)
    } catch {
      break // partie tronquée ou PGN corrompu : on analyse ce qui est valide
    }
    played.push({
      san: move.san,
      uci: `${move.from}${move.to}${move.promotion ?? ''}`,
      color: move.color,
      legalCount,
    })
    positions.push(board.fen())
  }

  // 2. Analyser chaque position une seule fois.
  const analyses: PositionAnalysis[] = []
  for (let i = 0; i < positions.length; i++) {
    if (signal?.aborted) break
    const fen = positions[i]!

    // Position terminale : inutile de déranger le moteur, le verdict est connu.
    const terminal = terminalScore(fen)
    if (terminal) {
      analyses.push({
        fen,
        depth: 0,
        lines: [{ multipv: 1, score: terminal, depth: 0, pv: [] }],
        bestMove: null,
        source: 'book',
      })
    } else {
      analyses.push(await analyser(fen, multiPv))
    }
    onProgress?.(i + 1, positions.length)
  }

  // 3. Classer chaque coup et rédiger son explication.
  const analysed: AnalysedMove[] = []
  const explanations: MoveExplanation[] = []
  const phases: GamePhase[] = []

  for (let i = 0; i < played.length; i++) {
    const move = played[i]!
    const before = analyses[i]
    const after = analyses[i + 1]
    if (!before || !after) break

    const fenBefore = positions[i]!
    const fenAfter = positions[i + 1]!

    const inBook = book?.isInBook(fenAfter) ?? false

    const classification = classifyMove({
      fenBefore,
      uci: move.uci,
      san: move.san,
      before: { score: scoreOf(before), lines: before.lines },
      after: { score: scoreOf(after) },
      inBook,
      legalMoveCount: move.legalCount,
    })

    const topLine = before.lines.find((l) => l.multipv === 1) ?? before.lines[0]
    const bestUci = topLine?.pv[0] ?? before.bestMove ?? null
    const bestSan = bestUci ? uciLineToSan(fenBefore, [bestUci])[0] ?? null : null
    const bestLine = topLine ? uciLineToSan(fenBefore, topLine.pv.slice(0, 6)) : []
    const playedLine = after.lines[0] ? uciLineToSan(fenAfter, after.lines[0].pv.slice(0, 5)) : []

    const opening = book?.lookup(fenAfter, locale) ?? null

    const analysedMove: AnalysedMove = {
      ply: i,
      moveNumber: Math.floor(i / 2) + 1,
      color: move.color,
      san: move.san,
      uci: move.uci,
      fenBefore,
      fenAfter,
      scoreBefore: scoreOf(before),
      scoreAfter: scoreOf(after),
      winBefore: classification.winBefore,
      winAfter: classification.winAfter,
      winLoss: classification.winLoss,
      centipawnLoss: classification.centipawnLoss,
      accuracy: classification.accuracy,
      quality: classification.quality,
      bestMove:
        bestUci && bestSan && bestUci !== move.uci
          ? { uci: bestUci, san: bestSan, score: topLine!.score }
          : null,
      bestLine,
      playedLine,
      motifs: classification.motifs,
      opening: opening ? { eco: opening.eco, name: opening.label } : null,
      thinkTimeMs: thinkTimes[i],
    }
    analysed.push(analysedMove)

    explanations.push(
      explainMove({
        locale,
        san: move.san,
        fenAfter,
        quality: classification.quality,
        scoreBefore: analysedMove.scoreBefore,
        scoreAfter: analysedMove.scoreAfter,
        winLoss: classification.winLoss,
        mover: move.color,
        motifs: classification.motifs,
        bestSan,
        bestLine,
        // On ne nomme l'ouverture qu'au moment où elle est identifiée, pas à
        // chaque coup : sinon l'explication devient répétitive.
        openingName:
          opening && analysed[i - 1]?.opening?.name !== opening.label ? opening.label : null,
      }),
    )

    phases.push(gamePhase(new Chess(fenAfter, { skipValidation: true })))
  }

  // 4. Agrégats par camp.
  const evalCurve = analyses.map((a) => winPercent(scoreOf(a)))
  const accuracy = {} as Record<Color, number>
  const acpl = {} as Record<Color, number>
  const counts = {} as Record<Color, Record<MoveQuality, number>>
  const estimatedElo = {} as Record<Color, number>

  for (const color of ['w', 'b'] as const) {
    const own = analysed.filter((m) => m.color === color)
    accuracy[color] = gameAccuracy(
      own.map((m) => m.accuracy),
      evalCurve,
    )
    acpl[color] = averageCentipawnLoss(own.map((m) => m.centipawnLoss))
    counts[color] = countQualities(analysed, color)
    estimatedElo[color] = estimateElo(acpl[color], accuracy[color], own.length)
  }

  const identified = book?.identify(
    analysed.map((m) => m.san),
    locale,
  )

  return {
    moves: analysed,
    explanations,
    accuracy,
    acpl,
    counts,
    estimatedElo,
    opening: identified
      ? { eco: identified.eco, name: identified.label, ply: identified.atPly }
      : null,
    turningPoints: findTurningPoints(analysed),
    phases,
    evalCurve,
    analysisMs: Math.round(performanceNow() - startedAt),
  }
}

/**
 * Score de la ligne principale d'une analyse.
 *
 * Cas particulier important : une position **terminale** ne produit aucune
 * ligne, puisque le moteur n'a aucun coup à proposer. Sans traitement dédié, le
 * score retomberait à zéro et le mat final serait interprété comme un
 * effondrement de l'évaluation — le coup gagnant serait classé « occasion
 * manquée ». On déduit donc le score de la position elle-même.
 */
function scoreOf(analysis: PositionAnalysis): Score {
  const top = analysis.lines.find((l) => l.multipv === 1) ?? analysis.lines[0]
  if (top?.score && top.pv.length > 0) return top.score

  const terminal = terminalScore(analysis.fen)
  if (terminal) return terminal

  return top?.score ?? { type: 'cp', value: 0 }
}

/**
 * Évaluation d'une position sans coup légal.
 *
 * Retourne `null` si la position n'est pas terminale.
 *
 * Le mat livré est représenté par un mat en un du camp gagnant plutôt que par
 * un « mat en zéro » : la valeur zéro n'a pas de signe, et tout le reste de la
 * chaîne raisonne sur le signe pour savoir qui gagne.
 */
export function terminalScore(fen: string): Score | null {
  let board: Chess
  try {
    board = new Chess(fen, { skipValidation: true })
  } catch {
    return null
  }

  if (board.isCheckmate()) {
    // Le camp au trait est maté : c'est donc l'autre qui a gagné.
    return { type: 'mate', value: board.turn() === 'w' ? -1 : 1 }
  }
  if (
    board.isStalemate() ||
    board.isInsufficientMaterial() ||
    board.isThreefoldRepetition() ||
    board.isDrawByFiftyMoves()
  ) {
    return { type: 'cp', value: 0 }
  }
  return null
}

function performanceNow(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

// ─────────────────────────────────────────────────────────────────────────────
//  Synthèse pédagogique
// ─────────────────────────────────────────────────────────────────────────────

export interface CoachSummary {
  /** Phrase d'accroche, ton encourageant. */
  headline: string
  /** Deux à quatre observations concrètes. */
  observations: string[]
  /** Le point à travailler en priorité. */
  focus: string
  /** Identifiants des thèmes de puzzles recommandés. */
  suggestedThemes: string[]
}

/**
 * Rédige le bilan que lit le joueur après sa partie.
 *
 * Le principe pédagogique : ne jamais commencer par ce qui a raté. On ouvre sur
 * un point positif réel, puis on donne **un seul** axe de travail — pas cinq,
 * qu'on oublierait tous.
 */
export function summariseForCoach(
  report: FullGameReport,
  color: Color,
  locale: Locale = 'fr',
): CoachSummary {
  const fr = locale === 'fr'
  const own = report.moves.filter((m) => m.color === color)
  const counts = report.counts[color]
  const accuracy = report.accuracy[color]
  const blunders = counts.blunder + counts.miss
  const mistakes = counts.mistake
  const inaccuracies = counts.inaccuracy
  const brilliants = counts.brilliant + counts.great

  const observations: string[] = []

  // Ouverture d'abord : c'est ce que le joueur maîtrise le mieux ou le moins.
  if (report.opening) {
    observations.push(
      fr
        ? `Tu as joué ${report.opening.name} (${report.opening.eco}), suivie pendant ${report.opening.ply} demi-coups.`
        : `You played the ${report.opening.name} (${report.opening.eco}) for ${report.opening.ply} plies.`,
    )
  }

  if (brilliants > 0) {
    observations.push(
      fr
        ? `${brilliants} coup${brilliants > 1 ? 's' : ''} remarquable${brilliants > 1 ? 's' : ''} — tu as trouvé des ressources que beaucoup rateraient.`
        : `${brilliants} standout move${brilliants > 1 ? 's' : ''} — you found resources many would miss.`,
    )
  }

  // Répartition des fautes par phase : c'est là que se cache le vrai problème.
  const byPhase = { opening: 0, middlegame: 0, endgame: 0 }
  for (const move of own) {
    const phase = report.phases[move.ply] ?? 'middlegame'
    if (move.quality === 'blunder' || move.quality === 'mistake' || move.quality === 'miss') {
      byPhase[phase]++
    }
  }
  const worstPhase = (Object.entries(byPhase) as Array<[GamePhase, number]>).sort(
    (a, b) => b[1] - a[1],
  )[0]

  if (worstPhase && worstPhase[1] >= 2) {
    const phaseLabel = {
      opening: { fr: "l'ouverture", en: 'the opening' },
      middlegame: { fr: 'le milieu de partie', en: 'the middlegame' },
      endgame: { fr: 'la finale', en: 'the endgame' },
    }[worstPhase[0]]
    observations.push(
      fr
        ? `${worstPhase[1]} de tes erreurs sont concentrées dans ${phaseLabel.fr}.`
        : `${worstPhase[1]} of your errors happened in ${phaseLabel.en}.`,
    )
  }

  // Motifs récurrents dans les gaffes : le vrai diagnostic.
  const blunderMotifs = new Map<string, number>()
  for (const move of own) {
    if (move.quality !== 'blunder' && move.quality !== 'mistake') continue
    for (const m of move.motifs) {
      if (m.side !== color) blunderMotifs.set(m.id, (blunderMotifs.get(m.id) ?? 0) + 1)
    }
  }
  const topMotif = [...blunderMotifs.entries()].sort((a, b) => b[1] - a[1])[0]

  const focus = buildFocus({
    fr,
    accuracy,
    blunders,
    mistakes,
    inaccuracies,
    topMotif: topMotif?.[0] ?? null,
  })

  const headline = buildHeadline(fr, accuracy, brilliants, blunders)

  const suggestedThemes = [...blunderMotifs.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id)

  return { headline, observations: observations.slice(0, 4), focus, suggestedThemes }
}

function buildHeadline(
  fr: boolean,
  accuracy: number,
  brilliants: number,
  blunders: number,
): string {
  if (accuracy >= 90) {
    return fr
      ? `Partie de très haut niveau : ${accuracy.toFixed(0)} % de précision.`
      : `Excellent game: ${accuracy.toFixed(0)}% accuracy.`
  }
  if (accuracy >= 75) {
    return fr
      ? `Belle partie — ${accuracy.toFixed(0)} % de précision, et peu de temps perdu.`
      : `Solid game — ${accuracy.toFixed(0)}% accuracy.`
  }
  if (brilliants > 0) {
    return fr
      ? `Partie en dents de scie : de vraies trouvailles, mais ${blunders} gaffe${blunders > 1 ? 's' : ''} à corriger.`
      : `Uneven game: real finds, but ${blunders} blunder${blunders > 1 ? 's' : ''} to fix.`
  }
  if (blunders === 0) {
    return fr
      ? `Aucune gaffe : c'est la base, et tu l'as tenue. ${accuracy.toFixed(0)} % de précision.`
      : `No blunders — that is the foundation. ${accuracy.toFixed(0)}% accuracy.`
  }
  return fr
    ? `${accuracy.toFixed(0)} % de précision. Il y a de quoi progresser vite ici.`
    : `${accuracy.toFixed(0)}% accuracy. Plenty of room to improve quickly.`
}

function buildFocus(input: {
  fr: boolean
  accuracy: number
  blunders: number
  mistakes: number
  inaccuracies: number
  topMotif: string | null
}): string {
  const { fr, blunders, mistakes, topMotif } = input

  if (topMotif === 'hangingPiece') {
    return fr
      ? "Ton point faible du jour : les pièces laissées en prise. Avant chaque coup, prends deux secondes pour vérifier ce que l'adversaire attaque."
      : 'Today’s weak spot: hanging pieces. Before every move, check what the opponent attacks.'
  }
  if (topMotif === 'fork') {
    return fr
      ? 'Les fourchettes t’ont coûté cher. Repère les cases d’où un cavalier atteindrait deux de tes pièces à la fois.'
      : 'Forks cost you material. Watch the squares from which a knight hits two pieces at once.'
  }
  if (topMotif === 'pin') {
    return fr
      ? "Attention aux clouages : une pièce devant ton roi ou ta dame ne peut plus bouger, et tout le monde peut l'attaquer."
      : 'Watch out for pins: a piece in front of your king or queen cannot move, and everyone can attack it.'
  }
  if (topMotif === 'backRankMate') {
    return fr
      ? "Le couloir. Fais une case d'air à ton roi dès que tes tours quittent la dernière rangée."
      : 'Back rank. Make luft for your king as soon as your rooks leave the back rank.'
  }
  if (blunders >= 3) {
    return fr
      ? 'Priorité absolue : ralentir. La plupart de tes points perdus viennent de coups joués trop vite dans des positions calmes.'
      : 'Top priority: slow down. Most of your lost points come from quick moves in quiet positions.'
  }
  if (mistakes >= 3) {
    return fr
      ? "Travaille le calcul court : deux coups d'avance, systématiquement, suffiraient à éviter la plupart de ces erreurs."
      : 'Work on short calculation: two moves ahead, every time, would avoid most of these.'
  }
  return fr
    ? "Continue comme ça, et ajoute quelques puzzles tactiques quotidiens pour aiguiser la vision."
    : 'Keep it up, and add a few daily tactics puzzles to sharpen your vision.'
}
