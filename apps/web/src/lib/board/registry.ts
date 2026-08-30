'use client'

/**
 * Catalogue des cartes reconnues.
 *
 * L'ordre compte : c'est celui du sélecteur. On met en tête les liaisons sans
 * fil, qui sont ce que l'on branche le plus souvent, et on garde les variantes
 * par câble ensuite.
 */

import { certaboSerial } from './drivers/certabo.ts'
import { chessnutBluetooth, chessnutUsb } from './drivers/chessnut.ts'
import { dgtSerial } from './drivers/dgt.ts'
import { millenniumBluetooth, millenniumUsb } from './drivers/millennium.ts'
import { pegasusBluetooth } from './drivers/pegasus.ts'
import type { BoardDriver, BoardDriverId, BoardTransport } from './types.ts'

export const BOARD_DRIVERS: readonly BoardDriver[] = [
  chessnutBluetooth,
  millenniumBluetooth,
  pegasusBluetooth,
  dgtSerial,
  certaboSerial,
  millenniumUsb,
  chessnutUsb,
]

/** Pilotes que ce navigateur peut réellement ouvrir. */
export function availableDrivers(): BoardDriver[] {
  return BOARD_DRIVERS.filter((driver) => driver.available())
}

export function driverById(id: BoardDriverId): BoardDriver | null {
  return BOARD_DRIVERS.find((driver) => driver.id === id) ?? null
}

export const TRANSPORT_LABELS: Readonly<Record<BoardTransport, string>> = {
  bluetooth: 'Bluetooth',
  serial: 'USB',
  hid: 'USB',
}
