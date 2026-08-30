/**
 * Le défi du jour.
 *
 *   GET /api/defi-du-jour?jour=2026-08-28
 *
 * Une position, la même pour tout le monde, qui change à minuit. C'est le
 * ressort principal de la boucle quotidienne, et il tient à ce détail : parce
 * que tout le monde a la même, on peut en parler. Un tirage personnalisé serait
 * mieux calibré et beaucoup moins amusant — on ne raconte pas à quelqu'un un
 * puzzle qu'il ne verra jamais.
 *
 * Le tirage est **déterministe** : même jour, même position, sans rien stocker.
 * Deux navigateurs, deux appareils, deux joueurs à l'autre bout du monde
 * tombent sur la même, et un rechargement ne la change pas.
 */

import { NextResponse } from 'next/server'
import { and, getDb, gte, lte, puzzles, sql } from '@coupparfait/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Fenêtre de difficulté du défi.
 *
 * Un défi partagé doit être franchissable par la majorité : trop dur, la
 * plupart des gens échouent et cessent de venir, ce qui est l'inverse du but.
 * On vise donc le niveau d'un joueur de club moyen, quitte à ce que les plus
 * forts le résolvent en dix secondes — pour eux, c'est un rituel, pas un test.
 */
const RATING_MIN = 1100
const RATING_MAX = 1800

/** Seuil de popularité : écarte les puzzles douteux ou mal notés. */
const POPULARITE_MIN = 85

const JOUR_VALIDE = /^\d{4}-\d{2}-\d{2}$/

export async function GET(request: Request) {
  const demande = new URL(request.url).searchParams.get('jour') ?? ''
  // Le jour vient du client parce qu'il dépend de son fuseau : la journée d'un
  // joueur commence quand il se lève, pas à minuit à Greenwich. On valide
  // strictement le format, la valeur partant ensuite dans une requête SQL.
  const jour = JOUR_VALIDE.test(demande) ? demande : new Date().toISOString().slice(0, 10)

  try {
    const database = getDb()

    // Tirage déterministe : on ordonne la sélection par une empreinte du
    // couple (identifiant, jour) et on prend la première. Le hasard vient donc
    // de la date seule — aucune table de tirages à tenir, aucune tâche
    // planifiée à minuit, et le résultat est reproductible.
    const rangees = await database
      .select()
      .from(puzzles)
      .where(
        and(
          gte(puzzles.rating, RATING_MIN),
          lte(puzzles.rating, RATING_MAX),
          gte(puzzles.popularity, POPULARITE_MIN),
        ),
      )
      .orderBy(sql`md5(${puzzles.id} || ${jour})`)
      .limit(1)

    const puzzle = rangees[0]
    if (!puzzle) {
      return NextResponse.json(
        { error: 'Aucun puzzle en base. Lance l’import :  npm run data:puzzles' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      jour,
      puzzle: {
        id: puzzle.id,
        fen: puzzle.fen,
        moves: puzzle.moves.split(' '),
        rating: puzzle.rating,
        // Même forme que `/api/puzzles` : la page de puzzles sert les deux
        // routes avec le même code, une clé manquante s'y verrait tout de suite.
        ratingDeviation: puzzle.ratingDeviation,
        themes: puzzle.themes,
        gameUrl: puzzle.gameUrl,
      },
    })
  } catch (error) {
    console.error('[defi-du-jour]', error)
    return NextResponse.json({ error: 'Le défi du jour est indisponible.' }, { status: 503 })
  }
}
