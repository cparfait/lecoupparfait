#!/usr/bin/env node
/**
 * Installe Stockfish WebAssembly dans les fichiers publics de l'application.
 *
 * Deux variantes sont copiées :
 *
 *  - `stockfish-18-lite.js` + `.wasm` (7 Mo) — **multi-fils**. La plus forte,
 *    mais elle exige que la page soit isolée en origine croisée (en-têtes COOP
 *    et COEP, posés dans `next.config.ts`).
 *  - `stockfish-18-lite-single.js` + `.wasm` (7,3 Mo) — **mono-fil**, sans
 *    aucune exigence particulière. C'est le filet de sécurité : elle tourne
 *    partout, y compris derrière un proxy qui réécrit les en-têtes.
 *
 * La variante complète (113 Mo, réseau NNUE intégral) n'est volontairement pas
 * embarquée : son téléchargement rendrait la première partie insupportable.
 * Pour l'analyse en profondeur, c'est le Stockfish **natif** du serveur qui
 * prend le relais — bien plus rapide encore, et sans rien à télécharger.
 *
 * Ces fichiers ne sont pas versionnés (voir .gitignore) : relance ce script
 * après un `npm install`.
 */

import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const source = join(root, 'node_modules', 'stockfish', 'bin')
const target = join(root, 'apps', 'web', 'public', 'engine')

const FILES = [
  'stockfish-18-lite.js',
  'stockfish-18-lite.wasm',
  'stockfish-18-lite-single.js',
  'stockfish-18-lite-single.wasm',
]

if (!existsSync(source)) {
  console.error('✗ Le paquet « stockfish » est introuvable dans node_modules.')
  console.error('  Lance d’abord :  npm install')
  process.exit(1)
}

mkdirSync(target, { recursive: true })

let totalBytes = 0
for (const file of FILES) {
  const from = join(source, file)
  if (!existsSync(from)) {
    console.warn(`  ! absent du paquet : ${file}`)
    continue
  }
  const to = join(target, file)
  copyFileSync(from, to)
  const size = statSync(to).size
  totalBytes += size
  console.log(`  ✓ ${file.padEnd(32)} ${(size / 1024 / 1024).toFixed(1)} Mo`)
}

// Note de licence : Stockfish est sous GPLv3, ce qui impose sa mention à côté
// des binaires distribués.
writeFileSync(
  join(target, 'LICENSE.txt'),
  [
    'Stockfish 18 — moteur d’échecs',
    'Copyright (c) les auteurs de Stockfish',
    'https://github.com/official-stockfish/Stockfish',
    '',
    'Compilation WebAssembly : Stockfish.js par Nathan Rugg',
    'https://github.com/nmrugg/stockfish.js',
    '',
    'Distribué sous licence GNU General Public License version 3 ou ultérieure.',
    'https://www.gnu.org/licenses/gpl-3.0.txt',
    '',
    'C’est cette dépendance qui place Le Coup Parfait sous licence AGPL-3.0-or-later.',
    '',
  ].join('\n'),
)

console.log(
  `\n✓ Moteur installé (${(totalBytes / 1024 / 1024).toFixed(1)} Mo) → apps/web/public/engine/`,
)
