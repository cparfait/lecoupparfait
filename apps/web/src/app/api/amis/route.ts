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
import { prevenir } from '@/lib/server/push.ts'
import { tDeLaRequete } from '@/lib/i18n/serveur.ts'
import type { TranslationKey } from '@/lib/i18n/index.tsx'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADD_ERRORS: Record<string, TranslationKey> = {
  unknownUser: 'api.friendUnknownUser',
  self: 'api.friendSelf',
  already: 'api.friendAlready',
}

export async function GET(request: Request) {
  const t = tDeLaRequete(request)
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: t('api.signInRequired') }, { status: 401 })

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
  const t = tDeLaRequete(request)
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: t('api.signInRequired') }, { status: 401 })

  let body: { action?: string; username?: string; id?: string; accept?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: t('api.unreadable') }, { status: 400 })
  }

  switch (body.action) {
    case 'add': {
      const result = await addFriend(me.userId, String(body.username ?? ''))
      if (!result.ok) {
        return NextResponse.json(
          { error: t(ADD_ERRORS[result.reason] ?? 'api.actionFailed') },
          { status: 400 },
        )
      }

      /*
        On prévient la personne, et c'était le trou le plus visible.

        Une demande d'ami n'envoyait rien du tout : elle attendait dans un
        carnet qu'on n'ouvre pas sans raison, et se découvrait des jours plus
        tard — quand elle se découvrait. Le défi entre amis, lui, prévenait
        depuis toujours ; c'est la même attente, sur un rythme plus lent.

        Deux issues à distinguer : une demande en attente, et une demande
        croisée que l'on vient de sceller. Annoncer « untel veut t'ajouter » à
        quelqu'un qui avait déjà demandé serait un contresens — de son point de
        vue, c'est une réponse, pas une demande.
      */
      prevenir(result.targetId, 'invitations', {
        titre:
          result.status === 'accepted'
            ? `${me.username} et toi êtes amis`
            : `${me.username} veut t’ajouter`,
        corps:
          result.status === 'accepted'
            ? 'Ta demande a trouvé la sienne : vous pouvez vous défier.'
            : 'Ouvre ton carnet pour accepter ou refuser.',
        url: '/amis',
        fil: 'ami',
      })

      return NextResponse.json({ ok: true, status: result.status })
    }

    case 'respond': {
      const done = await respondToRequest(me.userId, String(body.id ?? ''), body.accept === true)
      if (!done) {
        return NextResponse.json({ error: t('api.requestNotFound') }, { status: 404 })
      }
      return NextResponse.json({ ok: true })
    }

    case 'remove': {
      const done = await removeFriend(me.userId, String(body.id ?? ''))
      if (!done) return NextResponse.json({ error: t('api.relationNotFound') }, { status: 404 })
      return NextResponse.json({ ok: true })
    }

    default:
      return NextResponse.json({ error: t('api.unknownAction') }, { status: 400 })
  }
}
