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
    /**
     * Quand l'adresse a été confirmée, `null` tant qu'elle ne l'est pas.
     *
     * Une adresse non confirmée ne prouve rien : elle peut être mal tapée, ou
     * appartenir à quelqu'un d'autre. Tant qu'elle n'est pas vérifiée, elle ne
     * doit pas pouvoir servir à reprendre la main sur le compte.
     */
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    /** Empreinte du jeton de confirmation. Jamais le jeton lui-même. */
    emailTokenHash: varchar('email_token_hash', { length: 64 }),
    emailTokenExpiresAt: timestamp('email_token_expires_at', { withTimezone: true }),
    /**
     * Empreinte du jeton de réinitialisation du mot de passe.
     *
     * Séparée de celle de confirmation : les deux demandes peuvent coexister,
     * et un jeton de réinitialisation vit beaucoup moins longtemps.
     */
    resetTokenHash: varchar('reset_token_hash', { length: 64 }),
    resetTokenExpiresAt: timestamp('reset_token_expires_at', { withTimezone: true }),
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

    /**
     * Classement Glicko-2, celui qui fait foi.
     *
     * Le défaut vaut `CLASSEMENT_DEPART` (voir `packages/core/src/rating.ts`,
     * qui explique pourquoi 100 et non le centre de l'échelle). Recopié en
     * clair plutôt qu'importé : ce fichier est relu par drizzle-kit, qui n'a
     * pas à résoudre les paquets de l'espace de travail pour générer une
     * migration. `getRating` écrit de toute façon la valeur explicitement.
     */
    rating: integer('rating').notNull().default(100),
    /** Écart-type : l'incertitude sur le niveau réel. */
    deviation: integer('deviation').notNull().default(350),
    /** Volatilité σ de Glicko-2. */
    volatility: real('volatility').notNull().default(0.09),

    /** Elo classique, calculé en parallèle et affiché à titre pédagogique. */
    elo: integer('elo').notNull().default(100),

    games: integer('games').notNull().default(0),
    wins: integer('wins').notNull().default(0),
    losses: integer('losses').notNull().default(0),
    draws: integer('draws').notNull().default(0),

    /** Plus haut classement atteint, et quand. */
    peak: integer('peak').notNull().default(100),
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
export const gameAnalyses = pgTable('game_analyses', {
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
})

/**
 * Analyses conservées dans un compte.
 *
 * Distincte de `gameAnalyses`, qui ne sait désigner qu'une partie jouée ici :
 * sa clé pointe vers `games`. Or on analyse surtout des parties qui viennent
 * d'ailleurs — chess.com, Lichess, un PGN collé — et ce sont précisément
 * celles qu'on ne veut pas recalculer à chaque visite.
 *
 * **On ne stocke pas le rapport rédigé, mais la sortie du moteur.** Deux
 * raisons, et la seconde compte plus que la première :
 *
 *  1. C'est bien plus petit : les évaluations d'une partie de quarante coups
 *     tiennent dans quelques dizaines de kilo-octets, là où le rapport traîne
 *     toute sa prose française.
 *  2. Le texte est **regénéré à la relecture**, donc par le code du jour. Une
 *     tournure améliorée, une explication corrigée, un motif tactique ajouté :
 *     les analyses déjà enregistrées en profitent. Figer la prose reviendrait à
 *     conserver les défauts d'hier pour toujours.
 *
 * Une seule entrée par partie et par compte — l'empreinte porte sur la
 * position de départ et les coups, pas sur la profondeur. Réanalyser plus
 * profond remplace l'entrée au lieu d'en ajouter une seconde, qui ne serait
 * qu'une version périmée de la même partie.
 */
