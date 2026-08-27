/**
 * Types partagés du domaine échiquéen.
 *
 * Tout le reste du monorepo (web, serveur temps réel, scripts d'import) parle
 * ce vocabulaire. Il ne dépend d'aucun framework.
 */

import type { Color, PieceSymbol, Square } from 'chess.js'

export type { Color, PieceSymbol, Square }

/** Un coup en notation UCI longue, ex. `e2e4`, `e7e8q`. */
export type UciMove = string

/** Un coup en notation algébrique standard, ex. `Cf3`, `O-O`, `exd5`. */
export type SanMove = string

/** Position complète au format Forsyth-Edwards. */
export type Fen = string

// ─────────────────────────────────────────────────────────────────────────────
//  Évaluation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score renvoyé par un moteur UCI, toujours exprimé **du point de vue des
 * Blancs** une fois normalisé (les moteurs, eux, parlent du point de vue du
 * trait — la normalisation est faite à la lecture).
 */
export type Score =
  | { type: 'cp'; value: number }
  | { type: 'mate'; value: number }

/** Une variante analysée par le moteur (une ligne de MultiPV). */
export interface EngineLine {
  /** Rang de la ligne, 1 = meilleure. */
  multipv: number
  /** Score normalisé côté Blancs. */
  score: Score
  /** Profondeur atteinte. */
  depth: number
  /** Profondeur sélective (extensions de quiescence). */
  seldepth?: number
  /** Suite de coups prévue, en UCI. */
  pv: UciMove[]
  /** Suite de coups prévue, en SAN — calculée côté application. */
  san?: SanMove[]
  /** Noeuds explorés par seconde. */
  nps?: number
  /** Milliers de noeuds explorés. */
  nodes?: number
}

/** Résultat complet d'une analyse de position. */
export interface PositionAnalysis {
  fen: Fen
  depth: number
  /** Lignes triées par `multipv` croissant. */
  lines: EngineLine[]
  /** Meilleur coup selon le moteur. */
  bestMove: UciMove | null
  /** Coup de « ponder » (la réponse attendue). */
  ponder?: UciMove | null
  /** Temps de calcul en millisecondes. */
  timeMs?: number
  /** Provenance : moteur natif serveur, WASM navigateur, ou cache. */
  source: 'server' | 'client' | 'cache' | 'tablebase' | 'book'
}

// ─────────────────────────────────────────────────────────────────────────────
//  Classification des coups
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Qualité d'un coup joué, du meilleur au pire.
 *
 * `book` et `forced` sont des cas particuliers : un coup de théorie ou un coup
 * unique ne se juge pas sur la perte d'évaluation.
 */
export type MoveQuality =
  | 'brilliant' // sacrifice sain et meilleur coup
  | 'great' // coup nettement supérieur à toutes les alternatives
  | 'best' // le premier choix du moteur
  | 'excellent' // perte négligeable
  | 'good' // perte faible
  | 'book' // théorie d'ouverture connue
  | 'forced' // aucun autre coup légal
  | 'inaccuracy' // imprécision
  | 'mistake' // erreur
  | 'blunder' // gaffe
  | 'miss' // occasion manquée (mat ou gain forcé disponible)

/** Ordre d'affichage / de gravité, du meilleur au pire. */
export const MOVE_QUALITY_ORDER: readonly MoveQuality[] = [
  'brilliant',
  'great',
  'best',
  'excellent',
  'good',
  'book',
  'forced',
  'inaccuracy',
  'mistake',
  'blunder',
  'miss',
] as const

/** Les qualités considérées comme des fautes (utilisé pour les statistiques). */
export const BLUNDER_QUALITIES: readonly MoveQuality[] = [
  'inaccuracy',
  'mistake',
  'blunder',
  'miss',
] as const

// ─────────────────────────────────────────────────────────────────────────────
//  Motifs tactiques et stratégiques
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Motifs reconnus par l'analyseur. Servent à expliquer *pourquoi* un coup est
 * bon ou mauvais, et à taguer les puzzles.
 */
