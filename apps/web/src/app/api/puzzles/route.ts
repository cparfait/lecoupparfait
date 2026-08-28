/**
 * Service de puzzles.
 *
 *   GET  /api/puzzles?theme=fork&rating=1400   → un puzzle adapté
 *   POST /api/puzzles                          → enregistre une tentative
 *
 * Le choix du puzzle est la partie subtile : il doit être **un peu** au-dessus
 * du niveau du joueur. Trop facile, on n'apprend rien ; trop dur, on abandonne.
 * On vise donc une fenêtre légèrement supérieure au classement courant, et on
 * écarte ceux déjà résolus.
 */

import { NextResponse } from 'next/server'
import { and, arrayOverlaps, eq, getDb, gte, lte, notInArray, puzzleAttempts, puzzles, sql } from '@coupparfait/db'
import { applyPuzzleResult, getRating } from '@coupparfait/db/ratings'
import { getCurrentUser } from '@/lib/server/session.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Fenêtre de difficulté autour du niveau visé. */
const WINDOW = 120

export async function GET(request: Request) {
  const url = new URL(request.url)
  const theme = url.searchParams.get('theme')
  const requestedRating = url.searchParams.get('rating')
  const rush = Number(url.searchParams.get('rush') ?? 0)

  // Une manche chronométrée ne peut pas attendre le réseau entre deux
  // puzzles : on la sert d'un bloc, par difficulté croissante.
  if (rush > 0) return rushSeries(Math.min(60, Math.max(5, rush)))

  try {
    const database = getDb()
    const user = await getCurrentUser()

    // Niveau visé : celui du joueur plus un cran, ou la valeur demandée.
    let target = 1200
    if (requestedRating) {
      target = Math.max(400, Math.min(3000, Number(requestedRating)))
    } else if (user) {
      const rating = await getRating(user.userId, 'puzzle')
      // +50 : on cherche à faire progresser, pas à conforter.
      target = rating.rating + 50
    }

    // Puzzles déjà tentés, à ne pas reproposer.
    let excluded: string[] = []
    if (user) {
      const done = await database
        .select({ puzzleId: puzzleAttempts.puzzleId })
        .from(puzzleAttempts)
        .where(eq(puzzleAttempts.userId, user.userId))
        .limit(2000)
      excluded = done.map((row) => row.puzzleId)
    }

    const conditions = [
      gte(puzzles.rating, target - WINDOW),
      lte(puzzles.rating, target + WINDOW),
    ]
    if (theme && theme !== 'all') conditions.push(arrayOverlaps(puzzles.themes, [theme]))
    if (excluded.length > 0) conditions.push(notInArray(puzzles.id, excluded))

    // `random()` sur une table de plusieurs millions de lignes serait
    // catastrophique ; la fenêtre de difficulté réduit d'abord l'ensemble à
    // quelques milliers de lignes, ce qui rend le tri aléatoire acceptable.
    const rows = await database
      .select()
      .from(puzzles)
      .where(and(...conditions))
      .orderBy(sql`random()`)
      .limit(1)

    let puzzle = rows[0]

    // Aucun puzzle dans la fenêtre : on élargit plutôt que de renvoyer une
    // erreur, ce qui arrive sur une base partiellement importée.
    if (!puzzle) {
      const fallback = await database
        .select()
        .from(puzzles)
        .where(
          theme && theme !== 'all' ? arrayOverlaps(puzzles.themes, [theme]) : sql`true`,
        )
        .orderBy(sql`random()`)
        .limit(1)
      puzzle = fallback[0]
    }

    if (!puzzle) {
      return NextResponse.json(
        {
          error:
            'Aucun puzzle en base. Lance l’import :  node scripts/import-puzzles.mjs',
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      puzzle: {
        id: puzzle.id,
        fen: puzzle.fen,
        moves: puzzle.moves.split(' '),
        rating: puzzle.rating,
        ratingDeviation: puzzle.ratingDeviation,
        themes: puzzle.themes,
        gameUrl: puzzle.gameUrl,
      },
      playerRating: user ? (await getRating(user.userId, 'puzzle')).rating : null,
    })
  } catch (error) {
    console.error('[puzzles]', error)
    return NextResponse.json(
      { error: 'Le service de puzzles est indisponible.' },
      { status: 503 },
    )
  }
}

export async function POST(request: Request) {
  let body: { puzzleId?: string; solved?: boolean; correctMoves?: number; timeMs?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 })
  }

  if (!body.puzzleId || typeof body.solved !== 'boolean') {
    return NextResponse.json({ error: 'Champs manquants.' }, { status: 400 })
  }

  const user = await getCurrentUser()
  // Sans compte, on ne conserve rien — mais on ne bloque pas pour autant : le
  // joueur peut enchaîner les puzzles, ils ne seront simplement pas mémorisés.
  if (!user) return NextResponse.json({ rating: null, anonymous: true })

  try {
    const database = getDb()
    const rows = await database
      .select({ rating: puzzles.rating, deviation: puzzles.ratingDeviation })
      .from(puzzles)
      .where(eq(puzzles.id, body.puzzleId))
      .limit(1)

    const puzzle = rows[0]
    if (!puzzle) return NextResponse.json({ error: 'Puzzle inconnu.' }, { status: 404 })

    const update = await applyPuzzleResult({
      userId: user.userId,
      puzzleRating: puzzle.rating,
      puzzleDeviation: puzzle.deviation,
      solved: body.solved,
    })

    await database
      .insert(puzzleAttempts)
      .values({
        userId: user.userId,
        puzzleId: body.puzzleId,
        solved: body.solved,
        correctMoves: body.correctMoves ?? 0,
        timeMs: body.timeMs ?? null,
        ratingAfter: update.after,
      })
      .onConflictDoNothing()

    return NextResponse.json({
      rating: update.after,
      delta: update.delta,
      puzzleRating: puzzle.rating,
    })
  } catch (error) {
    console.error('[puzzles:post]', error)
    return NextResponse.json({ error: 'Enregistrement impossible.' }, { status: 503 })
  }
}

