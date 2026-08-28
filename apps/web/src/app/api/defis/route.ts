/**
 * Défis entre amis.
 *
 *   GET  /api/defis   → défis reçus, et ceux qu'on a lancés
 *   POST /api/defis    { action: 'create' | 'respond' | 'cancel', … }
 *
 * Le destinataire apprend qu'on le défie en interrogeant cette route toutes
 * les quelques secondes. C'est un choix : pousser l'événement supposerait un
 * pont entre le serveur Next et le serveur temps réel, deux processus
 * distincts. Pour un cercle d'amis, quelques secondes d'attente valent mieux
 * qu'une pièce de plomberie à maintenir.
 */

import { NextResponse } from 'next/server'
import {
  areFriends,
  cancelChallenge,
  createChallenge,
  listIncomingChallenges,
  listOutgoingChallenges,
  purgeExpiredChallenges,
  respondToChallenge,
} from '@coupparfait/db/friends'
import { getCurrentUser } from '@/lib/server/session.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Cadences acceptées, en secondes. Bornées pour ne pas créer d'aberration. */
const MIN_INITIAL = 60
const MAX_INITIAL = 10_800
const MAX_INCREMENT = 60

/**
 * Identifiant de salon.
 *
 * Même alphabet que les parties par lien : sans voyelles, pour qu'aucun mot ne
 * se forme par accident dans une adresse qu'on partage.
 */
const ALPHABET = 'bcdfghjkmnpqrstvwxyz23456789'

function makeSlug(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return [...bytes].map((byte) => ALPHABET[byte % ALPHABET.length]).join('')
}

export async function GET() {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })

  const [incoming, outgoing] = await Promise.all([
    listIncomingChallenges(me.userId),
    listOutgoingChallenges(me.userId),
  ])

  // Au fil de l'eau plutôt que par tâche planifiée : quelques lignes mortes ne
  // justifient pas un ordonnanceur.
  void purgeExpiredChallenges().catch(() => {
    // La purge est un confort : son échec ne doit rien empêcher.
  })

  return NextResponse.json({ incoming, outgoing })
}

export async function POST(request: Request) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })

  let body: {
    action?: string
    to?: string
    id?: string
    accept?: boolean
    initialTime?: number
    increment?: number
    rated?: boolean
    color?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 })
  }

  switch (body.action) {
    case 'create': {
      const to = String(body.to ?? '')
      // On ne défie que des gens de son carnet : sans cette vérification,
      // n'importe qui pourrait faire sonner n'importe qui.
      if (!to || !(await areFriends(me.userId, to))) {
        return NextResponse.json(
          { error: 'Cette personne n’est pas dans ton carnet.' },
          { status: 403 },
        )
      }

      const initialTime = Math.min(
        MAX_INITIAL,
        Math.max(MIN_INITIAL, Number(body.initialTime ?? 600)),
      )
      const increment = Math.min(MAX_INCREMENT, Math.max(0, Number(body.increment ?? 5)))
      const color = body.color === 'w' || body.color === 'b' ? body.color : 'random'

      const challenge = await createChallenge({
        fromId: me.userId,
        fromName: me.username,
        toId: to,
        slug: makeSlug(),
        initialTime,
        increment,
        rated: body.rated === true,
        color,
      })

      return NextResponse.json({ ok: true, challenge })
    }

    case 'respond': {
      const result = await respondToChallenge(
        me.userId,
        String(body.id ?? ''),
        body.accept === true,
      )
      if (!result.ok) {
        return NextResponse.json({ error: 'Défi introuvable ou expiré.' }, { status: 404 })
      }
      return NextResponse.json(result)
    }

    case 'cancel': {
      const done = await cancelChallenge(me.userId, String(body.id ?? ''))
      if (!done) return NextResponse.json({ error: 'Défi introuvable.' }, { status: 404 })
      return NextResponse.json({ ok: true })
    }

    default:
      return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
  }
}
