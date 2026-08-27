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
 * Jeton brut, à transmettre au serveur temps réel.
 *
 * C'est la seule situation où le jeton quitte le cookie : le serveur Socket.IO
 * en a besoin pour identifier le joueur, et il ne partage pas les cookies avec
 * l'application Next lorsqu'il est servi sur un autre sous-domaine.
 */
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies()
  return store.get(SESSION_COOKIE)?.value ?? null
}
