/**
 * Carnet d'adresses et défis entre amis.
 *
 * Deux notions distinctes, réunies ici parce qu'elles ne servent qu'ensemble :
 * on ajoute quelqu'un pour pouvoir le défier, et on ne défie que des gens
 * qu'on a ajoutés.
 *
 * Une relation est une ligne orientée du demandeur vers le destinataire. Ce
 * sens compte tant que la demande est en attente — il dit qui doit répondre —
 * puis n'a plus d'importance : une amitié acceptée se lit dans les deux sens.
 */

import { and, desc, eq, gt, ilike, ne, or, sql } from 'drizzle-orm'
import { getDb } from './index.ts'
import { challenges, friendships, ratings, users } from './schema.ts'

/** Une entrée du carnet, telle qu'on l'affiche. */
export interface Friend {
  id: string
  username: string
  avatar: string | null
  rating: number | null
  lastSeenAt: Date
  /** Vrai si la personne a été vue dans les cinq dernières minutes. */
  online: boolean
}

/** Une demande d'amitié en attente. */
export interface PendingRequest {
  /** Identifiant de la relation, à renvoyer pour répondre. */
  id: string
  user: Friend
  createdAt: Date
}

/** Fenêtre au-delà de laquelle on ne se dit plus « en ligne ». */
const ONLINE_MS = 5 * 60 * 1000

/**
 * Durée de vie d'un défi.
 *
 * Calée sur le délai au bout duquel le serveur annule une partie où personne
 * n'a joué (`IDLE_ABORT_MS`, cinq minutes). Deux durées différentes feraient
 * mentir le décompte affiché : on lirait « expire dans 8:00 » sur une partie
 * que le serveur a déjà ramassée.
 */
const CHALLENGE_TTL_MS = 5 * 60 * 1000

function toFriend(row: {
  id: string
  username: string
  avatar: string | null
  lastSeenAt: Date
  rating: number | null
}): Friend {
  return {
    id: row.id,
    username: row.username,
    avatar: row.avatar,
    rating: row.rating,
    lastSeenAt: row.lastSeenAt,
    online: Date.now() - row.lastSeenAt.getTime() < ONLINE_MS,
  }
}

/**
 * Le classement affiché à côté d'un ami.
 *
 * On prend la cadence rapide : c'est celle des parties entre amis, et afficher
 * trois classements dans une liste de contacts n'aide personne.
 */
const RATING_CATEGORY = 'rapid'

// ─────────────────────────────────────────────────────────────────────────────
//  Carnet d'adresses
// ─────────────────────────────────────────────────────────────────────────────

/** Amis acceptés, dans l'ordre : en ligne d'abord, puis les plus récents. */
export async function listFriends(userId: string): Promise<Friend[]> {
  const db = getDb()

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      avatar: users.avatar,
      lastSeenAt: users.lastSeenAt,
      rating: ratings.rating,
    })
    .from(friendships)
    .innerJoin(
      users,
      // L'ami est celui des deux qui n'est pas moi.
      or(
        and(eq(friendships.requesterId, userId), eq(users.id, friendships.addresseeId)),
        and(eq(friendships.addresseeId, userId), eq(users.id, friendships.requesterId)),
      ),
    )
    .leftJoin(
      ratings,
      and(eq(ratings.userId, users.id), eq(ratings.category, RATING_CATEGORY)),
    )
    .where(
      and(
        eq(friendships.status, 'accepted'),
        or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId)),
      ),
    )
    .orderBy(desc(users.lastSeenAt))

  return rows.map(toFriend)
}

/** Demandes reçues, en attente de réponse. */
export async function listIncomingRequests(userId: string): Promise<PendingRequest[]> {
  const db = getDb()

  const rows = await db
    .select({
      id: friendships.id,
      createdAt: friendships.createdAt,
      userId: users.id,
      username: users.username,
      avatar: users.avatar,
      lastSeenAt: users.lastSeenAt,
      rating: ratings.rating,
    })
    .from(friendships)
    .innerJoin(users, eq(users.id, friendships.requesterId))
    .leftJoin(
      ratings,
      and(eq(ratings.userId, users.id), eq(ratings.category, RATING_CATEGORY)),
    )
    .where(and(eq(friendships.addresseeId, userId), eq(friendships.status, 'pending')))
    .orderBy(desc(friendships.createdAt))

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    user: toFriend({ ...row, id: row.userId }),
  }))
}

