/**
 * Schéma de la base de données.
 *
 * Principes retenus :
 *
 *  - **Jouer sans compte reste possible.** Les tables acceptent donc partout
 *    des joueurs anonymes (`userId` nullable, pseudo libre). Un compte n'ajoute
 *    que la persistance et le classement.
 *  - **Une partie est immuable une fois terminée.** On stocke le PGN complet
 *    plutôt que des coups éparpillés : c'est le format d'échange universel, ça
 *    rejoue tout seul, et ça survivra au schéma.
 *  - **Le classement est historisé.** Chaque partie classée écrit une ligne
 *    dans `ratingHistory` : on peut ainsi tracer la courbe de progression, qui
 *    est le premier motif de fierté d'un joueur.
 *  - **Aucune donnée personnelle superflue.** Pas de nom, pas d'adresse, pas de
 *    traqueur. L'e-mail est facultatif et ne sert qu'à la réinitialisation du
 *    mot de passe.
 */

import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

// ─────────────────────────────────────────────────────────────────────────────
//  Comptes
// ─────────────────────────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Pseudo affiché, tel que saisi. */
    username: varchar('username', { length: 20 }).notNull(),
    /** Pseudo normalisé en minuscules : c'est lui qui garantit l'unicité. */
    usernameLower: varchar('username_lower', { length: 20 }).notNull(),
    /** Facultatif : sert uniquement à retrouver un mot de passe perdu. */
    email: varchar('email', { length: 254 }),
    /** Empreinte scrypt du mot de passe. Jamais le mot de passe lui-même. */
    passwordHash: text('password_hash').notNull(),

    /** Emoji ou URL. On n'héberge pas d'images d'utilisateurs. */
    avatar: varchar('avatar', { length: 200 }).default('♟️'),
    bio: varchar('bio', { length: 280 }),
    countryCode: varchar('country_code', { length: 2 }),

    /** Préférences synchronisées entre appareils. */
    preferences: jsonb('preferences').$type<Record<string, unknown>>().default({}),

    /** Rôle : `player` ou `admin`. Un seul administrateur suffit ici. */
    role: varchar('role', { length: 16 }).notNull().default('player'),
    /** Un compte désactivé ne peut plus se connecter mais ses parties restent. */
    disabled: boolean('disabled').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('users_username_lower_idx').on(table.usernameLower),
    uniqueIndex('users_email_idx')
      .on(table.email)
      .where(sql`${table.email} is not null`),
    index('users_last_seen_idx').on(table.lastSeenAt),
  ],
)

/**
 * Sessions.
 *
 * On stocke l'empreinte du jeton, pas le jeton : une fuite de la base ne permet
 * donc pas d'usurper une session. La date d'expiration est vérifiée à chaque
 * requête, et une session peut être révoquée sans toucher au mot de passe.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    /** Agent utilisateur tronqué, pour que l'utilisateur reconnaisse l'appareil. */
    userAgent: varchar('user_agent', { length: 200 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('sessions_token_idx').on(table.tokenHash),
    index('sessions_user_idx').on(table.userId),
    index('sessions_expiry_idx').on(table.expiresAt),
  ],
)

// ─────────────────────────────────────────────────────────────────────────────
//  Classements
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Un classement par cadence.
 *
 * Un joueur peut être excellent en classique et médiocre en bullet : mélanger
 * les deux produirait un nombre qui ne veut rien dire. On suit donc chaque
 * catégorie séparément, plus une catégorie « puzzle ».
 */
export const ratings = pgTable(
  'ratings',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** `bullet`, `blitz`, `rapid`, `classical`, `correspondence`, `puzzle`. */
    category: varchar('category', { length: 20 }).notNull(),

    /** Classement Glicko-2, celui qui fait foi. */
    rating: integer('rating').notNull().default(1500),
    /** Écart-type : l'incertitude sur le niveau réel. */
    deviation: integer('deviation').notNull().default(350),
    /** Volatilité σ de Glicko-2. */
    volatility: real('volatility').notNull().default(0.09),

    /** Elo classique, calculé en parallèle et affiché à titre pédagogique. */
    elo: integer('elo').notNull().default(1500),

    games: integer('games').notNull().default(0),
    wins: integer('wins').notNull().default(0),
    losses: integer('losses').notNull().default(0),
    draws: integer('draws').notNull().default(0),

    /** Plus haut classement atteint, et quand. */
    peak: integer('peak').notNull().default(1500),
    peakAt: timestamp('peak_at', { withTimezone: true }),

    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.category] }),
    index('ratings_leaderboard_idx').on(table.category, table.rating),
  ],
)

