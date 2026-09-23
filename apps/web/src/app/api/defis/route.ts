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
  createGuestChallenge,
  createOpenChallenge,
  listIncomingChallenges,
  listOutgoingChallenges,
  purgeExpiredChallenges,
  respondToChallenge,
} from '@coupparfait/db/friends'
import { creerLimiteur } from '@/lib/server/limiteur.ts'
import { ipClient } from '@/lib/server/ip.ts'
import { getCurrentUser } from '@/lib/server/session.ts'
import { prevenir } from '@/lib/server/push.ts'
import { tDeLaRequete } from '@/lib/i18n/serveur.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Prévient le destinataire d'un défi, s'il a un appareil abonné.
 *
 * C'est la raison d'être des notifications sur cette plateforme : un défi
 * expire en cinq minutes, et l'interrogation régulière décrite plus haut ne
 * sert qu'à ceux qui ont l'application ouverte. Une invitation lancée à
 * quelqu'un qui a le téléphone dans sa poche mourait sans que personne ne
 * l'ait vue.
 *
 * L'appel ne bloque pas : voir `lib/server/push.ts`.
 */
function prevenirDuDefi(
  cible: string | null,
  auteur: string,
  initialTime: number,
  increment: number,
): void {
  if (!cible) return
  const minutes = Math.round(initialTime / 60)
  prevenir(cible, 'invitations', {
    titre: `${auteur} te propose une partie`,
    corps: `${minutes} min${increment > 0 ? ` + ${increment} s` : ''} — l’invitation expire dans cinq minutes.`,
    // La bannière du guetteur s'affiche sur toutes les pages : l'accueil suffit,
    // et c'est la page la moins coûteuse à ouvrir sur un téléphone.
    url: '/',
    fil: 'invitation',
  })
}

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

export async function GET(request: Request) {
  const t = tDeLaRequete(request)
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: t('api.signInRequired') }, { status: 401 })

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

/**
 * Rythme des invitations sans compte.
 *
 * Cette action-là est la seule ouverte aux visiteurs : sans garde-fou, une
 * adresse d'invitation partagée publiquement permettrait de faire sonner
 * quelqu'un en boucle. Dix par quart d'heure et par adresse IP suffisent
 * largement à un usage honnête.
 */
const invitesVisiteurs = creerLimiteur(15 * 60 * 1000, 10)

export async function POST(request: Request) {
  const t = tDeLaRequete(request)
  let body: {
    action?: string
    to?: string
    id?: string
    accept?: boolean
    initialTime?: number
    increment?: number
    rated?: boolean
    color?: string
    name?: string
    slug?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: t('api.unreadable') }, { status: 400 })
  }

  // Seule action ouverte aux visiteurs : c'est le bout du lien d'invitation.
  if (body.action === 'guest') {
    const ip = ipClient(request)

    if (invitesVisiteurs.depasse(ip)) {
      return NextResponse.json({ error: t('api.tooManyInvites') }, { status: 429 })
    }

    const name = String(body.name ?? '')
      .trim()
      .slice(0, 20)
    if (name.length < 2) {
      return NextResponse.json({ error: t('api.pickAName') }, { status: 400 })
    }

    const challenge = await createGuestChallenge({
      toUsername: String(body.to ?? ''),
      fromName: name,
      slug: makeSlug(),
      initialTime: Math.min(MAX_INITIAL, Math.max(MIN_INITIAL, Number(body.initialTime ?? 600))),
      increment: Math.min(MAX_INCREMENT, Math.max(0, Number(body.increment ?? 5))),
    })

    if (!challenge) {
      return NextResponse.json({ error: t('api.inviteMatchesNobody') }, { status: 404 })
    }

    prevenirDuDefi(challenge.to, name, challenge.initialTime, challenge.increment)

    return NextResponse.json({ ok: true, challenge })
  }

  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: t('api.signInRequired') }, { status: 401 })

  switch (body.action) {
    case 'create': {
      const to = String(body.to ?? '')
      // On ne défie que des gens de son carnet : sans cette vérification,
      // n'importe qui pourrait faire sonner n'importe qui.
      if (!to || !(await areFriends(me.userId, to))) {
        return NextResponse.json({ error: t('api.notInYourList') }, { status: 403 })
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

      prevenirDuDefi(challenge.to, me.username, initialTime, increment)

      return NextResponse.json({ ok: true, challenge })
    }

    // Partie ouverte par lien : personne n'est désigné, on l'enregistre
    // seulement pour pouvoir la retrouver et la supprimer.
    case 'open': {
      const challenge = await createOpenChallenge({
        fromId: me.userId,
        fromName: me.username,
        slug: String(body.slug ?? '') || makeSlug(),
        initialTime: Math.min(MAX_INITIAL, Math.max(MIN_INITIAL, Number(body.initialTime ?? 600))),
        increment: Math.min(MAX_INCREMENT, Math.max(0, Number(body.increment ?? 5))),
        rated: body.rated === true,
      })
      if (!challenge) {
        return NextResponse.json({ error: t('api.gameNotSaved') }, { status: 500 })
      }
      return NextResponse.json({ ok: true, challenge })
    }

    case 'respond': {
      const result = await respondToChallenge(
        me.userId,
        String(body.id ?? ''),
        body.accept === true,
      )
      if (!result.ok) {
        return NextResponse.json({ error: t('api.challengeGoneOrExpired') }, { status: 404 })
      }
      return NextResponse.json(result)
    }

    case 'cancel': {
      const done = await cancelChallenge(me.userId, String(body.id ?? ''))
      if (!done) return NextResponse.json({ error: t('api.challengeNotFound') }, { status: 404 })
      return NextResponse.json({ ok: true })
    }

    default:
      return NextResponse.json({ error: t('api.unknownAction') }, { status: 400 })
  }
}
