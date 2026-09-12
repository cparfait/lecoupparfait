/**
 * Où j'en suis, et ce qui me coûte des points.
 *
 *   GET /api/palier → classements, et réussite par motif tactique
 *
 * Deux choses que la page « Ton palier » ne peut pas calculer côté navigateur :
 *
 *  1. **Le classement le plus représentatif.** Pas le plus haut — ce serait
 *     flatteur et inutile — mais celui de la cadence la plus jouée. Quelqu'un
 *     qui a 1 800 en bullet sur douze parties et 1 250 en rapide sur trois cents
 *     est un joueur de 1 250 ; lui proposer le programme de 1 800 ne l'aiderait
 *     pas.
 *  2. **La réussite par motif.** Elle croise les tentatives de puzzles avec les
 *     étiquettes des positions. C'est le seul diagnostic de l'application qui
 *     soit entièrement mesuré plutôt que déduit d'un palier : on ne dit pas
 *     « à 1 200 les clouages coûtent cher », on dit « tu rates trois clouages
 *     sur quatre ».
 *
 * Sans compte, la route répond `null` partout plutôt qu'une erreur : la page
 * fonctionne alors sur le test de niveau, conservé dans le navigateur. Refuser
 * l'accès reviendrait à exiger une inscription pour savoir quoi apprendre.
 */

import { NextResponse } from 'next/server'
import { getDb, ratings, eq, sql } from '@coupparfait/db'
import { getCurrentUser } from '@/lib/server/session.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Tentatives minimales pour qu'un motif compte.
 *
 * En deçà, le taux de réussite est du bruit : deux positions ratées sur deux
 * donneraient « 0 % sur les enfilades », et l'on irait travailler un motif
 * qu'on n'a simplement pas encore rencontré.
 */
const MINIMUM_TENTATIVES = 5

/**
 * Étiquettes écartées du diagnostic.
 *
 * Les puzzles de Lichess portent des étiquettes de trois natures mélangées :
 * le motif tactique (`fork`, `pin`), la forme de l'exercice (`short`,
 * `oneMove`, `crushing`) et la phase (`endgame`, `middlegame`). Seules les
 * premières se travaillent : « tu rates 40 % des positions courtes » ne se
 * traduit en aucune action.
 */
const NON_MOTIFS = new Set([
  'short',
  'long',
  'veryLong',
  'oneMove',
  'mate',
  'crushing',
  'advantage',
  'equality',
  'opening',
  'middlegame',
  'endgame',
  'master',
  'masterVsMaster',
  'superGM',
  'rookEndgame',
  'pawnEndgame',
  'queenEndgame',
  'bishopEndgame',
  'knightEndgame',
  'queenRookEndgame',
  'defensiveMove',
  'quietMove',
  'healthyMix',
  'playerGames',
])

export async function GET() {
  const me = await getCurrentUser()
  if (!me) {
    return NextResponse.json({ connecte: false, partie: null, puzzle: null, faiblesses: [] })
  }

  try {
    const db = getDb()

    const lignes = await db.select().from(ratings).where(eq(ratings.userId, me.userId))
    const jouees = lignes.filter((ligne) => ligne.games > 0)

    // Le classement de parties le plus représentatif : la catégorie la plus
    // jouée, puzzles exclus — ils ont leur propre échelle et leur propre usage.
    const parties = jouees
      .filter((ligne) => ligne.category !== 'puzzle')
      .sort((a, b) => b.games - a.games)
    const representatif = parties[0] ?? null
    const cotePuzzle = jouees.find((ligne) => ligne.category === 'puzzle') ?? null

    /*
      Réussite par étiquette.

      `unnest` déplie le tableau d'étiquettes de chaque position : une tentative
      sur un puzzle étiqueté « clouage » et « mat en deux » compte dans les deux,
      ce qui est exactement ce qu'on veut — c'est bien les deux motifs qu'il
      fallait voir.

      Les tentatives sont uniques par (joueur, position) — un index l'impose —
      donc aucun dédoublonnage n'est nécessaire ici.
    */
    const brut = await db.execute(sql`
      select theme,
             count(*)::int as tentatives,
             count(*) filter (where a.solved)::int as reussies
        from puzzle_attempts a
        join puzzles p on p.id = a.puzzle_id
        cross join unnest(p.themes) as t(theme)
       where a.user_id = ${me.userId}
       group by theme
      having count(*) >= ${MINIMUM_TENTATIVES}`)

    const faiblesses = (brut as unknown as Array<Record<string, unknown>>)
      .map((ligne) => ({
        motif: String(ligne.theme),
        tentatives: Number(ligne.tentatives),
        reussies: Number(ligne.reussies),
      }))
      .filter((ligne) => !NON_MOTIFS.has(ligne.motif))
      .map((ligne) => ({
        ...ligne,
        taux: Math.round((ligne.reussies / ligne.tentatives) * 100),
      }))
      // Le plus faible d'abord, et à taux égal le plus fréquent : entre deux
      // motifs ratés à 40 %, celui qu'on rencontre trente fois coûte plus cher
      // que celui qu'on rencontre six fois.
      .sort((a, b) => a.taux - b.taux || b.tentatives - a.tentatives)
      .slice(0, 8)

    return NextResponse.json({
      connecte: true,
      partie: representatif
        ? {
            categorie: representatif.category,
            cote: representatif.rating,
            parties: representatif.games,
            provisoire: representatif.deviation > 110,
          }
        : null,
      puzzle: cotePuzzle ? { cote: cotePuzzle.rating, tentatives: cotePuzzle.games } : null,
      faiblesses,
    })
  } catch (error) {
    console.error('[palier]', error)
    return NextResponse.json({ error: 'Diagnostic indisponible.' }, { status: 503 })
  }
}
