#!/usr/bin/env node
/**
 * Installe Stockfish natif, en local.
 *
 * En production, le Dockerfile compile Stockfish depuis les sources : on obtient
 * un binaire taillé pour le processeur de la machine. Ce script sert au
 * développement, où l'on veut juste un moteur qui marche sans installer de
 * chaîne de compilation.
 *
 * Sans lui, le serveur démarre quand même : il annonce « moteur d'analyse
 * indisponible » et l'analyse se replie sur le moteur WebAssembly du navigateur.
 * C'est fonctionnel, mais nettement plus lent — d'où ce raccourci.
 *
 * Usage :  node scripts/install-stockfish.mjs
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
const target = join(root, 'data', 'stockfish')

const VERSION = 'sf_18'

/**
 * Archive à récupérer selon la machine.
 *
 * On choisit délibérément la variante `avx2` plutôt que `bmi2` ou `avx512` :
 * elle fonctionne sur tout processeur postérieur à 2013 environ, là où les
 * autres plantent sur les machines qui ne les gèrent pas. Un serveur de
 * production compile son propre binaire, mieux ajusté.
 */
const ARCHIVES = {
  'win32-x64': 'stockfish-windows-x86-64-avx2.zip',
  'win32-arm64': 'stockfish-windows-armv8.zip',
  'linux-x64': 'stockfish-ubuntu-x86-64-avx2.tar',
  'darwin-x64': 'stockfish-macos-x86-64-avx2.tar',
  'darwin-arm64': 'stockfish-macos-m1-apple-silicon.tar',
}

const platformKey = `${process.platform}-${process.arch}`
const archive = ARCHIVES[platformKey]

if (!archive) {
  console.error(`✗ Plateforme non gérée : ${platformKey}`)
  console.error('  Récupère le binaire à la main depuis :')
  console.error('  https://github.com/official-stockfish/Stockfish/releases')
  process.exit(1)
}

const binaryName = process.platform === 'win32' ? 'stockfish.exe' : 'stockfish'
const binaryPath = join(target, binaryName)

if (existsSync(binaryPath)) {
  console.log(`✓ Stockfish déjà présent (${binaryPath})`)
} else {
  mkdirSync(target, { recursive: true })

  const url = `https://github.com/official-stockfish/Stockfish/releases/download/${VERSION}/${archive}`
  const archivePath = join(target, archive)

  console.log(`↓ ${archive}`)
  await download(url, archivePath)

  console.log('  décompression…')
  extract(archivePath, target)
  await rm(archivePath, { force: true })

  // L'archive contient un dossier `stockfish/` dont le nom du binaire porte la
  // variante (`stockfish-windows-x86-64-avx2.exe`). On le remonte sous un nom
  // stable, pour que la configuration ne dépende pas de la variante choisie.
  const found = findBinary(target)
  if (!found) {
    console.error(`✗ Binaire introuvable après décompression dans ${target}`)
    process.exit(1)
  }
  if (found !== binaryPath) await rename(found, binaryPath)
  if (process.platform !== 'win32') chmodSync(binaryPath, 0o755)
}

// ── Vérification ─────────────────────────────────────────────────────────────

const check = spawnSync(binaryPath, [], { input: 'uci\nquit\n', encoding: 'utf8', timeout: 20_000 })
const banner = (check.stdout ?? '').split('\n').find((line) => line.startsWith('id name'))

if (!banner) {
  console.error('✗ Le binaire ne répond pas au protocole UCI.')
  console.error(`  ${check.error?.message ?? (check.stderr || 'aucune sortie')}`)
  process.exit(1)
}

console.log(`✓ ${banner.replace('id name ', '')}`)
console.log('')
console.log('Ajoute cette ligne à ton fichier .env :')
console.log('')
console.log(`  STOCKFISH_PATH=${binaryPath.replace(/\\/g, '/')}`)
console.log('')
console.log('Puis redémarre le serveur. L’analyse passera du moteur du')
console.log('navigateur au moteur natif — plusieurs fois plus rapide.')

// ─────────────────────────────────────────────────────────────────────────────

async function download(url, destination) {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok || !response.body) {
    throw new Error(`Téléchargement impossible (${response.status}) : ${url}`)
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(destination))
}

/**
 * Décompresse avec les outils du système.
 *
 * Sous Windows on passe par PowerShell : dans un terminal Git Bash, le `tar`
 * trouvé sur le chemin est celui de GNU, qui prend le `C:` d'un chemin absolu
 * pour un nom de machine distante.
 */
function extract(archivePath, destination) {
  const command =
    process.platform === 'win32'
      ? {
          file: 'powershell',
          args: [
            '-NoProfile',
            '-Command',
            `Expand-Archive -LiteralPath '${archivePath}' -DestinationPath '${destination}' -Force`,
          ],
        }
      : { file: 'tar', args: ['-xf', archivePath, '-C', destination] }

  const result = spawnSync(command.file, command.args, { stdio: 'inherit' })
  if (result.error || result.status !== 0) {
    throw new Error(`Décompression impossible : ${archivePath}`)
  }
}

/** Cherche l'exécutable dans l'arborescence extraite, quel que soit son nom. */
function findBinary(directory, depth = 0) {
  if (depth > 3) return null

  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry)
    const info = statSync(full)

    if (info.isDirectory()) {
      const found = findBinary(full, depth + 1)
      if (found) return found
      continue
    }
    // On écarte les fichiers annexes de l'archive : licence, réseau NNUE, etc.
    if (!/^stockfish/i.test(entry)) continue
    if (/\.(nnue|txt|md|zip|tar)$/i.test(entry)) continue
    if (process.platform === 'win32' && !entry.toLowerCase().endsWith('.exe')) continue

    return full
  }
  return null
}
