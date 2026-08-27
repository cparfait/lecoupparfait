#!/usr/bin/env node
/**
 * Import de la base d'évaluations de Lichess (CC0).
 *
 * Des centaines de millions de positions y ont été analysées à des profondeurs
 * qu'aucune machine personnelle n'atteindra en direct — souvent quarante à
 * soixante demi-coups, là où notre moteur tourne à dix-huit. Les consulter
 * avant de lancer Stockfish rend l'analyse instantanée **et** plus juste.
 *
 * Le fichier pèse 20,7 Go compressés, et bien davantage une fois déplié : on
 * ne le stocke jamais en entier. Il est lu **en flux**, ligne par ligne, et
 * seules les positions retenues partent en base. Le disque ne voit passer que
 * l'archive téléchargée.
 *
 * Ce qu'on retient, et pourquoi :
 *  - **l'analyse la plus profonde** de chaque position, les autres n'apportent
 *    rien qu'elle ne dise mieux ;
 *  - **le premier coup et sa suite**, pas les cinq variantes : la variante
 *    numéro cinq d'une position d'ouverture n'intéresse personne et triplerait
 *    le poids en base ;
 *  - **les positions à partir de N pièces**, réglable. Le défaut privilégie
 *    l'ouverture et le milieu de partie, là où un débutant joue ses parties ;
 *    les finales à trois pièces sont déjà couvertes par les tables Syzygy.
 *
 * Source : https://database.lichess.org/#evals
 *
 * Usage :
 *   node scripts/import-evals.mjs                       # depuis data/downloads
 *   EVAL_IMPORT_LIMIT=5000000 node scripts/import-evals.mjs
 *   EVAL_MIN_PIECES=20 EVAL_MIN_DEPTH=30 node scripts/import-evals.mjs
 */

import { createReadStream, existsSync, statSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createZstdDecompress } from 'node:zlib'
import postgres from 'postgres'
import { stripPzstdMarkers } from './lib/lichess-stream.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

const SOURCE = process.env.EVAL_SOURCE ?? join(root, 'data', 'downloads', 'evaluations.jsonl.zst')

/** Nombre de positions importées. `0` = tout le fichier. */
const LIMIT = Number(process.env.EVAL_IMPORT_LIMIT ?? 8_000_000)

/**
 * Pièces minimales sur l'échiquier.
 *
 * Vingt pièces, c'est encore l'ouverture ou le début du milieu de partie —
 * exactement là où une évaluation profonde change quelque chose pour un
 * débutant. En dessous, les finales sont mieux servies par les tables Syzygy,
 * qui donnent la vérité et non une estimation.
 */
const MIN_PIECES = Number(process.env.EVAL_MIN_PIECES ?? 20)

/** En dessous, l'analyse ne vaut pas mieux que la nôtre. */
const MIN_DEPTH = Number(process.env.EVAL_MIN_DEPTH ?? 22)

/** Lignes envoyées en une fois. Compromis mémoire / allers-retours. */
const BATCH = 5_000

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('✗ DATABASE_URL est absente. Renseigne-la dans .env.')
  process.exit(1)
}

if (!existsSync(SOURCE)) {
  console.error(`✗ Fichier introuvable : ${SOURCE}`)
  console.error('')
  console.error('  Télécharge-le d’abord (20,7 Go) :')
  console.error('  curl -L -o data/downloads/evaluations.jsonl.zst \\')
  console.error('       https://database.lichess.org/lichess_db_eval.jsonl.zst')
  process.exit(1)
}

/** Compte les pièces d'un EPD sans construire d'échiquier. */
function countPieces(epd) {
  const placement = epd.slice(0, epd.indexOf(' '))
  let count = 0
  for (let i = 0; i < placement.length; i++) {
    const c = placement.charCodeAt(i)
    // A–Z ou a–z : tout ce qui n'est ni un chiffre ni une barre oblique.
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) count++
  }
  return count
}

