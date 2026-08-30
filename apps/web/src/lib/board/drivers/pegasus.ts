'use client'

/**
 * Pilote DGT Pegasus (Bluetooth).
 *
 * La séquence d'ouverture n'est pas facultative : sans la clé de développeur,
 * la carte prétend que ses 64 cases valent `0x7F` et n'allume rien. On envoie
 * donc la clé, puis la remise à zéro, l'abonnement aux changements de case, et
 * l'extinction des LEDs — exactement ce que fait l'application officielle.
 */

import {
  PEGASUS_BLE,
  PEGASUS_DEV_KEY,
  PEGASUS_MESSAGE,
  PEGASUS_SHORTCOMMAND,
  PegasusParser,
  applyPegasusFieldUpdate,
  decodePegasusBoardDump,
  encodePegasusLights,
  pegasusShortCommand,
} from '../codecs/pegasus.ts'
import { createEmitter, type BoardDriver, type Occupancy, type PhysicalBoard } from '../types.ts'
import { getBluetooth, toBytes, type BleCharacteristic } from '../webapis.ts'

export const pegasusBluetooth: BoardDriver = {
  id: 'pegasus',
  label: 'DGT Pegasus',
  models: 'détection de présence, avec LEDs',
  transport: 'bluetooth',
  available: () => getBluetooth() !== null,

  async connect(): Promise<PhysicalBoard> {
    const bluetooth = getBluetooth()
    if (!bluetooth) throw new Error("Ce navigateur n'expose pas le Bluetooth.")

    const device = await bluetooth.requestDevice({
      filters: [
        { namePrefix: 'PEGASUS' },
        { namePrefix: 'DGT' },
        // L'UART Nordic est un service générique : ce filtre fait apparaître
        // d'autres appareils dans le sélecteur, mais c'est le seul repère sûr
        // si la carte a été renommée.
        { services: [PEGASUS_BLE.service] },
      ],
      optionalServices: [PEGASUS_BLE.service],
    })

    const server = await device.gatt?.connect()
    if (!server) throw new Error('Connexion GATT impossible.')

    const service = await server.getPrimaryService(PEGASUS_BLE.service)
    const notify = await service.getCharacteristic(PEGASUS_BLE.notify)
    const writer = await service.getCharacteristic(PEGASUS_BLE.write)

    const snapshots = createEmitter<Occupancy>()
    const closed = createEmitter<string | undefined>()
    const parser = new PegasusParser()
    let current: Occupancy = new Array(64).fill(null)
    let locked = true

    const write = async (bytes: Uint8Array): Promise<void> => {
      if (writer.writeValueWithoutResponse) await writer.writeValueWithoutResponse(bytes)
      else await writer.writeValue(bytes)
    }

    notify.addEventListener('characteristicvaluechanged', (event) => {
      const source = event.target as unknown as BleCharacteristic
      if (!source.value) return
      for (const message of parser.push(toBytes(source.value))) {
        if (message.type === PEGASUS_MESSAGE.boardDump) {
          const occupancy = decodePegasusBoardDump(message.payload)
          if (!occupancy) {
            // La carte n'a pas accepté la clé : réessayer vaut mieux
            // qu'afficher une position entièrement fausse.
            if (locked) void write(PEGASUS_DEV_KEY).catch(() => {})
            continue
          }
          locked = false
          current = occupancy
          snapshots.emit(current)
        } else if (message.type === PEGASUS_MESSAGE.fieldUpdate) {
          current = applyPegasusFieldUpdate(current, message.payload)
          snapshots.emit(current)
        }
      }
    })
    await notify.startNotifications()

    await write(PEGASUS_DEV_KEY)
    await write(pegasusShortCommand(PEGASUS_SHORTCOMMAND.reset))
    await write(pegasusShortCommand(PEGASUS_SHORTCOMMAND.fieldUpdates))
    await write(encodePegasusLights([]))
    // Les changements de case ne disent rien des pièces qui ne bougent pas :
    // il faut une position complète pour partir.
    await write(pegasusShortCommand(PEGASUS_SHORTCOMMAND.boardDump))

    device.addEventListener('gattserverdisconnected', () => closed.emit(undefined))

    return {
      driver: 'pegasus',
      label: device.name ?? 'DGT Pegasus',
      lights: true,
      onSnapshot: snapshots.on,
      onClose: closed.on,
      setLights(squares) {
        void write(encodePegasusLights(squares)).catch(() => {})
      },
      async close() {
        try {
          await write(encodePegasusLights([]))
        } catch {
          // Éteindre les LEDs est une politesse, pas une condition de sortie.
        }
        snapshots.clear()
        closed.clear()
        server.disconnect()
      },
    }
  },
}
