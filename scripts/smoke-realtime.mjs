#!/usr/bin/env node
/**
 * Test de bout en bout du serveur temps réel.
 *
 * Simule deux joueurs distincts qui rejoignent la même partie, jouent quelques
 * coups, puis vérifie que le serveur :
 *
 *  - attribue une couleur différente à chacun ;
 *  - refuse un coup illégal ;
 *  - refuse un coup joué hors de son tour ;
 *  - décompte correctement les pendules ;
 *  - déclare le mat et termine la partie.
 *
 * Ce sont exactement les points où un serveur de jeu naïf se fait berner.
 *
 * Usage :  node scripts/smoke-realtime.mjs [url]        contre un serveur lancé
 *          node scripts/smoke-realtime.mjs --serveur    lance le sien, puis l'arrête
 *
 * `--serveur` est ce que la CI exécute : le serveur démarre sans base de
 * données — chaque écriture se contente d'un avertissement — et sur le faux
 * moteur des tests, sur un port à lui pour ne pas gêner un serveur de
 * développement déjà là.
 */

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { io } from 'socket.io-client'

const args = process.argv.slice(2)
const LANCER = args.includes('--serveur')
const PORT_PROPRE = 3911
const ADRESSE =
  args.find((arg) => !arg.startsWith('--')) ?? `http://localhost:${LANCER ? PORT_PROPRE : 3001}`
const SLUG = `smoke${Math.floor(Date.now() % 1000000)}`

/** Le serveur lancé par `--serveur`, à arrêter avant de sortir. */
let serveur = null

/** Arrête le serveur qu'on a lancé, puis sort. */
async function sortir(code) {
  if (serveur && serveur.exitCode === null) {
    const fini = new Promise((resolve) => serveur.once('exit', resolve))
    serveur.kill('SIGTERM')
    await Promise.race([fini, wait(5000)])
    if (serveur.exitCode === null) serveur.kill('SIGKILL')
  }
  process.exit(code)
}

/**
 * Lance le serveur et attend que `/health` réponde.
 *
 * `process.execPath` et non `npm` : c'est le seul lancement qui se tue
 * proprement sous Windows comme sous Linux, sans laisser un `npm` orphelin.
 */
