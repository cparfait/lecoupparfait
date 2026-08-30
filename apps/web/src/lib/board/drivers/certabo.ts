'use client'

/**
 * Pilote Certabo — couvre aussi les TabuTronic Cerno et Sentio.
 *
 * Particularité de la marque : la carte lit des **puces**, pas des pièces.
 * Elle dit « la puce 12 7 33 0 91 est en e4 », charge au logiciel de savoir
 * que cette puce est sous un cavalier. D'où l'étalonnage.
 *
 * On ne le demande pas : on l'apprend. Tant qu'une puce est inconnue, la case
 * est signalée comme « occupée, type inconnu » — ce que la logique de
 * rapprochement sait déjà traiter, puisque c'est le cas ordinaire du Sentio.
 * Dès que le plateau se retrouve en position de départ, les 32 puces sont
 * apprises d'un coup et conservées pour les prochaines parties.
 */

import {
  CERTABO_BAUD,
  CertaboParser,
  calibrate,
  encodeCertaboLights,
  occupancyFromIds,
  type CertaboCalibration,
  type PieceId,
} from '../codecs/certabo.ts'
import {
  UNKNOWN_PIECE,
  createEmitter,
  type BoardDriver,
  type Occupancy,
  type PhysicalBoard,
} from '../types.ts'
import { getSerial } from '../webapis.ts'
import { openSerialLink } from './serial.ts'

const STORAGE_KEY = 'coupparfait.certabo'

function loadCalibration(): CertaboCalibration {
  if (typeof localStorage === 'undefined') return {}
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? (JSON.parse(stored) as CertaboCalibration) : {}
  } catch {
    return {}
  }
}

function saveCalibration(calibration: CertaboCalibration): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(calibration))
  } catch {
    // Stockage plein ou navigation privée : on jouera sans mémoire des puces.
  }
}

export const certaboSerial: BoardDriver = {
  id: 'certabo',
  label: 'Certabo',
  models: 'Certabo, TabuTronic Cerno et Sentio',
  transport: 'serial',
  available: () => getSerial() !== null,

  async connect(): Promise<PhysicalBoard> {
    const serial = getSerial()
    if (!serial) throw new Error("Ce navigateur n'expose pas Web Serial.")

    const port = await serial.requestPort()
    const snapshots = createEmitter<Occupancy>()
    const closed = createEmitter<string | undefined>()
    const parser = new CertaboParser()
    let calibration = loadCalibration()

    const link = await openSerialLink(
      port,
      { baudRate: CERTABO_BAUD },
      (bytes) => {
        for (const frame of parser.push(bytes)) {
          if (frame.kind === 'occupancy') {
            snapshots.emit(frame.squares)
            continue
          }
          calibration = learn(frame.ids, calibration)
          snapshots.emit(occupancyFromIds(frame.ids, calibration))
        }
      },
      (reason) => closed.emit(reason),
    )

    return {
      driver: 'certabo',
      label: 'Certabo',
      lights: true,
      onSnapshot: snapshots.on,
      onClose: closed.on,
      setLights(squares) {
        void link.write(encodeCertaboLights(squares)).catch(() => {})
      },
      async close() {
        snapshots.clear()
        closed.clear()
        await link.close()
      },
    }
  },
}

/**
 * Apprend les puces si le plateau est en position de départ.
 *
 * On ne réapprend que ce qui manque : rejouer une ouverture ne doit pas
 * effacer un étalonnage déjà bon, et une pièce ajoutée en cours de route (une
 * seconde dame, par exemple) s'apprendra à la partie suivante.
 */
function learn(ids: readonly PieceId[], calibration: CertaboCalibration): CertaboCalibration {
  const unknown = ids.some((id) => id !== '' && !calibration[id])
  if (!unknown) return calibration

  const learned = calibrate(ids)
  if (!learned) return calibration

  const merged = { ...calibration, ...learned }
  saveCalibration(merged)
  return merged
}

/** Reste-t-il des puces inconnues dans la dernière photo ? */
export function hasUnknownPieces(occupancy: Occupancy): boolean {
  return occupancy.some((piece) => piece === UNKNOWN_PIECE)
}
