#!/usr/bin/env node
/**
 * Installe Stockfish WebAssembly dans les fichiers publics de l'application.
 *
 * Deux variantes sont copiées :
 *
 *  - `stockfish-lite.js` + `.wasm` (1,6 Mo) — **multi-fils**. La plus forte,
 *    mais elle exige que la page soit isolée en origine croisée (en-têtes COOP
 *    et COEP, posés dans `next.config.ts`).
 *  - `stockfish-lite-single.js` + `.wasm` (1,7 Mo) — **mono-fil**, sans aucune
 *    exigence particulière. C'est le filet de sécurité : elle tourne partout,
 *    y compris derrière un proxy qui réécrit les en-têtes.
 *
 * La variante complète (réseau NNUE intégral, 99 Mo) n'est volontairement pas
 * embarquée : son téléchargement rendrait la première partie insupportable.
 * Pour l'analyse en profondeur, c'est le Stockfish **natif** du serveur qui
 * prend le relais — bien plus rapide encore, et sans rien à télécharger.
 *
 * ── Pourquoi les noms perdent leur numéro de version ─────────────────────────
 *
 * Le paquet livre `stockfish-19-lite.js` ; ce script le pose en
 * `stockfish-lite.js`. Deux raisons, et la seconde est la vraie :
 *
 *  - le chargeur déduit son `.wasm` de sa propre URL — `location.pathname`
 *    avec `.js` remplacé par `.wasm` —, donc renommer la paire de bout en bout
 *    ne lui coûte rien ;
 *  - `client.ts` écrit ce chemin en dur. Tant qu'il portait le numéro, monter
 *    de version demandait de modifier un fichier du navigateur en même temps
 *    qu'un script d'installation, et rien ne signalait l'oubli : le moteur se
 *    taisait, l'analyse se repliait, on ne voyait rien. Le numéro vit
 *    maintenant ici seulement, où il est *lu* et non écrit.
 *
 * Ces fichiers ne sont pas versionnés (voir .gitignore) : relance ce script
 * après un `npm install`.
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const source = join(root, 'node_modules', 'stockfish', 'bin')
const target = join(root, 'apps', 'web', 'public', 'engine')

if (!existsSync(source)) {
  console.error('✗ Le paquet « stockfish » est introuvable dans node_modules.')
  console.error('  Lance d’abord :  npm install')
  process.exit(1)
}

/**
 * Les variantes à poser, du nom qu'elles portent dans le paquet au nom stable.
 *
 * Le numéro de version est *lu* et non écrit : le jour où le paquet livre du
 * `stockfish-20-lite`, ce script le trouve seul. S'il n'en trouve aucun, c'est
 * que le paquet a changé de convention — on s'arrête plutôt que de copier un
 * moteur au hasard.
 */
const disponibles = readdirSync(source)
const VARIANTES = ['lite', 'lite-single']

const aCopier = []
let version = null

for (const variante of VARIANTES) {
  const motif = new RegExp(`^stockfish-(\\d+)-${variante}\\.js$`)
  const trouve = disponibles.find((nom) => motif.test(nom))
  if (!trouve) {
    console.error(`✗ Variante introuvable dans le paquet : stockfish-<version>-${variante}.js`)
    console.error(`  Le paquet contient : ${disponibles.join(', ')}`)
    process.exit(1)
  }
  version ??= trouve.match(motif)[1]
  for (const extension of ['js', 'wasm']) {
    aCopier.push({
      de: trouve.replace(/\.js$/, `.${extension}`),
      vers: `stockfish-${variante}.${extension}`,
    })
  }
}

mkdirSync(target, { recursive: true })

/*
  On efface d'abord ce qui traînait. Sans ça, les fichiers d'une version
  précédente restent à côté des nouveaux — sept mégaoctets de Stockfish 18
  servis à personne, et un doute permanent sur celui que le navigateur charge.
*/
for (const nom of readdirSync(target)) {
  if (/^stockfish.*\.(js|wasm)$/.test(nom)) rmSync(join(target, nom), { force: true })
}

let totalBytes = 0
for (const { de, vers } of aCopier) {
  const from = join(source, de)
  if (!existsSync(from)) {
    console.error(`✗ Absent du paquet : ${de}`)
    process.exit(1)
  }
  const to = join(target, vers)
  copyFileSync(from, to)
  const size = statSync(to).size
  totalBytes += size
  console.log(`  ✓ ${vers.padEnd(30)} ${(size / 1024 / 1024).toFixed(1)} Mo   ← ${de}`)
}

// Note de licence : Stockfish est sous GPLv3, ce qui impose sa mention à côté
// des binaires distribués.
writeFileSync(
  join(target, 'LICENSE.txt'),
  [
    `Stockfish ${version} — moteur d’échecs`,
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
  `\n✓ Stockfish ${version} installé (${(totalBytes / 1024 / 1024).toFixed(1)} Mo) → apps/web/public/engine/`,
)
