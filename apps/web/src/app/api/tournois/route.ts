/**
 * Tournois.
 *
 *   GET  /api/tournois            → la liste
 *   GET  /api/tournois?slug=xxx   → une arène, son classement, et ma partie
 *   POST /api/tournois            { action: 'create' | 'join' | 'leave' }
 *
 * Le déroulement lui-même — démarrer, apparier, compter — n'est pas ici : il
 * appartient à la boucle du serveur temps réel, seul processus informé de la
 * fin des parties. Cette route ne fait que lire et inscrire.
 */

import { NextResponse } from 'next/server'
import {
  createTournament,
  currentPairing,
  getTournament,
  joinTournament,
  leaveTournament,
  listTournaments,
} from '@coupparfait/db/tournaments'
import { getRating } from '@coupparfait/db/ratings'
import { getCurrentUser } from '@/lib/server/session.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get('slug')
  const me = await getCurrentUser()

  if (!slug) {
    // La liste est publique : voir qu'une arène a lieu ce soir ne demande pas
    // de compte, et c'est ce qui donne envie d'en créer un.
    return NextResponse.json({ tournaments: await listTournaments() })
  }

  const found = await getTournament(slug)
  if (!found) return NextResponse.json({ error: 'Tournoi introuvable.' }, { status: 404 })

  // La partie en cours de celui qui regarde : c'est elle qui l'emmènera sur
  // l'échiquier sans qu'il ait à surveiller quoi que ce soit.
  const game = me ? await currentPairing(found.tournament.id, me.userId) : null
  const joined = me ? found.standings.some((s) => s.userId === me.userId) : false

  return NextResponse.json({ ...found, game, joined })
}

export async function POST(request: Request) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })

  let body: {
    action?: string
    slug?: string
    name?: string
    initialTime?: number
    increment?: number
    durationMinutes?: number
    startsInMinutes?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 })
  }

  switch (body.action) {
    case 'create': {
      // Le départ se donne en minutes à partir de maintenant plutôt qu'en date
      // absolue : personne ne veut saisir un fuseau horaire pour lancer une
      // arène qui commence dans un quart d'heure.
      const delay = Math.min(1440, Math.max(0, Number(body.startsInMinutes ?? 5)))
      const slug = await createTournament({
        ownerId: me.userId,
        name: String(body.name ?? ''),
        initialTime: Number(body.initialTime ?? 180),
        increment: Number(body.increment ?? 0),
        durationMinutes: Number(body.durationMinutes ?? 45),
        startsAt: new Date(Date.now() + delay * 60_000),
      })
      if (!slug) return NextResponse.json({ error: 'Création impossible.' }, { status: 500 })
      return NextResponse.json({ ok: true, slug })
    }

    case 'join': {
      const rating = await getRating(me.userId, 'blitz')
      const done = await joinTournament(String(body.slug ?? ''), {
        userId: me.userId,
        username: me.username,
        rating: rating.rating,
      })
      if (!done) {
        return NextResponse.json({ error: 'Tournoi introuvable ou terminé.' }, { status: 404 })
      }
      return NextResponse.json({ ok: true })
    }

    case 'leave': {
      const done = await leaveTournament(String(body.slug ?? ''), me.userId)
      if (!done) return NextResponse.json({ error: 'Tournoi introuvable.' }, { status: 404 })
      return NextResponse.json({ ok: true })
    }

    default:
      return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
  }
}
