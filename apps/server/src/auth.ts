/**
 * Vérification d'identité côté serveur temps réel.
 *
 * Le serveur ne délivre pas de session : c'est l'application Next.js qui gère
 * l'inscription, la connexion et les cookies. Ici, on se contente de vérifier
 * un jeton présenté par le navigateur au moment de rejoindre une partie.
 *
 * Un jeton absent ou invalide n'est **pas** une erreur : on joue alors en
 * invité. C'est un principe de la plateforme — le compte est un confort, pas
 * un péage.
 */

import { resolveSession } from '@coupparfait/db/auth'
import { getRating } from '@coupparfait/db/ratings'

export interface Identity {
  userId: string
  username: string
  rating: number | null
}

/**
 * Résout un jeton de session.
 * Retourne `null` pour un invité, et n'échoue jamais : une base indisponible
 * dégrade simplement tout le monde en invité plutôt que de bloquer les parties.
 */
export async function verifySessionToken(token: string | undefined): Promise<Identity | null> {
  if (!token) return null

  try {
    const session = await resolveSession(token)
    if (!session) return null

    // Le classement rapide sert d'affichage par défaut ; la catégorie réelle
    // dépend de la cadence et n'est connue qu'au moment d'enregistrer la partie.
    let rating: number | null = null
    try {
      rating = (await getRating(session.userId, 'rapid')).rating
    } catch {
      rating = null
    }

    return { userId: session.userId, username: session.username, rating }
  } catch (error) {
    console.warn('[auth] vérification de session impossible :', error)
    return null
  }
}
