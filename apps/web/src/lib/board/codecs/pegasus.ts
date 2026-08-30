/**
 * Protocole du DGT Pegasus.
 *
 * Rien à voir avec les e-Boards DGT : le Pegasus est une carte Bluetooth qui
 * expose un UART Nordic, avec ses propres messages. Le protocole n'a jamais
 * été publié par DGT — celui-ci vient de la rétro-ingénierie du projet
 * DGTCentaurMods.
 *
 * Deux différences de fond avec les e-Boards :
 *
 *  - la carte ne détecte que la **présence** d'une pièce, pas son type — d'où
 *    le `'?'` partout, que la logique de rapprochement sait déjà traiter ;
 *  - elle a des **LEDs**, ce que les e-Boards de tournoi n'ont pas.
 *
 * Et une bizarrerie : sans clé de développeur, la carte répond 0x7F sur les
 * 64 cases et refuse d'allumer quoi que ce soit. Celle de l'application DGT
 * circule ouvertement, c'est celle qu'utilisent tous les projets libres.
 */

import { SQUARES, UNKNOWN_PIECE, squareIndex, type Occupancy } from '../types.ts'

export const PEGASUS_BLE = {
  /** UART Nordic — le même service générique que Square Off, entre autres. */
  service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
  /** On y écrit les commandes. */
  write: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
  /** La carte y pousse ses messages. */
  notify: '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
} as const

export const PEGASUS_MESSAGE = {
  boardDump: 134,
  fieldUpdate: 142,
  serial: 145,
  trademark: 146,
  version: 147,
  hardwareVersion: 150,
  battery: 160,
  longSerial: 162,
  lockState: 164,
  devKeyState: 165,
} as const

/**
 * Commandes courtes : un seul caractère ASCII, auquel la carte répond par un
 * message.
 */
export const PEGASUS_SHORTCOMMAND = {
  /** Remet la carte dans un état connu ; envoyé avant chaque partie. */
  reset: '@',
  /** Demande une position complète. */
  boardDump: 'B',
  /** Demande à être prévenu de chaque pièce levée ou posée. */
  fieldUpdates: 'D',
  trademark: 'G',
  battery: 'L',
} as const

/**
 * Clé de développeur de l'application DGT.
 *
 * Sans elle, la carte renvoie `0x7F` sur les 64 cases et ignore les LEDs.
 */
export const PEGASUS_DEV_KEY = Uint8Array.of(99, 7, 190, 245, 174, 221, 169, 95, 0)

/** Valeur renvoyée par une carte qui n'a pas reçu la clé. */
const UNAUTHORISED = 0x7f

export interface PegasusMessage {
  type: number
  payload: Uint8Array
}

/** Encode une commande courte. */
export function pegasusShortCommand(command: string): Uint8Array {
  return Uint8Array.of(command.charCodeAt(0))
}

/**
 * Reconstitue les messages.
 *
 * Format constant : type, un zéro, longueur totale, puis les données. On se
 * resynchronise sur ce zéro du deuxième octet, seul repère disponible.
 */
export class PegasusParser {
  private buffer: number[] = []

  push(bytes: Uint8Array): PegasusMessage[] {
    for (const byte of bytes) this.buffer.push(byte)
    const messages: PegasusMessage[] = []

    for (;;) {
      if (this.buffer.length < 3) break

      const length = this.buffer[2] as number
      if (this.buffer[1] !== 0 || length < 3) {
        this.buffer.shift()
        continue
      }
      if (this.buffer.length < length) break

      messages.push({
        type: this.buffer[0] as number,
        payload: Uint8Array.from(this.buffer.slice(3, length)),
      })
      this.buffer = this.buffer.slice(length)
    }
    return messages
  }
}

/**
 * Décode une position.
 *
 * 64 octets, `1` pour occupée et `0` pour vide, de `a8` à `h1` — déjà notre
 * ordre. Retourne `null` si la carte répond qu'elle n'est pas déverrouillée :
 * c'est une réponse valide qui ne dit rien de la position.
 */
export function decodePegasusBoardDump(payload: Uint8Array): Occupancy | null {
  if (payload.length < 64) return null
  if (payload.every((value) => value === UNAUTHORISED)) return null

  const squares: (string | null)[] = []
  for (let index = 0; index < 64; index++) {
    squares.push(payload[index] === 1 ? UNKNOWN_PIECE : null)
  }
  return squares
}

/** Applique une pièce levée ou posée. */
export function applyPegasusFieldUpdate(occupancy: Occupancy, payload: Uint8Array): Occupancy {
  if (payload.length < 2) return occupancy
  const field = payload[0] as number
  if (field > 63) return occupancy
  const next = [...occupancy]
  next[field] = payload[1] === 1 ? UNKNOWN_PIECE : null
  return next
}

export interface PegasusLightOptions {
  /** Vitesse de clignotement, 1 à 7. */
  speed?: number
  /** Un seul éclat, plutôt qu'une pulsation continue. */
  once?: boolean
  /** Intensité, 1 à 4 — 1 suffit largement. */
  intensity?: number
}

/**
 * Encode l'allumage des LEDs.
 *
 * `96`, le nombre d'octets qui suivent, `5` pour « allumer », puis vitesse,
 * mode, intensité, les cases, et un zéro final.
 *
 * Le nombre de cases est borné à treize : un paquet BLE tient dans vingt
 * octets — deux d'en-tête, quatre de réglages, un de fin —, et découper une
 * commande en deux écritures reviendrait à en envoyer une tronquée. Treize
 * cases allumées disent déjà tout ce qu'il y a à dire.
 */
export function encodePegasusLights(
  squares: readonly string[],
  options: PegasusLightOptions = {},
): Uint8Array {
  const fields = squares
    .map((square) => squareIndex(square))
    .filter((index) => index >= 0)
    .slice(0, 13)

  if (fields.length === 0) return Uint8Array.of(96, 2, 0, 0)

  const { speed = 7, once = false, intensity = 1 } = options
  const body = [5, speed, once ? 1 : 0, intensity, ...fields, 0]
  return Uint8Array.from([96, body.length, ...body])
}

/** Encode une position en message — pour le simulateur et les tests. */
export function encodePegasusBoardDump(occupancy: Occupancy): Uint8Array {
  const message = new Uint8Array(67)
  message[0] = PEGASUS_MESSAGE.boardDump
  message[1] = 0
  message[2] = 67
  for (let index = 0; index < 64; index++) {
    message[3 + index] = (occupancy[index] ?? null) === null ? 0 : 1
  }
  return message
}

/** Encode une pièce levée ou posée — pour le simulateur et les tests. */
export function encodePegasusFieldUpdate(square: string, present: boolean): Uint8Array {
  const field = SQUARES.indexOf(square)
  return Uint8Array.from([PEGASUS_MESSAGE.fieldUpdate, 0, 5, field < 0 ? 0 : field, present ? 1 : 0])
}
