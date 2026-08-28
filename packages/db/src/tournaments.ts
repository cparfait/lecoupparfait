/**
 * Tournois — arènes.
 *
 * Format unique, et c'est délibéré : l'arène est le seul qui tolère qu'on
 * arrive en retard ou qu'on parte avant la fin. Un tournoi à rondes fixes
 * suppose que tout le monde soit là à l'heure dite, ce qui ne correspond pas à
 * un cercle d'amis.
 *
 * Le déroulement tient en quatre gestes, appelés par une boucle qui vit dans
 * le serveur temps réel — seul endroit qui sache quand une partie se termine :
 *
 *   1. `startDueTournaments`  démarrer ceux dont l'heure est venue
 *   2. `pairWaiting`          apparier les joueurs libres
 *   3. `recordResult`         attribuer les points d'une partie finie
 *   4. `finishExpired`        clore ceux dont la durée est écoulée
 *
 * **Un seul processus doit appeler ces fonctions.** Deux instances créeraient
 * deux fois les mêmes paires. Si l'on passe un jour à plusieurs instances, il
 * faudra un verrou consultatif PostgreSQL autour de `pairWaiting`.
 */

import { and, asc, desc, eq, ne, sql } from 'drizzle-orm'
import { getDb } from './index.ts'
import { tournamentPairings, tournamentPlayers, tournaments } from './schema.ts'

export interface Tournament {
  id: string
  slug: string
  name: string
  initialTime: number
  increment: number
  durationMinutes: number
  startsAt: Date
  status: string
  /** Fin prévue, calculée : `null` tant que le tournoi n'a pas commencé. */
  endsAt: Date | null
  players: number
}

export interface Standing {
  userId: string
  username: string
  rating: number
  score: number
  games: number
  streak: number
  active: boolean
  playing: boolean
}

const ALPHABET = 'bcdfghjkmnpqrstvwxyz23456789'

function makeSlug(length = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return [...bytes].map((byte) => ALPHABET[byte % ALPHABET.length]).join('')
}

/**
 * Points d'une partie.
 *
 * Deux pour une victoire, un pour une nulle. À partir de la deuxième victoire
 * consécutive, les points doublent : c'est ce qui empêche celui qui mène de
 * jouer petit bras pour conserver son avance, et ce qui rend une arène
 * rattrapable jusqu'à la fin.
 */
function pointsFor(outcome: 'win' | 'draw' | 'loss', streakBefore: number): number {
  if (outcome === 'loss') return 0
  const base = outcome === 'win' ? 2 : 1
  return streakBefore >= 2 ? base * 2 : base
}

function endOf(row: typeof tournaments.$inferSelect): Date | null {
  if (row.status === 'scheduled') return null
  return new Date(row.startsAt.getTime() + row.durationMinutes * 60_000)
}

// ─────────────────────────────────────────────────────────────────────────────
//  Lecture
// ─────────────────────────────────────────────────────────────────────────────

export async function listTournaments(): Promise<Tournament[]> {
  const db = getDb()
  const rows = await db
    .select({
      t: tournaments,
      players: sql<number>`(select count(*) from ${tournamentPlayers} where ${tournamentPlayers.tournamentId} = ${tournaments.id})`,
    })
    .from(tournaments)
    .orderBy(
      // À venir et en cours d'abord, terminés ensuite.
      sql`case ${tournaments.status} when 'running' then 0 when 'scheduled' then 1 else 2 end`,
      asc(tournaments.startsAt),
    )
    .limit(40)

  return rows.map(({ t, players }) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    initialTime: t.initialTime,
    increment: t.increment,
    durationMinutes: t.durationMinutes,
    startsAt: t.startsAt,
    status: t.status,
    endsAt: endOf(t),
    players: Number(players),
  }))
}

