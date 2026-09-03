#!/usr/bin/env node
/**
 * Compile le jeu de données ECO en index exploitables par l'application.
 *
 * Entrée  : data/openings/{a,b,c,d,e}.tsv  — 3 810 ouvertures nommées (CC0, Lichess)
 * Sorties :
 *   - apps/web/public/data/openings.json   — index EPD → ouverture, chargé à la demande
 *   - data/openings/openings.compiled.json — même contenu, pour l'import en base
 *
 * Les TSV ne contiennent que `eco`, `name` et `pgn`. On rejoue chaque ligne
 * avec chess.js pour en déduire l'EPD (la position sans les compteurs de coups),
 * qui est la clé permettant de reconnaître une ouverture depuis une position
 * quelconque — y compris atteinte par transposition.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Chess } from 'chess.js'
import { translateOpeningName } from './lib/opening-names.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const sourceDir = join(root, 'data', 'openings')
const volumes = ['a', 'b', 'c', 'd', 'e']

/** Retire les compteurs de demi-coups d'une FEN : c'est l'EPD. */
function toEpd(fen) {
  return fen.split(' ').slice(0, 4).join(' ')
}

function parseTsv(content) {
  const rows = []
  const lines = content.split(/\r?\n/)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line || !line.trim()) continue
    const [eco, name, pgn] = line.split('\t')
    if (!eco || !name || !pgn) continue
    rows.push({ eco: eco.trim(), name: name.trim(), pgn: pgn.trim() })
  }
  return rows
}

/** Rejoue la suite PGN et retourne l'EPD final et la liste des coups UCI. */
function replay(pgn) {
  const board = new Chess()
  const uci = []
  // Les PGN du jeu de données sont de la forme « 1. e4 c5 2. Nf3 ».
  const tokens = pgn
    .replace(/\d+\.(\.\.)?/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  for (const san of tokens) {
    try {
      const move = board.move(san)
      uci.push(`${move.from}${move.to}${move.promotion ?? ''}`)
    } catch {
      return null
    }
  }
  return { epd: toEpd(board.fen()), uci, ply: uci.length }
}

const entries = []
const seenEpd = new Set()
let skipped = 0

for (const volume of volumes) {
  const path = join(sourceDir, `${volume}.tsv`)
  if (!existsSync(path)) {
    console.error(`✗ Fichier manquant : ${path}`)
    console.error("  Lance d'abord :  npm run data:openings:fetch")
    process.exit(1)
  }
  for (const row of parseTsv(readFileSync(path, 'utf8'))) {
    const replayed = replay(row.pgn)
    if (!replayed) {
      skipped++
      continue
    }
    // Deux noms peuvent mener à la même position ; on garde le premier, qui est
    // le plus court donc le plus général.
    if (seenEpd.has(replayed.epd)) continue
    seenEpd.add(replayed.epd)

    entries.push({
      eco: row.eco,
      name: row.name,
      nameFr: translateOpeningName(row.name),
      pgn: row.pgn,
      uci: replayed.uci.join(' '),
      epd: replayed.epd,
      ply: replayed.ply,
    })
  }
}

entries.sort((a, b) => a.eco.localeCompare(b.eco) || a.ply - b.ply)

// ── Index compact pour le navigateur ─────────────────────────────────────────
// Format tabulaire plutôt qu'objet : divise la taille du fichier par deux.
const compact = {
  format: 'coupparfait-openings-v2',
  source: 'lichess-org/chess-openings (CC0)',
  fields: ['epd', 'eco', 'name', 'nameFr', 'ply', 'uci'],
  // La suite de coups est incluse : sans elle, cliquer sur une ouverture dans
  // l'explorateur ne permettrait pas de la rejouer sur l'échiquier. Le surcoût
  // est d'environ 40 % avant compression, quelques dizaines de kilo-octets une
  // fois gzippé — largement acceptable pour une ressource chargée une fois.
  rows: entries.map((e) => [e.epd, e.eco, e.name, e.nameFr, e.ply, e.uci]),
}

const webDataDir = join(root, 'apps', 'web', 'public', 'data')
mkdirSync(webDataDir, { recursive: true })
writeFileSync(join(webDataDir, 'openings.json'), JSON.stringify(compact))

// ── Version complète pour la base de données ─────────────────────────────────
writeFileSync(join(sourceDir, 'openings.compiled.json'), JSON.stringify(entries, null, 0))

const maxPly = Math.max(...entries.map((e) => e.ply))
const byVolume = {}
for (const e of entries) {
  const v = e.eco[0]
  byVolume[v] = (byVolume[v] ?? 0) + 1
}

console.log(`✓ ${entries.length} ouvertures compilées`)
console.log(
  `  par volume ECO : ${Object.entries(byVolume)
    .map(([k, v]) => `${k}=${v}`)
    .join('  ')}`,
)
console.log(`  profondeur maximale : ${maxPly} demi-coups`)
if (skipped) console.log(`  ${skipped} lignes ignorées (PGN illisible)`)
console.log(`  → apps/web/public/data/openings.json`)
console.log(`  → data/openings/openings.compiled.json`)
