/**
 * Protocole UCI (Universal Chess Interface).
 *
 * Les moteurs d'échecs communiquent en texte sur stdin/stdout. Ce module lit
 * leurs lignes `info` et `bestmove` et les convertit en objets typés.
 *
 * Piège principal : un moteur exprime toujours son évaluation **du point de vue
 * du camp au trait**. « score cp 50 » quand les Noirs jouent signifie que les
 * *Noirs* sont mieux. Toute l'application raisonne côté Blancs, la conversion
 * se fait donc ici, une fois pour toutes.
 */

import { Chess } from 'chess.js'
import type { Color } from 'chess.js'
import type { EngineLine, Score, UciMove } from './types.ts'

// ─────────────────────────────────────────────────────────────────────────────
//  Lecture des lignes moteur
// ─────────────────────────────────────────────────────────────────────────────

export interface ParsedInfo {
  depth?: number
  seldepth?: number
  multipv?: number
  /** Score tel qu'annoncé par le moteur, côté trait. */
  score?: Score
  nodes?: number
  nps?: number
  timeMs?: number
  hashfull?: number
  pv?: UciMove[]
  /** Vrai si le moteur signale une borne au lieu d'un score exact. */
  bound?: 'lower' | 'upper'
  /** Coup en cours d'analyse (ligne de progression, sans intérêt pour nous). */
  currmove?: string
}

/**
 * Analyse une ligne `info` du moteur.
 * Retourne `null` pour les lignes sans information exploitable.
 */
export function parseInfoLine(line: string): ParsedInfo | null {
  if (!line.startsWith('info ')) return null
  const tokens = line.split(/\s+/)
  const info: ParsedInfo = {}

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i]
    switch (token) {
      case 'depth':
        info.depth = Number(tokens[++i])
        break
      case 'seldepth':
        info.seldepth = Number(tokens[++i])
        break
      case 'multipv':
        info.multipv = Number(tokens[++i])
        break
      case 'nodes':
        info.nodes = Number(tokens[++i])
        break
      case 'nps':
        info.nps = Number(tokens[++i])
        break
      case 'time':
        info.timeMs = Number(tokens[++i])
        break
      case 'hashfull':
        info.hashfull = Number(tokens[++i])
        break
      case 'currmove':
        info.currmove = tokens[++i]
        break
      case 'score': {
        const kind = tokens[++i]
        const value = Number(tokens[++i])
        if (kind === 'cp') info.score = { type: 'cp', value }
        else if (kind === 'mate') info.score = { type: 'mate', value }
        // `lowerbound` / `upperbound` suivent parfois le score.
        const next = tokens[i + 1]
        if (next === 'lowerbound') {
          info.bound = 'lower'
          i++
        } else if (next === 'upperbound') {
          info.bound = 'upper'
          i++
        }
        break
      }
      case 'pv':
        // `pv` est toujours le dernier champ : tout le reste est la variante.
        info.pv = tokens.slice(i + 1).filter((t) => /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(t))
        i = tokens.length
        break
      default:
        break
    }
  }

  return Object.keys(info).length > 0 ? info : null
}

/** Analyse la ligne `bestmove e2e4 ponder e7e5`. */
export function parseBestMove(
  line: string,
): { best: UciMove | null; ponder: UciMove | null } | null {
  if (!line.startsWith('bestmove')) return null
  const tokens = line.split(/\s+/)
  const best = tokens[1] && tokens[1] !== '(none)' ? tokens[1] : null
  const ponderIndex = tokens.indexOf('ponder')
  const ponder = ponderIndex > 0 ? (tokens[ponderIndex + 1] ?? null) : null
  return { best, ponder }
}

/**
 * Normalise un score côté Blancs.
 * @param score score tel qu'annoncé par le moteur
 * @param turn camp au trait dans la position analysée
 */
