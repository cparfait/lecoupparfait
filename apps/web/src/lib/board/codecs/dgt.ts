/**
 * Protocole DGT (e-Board, Smart Board, USB-C) sur liaison série.
 *
 * Le plus ancien et le plus répandu — c'est celui des tournois. La carte
 * répond à des commandes d'un octet et renvoie des messages dont l'en-tête
 * tient en trois octets : identifiant (bit de poids fort à 1) puis la
 * longueur totale sur deux fois sept bits.
 *
 * Deux limites à connaître : ces cartes **n'ont pas de LEDs** — on ne peut
 * rien y montrer — et le protocole est couvert par le droit d'auteur de DGT,
 * dont l'en-tête interdit l'usage commercial sans accord écrit.
 */

import { SQUARES, type Occupancy } from '../types.ts'

/** Débit d'une carte DGT : 9600 bauds, 8 bits, sans parité. */
export const DGT_BAUD = 9600

export const DGT_COMMAND = {
  reset: 0x40,
  sendClock: 0x41,
  /** Renvoie une position complète, une fois. */
  sendBoard: 0x42,
  /** Passe en mode « mise à jour » : la carte signale chaque case qui change. */
  updateBoard: 0x44,
  /** Comme `update`, mais sans répéter la pendule inutilement. */
  updateNice: 0x4b,
  sendSerial: 0x45,
  sendVersion: 0x4d,
} as const

export const DGT_MESSAGE = {
  boardDump: 0x86,
  bwTime: 0x8d,
  fieldUpdate: 0x8e,
  serial: 0x91,
  trademark: 0x92,
  version: 0x93,
  battery: 0xa0,
} as const

/** Table des pièces DGT ; l'indice est le code renvoyé par la carte. */
const PIECES: readonly (string | null)[] = [
  null,
  'P',
  'R',
  'N',
  'B',
  'K',
  'Q',
  'p',
  'r',
  'n',
  'b',
  'k',
  'q',
]

export interface DgtMessage {
  id: number
  payload: Uint8Array
}

/**
 * Reconstitue les messages du flux série.
 *
 * On resynchronise sur le bit de poids fort : seul l'octet d'identifiant l'a
 * à 1, ce qui permet de repartir proprement après un branchement à chaud.
 */
export class DgtParser {
  private buffer: number[] = []

  push(bytes: Uint8Array): DgtMessage[] {
    for (const byte of bytes) this.buffer.push(byte)
    const messages: DgtMessage[] = []

    for (;;) {
      while (this.buffer.length > 0 && ((this.buffer[0] as number) & 0x80) === 0) {
        this.buffer.shift()
      }
      if (this.buffer.length < 3) break

      const id = this.buffer[0] as number
      const size = ((this.buffer[1] as number) << 7) | (this.buffer[2] as number)
      if (size < 3 || size > 8192) {
        // Longueur aberrante : l'octet de tête n'en était pas un.
        this.buffer.shift()
        continue
      }
      if (this.buffer.length < size) break

      messages.push({ id, payload: Uint8Array.from(this.buffer.slice(3, size)) })
      this.buffer = this.buffer.slice(size)
    }
    return messages
  }
}

/**
 * Décode une position complète.
 *
 * Les cases sont numérotées dans le sens de lecture, connecteur à gauche :
 * `a8` porte le numéro 0 — c'est déjà notre ordre.
 */
export function decodeDgtBoardDump(payload: Uint8Array): Occupancy | null {
  if (payload.length < 64) return null
  const squares: (string | null)[] = []
  for (let index = 0; index < 64; index++) squares.push(PIECES[payload[index] ?? 0] ?? null)
  return squares
}

/**
 * Applique un changement de case.
 *
 * En mode « mise à jour », la carte n'envoie plus la position entière : elle
 * signale les cases une par une, y compris quand une pièce est simplement
 * levée. On tient donc la position courante de notre côté.
 */
export function applyDgtFieldUpdate(occupancy: Occupancy, payload: Uint8Array): Occupancy {
  if (payload.length < 2) return occupancy
  const field = payload[0] as number
  if (field > 63) return occupancy
  const next = [...occupancy]
  next[field] = PIECES[payload[1] ?? 0] ?? null
  return next
}

/** Encode une position en message `board dump` — pour le simulateur et les tests. */
export function encodeDgtBoardDump(occupancy: Occupancy): Uint8Array {
  const size = 67
  const message = new Uint8Array(size)
  message[0] = DGT_MESSAGE.boardDump
  message[1] = (size & 0x3f80) >> 7
  message[2] = size & 0x7f
  for (let index = 0; index < 64; index++) {
    const piece = occupancy[index] ?? null
    const code = piece === null ? 0 : PIECES.indexOf(piece)
    message[3 + index] = code < 0 ? 0 : code
  }
  return message
}

/** Encode un changement de case — pour le simulateur et les tests. */
export function encodeDgtFieldUpdate(square: string, piece: string | null): Uint8Array {
  const field = SQUARES.indexOf(square)
  const code = piece === null ? 0 : PIECES.indexOf(piece)
  return Uint8Array.from([
    DGT_MESSAGE.fieldUpdate,
    0,
    5,
    field < 0 ? 0 : field,
    code < 0 ? 0 : code,
  ])
}
