/**
 * La mesure d'entrée, et ce qu'elle amorce.
 *
 *   POST /api/niveau  { positions: [{ id, reussie }, …] }
 *
 * **Le navigateur envoie son relevé, pas son résultat.** C'est toute la
 * différence : un résultat se déclare — « j'ai mesuré 2 400 » —, un relevé se
 * recoupe. Le serveur relit ici la cote **réelle** de chaque position dans le
 * catalogue, vérifie que la suite ressemble à l'escalier qu'un vrai test
 * produit, et refait le calcul. Sans cela, amorcer un classement depuis le test
 * rouvrirait la porte que `parties/terminee` vient de fermer.
 *
 * Ce que ça ne prouve pas, et qu'aucune route ne prouvera : que le joueur a
 * réellement trouvé ces coups. Le test se passe chez lui. Mais le mensonge est
 * borné par l'escalier lui-même — voir `releveCoherent` — et le meilleur relevé
 * fabriqué vaut un sans-faute, qui plafonne là où le test plafonne.
 *
 * **Sans compte, on calcule quand même.** Le test doit marcher avant
 * l'inscription, c'est même là qu'il sert le plus : on rend la mesure sans rien
 * enregistrer, et l'écran l'affiche comme d'habitude.
 */

import { NextResponse } from 'next/server'
import {
  COTE_DE_DEPART,
  mesurerNiveau,
  PAS_DU_TEST,
  PLAFOND_DU_TEST,
  RD_APRES_TEST,
  releveCoherent,
  type ObservationDeTest,
} from '@coupparfait/core'
import { getDb, inArray, levelTests, puzzles } from '@coupparfait/db'
import { amorcerClassements } from '@coupparfait/db/ratings'
import { puzzleVersPartie } from '@/lib/apprendre/palier.ts'
import { getCurrentUser } from '@/lib/server/session.ts'
import { tDeLaRequete } from '@/lib/i18n/serveur.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Plancher de la mesure, sur l'échelle des positions.
 *
 * Le catalogue ne descend pas sous 500 et l'escalier s'y arrête ; l'ajustement,
 * lui, peut placer un joueur en dessous quand il échoue partout. On le laisse
 * descendre un peu — c'est une information réelle — mais pas indéfiniment, la
 * mesure n'ayant rien vu de plus bas pour en juger.
 */
const PLANCHER_MESURE = 200

export async function POST(request: Request) {
  const t = tDeLaRequete(request)

  let corps: { positions?: Array<{ id?: unknown; reussie?: unknown }> }
  try {
    corps = await request.json()
  } catch {
    return NextResponse.json({ error: t('api.unreadable') }, { status: 400 })
  }

  const envoyees = Array.isArray(corps.positions) ? corps.positions : []
  if (envoyees.length === 0 || envoyees.length > PAS_DU_TEST.length) {
    return NextResponse.json({ error: t('api.unreadable') }, { status: 400 })
  }

  const demandees = envoyees
    .map((entree) => ({
      id: typeof entree.id === 'string' ? entree.id.slice(0, 24) : null,
      reussie: entree.reussie === true,
    }))
    .filter((entree): entree is { id: string; reussie: boolean } => entree.id !== null)

  if (demandees.length !== envoyees.length) {
    return NextResponse.json({ error: t('api.unreadable') }, { status: 400 })
  }

  try {
    /*
      Les cotes réelles, relues dans le catalogue.

      Une seule requête, et l'ordre du relevé est conservé en reliant par
      identifiant : `in (…)` ne garantit aucun ordre, et l'escalier ne se
      rejoue que dans l'ordre où il a été monté.
    */
    const lignes = await getDb()
      .select({ id: puzzles.id, rating: puzzles.rating })
      .from(puzzles)
      .where(
        inArray(
          puzzles.id,
          demandees.map((entree) => entree.id),
        ),
      )
    const cotes = new Map(lignes.map((ligne) => [ligne.id, ligne.rating]))

    const observations: ObservationDeTest[] = []
    for (const entree of demandees) {
      const cote = cotes.get(entree.id)
      // Une position inconnue du catalogue n'est pas une position : le relevé
      // est rejeté en entier plutôt que mesuré sur ce qu'il en reste.
      if (cote === undefined) {
        return NextResponse.json({ error: t('level.unknownPosition') }, { status: 400 })
      }
      observations.push({ cote, reussie: entree.reussie })
    }

    if (!releveCoherent(observations)) {
      return NextResponse.json({ error: t('level.incoherentRun') }, { status: 400 })
    }

    const mesure = mesurerNiveau(observations, COTE_DE_DEPART)
    if (!mesure) {
      return NextResponse.json({ error: t('api.unreadable') }, { status: 400 })
    }

    const cotePuzzle = Math.max(PLANCHER_MESURE, Math.min(PLAFOND_DU_TEST, mesure.cote))
    const partie = puzzleVersPartie(cotePuzzle)

    const user = await getCurrentUser()
    if (!user) {
      // Rien à enregistrer, rien à amorcer : la mesure est rendue telle quelle.
      return NextResponse.json({
        cotePuzzle,
        partie,
        sigma: mesure.sigma,
        enregistre: false,
        amorcees: [],
      })
    }

    await getDb()
      .insert(levelTests)
      .values({
        userId: user.userId,
        puzzleRating: cotePuzzle,
        gameRating: partie,
        sigma: mesure.sigma,
        positions: observations.length,
        takenAt: new Date(),
      })
      .onConflictDoUpdate({
        target: levelTests.userId,
        set: {
          puzzleRating: cotePuzzle,
          gameRating: partie,
          sigma: mesure.sigma,
          positions: observations.length,
          takenAt: new Date(),
        },
      })

    // N'amorce que les catégories où rien n'a encore été joué : une partie vaut
    // mieux qu'un test, et ce qui a été mesuré en jouant reste.
    const amorcees = await amorcerClassements(user.userId, partie, RD_APRES_TEST)

    return NextResponse.json({
      cotePuzzle,
      partie,
      sigma: mesure.sigma,
      enregistre: true,
      amorcees,
    })
  } catch (error) {
    console.error('[niveau]', error)
    return NextResponse.json({ error: t('admin.serverDown') }, { status: 503 })
  }
}
