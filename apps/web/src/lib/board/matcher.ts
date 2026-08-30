/**
 * Du plateau en bois au coup joué.
 *
 * Une carte électronique n'envoie pas des coups : elle envoie des photos de
 * l'occupation des cases, plusieurs par seconde, y compris pendant qu'une
 * pièce est en l'air. Tout le travail consiste à décider ce qu'une photo veut
 * dire, et la règle qui évite tous les pièges tient en une phrase :
 *
 *   **on ne cherche jamais quelle case a changé, on cherche quel coup légal
 *   produirait exactement cette photo.**
 *
 * C'est ce qui règle d'un coup le roque (deux pièces bougent), la prise en
 * passant (une case vide loin de l'arrivée), la prise (on repose souvent la
 * pièce prenante avant d'avoir retiré la prise) et la promotion.
 */

import type { Chess, Move, PieceSymbol } from 'chess.js'
import { SQUARES, UNKNOWN_PIECE, squareIndex, type Occupancy } from './types.ts'

export type BoardMatch =
  /** La carte montre exactement la position de la partie. */
  | { kind: 'ready' }
  /** Un coup légal explique la photo. */
  | { kind: 'move'; from: string; to: string; promotion?: PieceSymbol; askPromotion: boolean }
  /** Des pièces sont levées, rien n'est encore posé : on attend. */
  | { kind: 'lifted'; squares: string[] }
  /** La photo ne correspond à rien de légal : cases à corriger. */
  | { kind: 'mismatch'; squares: string[] }

/** Occupation des cases décrite par un FEN. */
export function occupancyFromFen(fen: string): Occupancy {
  const placement = fen.split(' ')[0] ?? ''
  const squares: (string | null)[] = []
  for (const row of placement.split('/')) {
    for (const character of row) {
      if (character >= '1' && character <= '8') {
        for (let i = 0; i < Number(character); i++) squares.push(null)
      } else {
        squares.push(character)
      }
    }
  }
  while (squares.length < 64) squares.push(null)
  return squares.slice(0, 64)
}

/** Occupation des cases, type des pièces effacé — ce que voit une carte à simple détection de présence. */
export function blurOccupancy(occupancy: Occupancy): Occupancy {
  return occupancy.map((piece) => (piece === null ? null : UNKNOWN_PIECE))
}

/**
 * La photo correspond-elle à la position attendue ?
 *
 * `'?'` — pièce dont la carte ignore le type — s'accorde avec n'importe quelle
 * pièce. Une carte à simple présence n'a donc besoin d'aucun traitement
 * particulier : elle produit une photo entièrement faite de `'?'`.
 */
function sameOccupancy(expected: Occupancy, snapshot: Occupancy, ignoreTypes = false): boolean {
  for (let index = 0; index < 64; index++) {
    const left = expected[index] ?? null
    const right = snapshot[index] ?? null
    if ((left === null) !== (right === null)) return false
    if (left === null) continue
    if (ignoreTypes || right === UNKNOWN_PIECE || left === UNKNOWN_PIECE) continue
    if (left !== right) return false
  }
  return true
}

/**
 * Occupation des cases après un coup, sans repasser par chess.js.
 *
 * On applique le coup à la main plutôt que de cloner l'échiquier pour chaque
 * coup légal : une position en compte jusqu'à une bonne quarantaine, et la
 * comparaison tourne à chaque photo reçue — plusieurs fois par seconde.
 */
export function occupancyAfter(before: Occupancy, move: Move): Occupancy {
  const after = [...before]
  const from = squareIndex(move.from)
  const to = squareIndex(move.to)
  if (from < 0 || to < 0) return after

  const symbol = move.promotion ?? move.piece
  const piece = move.color === 'w' ? symbol.toUpperCase() : symbol.toLowerCase()

  after[from] = null
  after[to] = piece

  // Prise en passant : la case vidée n'est ni le départ ni l'arrivée.
  if (move.flags.includes('e')) {
    const captured = squareIndex(`${move.to[0]}${move.from[1]}`)
    if (captured >= 0) after[captured] = null
  }

  // Roque : la tour bouge aussi, et c'est le cas où la lecture case par case
  // se trompe systématiquement.
  if (move.flags.includes('k') || move.flags.includes('q')) {
    const rank = move.from[1]
    const kingSide = move.flags.includes('k')
    const rookFrom = squareIndex(`${kingSide ? 'h' : 'a'}${rank}`)
    const rookTo = squareIndex(`${kingSide ? 'f' : 'd'}${rank}`)
    const rook = move.color === 'w' ? 'R' : 'r'
    if (rookFrom >= 0) after[rookFrom] = null
    if (rookTo >= 0) after[rookTo] = rook
  }

  return after
}

