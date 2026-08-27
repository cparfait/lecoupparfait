/**
 * Service d'analyse.
 *
 * Trois sources sont interrogées dans l'ordre du moins cher au plus cher :
 *
 *  1. **Les tables de finales.** À sept pièces ou moins, la réponse est
 *     *parfaite* et instantanée — plus besoin d'un moteur qui « estime ».
 *  2. **Le cache d'évaluations.** Toutes les parties commencent par les mêmes
 *     positions ; les réanalyser serait du gaspillage pur.
 *  3. **Stockfish natif.** Le reste du temps.
 *
 * Le résultat est systématiquement réécrit dans le cache, qui s'enrichit donc
 * de lui-même à mesure que la plateforme est utilisée.
 */

import { Chess } from 'chess.js'
import { and, eq, getDb, evaluations, gte, sql } from '@coupparfait/db'
import { toEpd, type EngineLine, type PositionAnalysis, type Score } from '@coupparfait/core'
import { getPool, type Priority } from './pool.ts'
import { probeTablebase } from './tablebase.ts'

export interface AnalyseOptions {
  fen: string
  depth?: number
  multiPv?: number
  priority?: Priority
  /** Ignore le cache et force un nouveau calcul. */
  fresh?: boolean
  signal?: AbortSignal
}

/** Analyse une position en passant par le cache et les tables de finales. */
export async function analysePosition(options: AnalyseOptions): Promise<PositionAnalysis> {
  const { fen, multiPv = 1, priority = 'interactive', fresh = false, signal } = options
  const depth = Math.max(6, Math.min(Number(process.env.ENGINE_MAX_DEPTH ?? 30), options.depth ?? Number(process.env.ENGINE_DEFAULT_DEPTH ?? 20)))
  const epd = toEpd(fen)

  // ── 1. Tables de finales ────────────────────────────────────────────────
  const pieceCount = countPieces(fen)
  if (pieceCount <= 7) {
    const perfect = await probeTablebase(fen)
    if (perfect) return perfect
  }

  // ── 2. Cache ────────────────────────────────────────────────────────────
  if (!fresh && multiPv === 1) {
    const cached = await readCache(epd, depth)
    if (cached) return cached
  }

  // ── 3. Moteur ───────────────────────────────────────────────────────────
  const analysis = await getPool().analyse({ fen, depth, multiPv, signal }, priority)

  // Le cache ne retient que la ligne principale : c'est ce qu'on relit 99 fois
  // sur 100, et stocker douze variantes par position ferait exploser la table.
  void writeCache(epd, analysis).catch((error: unknown) => {
    console.warn('[analyse] écriture du cache impossible :', error)
  })

  return analysis
}

/** Compte les pièces présentes, pour savoir si les tables de finales s'appliquent. */
function countPieces(fen: string): number {
  const placement = fen.split(' ')[0] ?? ''
  let count = 0
  for (const character of placement) {
    if (/[pnbrqkPNBRQK]/.test(character)) count++
  }
  return count
}

// ─────────────────────────────────────────────────────────────────────────────
//  Cache
// ─────────────────────────────────────────────────────────────────────────────

async function readCache(epd: string, depth: number): Promise<PositionAnalysis | null> {
  try {
    const database = getDb()
    // Une analyse plus profonde que demandée fait parfaitement l'affaire.
    const rows = await database
      .select()
      .from(evaluations)
      .where(and(eq(evaluations.epd, epd), gte(evaluations.depth, depth)))
      .orderBy(sql`${evaluations.depth} desc`)
      .limit(1)

    const row = rows[0]
    if (!row) return null

    const score: Score =
      row.mate !== null && row.mate !== undefined
        ? { type: 'mate', value: row.mate }
        : { type: 'cp', value: row.cp ?? 0 }

    const pv = row.pv.split(' ').filter(Boolean)
    const lines: EngineLine[] = [{ multipv: 1, score, depth: row.depth, pv }]

    return {
      fen: epd,
      depth: row.depth,
      lines,
      bestMove: pv[0] ?? null,
      source: 'cache',
    }
  } catch {
    // Base indisponible : on continue sans cache, l'analyse reste possible.
    return null
  }
}

async function writeCache(epd: string, analysis: PositionAnalysis): Promise<void> {
  const top = analysis.lines.find((line) => line.multipv === 1) ?? analysis.lines[0]
  if (!top || top.pv.length === 0) return

  const database = getDb()
  await database
    .insert(evaluations)
    .values({
      epd,
      depth: analysis.depth,
      cp: top.score.type === 'cp' ? top.score.value : null,
      mate: top.score.type === 'mate' ? top.score.value : null,
      pv: top.pv.join(' '),
      lines: analysis.lines.length > 1 ? (analysis.lines as never) : null,
      nodes: top.nodes ?? null,
    })
    .onConflictDoUpdate({
      target: [evaluations.epd, evaluations.depth],
      set: {
        cp: top.score.type === 'cp' ? top.score.value : null,
        mate: top.score.type === 'mate' ? top.score.value : null,
        pv: top.pv.join(' '),
        nodes: top.nodes ?? null,
      },
    })
}

// ─────────────────────────────────────────────────────────────────────────────
//  Analyse complète d'une partie
// ─────────────────────────────────────────────────────────────────────────────

export interface GameAnalysisRequest {
  startFen?: string
  /** Coups en notation algébrique. */
  moves: string[]
  depth?: number
  multiPv?: number
  onProgress?: (done: number, total: number) => void
  signal?: AbortSignal
}

/**
 * Analyse toutes les positions d'une partie.
 *
 * Chaque position n'est évaluée qu'une fois : la position « après » le coup *n*
 * est la position « avant » le coup *n+1*. Une partie de 40 coups demande donc
 * 81 analyses, pas 160.
 *
 * Les requêtes partent en priorité `batch` pour ne jamais faire attendre un
 * joueur en cours de partie.
 */
export async function analyseGamePositions(
  request: GameAnalysisRequest,
): Promise<PositionAnalysis[]> {
  const board = new Chess(
    request.startFen ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    { skipValidation: true },
  )

  const positions: string[] = [board.fen()]
  for (const san of request.moves) {
    try {
      board.move(san)
      positions.push(board.fen())
    } catch {
      break
    }
  }

  const results: PositionAnalysis[] = []
  for (let i = 0; i < positions.length; i++) {
    if (request.signal?.aborted) break
    results.push(
      await analysePosition({
        fen: positions[i]!,
        depth: request.depth,
        multiPv: request.multiPv ?? 2,
        priority: 'batch',
        signal: request.signal,
      }),
    )
    request.onProgress?.(i + 1, positions.length)
  }
  return results
}