/** Demandes que j'ai envoyées et qui attendent une réponse. */
export async function listOutgoingRequests(userId: string): Promise<PendingRequest[]> {
  const db = getDb()

  const rows = await db
    .select({
      id: friendships.id,
      createdAt: friendships.createdAt,
      userId: users.id,
      username: users.username,
      avatar: users.avatar,
      lastSeenAt: users.lastSeenAt,
      rating: ratings.rating,
    })
    .from(friendships)
    .innerJoin(users, eq(users.id, friendships.addresseeId))
    .leftJoin(
      ratings,
      and(eq(ratings.userId, users.id), eq(ratings.category, RATING_CATEGORY)),
    )
    .where(and(eq(friendships.requesterId, userId), eq(friendships.status, 'pending')))
    .orderBy(desc(friendships.createdAt))

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    user: toFriend({ ...row, id: row.userId }),
  }))
}

export type AddFriendResult =
  | { ok: true; status: 'pending' | 'accepted' }
  | { ok: false; reason: 'unknownUser' | 'self' | 'already' }

/**
 * Demander quelqu'un en ami, par pseudo.
 *
 * Cas important : si la personne nous avait déjà demandé, sa demande est
 * acceptée au lieu d'en créer une seconde en sens inverse. Sans cela, deux
 * personnes qui s'ajoutent en même temps resteraient en attente l'une de
 * l'autre indéfiniment.
 */
export async function addFriend(userId: string, username: string): Promise<AddFriendResult> {
  const db = getDb()
  const wanted = username.trim().toLowerCase()
  if (!wanted) return { ok: false, reason: 'unknownUser' }

  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.usernameLower, wanted), eq(users.disabled, false)))
    .limit(1)

  if (!target) return { ok: false, reason: 'unknownUser' }
  if (target.id === userId) return { ok: false, reason: 'self' }

  const [existing] = await db
    .select({ id: friendships.id, status: friendships.status, requesterId: friendships.requesterId })
    .from(friendships)
    .where(
      or(
        and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, target.id)),
        and(eq(friendships.requesterId, target.id), eq(friendships.addresseeId, userId)),
      ),
    )
    .limit(1)

  if (existing) {
    if (existing.status === 'accepted') return { ok: false, reason: 'already' }
    // Demande croisée : on la scelle plutôt que d'en empiler une seconde.
    if (existing.requesterId === target.id) {
      await db
        .update(friendships)
        .set({ status: 'accepted', respondedAt: new Date() })
        .where(eq(friendships.id, existing.id))
      return { ok: true, status: 'accepted' }
    }
    return { ok: false, reason: 'already' }
  }

  await db.insert(friendships).values({ requesterId: userId, addresseeId: target.id })
  return { ok: true, status: 'pending' }
}

/**
 * Répondre à une demande reçue.
 *
 * Refuser efface la ligne : on ne garde pas de trace d'un refus, ce qui laisse
 * la porte ouverte à une nouvelle demande plus tard.
 */
export async function respondToRequest(
  userId: string,
  requestId: string,
  accept: boolean,
): Promise<boolean> {
  const db = getDb()

  if (!accept) {
    const removed = await db
      .delete(friendships)
      .where(and(eq(friendships.id, requestId), eq(friendships.addresseeId, userId)))
      .returning({ id: friendships.id })
    return removed.length > 0
  }

  const updated = await db
    .update(friendships)
    .set({ status: 'accepted', respondedAt: new Date() })
    .where(
      and(
        eq(friendships.id, requestId),
        eq(friendships.addresseeId, userId),
        eq(friendships.status, 'pending'),
      ),
    )
    .returning({ id: friendships.id })

  return updated.length > 0
}

/** Retirer quelqu'un du carnet, dans un sens comme dans l'autre. */
export async function removeFriend(userId: string, otherId: string): Promise<boolean> {
  const db = getDb()
  const removed = await db
    .delete(friendships)
    .where(
      or(
        and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, otherId)),
        and(eq(friendships.requesterId, otherId), eq(friendships.addresseeId, userId)),
      ),
    )
    .returning({ id: friendships.id })
  return removed.length > 0
}

/** Sont-ils amis ? Vérifié avant tout défi : on ne défie pas un inconnu. */
export async function areFriends(userId: string, otherId: string): Promise<boolean> {
  const db = getDb()
  const [row] = await db
    .select({ id: friendships.id })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, 'accepted'),
        or(
          and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, otherId)),
          and(eq(friendships.requesterId, otherId), eq(friendships.addresseeId, userId)),
        ),
      ),
    )
    .limit(1)
  return row != null
}

/**
 * Chercher quelqu'un à ajouter.
 *
 * On exclut soi-même, les comptes désactivés, et l'on s'arrête à huit
 * résultats : au-delà, c'est que la recherche est trop vague pour être utile.
 */
