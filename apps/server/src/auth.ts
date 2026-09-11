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
import { getRating, type RatingCategory } from '@coupparfait/db/ratings'

export interface Identity {
  userId: string
  username: string
  rating: number | null
}

/**
 * Résout un jeton de session.
 * Retourne `null` pour un invité, et n'échoue jamais : une base indisponible
 * dégrade simplement tout le monde en invité plutôt que de bloquer les parties.
 *
 * `category` est la catégorie de classement à afficher : celle de la cadence
 * du salon qu'on rejoint. Le rapide reste le défaut pour les appels qui n'ont
 * pas de cadence sous la main.
 */
export async function verifySessionToken(
  token: string | undefined,
  category: RatingCategory = 'rapid',
): Promise<Identity | null> {
  if (!token) return null

  try {
    const session = await resolveSession(token)
    if (!session) return null

    let rating: number | null = null
    try {
      rating = (await getRating(session.userId, category)).rating
    } catch {
      rating = null
    }

    return { userId: session.userId, username: session.username, rating }
  } catch (error) {
    console.warn('[auth] vérification de session impossible :', error)
    return null
  }
}