/**
 * Retient la meilleure analyse d'une entrée.
 *
 * Le fichier en contient plusieurs par position, produites à des moments et
 * des profondeurs différentes. On garde la plus profonde ; à profondeur égale,
 * celle qui a exploré le plus de nœuds.
 */
function bestEval(evals) {
  let best = null
  for (const item of evals) {
    if (!item?.pvs?.length) continue
    if (
      !best ||
      item.depth > best.depth ||
      (item.depth === best.depth && (item.knodes ?? 0) > (best.knodes ?? 0))
    ) {
      best = item
    }
  }
  return best
}

const sql = postgres(DATABASE_URL, { max: 4, onnotice: () => {} })

const taille = statSync(SOURCE).size
console.log(`▸ Import des évaluations`)
console.log(`  source     ${SOURCE}`)
console.log(`  archive    ${(taille / 1024 ** 3).toFixed(1)} Go`)
console.log(`  filtres    ≥ ${MIN_PIECES} pièces · profondeur ≥ ${MIN_DEPTH}`)
console.log(`  plafond    ${LIMIT === 0 ? 'aucun' : LIMIT.toLocaleString('fr-FR')} positions`)
console.log('')

const flux = createReadStream(SOURCE).pipe(stripPzstdMarkers()).pipe(createZstdDecompress())
const lignes = createInterface({ input: flux, crlfDelay: Infinity })

let lues = 0
let retenues = 0
let lot = []
const debut = Date.now()

/** Envoie un lot, en écrasant une entrée existante moins profonde. */
async function flush() {
  if (lot.length === 0) return
  const valeurs = lot
  lot = []

  await sql`
    insert into position_evals ${sql(valeurs, 'epd', 'cp', 'mate', 'depth', 'best', 'line')}
    on conflict (epd) do update set
      cp = excluded.cp,
      mate = excluded.mate,
      depth = excluded.depth,
      best = excluded.best,
      line = excluded.line
    where position_evals.depth < excluded.depth
  `
}

try {
  for await (const ligne of lignes) {
    if (!ligne) continue
    lues++

    let entree
    try {
      entree = JSON.parse(ligne)
    } catch {
      continue
    }

    const epd = entree.fen
    if (!epd) continue
    if (countPieces(epd) < MIN_PIECES) continue

    const best = bestEval(entree.evals ?? [])
    if (!best || best.depth < MIN_DEPTH) continue

    const pv = best.pvs[0]
    const line = pv.line ?? ''
    const first = line.slice(0, line.indexOf(' ') === -1 ? line.length : line.indexOf(' '))

    lot.push({
      epd,
      cp: pv.cp ?? null,
      mate: pv.mate ?? null,
      depth: best.depth,
      best: first || null,
      // Six demi-coups suffisent à montrer l'idée ; la ligne complète en fait
      // souvent trente et pèserait plus que tout le reste de la table.
      line: line.split(' ').slice(0, 6).join(' ') || null,
    })
    retenues++

    if (lot.length >= BATCH) await flush()

    if (lues % 1_000_000 === 0) {
      const minutes = ((Date.now() - debut) / 60000).toFixed(1)
      process.stdout.write(
        `\r  ${(lues / 1e6).toFixed(0)} M lues · ${(retenues / 1e6).toFixed(2)} M retenues · ${minutes} min`,
      )
    }

    if (LIMIT > 0 && retenues >= LIMIT) break
  }

  await flush()
  process.stdout.write('\r' + ' '.repeat(80) + '\r')

  const [{ count }] = await sql`select count(*)::int as count from position_evals`
  console.log(`✓ ${retenues.toLocaleString('fr-FR')} positions importées`)
  console.log(`  ${lues.toLocaleString('fr-FR')} lignes lues au total`)
  console.log(`  ${count.toLocaleString('fr-FR')} positions en base`)
} finally {
  lignes.close()
  flux.destroy()
  await sql.end({ timeout: 5 })
}
