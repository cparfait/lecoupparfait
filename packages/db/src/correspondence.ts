/**
 * Parties par correspondance.
 *
 * Un coup par jour, ou par semaine : on joue quand on peut. C'est le mode qui
 * convient le mieux à un cercle d'amis qui ne sont jamais connectés en même
 * temps.
 *
 * La différence de fond avec le temps réel : **la partie vit en base, pas en
 * mémoire.** Un salon du serveur temps réel disparaît au redémarrage, ce qui
 * n'a aucune importance pour une blitz et serait rédhibitoire ici. On réutilise
 * donc la table des parties, qui sait déjà tout garder — coups, joueurs,
 * cadence, résultat — et dont le statut vaut `playing` par défaut.
 *
 * Aucun socket : à un coup par jour, interroger le serveur en ouvrant la page
 * suffit largement, et c'est une pièce de moins à maintenir.
 */

import { Chess } from 'chess.js'
import { and, desc, eq, or, sql } from 'drizzle-orm'
import { getDb } from './index.ts'
import { games, users } from './schema.ts'

/** Une partie par correspondance, telle qu'on l'affiche. */
export interface CorrespondenceGame {
  id: string
  slug: string
  fen: string
  moves: string[]
  /** Mon camp dans cette partie. */
  colour: 'w' | 'b'
  /** Est-ce à moi de jouer ? */
  yourTurn: boolean
  opponent: string
  status: string
  result: string
  /** Date du dernier coup, pour savoir depuis quand l'autre réfléchit. */
  lastMoveAt: Date
  /** Délai accordé par coup, en jours. */
  daysPerMove: number
  /** Instant où l'on perdra faute d'avoir joué, `null` si la partie est finie. */
  deadline: Date | null
}

const ALPHABET = 'bcdfghjkmnpqrstvwxyz23456789'

function makeSlug(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return [...bytes].map((byte) => ALPHABET[byte % ALPHABET.length]).join('')
}

/**
 * Le délai est rangé dans `initialTime`, en secondes.
 *
 * Détourner un champ existant plutôt que d'en ajouter un : la cadence d'une
 * correspondance *est* un temps, simplement compté en jours. `increment` reste
 * à zéro, ce qui suffit à reconnaître ce mode.
 */
const DAY_SECONDS = 24 * 3600

function toGame(
  row: typeof games.$inferSelect,
  userId: string,
  opponent: string,
): CorrespondenceGame {
  const board = new Chess()
  const moves = row.moves ? row.moves.split(' ').filter(Boolean) : []
  for (const san of moves) {
    try {
      board.move(san)
    } catch {
      break
    }
  }

  const colour = row.whiteId === userId ? 'w' : 'b'
  const finished = row.result !== '*'
  const days = Math.max(1, Math.round(row.initialTime / DAY_SECONDS))
  const lastMoveAt = row.startedAt ?? row.createdAt

  return {
    id: row.id,
    slug: row.slug,
    fen: board.fen(),
    moves,
    colour,
    yourTurn: !finished && board.turn() === colour,
    opponent,
    status: row.status,
    result: row.result,
    lastMoveAt,
    daysPerMove: days,
    deadline: finished ? null : new Date(lastMoveAt.getTime() + days * DAY_SECONDS * 1000),
  }
}

/** Mes parties par correspondance, celles où c'est à moi d'abord. */
export async function listCorrespondence(userId: string): Promise<CorrespondenceGame[]> {
  const db = getDb()
  const rows = await db
    .select({
      game: games,
      whiteName: sql<string>`(select username from ${users} where id = ${games.whiteId})`,
      blackName: sql<string>`(select username from ${users} where id = ${games.blackId})`,
    })
    .from(games)
    .where(
      and(
        eq(games.mode, 'correspondence'),
        or(eq(games.whiteId, userId), eq(games.blackId, userId)),
      ),
    )
    .orderBy(desc(games.startedAt))

  return rows
    .map(({ game, whiteName, blackName }) =>
      toGame(game, userId, game.whiteId === userId ? blackName : whiteName),
    )
    .sort((a, b) => {
      // À toi de jouer d'abord, puis les parties en cours, puis les finies.
      const rank = (g: CorrespondenceGame) => (g.result !== '*' ? 2 : g.yourTurn ? 0 : 1)
      return rank(a) - rank(b) || b.lastMoveAt.getTime() - a.lastMoveAt.getTime()
    })
}

/** Une partie précise, si elle appartient bien au demandeur. */
export async function getCorrespondence(
  userId: string,
  slug: string,
): Promise<CorrespondenceGame | null> {
  const db = getDb()
  const [row] = await db
    .select({
      game: games,
      whiteName: sql<string>`(select username from ${users} where id = ${games.whiteId})`,
      blackName: sql<string>`(select username from ${users} where id = ${games.blackId})`,
    })
    .from(games)
    .where(
      and(
        eq(games.slug, slug),
        eq(games.mode, 'correspondence'),
        or(eq(games.whiteId, userId), eq(games.blackId, userId)),
      ),
    )
    .limit(1)

  if (!row) return null
  return toGame(
    row.game,
    userId,
    row.game.whiteId === userId ? row.blackName : row.whiteName,
  )
}

