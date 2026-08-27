/**
 * Comptes et sessions.
 *
 * Choix de conception :
 *
 *  - **scrypt** plutôt que bcrypt ou argon2. Il est dans la bibliothèque
 *    standard de Node : aucune dépendance native à compiler, donc aucune image
 *    Docker qui casse à la prochaine version. Il est recommandé par l'OWASP et
 *    largement suffisant avec des paramètres corrects.
 *  - **Jetons de session opaques**, pas de JWT. Un JWT ne se révoque pas ; un
 *    jeton en base se supprime. On ne stocke que son empreinte SHA-256 : voler
 *    la base ne permet donc pas d'usurper une session en cours.
 *  - **L'e-mail est facultatif.** On ne le demande que pour pouvoir
 *    réinitialiser un mot de passe, et on le dit explicitement.
 */

import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto'
import { promisify } from 'node:util'
import { and, eq, gt, lt, sql } from 'drizzle-orm'
import { getDb } from './index.ts'
import { ratings, sessions, users, type User } from './schema.ts'

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>

/**
 * Paramètres scrypt.
 *
 * `N = 2^16` demande environ 64 Mo de mémoire et une centaine de millisecondes
 * par vérification : assez lent pour décourager une attaque par force brute,
 * assez rapide pour ne pas gêner une connexion légitime.
 */
const SCRYPT = { N: 65536, r: 8, p: 1, maxmem: 128 * 1024 * 1024 }
const KEY_LENGTH = 64

// ─────────────────────────────────────────────────────────────────────────────
//  Mots de passe
// ─────────────────────────────────────────────────────────────────────────────

/** Empreinte au format `scrypt$<sel base64>$<clé base64>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = await scrypt(password, salt, KEY_LENGTH, SCRYPT)
  return `scrypt$${salt.toString('base64')}$${derived.toString('base64')}`
}

/**
 * Vérifie un mot de passe.
 * La comparaison est à temps constant : sans cela, le temps de réponse
 * révélerait combien de caractères de l'empreinte sont corrects.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltPart, keyPart] = stored.split('$')
  if (scheme !== 'scrypt' || !saltPart || !keyPart) return false

  try {
    const salt = Buffer.from(saltPart, 'base64')
    const expected = Buffer.from(keyPart, 'base64')
    const derived = await scrypt(password, salt, expected.length, SCRYPT)
    return derived.length === expected.length && timingSafeEqual(derived, expected)
  } catch {
    return false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Validation des saisies
// ─────────────────────────────────────────────────────────────────────────────

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,20}$/

/**
 * Pseudos réservés.
 * Sans cette liste, quelqu'un pourrait s'appeler « admin » ou « gambit » et se
 * faire passer pour l'équipe dans le tchat des parties.
 */
const RESERVED = new Set([
  'admin',
  'administrateur',
  'gambit',
  'root',
  'moderateur',
  'moderator',
  'system',
  'systeme',
  'support',
  'null',
  'undefined',
  'anonyme',
  'anonymous',
  'invite',
  'guest',
  'ordinateur',
  'computer',
  'stockfish',
])

export type ValidationError =
  | 'invalidUsername'
  | 'usernameTaken'
  | 'weakPassword'
  | 'emailTaken'
  | 'invalidCredentials'

export function validateUsername(username: string): ValidationError | null {
  if (!USERNAME_PATTERN.test(username)) return 'invalidUsername'
  if (RESERVED.has(username.toLowerCase())) return 'usernameTaken'
  return null
}

export function validatePassword(password: string): ValidationError | null {
  // Huit caractères, sans exigence de symbole : imposer « une majuscule, un
  // chiffre et un caractère spécial » produit surtout des mots de passe notés
  // sur un carnet. La longueur est le seul critère qui compte vraiment.
  return password.length >= 8 ? null : 'weakPassword'
}

// ─────────────────────────────────────────────────────────────────────────────
//  Création et connexion
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateUserInput {
  username: string
  password: string
  email?: string | null
}

