import 'server-only'

/**
 * L'envoi des notifications.
 *
 * Une notification poussée n'est pas un message qu'on adresse à quelqu'un :
 * c'est un paquet chiffré qu'on dépose chez le service de messagerie de son
 * navigateur — Google pour Chrome, Mozilla pour Firefox, Apple pour Safari —
 * qui le relaiera quand l'appareil sera joignable. On ne sait pas quand il
 * arrivera, ni s'il arrivera. Tout ce module en découle :
 *
 *  - **Rien n'attend l'envoi.** Un défi entre amis ne doit pas mettre une
 *    seconde de plus à se créer parce qu'un serveur d'Apple répond lentement.
 *    Les appelants déclenchent et passent à autre chose.
 *  - **Un échec ne remonte pas.** L'application marche déjà sans notification
 *    — le destinataire voit le défi en revenant sur la page. Faire échouer la
 *    création d'un défi parce que la notification n'est pas partie
 *    remplacerait un agrément absent par une panne.
 *  - **Un abonnement mort se supprime.** Un 404 ou un 410 veut dire que ce
 *    navigateur ne reviendra pas : on retire la ligne au lieu de réessayer
 *    éternellement.
 *
 * La configuration est facultative. Sans clés VAPID, `notificationsActives()`
 * répond faux et l'interface retire le réglage : mieux vaut ne rien proposer
 * que proposer un abonnement qui ne recevra jamais rien.
 */

import webpush from 'web-push'
import { abonnementsPour, retirerAbonnements } from '@coupparfait/db/push'
import type { PushSubscriptionRow } from '@coupparfait/db/schema'

/** Ce qu'on transmet au travailleur de service. Voir `public/sw.js`. */
export interface Notification {
  titre: string
  corps: string
  /** Où aller quand on touche la notification. */
  url: string
  /**
   * Fil de discussion : une notification remplace la précédente du même fil.
   *
   * `invitation` pour un défi reçu, `defi-du-jour` pour le rappel quotidien.
   * Deux rappels quotidiens ne doivent jamais s'empiler.
   */
  fil: 'invitation' | 'defi-du-jour'
}

const CLE_PUBLIQUE = process.env.VAPID_PUBLIC_KEY?.trim()
const CLE_PRIVEE = process.env.VAPID_PRIVATE_KEY?.trim()

/**
 * L'adresse de contact exigée par la norme.
 *
 * Elle ne sert qu'aux services de messagerie, pour joindre l'exploitant du
 * serveur en cas d'envoi massif ou fautif. On la déduit de `MAIL_FROM` quand
 * elle n'est pas donnée, plutôt que d'imposer une variable de plus.
 */
function sujet(): string {
  const explicite = process.env.VAPID_SUBJECT?.trim()
  if (explicite) return explicite

  const from = process.env.MAIL_FROM?.match(/<([^>]+)>/)?.[1] ?? process.env.MAIL_FROM?.trim()
  if (from?.includes('@')) return `mailto:${from}`

  // Dernier recours : l'adresse du site. La norme accepte une URL.
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://coupparfait.example'
}

let configure = false

/** Vrai si le serveur peut envoyer des notifications. */
export function notificationsActives(): boolean {
  return Boolean(CLE_PUBLIQUE && CLE_PRIVEE)
}

/** La clé publique à remettre au navigateur, ou `null` si rien n'est configuré. */
export function clePubliqueVapid(): string | null {
  return notificationsActives() ? (CLE_PUBLIQUE ?? null) : null
}

function preparer(): boolean {
  if (!notificationsActives()) return false
  if (!configure) {
    webpush.setVapidDetails(sujet(), CLE_PUBLIQUE!, CLE_PRIVEE!)
    configure = true
  }
  return true
}

/**
 * Envoie une notification à une liste d'appareils.
 *
 * Rend les adresses dont l'abonnement est mort — l'appelant décide s'il les
 * nettoie tout de suite ou plus tard.
 */
export async function envoyerAux(
  abonnements: PushSubscriptionRow[],
  notification: Notification,
): Promise<{ envoyes: string[]; morts: string[] }> {
  if (!preparer() || abonnements.length === 0) return { envoyes: [], morts: [] }

  const charge = JSON.stringify(notification)
  const envoyes: string[] = []
  const morts: string[] = []

  await Promise.all(
    abonnements.map(async (abonnement) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: abonnement.endpoint,
            keys: { p256dh: abonnement.p256dh, auth: abonnement.auth },
          },
          charge,
          // Une invitation périmée n'intéresse plus personne : le défi expire
          // au bout de cinq minutes. Le rappel du jour, lui, vaut la journée.
          { TTL: notification.fil === 'invitation' ? 300 : 6 * 3600, urgency: 'normal' },
        )
        envoyes.push(abonnement.endpoint)
      } catch (erreur) {
        const code = (erreur as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) morts.push(abonnement.endpoint)
        // Les autres codes — 429, 500, réseau coupé — sont passagers : on
        // laisse la ligne en place, le prochain envoi retentera.
      }
    }),
  )

  return { envoyes, morts }
}

/**
 * Prévient un joueur sur tous ses appareils, sans faire attendre l'appelant.
 *
 * Le `void` sur la promesse est délibéré et c'est le cœur du contrat : la
 * fonction rend la main immédiatement, et ce qui suit se fait pendant que la
 * réponse HTTP part. Si l'envoi échoue, personne n'en saura rien — et c'est
 * très bien : voir l'en-tête du fichier.
 */
export function prevenir(
  userId: string,
  usage: 'invitations' | 'defiDuJour',
  notification: Notification,
): void {
  if (!notificationsActives()) return

  void (async () => {
    try {
      const abonnements = await abonnementsPour(userId, usage)
      const { morts } = await envoyerAux(abonnements, notification)
      await retirerAbonnements(morts)
    } catch {
      // Silence assumé : une notification manquée ne casse rien.
    }
  })()
}
