/**
 * Primitives d'analyse d'échiquier.
 *
 * Tout ce qui permet de raisonner sur une position sans moteur : valeur du
 * matériel, cases contrôlées, échange statique (SEE), pièces en prise, rayons
 * d'action des pièces à longue portée. C'est la brique sur laquelle repose la
 * détection de motifs tactiques.
 */

import { Chess, SQUARES } from 'chess.js'
import type { Color, PieceSymbol, Square } from 'chess.js'
import type { GamePhase } from './types.ts'

// ─────────────────────────────────────────────────────────────────────────────
//  Valeurs et constantes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valeur des pièces en centipions.
 *
 * Le fou vaut un cheveu de plus que le cavalier : c'est ce qui produit la
 * « paire de fous » comme avantage mesurable. Le roi reçoit une valeur
 * gigantesque pour que l'échange statique ne le considère jamais comme
 * capturable.
 */
export const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 100,
  n: 305,
  b: 333,
  r: 563,
  q: 950,
  k: 100000,
}

/** Valeurs affichées au joueur (le décompte matériel classique). */
export const SIMPLE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
}

export const PIECE_NAMES: Record<PieceSymbol, { fr: string; en: string }> = {
  p: { fr: 'pion', en: 'pawn' },
  n: { fr: 'cavalier', en: 'knight' },
  b: { fr: 'fou', en: 'bishop' },
  r: { fr: 'tour', en: 'rook' },
  q: { fr: 'dame', en: 'queen' },
  k: { fr: 'roi', en: 'king' },
}

/** Article défini français, pour composer des phrases correctes. */
export const PIECE_ARTICLE: Record<PieceSymbol, string> = {
  p: 'le',
  n: 'le',
  b: 'le',
  r: 'la',
  q: 'la',
  k: 'le',
}

export const COLOR_NAMES: Record<Color, { fr: string; en: string }> = {
  w: { fr: 'les Blancs', en: 'White' },
  b: { fr: 'les Noirs', en: 'Black' },
}

/** Lettre SAN française d'une pièce (les pions n'en ont pas). */
export const SAN_LETTER_FR: Record<PieceSymbol, string> = {
  p: '',
  n: 'C',
  b: 'F',
  r: 'T',
  q: 'D',
  k: 'R',
}

/** Lettre SAN anglaise. */
export const SAN_LETTER_EN: Record<PieceSymbol, string> = {
  p: '',
  n: 'N',
  b: 'B',
  r: 'R',
  q: 'Q',
  k: 'K',
}

// ─────────────────────────────────────────────────────────────────────────────
//  Géométrie des cases
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_SQUARES: readonly Square[] = SQUARES

/** Colonne 0–7 (a = 0). */
export function fileIndex(square: Square): number {
  return square.charCodeAt(0) - 97
}

/** Rangée 0–7 (rangée 1 = 0). */
export function rankIndex(square: Square): number {
  return square.charCodeAt(1) - 49
}

/** Lettre de colonne, ex. `e`. */
export function fileOf(square: Square): string {
  return square[0]!
}

/** Chiffre de rangée, ex. `4`. */
export function rankOf(square: Square): number {
  return Number(square[1])
}

export function squareFrom(file: number, rank: number): Square | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null
  return `${String.fromCharCode(97 + file)}${rank + 1}` as Square
}

/** Couleur de la case, utile pour « mauvais fou » et fous de couleurs opposées. */
export function squareShade(square: Square): 'light' | 'dark' {
  return (fileIndex(square) + rankIndex(square)) % 2 === 0 ? 'dark' : 'light'
}

/** Distance de Tchebychev : nombre de coups de roi entre deux cases. */
export function kingDistance(a: Square, b: Square): number {
  return Math.max(Math.abs(fileIndex(a) - fileIndex(b)), Math.abs(rankIndex(a) - rankIndex(b)))
}

/**
 * Rangée « relative » vue par un camp : la rangée 7 est toujours la rangée de
 * promotion du camp considéré. Simplifie tout le code sur les pions.
 */
export function relativeRank(square: Square, color: Color): number {
  const r = rankIndex(square)
  return color === 'w' ? r : 7 - r
}

const RAY_DIRECTIONS = {
  orthogonal: [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ],
  diagonal: [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ],
} as const

