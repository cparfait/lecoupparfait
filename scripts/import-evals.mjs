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
 *  - **les trois meilleures variantes**, pas les cinq. On n'en gardait qu'une,
 *    au motif que la variante numéro cinq d'une position d'ouverture
 *    n'intéresse personne. C'est vrai de la cinquième et faux des deux
 *    suivantes : l'analyse de partie en demande trois depuis qu'elle affiche
 *    « ce que tu pouvais jouer », si bien que huit millions de positions
 *    analysées à quarante demi-coups ne servaient à rien là où elles servaient
 *    le plus. Trois est le compte exact de ce qu'on affiche ;
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

// Node ne lit pas `.env` de lui-même, et ce script tourne seul — ni Next ni
// drizzle-kit ne s'en chargent pour lui. Sans cette ligne, il s'arrêtait sur
// « DATABASE_URL est absente. Renseigne-la dans .env. » alors qu'elle y était :
// un message qui désigne un fichier qu'on ne lit pas envoie chercher la panne
// exactement là où elle n'est pas.
try {
  process.loadEnvFile(new URL('../.env', import.meta.url))
} catch {
  // Pas de fichier : la connexion viendra de l'environnement, ou l'erreur
  // suivante le dira clairement.
}

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
 * Profondeur à partir de laquelle on préfère les variantes à la profondeur.
 *
 * Notre propre moteur tourne à dix-huit demi-coups. Une analyse Lichess à
 * vingt-six est donc déjà nettement meilleure que ce qu'on produirait, et
 * échanger les huit derniers demi-coups contre deux variantes supplémentaires
 * est un bon marché. En dessous, l'échange n'en vaut plus la peine : on garde
 * la profondeur.
 */
const PROFONDEUR_SUFFISANTE = 26

/**
 * Retient la meilleure analyse d'une entrée.
 *
 * Le fichier en contient plusieurs par position, produites à des moments et des
 * profondeurs différentes — et surtout avec des nombres de variantes
 * différents. On gardait la plus profonde, ce qui semblait évident et coûtait
 * cher : **mesuré sur 60 000 positions, la plus profonde n'a les trois
 * variantes que dans 31 % des cas, alors qu'une autre analyse de la même
 * position les a dans 37 % de plus.** On jetait donc plus d'occasions qu'on
 * n'en gardait, et l'analyse de partie — qui demande trois variantes — repartait
 * sur le moteur pour rien.
 *
 * On préfère donc l'analyse qui sait répondre à une demande en MultiPV, à
 * condition qu'elle reste assez profonde. Le coût mesuré est une médiane de
 * sept demi-coups de profondeur en moins ; le gain est de passer de 31 % à
 * environ 68 % des positions exploitables à trois variantes.
 *
 * On ne mélange pas deux analyses — la ligne principale de l'une, les variantes
 * de l'autre. Leurs scores ne seraient plus comparables entre eux, et la liste
 * « ce que tu pouvais jouer » afficherait un deuxième choix mieux noté que le
 * premier.
 */
function bestEval(evals) {
  const utilisables = evals.filter((item) => item?.pvs?.length)
  if (utilisables.length === 0) return null

  const plusProfond = (liste) =>
    liste.reduce((a, b) =>
      b.depth > a.depth || (b.depth === a.depth && (b.knodes ?? 0) > (a.knodes ?? 0)) ? b : a,
    )

  const riches = utilisables.filter(
    (item) => item.pvs.length >= 3 && item.depth >= PROFONDEUR_SUFFISANTE,
  )
  return plusProfond(riches.length > 0 ? riches : utilisables)
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

  /*
    Quand la nouvelle analyse remplace-t-elle celle en base ?

    Deux cas, et le second est le nerf de l'affaire :

     1. **elle est plus profonde** — le cas d'origine, une meilleure analyse
        chasse la moins bonne ;
     2. **elle porte plus de variantes et reste assez profonde** — c'est celui
        qui compte. Une entrée à une seule variante ne sert à rien à l'analyse
        de partie, qui en demande trois ; une entrée à trois variantes et
        vingt-six demi-coups la sert entièrement, et vingt-six reste très
        au-dessus des dix-huit de notre moteur.

    Sans le second cas, changer la règle de sélection à la lecture du fichier
    n'aurait rien changé en base : les entrées déjà présentes sont profondes, et
    la clause d'origine refusait par principe toute analyse moins profonde
    qu'elles. Mesuré : le premier passage n'a rien mis à jour du tout.

    Toutes les colonnes suivent la même décision. Prendre la ligne principale
    de l'une et les variantes de l'autre donnerait des scores non comparables
    entre eux, et la liste « ce que tu pouvais jouer » afficherait un deuxième
    choix mieux noté que le premier.
  */
  const prend = sql`(
    position_evals.depth < excluded.depth
    or (
      coalesce(jsonb_array_length(position_evals.alt_lines), 0)
        < coalesce(jsonb_array_length(excluded.alt_lines), 0)
      and excluded.depth >= ${PROFONDEUR_SUFFISANTE}
    )
  )`

  await sql`
    insert into position_evals ${sql(
      valeurs,
      'epd',
      'cp',
      'mate',
      'depth',
      'best',
      'line',
      'alt_lines',
    )}
    on conflict (epd) do update set
      cp = case when ${prend} then excluded.cp else position_evals.cp end,
      mate = case when ${prend} then excluded.mate else position_evals.mate end,
      best = case when ${prend} then excluded.best else position_evals.best end,
      line = case when ${prend} then excluded.line else position_evals.line end,
      depth = case when ${prend} then excluded.depth else position_evals.depth end,
      alt_lines = case when ${prend} then excluded.alt_lines else position_evals.alt_lines end
    where ${prend}
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

    /*
      Les variantes secondaires, jusqu'à deux.
      La principale reste dans sa colonne : la répéter ici coûterait cinquante
      octets sur huit millions de lignes sans rien apprendre. `null` plutôt
      qu'un tableau vide quand il n'y en a pas — c'est le cas de plus de la
      moitié des positions, et un tableau vide occuperait de la place pour dire
      « rien ».
    */
    const autres = best.pvs
      .slice(1, 3)
      .map((autre) => ({
        ...(autre.cp !== undefined && autre.cp !== null ? { cp: autre.cp } : {}),
        ...(autre.mate !== undefined && autre.mate !== null ? { mate: autre.mate } : {}),
        line: (autre.line ?? '').split(' ').slice(0, 6).join(' '),
      }))
      .filter((autre) => autre.line.length > 0)

    lot.push({
      epd,
      cp: pv.cp ?? null,
      mate: pv.mate ?? null,
      depth: best.depth,
      best: first || null,
      // Six demi-coups suffisent à montrer l'idée ; la ligne complète en fait
      // souvent trente et pèserait plus que tout le reste de la table.
      line: line.split(' ').slice(0, 6).join(' ') || null,
      // `alt_lines` et non `altLines` : postgres.js prend les clés de l'objet
      // pour noms de colonnes, sans conversion. Et `sql.json` plutôt qu'une
      // chaîne, sinon le tableau serait rangé comme *une chaîne* JSON au lieu
      // d'un tableau — la lecture ne verrait qu'un texte.
      alt_lines: autres.length > 0 ? sql.json(autres) : null,
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
