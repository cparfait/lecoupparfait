#!/usr/bin/env node
/**
 * Vérifie les puzzles importés, un par un, contre les règles du jeu.
 *
 * On nous a signalé que « certains puzzles ne semblent pas corrects ». La base
 * vient de Lichess et fait plusieurs millions de lignes : impossible de trancher
 * à l'œil, et impossible de faire confiance sans regarder. Ce script rejoue donc
 * chaque solution sur son échiquier et refuse tout ce qui ne tient pas.
 *
 * Cinq contrôles, dans l'ordre où ils coûtent :
 *
 *  1. **La position se lit.** Une FEN invalide donne un plateau vide et un
 *     puzzle injouable.
 *  2. **Chaque coup de la solution est légal**, joué dans l'ordre. C'est le
 *     contrôle qui attrape une ligne tronquée ou décalée d'un demi-coup.
 *  3. **Le nombre de demi-coups est pair.** Convention Lichess : le premier coup
 *     est celui de l'adversaire, et la solution se termine sur le coup du
 *     joueur. Une longueur impaire signifie qu'on demanderait au joueur de jouer
 *     un coup qui n'est pas le sien — c'est exactement le symptôme « ce puzzle
 *     n'a pas de sens ».
 *  4. **Le camp est cohérent** : le joueur joue l'inverse du trait de la FEN.
 *  5. **Un mat annoncé est un mat.** `mateIn1`, `mateIn2`, `mateIn3` et `mate`
 *     doivent finir sur un échec et mat, au bon nombre de coups.
 *
 * Ce qu'il ne vérifie **pas** : que la solution soit la meilleure. Cela demande
 * un moteur, plusieurs secondes par position, et Lichess l'a déjà fait avec
 * Stockfish avant de publier. Ce script cherche les puzzles cassés, pas les
 * puzzles discutables.
 *
 * Options :
 *   --limit=N     nombre de puzzles examinés (0 = tous). Défaut 20000.
 *   --offset=N    à partir de quelle ligne. Défaut 0.
 *   --purge       supprime de la base les puzzles jugés invalides.
 *
 * Usage :
 *   node scripts/check-puzzles.mjs
 *   node scripts/check-puzzles.mjs --limit=0            # les cinq millions
 *   node scripts/check-puzzles.mjs --limit=0 --purge
 */

import { readFileSync } from 'node:fs'
import postgres from 'postgres'
import { Chess } from 'chess.js'

// ── Configuration ────────────────────────────────────────────────────────────

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [cle, valeur] = arg.replace(/^--/, '').split('=')
    return [cle, valeur ?? '1']
  }),
)

const LIMITE = Number(args.get('limit') ?? 20_000)
const DEPART = Number(args.get('offset') ?? 0)
const PURGER = args.has('purge')
/** Combien de lignes on lit par aller-retour. Au-delà, la mémoire souffre. */
const PAQUET = 5_000

/**
 * `DATABASE_URL` est lue du fichier `.env` à défaut de l'environnement.
 *
 * Les autres scripts sont lancés par npm, qui charge `.env` ; celui-ci se lance
 * aussi à la main pendant qu'on enquête sur un puzzle précis.
 */
function connexion() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  try {
    const brut = readFileSync(new URL('../.env', import.meta.url), 'utf8')
    for (const ligne of brut.split('\n')) {
      const nette = ligne.trim()
      if (!nette || nette.startsWith('#')) continue
      const separateur = nette.indexOf('=')
      if (separateur < 0) continue
      if (nette.slice(0, separateur).trim() !== 'DATABASE_URL') continue
      return nette.slice(separateur + 1).trim()
    }
  } catch {
    // Pas de `.env` : le message ci-dessous dira quoi faire.
  }
  return null
}

const DATABASE_URL = connexion()
if (!DATABASE_URL) {
  console.error('✗ DATABASE_URL est absente. Renseigne-la dans .env.')
  process.exit(1)
}

// ── Le contrôle lui-même ─────────────────────────────────────────────────────

/**
 * Thèmes qui promettent un mat, et en combien de coups.
 *
 * `mateIn5` est le dernier de la série chez Lichess et signifie « en cinq coups
 * **ou plus** » : c'est l'étiquette que reçoivent tous les mats longs. Le
 * contrôle y devient donc un minimum. Le premier passage l'ignorait et rejetait
 * soixante-dix puzzles parfaitement valides sur deux cent cinquante mille —
 * tous des mats en six, sept ou huit. La donnée était juste, la règle non.
 */
const MATS = { mateIn1: 1, mateIn2: 2, mateIn3: 3, mateIn4: 4 }
const MAT_LONG = { theme: 'mateIn5', minimum: 5 }

/**
 * Rend `null` si le puzzle tient, sinon la raison du rejet.
 *
 * Une seule raison est rendue, la première rencontrée : les suivantes en
 * découlent presque toujours, et une liste de cinq griefs pour un puzzle dont la
 * FEN est illisible n'apprend rien de plus que la FEN illisible.
 */