export const savedAnalyses = pgTable(
  'saved_analyses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Empreinte de `startFen` + coups : identifie la partie, pas l'analyse. */
    fingerprint: varchar('fingerprint', { length: 64 }).notNull(),
    /** Partie jouée ici, quand c'en est une. */
    gameId: uuid('game_id').references(() => games.id, { onDelete: 'set null' }),
    /** Provenance : `local`, `chesscom`, `lichess`, `pgn`. */
    source: varchar('source', { length: 16 }).notNull().default('pgn'),

    whiteName: varchar('white_name', { length: 60 }),
    blackName: varchar('black_name', { length: 60 }),
    /** Résultat tel que le PGN l'écrit : `1-0`, `0-1`, `1/2-1/2`, `*`. */
    result: varchar('result', { length: 8 }).notNull().default('*'),
    playedAt: varchar('played_at', { length: 24 }),
    eco: varchar('eco', { length: 3 }),
    opening: varchar('opening', { length: 120 }),

    /** Camp auquel les explications s'adressaient. */
    lecteur: varchar('lecteur', { length: 1 }),
    depth: smallint('depth').notNull(),
    startFen: text('start_fen'),
    /** Coups en notation algébrique, séparés par des espaces. */
    moves: text('moves').notNull(),
    /** Évaluations position par position — voir `PositionAnalysis`. */
    positions: jsonb('positions').$type<unknown[]>().notNull(),

    /** Recopiées du rapport pour afficher la liste sans ouvrir le JSON. */
    accuracyWhite: real('accuracy_white'),
    accuracyBlack: real('accuracy_black'),

    /**
     * Identifiant public, ou `null` — l'analyse n'est alors partagée avec
     * personne, ce qui est le défaut et le reste.
     *
     * **Le partage est un état, pas une copie.** Retirer le partage remet
     * cette colonne à `null` et le lien cesse aussitôt de fonctionner : c'est
     * la même mécanique que les études, volontairement, plutôt qu'une seconde
     * inventée à côté.
     *
     * Douze caractères tirés au hasard dans un alphabet sans voyelles : un
     * lien qui ne se devine pas, et aucun mot ne s'y forme par accident.
     */
    partage: varchar('partage', { length: 12 }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('saved_analyses_owner_idx').on(table.userId, table.fingerprint),
    index('saved_analyses_recent_idx').on(table.userId, table.updatedAt),
    // Unique : c'est la clé d'accès publique, deux analyses ne peuvent pas la
    // partager. L'index sert aussi à la lecture par lien, qui n'a rien d'autre.
    uniqueIndex('saved_analyses_partage_idx').on(table.partage),
  ],
)

// ─────────────────────────────────────────────────────────────────────────────
//  Évaluations pré-calculées
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Positions déjà évaluées, importées du jeu de données libre de Lichess (CC0).
 *
 * Des centaines de millions de positions y ont été analysées à des profondeurs
 * qu'aucune machine personnelle n'atteindra en direct — souvent quarante à
 * soixante demi-coups, là où notre moteur tourne à dix-huit. Consulter cette
 * table avant de lancer Stockfish rend l'analyse d'une ouverture instantanée
 * **et** plus juste.
 *
 * La clé est l'EPD — la position sans les compteurs de coups — la même que
 * celle du livre d'ouvertures. Deux parties arrivées à la même position par des
 * chemins différents partagent donc son évaluation, ce qui est exactement ce
 * qu'on veut.
 *
 * La table est facultative : sans import, l'analyse fonctionne comme avant.
 */