export type MotifId =
  // Tactique
  | 'hangingPiece'
  | 'fork'
  | 'pin'
  | 'skewer'
  | 'discoveredAttack'
  | 'doubleCheck'
  | 'removingTheDefender'
  | 'deflection'
  | 'decoy'
  | 'overloadedPiece'
  | 'interference'
  | 'zwischenzug'
  | 'trappedPiece'
  | 'backRankMate'
  | 'smotheredMate'
  | 'mateThreat'
  | 'mateIn1'
  | 'mateIn2'
  | 'mateIn3'
  | 'promotion'
  | 'underPromotion'
  | 'enPassant'
  | 'sacrifice'
  | 'desperado'
  | 'perpetualCheck'
  | 'stalemateTrick'
  | 'xRayAttack'
  | 'windmill'
  | 'clearance'
  // Stratégie
  | 'passedPawn'
  | 'protectedPassedPawn'
  | 'isolatedPawn'
  | 'doubledPawns'
  | 'backwardPawn'
  | 'pawnMajority'
  | 'outpost'
  | 'bishopPair'
  | 'badBishop'
  | 'openFile'
  | 'semiOpenFile'
  | 'seventhRank'
  | 'weakSquare'
  | 'spaceAdvantage'
  | 'kingSafety'
  | 'exposedKing'
  | 'development'
  | 'centreControl'
  | 'tempo'
  | 'oppositeCastling'
  | 'minorityAttack'
  | 'fianchetto'
  | 'blockade'
  // Finales
  | 'opposition'
  | 'zugzwang'
  | 'rookBehindPasser'
  | 'wrongBishop'
  | 'lucenaPosition'
  | 'philidorPosition'
  | 'kingActivity'
  | 'pawnBreakthrough'

/** Un motif détecté dans une position, avec son contexte. */
export interface DetectedMotif {
  id: MotifId
  /** Cases concernées, pour surligner l'échiquier. */
  squares: Square[]
  /** Camp qui bénéficie du motif. */
  side: Color
  /** Poids indicatif 0..1, sert à ne garder que les motifs saillants. */
  weight: number
  /** Détails typés utilisés par le générateur d'explications. */
  detail?: Record<string, string | number | boolean | string[]>
}

// ─────────────────────────────────────────────────────────────────────────────
//  Analyse d'un coup joué
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalysedMove {
  /** Index du demi-coup dans la partie (0 = premier coup des Blancs). */
  ply: number
  /** Numéro de coup affiché (1, 1, 2, 2, …). */
  moveNumber: number
  color: Color
  san: SanMove
  uci: UciMove
  /** Position **avant** le coup. */
  fenBefore: Fen
  /** Position **après** le coup. */
  fenAfter: Fen
  /** Évaluation avant le coup, côté Blancs. */
  scoreBefore: Score
  /** Évaluation après le coup, côté Blancs. */
  scoreAfter: Score
  /** Chances de victoire (0..100) pour le joueur au trait, avant le coup. */
  winBefore: number
  /** Chances de victoire (0..100) pour le même joueur, après le coup. */
  winAfter: number
  /** Perte de chances de victoire, en points de pourcentage (≥ 0). */
  winLoss: number
  /** Perte en centipions, plafonnée (pour l'ACPL). */
  centipawnLoss: number
  /** Précision 0..100 de ce coup. */
  accuracy: number
  quality: MoveQuality
  /** Meilleur coup selon le moteur, si différent de celui joué. */
  bestMove?: { uci: UciMove; san: SanMove; score: Score } | null
  /** Suite principale après le meilleur coup, en SAN. */
  bestLine?: SanMove[]
  /** Suite principale après le coup joué, en SAN. */
  playedLine?: SanMove[]
  /** Motifs détectés à propos de ce coup. */
  motifs: DetectedMotif[]
  /** Nom de l'ouverture si la position est encore dans la théorie. */
  opening?: { eco: string; name: string } | null
  /** Temps de réflexion du joueur, en millisecondes. */
  thinkTimeMs?: number
}

