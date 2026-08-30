'use client'

/**
 * Les trois APIs navigateur qui parlent aux échiquiers.
 *
 * TypeScript ne fournit de types ni pour Web Bluetooth, ni pour Web Serial, ni
 * pour WebHID : ce sont des brouillons que seuls les navigateurs Chromium
 * implémentent. Plutôt que d'ajouter trois dépendances de types, on décrit ici
 * le strict nécessaire — une vingtaine de membres au total.
 *
 * Toutes ces APIs exigent HTTPS et un geste de l'utilisateur, et aucune n'est
 * disponible sur Safari ni sur Firefox. D'où `available()` sur chaque pilote :
 * on n'affiche jamais un bouton qui ne peut pas marcher.
 */

// ── Web Bluetooth ────────────────────────────────────────────────────────────

export interface BleCharacteristic {
  value?: DataView
  readValue(): Promise<DataView>
  writeValue(value: Uint8Array): Promise<void>
  writeValueWithoutResponse?(value: Uint8Array): Promise<void>
  startNotifications(): Promise<BleCharacteristic>
  stopNotifications(): Promise<BleCharacteristic>
  addEventListener(type: 'characteristicvaluechanged', listener: (event: Event) => void): void
}

export interface BleService {
  getCharacteristic(uuid: string): Promise<BleCharacteristic>
}

export interface BleServer {
  connected: boolean
  connect(): Promise<BleServer>
  disconnect(): void
  getPrimaryService(uuid: string): Promise<BleService>
}

export interface BleDevice {
  name?: string
  gatt?: BleServer
  addEventListener(type: 'gattserverdisconnected', listener: () => void): void
}

export interface BleRequestOptions {
  filters?: Array<{ namePrefix?: string; name?: string; services?: string[] }>
  optionalServices?: string[]
  acceptAllDevices?: boolean
}

export interface BluetoothApi {
  requestDevice(options: BleRequestOptions): Promise<BleDevice>
}

// ── Web Serial ───────────────────────────────────────────────────────────────

export interface SerialOptions {
  baudRate: number
  dataBits?: number
  stopBits?: number
  parity?: 'none' | 'even' | 'odd'
  bufferSize?: number
}

export interface SerialPortLike {
  open(options: SerialOptions): Promise<void>
  close(): Promise<void>
  readable: ReadableStream<Uint8Array> | null
  writable: WritableStream<Uint8Array> | null
  getInfo?(): { usbVendorId?: number; usbProductId?: number }
  addEventListener(type: 'disconnect', listener: () => void): void
}

export interface SerialApi {
  requestPort(options?: { filters?: Array<{ usbVendorId: number; usbProductId?: number }> }): Promise<SerialPortLike>
}

// ── WebHID ───────────────────────────────────────────────────────────────────

export interface HidInputReportEvent extends Event {
  data: DataView
  reportId: number
}

export interface HidDeviceLike {
  productName?: string
  opened: boolean
  open(): Promise<void>
  close(): Promise<void>
  sendReport(reportId: number, data: Uint8Array): Promise<void>
  addEventListener(type: 'inputreport', listener: (event: HidInputReportEvent) => void): void
}

export interface HidApi {
  requestDevice(options: { filters: Array<{ vendorId?: number; productId?: number }> }): Promise<HidDeviceLike[]>
}

// ── Accès ────────────────────────────────────────────────────────────────────

interface NavigatorWithBoards {
  bluetooth?: BluetoothApi
  serial?: SerialApi
  hid?: HidApi
}

function boardsNavigator(): NavigatorWithBoards | null {
  if (typeof navigator === 'undefined') return null
  return navigator as unknown as NavigatorWithBoards
}

export function getBluetooth(): BluetoothApi | null {
  return boardsNavigator()?.bluetooth ?? null
}

export function getSerial(): SerialApi | null {
  return boardsNavigator()?.serial ?? null
}

export function getHid(): HidApi | null {
  return boardsNavigator()?.hid ?? null
}

/** Le refus d'un sélecteur de périphérique n'est pas une panne. */
export function isUserCancellation(error: unknown): boolean {
  return error instanceof Error && (error.name === 'NotFoundError' || error.name === 'AbortError')
}

/** Copie exploitable des octets reçus, quel que soit le décalage dans le tampon. */
export function toBytes(view: DataView): Uint8Array {
  return new Uint8Array(view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength))
}