/**
 * Décide ce que raconte une photo.
 *
 * `chess` doit être la position **réelle** de la partie, pas celle qu'on
 * regarde en naviguant dans l'historique.
 */
export function matchSnapshot(chess: Chess, snapshot: Occupancy): BoardMatch {
  const expected = occupancyFromFen(chess.fen())
  if (sameOccupancy(expected, snapshot)) return { kind: 'ready' }

  const legal = chess.moves({ verbose: true }) as Move[]

  // Premier passage : la photo doit correspondre au type des pièces près.
  const exact = legal.filter((move) => sameOccupancy(occupancyAfter(expected, move), snapshot))
  const resolved = resolve(exact)
  if (resolved) return resolved

  // Second passage, en ignorant les types. Deux cas le demandent : la carte
  // qui ne détecte que la présence, et le joueur qui pousse son pion à dame
  // sans avoir de dame sous la main — il pose le pion, la carte annonce un
  // pion sur la huitième rangée, aucune promotion ne correspond.
  const loose = legal.filter((move) => sameOccupancy(occupancyAfter(expected, move), snapshot, true))
  const looseResolved = resolve(loose)
  if (looseResolved) return looseResolved

  // Rien de légal : soit des pièces sont en l'air, soit le plateau a dérivé.
  const lifted: string[] = []
  let extra = false
  for (let index = 0; index < 64; index++) {
    const before = expected[index] ?? null
    const now = snapshot[index] ?? null
    if (before !== null && now === null) lifted.push(SQUARES[index] as string)
    else if (before === null && now !== null) extra = true
    else if (before !== null && now !== null && now !== UNKNOWN_PIECE && before !== now) extra = true
  }
  if (!extra && lifted.length > 0) return { kind: 'lifted', squares: lifted }

  return { kind: 'mismatch', squares: differingSquares(expected, snapshot) }
}

/**
 * Un ensemble de coups candidats se résout-il en un seul coup jouable ?
 *
 * Plusieurs candidats ne sont pas forcément une ambiguïté : les quatre
 * promotions d'un même pion produisent la même photo sur une carte qui ne lit
 * pas les types. Le départ et l'arrivée sont alors connus, c'est la pièce qu'il
 * faut demander à l'écran.
 */
function resolve(candidates: Move[]): BoardMatch | null {
  if (candidates.length === 0) return null
  const first = candidates[0] as Move
  if (candidates.length === 1) {
    return {
      kind: 'move',
      from: first.from,
      to: first.to,
      promotion: first.promotion,
      askPromotion: false,
    }
  }
  const sameMove = candidates.every((move) => move.from === first.from && move.to === first.to)
  if (!sameMove) return null
  return { kind: 'move', from: first.from, to: first.to, askPromotion: true }
}

/** Cases sur lesquelles le plateau et la partie ne sont pas d'accord. */
export function differingSquares(expected: Occupancy, snapshot: Occupancy): string[] {
  const squares: string[] = []
  for (let index = 0; index < 64; index++) {
    const left = expected[index] ?? null
    const right = snapshot[index] ?? null
    const differs =
      (left === null) !== (right === null) ||
      (left !== null &&
        right !== null &&
        right !== UNKNOWN_PIECE &&
        left !== UNKNOWN_PIECE &&
        left !== right)
    if (differs) squares.push(SQUARES[index] as string)
  }
  return squares
}

/**
 * Sens dans lequel la carte est posée.
 *
 * Retourner l'échiquier physique est un geste normal — on le fait pour jouer
 * les Noirs. Plutôt que d'imposer un sens, on compare la photo à la position
 * attendue dans les deux orientations.
 */
export function detectFlip(expected: Occupancy, snapshot: Occupancy): boolean | null {
  const straight = sameOccupancy(expected, snapshot)
  const flipped = sameOccupancy(expected, [...snapshot].reverse())
  if (straight === flipped) return null
  return flipped
}
