/**
 * Protocole ChessLink de Millennium (Exclusive, Supreme Tournament 55,
 * King Performance, eONE).
 *
 * C'est le seul protocole du marché **publié par le fabricant** : tout est en
 * ASCII imprimable, chaque message porte un XOR de contrôle sur deux chiffres
 * hexadécimaux, et chaque caractère reçoit une parité impaire sur son bit de
 * poids fort. Sur liaison série c'est le pilote qui pose la parité ; en
 * Bluetooth, personne — on la pose donc nous-mêmes dans les deux cas.
 *
 * Longueurs de réponse : `v` 7, `s` 67, `l` 3, `x` 3, `w` 7, `r` 7.
 */

import { squareCoords, type Occupancy } from '../types.ts'

/** Service « UART transparent » Microchip, celui qu'utilise le module BLE. */
export const MILLENNIUM_BLE = {
  service: '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  /** La carte y pousse ses réponses. */
  notify: '49535343-1e4d-4bd9-ba61-23c647249616',
  /** On y écrit les commandes. */
  write: '49535343-8841-43f4-a8d4-ecbe34729bb3',
} as const

/** Débit de la liaison série : 38400, 8 bits, la parité étant posée à la main. */
export const MILLENNIUM_BAUD = 38400

const REPLY_LENGTHS: Readonly<Record<string, number>> = {
  v: 7,
  s: 67,
  l: 3,
  x: 3,
  w: 7,
  r: 7,
}

function hex2(value: number): string {
  return value.toString(16).toUpperCase().padStart(2, '0')
}

/** XOR de tous les caractères du message, hors octets de contrôle. */
function blockParity(body: string): string {
  let parity = 0
  for (const character of body) parity ^= character.charCodeAt(0) & 0x7f
  return hex2(parity)
}

/** Parité impaire sur le bit de poids fort, caractère par caractère. */
function addOddParity(character: string): number {
  const byte = character.charCodeAt(0) & 0x7f
  let parity = 1
  for (let bit = 0; bit < 7; bit++) parity ^= (byte >> bit) & 1
  return parity === 1 ? byte | 0x80 : byte
}

/** Prépare une commande complète : corps + contrôle + parité. */
export function millenniumCommand(body: string): Uint8Array {
  const message = body + blockParity(body)
  const bytes = new Uint8Array(message.length)
  for (let index = 0; index < message.length; index++) {
    bytes[index] = addOddParity(message[index] as string)
  }
  return bytes
}

/** Retire la parité : le bit de poids fort ne porte pas d'information. */
export function stripParity(bytes: Uint8Array): string {
  let text = ''
  for (const byte of bytes) text += String.fromCharCode(byte & 0x7f)
  return text
}

/**
 * Découpe le flux en réponses complètes.
 *
 * Les rapports automatiques peuvent s'insérer entre une commande et son
 * accusé : on ne peut donc pas attendre « la prochaine réponse », il faut
 * regarder la lettre de tête de chacune.
 */
export class MillenniumParser {
  private buffer = ''

  push(bytes: Uint8Array): string[] {
    this.buffer += stripParity(bytes)
    const replies: string[] = []
    while (this.buffer.length > 0) {
      const head = this.buffer[0] as string
      const length = REPLY_LENGTHS[head]
      if (length === undefined) {
        // Caractère parasite : on le jette et on resynchronise.
        this.buffer = this.buffer.slice(1)
        continue
      }
      if (this.buffer.length < length) break
      replies.push(this.buffer.slice(0, length))
      this.buffer = this.buffer.slice(length)
    }
    return replies
  }
}

const VALID_PIECES = 'KQRNBPkqrnbp'

/**
 * Décode une réponse d'état : `s` + 64 pièces (A8…H8, A7…H7, etc.) + contrôle.
 */
export function decodeMillenniumStatus(reply: string): Occupancy | null {
  if (reply.length !== 67 || reply[0] !== 's') return null
  const body = reply.slice(0, 65)
  if (blockParity(body) !== reply.slice(65)) return null

  const squares: (string | null)[] = []
  for (let index = 0; index < 64; index++) {
    const character = reply[1 + index] as string
    if (character === '.') squares.push(null)
    else if (VALID_PIECES.includes(character)) squares.push(character)
    else return null
  }
  return squares
}

/** Commande d'état, à envoyer quand on veut relire le plateau tout de suite. */
export const MILLENNIUM_STATUS = 'S'

/** Éteint les 81 LEDs. */
export const MILLENNIUM_LIGHTS_OFF = 'X'

/**
 * Demande à la carte de signaler d'elle-même les changements.
 *
 * Adresse 02, valeur 4 : « rapport à chaque changement, avec deux balayages
 * d'anti-rebond ». Sans cela, la carte envoie son état à *chaque* balayage —
 * vingt-cinq fois par seconde pour rien.
 */
export const MILLENNIUM_REPORT_ON_CHANGE = 'W0204'

/**
 * Encode l'allumage des LEDs.
 *
 * Les 81 LEDs sont aux **coins** des cases, en grille 9 × 9 : la LED 1 est au
 * coin A8, la 9 au coin A1, la 81 au coin H1. Allumer une case revient donc à
 * allumer ses quatre coins.
 */
export function encodeMillenniumLights(squares: readonly string[]): string {
  const leds = new Array<boolean>(81).fill(false)
  for (const square of squares) {
    const coords = squareCoords(square)
    if (!coords) continue
    for (const column of [coords.file, coords.file + 1]) {
      for (const row of [8 - coords.rank, 9 - coords.rank]) {
        leds[column * 9 + row] = true
      }
    }
  }
  // `01` : durée de créneau minimale ; `FF` allume en continu, `00` éteint.
  return `L01${leds.map((on) => (on ? 'FF' : '00')).join('')}`
}

/** Encode une position en réponse d'état — pour le simulateur et les tests. */
export function encodeMillenniumStatus(occupancy: Occupancy): string {
  let body = 's'
  for (let index = 0; index < 64; index++) {
    const piece = occupancy[index] ?? null
    body += piece === null || !VALID_PIECES.includes(piece) ? '.' : piece
  }
  return body + blockParity(body)
}

/** Nom annoncé par le module Bluetooth. */
export const MILLENNIUM_NAME_PREFIX = 'MILLENNIUM CHESS'
