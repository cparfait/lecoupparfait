/**
 * Classement général.
 *
 *   GET /api/classement?categorie=rapid&limite=50
 *
 * On classe sur un score **conservateur** : le classement moins deux
 * écarts-types. Un joueur qui vient de gagner trois parties par chance a une
 * incertitude énorme et ne squatte donc pas le haut du tableau. Il faut jouer
 * régulièrement pour y figurer — ce qui est précisément le comportement qu'un
 * classement doit récompenser.
 */

import { NextResponse } from 'next/server'
import { desc, eq, getDb, ratings, sql, users } from '@coupparfait/db'
import { tDeLaRequete } from '@/lib/i18n/serveur.ts'

export const runtime = 'nodejs'
export const revalidate = 60

const CATEGORIES = ['bullet', 'blitz', 'rapid', 'classical', 'correspondence', 'puzzle']

/** Nombre de parties minimum pour apparaître au classement. */
const MIN_GAMES = 5

export async function GET(request: Request) {
  const t = tDeLaRequete(request)
  const url = new URL(request.url)
  const category = url.searchParams.get('categorie') ?? 'rapid'
  const limit = Math.min(200, Math.max(5, Number(url.searchParams.get('limite') ?? 50)))

  if (!CATEGORIES.includes(category)) {
    return NextResponse.json(
      { error: `Catégorie inconnue. Valeurs acceptées : ${CATEGORIES.join(', ')}.` },
      { status: 400 },
    )
  }

  try {
    const database = getDb()

    const rows = await database
      .select({
        username: users.username,
        avatar: users.avatar,
        countryCode: users.countryCode,
        rating: ratings.rating,
        deviation: ratings.deviation,
        elo: ratings.elo,
        games: ratings.games,
        wins: ratings.wins,
        losses: ratings.losses,
        draws: ratings.draws,
        peak: ratings.peak,
        // Score conservateur, calculé en base pour trier dessus directement.
        score: sql<number>`${ratings.rating} - 2 * ${ratings.deviation} + 90`.as('score'),
      })
      .from(ratings)
      .innerJoin(users, eq(ratings.userId, users.id))
      .where(
        sql`${ratings.category} = ${category}
            and ${ratings.games} >= ${MIN_GAMES}
            and ${users.disabled} = false`,
      )
      .orderBy(desc(sql`score`))
      .limit(limit)

    return NextResponse.json({
      category,
      minGames: MIN_GAMES,
      players: rows.map((row, index) => ({
        rank: index + 1,
        username: row.username,
        avatar: row.avatar,
        countryCode: row.countryCode,
        rating: row.rating,
        deviation: row.deviation,
        provisional: row.deviation > 110,
        elo: row.elo,
        games: row.games,
        wins: row.wins,
        losses: row.losses,
        draws: row.draws,
        winRate: row.games > 0 ? Math.round((row.wins / row.games) * 100) : 0,
        peak: row.peak,
      })),
    })
  } catch (error) {
    console.error('[classement]', error)
    return NextResponse.json({ error: t('api.leaderboardDown'), players: [] }, { status: 503 })
  }
}
