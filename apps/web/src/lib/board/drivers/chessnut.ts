'use client'

/**
 * Pilotes Chessnut : Bluetooth (Web Bluetooth) et USB (WebHID).
 *
 * La carte annonce son nom — « Chessnut Air », « Chessnut Pro », parfois
 * « Smart Chess » — mais le nom peut être changé par l'utilisateur. On propose
 * donc aussi un filtre par service, ce qui laisse le sélecteur du navigateur
 * afficher la carte quel que soit son nom.
 */

import {
  CHESSNUT_BLE,
  CHESSNUT_INIT,
  decodeChessnutFrame,
  encodeChessnutLights,
} from '../codecs/chessnut.ts'
import { createEmitter, type BoardDriver, type Occupancy, type PhysicalBoard } from '../types.ts'
import {
  getBluetooth,
  getHid,
  toBytes,
  type BleCharacteristic,
  type HidInputReportEvent,
} from '../webapis.ts'

/**
 * Écrit sans accusé quand la carte le permet.
 *
 * Les LEDs changent à chaque coup et à chaque pièce levée : attendre un accusé
 * de réception à chaque fois finit par prendre du retard sur le joueur.
 */
async function write(characteristic: BleCharacteristic, bytes: Uint8Array): Promise<void> {
  if (characteristic.writeValueWithoutResponse) {
    await characteristic.writeValueWithoutResponse(bytes)
    return
  }
  await characteristic.writeValue(bytes)
}

export const chessnutBluetooth: BoardDriver = {
  id: 'chessnut',
  label: 'Chessnut',
  models: 'Air, Air+, Pro, Go, Evo',
  transport: 'bluetooth',
  available: () => getBluetooth() !== null,

  async connect(): Promise<PhysicalBoard> {
    const bluetooth = getBluetooth()
    if (!bluetooth) throw new Error("Ce navigateur n'expose pas le Bluetooth.")

    const device = await bluetooth.requestDevice({
      filters: [
        { namePrefix: 'Chessnut' },
        { namePrefix: 'Smart Chess' },
        { services: [CHESSNUT_BLE.boardService] },
      ],
      optionalServices: [CHESSNUT_BLE.boardService, CHESSNUT_BLE.commandService],
    })

    const server = await device.gatt?.connect()
    if (!server) throw new Error('Connexion GATT impossible.')

    const board = await server.getPrimaryService(CHESSNUT_BLE.boardService)
    const boardData = await board.getCharacteristic(CHESSNUT_BLE.boardData)
    const commands = await server.getPrimaryService(CHESSNUT_BLE.commandService)
    const writer = await commands.getCharacteristic(CHESSNUT_BLE.write)

    const snapshots = createEmitter<Occupancy>()
    const closed = createEmitter<string | undefined>()

    boardData.addEventListener('characteristicvaluechanged', (event) => {
      const source = event.target as unknown as BleCharacteristic
      const value = source.value
      if (!value) return
      const occupancy = decodeChessnutFrame(toBytes(value))
      if (occupancy) snapshots.emit(occupancy)
    })
    await boardData.startNotifications()

    // Sans ces trois octets, la carte ne pousse rien.
    await write(writer, CHESSNUT_INIT)

    device.addEventListener('gattserverdisconnected', () => closed.emit(undefined))

    return {
      driver: 'chessnut',
      label: device.name ?? 'Chessnut',
      lights: true,
      onSnapshot: snapshots.on,
      onClose: closed.on,
      setLights(squares) {
        void write(writer, encodeChessnutLights(squares)).catch(() => {})
      },
      async close() {
        snapshots.clear()
        closed.clear()
        server.disconnect()
      },
    }
  },
}

/**
 * Même carte, câble USB.
 *
 * À valider sur pièce : la trame est la même — en-tête `01 24` puis 32 octets
 * — mais l'agencement des rapports HID n'est pas documenté publiquement. On
 * cherche donc l'en-tête dans les premiers octets du rapport plutôt que de
 * supposer un décalage.
 */
export const chessnutUsb: BoardDriver = {
  id: 'chessnut-usb',
  label: 'Chessnut par câble',
  models: 'Air, Air+, Pro (expérimental)',
  transport: 'hid',
  available: () => getHid() !== null,

  async connect(): Promise<PhysicalBoard> {
    const hid = getHid()
    if (!hid) throw new Error("Ce navigateur n'expose pas WebHID.")

    // Sans identifiant constructeur public, on laisse l'utilisateur désigner
    // sa carte dans le sélecteur du navigateur.
    const devices = await hid.requestDevice({ filters: [] })
    const device = devices[0]
    if (!device) throw new Error('Aucune carte choisie.')
    if (!device.opened) await device.open()

    const snapshots = createEmitter<Occupancy>()
    const closed = createEmitter<string | undefined>()

    device.addEventListener('inputreport', (event: HidInputReportEvent) => {
      const bytes = toBytes(event.data)
      for (let offset = 0; offset <= 2; offset++) {
        const occupancy = decodeChessnutFrame(bytes.subarray(offset))
        if (occupancy) {
          snapshots.emit(occupancy)
          return
        }
      }
    })

    try {
      await device.sendReport(0, CHESSNUT_INIT)
    } catch {
      // Certaines cartes poussent leur position sans initialisation.
    }

    return {
      driver: 'chessnut-usb',
      label: device.productName ?? 'Chessnut (USB)',
      lights: true,
      onSnapshot: snapshots.on,
      onClose: closed.on,
      setLights(squares) {
        void device.sendReport(0, encodeChessnutLights(squares)).catch(() => {})
      },
      async close() {
        snapshots.clear()
        closed.clear()
        await device.close()
      },
    }
  },
}
