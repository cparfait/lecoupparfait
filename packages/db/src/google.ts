/**
 * Les comptes liés à Google.
 *
 * Google ne nous donne qu'une identité vérifiée : un identifiant stable (`sub`),
 * une adresse et un nom. Tout le reste — le pseudo, la session, le classement —
 * reste celui du site. Ce module ne connaît que des lignes ; l'échange avec
 * Google vit dans l'application web (`lib/server/google.ts`).
 *
 * **Une même adresse ne suffit pas toujours à lier.** L'adresse d'un compte
 * n'est pas vérifiée à l'inscription — n'importe qui peut s'inscrire avec
 * celle d'un autre, puis attendre que le vrai titulaire arrive par Google.
 * Rattacher d'office livrerait alors au titulaire un compte dont l'intrus
 * garde le mot de passe. La liaison d'après l'adresse n'est donc automatique
 * que si le compte l'a **confirmée par courriel** : c'est la confiance que lui
 * accorde déjà « Mot de passe oublié », qui ouvre le compte à qui reçoit ses
 * messages. Sinon, le retour de Google la propose, et le mot de passe du
 * compte la confirme (`api/auth/google/rattacher`).
 */

import { randomUUID } from 'node:crypto'
import { and, eq, isNull, ne } from 'drizzle-orm'
import { initialiserClassements, validateUsername, type ValidationError } from './auth.ts'
import { getDb } from './index.ts'
import { users, type User } from './schema.ts'

/**
 * Le début de l'empreinte d'un compte créé par Google.
 *
 * Elle ne correspond à aucun mot de passe : un tel compte n'en a pas. C'est
 * aussi ce qui le distingue, pour ne pas lui demander de mot de passe là où il
 * n'en a jamais donné — à la suppression, par exemple.
 */
const EMPREINTE_GOOGLE = 'google:'

/** Le compte lié à cette identité Google, s'il existe et n'est pas désactivé. */
export async function compteGoogle(sub: string): Promise<User | null> {
  const lignes = await getDb()
    .select()
    .from(users)
    .where(and(eq(users.googleSub, sub), eq(users.disabled, false)))
    .limit(1)
  return lignes[0] ?? null
}

/** Vrai si une adresse est déjà celle d'un compte du site. */
export async function adresseConnue(email: string): Promise<boolean> {
  const lignes = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1)
  return lignes.length > 0
}

/** Le compte qui utilise déjà une adresse, et ce qu'il faut en savoir pour lui rattacher Google. */
export interface TitulaireAdresse {
  id: string
  username: string
  /** L'adresse a été confirmée par courriel. */
  confirme: boolean
  /** Déjà lié à une identité Google — forcément une autre, sinon on l'aurait trouvé par elle. */
  lie: boolean
  desactive: boolean
}

export async function titulaireDeLAdresse(email: string): Promise<TitulaireAdresse | null> {
  const lignes = await getDb()
    .select({
      id: users.id,
      username: users.username,
      emailVerifiedAt: users.emailVerifiedAt,
      googleSub: users.googleSub,
      disabled: users.disabled,
    })
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1)
  const ligne = lignes[0]
  if (!ligne) return null
  return {
    id: ligne.id,
    username: ligne.username,
    confirme: ligne.emailVerifiedAt != null,
    lie: ligne.googleSub != null,
    desactive: Boolean(ligne.disabled),
  }
}

/**
 * Crée un compte à partir d'une identité Google, avec le pseudo choisi.
 *
 * L'adresse n'est reprise que si Google l'a vérifiée et qu'aucun compte ne
 * l'utilise : elle est alors marquée vérifiée, puisqu'elle l'est.
 */
export async function creerCompteGoogle(options: {
  sub: string
  username: string
  email: string | null
  avatar?: string
  locale?: string | null
}): Promise<{ ok: true; user: User } | { ok: false; error: ValidationError | 'googleTaken' }> {
  const erreurPseudo = validateUsername(options.username)
  if (erreurPseudo) return { ok: false, error: erreurPseudo }

  const database = getDb()
  const usernameLower = options.username.toLowerCase()
  const pris = await database
    .select({ id: users.id })
    .from(users)
    .where(eq(users.usernameLower, usernameLower))
    .limit(1)
  if (pris.length > 0) return { ok: false, error: 'usernameTaken' }

  if (await compteGoogle(options.sub)) return { ok: false, error: 'googleTaken' }

  const email = options.email?.trim().toLowerCase() || null
  const adresse = email && !(await adresseConnue(email)) ? email : null

  const inseres = await database
    .insert(users)
    .values({
      username: options.username,
      usernameLower,
      email: adresse,
      emailVerifiedAt: adresse ? new Date() : null,
      passwordHash: `${EMPREINTE_GOOGLE}${randomUUID()}`,
      googleSub: options.sub,
      ...(options.avatar ? { avatar: options.avatar } : {}),
      ...(options.locale ? { preferences: { locale: options.locale } } : {}),
    })
    .returning()
  const user = inseres[0]!
  await initialiserClassements(user.id)
  return { ok: true, user }
}

/**
 * Lie une identité Google à un compte existant : depuis son profil, ou au
 * retour de Google quand l'adresse est la sienne.
 *
 * Refusé si cette identité est déjà celle d'un autre compte : on ne la déplace
 * pas d'un compte à l'autre en silence.
 */
export async function lierCompteGoogle(
  userId: string,
  sub: string,
): Promise<'lie' | 'dejaAilleurs'> {
  const database = getDb()
  const ailleurs = await database
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.googleSub, sub), ne(users.id, userId)))
    .limit(1)
  if (ailleurs.length > 0) return 'dejaAilleurs'

  await database
    .update(users)
    .set({ googleSub: sub })
    .where(and(eq(users.id, userId), isNull(users.googleSub)))
  return 'lie'
}

/** Ce que le profil et la suppression doivent savoir de la liaison Google. */
export async function etatGoogle(
  userId: string,
): Promise<{ lie: boolean; sansMotDePasse: boolean }> {
  const lignes = await getDb()
    .select({ googleSub: users.googleSub, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  const ligne = lignes[0]
  return {
    lie: Boolean(ligne?.googleSub),
    sansMotDePasse: Boolean(ligne?.passwordHash.startsWith(EMPREINTE_GOOGLE)),
  }
}