export async function searchUsers(userId: string, query: string): Promise<Friend[]> {
  const db = getDb()
  const needle = query.trim()
  if (needle.length < 2) return []

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      avatar: users.avatar,
      lastSeenAt: users.lastSeenAt,
      rating: ratings.rating,
    })
    .from(users)
    .leftJoin(
      ratings,
      and(eq(ratings.userId, users.id), eq(ratings.category, RATING_CATEGORY)),
    )
    .where(
      and(
        ilike(users.usernameLower, `${needle.toLowerCase()}%`),
        ne(users.id, userId),
        eq(users.disabled, false),
      ),
    )
    .orderBy(desc(users.lastSeenAt))
    .limit(8)

  return rows.map(toFriend)
}

// ─────────────────────────────────────────────────────────────────────────────
//  Défis
// ─────────────────────────────────────────────────────────────────────────────

export interface PendingChallenge {
  id: string
  slug: string
  from: { id: string | null; username: string }
  to: string | null
  initialTime: number
  increment: number
  rated: boolean
  /** Couleur souhaitée par celui qui défie : `w`, `b` ou `random`. */
  creatorColor: string
  expiresAt: Date
}

/** Défier un ami. Renvoie le défi créé, prêt à être notifié. */
export async function createChallenge(options: {
  fromId: string
  fromName: string
  toId: string
  slug: string
  initialTime: number
  increment: number
  rated: boolean
  color: 'w' | 'b' | 'random'
}): Promise<PendingChallenge> {
  const db = getDb()

  // Un seul défi en attente à la fois vers la même personne : renvoyer trois
  // invitations parce qu'on a cliqué trois fois ne rend service à personne.
  await db
    .delete(challenges)
    .where(
      and(
        eq(challenges.creatorId, options.fromId),
        eq(challenges.targetId, options.toId),
        eq(challenges.status, 'pending'),
      ),
    )

  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS)
  const [row] = await db
    .insert(challenges)
    .values({
      slug: options.slug,
      creatorId: options.fromId,
      creatorName: options.fromName,
      creatorColor: options.color,
      initialTime: options.initialTime,
      increment: options.increment,
      rated: options.rated,
      kind: 'direct',
      targetId: options.toId,
      expiresAt,
    })
    .returning()

  if (!row) throw new Error('Défi non enregistré.')

  return {
    id: row.id,
    slug: row.slug,
    from: { id: row.creatorId, username: row.creatorName },
    to: row.targetId,
    initialTime: row.initialTime,
    increment: row.increment,
    rated: row.rated,
    creatorColor: row.creatorColor,
    expiresAt: row.expiresAt,
  }
}

/**
 * Défi lancé par quelqu'un qui n'a pas de compte.
 *
 * C'est le bout du lien d'invitation : on reçoit une adresse, on tape un
 * pseudo, on entre dans la partie. Exiger un compte à cet instant reviendrait
 * à demander à quelqu'un de s'inscrire avant de savoir si le jeu lui plaît.
 *
 * Le défi n'a donc pas de `creatorId` — seulement le pseudo choisi. Il vise en
 * revanche un compte bien identifié, retrouvé par son pseudo : c'est ce qui
 * fait que la proposition arrive chez la bonne personne.
 */
export async function createGuestChallenge(options: {
  toUsername: string
  fromName: string
  slug: string
  initialTime: number
  increment: number
}): Promise<PendingChallenge | null> {
  const db = getDb()

  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(eq(users.usernameLower, options.toUsername.trim().toLowerCase()), eq(users.disabled, false)),
    )
    .limit(1)

  if (!target) return null

  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS)
  const [row] = await db
    .insert(challenges)
    .values({
      slug: options.slug,
      creatorId: null,
      creatorName: options.fromName,
      creatorColor: 'random',
      initialTime: options.initialTime,
      increment: options.increment,
      rated: false,
      kind: 'direct',
      targetId: target.id,
      expiresAt,
    })
    .returning()

  if (!row) return null

  return {
    id: row.id,
    slug: row.slug,
    from: { id: null, username: row.creatorName },
    to: row.targetId,
    initialTime: row.initialTime,
    increment: row.increment,
    rated: row.rated,
    creatorColor: row.creatorColor,
    expiresAt: row.expiresAt,
  }
}

/**
 * Partie ouverte par lien, sans destinataire désigné.
 *
 * Le lien « jouer contre un ami » créait jusqu'ici une adresse et rien de
 * plus : rien en base, donc rien à lister, et une partie oubliée qu'on ne
 * pouvait ni retrouver ni supprimer. On l'enregistre désormais quand celui qui
 * la crée a un compte — sans compte, il n'y a personne à qui la rattacher.
 */
