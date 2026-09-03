#!/usr/bin/env node

/**
 * Installe Maia : des adversaires qui jouent comme des humains.
 *
 * Stockfish bridé joue parfaitement puis bâcle un coup au hasard. Maia, elle,
 * est entraînée sur des millions de parties humaines : à 1100, elle fait les
 * erreurs qu'un joueur de 1100 fait vraiment — et c'est cela qu'un débutant a
 * besoin d'affronter.
 *
 * Deux morceaux, parce que Maia n'est pas un moteur :
 *
 *  - **Les poids** (`maia-1100.pb.gz` … `maia-1900.pb.gz`), un par palier de
 *    cent points. Ce sont eux, Maia : environ 1,3 Mo chacun.
 *  - **Un corps** pour les faire tourner : Lc0 (Leela Chess Zero).
 *
 * Sous Windows, Lc0 se télécharge tout compilé. Sous Linux, il n'existe ni
 * binaire publié ni paquet Debian : l'image Docker le compile depuis les
 * sources, comme elle le fait déjà pour Stockfish. Ce script se contente alors
 * de récupérer les poids et de le dire.
 *
 * Usage :  node scripts/install-maia.mjs
 */

import { createWriteStream, existsSync, mkdirSync, chmodSync, readdirSync, statSync } from 'node:fs'
import { rm, rename } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'
import { spawnSync } from 'node:child_process'
import { Readable } from 'node:stream'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const target = join(root, 'data', 'maia')

/**
 * Les neuf paliers.
 *
 * De 1100 à 1900, de cent en cent. En deçà de 1100 le modèle n'existe pas — il
 * n'y a pas assez de parties de ce niveau pour l'entraîner —, et au-delà de
 * 1900 on retombe dans un jeu que Stockfish imite très bien.
 */
const RATINGS = [1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900]

const WEIGHTS_BASE = 'https://github.com/CSSLab/maia-chess/raw/master/maia_weights'

/** Version de Lc0 utilisée pour les binaires Windows. */
const LC0_VERSION = 'v0.32.1'

function say(message) {
  process.stdout.write(`${message}\n`)
}

async function download(url, destination) {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok || !response.body) {
    throw new Error(`${url} → HTTP ${response.status}`)
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(destination))
}

/** Poids déjà présent et non tronqué : on ne le retélécharge pas. */
function alreadyThere(path, minBytes = 100_000) {
  return existsSync(path) && statSync(path).size >= minBytes
}

async function installWeights() {
  mkdirSync(target, { recursive: true })
  let fetched = 0

  for (const rating of RATINGS) {
    const name = `maia-${rating}.pb.gz`
    const path = join(target, name)
    if (alreadyThere(path)) continue

    process.stdout.write(`  ${name} … `)
    await download(`${WEIGHTS_BASE}/${name}`, path)
    say(`${Math.round(statSync(path).size / 1024)} Ko`)
    fetched++
  }

  return fetched
}

/**
 * Lc0 pour Windows, en version processeur.
 *
 * La variante « cpu-dnnl » suffit largement : on fait tourner Maia **sans
 * recherche** — un seul nœud —, ce qui coûte moins qu'une analyse Stockfish.
 * Une carte graphique n'apporterait rien.
 */
async function installLc0Windows() {
  const exe = join(target, 'lc0.exe')
  if (existsSync(exe)) {
    say('  lc0.exe déjà présent.')
    return exe
  }

  const archive = join(target, 'lc0.zip')
  const url = `https://github.com/LeelaChessZero/lc0/releases/download/${LC0_VERSION}/lc0-${LC0_VERSION}-windows-cpu-dnnl.zip`

  process.stdout.write(`  lc0 ${LC0_VERSION} … `)
  await download(url, archive)
  say(`${Math.round(statSync(archive).size / 1048576)} Mo`)

  const unpacked = join(target, '_lc0')
  await rm(unpacked, { recursive: true, force: true })
  const result = spawnSync(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      `Expand-Archive -Path '${archive}' -DestinationPath '${unpacked}' -Force`,
    ],
    { stdio: 'inherit' },
  )
  if (result.status !== 0) throw new Error('Décompression impossible.')

  // L'archive contient le binaire et ses bibliothèques à plat : on remonte le
  // tout dans `data/maia`, faute de quoi lc0 ne trouverait pas ses DLL.
  for (const entry of readdirSync(unpacked)) {
    await rename(join(unpacked, entry), join(target, entry))
  }
  await rm(unpacked, { recursive: true, force: true })
  await rm(archive, { force: true })

  return exe
}

async function main() {
  say('')
  say('Maia — adversaires qui jouent comme des humains')
  say('')

  say('Poids :')
  const fetched = await installWeights()
  say(fetched === 0 ? '  déjà tous présents.' : `  ${fetched} téléchargé(s).`)
  say('')

  if (process.platform === 'win32') {
    say('Moteur :')
    const exe = await installLc0Windows()
    chmodSync(exe, 0o755)

    // On vérifie que le binaire répond avant de dire que c'est installé :
    // une archive corrompue passerait sinon inaperçue jusqu'à la première
    // partie.
    const probe = spawnSync(exe, ['--version'], { encoding: 'utf8', timeout: 15_000 })
    const version = (probe.stdout || probe.stderr || '').trim().split('\n')[0] ?? ''
    say(version ? `  ${version}` : '  installé (version non lue)')
  } else {
    say('Moteur :')
    say('  Lc0 ne publie pas de binaire Linux et Debian ne le paquetage pas.')
    say('  L’image Docker le compile depuis les sources, comme Stockfish.')
    say('  En local, installe-le à la main puis renseigne LC0_PATH.')
  }

  say('')
  say(`Installé dans ${target}`)
  say('Renseigne au besoin :  MAIA_PATH=<dossier>  LC0_PATH=<binaire>')
  say('')
}

main().catch((error) => {
  console.error(`\nÉchec : ${error.message}\n`)
  process.exit(1)
})