/** Une ligne par variation de classement : c'est la courbe de progression. */
export const ratingHistory = pgTable(
  'rating_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    category: varchar('category', { length: 20 }).notNull(),
    rating: integer('rating').notNull(),
    deviation: integer('deviation').notNull(),
    delta: integer('delta').notNull(),
    gameId: uuid('game_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('rating_history_user_idx').on(table.userId, table.category, table.createdAt)],
)

// ─────────────────────────────────────────────────────────────────────────────
//  Parties
// ─────────────────────────────────────────────────────────────────────────────

export const games = pgTable(
  'games',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Identifiant court partagé dans les URL, ex. `k3Jd9x`. */
    slug: varchar('slug', { length: 12 }).notNull(),

    /** `computer`, `friend`, `local`, `puzzle`, `lesson`. */
    mode: varchar('mode', { length: 16 }).notNull(),
    /** Catégorie de cadence, pour le classement. */
    speed: varchar('speed', { length: 20 }).notNull().default('rapid'),
    rated: boolean('rated').notNull().default(false),

    /** Joueurs. `null` = anonyme ou ordinateur. */
    whiteId: uuid('white_id').references(() => users.id, { onDelete: 'set null' }),
    blackId: uuid('black_id').references(() => users.id, { onDelete: 'set null' }),
    /** Noms figés au moment de la partie : un pseudo peut changer ensuite. */
    whiteName: varchar('white_name', { length: 40 }).notNull(),
    blackName: varchar('black_name', { length: 40 }).notNull(),
    whiteRating: integer('white_rating'),
    blackRating: integer('black_rating'),
    whiteRatingDelta: integer('white_rating_delta'),
    blackRatingDelta: integer('black_rating_delta'),
    /** Niveau du bot, si l'adversaire est l'ordinateur. */
    botLevel: smallint('bot_level'),

    /** Cadence, en secondes. */
    initialTime: integer('initial_time').notNull().default(0),
    increment: integer('increment').notNull().default(0),

    /** Position de départ ; différente en Chess960 ou en partie thématique. */
    startFen: text('start_fen'),
    /** Coups en notation algébrique, séparés par des espaces. */
    moves: text('moves').notNull().default(''),
    /** Partie complète au format PGN, écrite à la fin. */
    pgn: text('pgn'),
    /** Temps de réflexion de chaque demi-coup, en centisecondes. */
    clockHistory: jsonb('clock_history').$type<number[]>(),

    status: varchar('status', { length: 24 }).notNull().default('playing'),
    result: varchar('result', { length: 8 }).notNull().default('*'),
    /** Camp qui a gagné : `w`, `b`, ou `null` pour une nulle. */
    winner: varchar('winner', { length: 1 }),

    /** Ouverture identifiée, figée pour permettre la recherche. */
    eco: varchar('eco', { length: 3 }),
    opening: varchar('opening', { length: 120 }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('games_slug_idx').on(table.slug),
    index('games_white_idx').on(table.whiteId, table.createdAt),
    index('games_black_idx').on(table.blackId, table.createdAt),
    index('games_eco_idx').on(table.eco),
    index('games_created_idx').on(table.createdAt),
  ],
)

/**
 * Rapport d'analyse d'une partie.
 *
 * Séparé de `games` parce qu'il est volumineux et facultatif : la plupart des
 * parties ne seront jamais analysées, et charger la liste des parties d'un
 * joueur ne doit pas traîner des mégaoctets d'évaluations.
 */
export const gameAnalyses = pgTable(
  'game_analyses',
  {
    gameId: uuid('game_id')
      .primaryKey()
      .references(() => games.id, { onDelete: 'cascade' }),
    /** Profondeur atteinte par le moteur. */
    depth: smallint('depth').notNull(),
    /** Rapport complet sérialisé (coups analysés, motifs, explications). */
    report: jsonb('report').$type<Record<string, unknown>>().notNull(),
    accuracyWhite: real('accuracy_white'),
    accuracyBlack: real('accuracy_black'),
    acplWhite: integer('acpl_white'),
    acplBlack: integer('acpl_black'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
)

// ─────────────────────────────────────────────────────────────────────────────
//  Puzzles
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base de puzzles, importée depuis le jeu de données libre de Lichess (CC0).
 *
 * Une entrée = une position et la suite gagnante. Le premier coup de `moves`
 * est joué automatiquement (c'est le coup de l'adversaire qui crée le motif),
 * puis le joueur doit trouver les suivants.
 */
export const puzzles = pgTable(
  'puzzles',
  {
    /** Identifiant Lichess, conservé pour pouvoir recouper la source. */
    id: varchar('id', { length: 12 }).primaryKey(),
    fen: text('fen').notNull(),
    /** Suite de coups en UCI, séparés par des espaces. */
    moves: text('moves').notNull(),
    rating: integer('rating').notNull(),
    ratingDeviation: integer('rating_deviation').notNull().default(75),
    popularity: smallint('popularity').notNull().default(0),
    plays: integer('plays').notNull().default(0),
    /** Thèmes tactiques, ex. `fork`, `pin`, `mateIn2`. */
    themes: text('themes').array().notNull().default(sql`'{}'::text[]`),
    /** Ouverture d'où provient la position, si connue. */
    openingTags: text('opening_tags').array(),
    gameUrl: text('game_url'),
  },
  (table) => [
    index('puzzles_rating_idx').on(table.rating),
    index('puzzles_themes_idx').using('gin', table.themes),
    index('puzzles_popularity_idx').on(table.popularity),
  ],
)

/** Historique des puzzles tentés, pour ne pas les reproposer et suivre le niveau. */
export const puzzleAttempts = pgTable(
  'puzzle_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    puzzleId: varchar('puzzle_id', { length: 12 })
      .notNull()
      .references(() => puzzles.id, { onDelete: 'cascade' }),
    solved: boolean('solved').notNull(),
    /** Nombre de coups justes avant la première erreur. */
    correctMoves: smallint('correct_moves').notNull().default(0),
    /** Temps mis à résoudre, en millisecondes. */
    timeMs: integer('time_ms'),
    /** Classement du joueur après cette tentative. */
    ratingAfter: integer('rating_after'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('puzzle_attempts_user_idx').on(table.userId, table.createdAt),
    uniqueIndex('puzzle_attempts_unique_idx').on(table.userId, table.puzzleId),
  ],
)

// ─────────────────────────────────────────────────────────────────────────────
//  Apprentissage
// ─────────────────────────────────────────────────────────────────────────────

/** Progression dans les leçons. Les leçons elles-mêmes sont dans le code. */
export const lessonProgress = pgTable(
  'lesson_progress',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    lessonId: varchar('lesson_id', { length: 64 }).notNull(),
    /** Nombre d'étapes réussies. */
    stepsCompleted: smallint('steps_completed').notNull().default(0),
    completed: boolean('completed').notNull().default(false),
    /** Nombre d'essais nécessaires : révèle les points de blocage. */
    attempts: smallint('attempts').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.lessonId] })],
)