export async function getTournament(
  slug: string,
): Promise<{ tournament: Tournament; standings: Standing[] } | null> {
  const db = getDb()
  const [row] = await db.select().from(tournaments).where(eq(tournaments.slug, slug)).limit(1)
  if (!row) return null

  const players = await db
    .select()
    .from(tournamentPlayers)
    .where(eq(tournamentPlayers.tournamentId, row.id))
    .orderBy(desc(tournamentPlayers.score), desc(tournamentPlayers.games))

  return {
    tournament: {
      id: row.id,
      slug: row.slug,
      name: row.name,
      initialTime: row.initialTime,
      increment: row.increment,
      durationMinutes: row.durationMinutes,
      startsAt: row.startsAt,
      status: row.status,
      endsAt: endOf(row),
      players: players.length,
    },
    standings: players.map((p) => ({
      userId: p.userId,
      username: p.username,
      rating: p.rating,
      score: p.score,
      games: p.games,
      streak: p.streak,
      active: p.active,
      playing: p.playing,
    })),
  }
}

/** La partie en cours d'un joueur, s'il en a une. C'est elle qui l'y emmène. */
export async function currentPairing(
  tournamentId: string,
  userId: string,
): Promise<string | null> {
  const db = getDb()
  const [row] = await db
    .select({ slug: tournamentPairings.gameSlug })
    .from(tournamentPairings)
    .where(
      and(
        eq(tournamentPairings.tournamentId, tournamentId),
        eq(tournamentPairings.result, '*'),
        sql`(${tournamentPairings.whiteId} = ${userId} or ${tournamentPairings.blackId} = ${userId})`,
      ),
    )
    .orderBy(desc(tournamentPairings.createdAt))
    .limit(1)
  return row?.slug ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
//  Écriture
// ─────────────────────────────────────────────────────────────────────────────

export async function createTournament(options: {
  ownerId: string
  name: string
  initialTime: number
  increment: number
  durationMinutes: number
  startsAt: Date
}): Promise<string | null> {
  const db = getDb()
  const [row] = await db
    .insert(tournaments)
    .values({
      slug: makeSlug(),
      name: options.name.trim().slice(0, 80) || 'Arène',
      ownerId: options.ownerId,
      initialTime: Math.min(600, Math.max(60, options.initialTime)),
      increment: Math.min(10, Math.max(0, options.increment)),
      durationMinutes: Math.min(180, Math.max(10, options.durationMinutes)),
      startsAt: options.startsAt,
    })
    .returning({ slug: tournaments.slug })
  return row?.slug ?? null
}

/**
 * S'inscrire, ou revenir après une pause.
 *
 * Revenir ne réinitialise rien : on retrouve ses points. C'est tout l'intérêt
 * d'une arène — on peut aller dîner et reprendre.
 */
export async function joinTournament(
  slug: string,
  player: { userId: string; username: string; rating: number },
): Promise<boolean> {
  const db = getDb()
  const [row] = await db
    .select({ id: tournaments.id, status: tournaments.status })
    .from(tournaments)
    .where(eq(tournaments.slug, slug))
    .limit(1)

  if (!row || row.status === 'finished') return false

  await db
    .insert(tournamentPlayers)
    .values({
      tournamentId: row.id,
      userId: player.userId,
      username: player.username,
      rating: player.rating,
    })
    .onConflictDoUpdate({
      target: [tournamentPlayers.tournamentId, tournamentPlayers.userId],
      set: { active: true, username: player.username },
    })
  return true
}

/** Faire une pause : on ne sera plus apparié, mais on garde ses points. */
export async function leaveTournament(slug: string, userId: string): Promise<boolean> {
  const db = getDb()
  const [row] = await db
    .select({ id: tournaments.id })
    .from(tournaments)
    .where(eq(tournaments.slug, slug))
    .limit(1)
  if (!row) return false

  await db
    .update(tournamentPlayers)
    .set({ active: false })
    .where(
      and(
        eq(tournamentPlayers.tournamentId, row.id),
        eq(tournamentPlayers.userId, userId),
      ),
    )
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
//  La boucle
// ─────────────────────────────────────────────────────────────────────────────

/** Démarre les arènes dont l'heure est venue. Renvoie celles qui ont démarré. */
export async function startDueTournaments(): Promise<string[]> {
  const db = getDb()
  const started = await db
    .update(tournaments)
    .set({ status: 'running' })
    .where(and(eq(tournaments.status, 'scheduled'), sql`${tournaments.startsAt} <= now()`))
    .returning({ slug: tournaments.slug })
  return started.map((row) => row.slug)
}

/** Clôt celles dont la durée est écoulée. */
export async function finishExpired(): Promise<string[]> {
  const db = getDb()
  const done = await db
    .update(tournaments)
    .set({ status: 'finished' })
    .where(
      and(
        eq(tournaments.status, 'running'),
        sql`${tournaments.startsAt} + (${tournaments.durationMinutes} * interval '1 minute') <= now()`,
      ),
    )
    .returning({ slug: tournaments.slug })
  return done.map((row) => row.slug)
}

export interface NewPairing {
  tournamentSlug: string
  gameSlug: string
  whiteId: string
  blackId: string
  initialTime: number
  increment: number
}

/**
 * Apparie les joueurs disponibles de toutes les arènes en cours.
 *
 * L'appariement est un simple tri par classement : on associe les voisins deux
 * à deux. Un algorithme suisse n'aurait aucun sens ici, où l'on est réapparié
 * toutes les trois minutes et où l'équilibre se fait sur la durée.
 *
 * Deux joueurs qui viennent de s'affronter ne sont pas remis ensemble : sans
 * cela, deux joueurs seuls en file rejoueraient l'un contre l'autre en boucle.
 */
export async function pairWaiting(): Promise<NewPairing[]> {
  const db = getDb()
  const running = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.status, 'running'))

  const created: NewPairing[] = []

  for (const arena of running) {
    const waiting = await db
      .select()
      .from(tournamentPlayers)
      .where(
        and(
          eq(tournamentPlayers.tournamentId, arena.id),
          eq(tournamentPlayers.active, true),
          eq(tournamentPlayers.playing, false),
        ),
      )
      .orderBy(desc(tournamentPlayers.score), desc(tournamentPlayers.rating))

    if (waiting.length < 2) continue

    // Les derniers adversaires de chacun, pour ne pas les remettre ensemble.
    const recent = await db
      .select({
        white: tournamentPairings.whiteId,
        black: tournamentPairings.blackId,
      })
      .from(tournamentPairings)
      .where(eq(tournamentPairings.tournamentId, arena.id))
      .orderBy(desc(tournamentPairings.createdAt))
      .limit(waiting.length)

    const justPlayed = new Set(recent.map((r) => `${r.white}|${r.black}`))
    const paired = (a: string, b: string) =>
      justPlayed.has(`${a}|${b}`) || justPlayed.has(`${b}|${a}`)

    const pool = [...waiting]
    while (pool.length >= 2) {
      const first = pool.shift()!
      // Le voisin le plus proche au classement qu'on n'a pas déjà affronté ;
      // à défaut, le voisin immédiat — mieux vaut un doublon qu'une attente.
      let index = pool.findIndex((other) => !paired(first.userId, other.userId))
      if (index < 0) index = 0
      const second = pool.splice(index, 1)[0]!

      // Les couleurs alternent avec le nombre de parties déjà jouées : sur une
      // arène entière, chacun a à peu près autant de Blancs que de Noirs.
      const firstIsWhite = (first.games + second.games) % 2 === 0
      const gameSlug = makeSlug()

      await db.insert(tournamentPairings).values({
        tournamentId: arena.id,
        whiteId: firstIsWhite ? first.userId : second.userId,
        blackId: firstIsWhite ? second.userId : first.userId,
        gameSlug,
      })

      await db
        .update(tournamentPlayers)
        .set({ playing: true })
        .where(
          and(
            eq(tournamentPlayers.tournamentId, arena.id),
            sql`${tournamentPlayers.userId} in (${first.userId}, ${second.userId})`,
          ),
        )

      created.push({
        tournamentSlug: arena.slug,
        gameSlug,
        whiteId: firstIsWhite ? first.userId : second.userId,
        blackId: firstIsWhite ? second.userId : first.userId,
        initialTime: arena.initialTime,
        increment: arena.increment,
      })
    }
  }

  return created
}