async function lancerLeServeur() {
  const racine = fileURLToPath(new URL('..', import.meta.url))
  const fauxMoteur = fileURLToPath(
    new URL('../apps/server/test/faux-stockfish.mjs', import.meta.url),
  )
  const env = { ...process.env }
  // Sans base, volontairement : c'est ce qu'on veut éprouver en CI.
  delete env.DATABASE_URL
  serveur = spawn(process.execPath, ['--experimental-strip-types', 'apps/server/src/index.ts'], {
    cwd: racine,
    env: {
      ...env,
      SERVER_PORT: String(PORT_PROPRE),
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      STOCKFISH_PATH: process.execPath,
      STOCKFISH_ARGS: `${fauxMoteur} bavard`,
      ENGINE_POOL_SIZE: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const relayer = (flux, ecrire) => {
    flux.setEncoding('utf8')
    flux.on('data', (bloc) => {
      for (const ligne of bloc.split('\n')) if (ligne.trim()) ecrire(`  [serveur] ${ligne}`)
    })
  }
  relayer(serveur.stdout, console.log)
  relayer(serveur.stderr, console.error)

  const limite = Date.now() + 30_000
  while (Date.now() < limite) {
    if (serveur.exitCode !== null)
      throw new Error(`le serveur s’est arrêté (code ${serveur.exitCode})`)
    try {
      const reponse = await fetch(`${ADRESSE}/health`)
      if (reponse.ok) return
    } catch {
      // Pas encore en écoute.
    }
    await wait(250)
  }
  throw new Error('le serveur n’a pas répondu sur /health en trente secondes')
}

let failures = 0

function check(label, condition, detail = '') {
  const mark = condition ? '✓' : '✗'
  if (!condition) failures++
  console.log(`  ${mark} ${label}${detail ? ` — ${detail}` : ''}`)
}

/** Client de test : un joueur avec son identifiant de navigateur propre. */
function connect(name, clientId) {
  return new Promise((resolve, reject) => {
    const socket = io(ADRESSE, { transports: ['websocket'], reconnection: false })
    const state = { socket, name, color: null, snapshot: null, errors: [] }

    socket.on('connect', () => {
      socket.emit('join', { slug: SLUG, name, clientId, timeControl: '60+0' })
    })
    socket.on('joined', (payload) => {
      state.color = payload.color
      state.snapshot = payload.snapshot
      resolve(state)
    })
    socket.on('state', (event) => {
      state.snapshot = event.snapshot
    })
    socket.on('move', (event) => {
      state.snapshot = event.snapshot
    })
    socket.on('end', (event) => {
      state.snapshot = event.snapshot
    })
    socket.on('error', (payload) => {
      state.errors.push(payload?.message ?? 'erreur sans message')
    })
    socket.on('connect_error', (error) => reject(error))
    setTimeout(() => reject(new Error('délai de connexion dépassé')), 8000)
  })
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

if (LANCER) {
  console.log(`Lancement du serveur sur le port ${PORT_PROPRE}…`)
  try {
    await lancerLeServeur()
  } catch (error) {
    console.error(`✗ ${error.message}`)
    await sortir(1)
  }
}

console.log(`Test temps réel sur ${ADRESSE} — partie « ${SLUG} »\n`)

let white
let black

try {
  white = await connect('Alice', 'clientalice0000000000000000000001')
  await wait(200)
  black = await connect('Bob', 'clientbob00000000000000000000002')
  await wait(500)
} catch (error) {
  console.error(`✗ Connexion impossible : ${error.message}`)
  console.error('  Le serveur est-il démarré ?  npm run dev:server')
  await sortir(1)
}

// ── Attribution des couleurs ────────────────────────────────────────────────
console.log('Places attribuées')
check('Alice reçoit une couleur', white.color !== null, `couleur = ${white.color}`)
check('Bob reçoit une couleur', black.color !== null, `couleur = ${black.color}`)
check(
  'les deux joueurs ont des couleurs différentes',
  white.color !== null && black.color !== null && white.color !== black.color,
)

// On identifie qui joue les Blancs, quel que soit l'ordre d'arrivée.
const first = white.color === 'w' ? white : black
const second = white.color === 'w' ? black : white

check('la partie a démarré', first.snapshot?.status === 'playing', first.snapshot?.status)

// ── Refus des coups invalides ───────────────────────────────────────────────
console.log('\nValidation des coups')

second.errors.length = 0
second.socket.emit('move', { from: 'e7', to: 'e5' })
await wait(400)
check('un coup joué hors de son tour est refusé', second.errors.length > 0, second.errors[0])

first.errors.length = 0
first.socket.emit('move', { from: 'e2', to: 'e9' })
await wait(400)
check('un coup illégal est refusé', first.errors.length > 0, first.errors[0])

// ── Partie légale : le mat du berger en quatre coups ────────────────────────
console.log('\nDéroulé d’une partie')

const script = [
  [first, 'e2', 'e4'],
  [second, 'e7', 'e5'],
  [first, 'f1', 'c4'],
  [second, 'b8', 'c6'],
  [first, 'd1', 'h5'],
  [second, 'g8', 'f6'],
  [first, 'h5', 'f7'], // mat
]

for (const [player, from, to] of script) {
  player.socket.emit('move', { from, to })
  await wait(300)
}

const finalSnapshot = first.snapshot
check(
  'les sept coups ont été enregistrés',
  finalSnapshot?.moves.length === 7,
  `${finalSnapshot?.moves.length} coups : ${finalSnapshot?.moves.join(' ')}`,
)
check('la partie est déclarée matée', finalSnapshot?.status === 'checkmate', finalSnapshot?.status)
check(
  'le résultat est une victoire des Blancs',
  finalSnapshot?.result === '1-0',
  finalSnapshot?.result,
)

// ── Pendules ────────────────────────────────────────────────────────────────
console.log('\nPendules')
const clock = finalSnapshot?.clock
check('les pendules existent', !!clock)
if (clock) {
  check(
    'du temps a été consommé',
    clock.w < 60_000 && clock.b < 60_000,
    `blancs ${(clock.w / 1000).toFixed(1)} s · noirs ${(clock.b / 1000).toFixed(1)} s`,
  )
  check('les pendules sont arrêtées', clock.running === null)
}

// ── Les deux joueurs voient la même chose ───────────────────────────────────
console.log('\nSynchronisation')
check('les deux joueurs partagent la même position', first.snapshot?.fen === second.snapshot?.fen)
check(
  'les deux joueurs voient le même résultat',
  first.snapshot?.result === second.snapshot?.result,
)

white.socket.disconnect()
black.socket.disconnect()

// ── Appariement rapide ──────────────────────────────────────────────────────
console.log('\nAppariement rapide')

/** Un chercheur : il s'inscrit à la file et note ce que le serveur lui dit. */
function chercher(name, clientId, timeControl) {
  const socket = io(ADRESSE, { transports: ['websocket'], reconnection: false })
  const state = { socket, seeking: false, matched: null, cancelled: null }
  socket.on('connect', () => socket.emit('seek', { timeControl, name, clientId }))
  socket.on('seeking', () => (state.seeking = true))
  socket.on('matched', (payload) => (state.matched = payload))
  socket.on('seekCancelled', (payload) => (state.cancelled = payload))
  return state
}

const partant = chercher('Carole', 'clientcarole00000000000000000003', '180+2')
await wait(400)
check('le premier chercheur est mis en attente', partant.seeking && !partant.matched)
partant.socket.emit('cancelSeek')
await wait(300)
check('« Annuler » le retire de la file', partant.cancelled?.reason === 'cancelled')

const chercheurA = chercher('David', 'clientdavid000000000000000000004', '180+2')
await wait(300)
const chercheurB = chercher('Eve', 'clienteve00000000000000000000005', '180+2')
await wait(600)
check(
  'deux chercheurs de la même cadence sont appariés',
  !!chercheurA.matched && chercheurA.matched.slug === chercheurB.matched?.slug,
  chercheurA.matched?.slug,
)
check(
  'avec des couleurs opposées',
  !!chercheurA.matched && chercheurA.matched.color !== chercheurB.matched?.color,
)
check('l’annulé n’a pas été apparié', partant.matched === null)
check('une partie entre invités n’est pas classée', chercheurA.matched?.rated === false)

// Chacun ouvre ensuite la partie comme un lien : son siège l'attend.
if (chercheurA.matched) {
  const siege = await new Promise((resolve) => {
    const socket = io(ADRESSE, { transports: ['websocket'], reconnection: false })
    socket.on('connect', () =>
      socket.emit('join', {
        slug: chercheurA.matched.slug,
        clientId: 'clientdavid000000000000000000004',
      }),
    )
    socket.on('joined', (payload) => {
      socket.disconnect()
      resolve(payload.color)
    })
    setTimeout(() => resolve(null), 3000)
  })
  check('le salon rend au joueur la couleur annoncée', siege === chercheurA.matched.color, siege)
}

for (const chercheur of [partant, chercheurA, chercheurB]) chercheur.socket.disconnect()

console.log(
  `\n${failures === 0 ? '✓ Tout est conforme.' : `✗ ${failures} vérification(s) en échec.`}`,
)
await sortir(failures === 0 ? 0 : 1)
