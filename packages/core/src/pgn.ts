/**
 * Lecture et écriture du PGN (Portable Game Notation).
 *
 * Le PGN est le format d'échange universel des parties d'échecs depuis 1994 :
 * un en-tête de balises entre crochets, puis les coups. Toutes les plateformes
 * l'exportent, donc importer un PGN est la façon la plus simple pour un joueur
 * d'analyser ici une partie jouée ailleurs.
 *
 * On enrichit l'export avec les annotations produites par l'analyse — symboles
 * `!?`, évaluations, commentaires — de sorte qu'un PGN exporté depuis Le Coup Parfait
 * reste lisible dans n'importe quel autre logiciel.
 */

import { Chess } from 'chess.js'
import { QUALITY_STYLES } from './classify.ts'
import { formatScore } from './eval.ts'
import { sanToFrench } from './explain.ts'
import type { AnalysedMove, GameResult, TimeControl } from './types.ts'

export interface PgnHeaders {
  Event?: string
  Site?: string
  Date?: string
  Round?: string
  White?: string
  Black?: string
  Result?: GameResult
  WhiteElo?: string
  BlackElo?: string
  TimeControl?: string
  ECO?: string
  Opening?: string
  Termination?: string
  [key: string]: string | undefined
}

export interface ParsedGame {
  headers: PgnHeaders
  /** Coups en notation algébrique anglaise. */
  moves: string[]
  /** Position de départ (différente si la balise `FEN` est présente). */
  startFen: string
  result: GameResult
  /** Commentaires trouvés, indexés par demi-coup. */
  comments: Record<number, string>
}

// ─────────────────────────────────────────────────────────────────────────────
//  Import
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyse un PGN et en extrait la partie.
 *
 * Tolérant par construction : les PGN trouvés dans la nature sont souvent
 * approximatifs (variantes imbriquées, commentaires non fermés, sauts de ligne
 * fantaisistes). On délègue d'abord à chess.js, puis on retombe sur un analyseur
 * maison si le mode strict échoue.
 */
export function parsePgn(pgn: string): ParsedGame | null {
  const board = new Chess()
  try {
    board.loadPgn(pgn, { strict: false })
  } catch {
    return parsePgnLoosely(pgn)
  }

  const headers = board.getHeaders() as PgnHeaders
  const moves = board.history()
  if (moves.length === 0 && !headers.FEN) return parsePgnLoosely(pgn)

  const comments: Record<number, string> = {}
  for (const entry of board.getComments()) {
    // chess.js indexe les commentaires par FEN ; on les remet dans l'ordre.
    const index = moves.length
    comments[index] = entry.comment
  }

  return {
    headers,
    moves,
    startFen: headers.FEN ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    result: (headers.Result as GameResult) ?? '*',
    comments,
  }
}

/**
 * Analyseur de secours : ignore variantes, commentaires et annotations, et ne
 * garde que la ligne principale. Suffisant pour récupérer une partie mal formée.
 */
function parsePgnLoosely(pgn: string): ParsedGame | null {
  const headers: PgnHeaders = {}
  for (const match of pgn.matchAll(/\[(\w+)\s+"([^"]*)"\]/g)) {
    headers[match[1]!] = match[2]!
  }

  // Corps = tout ce qui suit le dernier en-tête.
  const bodyStart = pgn.lastIndexOf(']')
  let body = bodyStart >= 0 ? pgn.slice(bodyStart + 1) : pgn

  body = body
    .replace(/\{[^}]*\}/g, ' ') // commentaires entre accolades
    .replace(/;[^\n]*/g, ' ') // commentaires de fin de ligne
    .replace(/\$\d+/g, ' ') // annotations numériques (NAG)

  // Variantes entre parenthèses, éventuellement imbriquées.
  let previous: string
  do {
    previous = body
    body = body.replace(/\([^()]*\)/g, ' ')
  } while (body !== previous)

  const tokens = body
    .replace(/\d+\.(\.\.)?/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t))

  const startFen = headers.FEN ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  const board = new Chess(startFen, { skipValidation: true })
  const moves: string[] = []

  for (const token of tokens) {
    const cleaned = token.replace(/[!?]+$/, '')
    if (!cleaned) continue
    try {
      const move = board.move(cleaned)
      moves.push(move.san)
    } catch {
      // Un jeton illisible interrompt la lecture : la suite n'a plus de sens.
      break
    }
  }

  if (moves.length === 0) return null

  return {
    headers,
    moves,
    startFen,
    result: (headers.Result as GameResult) ?? '*',
    comments: {},
  }
}