/**
 * Une série pour une manche chronométrée.
 *
 * Deux choix qui font la différence entre un exercice et un jeu :
 *
 *  - **La difficulté monte.** Commencer facile met en confiance et laisse
 *    prendre le rythme ; finir difficile fait que la manche s'arrête d'elle-
 *    même, sans qu'on ait à décider quand.
 *  - **Rien n'est exclu.** Le mode normal évite les puzzles déjà tentés, ce
 *    qui a du sens pour progresser ; ici on cherche la vitesse de
 *    reconnaissance, et revoir un motif connu est précisément l'intérêt.
 *
 * Une requête par palier plutôt qu'un grand tri aléatoire : chaque fenêtre de
 * difficulté ne compte que quelques milliers de lignes, là où un `random()`
 * sur cinq millions serait catastrophique.
 */
async function rushSeries(count: number): Promise<Response> {
  const database = getDb()
  const START = 600
  const END = 2200
  const step = (END - START) / count

  const series = await Promise.all(
    Array.from({ length: count }, async (_, index) => {
      const target = Math.round(START + step * index)
      const rows = await database
        .select()
        .from(puzzles)
        .where(and(gte(puzzles.rating, target - 120), lte(puzzles.rating, target + 120)))
        .orderBy(sql`random()`)
        .limit(1)
      return rows[0] ?? null
    }),
  )

  const found = series.filter((puzzle) => puzzle !== null)
  if (found.length === 0) {
    return NextResponse.json(
      { error: 'Aucun puzzle en base. Lance l’import :  node scripts/import-puzzles.mjs' },
      { status: 404 },
    )
  }

  return NextResponse.json({
    puzzles: found.map((puzzle) => ({
      id: puzzle.id,
      fen: puzzle.fen,
      moves: puzzle.moves.split(' '),
      rating: puzzle.rating,
      themes: puzzle.themes,
    })),
  })
}