export function normaliseScore(score: Score, turn: Color): Score {
  if (turn === 'w') return score
  return score.type === 'mate'
    ? { type: 'mate', value: -score.value }
    : { type: 'cp', value: -score.value }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Agrégation des lignes MultiPV
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Accumule les lignes `info` d'une recherche et n'en garde que la plus profonde
 * pour chaque rang MultiPV. Un moteur émet des dizaines de lignes par seconde ;
 * seule la dernière de chaque rang nous intéresse.
 */
export class MultiPvCollector {
  private readonly lines = new Map<number, EngineLine>()
  private readonly turn: Color
  // Champ déclaré explicitement plutôt qu'en propriété de paramètre : Node
  // exécute ces fichiers en effaçant simplement les types, et cette sucrerie
  // syntaxique de TypeScript n'a pas d'équivalent en JavaScript.
  private readonly fen: string

  constructor(fen: string) {
    this.fen = fen
    this.turn = fen.split(' ')[1] === 'b' ? 'b' : 'w'
  }

  /** Absorbe une ligne brute du moteur. Retourne `true` si l'état a changé. */
  ingest(rawLine: string): boolean {
    const info = parseInfoLine(rawLine)
    if (!info || !info.score || !info.pv || info.pv.length === 0) return false
    // Les scores bornés sont des estimations partielles : on les ignore.
    if (info.bound) return false

    const multipv = info.multipv ?? 1
    const existing = this.lines.get(multipv)
    const depth = info.depth ?? 0
    if (existing && existing.depth > depth) return false

    this.lines.set(multipv, {
      multipv,
      depth,
      seldepth: info.seldepth,
      score: normaliseScore(info.score, this.turn),
      pv: info.pv,
      nodes: info.nodes,
      nps: info.nps,
    })
    return true
  }

  /** Lignes triées, la meilleure en premier. */
  result(): EngineLine[] {
    return [...this.lines.values()].sort((a, b) => a.multipv - b.multipv)
  }

  /** Profondeur atteinte par la ligne principale. */
  depth(): number {
    return this.lines.get(1)?.depth ?? 0
  }

  clear(): void {
    this.lines.clear()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Conversion UCI ↔ SAN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convertit une variante UCI en notation algébrique lisible.
 * Retourne les coups convertibles et s'arrête au premier coup illégal — un
 * moteur peut renvoyer une variante tronquée en fin de recherche.
 */
export function uciLineToSan(fen: string, uciMoves: UciMove[]): string[] {
  const board = new Chess(fen, { skipValidation: true })
  const out: string[] = []
  for (const uci of uciMoves) {
    try {
      const move = board.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci[4] : undefined,
      })
      out.push(move.san)
    } catch {
      break
    }
  }
  return out
}

/** Convertit un coup SAN en UCI dans le contexte d'une position. */
export function sanToUci(fen: string, san: string): UciMove | null {
  const board = new Chess(fen, { skipValidation: true })
  try {
    const move = board.move(san)
    return `${move.from}${move.to}${move.promotion ?? ''}`
  } catch {
    return null
  }
}

/** Vrai si la chaîne a la forme d'un coup UCI. */
export function isUciMove(value: string): boolean {
  return /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(value)
}

/**
 * Construit la commande `position` à envoyer au moteur.
 * On préfère `startpos moves …` quand c'est possible : certains moteurs
 * détectent mieux les répétitions avec l'historique complet.
 */
export function positionCommand(fen: string, moves: UciMove[] = []): string {
  const base =
    fen === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      ? 'position startpos'
      : `position fen ${fen}`
  return moves.length > 0 ? `${base} moves ${moves.join(' ')}` : base
}

/** Construit la commande `go` correspondant à des contraintes de recherche. */
export function goCommand(options: {
  depth?: number
  movetimeMs?: number
  nodes?: number
  /** Temps restant, pour laisser le moteur gérer son horloge lui-même. */
  wtimeMs?: number
  btimeMs?: number
  wincMs?: number
  bincMs?: number
  searchMoves?: UciMove[]
}): string {
  const parts = ['go']
  if (options.searchMoves?.length) parts.push('searchmoves', options.searchMoves.join(' '))
  if (options.depth !== undefined) parts.push('depth', String(options.depth))
  if (options.nodes !== undefined) parts.push('nodes', String(options.nodes))
  if (options.movetimeMs !== undefined) parts.push('movetime', String(options.movetimeMs))
  if (options.wtimeMs !== undefined) parts.push('wtime', String(Math.max(1, options.wtimeMs)))
  if (options.btimeMs !== undefined) parts.push('btime', String(Math.max(1, options.btimeMs)))
  if (options.wincMs !== undefined) parts.push('winc', String(options.wincMs))
  if (options.bincMs !== undefined) parts.push('binc', String(options.bincMs))
  if (parts.length === 1) parts.push('depth', '18')
  return parts.join(' ')
}
