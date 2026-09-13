/**
 * Le défi du jour.
 *
 *   GET /api/defi-du-jour?jour=2026-08-28&tranche=club
 *
 * Une position par tranche de niveau, la même pour tout le monde dans la
 * tranche, qui change à minuit. C'est le
 * ressort principal de la boucle quotidienne, et il tient à ce détail : parce
 * que tout le monde a la même, on peut en parler. Un tirage personnalisé serait
 * mieux calibré et beaucoup moins amusant — on ne raconte pas à quelqu'un un
 * puzzle qu'il ne verra jamais.
 *
 * Le tirage est **déterministe** : même jour, même tranche, même position,
 * sans rien stocker. Deux navigateurs, deux appareils, deux joueurs a l'autre
 * bout du monde tombent sur la meme, et un rechargement ne la change pas.
 *
 * Sans tranche demandee, on prend celle du joueur d'apres son classement de
 * puzzles — et la premiere pour un visiteur sans compte, qui est celui a qui
 * l'on doit le plus d'egards.
 */

import { NextResponse } from 'next/server'
import { TRANCHES_DEFI, trancheDefi, trancheDefiPour } from '@coupparfait/core'
import { and, getDb, gte, lte, puzzles, sql } from '@coupparfait/db'
import { getRating } from '@coupparfait/db/ratings'
import { getCurrentUser } from '@/lib/server/session.ts'
import { tDeLaRequete } from '@/lib/i18n/serveur.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Seuil de popularité : écarte les puzzles douteux ou mal notés. */
const POPULARITE_MIN = 85

const JOUR_VALIDE = /^\d{4}-\d{2}-\d{2}$/

export async function GET(request: Request) {
  const t = tDeLaRequete(request)
  const demande = new URL(request.url).searchParams.get('jour') ?? ''
  // Le jour vient du client parce qu'il dépend de son fuseau : la journée d'un
  // joueur commence quand il se lève, pas à minuit à Greenwich. On valide
  // strictement le format, la valeur partant ensuite dans une requête SQL.
  const jour = JOUR_VALIDE.test(demande) ? demande : new Date().toISOString().slice(0, 10)

  try {
    const database = getDb()

    /*
      La tranche : celle qu'on demande, ou celle du joueur.

      Un visiteur sans compte reçoit la première. C'est délibéré : il n'a pas
      de classement, et c'est précisément lui qu'un défi de joueur de club
      décourage — il n'a même pas d'historique pour comprendre pourquoi il
      échoue.
    */
    const demandee = trancheDefi(new URL(request.url).searchParams.get('tranche'))
    let tranche = demandee ?? TRANCHES_DEFI[0]!
    if (!demandee) {
      const user = await getCurrentUser()
      if (user) tranche = trancheDefiPour((await getRating(user.userId, 'puzzle')).rating)
    }

    // Tirage déterministe : on ordonne la sélection par une empreinte du
    // couple (identifiant, jour) et on prend la première. Le hasard vient donc
    // de la date seule — aucune table de tirages à tenir, aucune tâche
    // planifiée à minuit, et le résultat est reproductible.
    const rangees = await database
      .select()
      .from(puzzles)
      .where(
        and(
          gte(puzzles.rating, tranche.min),
          lte(puzzles.rating, tranche.max),
          gte(puzzles.popularity, POPULARITE_MIN),
        ),
      )
      .orderBy(sql`md5(${puzzles.id} || ${jour} || ${tranche.id})`)
      .limit(1)

    const puzzle = rangees[0]
    if (!puzzle) {
      return NextResponse.json({ error: t('api.noPuzzleNpm') }, { status: 404 })
    }

    return NextResponse.json({
      jour,
      tranche: { id: tranche.id, nom: tranche.nom, min: tranche.min, max: tranche.max },
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
    return NextResponse.json({ error: t('api.dailyUnavailable') }, { status: 503 })
  }
}