// ─────────────────────────────────────────────────────────────────────────────
//  Ouvertures
// ─────────────────────────────────────────────────────────────────────────────

/** Catalogue ECO complet, importé depuis le jeu de données libre (CC0). */
export const openings = pgTable(
  'openings',
  {
    /** Position atteinte, sans les compteurs de coups. */
    epd: text('epd').primaryKey(),
    eco: varchar('eco', { length: 3 }).notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    nameFr: varchar('name_fr', { length: 200 }).notNull(),
    pgn: text('pgn').notNull(),
    uci: text('uci').notNull(),
    ply: smallint('ply').notNull(),
  },
  (table) => [
    index('openings_eco_idx').on(table.eco),
    index('openings_ply_idx').on(table.ply),
  ],
)

/**
 * Cache d'évaluations.
 *
 * Analyser une position coûte du temps processeur ; les mêmes positions
 * reviennent sans arrêt — toutes les parties commencent pareil. On garde donc
 * le résultat, indexé par position et profondeur.
 */
export const evaluations = pgTable(
  'evaluations',
  {
    epd: text('epd').notNull(),
    depth: smallint('depth').notNull(),
    /** Score en centipions, côté Blancs. */
    cp: integer('cp'),
    /** Nombre de coups avant mat, côté Blancs. Exclusif avec `cp`. */
    mate: smallint('mate'),
    /** Meilleure suite, en UCI. */
    pv: text('pv').notNull(),
    /** Lignes secondaires, quand l'analyse était en MultiPV. */
    lines: jsonb('lines').$type<Array<Record<string, unknown>>>(),
    nodes: integer('nodes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.epd, table.depth] }),
    index('evaluations_created_idx').on(table.createdAt),
  ],
)

// ─────────────────────────────────────────────────────────────────────────────
//  Défis entre amis
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Un défi en attente d'adversaire.
 *
 * C'est ce que représente le lien qu'on envoie à un ami : tant que personne ne
 * l'a ouvert, la partie n'existe pas encore.
 */
export const challenges = pgTable(
  'challenges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 12 }).notNull(),
    creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }),
    creatorName: varchar('creator_name', { length: 40 }).notNull(),
    /** Couleur souhaitée par le créateur : `w`, `b` ou `random`. */
    creatorColor: varchar('creator_color', { length: 6 }).notNull().default('random'),
    initialTime: integer('initial_time').notNull().default(600),
    increment: integer('increment').notNull().default(5),
    rated: boolean('rated').notNull().default(false),
    /** `open` (lien partageable) ou `direct` (adressé à un joueur précis). */
    kind: varchar('kind', { length: 10 }).notNull().default('open'),
    targetId: uuid('target_id').references(() => users.id, { onDelete: 'cascade' }),
    /** Partie créée quand le défi est accepté. */
    gameId: uuid('game_id').references(() => games.id, { onDelete: 'set null' }),
    status: varchar('status', { length: 12 }).notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('challenges_slug_idx').on(table.slug),
    index('challenges_status_idx').on(table.status, table.expiresAt),
  ],
)

