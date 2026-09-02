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
import { and, eq, getDb, evaluations, gte, positionEvals, sql } from '@coupparfait/db'
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
  /**
   * Adresse de l'appelant. Elle ne sert qu'à lui réserver sa part de la file :
   * voir `FILE_PAR_CLIENT` dans la réserve. Vide pour un appel interne.
   */
  client?: string
}

/** Analyse une position en passant par le cache et les tables de finales. */
export async function analysePosition(options: AnalyseOptions): Promise<PositionAnalysis> {
  const { fen, multiPv = 1, priority = 'interactive', fresh = false, signal, client } = options
  // Vingt-quatre demi-coups par défaut. Le moteur natif les atteint en une
  // fraction de seconde par position, et c'est à partir de là qu'il départage
  // deux bons coups plutôt que de se contenter de repérer les fautes.
  const depth = Math.max(
    6,
    Math.min(
      Number(process.env.ENGINE_MAX_DEPTH ?? 34),
      options.depth ?? Number(process.env.ENGINE_DEFAULT_DEPTH ?? 24),
    ),
  )
  const epd = toEpd(fen)

  // Combien de variantes il faut réellement pour répondre sans appauvrir
  // l'appelant. Ce n'est pas toujours `multiPv` : un moteur ne peut pas
  // rapporter trois lignes dans une position où un seul coup est légal, et
  // exiger trois lignes condamnerait ces positions-là à ne jamais sortir du
  // cache. On plafonne donc au nombre de coups légaux.
  //
  // Calculé au plus tard et une seule fois : générer les coups légaux a un
  // coût, et à `multiPv` 1 la réponse est connue d'avance.
  let requiredMemo: number | null = null
  const requiredLines = (): number => {
    if (multiPv <= 1) return 1
    // Jamais zéro : dans une position matée le moteur ne rend aucune ligne,
    // rien n'a donc pu être mis en cache, et un seuil nul ferait accepter
    // n'importe quoi.
    if (requiredMemo === null) requiredMemo = Math.max(1, Math.min(multiPv, countLegalMoves(fen)))
    return requiredMemo
  }

  // ── 1. Tables de finales ────────────────────────────────────────────────
  const pieceCount = countPieces(fen)
  if (pieceCount <= 7) {
    const perfect = await probeTablebase(fen)
    if (perfect) return perfect
  }

  // ── 2. Cache ────────────────────────────────────────────────────────────
  //
  // Longtemps réservé à `multiPv === 1`, ce qui revenait à ne jamais le lire :
  // l'analyse de partie, la seule à réanalyser en masse les mêmes positions,
  // tourne à trois lignes. Le cache se remplissait sans jamais servir.
  //
  // La garde portait sur la mauvaise grandeur. Ce qui interdit de servir une
  // entrée, ce n'est pas la valeur de `multiPv` mais le nombre de variantes
  // qu'elle contient : rendre une seule ligne à qui en demande trois viderait
  // la liste « ce que tu pouvais jouer » de l'écran d'analyse. C'est donc
  // `readCache` qui vérifie, entrée par entrée, qu'il a de quoi répondre.
  if (!fresh) {
    const cached = await readCache(epd, depth, requiredLines)
    if (cached) return cached
  }

  // ── 3. Évaluations pré-calculées de Lichess ─────────────────────────────
  //
  // Des centaines de millions de positions y sont analysées à quarante ou
  // soixante demi-coups, là où nous tournons à vingt. Quand la position s'y
  // trouve, la consulter est à la fois **instantané** et **plus juste** que ce
  // que la machine produirait en plusieurs secondes.
  //
  // Après notre propre cache, jamais avant : celui-ci répond exactement à la
  // profondeur demandée pour cette partie, et il a pu être écrit par une
  // analyse plus poussée encore.
  //
  // Longtemps limitée à une seule variante, faute de place pour les autres.
  // La colonne `alt_lines` en porte désormais deux de plus, et la table répond
  // donc aux demandes en MultiPV — pour les positions qui en ont, environ un
  // tiers du jeu de données. Les autres retombent sur le moteur, comme avant.
  if (!fresh) {
    const known = await readLichessEval(epd, depth, requiredLines)
    if (known) return known
  }

  // ── 4. Moteur ───────────────────────────────────────────────────────────
  const analysis = await getPool().analyse({ fen, depth, multiPv, signal }, priority, client)

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

/**
 * Compte les coups légaux, pour savoir combien de variantes le moteur peut au
 * mieux produire. Une position ingérable vaut « autant qu'on en demande » :
 * c'est le choix prudent, il fait simplement rater le cache.
 */
function countLegalMoves(fen: string): number {
  try {
    return new Chess(fen, { skipValidation: true }).moves().length
  } catch {
    return Number.POSITIVE_INFINITY
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Cache
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cherche la position dans la base d'évaluations importée de Lichess.
 *
 * Table facultative : sans import, la requête échoue et l'on passe au moteur
 * comme avant. C'est voulu — la plupart des installations s'en passeront.
 */
async function readLichessEval(
  epd: string,
  depth: number,
  required: () => number,
): Promise<PositionAnalysis | null> {
  try {
    const database = getDb()
    const rows = await database
      .select()
      .from(positionEvals)
      .where(and(eq(positionEvals.epd, epd), gte(positionEvals.depth, depth)))
      .limit(1)

    const row = rows[0]
    if (!row) return null

    const pv = (row.line ?? '').split(' ').filter(Boolean)
    if (pv.length === 0) return null

    const principale: EngineLine = {
      multipv: 1,
      score:
        row.mate !== null && row.mate !== undefined
          ? { type: 'mate', value: row.mate }
          : { type: 'cp', value: row.cp ?? 0 },
      depth: row.depth,
      pv,
    }

    // Les variantes secondaires, quand le jeu de données en fournissait. Elles
    // sont écrites dans l'ordre de force décroissante par l'import : on les
    // numérote donc simplement à la suite.
    const lines: EngineLine[] = [principale]
    for (const autre of row.altLines ?? []) {
      const suite = String(autre?.line ?? '').split(' ').filter(Boolean)
      if (suite.length === 0) continue
      lines.push({
        multipv: lines.length + 1,
        score:
          autre.mate !== undefined && autre.mate !== null
            ? { type: 'mate', value: autre.mate }
            : { type: 'cp', value: autre.cp ?? 0 },
        depth: row.depth,
        pv: suite,
      })
    }

    // Servir moins de variantes que demandé viderait la liste « ce que tu
    // pouvais jouer » sans que rien ne le signale — c'est précisément le défaut
    // que la garde d'origine évitait, et il faut continuer de l'éviter.
    if (lines.length < required()) return null

    return {
      fen: epd,
      depth: row.depth,
      lines,
      bestMove: row.best ?? pv[0] ?? null,
      source: 'cache',
    }
  } catch {
    // Table absente ou base injoignable : on continue sans, l'analyse reste
    // parfaitement possible.
    return null
  }
}

/**
 * Cherche la position dans notre propre cache.
 *
 * `required` est appelé au plus tard : tant qu'aucune entrée n'est trop courte,
 * on n'a pas besoin de savoir combien de lignes seraient acceptables.
 */
async function readCache(
  epd: string,
  depth: number,
  required: () => number,
): Promise<PositionAnalysis | null> {
  try {
    const database = getDb()
    // Une analyse plus profonde que demandée fait parfaitement l'affaire.
    //
    // Plusieurs candidates et non plus une seule : la plus profonde n'est pas
    // forcément la plus fournie. Une entrée à 30 demi-coups écrite par une
    // analyse à une ligne ne doit pas masquer celle à 24 qui en a trois.
    const rows = await database
      .select()
      .from(evaluations)
      .where(and(eq(evaluations.epd, epd), gte(evaluations.depth, depth)))
      .orderBy(sql`${evaluations.depth} desc`)
      .limit(4)

    let minimum: number | null = null
    for (const row of rows) {
      const lines = decodeLines(row)
      if (lines.length === 0) continue
      minimum ??= required()
      if (lines.length < minimum) continue

      return {
        fen: epd,
        depth: row.depth,
        lines,
        bestMove: lines[0]?.pv[0] ?? null,
        source: 'cache',
      }
    }
    return null
  } catch {
    // Base indisponible : on continue sans cache, l'analyse reste possible.
    return null
  }
}

/**
 * Reconstruit les variantes d'une entrée de cache.
 *
 * La colonne `lines` est du JSON écrit par une version quelconque du code : on
 * en vérifie la forme plutôt que de faire confiance au type déclaré. Quand elle
 * est absente — analyse à une seule ligne, ou entrée écrite avant que la
 * colonne ne serve — les colonnes `pv`/`cp`/`mate` fournissent la principale.
 */
function decodeLines(row: typeof evaluations.$inferSelect): EngineLine[] {
  const stored = Array.isArray(row.lines) ? row.lines : []
  const lines: EngineLine[] = []
  for (const entry of stored) {
    const line = decodeLine(entry, row.depth)
    if (line) lines.push(line)
  }
  if (lines.length > 0) return lines.sort((a, b) => a.multipv - b.multipv)

  const score: Score =
    row.mate !== null && row.mate !== undefined
      ? { type: 'mate', value: row.mate }
      : { type: 'cp', value: row.cp ?? 0 }
  const pv = row.pv.split(' ').filter(Boolean)
  return pv.length > 0 ? [{ multipv: 1, score, depth: row.depth, pv }] : []
}

/** Valide une variante isolée du JSON. Retourne `null` si elle est inexploitable. */
function decodeLine(entry: unknown, fallbackDepth: number): EngineLine | null {
  if (typeof entry !== 'object' || entry === null) return null
  const raw = entry as Record<string, unknown>

  const pv = Array.isArray(raw.pv) ? raw.pv.filter((move): move is string => typeof move === 'string') : []
  // Une variante sans coup ne sert à rien : c'est justement le coup qu'on vient
  // y chercher pour la liste des alternatives.
  if (pv.length === 0) return null

  const score = raw.score as Record<string, unknown> | undefined
  if (!score || (score.type !== 'cp' && score.type !== 'mate')) return null
  if (typeof score.value !== 'number') return null

  const multipv = typeof raw.multipv === 'number' ? raw.multipv : 1
  return {
    multipv,
    score: { type: score.type, value: score.value } as Score,
    depth: typeof raw.depth === 'number' ? raw.depth : fallbackDepth,
    pv,
    ...(typeof raw.seldepth === 'number' ? { seldepth: raw.seldepth } : {}),
    ...(typeof raw.nodes === 'number' ? { nodes: raw.nodes } : {}),
    ...(typeof raw.nps === 'number' ? { nps: raw.nps } : {}),
  }
}

/**
 * Range l'analyse dans le cache.
 *
 * Les variantes secondaires ne sont écrites qu'à partir de deux : à une seule
 * ligne, `lines` ne ferait que recopier `pv`. Stocker les douze variantes d'un
 * bot ferait en revanche exploser la table, mais c'est déjà borné en amont —
 * on enregistre ce que le moteur a rendu.
 */
async function writeCache(epd: string, analysis: PositionAnalysis): Promise<void> {
  const top = analysis.lines.find((line) => line.multipv === 1) ?? analysis.lines[0]
  if (!top || top.pv.length === 0) return

  const database = getDb()
  const columns = {
    cp: top.score.type === 'cp' ? top.score.value : null,
    mate: top.score.type === 'mate' ? top.score.value : null,
    pv: top.pv.join(' '),
    nodes: top.nodes ?? null,
  }

  await database
    .insert(evaluations)
    .values({
      epd,
      depth: analysis.depth,
      ...columns,
      lines: analysis.lines.length > 1 ? (analysis.lines as never) : null,
    })
    .onConflictDoUpdate({
      target: [evaluations.epd, evaluations.depth],
      set: {
        ...columns,
        // `lines` était absent de cette liste : une entrée écrite d'abord par
        // une analyse à une ligne gardait `lines` vide pour toujours, même
        // réanalysée en MultiPV. Le cache ne devenait donc jamais utilisable
        // pour l'analyse de partie.
        //
        // On ne conserve que la plus fournie des deux : une analyse ponctuelle
        // à une ligne ne doit pas effacer les trois variantes qu'une analyse de
        // partie avait déjà payées.
        lines: sql`case
          when coalesce(jsonb_array_length(${evaluations.lines}), 0) < ${analysis.lines.length}
          then excluded.lines
          else ${evaluations.lines}
        end`,
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
  /** Priorité des positions : `batch` par défaut, voir `analysePosition`. */
  priority?: Priority
  client?: string
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
        priority: request.priority ?? 'batch',
        client: request.client,
        signal: request.signal,
      }),
    )
    request.onProgress?.(i + 1, positions.length)
  }
  return results
}