export async function createUser(
  input: CreateUserInput,
): Promise<{ ok: true; user: User } | { ok: false; error: ValidationError }> {
  const usernameError = validateUsername(input.username)
  if (usernameError) return { ok: false, error: usernameError }

  const passwordError = validatePassword(input.password)
  if (passwordError) return { ok: false, error: passwordError }

  const database = getDb()
  const usernameLower = input.username.toLowerCase()

  const existing = await database
    .select({ id: users.id })
    .from(users)
    .where(eq(users.usernameLower, usernameLower))
    .limit(1)
  if (existing.length > 0) return { ok: false, error: 'usernameTaken' }

  const email = input.email?.trim().toLowerCase() || null
  if (email) {
    const emailTaken = await database
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
    if (emailTaken.length > 0) return { ok: false, error: 'emailTaken' }
  }

  const passwordHash = await hashPassword(input.password)
  const inserted = await database
    .insert(users)
    .values({ username: input.username, usernameLower, email, passwordHash })
    .returning()

  const user = inserted[0]!

  // Un classement provisoire par catégorie, pour que le profil ne soit pas vide.
  await database.insert(ratings).values(
    ['bullet', 'blitz', 'rapid', 'classical', 'correspondence', 'puzzle'].map((category) => ({
      userId: user.id,
      category,
    })),
  )

  return { ok: true, user }
}

export async function authenticate(
  username: string,
  password: string,
): Promise<{ ok: true; user: User } | { ok: false; error: ValidationError }> {
  const database = getDb()
  const rows = await database
    .select()
    .from(users)
    .where(eq(users.usernameLower, username.toLowerCase()))
    .limit(1)

  const user = rows[0]
  if (!user || user.disabled) {
    // On vérifie quand même une empreinte factice : sans cela, la réponse
    // instantanée pour un pseudo inexistant permettrait d'énumérer les comptes.
    await verifyPassword(password, 'scrypt$AAAAAAAAAAAAAAAAAAAAAA==$AAAA')
    return { ok: false, error: 'invalidCredentials' }
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) return { ok: false, error: 'invalidCredentials' }

  await database
    .update(users)
    .set({ lastSeenAt: new Date() })
    .where(eq(users.id, user.id))

  return { ok: true, user }
}

/** Change le mot de passe après avoir vérifié l'ancien. */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: ValidationError }> {
  const passwordError = validatePassword(newPassword)
  if (passwordError) return { ok: false, error: passwordError }

  const database = getDb()
  const rows = await database.select().from(users).where(eq(users.id, userId)).limit(1)
  const user = rows[0]
  if (!user) return { ok: false, error: 'invalidCredentials' }

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    return { ok: false, error: 'invalidCredentials' }
  }

  await database
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword) })
    .where(eq(users.id, userId))

  // Changer de mot de passe déconnecte partout : c'est le geste attendu quand
  // on soupçonne que quelqu'un d'autre a eu accès au compte.
  await database.delete(sessions).where(eq(sessions.userId, userId))
  return { ok: true }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Sessions
// ─────────────────────────────────────────────────────────────────────────────

/** Empreinte d'un jeton de session. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export interface SessionIdentity {
  userId: string
  username: string
  avatar: string | null
  role: string
}

/**
 * Ouvre une session et retourne le jeton **en clair** — la seule et unique fois
 * où il existe sous cette forme côté serveur. Il part ensuite dans un cookie.
 */
export async function createSession(
  userId: string,
  options: { days?: number; userAgent?: string } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const database = getDb()
  const token = randomBytes(32).toString('base64url')
  const days = options.days ?? Number(process.env.AUTH_SESSION_DAYS ?? 30)
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  await database.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    userAgent: options.userAgent?.slice(0, 200) ?? null,
    expiresAt,
  })

  return { token, expiresAt }
}

/** Résout un jeton en identité, ou `null` s'il est invalide ou expiré. */
export async function resolveSession(token: string | undefined | null): Promise<SessionIdentity | null> {
  if (!token) return null

  try {
    const database = getDb()
    const rows = await database
      .select({
        userId: users.id,
        username: users.username,
        avatar: users.avatar,
        role: users.role,
        disabled: users.disabled,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
      .limit(1)

    const row = rows[0]
    if (!row || row.disabled) return null

    return {
      userId: row.userId,
      username: row.username,
      avatar: row.avatar,
      role: row.role,
    }
  } catch {
    // Base injoignable : on considère l'utilisateur comme non connecté plutôt
    // que de faire tomber la page. Le mode invité reste pleinement utilisable.
    return null
  }
}

export async function destroySession(token: string): Promise<void> {
  const database = getDb()
  await database.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)))
}

export async function destroyAllSessions(userId: string): Promise<void> {
  const database = getDb()
  await database.delete(sessions).where(eq(sessions.userId, userId))
}

/** Supprime les sessions expirées. À appeler périodiquement. */
export async function pruneSessions(): Promise<number> {
  const database = getDb()
  const deleted = await database
    .delete(sessions)
    .where(lt(sessions.expiresAt, new Date()))
    .returning({ id: sessions.id })
  return deleted.length
}
