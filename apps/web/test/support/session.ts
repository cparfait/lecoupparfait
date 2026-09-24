/**
 * Une session simulée, à la place de `lib/server/session.ts`.
 *
 * Le vrai module lit le témoin par `cookies()` de `next/headers`, qui n'existe
 * que pendant une requête servie par Next. On le remplace donc en entier par
 * `mock.module` : `getCurrentUser()` rend l'utilisateur que le test a posé
 * dans `session.utilisateur`, et les fonctions qui écriraient un témoin ne font
 * rien.
 *
 * À appeler **avant** d'importer la route : un module déjà chargé garde ses
 * liaisons.
 */

import { simulerModule } from './modules.ts'
import type { SessionIdentity } from '@coupparfait/db/auth'

export const session: { utilisateur: SessionIdentity | null } = { utilisateur: null }

export function joueur(userId: string, username = userId): SessionIdentity {
  return { userId, username, avatar: null, role: 'user' }
}

export function simulerSession(): void {
  simulerModule(new URL('../../src/lib/server/session.ts', import.meta.url).href, {
    SESSION_COOKIE: 'coupparfait_session',
    JETON_TEMPS_REEL_MS: 15 * 60 * 1000,
    getCurrentUser: async () => session.utilisateur,
    startSession: async () => {},
    endSession: async () => {},
    getSessionToken: async () => null,
    creerJetonTempsReel: async () => null,
  })
}
