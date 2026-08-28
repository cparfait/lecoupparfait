/**
 * Maia — des adversaires qui jouent comme des humains.
 *
 * Stockfish bridé joue parfaitement puis bâcle un coup au hasard, ce qui ne
 * ressemble à rien. Maia est entraînée sur des millions de parties humaines :
 * à 1100 elle prend le pion gratuit et manque la fourchette, exactement comme
 * un joueur de 1100. C'est cela qu'un débutant a besoin d'affronter.
 *
 * Trois choses la distinguent d'un moteur ordinaire, et chacune a sa
 * conséquence ici :
 *
 *  1. **Ce ne sont que des poids.** Le corps est Lc0, un processus UCI de plus.
 *  2. **On ne cherche pas.** `go nodes 1` : on demande le coup que le réseau
 *     juge le plus probable, pas le meilleur. Chercher reviendrait à corriger
 *     ses erreurs, c'est-à-dire à détruire ce qu'on est venu chercher — et
 *     accessoirement à coûter cher.
 *  3. **Elle est déterministe.** Même position, même coup, toujours. D'où la
 *     bibliothèque d'ouvertures côté appelant : sans elle, toutes les parties
 *     commenceraient identiquement.
 *
 * Un processus par niveau, gardé chaud et arrêté après un temps d'inactivité :
 * démarrer Lc0 et charger un réseau prend une seconde, qu'on ne veut pas payer
 * à chaque coup.
 */

import { spawn, type ChildProcessByStdio } from 'node:child_process'
import type { Readable, Writable } from 'node:stream'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

/** Paliers publiés : de 1100 à 1900, de cent en cent. */
export const MAIA_RATINGS = [1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900] as const
export type MaiaRating = (typeof MAIA_RATINGS)[number]

/** Au-delà, on arrête le processus : un réseau chargé occupe de la mémoire. */
const IDLE_MS = 5 * 60_000

/** Un coup qui n'arrive pas en trois secondes n'arrivera pas. */
const MOVE_TIMEOUT_MS = 3000

const root = resolve(process.cwd(), '..', '..')

/**
 * Où trouver Lc0 et les poids.
 *
 * Comme pour Stockfish : la variable d'environnement d'abord — c'est elle qui
 * sert dans l'image Docker, où le binaire est compilé ailleurs —, puis le
 * dossier d'installation local.
 */
function findLc0(): string | null {
  const candidates = [
    process.env.LC0_PATH,
    join(weightsDir(), process.platform === 'win32' ? 'lc0.exe' : 'lc0'),
    '/usr/local/bin/lc0',
  ].filter((path): path is string => Boolean(path))

  return candidates.find((path) => existsSync(path)) ?? null
}

function weightsDir(): string {
  return process.env.MAIA_PATH ?? join(root, 'data', 'maia')
}

function weightsFor(rating: MaiaRating): string {
  return join(weightsDir(), `maia-${rating}.pb.gz`)
}

/** Maia est-elle utilisable ? Vérifié une fois, à la première demande. */
export function maiaAvailable(): boolean {
  const lc0 = findLc0()
  if (!lc0) return false
  return MAIA_RATINGS.some((rating) => existsSync(weightsFor(rating)))
}

/** Le palier disponible le plus proche du niveau demandé. */
export function nearestRating(wanted: number): MaiaRating {
  const usable = MAIA_RATINGS.filter((rating) => existsSync(weightsFor(rating)))
  const pool = usable.length > 0 ? usable : MAIA_RATINGS
  return pool.reduce((best, rating) =>
    Math.abs(rating - wanted) < Math.abs(best - wanted) ? rating : best,
  )
}

interface Worker {
  // La sortie d'erreur est fermée : Lc0 y déverse un journal dont on n'a
  // que faire, et qui remplirait le tampon si personne ne le lisait.
  process: ChildProcessByStdio<Writable, Readable, null>
  buffer: string
  ready: Promise<void>
  idleTimer: ReturnType<typeof setTimeout> | null
  /** Une seule recherche à la fois : le protocole UCI n'en accepte pas deux. */
  busy: Promise<unknown>
}