export const positionEvals = pgTable(
  'position_evals',
  {
    /** Position sans compteurs : « pièces trait roques prise-en-passant ». */
    epd: text('epd').primaryKey(),
    /** Évaluation en centièmes de pion, du point de vue des Blancs. */
    cp: integer('cp'),
    /** Nombre de coups avant le mat, si mat il y a. Signé comme `cp`. */
    mate: smallint('mate'),
    /** Profondeur atteinte par le moteur. */
    depth: smallint('depth').notNull(),
    /** Meilleur coup, en notation UCI. */
    best: text('best'),
    /** Suite principale, en UCI séparés par des espaces. */
    line: text('line'),
    /**
     * Variantes **secondaires**, quand le jeu de données en fournit.
     *
     * La suite principale reste dans `line` : la dupliquer ici coûterait une
     * cinquantaine d'octets sur huit millions de lignes pour ne rien apprendre.
     * Ce champ contient donc la deuxième variante et la troisième, et rien
     * d'autre — `null` pour les positions où Lichess n'en donne qu'une.
     *
     * **Pourquoi cette colonne existe.** Sans elle, cette table ne pouvait
     * répondre qu'aux demandes d'une seule variante. Or l'analyse de partie en
     * demande trois depuis qu'on affiche « ce que tu pouvais jouer » : huit
     * millions de positions analysées à quarante ou soixante demi-coups
     * restaient donc inutilisables là où elles servaient le plus. Le jeu de
     * données les contenait depuis le début ; l'import ne gardait que la
     * première.
     *
     * Environ 35 % des positions en portent trois ou plus, 45 % au moins deux.
     * Le reste garde `null`, et l'analyse repart sur le moteur comme avant.
     */
    altLines: jsonb('alt_lines').$type<Array<{ cp?: number; mate?: number; line: string }>>(),
  },
  (table) => [
    // On interroge toujours par EPD exact, jamais par intervalle : la clé
    // primaire suffit. L'index sur la profondeur sert au ménage, quand on
    // réimporte un jeu de données plus profond par-dessus l'ancien.
    index('position_evals_depth_idx').on(table.depth),
  ],
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
    themes: text('themes')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
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
  (table) => [index('openings_eco_idx').on(table.eco), index('openings_ply_idx').on(table.ply)],
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

/**
 * Progression contre l'ordinateur.
 *
 * Une ligne par joueur, qui dit jusqu'où il est monté. Les vingt-cinq niveaux
 * existaient déjà mais s'offraient tous d'emblée : un débutant choisissait au
 * hasard, tombait sur trop fort, et concluait qu'il était mauvais.
 *
 * On ne garde que le plus haut niveau battu, et le compte des essais. Le reste
 * — quelles parties, quels résultats — est déjà dans la table des parties : le
 * dupliquer ici ne servirait qu'à le désynchroniser.
 */
export const botProgress = pgTable('bot_progress', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  /** Plus haut niveau battu, 0 si aucun. */
  defeated: smallint('defeated').notNull().default(0),
  /** Parties jouées contre l'ordinateur, toutes issues confondues. */
  attempts: integer('attempts').notNull().default(0),
  wins: integer('wins').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Avancement dans le mode carrière.
 *
 * Une ligne par compte, et volontairement **un curseur, pas un journal** : ce
 * qui a été joué vit déjà dans `games`, `puzzle_attempts` et `lesson_progress`.
 * Dupliquer l'historique ici garantirait qu'un jour les deux se contredisent.
 *
 * Les compteurs de récompense — expérience, étoiles, hauts faits — sont en
 * revanche bien stockés, parce qu'ils ne se déduisent d'aucune autre table :
 * ils dépendent de *comment* on a gagné, pas seulement du fait d'avoir gagné.
 */
export const careerProgress = pgTable('career_progress', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),

  /** Chapitre en cours, 1 à 12. 13 signifie carrière terminée. */
  chapter: smallint('chapter').notNull().default(1),
  /** La leçon d'entrée du chapitre courant a été vue. */
  lessonDone: boolean('lesson_done').notNull().default(false),
  /** Puzzles réussis dans le chapitre courant. */
  puzzlesDone: smallint('puzzles_done').notNull().default(0),
  /** Victoires obtenues dans le chapitre courant. */
  winsInChapter: smallint('wins_in_chapter').notNull().default(0),
  /** Défaites d'affilée, pour déclencher le coup de main. */
  losingStreak: smallint('losing_streak').notNull().default(0),
  /** Indices et coups de main utilisés dans le chapitre courant. */
  helpUsed: smallint('help_used').notNull().default(0),

  /**
   * Étoiles par chapitre, une entrée par chapitre terminé.
   *
   * De une à trois. Trois s'obtient sans avoir eu besoin du coup de main ni
   * d'indice ; c'est ce qui donne une raison de refaire un chapitre déjà
   * passé, là où une simple coche n'en donne aucune.
   */
  stars: jsonb('stars').$type<Record<string, number>>().notNull().default({}),

  /** Expérience totale. Sert au rang affiché, jamais au classement. */
  xp: integer('xp').notNull().default(0),

  /**
   * Hauts faits débloqués, par identifiant.
   *
   * En JSON plutôt qu'en table : la liste est courte, elle se lit toujours en
   * entier, et en ajouter un ne doit pas demander de migration.
   */
  badges: jsonb('badges').$type<string[]>().notNull().default([]),

  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Tournois.
 *
 * Format unique : l'arène. C'est le seul qui tolère qu'on arrive en retard ou
 * qu'on parte avant la fin, ce qui est exactement l'usage d'un cercle d'amis —
 * un tournoi à rondes fixes suppose que tout le monde soit présent à l'heure
 * dite, et qu'un absent soit remplacé.
 *
 * Une arène dure un temps donné, pas un nombre de rondes : dès qu'une partie
 * finit, on est réapparié. Le classement se fait aux points, avec un
 * mécanisme de série qui empêche de jouer petit bras une fois en tête.
 */
export const tournaments = pgTable(
  'tournaments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 12 }).notNull(),
    name: varchar('name', { length: 80 }).notNull(),
    ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),
    /** Cadence des parties, en secondes. */
    initialTime: integer('initial_time').notNull().default(180),
    increment: integer('increment').notNull().default(0),
    /** Durée totale de l'arène, en minutes. */
    durationMinutes: integer('duration_minutes').notNull().default(45),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    /** `scheduled`, `running` ou `finished`. */
    status: varchar('status', { length: 12 }).notNull().default('scheduled'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('tournaments_slug_idx').on(table.slug),
    index('tournaments_status_idx').on(table.status, table.startsAt),
  ],
)

/**
 * Un inscrit, et son score.
 *
 * `active` dit s'il est en file d'attente. On ne retire pas sa ligne quand il
 * fait une pause : il perdrait ses points, et le classement final serait faux.
 */
export const tournamentPlayers = pgTable(
  'tournament_players',
  {
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    username: varchar('username', { length: 40 }).notNull(),
    rating: integer('rating').notNull().default(1500),
    score: integer('score').notNull().default(0),
    /** Victoires consécutives : à partir de deux, les points doublent. */
    streak: integer('streak').notNull().default(0),
    games: integer('games').notNull().default(0),
    active: boolean('active').notNull().default(true),
    /** Occupé dans une partie : ne pas réapparier. */
    playing: boolean('playing').notNull().default(false),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.tournamentId, table.userId] }),
    index('tournament_players_rank_idx').on(table.tournamentId, table.score),
  ],
)

