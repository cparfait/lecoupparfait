/**
 * Annuaire des joueurs.
 *
 *   GET /api/joueurs?q=chris   → jusqu'à vingt joueurs dont le pseudo commence
 *                                par la recherche
 *
 * Distinct du classement, qui n'accepte que ceux qui ont joué cinq parties
 * classées : chercher quelqu'un pour le défier ne doit pas dépendre du nombre
 * de parties qu'il a faites. Distinct aussi de la recherche du carnet
 * d'adresses, qui demande une session — on doit pouvoir trouver un joueur
 * avant même d'avoir un compte, ne serait-ce que pour voir son profil.
 *
 * Ne renvoie que ce qui est déjà public sur une fiche de profil : pseudo,
 * avatar, pays, classement rapide. Jamais d'adresse électronique, ni rien qui
 * permette de deviner qui est connecté à la seconde près.
 */

import { NextResponse } from 'next/server'
import { and, asc, eq, getDb, ilike, ratings, sql, users } from '@coupparfait/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** En deçà de deux caractères, la recherche renverrait l'annuaire entier. */
const MIN_QUERY = 2
const LIMIT = 20

export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get('q') ?? '').trim()
  if (query.length < MIN_QUERY) return NextResponse.json({ players: [] })

  try {
    const rows = await getDb()
      .select({
        username: users.username,
        avatar: users.avatar,
        countryCode: users.countryCode,
        rating: ratings.rating,
        games: ratings.games,
      })
      .from(users)
      .leftJoin(ratings, and(eq(ratings.userId, users.id), eq(ratings.category, 'rapid')))
      .where(
        and(
          // Par le début du pseudo, pas n'importe où dedans : « ris » ne doit
          // pas ramener « chris », sinon toute recherche courte ratisse large.
          ilike(users.usernameLower, `${query.toLowerCase()}%`),
          eq(users.disabled, false),
        ),
      )
      // Le pseudo exact d'abord, puis par ordre alphabétique : celui qu'on
      // cherche est presque toujours celui qu'on a tapé en entier.
      .orderBy(
        sql`case when ${users.usernameLower} = ${query.toLowerCase()} then 0 else 1 end`,
        asc(users.usernameLower),
      )
      .limit(LIMIT)

    return NextResponse.json({ players: rows })
  } catch (error) {
    console.error('[annuaire] recherche impossible :', error)
    return NextResponse.json({ error: 'Annuaire indisponible.' }, { status: 503 })
  }
}
