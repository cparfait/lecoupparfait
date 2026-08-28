/**
 * Tes statistiques.
 *
 *   GET /api/statistiques → ce que disent tes parties enregistrées
 *
 * Rien de nouveau n'est stocké : tout se déduit de la table des parties, qui
 * garde déjà l'ouverture, la cadence, le résultat, la couleur et l'heure. Le
 * seul travail est de poser les bonnes questions.
 *
 * On ne calcule que sur les parties **terminées** et où l'on a joué : une
 * partie annulée avant le premier coup ne dit rien de personne.
 */

import { NextResponse } from 'next/server'
import { and, desc, eq, getDb, games, gte, or, sql } from '@coupparfait/db'
import { getCurrentUser } from '@/lib/server/session.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Une ouverture n'est significative qu'à partir de trois parties. */
const MIN_GAMES_PER_OPENING = 3

export async function GET(request: Request) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })

  const days = Math.min(3650, Math.max(7, Number(new URL(request.url).searchParams.get('jours') ?? 365)))
  const since = new Date(Date.now() - days * 24 * 3600 * 1000)
  const db = getDb()

  const mine = and(
    or(eq(games.whiteId, me.userId), eq(games.blackId, me.userId)),
    gte(games.createdAt, since),
    sql`${games.result} <> '*'`,
  )

  /** 1 gagnée, 0.5 nulle, 0 perdue. */
  const score = sql<number>`case
      when ${games.result} = '1/2-1/2' then 0.5
      when ${games.winner} = (case when ${games.whiteId} = ${me.userId} then 'w' else 'b' end) then 1
      else 0
    end`

  try {
    const [totals] = await db
      .select({
        games: sql<number>`count(*)`,
        score: sql<number>`coalesce(sum(${score}), 0)`,
        asWhite: sql<number>`count(*) filter (where ${games.whiteId} = ${me.userId})`,
        scoreWhite: sql<number>`coalesce(sum(${score}) filter (where ${games.whiteId} = ${me.userId}), 0)`,
        asBlack: sql<number>`count(*) filter (where ${games.blackId} = ${me.userId})`,
        scoreBlack: sql<number>`coalesce(sum(${score}) filter (where ${games.blackId} = ${me.userId}), 0)`,
      })
      .from(games)
      .where(mine)

    // Par ouverture : c'est la statistique qui change vraiment quelque chose,
    // parce qu'elle se traduit directement en « travaille cette ligne-là ».
    //
    // Le camp est obtenu par des compteurs filtrés plutôt que par un
    // regroupement : une expression calculée ne peut pas servir de clé de
    // regroupement telle quelle, et une ligne par ouverture se lit mieux que
    // deux.
    const openings = await db
      .select({
        eco: games.eco,
        name: games.opening,
        games: sql<number>`count(*)`,
        score: sql<number>`coalesce(sum(${score}), 0)`,
        asWhite: sql<number>`count(*) filter (where ${games.whiteId} = ${me.userId})`,
      })
      .from(games)
      .where(and(mine, sql`${games.opening} is not null`))
      .groupBy(games.eco, games.opening)
      .having(sql`count(*) >= ${MIN_GAMES_PER_OPENING}`)
      .orderBy(desc(sql`count(*)`))
      .limit(12)

    const speeds = await db
      .select({
        speed: games.speed,
        games: sql<number>`count(*)`,
        score: sql<number>`coalesce(sum(${score}), 0)`,
      })
      .from(games)
      .where(mine)
      .groupBy(games.speed)
      .orderBy(desc(sql`count(*)`))

    // Par heure locale du serveur. Approximatif — le fuseau du joueur n'est
    // pas enregistré — mais suffisant pour voir « je joue mal le soir ».
    const hours = await db
      .select({
        hour: sql<number>`extract(hour from ${games.createdAt})`,
        games: sql<number>`count(*)`,
        score: sql<number>`coalesce(sum(${score}), 0)`,
      })
      .from(games)
      .where(mine)
      .groupBy(sql`extract(hour from ${games.createdAt})`)
      .orderBy(sql`extract(hour from ${games.createdAt})`)

    const endings = await db
      .select({
        status: games.status,
        games: sql<number>`count(*)`,
        won: sql<number>`count(*) filter (where ${score} = 1)`,
      })
      .from(games)
      .where(mine)
      .groupBy(games.status)
      .orderBy(desc(sql`count(*)`))

    const rate = (won: number, total: number) =>
      total > 0 ? Math.round((Number(won) / Number(total)) * 1000) / 10 : 0

    return NextResponse.json({
      days,
      totals: {
        games: Number(totals?.games ?? 0),
        rate: rate(Number(totals?.score ?? 0), Number(totals?.games ?? 0)),
        white: {
          games: Number(totals?.asWhite ?? 0),
          rate: rate(Number(totals?.scoreWhite ?? 0), Number(totals?.asWhite ?? 0)),
        },
        black: {
          games: Number(totals?.asBlack ?? 0),
          rate: rate(Number(totals?.scoreBlack ?? 0), Number(totals?.asBlack ?? 0)),
        },
      },
      openings: openings.map((row) => ({
        eco: row.eco,
        name: row.name,
        games: Number(row.games),
        asWhite: Number(row.asWhite),
        rate: rate(Number(row.score), Number(row.games)),
      })),
      speeds: speeds.map((row) => ({
        speed: row.speed,
        games: Number(row.games),
        rate: rate(Number(row.score), Number(row.games)),
      })),
      hours: hours.map((row) => ({
        hour: Number(row.hour),
        games: Number(row.games),
        rate: rate(Number(row.score), Number(row.games)),
      })),
      endings: endings.map((row) => ({
        status: row.status,
        games: Number(row.games),
        won: Number(row.won),
      })),
    })
  } catch (error) {
    console.error('[statistiques] calcul impossible :', error)
    return NextResponse.json({ error: 'Statistiques indisponibles.' }, { status: 503 })
  }
}