/** Une partie du tournoi : le salon est un salon temps réel ordinaire. */
export const tournamentPairings = pgTable(
  'tournament_pairings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    whiteId: uuid('white_id').notNull(),
    blackId: uuid('black_id').notNull(),
    gameSlug: varchar('game_slug', { length: 12 }).notNull(),
    /** `*` tant que la partie court, puis `1-0`, `0-1` ou `1/2-1/2`. */
    result: varchar('result', { length: 8 }).notNull().default('*'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('tournament_pairings_idx').on(table.tournamentId, table.result),
    uniqueIndex('tournament_pairings_slug_idx').on(table.gameSlug),
  ],
)

/**
 * Études.
 *
 * Un classeur : on y range des positions commentées — ses ouvertures, une
 * partie qu'on veut comprendre, un thème de finale. C'est l'outil le plus
 * apprécié de Lichess, et celui qui manquait le plus ici.
 *
 * La visibilité tient en deux états. `private`, visible du seul auteur.
 * `unlisted`, accessible à qui a l'adresse — c'est ce qui permet d'envoyer une
 * étude à quelqu'un sans lui demander de compte, comme pour les parties. Pas
 * de « public » listé : une plateforme pour un cercle d'amis n'a pas besoin
 * d'un annuaire d'études, qui appellerait une modération.
 */
export const studies = pgTable(
  'studies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 12 }).notNull(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 120 }).notNull(),
    description: varchar('description', { length: 500 }),
    /** `private` ou `unlisted`. */
    visibility: varchar('visibility', { length: 10 }).notNull().default('private'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('studies_slug_idx').on(table.slug),
    index('studies_owner_idx').on(table.ownerId, table.updatedAt),
  ],
)

/**
 * Un chapitre : une position de départ, une suite de coups, des commentaires.
 *
 * Les commentaires sont indexés par demi-coup plutôt que rangés dans le PGN :
 * on veut pouvoir en écrire un sans réécrire toute la partie, et les relire
 * sans analyser du texte.
 */