// ─────────────────────────────────────────────────────────────────────────────
//  Relations
// ─────────────────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  ratings: many(ratings),
  ratingHistory: many(ratingHistory),
  puzzleAttempts: many(puzzleAttempts),
  lessonProgress: many(lessonProgress),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}))

export const ratingsRelations = relations(ratings, ({ one }) => ({
  user: one(users, { fields: [ratings.userId], references: [users.id] }),
}))

export const gamesRelations = relations(games, ({ one }) => ({
  white: one(users, { fields: [games.whiteId], references: [users.id] }),
  black: one(users, { fields: [games.blackId], references: [users.id] }),
  analysis: one(gameAnalyses, { fields: [games.id], references: [gameAnalyses.gameId] }),
}))

export const puzzleAttemptsRelations = relations(puzzleAttempts, ({ one }) => ({
  user: one(users, { fields: [puzzleAttempts.userId], references: [users.id] }),
  puzzle: one(puzzles, { fields: [puzzleAttempts.puzzleId], references: [puzzles.id] }),
}))

// ─────────────────────────────────────────────────────────────────────────────
//  Types inférés
// ─────────────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type Rating = typeof ratings.$inferSelect
export type Game = typeof games.$inferSelect
export type NewGame = typeof games.$inferInsert
export type Puzzle = typeof puzzles.$inferSelect
export type PuzzleAttempt = typeof puzzleAttempts.$inferSelect
export type Opening = typeof openings.$inferSelect
export type Challenge = typeof challenges.$inferSelect
export type Evaluation = typeof evaluations.$inferSelect
