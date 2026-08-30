/**
 * Protocole Certabo — également celui des TabuTronic Cerno et Sentio.
 *
 * Ouvert, et d'une simplicité rare : la carte crache en continu des nombres
 * décimaux séparés par des espaces, une trame par ligne.
 *
 *  - 320 nombres — 64 cases × un identifiant RFID de 5 octets. La carte ne dit
 *    pas « un cavalier blanc » mais « la puce 12 7 33 0 91 » : il faut donc un
 *    étalonnage, une fois, depuis la position de départ.
 *  - 8 nombres — un octet par rangée, un bit par case. C'est le Sentio, qui ne
 *    détecte que la présence.
 *
 * Dans les deux cas la première case est `a1`.
 */

import { SQUARES, UNKNOWN_PIECE, squareCoords, type Occupancy } from '../types.ts'

/** Débit d'une carte Certabo. */
export const CERTABO_BAUD = 38400

/** Position de départ, dans l'ordre FEN — référence de l'étalonnage. */
const START_PIECES: readonly (string | null)[] = [
  'r', 'n', 'b', 'q', 'k', 'b', 'n', 'r',
  'p', 'p', 'p', 'p', 'p', 'p', 'p', 'p',
  null, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null,
  'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P',
  'R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R',
]

/** Identifiant d'une puce RFID, ou `''` pour une case vide. */
export type PieceId = string

/** Étalonnage : à quelle pièce correspond chaque puce. */
export type CertaboCalibration = Readonly<Record<PieceId, string>>

export type CertaboFrame =
  | { kind: 'ids'; ids: PieceId[] }
  | { kind: 'occupancy'; squares: Occupancy }

/** Indice dans l'ordre FEN d'une case lue dans l'ordre Certabo (`a1` en tête). */
function toFenIndex(order: number): number {
  return (7 - Math.floor(order / 8)) * 8 + (order % 8)
}

export class CertaboParser {
  private buffer = ''

  push(bytes: Uint8Array): CertaboFrame[] {
    for (const byte of bytes) this.buffer += String.fromCharCode(byte)
    const frames: CertaboFrame[] = []

    let breakAt = this.buffer.indexOf('\n')
    while (breakAt >= 0) {
      const line = this.buffer.slice(0, breakAt)
      this.buffer = this.buffer.slice(breakAt + 1)
      const frame = parseLine(line)
      if (frame) frames.push(frame)
      breakAt = this.buffer.indexOf('\n')
    }

    // Une ligne qui n'arrive jamais ne doit pas faire enfler la mémoire.
    if (this.buffer.length > 4096) this.buffer = ''
    return frames
  }
}

function parseLine(line: string): CertaboFrame | null {
  // `:` ouvre la trame ; `L` et `D` annoncent le type de LEDs présentes.
  const cleaned = line.replace(/[:LD\r]/g, ' ').trim()
  if (cleaned.length === 0) return null

  const parts = cleaned.split(/\s+/)
  if (parts.some((part) => !/^\d+$/.test(part))) return null

  if (parts.length >= 320) {
    const ids: PieceId[] = new Array(64).fill('')
    for (let order = 0; order < 64; order++) {
      const chunk = parts.slice(order * 5, order * 5 + 5)
      const id = chunk.join(' ')
      ids[toFenIndex(order)] = id === '0 0 0 0 0' ? '' : id
    }
    return { kind: 'ids', ids }
  }

  if (parts.length >= 8) {
    const squares: (string | null)[] = new Array(64).fill(null)
    for (let row = 0; row < 8; row++) {
      const value = Number(parts[row])
      for (let column = 0; column < 8; column++) {
        // Le bit de poids fort porte la colonne `a`.
        if ((value & (1 << (7 - column))) !== 0) squares[toFenIndex(row * 8 + column)] = UNKNOWN_PIECE
      }
    }
    return { kind: 'occupancy', squares }
  }

  return null
}

/**
 * Apprend les puces depuis la position de départ.
 *
 * C'est le prix du modèle Certabo : la carte sait *quelle* pièce est où, mais
 * seulement une fois qu'on lui a dit à quoi ressemble un cavalier. On demande
 * donc, à la première connexion, de poser les 32 pièces en position initiale.
 * Retourne `null` si le plateau n'y est pas.
 */
export function calibrate(ids: readonly PieceId[]): CertaboCalibration | null {
  const calibration: Record<PieceId, string> = {}
  for (let index = 0; index < 64; index++) {
    const id = ids[index] ?? ''
    const piece = START_PIECES[index] ?? null
    if ((id === '') !== (piece === null)) return null
    if (id !== '' && piece !== null) calibration[id] = piece
  }
  return calibration
}

/** Traduit les puces lues en position, à partir d'un étalonnage. */
export function occupancyFromIds(
  ids: readonly PieceId[],
  calibration: CertaboCalibration,
): Occupancy {
  const squares: (string | null)[] = []
  for (let index = 0; index < 64; index++) {
    const id = ids[index] ?? ''
    if (id === '') squares.push(null)
    else squares.push(calibration[id] ?? UNKNOWN_PIECE)
  }
  return squares
}

/**
 * Encode l'allumage des LEDs : huit octets, un par rangée en partant de la
 * première, le bit de poids fort portant la colonne `a`.
 */
export function encodeCertaboLights(squares: readonly string[]): Uint8Array {
  const payload = new Uint8Array(8)
  for (const square of squares) {
    const coords = squareCoords(square)
    if (!coords) continue
    const row = coords.rank - 1
    payload[row] = (payload[row] ?? 0) | (128 >> coords.file)
  }
  return payload
}

/** Encode une trame de puces — pour le simulateur et les tests. */
export function encodeCertaboIds(ids: readonly PieceId[]): string {
  const parts: string[] = []
  for (let order = 0; order < 64; order++) {
    parts.push(ids[toFenIndex(order)] || '0 0 0 0 0')
  }
  return `:${parts.join(' ')}\r\n`
}

/** Puces fictives correspondant à la position de départ — pour les tests. */
export function startPositionIds(): PieceId[] {
  return START_PIECES.map((piece, index) => (piece === null ? '' : `1 0 0 0 ${index}`))
}

/** Encode une trame d'occupation à la mode Sentio — pour les tests. */
export function encodeCertaboOccupancy(occupancy: Occupancy): string {
  const rows: number[] = []
  for (let row = 0; row < 8; row++) {
    let value = 0
    for (let column = 0; column < 8; column++) {
      if ((occupancy[toFenIndex(row * 8 + column)] ?? null) !== null) value |= 128 >> column
    }
    rows.push(value)
  }
  return `:${rows.join(' ')}\r\n`
}

/** Toutes les cases, pour l'étalonnage guidé. */
export const CERTABO_START_SQUARES = SQUARES.filter((_, index) => START_PIECES[index] !== null)
