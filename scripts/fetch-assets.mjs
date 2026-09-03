#!/usr/bin/env node
/**
 * Récupère les ressources visuelles et sonores libres.
 *
 * Toutes proviennent du dépôt de Lichess (lichess-org/lila), qui les publie
 * sous des licences libres. **On n'importe que ce qui est réutilisable sans
 * restriction commerciale** : GPL, AGPL, MIT, Apache 2.0, CC0, CC BY. Les jeux
 * marqués « NC » (non commercial) sont volontairement écartés, même s'ils sont
 * très beaux : leur licence contaminerait le projet.
 *
 * Chaque ressource conserve son attribution dans ATTRIBUTION.md, comme l'exigent
 * ces licences.
 *
 * Usage :  node scripts/fetch-assets.mjs [--force]
 */

import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const webPublic = join(root, 'apps', 'web', 'public')
const force = process.argv.includes('--force')

const RAW = 'https://raw.githubusercontent.com/lichess-org/lila/master/public'

/** Jeux de pièces retenus, avec leur licence et leur auteur. */
const PIECE_SETS = [
  {
    id: 'staunton',
    source: 'cburnett',
    author: 'Colin M. L. Burnett',
    licence: 'GPL-2.0-or-later',
  },
  {
    id: 'merida',
    source: 'merida',
    author: 'Armando Hernandez Marroquin',
    licence: 'GPL-2.0-or-later',
  },
  { id: 'alpha', source: 'alpha', author: 'les auteurs de lila', licence: 'AGPL-3.0-or-later' },
  { id: 'chessnut', source: 'chessnut', author: 'Alexis Luengas', licence: 'Apache-2.0' },
  { id: 'fantasy', source: 'fantasy', author: 'Maurizio Monge', licence: 'MIT' },
  { id: 'celtic', source: 'celtic', author: 'Maurizio Monge', licence: 'MIT' },
  { id: 'spatial', source: 'spatial', author: 'Maurizio Monge', licence: 'MIT' },
  { id: 'rhosgfx', source: 'rhosgfx', author: 'RhosGFX', licence: 'CC0-1.0' },
  { id: 'pixel', source: 'pixel', author: 'therealqtpi', licence: 'AGPL-3.0-or-later' },
  { id: 'letter', source: 'letter', author: 'usolando', licence: 'AGPL-3.0-or-later' },
]

const PIECES = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP']

/** Bruitages : le jeu « standard » de Lichess, sous AGPL. */
const SOUNDS = [
  'Move',
  'Capture',
  'Check',
  'GenericNotify',
  'Victory',
  'Defeat',
  'Draw',
  'Berserk',
  'Explosion',
  'LowTime',
  'NewChallenge',
  'NewPM',
  'Confirmation',
  'Error',
  'SocialNotify',
]