export const studyChapters = pgTable(
  'study_chapters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studyId: uuid('study_id')
      .notNull()
      .references(() => studies.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 120 }).notNull(),
    /** Position de départ ; différente d'une partie normale si l'on part d'un diagramme. */
    startFen: text('start_fen'),
    /** Coups en notation algébrique, séparés par des espaces. */
    moves: text('moves').notNull().default(''),
    /** Commentaires, indexés par numéro de demi-coup. */
    comments: jsonb('comments').$type<Record<string, string>>().notNull().default({}),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('study_chapters_study_idx').on(table.studyId, table.position)],
)

/**
 * Carnet d'adresses.
 *
 * Une seule ligne par relation, orientée du demandeur vers le destinataire :
 * c'est ce qui permet de savoir qui doit répondre. Une amitié acceptée reste
 * dans ce sens-là, mais se lit dans les deux — d'où les deux index.
 *
 * On ne stocke pas de refus : refuser efface la demande, et la personne peut
 * redemander. Garder une trace des refus supposerait de l'afficher un jour, ce
 * qu'on ne veut pas faire.
 */
export const friendships = pgTable(
  'friendships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    addresseeId: uuid('addressee_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** `pending` tant que le destinataire n'a pas répondu, puis `accepted`. */
    status: varchar('status', { length: 10 }).notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
  },
  (table) => [
    // Une seule demande par couple, quel que soit son état.
    uniqueIndex('friendships_pair_idx').on(table.requesterId, table.addresseeId),
    index('friendships_addressee_idx').on(table.addresseeId, table.status),
    index('friendships_requester_idx').on(table.requesterId, table.status),
  ],
)

// ─────────────────────────────────────────────────────────────────────────────
//  Journée
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Avancement quotidien : quêtes du jour et série de jours consécutifs.
 *
 * Le navigateur reste la source de vérité, parce que la plateforme s'utilise
 * sans compte : cette table n'existe que pour retrouver sa série en changeant
 * d'appareil. Les deux états sont fusionnés au chargement, jamais écrasés
 * l'un par l'autre — quelqu'un qui a joué hors ligne ne doit pas perdre sa
 * journée en se connectant.
 *
 * Une ligne par joueur et par jour : on conserve l'historique, ce qui permet
 * de dessiner un calendrier d'assiduité sans table supplémentaire.
 */
export const dailyProgress = pgTable(
  'daily_progress',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Jour concerné, en heure locale du joueur, au format `AAAA-MM-JJ`. */
    day: varchar('day', { length: 10 }).notNull(),
    /**
     * Avancement de chaque quête, par identifiant.
     *
     * En JSON plutôt qu'en colonnes : la liste des quêtes est un choix
     * éditorial qui bougera, et on ne veut pas une migration à chaque fois
     * qu'on en ajoute ou qu'on en retire une.
     */
    quests: jsonb('quests').$type<Record<string, number>>().notNull().default({}),
    xp: smallint('xp').notNull().default(0),
    streak: integer('streak').notNull().default(0),
    bestStreak: integer('best_streak').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.day] }),
    index('daily_progress_user_idx').on(table.userId, table.day),
  ],
)

/**
 * Les navigateurs abonnés aux notifications.
 *
 * Une notification poussée ne s'adresse pas à un joueur mais à une
 * **installation** : le téléphone et l'ordinateur portable de la même personne
 * sont deux abonnements distincts, chacun avec sa propre adresse chez le
 * service de messagerie du navigateur. D'où une ligne par appareil et non par
 * compte.
 *
 * L'`endpoint` est la clé naturelle : c'est le navigateur qui la fabrique, et
 * il rend la même à chaque réabonnement tant qu'il n'a pas révoqué le droit.
 * L'unicité évite d'envoyer deux fois la même chose à quelqu'un qui a rouvert
 * l'application.
 *
 * `p256dh` et `auth` sont les clés de chiffrement : le contenu de la
 * notification est chiffré pour ce navigateur-là, le service de messagerie qui
 * la relaie ne peut pas le lire. On les stocke telles quelles, en base64url.
 */