/** Directions d'action d'une pièce à longue portée. */
export function slidingDirections(piece: PieceSymbol): ReadonlyArray<readonly [number, number]> {
  if (piece === 'r') return RAY_DIRECTIONS.orthogonal
  if (piece === 'b') return RAY_DIRECTIONS.diagonal
  if (piece === 'q') return [...RAY_DIRECTIONS.orthogonal, ...RAY_DIRECTIONS.diagonal]
  return []
}

/**
 * Cases strictement comprises entre deux cases alignées.
 * Retourne `null` si les cases ne sont pas sur une même ligne, colonne ou
 * diagonale — c'est ce qui permet de tester clouages et enfilades.
 */
export function squaresBetween(a: Square, b: Square): Square[] | null {
  const df = fileIndex(b) - fileIndex(a)
  const dr = rankIndex(b) - rankIndex(a)
  if (df === 0 && dr === 0) return null
  const aligned = df === 0 || dr === 0 || Math.abs(df) === Math.abs(dr)
  if (!aligned) return null
  const stepF = Math.sign(df)
  const stepR = Math.sign(dr)
  const steps = Math.max(Math.abs(df), Math.abs(dr))
  const out: Square[] = []
  for (let i = 1; i < steps; i++) {
    const sq = squareFrom(fileIndex(a) + stepF * i, rankIndex(a) + stepR * i)
    if (sq) out.push(sq)
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
//  Lecture de la position
// ─────────────────────────────────────────────────────────────────────────────

export interface PlacedPiece {
  square: Square
  type: PieceSymbol
  color: Color
}

/** Toutes les pièces posées sur l'échiquier. */
export function listPieces(chess: Chess, color?: Color): PlacedPiece[] {
  const out: PlacedPiece[] = []
  for (const square of ALL_SQUARES) {
    const piece = chess.get(square)
    if (!piece) continue
    if (color && piece.color !== color) continue
    out.push({ square, type: piece.type, color: piece.color })
  }
  return out
}

export function kingSquare(chess: Chess, color: Color): Square | null {
  const found = chess.findPiece({ type: 'k', color })
  return found[0] ?? null
}

/** Somme du matériel d'un camp, en centipions (roi exclu). */
export function materialValue(chess: Chess, color: Color): number {
  let total = 0
  for (const p of listPieces(chess, color)) {
    if (p.type === 'k') continue
    total += PIECE_VALUES[p.type]
  }
  return total
}

/** Différence de matériel, positive si les Blancs mènent. */
export function materialBalance(chess: Chess): number {
  return materialValue(chess, 'w') - materialValue(chess, 'b')
}

/** Décompte des pièces capturées, pour l'affichage « pièces prises ». */
export function capturedPieces(chess: Chess): Record<Color, PieceSymbol[]> {
  const initial: Record<PieceSymbol, number> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 }
  const result: Record<Color, PieceSymbol[]> = { w: [], b: [] }
  for (const color of ['w', 'b'] as const) {
    const counts: Record<string, number> = { ...initial }
    for (const p of listPieces(chess, color)) counts[p.type] = (counts[p.type] ?? 0) - 1
    for (const [type, missing] of Object.entries(counts)) {
      for (let i = 0; i < missing; i++) {
        // Une pièce manquante du camp `color` a été capturée par l'adversaire.
        result[color === 'w' ? 'b' : 'w'].push(type as PieceSymbol)
      }
    }
  }
  return result
}

/**
 * Phase de la partie, déduite du matériel restant.
 *
 * On utilise le décompte de « phase » classique : chaque pièce lourde ou légère
 * compte, les pions ne comptent pas. Une position sans dames avec peu de pièces
 * est une finale, même au coup 15.
 */
export function gamePhase(chess: Chess): GamePhase {
  let phaseUnits = 0
  let pieceCount = 0
  for (const p of listPieces(chess)) {
    if (p.type === 'k' || p.type === 'p') continue
    pieceCount++
    phaseUnits += p.type === 'q' ? 4 : p.type === 'r' ? 2 : 1
  }
  if (phaseUnits <= 6) return 'endgame'
  if (chess.moveNumber() <= 12 && pieceCount >= 12) return 'opening'
  return 'middlegame'
}

// ─────────────────────────────────────────────────────────────────────────────
//  Contrôle des cases et pièces en prise
// ─────────────────────────────────────────────────────────────────────────────

/** Nombre d'attaquants d'une case pour un camp donné. */
export function attackerCount(chess: Chess, square: Square, by: Color): number {
  return chess.attackers(square, by).length
}

export function opposite(color: Color): Color {
  return color === 'w' ? 'b' : 'w'
}

/**
 * Échange statique (Static Exchange Evaluation).
 *
 * Simule la série complète des captures sur une case et retourne le gain net
 * en centipions pour celui qui capture en premier. C'est ce qui distingue un
 * vrai sacrifice d'une simple bourde : `Fxh7+` avec SEE = −333 est un sacrifice,
 * `Dxd5` avec SEE = 0 est un échange équitable.
 *
 * L'implémentation retire réellement les pièces d'une copie de l'échiquier, ce
 * qui fait apparaître naturellement les attaquants en rayons X (une tour
 * derrière une tour, une dame derrière un fou).
 *
 * @returns gain net pour `side`, en centipions
 */
export function staticExchange(fen: string, target: Square, side: Color): number {
  const board = new Chess(fen, { skipValidation: true })
  if (!board.get(target)) return 0
  return exchangeValue(board, target, side, 0)
}

/**
 * Cœur récursif de l'échange statique.
 *
 * À chaque niveau, le camp au trait capture avec sa pièce la moins chère, puis
 * l'adversaire décide s'il recapture. Le `Math.max(0, …)` matérialise ce choix :
 * personne n'est obligé de recapturer si c'est perdant. La récursion s'arrête
 * naturellement quand la case n'est plus attaquée.
 *
 * Les pièces sont réellement retirées puis remises sur l'échiquier, ce qui fait
 * apparaître les attaquants masqués (tour derrière tour, dame derrière fou).
 */
function exchangeValue(board: Chess, target: Square, side: Color, depth: number): number {
  if (depth > 32) return 0

  const attackers = board.attackers(target, side)
  if (attackers.length === 0) return 0

  // Pièce la moins chère d'abord : c'est la règle de base d'un bon échange.
  let fromSquare: Square | null = null
  let cheapest = Infinity
  for (const sq of attackers) {
    const p = board.get(sq)
    if (!p) continue
    // Le roi ne peut capturer que si la case n'est plus défendue ensuite.
    if (p.type === 'k' && board.attackers(target, opposite(side)).length > 0) continue
    const v = PIECE_VALUES[p.type]
    if (v < cheapest) {
      cheapest = v
      fromSquare = sq
    }
  }
  if (!fromSquare) return 0

  const attacker = board.get(fromSquare)
  const captured = board.get(target)
  if (!attacker || !captured) return 0

  // Exécution de la capture.
  board.remove(fromSquare)
  board.remove(target)
  board.put({ type: attacker.type, color: attacker.color }, target)

  const gain = Math.max(
    0,
    PIECE_VALUES[captured.type] - exchangeValue(board, target, opposite(side), depth + 1),
  )

  // Restauration de la position d'origine.
  board.remove(target)
  board.put({ type: captured.type, color: captured.color }, target)
  board.put({ type: attacker.type, color: attacker.color }, fromSquare)

  return gain
}

/** Une pièce menacée, avec le verdict de l'échange. */
export interface HangingPiece {
  square: Square
  type: PieceSymbol
  color: Color
  /** Gain net de l'adversaire s'il capture, en centipions. Toujours > 0. */
  gain: number
  /** Cases d'où part l'attaque. */
  attackedFrom: Square[]
  /** Vrai si la pièce n'est défendue par personne. */
  undefended: boolean
}

/**
 * Pièces d'un camp que l'adversaire peut gagner par une simple capture.
 *
 * On ne se contente pas de « attaquée et non défendue » : on passe par l'échange
 * statique, ce qui attrape aussi les cas où la pièce est défendue mais où
 * l'échange reste gagnant (une dame défendue par un pion mais attaquée par une
 * tour, par exemple).
 */
export function findHangingPieces(chess: Chess, color: Color): HangingPiece[] {
  const fen = chess.fen()
  const enemy = opposite(color)
  const out: HangingPiece[] = []
  for (const piece of listPieces(chess, color)) {
    if (piece.type === 'k') continue
    const attackers = chess.attackers(piece.square, enemy)
    if (attackers.length === 0) continue
    const gain = staticExchange(fen, piece.square, enemy)
    if (gain <= 0) continue
    out.push({
      square: piece.square,
      type: piece.type,
      color,
      gain,
      attackedFrom: attackers,
      undefended: chess.attackers(piece.square, color).length === 0,
    })
  }
  return out.sort((a, b) => b.gain - a.gain)
}

/**
 * Cases sur lesquelles un camp peut poser une pièce sans risque immédiat.
 * Sert aux explications du type « cette case est un avant-poste ».
 */
export function isSafeSquare(chess: Chess, square: Square, color: Color): boolean {
  const enemy = opposite(color)
  if (chess.attackers(square, enemy).length === 0) return true
  // Attaquée mais suffisamment défendue : on regarde l'échange.
  return staticExchange(chess.fen(), square, enemy) <= 0
}

// ─────────────────────────────────────────────────────────────────────────────
//  Menaces
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ce que l'adversaire menace de faire s'il avait le trait.
 *
 * On donne le trait à l'adversaire dans une copie de la position et on regarde
 * ses meilleures captures. Techniquement c'est un « coup nul » ; il faut donc
 * ignorer le résultat quand le camp au trait est en échec, car la position
 * inversée serait illégale.
 */
export function opponentThreats(
  chess: Chess,
  color: Color,
): Array<{ san: string; from: Square; to: Square; gain: number }> {
  if (chess.inCheck()) return []
  const enemy = opposite(color)
  const mirrored = new Chess(chess.fen(), { skipValidation: true })
  if (mirrored.turn() !== enemy) {
    mirrored.setTurn(enemy)
    // Un pion en passe hérité de la position d'origine n'a plus de sens ici.
  }
  let moves
  try {
    moves = mirrored.moves({ verbose: true })
  } catch {
    return []
  }
  const fen = mirrored.fen()
  const threats: Array<{ san: string; from: Square; to: Square; gain: number }> = []
  for (const move of moves) {
    if (!move.captured) continue
    const gain = staticExchange(fen, move.to, enemy)
    if (gain >= 100) {
      threats.push({ san: move.san, from: move.from, to: move.to, gain })
    }
  }
  return threats.sort((a, b) => b.gain - a.gain).slice(0, 5)
}

/** Vrai s'il existe un mat en un pour le camp au trait. */
export function findMateInOne(chess: Chess): string | null {
  for (const move of chess.moves({ verbose: true })) {
    const probe = new Chess(move.after, { skipValidation: true })
    if (probe.isCheckmate()) return move.san
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
//  Structure de pions
// ─────────────────────────────────────────────────────────────────────────────

export interface PawnStructure {
  /** Pions passés : aucun pion adverse ne peut plus les arrêter. */
  passed: Square[]
  /** Pions isolés : aucun pion ami sur les colonnes adjacentes. */
  isolated: Square[]
  /** Pions doublés (on ne liste que les doublons). */
  doubled: Square[]
  /** Pions arriérés : ne peuvent plus être soutenus par un pion ami. */
  backward: Square[]
  /** Colonnes sans aucun pion des deux camps. */
  openFiles: string[]
  /** Colonnes sans pion ami mais avec un pion adverse. */
  semiOpenFiles: string[]
}

export function analysePawns(chess: Chess, color: Color): PawnStructure {
  const own = listPieces(chess, color).filter((p) => p.type === 'p')
  const enemyPawns = listPieces(chess, opposite(color)).filter((p) => p.type === 'p')
  const ownFiles = new Set(own.map((p) => fileIndex(p.square)))
  const enemyFiles = new Set(enemyPawns.map((p) => fileIndex(p.square)))

  const passed: Square[] = []
  const isolated: Square[] = []
  const doubled: Square[] = []
  const backward: Square[] = []

  const perFile = new Map<number, PlacedPiece[]>()
  for (const p of own) {
    const f = fileIndex(p.square)
    const list = perFile.get(f) ?? []
    list.push(p)
    perFile.set(f, list)
  }

  for (const [, list] of perFile) {
    if (list.length > 1) {
      // On ne signale que les pions en surnombre sur la colonne.
      for (const p of list.slice(1)) doubled.push(p.square)
    }
  }

  for (const pawn of own) {
    const f = fileIndex(pawn.square)
    const rank = relativeRank(pawn.square, color)

    // Isolé : ni colonne à gauche ni colonne à droite occupée par un pion ami.
    if (!ownFiles.has(f - 1) && !ownFiles.has(f + 1)) isolated.push(pawn.square)

    // Passé : aucun pion adverse devant, ni sur la colonne ni sur les voisines.
    const blockers = enemyPawns.filter((e) => {
      const ef = fileIndex(e.square)
      if (Math.abs(ef - f) > 1) return false
      return relativeRank(e.square, color) > rank
    })
    if (blockers.length === 0) passed.push(pawn.square)

    // Arriéré : aucun pion ami adjacent n'est à sa hauteur ou en retrait, et la
    // case devant est contrôlée par un pion adverse.
    const supports = own.filter((o) => {
      const of = fileIndex(o.square)
      if (Math.abs(of - f) !== 1) return false
      return relativeRank(o.square, color) <= rank
    })
    if (supports.length === 0) {
      const forward = squareFrom(f, rankIndex(pawn.square) + (color === 'w' ? 1 : -1))
      if (forward) {
        const controlledByEnemyPawn = chess
          .attackers(forward, opposite(color))
          .some((sq) => chess.get(sq)?.type === 'p')
        if (controlledByEnemyPawn) backward.push(pawn.square)
      }
    }
  }

  const openFiles: string[] = []
  const semiOpenFiles: string[] = []
  for (let f = 0; f < 8; f++) {
    const letter = String.fromCharCode(97 + f)
    if (!ownFiles.has(f) && !enemyFiles.has(f)) openFiles.push(letter)
    else if (!ownFiles.has(f) && enemyFiles.has(f)) semiOpenFiles.push(letter)
  }

  return { passed, isolated, doubled, backward, openFiles, semiOpenFiles }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Sécurité du roi
// ─────────────────────────────────────────────────────────────────────────────

export interface KingSafety {
  square: Square | null
  /** Score 0 (très exposé) à 100 (forteresse). */
  score: number
  /** Pions du bouclier encore présents (max 3). */
  shieldPawns: number
  /** Cases autour du roi contrôlées par l'adversaire. */
  attackedSquares: Square[]
  /** Le roi a-t-il roqué ? Déduit de sa position. */
  castled: boolean
  /** Vrai si la dernière rangée n'a pas de case de fuite (mat du couloir). */
  backRankWeak: boolean
}

export function analyseKingSafety(chess: Chess, color: Color): KingSafety {
  const square = kingSquare(chess, color)
  if (!square) {
    return {
      square: null,
      score: 0,
      shieldPawns: 0,
      attackedSquares: [],
      castled: false,
      backRankWeak: false,
    }
  }

  const enemy = opposite(color)
  const f = fileIndex(square)
  const r = rankIndex(square)
  const homeRank = color === 'w' ? 0 : 7
  const forward = color === 'w' ? 1 : -1

  // Bouclier de pions : les trois cases devant le roi.
  let shieldPawns = 0
  for (let df = -1; df <= 1; df++) {
    for (let dr = 1; dr <= 2; dr++) {
      const sq = squareFrom(f + df, r + forward * dr)
      if (!sq) continue
      const p = chess.get(sq)
      if (p && p.type === 'p' && p.color === color) {
        shieldPawns += dr === 1 ? 1 : 0.5
        break
      }
    }
  }
  shieldPawns = Math.min(3, shieldPawns)

  // Cases adjacentes contrôlées par l'adversaire.
  const attackedSquares: Square[] = []
  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (df === 0 && dr === 0) continue
      const sq = squareFrom(f + df, r + dr)
      if (!sq) continue
      if (chess.attackers(sq, enemy).length > 0) attackedSquares.push(sq)
    }
  }

  const castled = r === homeRank && (f <= 2 || f >= 6)

  // Mat du couloir : roi sur sa rangée, toutes les cases de fuite bouchées.
  let backRankWeak = false
  if (r === homeRank) {
    let escapes = 0
    for (let df = -1; df <= 1; df++) {
      const sq = squareFrom(f + df, r + forward)
      if (!sq) continue
      const p = chess.get(sq)
      if (!p) escapes++
      else if (p.color !== color) escapes++
    }
    backRankWeak = escapes === 0
  }

  // Composition du score : bouclier, exposition, roque, couloir.
  let score = 50
  score += shieldPawns * 12
  score -= attackedSquares.length * 6
  score += castled ? 10 : -8
  score -= backRankWeak ? 10 : 0
  const openNearKing = analysePawns(chess, color).openFiles.filter(
    (letter) => Math.abs(letter.charCodeAt(0) - 97 - f) <= 1,
  ).length
  score -= openNearKing * 8

  return {
    square,
    score: Math.max(0, Math.min(100, Math.round(score))),
    shieldPawns,
    attackedSquares,
    castled,
    backRankWeak,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Développement et centre
// ─────────────────────────────────────────────────────────────────────────────

/** Nombre de pièces mineures encore sur leur case de départ. */
export function undevelopedPieces(chess: Chess, color: Color): Square[] {
  const backRank = color === 'w' ? '1' : '8'
  const homes: Square[] = (['b', 'c', 'f', 'g'] as const).map(
    (file) => `${file}${backRank}` as Square,
  )
  return homes.filter((sq) => {
    const p = chess.get(sq)
    return !!p && p.color === color && (p.type === 'n' || p.type === 'b')
  })
}

const CENTRE_SQUARES: Square[] = ['d4', 'd5', 'e4', 'e5']
const EXTENDED_CENTRE: Square[] = [
  'c3',
  'c4',
  'c5',
  'c6',
  'd3',
  'd4',
  'd5',
  'd6',
  'e3',
  'e4',
  'e5',
  'e6',
  'f3',
  'f4',
  'f5',
  'f6',
]

/** Score de contrôle du centre : cases centrales attaquées ou occupées. */
export function centreControl(chess: Chess, color: Color): number {
  let score = 0
  for (const sq of CENTRE_SQUARES) {
    score += chess.attackers(sq, color).length * 2
    const p = chess.get(sq)
    if (p && p.color === color) score += p.type === 'p' ? 3 : 2
  }
  for (const sq of EXTENDED_CENTRE) {
    score += chess.attackers(sq, color).length * 0.5
  }
  return Math.round(score)
}

/**
 * Mobilité : nombre de coups légaux pseudo-disponibles pour un camp.
 * Approxime l'« espace » et la liberté de manœuvre.
 */
export function mobility(chess: Chess, color: Color): number {
  if (chess.turn() === color) return chess.moves().length
  const mirrored = new Chess(chess.fen(), { skipValidation: true })
  if (chess.inCheck()) return 0
  mirrored.setTurn(color)
  try {
    return mirrored.moves().length
  } catch {
    return 0
  }
}

/** Vrai si les deux camps ont roqué de côtés opposés (attaques à l'aile). */
export function hasOppositeCastling(chess: Chess): boolean {
  const wk = kingSquare(chess, 'w')
  const bk = kingSquare(chess, 'b')
  if (!wk || !bk) return false
  const wSide = fileIndex(wk) <= 3 ? 'q' : fileIndex(wk) >= 5 ? 'k' : null
  const bSide = fileIndex(bk) <= 3 ? 'q' : fileIndex(bk) >= 5 ? 'k' : null
  return wSide !== null && bSide !== null && wSide !== bSide
}

// ─────────────────────────────────────────────────────────────────────────────
//  Chute du drapeau (article 6.9 des règles de la FIDE)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vrai si `color` dispose encore de quoi mater, par n'importe quelle suite de
 * coups légaux — même avec la complicité de l'adversaire.
 *
 * C'est la question que pose l'article 6.9 : celui dont le drapeau tombe perd,
 * **sauf** si l'adversaire ne peut plus mater, auquel cas la partie est nulle.
 * Un roi seul, un roi et une pièce mineure, ou des fous tous sur la même
 * couleur ne matent jamais. Deux cavaliers, si : le mat existe, il n'est
 * simplement pas forcé — et l'article parle de « n'importe quelle suite de
 * coups légaux », pas d'une suite forcée.
 *
 * Un pion compte comme une dame en puissance ; une tour ou une dame suffisent.
 */
export function peutEncoreMater(chess: Chess, color: Color): boolean {
  const pieces = listPieces(chess, color).filter((p) => p.type !== 'k')
  if (pieces.length === 0) return false
  if (pieces.some((p) => p.type === 'p' || p.type === 'r' || p.type === 'q')) return true
  const knights = pieces.filter((p) => p.type === 'n')
  const bishops = pieces.filter((p) => p.type === 'b')
  if (knights.length >= 2) return true
  if (knights.length === 1) return bishops.length > 0
  // Que des fous : il en faut deux sur des couleurs différentes.
  const shades = new Set(bishops.map((b) => squareShade(b.square)))
  return shades.size >= 2
}

/**
 * Résultat d'une chute de drapeau : défaite du camp tombé, ou nulle si
 * l'adversaire ne pouvait plus mater. À appeler partout où un drapeau tombe —
 * serveur, partie contre l'ordinateur, partie locale — pour que les trois
 * disent la même chose.
 */
export function resultatAuDrapeau(chess: Chess, flagged: Color): '1-0' | '0-1' | '1/2-1/2' {
  if (!peutEncoreMater(chess, opposite(flagged))) return '1/2-1/2'
  return flagged === 'w' ? '0-1' : '1-0'
}
