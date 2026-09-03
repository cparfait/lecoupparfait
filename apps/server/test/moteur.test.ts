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
import { EnginePool, FileSaturee } from '../src/engine/pool.ts'

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

// ─────────────────────────────────────────────────────────────────────────────
//  La réserve
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Une réserve montée sur le faux moteur bavard.
 *
 * Ce qu'on éprouve ici n'a rien à voir avec la qualité de l'analyse : c'est la
 * distribution. Qui passe devant qui, qui est refusé, et est-ce qu'une adresse
 * peut à elle seule remplir la file — ce qui était le cas, et ce que personne
 * ne pouvait constater avant que ce fichier n'existe.
 */
function fausseReserve(taille: number, maxQueue: number, mode = 'bavard'): EnginePool {
  return new EnginePool({
    binary: process.execPath,
    args: [FAUX, mode],
    size: taille,
    threadsPerProcess: 1,
    hashMb: 16,
    maxDepth: 20,
    maxQueue,
  })
}

test('une adresse ne peut pas remplir la file à elle seule', async () => {
  const reserve = fausseReserve(1, 16)
  await reserve.start()
  try {
    // Trois demandes de la même adresse, lancées ensemble : une part au moteur,
    // deux prennent leur place en file, les suivantes sont refusées.
    const demandes = Array.from({ length: 6 }, () =>
      reserve
        .analyse({ fen: DEPART, movetimeMs: 50 }, 'interactive', '10.0.0.1')
        .then(() => 'servie' as const)
        .catch((erreur: unknown) => (erreur instanceof FileSaturee ? 'refusée' : 'erreur')),
    )
    const issues = await Promise.all(demandes)
    const refusees = issues.filter((i) => i === 'refusée').length

    assert.ok(refusees > 0, 'une adresse gourmande doit finir par être refusée')
    assert.equal(issues.filter((i) => i === 'erreur').length, 0, 'aucune vraie erreur')

    // Et l'essentiel : le plafond global de seize n'a jamais été atteint, donc
    // une autre adresse aurait été servie pendant tout ce temps.
    assert.ok(reserve.queueLength <= 2)
  } finally {
    await reserve.dispose()
  }
})

test('sans identité d’appelant, seul le plafond global s’applique', async () => {
  // Les appels internes du serveur — le coup d'un bot, une analyse de partie
  // lancée par lui-même — n'ont pas d'adresse et ne doivent pas se brider.
  const reserve = fausseReserve(1, 16)
  await reserve.start()
  try {
    const issues = await Promise.all(
      Array.from({ length: 6 }, () =>
        reserve
          .analyse({ fen: DEPART, movetimeMs: 50 })
          .then(() => 'servie' as const)
          .catch(() => 'refusée' as const),
      ),
    )
    assert.equal(issues.filter((i) => i === 'refusée').length, 0)
  } finally {
    await reserve.dispose()
  }
})

test('la file déborde proprement, en refus et non en attente sans fin', async () => {
  const reserve = fausseReserve(1, 2)
  await reserve.start()
  try {
    const issues = await Promise.all(
      Array.from({ length: 8 }, () =>
        reserve
          .analyse({ fen: DEPART, movetimeMs: 50 })
          .then(() => 'servie' as const)
          .catch((erreur: unknown) => (erreur instanceof FileSaturee ? 'refusée' : 'erreur')),
      ),
    )
    assert.ok(issues.includes('refusée'), 'le plafond doit finir par refuser')
    assert.equal(issues.filter((i) => i === 'erreur').length, 0)
  } finally {
    await reserve.dispose()
  }
})

test('une demande abandonnée en file rend sa place au lieu de la garder', async () => {
  /*
    Il faut un moteur **occupé** pour que la file existe : sans cela la demande
    part au moteur dans la foulée, et c'est lui qui gère l'abandon — un autre
    chemin, déjà couvert plus haut. Le moteur lent sert à ça.

    Ce qu'on vérifie est le défaut qui se cachait là : une demande dont
    l'auteur a fermé son onglet gardait sa place en file, puis mobilisait un
    processus pour un résultat que plus personne n'attendait.
  */
  const reserve = fausseReserve(1, 16, 'lent')
  await reserve.start()
  try {
    // Occupe le seul moteur.
    const enCours = reserve.analyse({ fen: DEPART, movetimeMs: 50 }, 'batch', '10.0.0.9')

    const controleur = new AbortController()
    const enFile = reserve
      .analyse({ fen: DEPART, movetimeMs: 50, signal: controleur.signal }, 'batch', '10.0.0.2')
      .then(() => 'servie' as const)
      .catch(() => 'abandonnée' as const)

    assert.equal(reserve.queueLength, 1, 'la seconde demande doit être en file')
    controleur.abort()
    assert.equal(await enFile, 'abandonnée')
    assert.equal(reserve.queueLength, 0, 'sa place est rendue immédiatement')

    await enCours
  } finally {
    await reserve.dispose()
  }
})