export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    /**
     * Ce à quoi cet appareil est abonné.
     *
     * Séparé parce que les deux usages n'ont pas le même poids : être prévenu
     * qu'un ami vous attend est utile tout de suite, le rappel du défi du jour
     * est un agrément. Quelqu'un doit pouvoir garder le premier et couper le
     * second sans tout désactiver.
     */
    invitations: boolean('invitations').notNull().default(true),
    defiDuJour: boolean('defi_du_jour').notNull().default(true),
    /** Fuseau du navigateur — sert à envoyer le rappel du jour au bon moment. */
    timezone: varchar('timezone', { length: 60 }).notNull().default('Europe/Paris'),
    /** Dernier jour où le rappel du défi a été envoyé, au format `AAAA-MM-JJ`. */
    dernierDefiEnvoye: varchar('dernier_defi_envoye', { length: 10 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('push_subscriptions_endpoint_idx').on(table.endpoint),
    index('push_subscriptions_user_idx').on(table.userId),
  ],
)

/**
 * La partie contre l'ordinateur qu'on a laissée en plan.
 *
 * Une ligne par joueur, remplacée à chaque coup. On ne veut pas d'historique
 * ici : c'est un signet, pas une archive — la partie terminée part dans
 * `games` comme les autres, et cette ligne disparaît.
 *
 * Table séparée plutôt qu'un `status = 'playing'` dans `games` : une partie en
 * cours contre l'ordinateur n'est pas une partie jouée. La mêler aux autres
 * obligerait à l'exclure de l'historique, du classement, des statistiques et
 * de l'explorateur d'ouvertures — quatre endroits, quatre occasions d'oublier.
 *
 * L'état tient en JSON parce qu'il décrit une session, pas une entité : niveau,
 * adversaire, camp, cadence, temps restant. Le figer en colonnes imposerait une
 * migration à chaque réglage ajouté à l'écran de configuration.
 */