/** Accepte aussi bien une liste de coups qu'un PGN complet ou une FEN. */
export function parseAnyGameInput(input: string): ParsedGame | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Une FEN seule : partie d'une position donnée, sans coups.
  if (/^[1-8pnbrqkPNBRQK/]+\s+[wb]\s+[KQkq-]+\s+\S+/.test(trimmed)) {
    try {
      const board = new Chess(trimmed)
      return {
        headers: { FEN: board.fen() },
        moves: [],
        startFen: board.fen(),
        result: '*',
        comments: {},
      }
    } catch {
      return null
    }
  }

  return parsePgn(trimmed)
}

// ─────────────────────────────────────────────────────────────────────────────
//  Export
// ─────────────────────────────────────────────────────────────────────────────

export interface PgnExportOptions {
  headers?: PgnHeaders
  /** Ajoute `!?`, `?`, `??` après les coups d'après l'analyse. */
  annotate?: boolean
  /** Insère l'évaluation moteur en commentaire après chaque coup. */
  includeEvaluations?: boolean
  /** Insère l'explication rédigée en commentaire. */
  comments?: Record<number, string>
  /** Notation française (`Cf3`) plutôt qu'anglaise (`Nf3`). */
  locale?: 'fr' | 'en'
  /** Largeur de retour à la ligne. */
  maxWidth?: number
}

/** Ordre canonique des sept balises obligatoires du standard PGN. */
const SEVEN_TAG_ROSTER = ['Event', 'Site', 'Date', 'Round', 'White', 'Black', 'Result']

/**
 * Produit un PGN valide, éventuellement annoté.
 *
 * Le format reste conforme au standard même avec les annotations : les
 * commentaires vont entre accolades, les symboles suivent immédiatement le
 * coup. N'importe quel logiciel d'échecs saura le relire.
 */
export function toPgn(
  moves: AnalysedMove[],
  options: PgnExportOptions = {},
): string {
  const headers: PgnHeaders = {
    Event: 'Partie Le Coup Parfait',
    Site: 'Le Coup Parfait',
    Date: '????.??.??',
    Round: '-',
    White: 'Blancs',
    Black: 'Noirs',
    Result: '*',
    ...options.headers,
  }

  const lines: string[] = []
  for (const tag of SEVEN_TAG_ROSTER) {
    lines.push(`[${tag} "${escapeTag(headers[tag] ?? '?')}"]`)
  }
  for (const [key, value] of Object.entries(headers)) {
    if (SEVEN_TAG_ROSTER.includes(key) || value === undefined) continue
    lines.push(`[${key} "${escapeTag(value)}"]`)
  }
  lines.push('')

  const tokens: string[] = []
  for (const move of moves) {
    if (move.color === 'w') tokens.push(`${move.moveNumber}.`)
    else if (tokens.length === 0) tokens.push(`${move.moveNumber}...`)

    const san = options.locale === 'fr' ? sanToFrench(move.san) : move.san
    const nag = options.annotate ? QUALITY_STYLES[move.quality].nag : ''
    tokens.push(`${san}${nag}`)

    const annotations: string[] = []
    if (options.includeEvaluations) {
      annotations.push(`[%eval ${evalTag(move)}]`)
    }
    const comment = options.comments?.[move.ply]
    if (comment) annotations.push(comment)
    if (annotations.length > 0) tokens.push(`{ ${annotations.join(' ')} }`)
  }
  tokens.push(headers.Result ?? '*')

  lines.push(wrap(tokens, options.maxWidth ?? 80))
  return lines.join('\n')
}

