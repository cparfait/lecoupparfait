#!/usr/bin/env node
/**
 * Recette manuelle de la reprise d'une partie après un redémarrage.
 *
 * Deux joueurs, quelques coups, on coupe le serveur, on le relance, on
 * revient : la position doit être là, et les pendules doivent avoir décompté
 * le temps de l'arrêt.
 *
 * Ce fichier n'est pas dans `npm test` : il suppose une base et un serveur
 * qu'on arrête à la main. Il sert à faire la recette une fois, à deux
 * personnes près de la même machine, et à pouvoir la refaire.
 *
 *   node scripts/essai-reprise.mjs jouer http://localhost:3001 monslug
 *   (couper le serveur, le relancer)
 *   node scripts/essai-reprise.mjs relire http://localhost:3001 monslug
 */

import { io } from 'socket.io-client'

const [action, url = 'http://localhost:3001', slug = `essai${Date.now() % 100000}`] =
  process.argv.slice(2)

const COUPS = [
  ['e2', 'e4'],
  ['e7', 'e5'],
  ['g1', 'f3'],
  ['b8', 'c6'],
  ['f1', 'c4'],
]

function client(nom, clientId) {
  return new Promise((resolve, reject) => {
    const socket = io(url, { transports: ['websocket'], reconnection: false })
    const etat = { socket, nom, couleur: null, snapshot: null }
    socket.on('connect', () =>
      socket.emit('join', { slug, name: nom, clientId, timeControl: '180+2' }),
    )
    socket.on('joined', (charge) => {
      etat.couleur = charge.color
      etat.snapshot = charge.snapshot
      resolve(etat)
    })
    socket.on('state', (e) => (etat.snapshot = e.snapshot))
    socket.on('move', (e) => (etat.snapshot = e.snapshot))
    socket.on('end', (e) => (etat.snapshot = e.snapshot))
    socket.on('connect_error', reject)
    setTimeout(() => reject(new Error('pas de réponse du serveur')), 8000)
  })
}

const attendre = (ms) => new Promise((r) => setTimeout(r, ms))

const alice = await client('Alice', 'essai-alice')
const bob = await client('Bob', 'essai-bob')
await attendre(400)

const blancs = alice.couleur === 'w' ? alice : bob
const noirs = alice.couleur === 'w' ? bob : alice

if (action === 'jouer') {
  for (const [index, [from, to]] of COUPS.entries()) {
    ;(index % 2 === 0 ? blancs : noirs).socket.emit('move', { from, to })
    await attendre(500)
  }
  await attendre(600)
  const s = alice.snapshot
  console.log(`slug          ${slug}`)
  console.log(`coups         ${s.moves.join(' ')}`)
  console.log(`position      ${s.fen}`)
  console.log(`pendules      b ${(s.clock.w / 1000).toFixed(1)} s · n ${(s.clock.b / 1000).toFixed(1)} s`)
  console.log(`\nCoupe le serveur, relance-le, puis :`)
  console.log(`  node scripts/essai-reprise.mjs relire ${url} ${slug}`)
} else {
  const s = alice.snapshot
  console.log(`coups         ${s.moves.join(' ')}`)
  console.log(`position      ${s.fen}`)
  console.log(`statut        ${s.status}`)
  console.log(`pendules      b ${(s.clock.w / 1000).toFixed(1)} s · n ${(s.clock.b / 1000).toFixed(1)} s`)
  console.log(`couleurs      Alice ${alice.couleur} · Bob ${bob.couleur}`)

  // Le sixième coup doit passer : la partie est bien reprise, pas seulement
  // affichée.
  const auTrait = s.turn === 'w' ? blancs : noirs
  auTrait.socket.emit('move', { from: 'g8', to: 'f6' })
  await attendre(700)
  console.log(`après le 6e   ${alice.snapshot.moves.join(' ')}`)
}

alice.socket.close()
bob.socket.close()
process.exit(0)
