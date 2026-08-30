/**
 * Protocole Chessnut (Air, Air+, Pro, Go, Evo).
 *
 * Non officiel, mais entièrement documenté par la communauté et stable depuis
 * des années. La carte pousse une trame de 38 octets à chaque changement :
 * `01 24` puis 32 octets de position, un quartet par case.
 *
 * Aucune API navigateur ici — ce fichier est du calcul pur, testable en Node.
 */

import { SQUARES, squareCoords, type Occupancy } from '../types.ts'

/** Services et caractéristiques BLE, tels que la carte les expose. */
export const CHESSNUT_BLE = {
  boardService: '1b7e8261-2877-41c3-b46e-cf057c562023',
  boardData: '1b7e8262-2877-41c3-b46e-cf057c562023',
  commandService: '1b7e8271-2877-41c3-b46e-cf057c562023',
  write: '1b7e8272-2877-41c3-b46e-cf057c562023',
  misc: '1b7e8273-2877-41c3-b46e-cf057c562023',
} as const

/** Sans ces trois octets, la carte reste muette. */
export const CHESSNUT_INIT = Uint8Array.of(0x21, 0x01, 0x00)

/** En-tête d'une trame de position. */
const HEADER = [0x01, 0x24] as const

/** Table des pièces : l'indice est la valeur du quartet. */
const PIECES: readonly (string | null)[] = [
  null, 'q', 'k', 'b', 'p', 'n', 'R', 'P', 'r', 'B', 'N', 'Q', 'K',
]

/**
 * Décode une trame de position.
 *
 * Les 32 octets couvrent les cases dans l'ordre H8, G8 … B1, A1 ; dans chaque
 * octet, les quatre bits de poids faible portent la **première** case.
 * Retourne `null` si la trame n'en est pas une (la carte parle aussi batterie
 * et boutons sur d'autres caractéristiques).
 */
export function decodeChessnutFrame(frame: Uint8Array): Occupancy | null {
  if (frame.length < 34) return null
  if (frame[0] !== HEADER[0] || frame[1] !== HEADER[1]) return null

  const squares: (string | null)[] = new Array(64).fill(null)
  for (let byte = 0; byte < 32; byte++) {
    const value = frame[2 + byte] ?? 0
    place(squares, byte * 2, value & 0x0f)
    place(squares, byte * 2 + 1, value >> 4)
  }
  return squares
}

/** Range une case lue dans l'ordre Chessnut à sa place dans l'ordre FEN. */
function place(squares: (string | null)[], order: number, code: number): void {
  const rank = Math.floor(order / 8)
  const file = 7 - (order % 8)
  squares[rank * 8 + file] = PIECES[code] ?? null
}

/**
 * Encode l'allumage des LEDs.
 *
 * `0A 08` puis huit octets, un par rangée en partant de la huitième ; dans
 * chaque octet, la colonne `a` vaut 128 et la colonne `h` vaut 1.
 */
export function encodeChessnutLights(squares: readonly string[]): Uint8Array {
  const payload = new Uint8Array(10)
  payload[0] = 0x0a
  payload[1] = 0x08
  for (const square of squares) {
    const coords = squareCoords(square)
    if (!coords) continue
    const row = 8 - coords.rank
    payload[2 + row] = (payload[2 + row] ?? 0) | (128 >> coords.file)
  }
  return payload
}

/**
 * Encode une position en trame Chessnut — sert au simulateur et aux tests.
 *
 * Écrire l'encodeur à côté du décodeur coûte vingt lignes et permet de tout
 * vérifier sans la carte : c'est ce qui rend le développement possible avant
 * l'achat.
 */
export function encodeChessnutFrame(occupancy: Occupancy): Uint8Array {
  const codes = new Array<number>(64).fill(0)
  for (let index = 0; index < 64; index++) {
    const piece = occupancy[index] ?? null
    const code = piece === null ? 0 : PIECES.indexOf(piece)
    const coords = squareCoords(SQUARES[index] as string)
    if (!coords) continue
    const order = (8 - coords.rank) * 8 + (7 - coords.file)
    codes[order] = code < 0 ? 0 : code
  }
  const frame = new Uint8Array(38)
  frame[0] = HEADER[0]
  frame[1] = HEADER[1]
  for (let byte = 0; byte < 32; byte++) {
    frame[2 + byte] = ((codes[byte * 2] ?? 0) & 0x0f) | (((codes[byte * 2 + 1] ?? 0) & 0x0f) << 4)
  }
  return frame
}