const workers = new Map<MaiaRating, Worker>()

function spawnWorker(rating: MaiaRating): Worker {
  const lc0 = findLc0()
  if (!lc0) throw new Error('Lc0 introuvable. Lance : node scripts/install-maia.mjs')

  const child = spawn(
    lc0,
    [
      `--weights=${weightsFor(rating)}`,
      // Eigen : uniquement le processeur, aucune dépendance graphique. À un
      // seul nœud par coup, un accélérateur n'apporterait rien.
      '--backend=eigen',
      // Sans cela, Lc0 écrit un journal de recherche à chaque coup.
      '--verbose-move-stats=false',
    ],
    { stdio: ['pipe', 'pipe', 'ignore'] },
  )

  const worker: Worker = {
    process: child,
    buffer: '',
    idleTimer: null,
    busy: Promise.resolve(),
    ready: new Promise<void>((done, fail) => {
      const onData = (chunk: Buffer) => {
        const text = chunk.toString()
        if (text.includes('readyok')) {
          child.stdout.off('data', onData)
          done()
        }
      }
      child.stdout.on('data', onData)
      child.once('error', fail)
      setTimeout(() => fail(new Error('Lc0 ne répond pas.')), 20_000)
    }),
  }

  child.stdout.on('data', (chunk: Buffer) => {
    worker.buffer += chunk.toString()
    // On ne garde que la fin : le journal d'une partie entière ne sert à rien
    // et grossirait indéfiniment.
    if (worker.buffer.length > 8192) worker.buffer = worker.buffer.slice(-4096)
  })

  child.once('exit', () => workers.delete(rating))

  child.stdin.write('uci\nisready\n')
  workers.set(rating, worker)
  return worker
}

function touch(rating: MaiaRating, worker: Worker): void {
  if (worker.idleTimer) clearTimeout(worker.idleTimer)
  worker.idleTimer = setTimeout(() => {
    worker.process.stdin.write('quit\n')
    worker.process.kill()
    workers.delete(rating)
  }, IDLE_MS)
  worker.idleTimer.unref?.()
}

/**
 * Le coup que jouerait un humain de ce niveau, en notation UCI.
 *
 * Les demandes se sérialisent par niveau : deux recherches simultanées sur le
 * même processus mélangeraient leurs réponses, le protocole UCI n'ayant aucun
 * moyen de les distinguer.
 */
export async function maiaMove(fen: string, rating: MaiaRating): Promise<string | null> {
  const worker = workers.get(rating) ?? spawnWorker(rating)
  await worker.ready
  touch(rating, worker)

  const run = worker.busy.then(
    () =>
      new Promise<string | null>((done) => {
        worker.buffer = ''
        let settled = false

        const finish = (move: string | null) => {
          if (settled) return
          settled = true
          worker.process.stdout.off('data', onData)
          clearTimeout(timer)
          done(move)
        }

        const onData = () => {
          const match = worker.buffer.match(/bestmove (\S+)/)
          if (match) finish(match[1] === '(none)' ? null : (match[1] ?? null))
        }

        const timer = setTimeout(() => finish(null), MOVE_TIMEOUT_MS)
        worker.process.stdout.on('data', onData)
        worker.process.stdin.write(`position fen ${fen}\ngo nodes 1\n`)
      }),
  )

  worker.busy = run.catch(() => null)
  return run
}

/** Arrête tous les processus : appelé à l'extinction du serveur. */
export function disposeMaia(): void {
  for (const [rating, worker] of workers) {
    if (worker.idleTimer) clearTimeout(worker.idleTimer)
    worker.process.stdin.write('quit\n')
    worker.process.kill()
    workers.delete(rating)
  }
}
