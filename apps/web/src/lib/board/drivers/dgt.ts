'use client'

/**
 * Pilote DGT sur liaison série (e-Board, Smart Board, USB-C).
 *
 * En mode « mise à jour », la carte n'envoie plus de position complète : elle
 * signale les cases une par une. On tient donc la position courante ici, et on
 * la republie à chaque changement — le reste de l'application ne voit toujours
 * que des photos entières.
 *
 * Ces cartes n'ont pas de LEDs : `setLights` ne fait rien, et l'interface
 * signale à l'utilisateur qu'il faut regarder l'écran.
 */

import {
  DGT_BAUD,
  DGT_COMMAND,
  DGT_MESSAGE,
  DgtParser,
  applyDgtFieldUpdate,
  decodeDgtBoardDump,
} from '../codecs/dgt.ts'
import { createEmitter, type BoardDriver, type Occupancy, type PhysicalBoard } from '../types.ts'
import { getSerial } from '../webapis.ts'
import { openSerialLink } from './serial.ts'

export const dgtSerial: BoardDriver = {
  id: 'dgt',
  label: 'DGT',
  models: 'e-Board, Smart Board, USB-C (sans LEDs)',
  transport: 'serial',
  available: () => getSerial() !== null,

  async connect(): Promise<PhysicalBoard> {
    const serial = getSerial()
    if (!serial) throw new Error("Ce navigateur n'expose pas Web Serial.")

    const port = await serial.requestPort()
    const snapshots = createEmitter<Occupancy>()
    const closed = createEmitter<string | undefined>()
    const parser = new DgtParser()
    let current: Occupancy = new Array(64).fill(null)

    const link = await openSerialLink(
      port,
      { baudRate: DGT_BAUD },
      (bytes) => {
        for (const message of parser.push(bytes)) {
          if (message.id === DGT_MESSAGE.boardDump) {
            const occupancy = decodeDgtBoardDump(message.payload)
            if (occupancy) {
              current = occupancy
              snapshots.emit(current)
            }
          } else if (message.id === DGT_MESSAGE.fieldUpdate) {
            current = applyDgtFieldUpdate(current, message.payload)
            snapshots.emit(current)
          }
        }
      },
      (reason) => closed.emit(reason),
    )

    await link.write(Uint8Array.of(DGT_COMMAND.reset))
    // Une position complète d'abord, les changements ensuite : sans le premier
    // envoi, on ne saurait rien des cases qui ne bougent pas.
    await link.write(Uint8Array.of(DGT_COMMAND.sendBoard))
    await link.write(Uint8Array.of(DGT_COMMAND.updateNice))

    return {
      driver: 'dgt',
      label: 'DGT e-Board',
      lights: false,
      onSnapshot: snapshots.on,
      onClose: closed.on,
      setLights() {
        // Rien à allumer sur une carte DGT.
      },
      async close() {
        snapshots.clear()
        closed.clear()
        await link.close()
      },
    }
  },
}
