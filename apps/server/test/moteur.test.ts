/**
 * Le délai de garde d'un processus moteur.
 *
 * On ne teste pas Stockfish, on teste ce que la réserve fait quand Stockfish
 * ne répond plus. Le faux moteur voisin joue ce rôle : il tient la poignée de
 * main, accepte un `go`, envoie une ligne d'`info` pour avoir l'air vivant, et
 * ne rend jamais son `bestmove`.
 *
 * Sans garde, ce processus-là restait `busy` pour toujours : la réserve
 * tombait de deux à un, puis à zéro, et rien dans les journaux ne le disait.
 */

import { strict as assert } from 'node:assert'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { EngineProcess } from '../src/engine/process.ts'

const FAUX = fileURLToPath(new URL('./faux-stockfish.mjs', import.meta.url))

function fauxMoteur(mode: 'muet' | 'sourd' | 'bavard'): EngineProcess {
  // `process.execPath` plutôt que le shebang : voir l'en-tête du faux moteur.
  return new EngineProcess({
    binary: process.execPath,
    args: [FAUX, mode],
    threads: 1,
    hashMb: 16,
  })
}

const DEPART = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const ouverts: EngineProcess[] = []
after(async () => {
  await Promise.all(ouverts.map((moteur) => moteur.dispose()))
})

test('un moteur qui ne rend jamais bestmove est relancé, pas attendu', async () => {
  const moteur = fauxMoteur('sourd')
  ouverts.push(moteur)
  await moteur.start()

  let relance = 0
  moteur.on('relance', () => relance++)

  const debut = Date.now()
  await assert.rejects(moteur.search({ fen: DEPART, movetimeMs: 100 }), /pas répondu/)
  const duree = Date.now() - debut

  // 100 ms de recherche + 5 s de marge + 2 s d'insistance : la borne haute est
  // à dix secondes, ce qui laisse de la place à une machine chargée.
  assert.ok(duree < 10_000, `abandon en ${duree} ms, attendu moins de 10 000`)
  assert.equal(relance, 1)
  // Le point qui compte : le processus est de nouveau prenable.
  assert.equal(moteur.isBusy, false)
})

test('un moteur qui obéit à stop rend son résultat sans être tué', async () => {
  const moteur = fauxMoteur('muet')
  ouverts.push(moteur)
  await moteur.start()

  let relance = 0
  moteur.on('relance', () => relance++)

  const analyse = await moteur.search({ fen: DEPART, movetimeMs: 100 })
  assert.equal(analyse.bestMove, 'e2e4')
  assert.equal(relance, 0)
  assert.equal(moteur.isBusy, false)
})