/**
 * Enregistre le résultat d'une partie de tournoi, et rend les deux joueurs
 * disponibles.
 *
 * Sans effet si le salon n'appartient à aucun tournoi, ce qui est le cas de la
 * plupart des parties : la boucle appelle cette fonction pour toutes.
 */
export async function recordResult(gameSlug: string, result: string): Promise<boolean> {
  const db = getDb()
  const [pairing] = await db
    .select()
    .from(tournamentPairings)
    .where(
      and(eq(tournamentPairings.gameSlug, gameSlug), eq(tournamentPairings.result, '*')),
    )
    .limit(1)

  if (!pairing) return false

  await db
    .update(tournamentPairings)
    .set({ result })
    .where(eq(tournamentPairings.id, pairing.id))

  const outcomes: Array<{ userId: string; outcome: 'win' | 'draw' | 'loss' }> = [
    {
      userId: pairing.whiteId,
      outcome: result === '1-0' ? 'win' : result === '0-1' ? 'loss' : 'draw',
    },
    {
      userId: pairing.blackId,
      outcome: result === '0-1' ? 'win' : result === '1-0' ? 'loss' : 'draw',
    },
  ]

  for (const { userId, outcome } of outcomes) {
    const [player] = await db
      .select({ streak: tournamentPlayers.streak, score: tournamentPlayers.score })
      .from(tournamentPlayers)
      .where(
        and(
          eq(tournamentPlayers.tournamentId, pairing.tournamentId),
          eq(tournamentPlayers.userId, userId),
        ),
      )
      .limit(1)

    if (!player) continue
    const gained = pointsFor(outcome, player.streak)

    await db
      .update(tournamentPlayers)
      .set({
        score: player.score + gained,
        streak: outcome === 'win' ? player.streak + 1 : 0,
        games: sql`${tournamentPlayers.games} + 1`,
        playing: false,
      })
      .where(
        and(
          eq(tournamentPlayers.tournamentId, pairing.tournamentId),
          eq(tournamentPlayers.userId, userId),
        ),
      )
  }

  return true
}