/** Format `%eval` reconnu par Lichess et Chess.com : `0.34` ou `#-3`. */
function evalTag(move: AnalysedMove): string {
  const score = move.scoreAfter
  if (score.type === 'mate') return `#${score.value}`
  return (score.value / 100).toFixed(2)
}

function escapeTag(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function wrap(tokens: string[], width: number): string {
  const lines: string[] = []
  let current = ''
  for (const token of tokens) {
    if (current.length + token.length + 1 > width && current.length > 0) {
      lines.push(current)
      current = token
    } else {
      current = current ? `${current} ${token}` : token
    }
  }
  if (current) lines.push(current)
  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────────────────────
//  Utilitaires de partie
// ─────────────────────────────────────────────────────────────────────────────

/** Rejoue une suite de coups et retourne toutes les positions traversées. */
export function replayPositions(startFen: string, sanMoves: string[]): string[] {
  const board = new Chess(startFen, { skipValidation: true })
  const positions = [board.fen()]
  for (const san of sanMoves) {
    try {
      board.move(san)
      positions.push(board.fen())
    } catch {
      break
    }
  }
  return positions
}

/** Balise `TimeControl` au format PGN : `300+3`, `-` si sans limite. */
export function formatPgnTimeControl(tc: TimeControl): string {
  if (tc.initial === 0 && tc.increment === 0) return '-'
  return `${tc.initial}+${tc.increment}`
}

/** Date au format PGN : `2026.08.27`. */
export function formatPgnDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
}

/** Résultat lisible pour l'interface. */
export function describeResult(
  result: GameResult,
  locale: 'fr' | 'en' = 'fr',
): string {
  const table: Record<GameResult, { fr: string; en: string }> = {
    '1-0': { fr: 'Les Blancs gagnent', en: 'White wins' },
    '0-1': { fr: 'Les Noirs gagnent', en: 'Black wins' },
    '1/2-1/2': { fr: 'Partie nulle', en: 'Draw' },
    '*': { fr: 'Partie en cours', en: 'Game in progress' },
  }
  return table[result][locale]
}

/**
 * Le résultat que la position **impose**, ou `null` si la partie continue.
 *
 * Sert à recouper le résultat déclaré par un client. Un mat, un pat, une nulle
 * par matériel insuffisant, par répétition ou par la règle des cinquante coups
 * se lisent sur l'échiquier et ne se discutent pas ; tout le reste — abandon,
 * chute du drapeau, nulle par accord — ne s'y lit pas, et c'est à l'appelant de
 * décider ce qu'il accepte alors.
 *
 * On ne prend pas `isDraw()` de chess.js : il regroupe des cas qu'on veut
 * distinguer, et il a changé de définition d'une version à l'autre.
 */
export function resultatImpose(chess: Chess): GameResult | null {
  if (chess.isCheckmate()) {
    // `turn()` est le camp au trait, c'est-à-dire celui qui est maté.
    return chess.turn() === 'w' ? '0-1' : '1-0'
  }
  if (
    chess.isStalemate() ||
    chess.isInsufficientMaterial() ||
    chess.isThreefoldRepetition() ||
    chess.isDrawByFiftyMoves()
  ) {
    return '1/2-1/2'
  }
  return null
}

/** Score d'un camp à partir du résultat, pour le calcul du classement. */
export function resultToScore(result: GameResult, color: 'w' | 'b'): 0 | 0.5 | 1 | null {
  if (result === '1/2-1/2') return 0.5
  if (result === '1-0') return color === 'w' ? 1 : 0
  if (result === '0-1') return color === 'b' ? 1 : 0
  return null
}
