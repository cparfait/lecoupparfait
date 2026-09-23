/**
 * Parties par correspondance.
 *
 *   GET  /api/correspondance             → mes parties
 *   GET  /api/correspondance?partie=xxx  → une partie
 *   POST /api/correspondance             { action: 'start' | 'move' | 'resign' }
 *
 * Tout passe par la base : contrairement au temps réel, il n'y a pas de salon
 * en mémoire à interroger, et c'est précisément ce qui permet à une partie de
 * survivre à un redémarrage — ou à trois semaines de silence.
 */

import { NextResponse } from 'next/server'
import {
  getCorrespondence,
  listCorrespondence,
  playCorrespondence,
  resignCorrespondence,
  startCorrespondence,
} from '@coupparfait/db/correspondence'
import { areFriends } from '@coupparfait/db/friends'
import { eq, getDb, users } from '@coupparfait/db'
import { getCurrentUser } from '@/lib/server/session.ts'
import { prevenir } from '@/lib/server/push.ts'
import { tDeLaRequete } from '@/lib/i18n/serveur.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const REASONS: Record<string, string> = {
  unknown: 'Partie introuvable.',
  notYourTurn: 'Ce n’est pas à toi de jouer.',
  illegal: 'Coup illégal.',
  finished: 'Cette partie est terminée.',
  corrompue: 'Cette partie ne se relit plus : ses coups enregistrés sont illisibles.',
  conflict: 'La partie a changé entre-temps. Recharge-la avant de rejouer.',
}

export async function GET(request: Request) {
  const t = tDeLaRequete(request)
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: t('api.signInRequired') }, { status: 401 })

  const slug = new URL(request.url).searchParams.get('partie')
  if (slug) {
    const game = await getCorrespondence(me.userId, slug)
    if (!game) return NextResponse.json({ error: t('api.gameNotFound') }, { status: 404 })
    return NextResponse.json({ game })
  }

  return NextResponse.json({ games: await listCorrespondence(me.userId) })
}

export async function POST(request: Request) {
  const t = tDeLaRequete(request)
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: t('api.signInRequired') }, { status: 401 })

  let body: {
    action?: string
    to?: string
    slug?: string
    days?: number
    from?: string
    target?: string
    promotion?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: t('api.unreadable') }, { status: 400 })
  }

  switch (body.action) {
    case 'start': {
      const to = String(body.to ?? '')
      // Même règle que pour les défis : on ne lance une partie qu'avec
      // quelqu'un de son carnet. Une correspondance dure des semaines, on ne
      // l'impose pas à un inconnu.
      if (!to || !(await areFriends(me.userId, to))) {
        return NextResponse.json({ error: t('api.notInYourList') }, { status: 403 })
      }

      const [target] = await getDb()
        .select({ username: users.username })
        .from(users)
        .where(eq(users.id, to))
        .limit(1)
      if (!target) return NextResponse.json({ error: t('api.playerNotFound') }, { status: 404 })

      const slug = await startCorrespondence({
        fromId: me.userId,
        fromName: me.username,
        toId: to,
        toName: target.username,
        daysPerMove: Number(body.days ?? 2),
      })
      if (!slug) return NextResponse.json({ error: t('api.createFailed') }, { status: 500 })
      return NextResponse.json({ ok: true, slug })
    }

    case 'move': {
      const result = await playCorrespondence(me.userId, String(body.slug ?? ''), {
        from: String(body.from ?? ''),
        to: String(body.target ?? ''),
        promotion: body.promotion,
      })
      if (!result.ok) {
        // 409 pour le conflit : la requête n'était pas fausse, elle est
        // arrivée après une autre. Le client doit relire, pas corriger.
        return NextResponse.json(
          { error: REASONS[result.reason] },
          { status: result.reason === 'conflict' ? 409 : 400 },
        )
      }

      /*
        C'est maintenant à l'autre de jouer, et il faut bien le lui dire.

        Une partie par correspondance dure des jours : sans notification, elle
        repose entièrement sur l'habitude d'ouvrir la boîte « au cas où ». On
        perdait au délai des parties qu'on aurait jouées — c'est le format qui
        avait le plus besoin d'être prévenu, et c'est celui qui n'avait rien.

        Rien quand la partie vient de se terminer : le mat, l'abandon et la
        nulle ont leur propre écran, et « à toi de jouer » serait faux.
      */
      const adversaire = result.game.opponentId
      if (adversaire && result.game.result === '*') {
        const jours = result.game.daysPerMove
        prevenir(adversaire, 'invitations', {
          titre: `${me.username} a joué`,
          corps: `À toi de jouer — tu as ${jours} jour${jours > 1 ? 's' : ''} pour répondre.`,
          url: '/correspondance',
          fil: 'correspondance',
        })
      }

      return NextResponse.json({ ok: true, game: result.game })
    }

    case 'resign': {
      const issue = await resignCorrespondence(me.userId, String(body.slug ?? ''))
      if (issue === 'unknown') {
        return NextResponse.json({ error: t('api.gameNotFound') }, { status: 404 })
      }
      if (issue === 'conflict') {
        return NextResponse.json({ error: REASONS.conflict }, { status: 409 })
      }
      return NextResponse.json({ ok: true })
    }

    default:
      return NextResponse.json({ error: t('api.unknownAction') }, { status: 400 })
  }
}
