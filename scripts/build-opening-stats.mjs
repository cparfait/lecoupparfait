#!/usr/bin/env node
/**
 * Statistiques d'ouvertures, calculées depuis les vraies parties.
 *
 * Notre explorateur sait dire **comment s'appelle** chaque suite. Il ne sait pas
 * dire laquelle les joueurs choisissent, ni laquelle leur réussit. Pour un
 * débutant, c'est pourtant la seule question utile : savoir qu'une variante
 * s'appelle « Partie espagnole » n'aide pas à décider, savoir que les joueurs
 * de son niveau y marquent 49 % contre 54 % à l'italienne, si.
 *
 * Lichess publie ces statistiques par une API, mais elle demande désormais un
 * jeton, et l'interroger ferait sortir du réseau à chaque position consultée.
 * On calcule donc tout **à l'avance**, une fois, depuis la base de parties
 * publiée sous CC0 — et l'application n'appelle plus personne.
 *
 * Source : https://database.lichess.org/standard/
 *
 * Usage :
 *   node scripts/build-opening-stats.mjs data/downloads/parties-2014-07.pgn.zst
 *   OPENING_STATS_PLIES=16 node scripts/build-opening-stats.mjs <fichier>
 */

import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createZstdDecompress } from 'node:zlib'
import { Chess } from 'chess.js'
import { stripPzstdMarkers } from './lib/lichess-stream.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

/**
 * Profondeur retenue.
 *
 * Au-delà d'une douzaine de coups, chaque position devient unique et n'a plus
 * assez de parties pour qu'une statistique veuille dire quoi que ce soit. C'est
 * aussi là que s'arrête l'intérêt : un débutant a besoin d'aide pour choisir sa
 * troisième pièce à sortir, pas pour départager deux nuances au coup 25.
 */
const MAX_PLIES = Number(process.env.OPENING_STATS_PLIES ?? 14)

/**
 * Nombre minimal de parties pour qu'une position soit conservée.
 *
 * En dessous, le pourcentage affiché serait du bruit : trois parties gagnées
 * sur cinq ne veut rien dire, et l'afficher tromperait plus que se taire.
 */
const MIN_GAMES = Number(process.env.OPENING_STATS_MIN ?? 40)

/**
 * Tranches de classement.
 *
 * Les statistiques d'un débutant n'ont rien à voir avec celles d'un joueur de
 * club : le gambit qui « marche » à 1000 Elo est réfuté à 1900. Trois tranches
 * suffisent à le montrer sans démultiplier la taille du fichier.
 *
 * Les bornes suivent la population réelle du jeu de données, pas une idée de
 * ce qu'elle devrait être. Découpées à 1200 et 1800, la tranche basse ne
 * recueillait que 237 positions contre 18 000 pour la médiane : personne ne
 * jouait sous 1200 sur Lichess en 2014, et la tranche la plus utile aux
 * débutants était la seule à être vide.
 */
const BANDS = [
  { id: 'debutant', min: 0, max: 1500, label: 'Jusqu’à 1500' },
  { id: 'club', min: 1500, max: 1900, label: '1500 à 1900' },
  { id: 'fort', min: 1900, max: 9999, label: 'Au-delà de 1900' },
]

const source = process.argv[2]
if (!source || !existsSync(source)) {
  console.error('✗ Fichier de parties introuvable.')
  console.error('')
  console.error('  Télécharge un mois depuis https://database.lichess.org/standard/')
  console.error('  puis :  node scripts/build-opening-stats.mjs <fichier.pgn.zst>')
  console.error('')
  console.error('  Un mois ancien suffit largement et pèse bien moins lourd :')
  console.error('  lichess_db_standard_rated_2014-07.pgn.zst fait 191 Mo.')
  process.exit(1)
}

// ─────────────────────────────────────────────────────────────────────────────
//  Agrégation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `tranche → position (EPD) → coup (SAN) → [blancs, nulles, noirs]`.
 *
 * On compte par position **et par coup**, pas par ouverture nommée : c'est ce
 * qui permet ensuite de répondre « d'ici, voilà ce qu'on joue », y compris pour
 * les positions atteintes par transposition.
 */
const stats = new Map(BANDS.map((band) => [band.id, new Map()]))

/** EPD : la FEN sans les compteurs, pour que les transpositions se rejoignent. */
function toEpd(fen) {
  return fen.split(' ').slice(0, 4).join(' ')
}

function bandFor(elo) {
  for (const band of BANDS) {
    if (elo >= band.min && elo < band.max) return band.id
  }
  return null
}