export function verifierPuzzle(puzzle) {
  const coups = puzzle.moves.trim().split(/\s+/).filter(Boolean)
  if (coups.length === 0) return 'solution vide'

  let board
  try {
    board = new Chess(puzzle.fen)
  } catch {
    return 'position illisible'
  }

  // Le premier coup est celui de l'adversaire : le joueur a donc le trait
  // opposé à celui de la FEN. C'est la convention Lichess, et toute
  // l'application en dépend — l'écran joue ce premier coup avant de rendre la
  // main.
  if (coups.length % 2 !== 0) return `${coups.length} demi-coups : longueur impaire`

  const traitInitial = board.turn()

  for (const [index, uci] of coups.entries()) {
    const attendu = index % 2 === 0 ? traitInitial : traitInitial === 'w' ? 'b' : 'w'
    if (board.turn() !== attendu) return `coup ${index + 1} : le trait ne suit pas`
    try {
      const joue = board.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci[4] : undefined,
      })
      // chess.js corrige en silence une promotion demandée sans lettre : on
      // vérifie que le coup rendu est bien celui qui était écrit.
      const rendu = `${joue.from}${joue.to}${joue.promotion ?? ''}`
      if (rendu !== uci) return `coup ${index + 1} : « ${uci} » joué comme « ${rendu} »`
    } catch {
      return `coup ${index + 1} : « ${uci} » est illégal`
    }
  }

  // Un mat annoncé doit être un mat, et au bon compte : « mat en 2 » veut dire
  // deux coups du joueur, donc quatre demi-coups.
  for (const [theme, coupsAnnonces] of Object.entries(MATS)) {
    if (!puzzle.themes?.includes(theme)) continue
    if (!board.isCheckmate()) return `${theme} annoncé, mais la solution ne mate pas`
    if (coups.length !== coupsAnnonces * 2) {
      return `${theme} annoncé, mais la solution fait ${coups.length / 2} coups`
    }
  }
  if (puzzle.themes?.includes(MAT_LONG.theme)) {
    if (!board.isCheckmate()) return `${MAT_LONG.theme} annoncé, mais la solution ne mate pas`
    if (coups.length < MAT_LONG.minimum * 2) {
      return `${MAT_LONG.theme} annoncé, mais la solution fait ${coups.length / 2} coups`
    }
  }
  if (puzzle.themes?.includes('mate') && !board.isCheckmate()) {
    return 'mat annoncé, mais la solution ne mate pas'
  }

  return null
}

// ── Parcours ─────────────────────────────────────────────────────────────────

const sql = postgres(DATABASE_URL, { max: 2 })

const [{ n: total }] = await sql`select count(*)::int as n from puzzles`
const aExaminer = LIMITE === 0 ? Math.max(0, total - DEPART) : Math.min(LIMITE, total - DEPART)

console.log(`\n♟  Contrôle des puzzles\n`)
console.log(
  `   ${total.toLocaleString('fr-FR')} en base, ${aExaminer.toLocaleString('fr-FR')} à examiner.\n`,
)

const rejets = []
const parRaison = new Map()
let vus = 0

for (let decalage = 0; decalage < aExaminer; decalage += PAQUET) {
  const taille = Math.min(PAQUET, aExaminer - decalage)
  const lignes = await sql`
    select id, fen, moves, themes, rating
    from puzzles
    order by id
    limit ${taille}
    offset ${DEPART + decalage}
  `

  for (const puzzle of lignes) {
    vus++
    const raison = verifierPuzzle(puzzle)
    if (!raison) continue
    // On garde les cent premiers en entier : au-delà, seul le décompte par
    // raison a un sens, et cent exemples suffisent pour aller en regarder.
    if (rejets.length < 100) rejets.push({ id: puzzle.id, raison })
    const famille = raison.replace(/coup \d+/, 'coup N').replace(/« [^»]+ »/g, '« … »')
    parRaison.set(famille, (parRaison.get(famille) ?? 0) + 1)
  }

  process.stdout.write(
    `\r   ${vus.toLocaleString('fr-FR')} examinés · ${[...parRaison.values()].reduce((a, b) => a + b, 0)} rejetés`,
  )
}

process.stdout.write('\n\n')

const invalides = [...parRaison.values()].reduce((a, b) => a + b, 0)

if (invalides === 0) {
  console.log('   ✓ Aucun puzzle invalide.\n')
} else {
  console.log(
    `   ✗ ${invalides.toLocaleString('fr-FR')} puzzles invalides sur ${vus.toLocaleString('fr-FR')}.\n`,
  )
  for (const [raison, compte] of [...parRaison].sort((a, b) => b[1] - a[1])) {
    console.log(`     ${String(compte).padStart(7)} · ${raison}`)
  }
  console.log('\n   Exemples :')
  for (const { id, raison } of rejets.slice(0, 15)) {
    console.log(`     ${id} — ${raison}   https://lichess.org/training/${id}`)
  }
  console.log('')

  if (PURGER) {
    // On ne purge que ce qu'on a effectivement examiné, et l'on rejoue la
    // vérification au moment de supprimer : la liste des rejets est plafonnée
    // à cent pour l'affichage, elle ne sert pas de liste de suppression.
    console.log('   Purge en cours…')
    let supprimes = 0
    for (let decalage = 0; decalage < aExaminer; decalage += PAQUET) {
      const taille = Math.min(PAQUET, aExaminer - decalage)
      const lignes = await sql`
        select id, fen, moves, themes
        from puzzles
        order by id
        limit ${taille}
        offset ${DEPART + decalage}
      `
      const aJeter = lignes.filter((puzzle) => verifierPuzzle(puzzle) !== null).map((p) => p.id)
      if (aJeter.length === 0) continue
      await sql`delete from puzzles where id in ${sql(aJeter)}`
      supprimes += aJeter.length
    }
    console.log(`   ✓ ${supprimes.toLocaleString('fr-FR')} puzzles supprimés.\n`)
  } else {
    console.log('   Relance avec --purge pour les retirer de la base.\n')
  }
}

await sql.end()
process.exitCode = invalides > 0 && !PURGER ? 1 : 0