export async function createOpenChallenge(options: {
  fromId: string
  fromName: string
  slug: string
  initialTime: number
  increment: number
  rated: boolean
}): Promise<PendingChallenge | null> {
  const db = getDb()
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS)

  const [row] = await db
    .insert(challenges)
    .values({
      slug: options.slug,
      creatorId: options.fromId,
      creatorName: options.fromName,
      creatorColor: 'random',
      initialTime: options.initialTime,
      increment: options.increment,
      rated: options.rated,
      kind: 'open',
      targetId: null,
      expiresAt,
    })
    .returning()

  if (!row) return null

  return {
    id: row.id,
    slug: row.slug,
    from: { id: row.creatorId, username: row.creatorName },
    to: row.targetId,
    initialTime: row.initialTime,
    increment: row.increment,
    rated: row.rated,
    creatorColor: row.creatorColor,
    expiresAt: row.expiresAt,
  }
}

/** Défis qui m'attendent, non expirés. */
export async function listIncomingChallenges(userId: string): Promise<PendingChallenge[]> {
  const db = getDb()
  const rows = await db
    .select()
    .from(challenges)
    .where(
      and(
        eq(challenges.targetId, userId),
        eq(challenges.status, 'pending'),
        gt(challenges.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(challenges.createdAt))

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    from: { id: row.creatorId, username: row.creatorName },
    to: row.targetId,
    initialTime: row.initialTime,
    increment: row.increment,
    rated: row.rated,
    creatorColor: row.creatorColor,
    expiresAt: row.expiresAt,
  }))
}

/**
 * Défis que j'ai lancés et qui attendent encore.
 *
 * Sert à savoir, côté demandeur, quand l'autre a accepté : c'est ce qui permet
 * de l'emmener sur l'échiquier sans qu'il ait à surveiller quoi que ce soit.
 */
export async function listOutgoingChallenges(
  userId: string,
): Promise<Array<PendingChallenge & { status: string; kind: string; toName: string | null }>> {
  const db = getDb()
  const rows = await db
    .select({ challenge: challenges, toName: users.username })
    .from(challenges)
    .leftJoin(users, eq(users.id, challenges.targetId))
    .where(
      and(
        eq(challenges.creatorId, userId),
        gt(challenges.expiresAt, new Date()),
        or(eq(challenges.status, 'pending'), eq(challenges.status, 'accepted')),
      ),
    )
    .orderBy(desc(challenges.createdAt))

  return rows.map(({ challenge: row, toName }) => ({
    id: row.id,
    slug: row.slug,
    from: { id: row.creatorId, username: row.creatorName },
    to: row.targetId,
    initialTime: row.initialTime,
    increment: row.increment,
    rated: row.rated,
    creatorColor: row.creatorColor,
    expiresAt: row.expiresAt,
    status: row.status,
    kind: row.kind,
    toName,
  }))
}

/** Accepter ou refuser un défi reçu. Renvoie le salon à rejoindre si accepté. */
export async function respondToChallenge(
  userId: string,
  challengeId: string,
  accept: boolean,
): Promise<{ ok: boolean; slug?: string; initialTime?: number; increment?: number; rated?: boolean }> {
  const db = getDb()

  const [row] = await db
    .update(challenges)
    .set({ status: accept ? 'accepted' : 'declined' })
    .where(
      and(
        eq(challenges.id, challengeId),
        eq(challenges.targetId, userId),
        eq(challenges.status, 'pending'),
      ),
    )
    .returning()

  if (!row) return { ok: false }
  if (!accept) return { ok: true }

  return {
    ok: true,
    slug: row.slug,
    initialTime: row.initialTime,
    increment: row.increment,
    rated: row.rated,
  }
}

/** Annuler un défi qu'on a lancé. */
export async function cancelChallenge(userId: string, challengeId: string): Promise<boolean> {
  const db = getDb()
  const removed = await db
    .delete(challenges)
    .where(and(eq(challenges.id, challengeId), eq(challenges.creatorId, userId)))
    .returning({ id: challenges.id })
  return removed.length > 0
}

/**
 * Purge des défis périmés.
 *
 * Appelée au fil de l'eau plutôt que par une tâche planifiée : sur une
 * plateforme de cette taille, quelques lignes mortes ne justifient pas un
 * ordonnanceur.
 */
export async function purgeExpiredChallenges(): Promise<void> {
  const db = getDb()
  await db
    .delete(challenges)
    .where(and(eq(challenges.status, 'pending'), sql`${challenges.expiresAt} < now()`))
}