/**
 * Ouvre une partie contre quelqu'un.
 *
 * Les couleurs sont tirées au sort : laisser choisir donnerait toujours les
 * Blancs à celui qui propose, ce qui est un avantage réel.
 */
export async function startCorrespondence(options: {
  fromId: string
  fromName: string
  toId: string
  toName: string
  daysPerMove: number
}): Promise<string | null> {
  const db = getDb()
  const fromIsWhite = crypto.getRandomValues(new Uint8Array(1))[0]! % 2 === 0
  const days = Math.min(14, Math.max(1, Math.round(options.daysPerMove)))
  const now = new Date()

  const [row] = await db
    .insert(games)
    .values({
      slug: makeSlug(),
      mode: 'correspondence',
      speed: 'correspondence',
      rated: false,
      whiteId: fromIsWhite ? options.fromId : options.toId,
      blackId: fromIsWhite ? options.toId : options.fromId,
      whiteName: fromIsWhite ? options.fromName : options.toName,
      blackName: fromIsWhite ? options.toName : options.fromName,
      initialTime: days * DAY_SECONDS,
      increment: 0,
      status: 'playing',
      result: '*',
      startedAt: now,
    })
    .returning({ slug: games.slug })

  return row?.slug ?? null
}

export type PlayResult =
  | { ok: true; game: CorrespondenceGame }
  | { ok: false; reason: 'unknown' | 'notYourTurn' | 'illegal' | 'finished' }

/**
 * Joue un coup.
 *
 * La position est **reconstruite depuis les coups enregistrés** plutôt que
 * prise dans une FEN transmise : c'est ce qui empêche un client de proposer
 * une position de son choix. Le coup est validé contre cette position-là.
 */
export async function playCorrespondence(
  userId: string,
  slug: string,
  move: { from: string; to: string; promotion?: string },
): Promise<PlayResult> {
  const db = getDb()
  const [row] = await db
    .select()
    .from(games)
    .where(
      and(
        eq(games.slug, slug),
        eq(games.mode, 'correspondence'),
        or(eq(games.whiteId, userId), eq(games.blackId, userId)),
      ),
    )
    .limit(1)

  if (!row) return { ok: false, reason: 'unknown' }
  if (row.result !== '*') return { ok: false, reason: 'finished' }

  const board = new Chess()
  const moves = row.moves ? row.moves.split(' ').filter(Boolean) : []
  for (const san of moves) board.move(san)

  const colour = row.whiteId === userId ? 'w' : 'b'
  if (board.turn() !== colour) return { ok: false, reason: 'notYourTurn' }

  let played
  try {
    played = board.move({
      from: move.from as never,
      to: move.to as never,
      promotion: (move.promotion ?? 'q') as never,
    })
  } catch {
    return { ok: false, reason: 'illegal' }
  }

  const next = [...moves, played.san]
  const over = board.isGameOver()
  const winner = board.isCheckmate() ? colour : null
  const result = !over ? '*' : winner === 'w' ? '1-0' : winner === 'b' ? '0-1' : '1/2-1/2'
  const status = !over
    ? 'playing'
    : board.isCheckmate()
      ? 'checkmate'
      : board.isStalemate()
        ? 'stalemate'
        : 'draw'

  const now = new Date()
  await db
    .update(games)
    .set({
      moves: next.join(' '),
      status,
      result,
      winner,
      // `startedAt` sert ici de date du dernier coup : c'est elle qui fixe le
      // délai de l'adversaire, et une correspondance n'a pas d'autre horloge.
      startedAt: now,
      endedAt: over ? now : null,
      pgn: over ? board.pgn() : null,
    })
    .where(eq(games.id, row.id))

  const updated = await getCorrespondence(userId, slug)
  return updated ? { ok: true, game: updated } : { ok: false, reason: 'unknown' }
}

/** Abandonner : le seul moyen de sortir d'une partie qui traîne. */
export async function resignCorrespondence(userId: string, slug: string): Promise<boolean> {
  const db = getDb()
  const [row] = await db
    .select({ id: games.id, whiteId: games.whiteId, result: games.result })
    .from(games)
    .where(
      and(
        eq(games.slug, slug),
        eq(games.mode, 'correspondence'),
        or(eq(games.whiteId, userId), eq(games.blackId, userId)),
      ),
    )
    .limit(1)

  if (!row || row.result !== '*') return false
  const iAmWhite = row.whiteId === userId

  await db
    .update(games)
    .set({
      status: 'resigned',
      result: iAmWhite ? '0-1' : '1-0',
      winner: iAmWhite ? 'b' : 'w',
      endedAt: new Date(),
    })
    .where(eq(games.id, row.id))
  return true
}
