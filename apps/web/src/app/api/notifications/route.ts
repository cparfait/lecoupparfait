/**
 * Abonnements aux notifications poussées.
 *
 *   GET    /api/notifications   → la clé publique, et si le serveur sait envoyer
 *   POST   /api/notifications     { abonnement, invitations, defiDuJour, … }
 *   POST   /api/notifications     { action: 'essai' }
 *   DELETE /api/notifications     { endpoint }
 *
 * Le `GET` est ouvert aux visiteurs : la page des préférences doit pouvoir
 * afficher — ou masquer — le réglage avant même de savoir qui est connecté. La
 * clé publique n'est pas un secret, c'est son objet même que d'être distribuée.
 *
 * Tout le reste demande une session. Un abonnement appartient à un compte :
 * sans cela on ne saurait pas qui prévenir.
 */

import { NextResponse } from 'next/server'
import {
  enregistrerAbonnement,
  lireAbonnement,
  retirerAbonnement,
  retirerAbonnements,
} from '@coupparfait/db/push'
import { getCurrentUser } from '@/lib/server/session.ts'
import { clePubliqueVapid, envoyerAux, notificationsActives } from '@/lib/server/push.ts'
import { localeDeLaRequete, tDeLaRequete } from '@/lib/i18n/serveur.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  /*
    Avec `?endpoint=`, on rend aussi les réglages de cet appareil-là.

    Ils ne sont pas devinables : l'adresse d'abonnement est fabriquée par le
    service de messagerie du navigateur et n'est connue que de lui. La donner
    en paramètre revient donc à prouver qu'on est l'appareil concerné — c'est
    ce qui permet à la page de préférences d'afficher les deux cases dans le
    bon état sans imposer une session.
  */
  const endpoint = new URL(request.url).searchParams.get('endpoint')
  const abonnement = endpoint ? await lireAbonnement(endpoint) : null

  return NextResponse.json({
    disponible: notificationsActives(),
    clePublique: clePubliqueVapid(),
    abonnement: abonnement
      ? { invitations: abonnement.invitations, defiDuJour: abonnement.defiDuJour }
      : null,
  })
}

export async function POST(request: Request) {
  const t = tDeLaRequete(request)
  if (!notificationsActives()) {
    return NextResponse.json({ error: t('api.notificationsUnconfigured') }, { status: 503 })
  }

  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: t('api.signInRequired') }, { status: 401 })

  let body: {
    action?: string
    endpoint?: string
    abonnement?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
    invitations?: boolean
    defiDuJour?: boolean
    timezone?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: t('api.unreadable') }, { status: 400 })
  }

  /*
    L'essai.

    Il ne sert pas qu'à rassurer : sur téléphone, la permission accordée et la
    notification reçue sont deux choses différentes — un mode « ne pas
    déranger », une application non installée sur l'écran d'accueil sous iOS,
    un blocage au niveau du système. Sans bouton d'essai, on ne le découvre
    qu'au moment où l'on rate une invitation.
  */
  if (body.action === 'essai') {
    const abonnement = body.endpoint ? await lireAbonnement(body.endpoint) : null
    if (!abonnement || abonnement.userId !== me.userId) {
      return NextResponse.json({ error: t('api.deviceNotSubscribed') }, { status: 404 })
    }

    // L'essai se lit sur l'écran même où l'on vient de cocher la case : il
    // parle la langue de la page plutôt que celle enregistrée au compte.
    const { envoyes, morts } = await envoyerAux(
      [abonnement],
      { sujet: { sujet: 'essai' }, url: '/', fil: 'invitation' },
      localeDeLaRequete(request),
    )
    await retirerAbonnements(morts)

    if (envoyes.length === 0) {
      return NextResponse.json({ error: t('api.pushFailed') }, { status: 502 })
    }
    return NextResponse.json({ ok: true })
  }

  const endpoint = body.abonnement?.endpoint
  const p256dh = body.abonnement?.keys?.p256dh
  const auth = body.abonnement?.keys?.auth
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: t('api.subscriptionIncomplete') }, { status: 400 })
  }

  await enregistrerAbonnement({
    userId: me.userId,
    abonnement: { endpoint, keys: { p256dh, auth } },
    choix: {
      invitations: body.invitations !== false,
      defiDuJour: body.defiDuJour !== false,
    },
    // Le fuseau vient du navigateur : c'est la seule façon d'envoyer le rappel
    // du jour à dix-huit heures *chez la personne* et non chez le serveur.
    timezone: String(body.timezone ?? 'Europe/Paris').slice(0, 60),
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const t = tDeLaRequete(request)
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: t('api.signInRequired') }, { status: 401 })

  let body: { endpoint?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: t('api.unreadable') }, { status: 400 })
  }

  if (!body.endpoint) {
    return NextResponse.json({ error: t('api.subscriptionAddressMissing') }, { status: 400 })
  }

  /*
    On ne vérifie pas le propriétaire avant de supprimer.

    L'`endpoint` est fabriqué par le navigateur et n'est connu que de lui : il
    n'est pas devinable, et quelqu'un qui l'a en main est de toute façon la
    personne assise devant l'appareil. Surtout, exiger que la ligne appartienne
    au compte connecté empêcherait le cas courant du navigateur partagé, où l'on
    veut justement pouvoir couper les notifications héritées d'une autre session.
  */
  await retirerAbonnement(body.endpoint)
  return NextResponse.json({ ok: true })
}