/** Bilan d'une partie analysée. */
export interface GameReport {
  moves: AnalysedMove[]
  accuracy: Record<Color, number>
  /** Perte moyenne en centipions. */
  acpl: Record<Color, number>
  /** Décompte par qualité de coup. */
  counts: Record<Color, Record<MoveQuality, number>>
  /** Estimation de la performance Elo sur cette partie. */
  estimatedElo: Record<Color, number>
  opening: { eco: string; name: string; ply: number } | null
  /** Moments clés : renversements de situation. */
  turningPoints: number[]
  /** Phase de partie par demi-coup. */
  phases: GamePhase[]
}

export type GamePhase = 'opening' | 'middlegame' | 'endgame'

// ─────────────────────────────────────────────────────────────────────────────
//  Cadences et parties
// ─────────────────────────────────────────────────────────────────────────────

export interface TimeControl {
  /** Temps initial en secondes. `0` = sans limite. */
  initial: number
  /** Incrément par coup, en secondes. */
  increment: number
}

export type SpeedCategory =
  | 'ultraBullet'
  | 'bullet'
  | 'blitz'
  | 'rapid'
  | 'classical'
  | 'correspondence'

export type GameResult = '1-0' | '0-1' | '1/2-1/2' | '*'

export type GameStatus =
  | 'waiting'
  | 'playing'
  | 'checkmate'
  | 'stalemate'
  | 'resign'
  | 'timeout'
  | 'draw'
  | 'insufficientMaterial'
  | 'threefold'
  | 'fiftyMoves'
  | 'aborted'
  | 'abandoned'

// ─────────────────────────────────────────────────────────────────────────────
//  Ouvertures
// ─────────────────────────────────────────────────────────────────────────────

export interface OpeningEntry {
  /** Code ECO, ex. `B90`. */
  eco: string
  /** Nom anglais canonique (jeu de données Lichess, CC0). */
  name: string
  /** Nom français lorsqu'il existe une traduction établie. */
  nameFr?: string
  /** Suite de coups en SAN séparés par des espaces. */
  pgn: string
  /** Suite de coups en UCI, pour la recherche par position. */
  uci: string
  /** Position EPD atteinte (FEN sans compteurs). */
  epd: string
  /** Nombre de demi-coups. */
  ply: number
}

// ─────────────────────────────────────────────────────────────────────────────
//  Niveaux de jeu de l'ordinateur
// ─────────────────────────────────────────────────────────────────────────────

export interface BotLevel {
  /** 1 à 25. */
  level: number
  /** Elo approximatif visé. */
  elo: number
  /** Identifiant de la personnalité associée. */
  personality: BotPersonalityId
  /** Nom affiché. */
  name: { fr: string; en: string }
  /** Courte description du style. */
  blurb: { fr: string; en: string }
  /** Paramètres transmis au moteur. */
  engine: BotEngineConfig
}

export type BotPersonalityId =
  | 'novice'
  | 'prudent'
  | 'fonceur'
  | 'tacticien'
  | 'positionnel'
  | 'gambiteur'
  | 'machine'

export interface BotEngineConfig {
  /** Utilise `UCI_LimitStrength` + `UCI_Elo` (Stockfish accepte 1320..3190). */
  uciElo?: number
  /** `Skill Level` 0..20 de Stockfish. */
  skill: number
  /** Profondeur maximale de recherche. */
  depth: number
  /** Limite en noeuds (plus doux que la profondeur pour brider un moteur). */
  nodes?: number
  /** Temps de réflexion maximal, en millisecondes. */
  movetimeMs: number
  /**
   * Température d'échantillonnage sur les lignes MultiPV.
   * `0` = joue toujours le meilleur coup, `1` = très humain/erratique.
   */
  temperature: number
  /** Nombre de lignes demandées au moteur pour l'échantillonnage. */
  multiPv: number
  /**
   * Biais de style appliqué au choix du coup, en centipions.
   * Positif = le bot aime ce type de coup.
   */
  bias: StyleBias
}

export interface StyleBias {
  /** Aime capturer. */
  capture: number
  /** Aime donner échec. */
  check: number
  /** Aime pousser ses pions. */
  pawnPush: number
  /** Aime développer / roquer tôt. */
  development: number
  /** Aime les sacrifices (accepte de perdre du matériel pour l'initiative). */
  sacrifice: number
  /** Aime les coups calmes et solides. */
  quiet: number
}
