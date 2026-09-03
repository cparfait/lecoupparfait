'use client'

/**
 * Pilotes Millennium ChessLink : Bluetooth et USB.
 *
 * Le module BLE est un « UART transparent » Microchip : on écrit des
 * caractères d'un côté, ils ressortent de l'autre. Le protocole est donc
 * exactement le même qu'en série — seul le transport change, d'où ce fichier
 * unique et sa fonction {@link openMillenniumBoard}.
 */

import {
  MILLENNIUM_BAUD,
  MILLENNIUM_BLE,
  MILLENNIUM_LIGHTS_OFF,
  MILLENNIUM_NAME_PREFIX,
  MILLENNIUM_REPORT_ON_CHANGE,
  MILLENNIUM_STATUS,
  MillenniumParser,
  decodeMillenniumStatus,
  encodeMillenniumLights,
  millenniumCommand,
} from '../codecs/millennium.ts'
import {
  createEmitter,
  type BoardDriver,
  type BoardDriverId,
  type Occupancy,
  type PhysicalBoard,
} from '../types.ts'
import { getBluetooth, getSerial, toBytes, type BleCharacteristic } from '../webapis.ts'
import { openSerialLink } from './serial.ts'

/** Ce qu'il faut au protocole, quel que soit le fil. */
interface Transport {
  send(bytes: Uint8Array): Promise<void>
  close(): Promise<void>
}

/**
 * Monte la carte une fois le transport ouvert.
 *
 * On demande d'abord à la carte de ne parler qu'aux changements : par défaut
 * elle envoie son état à chaque balayage, vingt-cinq fois par seconde, ce qui
 * n'apporte rien et sature la liaison Bluetooth.
 */
async function openMillenniumBoard(
  driver: BoardDriverId,
  label: string,
  transport: Transport,
  register: (onData: (bytes: Uint8Array) => void, onClose: (reason?: string) => void) => void,
): Promise<PhysicalBoard> {
  const snapshots = createEmitter<Occupancy>()
  const closed = createEmitter<string | undefined>()
  const parser = new MillenniumParser()

  register(
    (bytes) => {
      for (const reply of parser.push(bytes)) {
        const occupancy = decodeMillenniumStatus(reply)
        if (occupancy) snapshots.emit(occupancy)
      }
    },
    (reason) => closed.emit(reason),
  )

  await transport.send(millenniumCommand(MILLENNIUM_REPORT_ON_CHANGE))
  await transport.send(millenniumCommand(MILLENNIUM_STATUS))

  return {
    driver,
    label,
    lights: true,
    onSnapshot: snapshots.on,
    onClose: closed.on,
    setLights(squares) {
      const command = squares.length === 0 ? MILLENNIUM_LIGHTS_OFF : encodeMillenniumLights(squares)
      void transport.send(millenniumCommand(command)).catch(() => {})
    },
    async close() {
      try {
        await transport.send(millenniumCommand(MILLENNIUM_LIGHTS_OFF))
      } catch {
        // Éteindre les LEDs est une politesse, pas une condition de sortie.
      }
      snapshots.clear()
      closed.clear()
      await transport.close()
    },
  }
}

export const millenniumBluetooth: BoardDriver = {
  id: 'millennium',
  label: 'Millennium ChessLink',
  models: 'Exclusive, Supreme Tournament 55, King Performance, eONE',
  transport: 'bluetooth',
  available: () => getBluetooth() !== null,

  async connect(): Promise<PhysicalBoard> {
    const bluetooth = getBluetooth()
    if (!bluetooth) throw new Error("Ce navigateur n'expose pas le Bluetooth.")

    const device = await bluetooth.requestDevice({
      filters: [{ namePrefix: MILLENNIUM_NAME_PREFIX }, { services: [MILLENNIUM_BLE.service] }],
      optionalServices: [MILLENNIUM_BLE.service],
    })
    const server = await device.gatt?.connect()
    if (!server) throw new Error('Connexion GATT impossible.')

    const service = await server.getPrimaryService(MILLENNIUM_BLE.service)
    const notify = await service.getCharacteristic(MILLENNIUM_BLE.notify)
    const writer = await service.getCharacteristic(MILLENNIUM_BLE.write)

    const transport: Transport = {
      async send(bytes) {
        // L'unité de transmission BLE tient dans vingt octets ; la commande
        // d'allumage en fait cent soixante-sept.
        for (let offset = 0; offset < bytes.length; offset += 20) {
          const chunk = bytes.subarray(offset, offset + 20)
          if (writer.writeValueWithoutResponse) await writer.writeValueWithoutResponse(chunk)
          else await writer.writeValue(chunk)
        }
      },
      async close() {
        server.disconnect()
      },
    }

    return openMillenniumBoard(
      'millennium',
      device.name ?? 'Millennium ChessLink',
      transport,
      (onData, onClose) => {
        notify.addEventListener('characteristicvaluechanged', (event) => {
          const source = event.target as unknown as BleCharacteristic
          if (source.value) onData(toBytes(source.value))
        })
        void notify.startNotifications()
        device.addEventListener('gattserverdisconnected', () => onClose())
      },
    )
  },
}

export const millenniumUsb: BoardDriver = {
  id: 'millennium-usb',
  label: 'Millennium par câble',
  models: 'ChessLink en USB',
  transport: 'serial',
  available: () => getSerial() !== null,

  async connect(): Promise<PhysicalBoard> {
    const serial = getSerial()
    if (!serial) throw new Error("Ce navigateur n'expose pas Web Serial.")

    const port = await serial.requestPort()
    let onData: (bytes: Uint8Array) => void = () => {}
    let onClose: (reason?: string) => void = () => {}

    // La parité impaire est posée caractère par caractère dans le codec : on
    // ouvre donc le port en 8 bits sans parité, comme le fait la bibliothèque
    // de référence.
    const link = await openSerialLink(
      port,
      { baudRate: MILLENNIUM_BAUD },
      (bytes) => onData(bytes),
      (reason) => onClose(reason),
    )

    return openMillenniumBoard(
      'millennium-usb',
      'Millennium ChessLink (USB)',
      { send: (bytes) => link.write(bytes), close: () => link.close() },
      (data, close) => {
        onData = data
        onClose = close
      },
    )
  },
}