/** Retire les annotations d'un mouvement PGN : `1. e4 { [%eval 0.2] } e5` */
function cleanMovetext(line) {
  return line
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\$\d+/g, ' ')
    .replace(/\([^()]*\)/g, ' ')
    .replace(/\d+\.(\.\.)?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const RESULT_INDEX = { '1-0': 0, '1/2-1/2': 1, '0-1': 2 }

let lus = 0
let retenus = 0
const headers = {}

const flux = createReadStream(source).pipe(stripPzstdMarkers()).pipe(createZstdDecompress())
const lignes = createInterface({ input: flux, crlfDelay: Infinity })

const debut = Date.now()

for await (const ligne of lignes) {
  if (ligne.startsWith('[')) {
    const match = /^\[(\w+)\s+"(.*)"\]$/.exec(ligne)
    if (match) headers[match[1]] = match[2]
    continue
  }
  if (!ligne.trim()) continue

  // Ligne de coups : la partie est complète, on la traite puis on repart.
  lus++
  // Une ligne complète par palier, pas un retour chariot : dans un journal
  // redirigé, `\r` ne montre rien tant que le script n'a pas fini, et on reste
  // vingt minutes sans savoir s'il travaille ou s'il est bloqué.
  if (lus % 50_000 === 0) {
    const minutes = ((Date.now() - debut) / 60000).toFixed(1)
    console.log(
      `  ${lus.toLocaleString('fr-FR')} parties · ${retenus.toLocaleString('fr-FR')} retenues · ${minutes} min`,
    )
  }

  const result = RESULT_INDEX[headers.Result]
  if (result === undefined) {
    for (const key of Object.keys(headers)) delete headers[key]
    continue
  }

  // On classe sur la moyenne des deux joueurs : une partie entre 900 et 1700
  // n'appartient franchement à aucune des deux tranches.
  const white = Number(headers.WhiteElo)
  const black = Number(headers.BlackElo)
  const band =
    Number.isFinite(white) && Number.isFinite(black)
      ? bandFor(Math.round((white + black) / 2))
      : null

  if (band) {
    const table = stats.get(band)
    const board = new Chess()
    const moves = cleanMovetext(ligne).split(' ')

    for (let i = 0; i < moves.length && i < MAX_PLIES; i++) {
      const san = moves[i]
      if (!san || san === '1-0' || san === '0-1' || san === '1/2-1/2' || san === '*') break

      const epd = toEpd(board.fen())
      try {
        board.move(san)
      } catch {
        break
      }

      let position = table.get(epd)
      if (!position) {
        position = new Map()
        table.set(epd, position)
      }
      const counts = position.get(san) ?? [0, 0, 0]
      counts[result]++
      position.set(san, counts)
    }
    retenus++
  }

  for (const key of Object.keys(headers)) delete headers[key]
}

process.stdout.write('\r' + ' '.repeat(80) + '\r')

// ─────────────────────────────────────────────────────────────────────────────
//  Écriture
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format compact : un tableau par position plutôt qu'un objet par coup.
 *
 * `[epd, [[san, blancs, nulles, noirs], …]]`
 *
 * Les noms de champs répétés soixante mille fois pèsent plus lourd que les
 * données elles-mêmes. Le fichier est relu une fois au chargement, la forme
 * n'a pas besoin d'être agréable à l'œil.
 */
const sortie = { format: 'coupparfait-opening-stats-v1', source: 'database.lichess.org (CC0)', plies: MAX_PLIES, bands: [] }

for (const band of BANDS) {
  const table = stats.get(band.id)
  const rows = []

  for (const [epd, moves] of table) {
    let total = 0
    for (const counts of moves.values()) total += counts[0] + counts[1] + counts[2]
    if (total < MIN_GAMES) continue

    const liste = [...moves.entries()]
      .map(([san, [w, d, b]]) => [san, w, d, b])
      // Du plus joué au moins joué : c'est l'ordre dans lequel on veut lire.
      .sort((a, b) => b[1] + b[2] + b[3] - (a[1] + a[2] + a[3]))
      // Au-delà de huit réponses, la queue est anecdotique et double le poids.
      .slice(0, 8)

    rows.push([epd, liste])
  }

  sortie.bands.push({ id: band.id, label: band.label, positions: rows })
  console.log(`  ${band.label.padEnd(18)} ${rows.length.toLocaleString('fr-FR').padStart(8)} positions`)
}

const cible = join(root, 'apps', 'web', 'public', 'data')
mkdirSync(cible, { recursive: true })
const json = JSON.stringify(sortie)
writeFileSync(join(cible, 'opening-stats.json'), json)

console.log('')
console.log(`✓ ${lus.toLocaleString('fr-FR')} parties lues, ${retenus.toLocaleString('fr-FR')} retenues`)
console.log(`  profondeur ${MAX_PLIES} demi-coups · minimum ${MIN_GAMES} parties par position`)
console.log(`  → apps/web/public/data/opening-stats.json (${Math.round(json.length / 1024)} Ko)`)