export const activeGames = pgTable('active_games', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  /** Coups joués, en notation algébrique, séparés par des espaces. */
  moves: text('moves').notNull().default(''),
  /** Réglages et temps restant — voir `PartieEnCours` côté web. */
  state: jsonb('state').$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * La partie classée annoncée **avant** d'être jouée.
 *
 * Le classement contre l'ordinateur se décidait entièrement à l'arrivée : le
 * navigateur envoyait ses coups, son résultat, son niveau d'adversaire et sa
 * cadence, et le serveur n'avait aucun moyen de savoir si une partie classée
 * avait seulement commencé. Trois conséquences, toutes réelles :
 *
 *  - on choisissait sa **catégorie** après coup — une partie annoncée en 30
 *    minutes classait en `classical` sans qu'une seconde de plus se soit
 *    écoulée ;
 *  - on choisissait son **adversaire** après coup, le niveau 25 comme le 1 ;
 *  - deux parties classées pouvaient se dérouler de front, ou la même être
 *    envoyée deux fois.
 *
 * Une ligne par joueur, écrite au premier coup et **consommée** à l'arrivée :
 * la fin de partie ne classe que ce qui correspond à ce qui a été déclaré, et
 * la suppression par `DELETE ... RETURNING` fait office de jeton — une seconde
 * arrivée ne trouve plus rien à consommer.
 *
 * Ce n'est pas une preuve que la partie a eu lieu : elle se joue chez le
 * joueur, et rien de ce qu'il envoie n'est vérifiable au sens fort. C'est une
 * contrainte de cohérence — niveau, cadence, camp et heure de départ sont
 * arrêtés avant que le résultat ne soit connu.
 */
export const ratedIntents = pgTable('rated_intents', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  /** Niveau du bot annoncé, déjà ramené dans le barème. */
  botLevel: smallint('bot_level').notNull(),
  /** Cadence, en secondes : elle décide de la catégorie de classement. */
  initialTime: integer('initial_time').notNull().default(0),
  increment: integer('increment').notNull().default(0),
  /** Camp annoncé du joueur, `w` ou `b`. */
  playerColor: varchar('player_color', { length: 1 }).notNull(),
  /** L'heure du serveur, seule date de début qui ne se déclare pas. */
  openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Salons de partie en direct, pour qu'un redémarrage ne les emporte pas.
 *
 * Les salons du serveur temps réel ne vivaient qu'en mémoire, et une partie
 * n'était écrite qu'une fois **finie**. Un redéploiement, un plantage, ou un
 * simple `docker compose up -d --build` pendant une partie la perdait : les
 * deux joueurs retrouvaient un salon vide, sans un mot d'explication et sans
 * moyen de reprendre.
 *
 * **Pourquoi pas `active_games`.** C'était l'idée de départ, et elle ne tient
 * pas : cette table-là a `user_id` pour clé primaire — une ligne par joueur,
 * pour la partie solo. Un salon a deux joueurs, et l'un des deux peut être un
 * invité sans compte, donc sans clé. La clé d'un salon, c'est son `slug`.
 *
 * L'état tient en JSON pour la même raison qu'à côté : il décrit une session
 * en cours, pas une entité. Ce qui compte, c'est qu'il contienne les pendules
 * en **horodatages absolus** — le temps écoulé pendant l'arrêt est ainsi
 * décompté à la relecture, comme dans un tournoi en salle où l'incident
 * technique ne rend pas le temps.
 */
export const liveGames = pgTable('live_games', {
  slug: varchar('slug', { length: 16 }).primaryKey(),
  /** Instantané complet du salon — voir `etatPersistant()` côté serveur. */
  salon: jsonb('salon').$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─────────────────────────────────────────────────────────────────────────────
//  Administration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Le journal des actes d'administration.
 *
 * Les actions passaient jusqu'ici par `console.warn`, ce qui les confiait aux
 * journaux du conteneur : lisibles pour qui a un accès SSH, illisibles pour qui
 * administre depuis la page. Or la seule trace qu'on relit vraiment est celle
 * qu'on voit sans quitter l'écran où l'on a agi — d'où cette table.
 *
 * **Elle ne référence pas sa cible.** `targetId` est une chaîne libre, sans
 * clé étrangère : le journal doit survivre à ce qu'il raconte. Une ligne
 * « partie supprimée » qui disparaîtrait en même temps que la partie ne
 * documenterait plus rien, et c'est justement des suppressions qu'on veut
 * garder la trace.
 *
 * **L'auteur est recopié en clair.** `actorName` fige le pseudo au moment de
 * l'acte : un administrateur rétrogradé, renommé ou anonymisé ensuite reste
 * nommé dans l'historique, et `actorId` passe à `null` sans emporter la ligne.
 */
export const adminAudit = pgTable(
  'admin_audit',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    actorName: varchar('actor_name', { length: 40 }).notNull(),
    /** Le verbe, tel qu'il figure dans les routes : `desactiver`, `purge`… */
    action: varchar('action', { length: 40 }).notNull(),
    /** `compte`, `partie`, `analyse`, `systeme`. */
    targetKind: varchar('target_kind', { length: 24 }),
    targetId: varchar('target_id', { length: 64 }),
    /** De quoi reconnaître la cible sans la retrouver : pseudo, slug… */
    targetLabel: varchar('target_label', { length: 120 }),
    /**
     * Le détail utile, en JSON : nombre de lignes purgées, ancienne valeur.
     *
     * Jamais de mot de passe, jamais d'empreinte — un journal qu'on n'oserait
     * pas montrer à la personne concernée est un journal de trop.
     */
    detail: jsonb('detail').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('admin_audit_created_idx').on(table.createdAt),
    index('admin_audit_action_idx').on(table.action),
  ],
)

/**
 * La dernière mesure du test de niveau.
 *
 * **Pourquoi en base, alors que le test marche sans compte.** Il continue de
 * marcher sans compte — le résultat vit alors dans le navigateur, et c'est très
 * bien pour l'écran « Ton palier ». Mais la mesure sert désormais à autre chose :
 * elle **amorce le classement**. Un compte neuf partait de 100 avec une
 * incertitude de 350, et il fallait une douzaine de parties pour qu'il rejoigne
 * son niveau : quelqu'un mesuré à 1 550 six minutes plus tôt était classé 345
 * après ses deux premières parties classées. La mesure existait, elle n'allait
 * nulle part.
 *
 * Une ligne par compte, remplacée à chaque test : c'est un curseur, pas un
 * journal. La trajectoire du classement, elle, vit déjà dans `rating_history`.
 *
 * Les deux échelles sont conservées. `puzzleRating` est ce que le test mesure
 * vraiment ; `gameRating` est sa conversion vers l'échelle des parties, qui
 * repose sur une droite approchée. Garder les deux permet de recalculer si la
 * droite change, ce qui arrivera.
 */
export const levelTests = pgTable('level_tests', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  /** Force estimée sur l'échelle des positions. */
  puzzleRating: integer('puzzle_rating').notNull(),
  /** La même, convertie sur l'échelle des parties. C'est elle qui amorce. */
  gameRating: integer('game_rating').notNull(),
  /** Écart-type de la mesure, rendu par l'ajustement. */
  sigma: integer('sigma').notNull(),
  /** Nombre de positions réellement jouées. */
  positions: smallint('positions').notNull(),
  takenAt: timestamp('taken_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Les messages qu'un administrateur adresse aux joueurs.
 *
 * **Deux portées, une seule table.** `targetId` vide désigne tout le monde,
 * `targetId` rempli une personne. Séparer « annonces » et « messages » aurait
 * donné deux écrans, deux routes et deux fois la même logique d'expiration et
 * de lecture, pour une différence qui tient dans une colonne.
 *
 * **Le texte n'est pas traduit, et ne peut pas l'être.** Tout le reste de
 * l'application passe par le dictionnaire ; ceci est écrit à la main, au
 * moment où on l'écrit. Le message porte donc la langue de son auteur, et
 * l'écran le présente comme ce qu'il est — un mot de l'équipe — plutôt que de
 * le faire passer pour de l'interface.
 *
 * **Retiré, pas supprimé.** `withdrawnAt` éteint le message sans effacer la
 * trace de ce qui a été dit ni à qui : un message d'avertissement adressé à
 * quelqu'un est justement ce qu'on veut pouvoir relire trois semaines plus
 * tard, y compris quand on l'a retiré.
 */
export const announcements = pgTable(
  'announcements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Destinataire unique, ou `null` pour l'ensemble des joueurs. */
    targetId: uuid('target_id').references(() => users.id, { onDelete: 'cascade' }),
    /** Figé à l'écriture : un pseudo change, le journal ne doit pas changer avec. */
    targetName: varchar('target_name', { length: 40 }),
    message: text('message').notNull(),
    /** `info` ou `important` — le second se voit davantage, rien de plus. */
    tone: varchar('tone', { length: 12 }).notNull().default('info'),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    authorName: varchar('author_name', { length: 40 }).notNull(),
    /** Date au-delà de laquelle le message ne s'affiche plus. `null` = sans fin. */
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('announcements_target_idx').on(table.targetId),
    index('announcements_created_idx').on(table.createdAt),
  ],
)

/**
 * Qui a lu quoi.
 *
 * Une ligne écrite quand le joueur ferme le message. Sans elle, un message
 * général réapparaîtrait à chaque page tournée — et l'on ne saurait pas non
 * plus si l'avertissement adressé à quelqu'un lui est parvenu, ce qui est la
 * première question qu'on se pose en le relisant.
 *
 * Réservé aux comptes : un visiteur sans compte voit les annonces générales et
 * les referme dans son navigateur, ce que rien ici n'a à savoir.
 */
export const announcementReads = pgTable(
  'announcement_reads',
  {
    announcementId: uuid('announcement_id')
      .notNull()
      .references(() => announcements.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    readAt: timestamp('read_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.announcementId, table.userId] })],
)

// ─────────────────────────────────────────────────────────────────────────────
//  Relations
// ─────────────────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  friendships: many(friendships),
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
export type DailyProgress = typeof dailyProgress.$inferSelect
export type ActiveGame = typeof activeGames.$inferSelect
export type RatedIntent = typeof ratedIntents.$inferSelect
export type LiveGame = typeof liveGames.$inferSelect
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect
export type AdminAudit = typeof adminAudit.$inferSelect
export type Announcement = typeof announcements.$inferSelect
export type LevelTest = typeof levelTests.$inferSelect
