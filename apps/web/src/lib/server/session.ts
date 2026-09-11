import 'server-only'

/**
 * Session côté serveur Next.js.
 *
 * Le jeton vit dans un cookie `HttpOnly` : JavaScript ne peut pas le lire, donc
 * une faille de script injecté ne permet pas de voler la session. Il est aussi
 * `SameSite=Lax`, ce qui bloque les requêtes inter-sites — la protection CSRF
 * de base, suffisante ici puisqu'aucune action sensible ne se fait en GET.
 */

import { cookies, headers } from 'next/headers'
import { createSession, destroySession, resolveSession } from '@coupparfait/db/auth'
import type { SessionIdentity } from '@coupparfait/db/auth'

export const SESSION_COOKIE = 'coupparfait_session'

/** Identité de l'utilisateur courant, ou `null` s'il navigue en invité. */
export async function getCurrentUser(): Promise<SessionIdentity | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  return resolveSession(token)
}

/** Ouvre une session et pose le cookie. */
export async function startSession(userId: string): Promise<void> {
  const headerStore = await headers()
  const { token, expiresAt } = await createSession(userId, {
    userAgent: headerStore.get('user-agent') ?? undefined,
  })

  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    // En développement on sert en HTTP : exiger « secure » empêcherait toute
    // connexion locale. En production, le cookie ne circule qu'en HTTPS.
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })
}

/** Ferme la session courante, côté base **et** côté navigateur. */
export async function endSession(): Promise<void> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) await destroySession(token)
  store.delete(SESSION_COOKIE)
}

/**
 * Jeton brut, pour les appels **de serveur à serveur** vers le temps réel.
 *
 * Il ne quitte le cookie que dans ce processus : les routes `/api/analyse` et
 * `/api/parties/miennes` le transmettent au serveur Socket.IO depuis Next, et
 * le navigateur ne le voit jamais. Pour ce que le navigateur envoie lui-même
 * à la poignée de main WebSocket, voir `creerJetonTempsReel`.
 */
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies()
  return store.get(SESSION_COOKIE)?.value ?? null
}

/** Durée de vie du jeton remis au navigateur pour le temps réel. */
export const JETON_TEMPS_REEL_MS = 15 * 60 * 1000

/**
 * Un jeton dédié au temps réel, court, remis au JavaScript de la page.
 *
 * La route `/api/auth/token` renvoyait le jeton de session lui-même : le
 * cookie était `HttpOnly` pour que le script ne le lise pas, et une route le
 * lui donnait. Un script injecté récupérait ainsi trente jours de session.
 *
 * On ouvre donc une session **distincte**, dans la même table, avec la même
 * empreinte — le serveur temps réel la résout sans rien changer —, mais qui
 * expire au bout d'un quart d'heure et se reconnaît à son agent utilisateur.
 * Voler ce jeton-là ne vaut qu'un quart d'heure de partie, et jamais le
 * compte : les routes de compte lisent le cookie, pas ce jeton.
 */
export async function creerJetonTempsReel(): Promise<string | null> {
  const user = await getCurrentUser()
  if (!user) return null
  try {
    const { token } = await createSession(user.userId, {
      ttlMs: JETON_TEMPS_REEL_MS,
      userAgent: 'temps réel',
    })
    return token
  } catch {
    // Base muette : on jouera en invité, comme partout ailleurs.
    return null
  }
}
