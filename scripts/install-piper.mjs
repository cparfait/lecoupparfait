#!/usr/bin/env node
/**
 * Installe la voix neuronale du coach, en local.
 *
 * En production tout est déjà dans l'image Docker ; ce script sert au
 * développement, pour entendre les vraies voix sans monter toute la pile.
 *
 * Ce qu'il fait :
 *  1. télécharge l'exécutable Piper correspondant à la machine ;
 *  2. télécharge les voix françaises et anglaises ;
 *  3. affiche les deux variables d'environnement à poser dans `.env`.
 *
 * Tout est libre : Piper est sous licence MIT, les voix sous CC-BY-4.0 ou
 * équivalent. Rien n'est envoyé nulle part — la synthèse se fait sur la
 * machine, hors ligne, comme le reste du projet.
 *
 * Usage :  node scripts/install-piper.mjs
 */

import { createWriteStream, existsSync, mkdirSync, chmodSync } from 'node:fs'
import { readdir, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'
import { spawnSync } from 'node:child_process'
import { Readable } from 'node:stream'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const target = join(root, 'data', 'piper')
const voicesDir = join(target, 'voices')

const PIPER_VERSION = '2023.11.14-2'

/** Archive à récupérer selon la machine. */
const ARCHIVES = {
  'win32-x64': 'piper_windows_amd64.zip',
  'linux-x64': 'piper_linux_x86_64.tar.gz',
  'linux-arm64': 'piper_linux_aarch64.tar.gz',
  'darwin-x64': 'piper_macos_x64.tar.gz',
  'darwin-arm64': 'piper_macos_aarch64.tar.gz',
}

/**
 * Voix installées.
 *
 * Deux françaises — une féminine, une masculine — pour laisser le choix du
 * timbre, plus une anglaise pour la version anglophone de l'interface. Le
 * niveau « medium » est le bon compromis : « low » sonne encore synthétique,
 * « high » demande beaucoup plus de calcul pour un gain discret.
 */
const VOICES = [
  'fr/fr_FR/siwis/medium/fr_FR-siwis-medium',
  'fr/fr_FR/tom/medium/fr_FR-tom-medium',
  'en/en_GB/alba/medium/en_GB-alba-medium',
]

const platformKey = `${process.platform}-${process.arch}`
const archive = ARCHIVES[platformKey]

if (!archive) {
  console.error(`✗ Plateforme non gérée : ${platformKey}`)
  console.error('  Récupère l’exécutable à la main depuis :')
  console.error('  https://github.com/rhasspy/piper/releases')
  process.exit(1)
}

mkdirSync(voicesDir, { recursive: true })

// ── Exécutable ───────────────────────────────────────────────────────────────

const binaryName = process.platform === 'win32' ? 'piper.exe' : 'piper'
const binaryPath = join(target, 'piper', binaryName)

if (existsSync(binaryPath)) {
  console.log(`✓ Piper déjà présent (${binaryPath})`)
} else {
  const url = `https://github.com/rhasspy/piper/releases/download/${PIPER_VERSION}/${archive}`
  const archivePath = join(target, archive)

  console.log(`↓ ${archive}`)
  await download(url, archivePath)

  console.log('  décompression…')
  extract(archivePath, target)
  await rm(archivePath, { force: true })

  if (!existsSync(binaryPath)) {
    console.error(`✗ Exécutable introuvable après décompression : ${binaryPath}`)
    process.exit(1)
  }
  if (process.platform !== 'win32') chmodSync(binaryPath, 0o755)
  console.log(`✓ ${binaryPath}`)
}

// ── Voix ─────────────────────────────────────────────────────────────────────

for (const voice of VOICES) {
  const name = voice.split('/').pop()
  const base = `https://huggingface.co/rhasspy/piper-voices/resolve/main/${voice}`

  for (const suffix of ['.onnx', '.onnx.json']) {
    const destination = join(voicesDir, `${name}${suffix}`)
    if (existsSync(destination)) continue
    console.log(`↓ ${name}${suffix}`)
    await download(`${base}${suffix}?download=true`, destination)
  }
}

const installed = (await readdir(voicesDir)).filter((file) => file.endsWith('.onnx'))
console.log(`✓ ${installed.length} voix installées dans ${voicesDir}`)

console.log('')
console.log('Ajoute ces deux lignes à ton fichier .env :')
console.log('')
console.log(`  PIPER_BIN=${binaryPath.replace(/\\/g, '/')}`)
console.log(`  PIPER_VOICES_DIR=${voicesDir.replace(/\\/g, '/')}`)
console.log('')
console.log('Puis redémarre le serveur. La voix neuronale sera choisie')
console.log('automatiquement dans les préférences.')

// ─────────────────────────────────────────────────────────────────────────────

async function download(url, destination) {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok || !response.body) {
    throw new Error(`Téléchargement impossible (${response.status}) : ${url}`)
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(destination))
}

/**
 * Décompresse l'archive avec les outils du système.
 *
 * On évite d'ajouter une dépendance de décompression pour un script qu'on lance
 * une fois. Sous Windows on passe par PowerShell plutôt que par `tar` : dans un
 * terminal Git Bash, le `tar` trouvé sur le chemin est celui de GNU, qui prend
 * le `C:` d'un chemin absolu pour un nom de machine distante.
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