async function download(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${response.status} ${url}`)
  return Buffer.from(await response.arrayBuffer())
}

async function fetchPieceSets() {
  let downloaded = 0
  let skipped = 0
  for (const set of PIECE_SETS) {
    const dir = join(webPublic, 'pieces', set.id)
    mkdirSync(dir, { recursive: true })
    for (const piece of PIECES) {
      const target = join(dir, `${piece}.svg`)
      if (!force && existsSync(target)) {
        skipped++
        continue
      }
      try {
        const data = await download(`${RAW}/piece/${set.source}/${piece}.svg`)
        writeFileSync(target, data)
        downloaded++
      } catch (error) {
        console.warn(`  ! ${set.id}/${piece} : ${error.message}`)
      }
    }
    process.stdout.write(`  ✓ ${set.id.padEnd(10)} (${set.licence})\n`)
  }
  return { downloaded, skipped }
}

/**
 * Récupère un bruitage en suivant les liens symboliques.
 *
 * Plusieurs sons du dépôt lila ne sont pas des fichiers mais des liens :
 * `Victory.mp3` désigne `GenericNotify.mp3`, `Check.mp3` désigne
 * `../Silence.mp3`. L'API « raw » de GitHub ne les suit pas — elle renvoie le
 * chemin de destination, en texte, une quinzaine d'octets.
 *
 * Sans cette résolution, six bruitages atterrissaient sur le disque sous forme
 * de fichiers texte que `decodeAudioData` rejetait sans rien dire : échec,
 * victoire, défaite et nulle étaient muets, et la panne était invisible — les
 * fichiers existaient, le script annonçait les avoir récupérés.
 */
async function downloadSound(path, depth = 0) {
  const data = await download(`${RAW}/sound/${path}`)

  // Un lien tient sur une ligne, ne contient qu'un chemin, et vise un .mp3.
  const link = data.toString('utf8').trim()
  if (depth < 4 && data.length < 256 && /^[\w./-]+\.mp3$/.test(link)) {
    const resolved = join(dirname(path), link).replaceAll('\\', '/')
    return downloadSound(resolved, depth + 1)
  }

  return data
}

async function fetchSounds() {
  const dir = join(webPublic, 'sounds')
  mkdirSync(dir, { recursive: true })
  let downloaded = 0
  for (const name of SOUNDS) {
    const target = join(dir, `${name.toLowerCase()}.mp3`)
    if (!force && existsSync(target)) continue
    try {
      const data = await downloadSound(`standard/${name}.mp3`)
      writeFileSync(target, data)
      downloaded++
    } catch (error) {
      console.warn(`  ! son ${name} : ${error.message}`)
    }
  }
  console.log(`  ✓ ${downloaded} bruitages récupérés (AGPL-3.0, Enigmahack / lila)`)
  return downloaded
}

function writeAttribution() {
  const lines = [
    '# Attribution des ressources',
    '',
    'Le Coup Parfait réutilise des ressources graphiques et sonores libres. Chacune reste',
    'la propriété de son auteur et conserve sa licence d’origine, reproduite ici',
    'comme ces licences l’exigent.',
    '',
    '## Jeux de pièces',
    '',
    'Récupérés depuis [lichess-org/lila](https://github.com/lichess-org/lila/tree/master/public/piece).',
    '',
    '| Jeu (Le Coup Parfait) | Dossier d’origine | Auteur | Licence |',
    '| --- | --- | --- | --- |',
    ...PIECE_SETS.map(
      (s) => `| \`${s.id}\` | \`piece/${s.source}\` | ${s.author} | ${s.licence} |`,
    ),
    '',
    '> Les jeux de pièces publiés sous licence **CC BY-NC-SA** (usage non commercial)',
    '> ont été délibérément écartés : leur clause non commerciale est incompatible',
    '> avec une redistribution libre du projet.',
    '',
    '## Bruitages',
    '',
    '| Fichiers | Auteur | Licence |',
    '| --- | --- | --- |',
    '| `sounds/*.mp3` | [Enigmahack](https://github.com/Enigmahack) et les auteurs de lila | AGPL-3.0-or-later |',
    '',
    '## Données',
    '',
    '| Jeu de données | Source | Licence |',
    '| --- | --- | --- |',
    '| Ouvertures ECO (3 810 entrées) | [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings) | CC0-1.0 |',
    '| Base de puzzles (6 057 356 entrées) | [database.lichess.org](https://database.lichess.org/) | CC0-1.0 |',
    '| Base d’évaluations (394 M positions) | [database.lichess.org](https://database.lichess.org/) | CC0-1.0 |',
    '| Tables de finales Syzygy (API) | [tablebase.lichess.ovh](https://tablebase.lichess.ovh/) | libre d’accès |',
    '',
    '## Moteur',
    '',
    '| Composant | Auteur | Licence |',
    '| --- | --- | --- |',
    '| Stockfish 18 (natif, serveur) | les auteurs de Stockfish | GPL-3.0-or-later |',
    '| Stockfish 18 WebAssembly (navigateur) | Nathan Rugg (`stockfish.js`) | GPL-3.0-or-later |',
    '',
    'C’est cette dépendance à Stockfish qui impose au projet une licence de la',
    'famille GPL ; Le Coup Parfait est donc publié sous **AGPL-3.0-or-later**.',
    '',
  ]
  writeFileSync(join(root, 'ATTRIBUTION.md'), lines.join('\n'))
  console.log('  ✓ ATTRIBUTION.md mis à jour')
}

console.log('Récupération des ressources libres…\n')
console.log('Jeux de pièces :')
const pieces = await fetchPieceSets()
console.log(`\nBruitages :`)
await fetchSounds()
console.log('')
writeAttribution()
console.log(
  `\nTerminé — ${pieces.downloaded} fichiers téléchargés, ${pieces.skipped} déjà présents.`,
)
