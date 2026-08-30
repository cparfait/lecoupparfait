'use client'

/**
 * Plomberie commune aux cartes série (DGT, Certabo, Millennium en USB).
 *
 * Web Serial expose des flux : on ouvre le port, on lit en boucle jusqu'à la
 * déconnexion, et on écrit à travers un `WritableStream`. Rien de spécifique
 * aux échiquiers ici — d'où ce fichier partagé.
 */

import type { SerialOptions, SerialPortLike } from '../webapis.ts'

export interface SerialLink {
  write(bytes: Uint8Array): Promise<void>
  close(): Promise<void>
}

export async function openSerialLink(
  port: SerialPortLike,
  options: SerialOptions,
  onData: (bytes: Uint8Array) => void,
  onClose: (reason?: string) => void,
): Promise<SerialLink> {
  await port.open(options)

  const readable = port.readable
  const writable = port.writable
  if (!readable || !writable) {
    await port.close()
    throw new Error('Le port série ne fournit ni lecture ni écriture.')
  }

  const reader = readable.getReader()
  const writer = writable.getWriter()
  let closing = false

  void (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        if (value) onData(value)
      }
    } catch (error) {
      if (!closing) onClose(error instanceof Error ? error.message : undefined)
      return
    }
    if (!closing) onClose()
  })()

  port.addEventListener('disconnect', () => {
    if (!closing) onClose()
  })

  return {
    async write(bytes) {
      await writer.write(bytes)
    },
    async close() {
      closing = true
      try {
        await reader.cancel()
      } catch {
        // Le port a déjà disparu : rien à annuler.
      }
      reader.releaseLock()
      try {
        await writer.close()
      } catch {
        // Idem côté écriture.
      }
      writer.releaseLock()
      try {
        await port.close()
      } catch {
        // Fermer deux fois n'est pas une erreur utile à remonter.
      }
    },
  }
}