/**
 * Libère les joueurs restés « en partie » alors que leur partie a disparu.
 *
 * Un salon perdu au redémarrage du serveur laisserait ses deux joueurs bloqués
 * jusqu'à la fin du tournoi. On considère qu'au-delà d'un délai généreux —
 * bien plus que la durée d'une partie à cette cadence — la partie n'existe
 * plus.
 */
export async function releaseStuck(maxAgeMs: number): Promise<number> {
  const db = getDb()
  const stale = new Date(Date.now() - maxAgeMs)

  const abandoned = await db
    .update(tournamentPairings)
    .set({ result: 'void' })
    .where(and(eq(tournamentPairings.result, '*'), sql`${tournamentPairings.createdAt} < ${stale}`))
    .returning({ tournamentId: tournamentPairings.tournamentId, white: tournamentPairings.whiteId, black: tournamentPairings.blackId })

  for (const row of abandoned) {
    await db
      .update(tournamentPlayers)
      .set({ playing: false })
      .where(
        and(
          eq(tournamentPlayers.tournamentId, row.tournamentId),
          sql`${tournamentPlayers.userId} in (${row.white}, ${row.black})`,
        ),
      )
  }

  return abandoned.length
}

/** Les arènes en cours, pour savoir s'il y a lieu de faire tourner la boucle. */
export async function hasRunning(): Promise<boolean> {
  const db = getDb()
  const [row] = await db
    .select({ id: tournaments.id })
    .from(tournaments)
    .where(ne(tournaments.status, 'finished'))
    .limit(1)
  return row != null
}
