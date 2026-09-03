/**
 * Les abonnements aux notifications.
 *
 * Accès à la table `push_subscriptions` : enregistrer un appareil, le retirer,
 * et retrouver ceux qu'il faut prévenir. Le chiffrement et l'envoi ne sont pas
 * ici — ils dépendent des clés VAPID, qui n'existent que côté application web.
 * Ce module ne connaît que des lignes.
 *
 * Une règle traverse tout le fichier : **un abonnement mort se supprime sans
 * bruit**. Le service de messagerie d'un navigateur répond 404 ou 410 quand
 * l'utilisateur a désinstallé l'application ou révoqué le droit ; garder la
 * ligne ne ferait qu'ajouter un envoi perdu à chaque notification.
 */

import { and, eq, inArray } from 'drizzle-orm'
import { getDb } from './index.ts'
import { dailyProgress, pushSubscriptions, type PushSubscriptionRow } from './schema.ts'

/** Ce qu'un navigateur nous remet en s'abonnant. */
export interface AbonnementNavigateur {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

/** Ce à quoi un appareil accepte d'être dérangé. */
export interface ChoixNotifications {
  invitations: boolean
  defiDuJour: boolean
}

/**
 * Enregistre — ou met à jour — l'abonnement d'un appareil.
 *
 * Le même `endpoint` peut revenir : soit parce que la page a été rechargée,
 * soit parce qu'un second compte s'est connecté sur le même navigateur. Dans
 * les deux cas on écrase, y compris le `user_id` : les notifications doivent
 * suivre la personne présentement connectée, pas la première arrivée.
 */
export async function enregistrerAbonnement(options: {
  userId: string
  abonnement: AbonnementNavigateur
  choix: ChoixNotifications
  timezone: string
}): Promise<void> {
  const database = getDb()
  await database
    .insert(pushSubscriptions)
    .values({
      userId: options.userId,
      endpoint: options.abonnement.endpoint,
      p256dh: options.abonnement.keys.p256dh,
      auth: options.abonnement.keys.auth,
      invitations: options.choix.invitations,
      defiDuJour: options.choix.defiDuJour,
      timezone: options.timezone,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId: options.userId,
        p256dh: options.abonnement.keys.p256dh,
        auth: options.abonnement.keys.auth,
        invitations: options.choix.invitations,
        defiDuJour: options.choix.defiDuJour,
        timezone: options.timezone,
      },
    })
}

/** Retire un appareil. */
export async function retirerAbonnement(endpoint: string): Promise<void> {
  const database = getDb()
  await database.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint))
}

/** Retire plusieurs appareils d'un coup — utilisé après un envoi raté. */
export async function retirerAbonnements(endpoints: string[]): Promise<void> {
  if (endpoints.length === 0) return
  const database = getDb()
  await database.delete(pushSubscriptions).where(inArray(pushSubscriptions.endpoint, endpoints))
}

/** L'abonnement d'un appareil précis, pour savoir où en est la case à cocher. */
export async function lireAbonnement(endpoint: string): Promise<PushSubscriptionRow | null> {
  const database = getDb()
  const rows = await database
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))
    .limit(1)
  return rows[0] ?? null
}

/**
 * Les appareils d'un joueur à prévenir pour un usage donné.
 *
 * Tous ses appareils, sans exception : quelqu'un qui a l'application ouverte
 * sur son ordinateur veut quand même que son téléphone sonne — c'est même le
 * cas le plus utile, celui où l'on n'est pas devant l'écran allumé.
 */
export async function abonnementsPour(
  userId: string,
  usage: 'invitations' | 'defiDuJour',
): Promise<PushSubscriptionRow[]> {
  const database = getDb()
  const colonne =
    usage === 'invitations' ? pushSubscriptions.invitations : pushSubscriptions.defiDuJour

  return database
    .select()
    .from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(colonne, true)))
}

/**
 * Les appareils qui attendent encore le rappel du défi du jour.
 *
 * Le filtre porte sur `dernier_defi_envoye` plutôt que sur une heure : c'est
 * la seule façon d'être certain qu'on n'envoie qu'une notification par jour et
 * par appareil, même si l'ordonnanceur tourne toutes les dix minutes ou si le
 * conteneur redémarre entre deux passages.
 */
export async function abonnementsDefiEnAttente(): Promise<PushSubscriptionRow[]> {
  const database = getDb()
  return database.select().from(pushSubscriptions).where(eq(pushSubscriptions.defiDuJour, true))
}

/**
 * Qui a déjà résolu le défi du jour, parmi ceux qu'on s'apprêtait à relancer.
 *
 * Rend les paires `userId|jour` déjà faites. La quête `defi` est la même que
 * celle affichée sur l'accueil : on ne réinvente pas un compteur, on lit celui
 * qui existe — sans quoi les deux finiraient par ne plus dire la même chose.
 *
 * Le navigateur reste la source de vérité de la progression quotidienne, et il
 * ne la synchronise qu'à l'ouverture de l'application. Un joueur qui a résolu
 * le défi hors ligne et n'est pas revenu recevra donc son rappel pour rien.
 * C'est le bon sens du compromis : mieux vaut un rappel de trop qu'un rappel
 * manqué, et le cas est rare.
 */
export async function defisDejaFaits(userIds: string[], jours: string[]): Promise<Set<string>> {
  if (userIds.length === 0 || jours.length === 0) return new Set()

  const database = getDb()
  const lignes = await database
    .select({
      userId: dailyProgress.userId,
      day: dailyProgress.day,
      quests: dailyProgress.quests,
    })
    .from(dailyProgress)
    .where(
      and(
        inArray(dailyProgress.userId, [...new Set(userIds)]),
        inArray(dailyProgress.day, [...new Set(jours)]),
      ),
    )

  const faits = new Set<string>()
  for (const ligne of lignes) {
    if ((ligne.quests?.defi ?? 0) >= 1) faits.add(`${ligne.userId}|${ligne.day}`)
  }
  return faits
}

/** Note qu'un appareil a reçu son rappel pour la journée indiquée. */
export async function marquerDefiEnvoye(endpoints: string[], jour: string): Promise<void> {
  if (endpoints.length === 0) return
  const database = getDb()
  await database
    .update(pushSubscriptions)
    .set({ dernierDefiEnvoye: jour })
    .where(inArray(pushSubscriptions.endpoint, endpoints))
}
