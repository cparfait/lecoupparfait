/**
 * Carnet d'adresses.
 *
 *   GET  /api/amis            → amis, demandes reçues, demandes envoyées
 *   GET  /api/amis?q=pseudo   → recherche de quelqu'un à ajouter
 *   POST /api/amis            { action: 'add' | 'respond' | 'remove', … }
 *
 * Une seule route pour la lecture et les trois actions, comme pour
 * l'authentification : elles partagent la même vérification de session et le
 * même format de réponse.
 */

import { NextResponse } from 'next/server'
import {
  addFriend,
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
  removeFriend,
  respondToRequest,
  searchUsers,
} from '@coupparfait/db/friends'
import { getCurrentUser } from '@/lib/server/session.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADD_ERRORS: Record<string, string> = {
  unknownUser: 'Personne de ce pseudo sur la plateforme.',
  self: 'Difficile de devenir son propre ami.',
  already: 'Vous êtes déjà en relation.',
}

export async function GET(request: Request) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })

  const query = new URL(request.url).searchParams.get('q')
  if (query != null) {
    return NextResponse.json({ results: await searchUsers(me.userId, query) })
  }

  const [friends, incoming, outgoing] = await Promise.all([
    listFriends(me.userId),
    listIncomingRequests(me.userId),
    listOutgoingRequests(me.userId),
  ])

  return NextResponse.json({ friends, incoming, outgoing })
}

export async function POST(request: Request) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })

  let body: { action?: string; username?: string; id?: string; accept?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 })
  }

  switch (body.action) {
    case 'add': {
      const result = await addFriend(me.userId, String(body.username ?? ''))
      if (!result.ok) {
        return NextResponse.json({ error: ADD_ERRORS[result.reason] }, { status: 400 })
      }
      return NextResponse.json({ ok: true, status: result.status })
    }

    case 'respond': {
      const done = await respondToRequest(me.userId, String(body.id ?? ''), body.accept === true)
      if (!done) {
        return NextResponse.json({ error: 'Demande introuvable.' }, { status: 404 })
      }
      return NextResponse.json({ ok: true })
    }

    case 'remove': {
      const done = await removeFriend(me.userId, String(body.id ?? ''))
      if (!done) return NextResponse.json({ error: 'Relation introuvable.' }, { status: 404 })
      return NextResponse.json({ ok: true })
    }

    default:
      return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
  }
}
