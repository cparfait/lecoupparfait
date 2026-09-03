/**
 * Une analyse partagée, en lecture seule et sans compte.
 *
 *   GET /api/analyses/partagee/[partage]
 *
 * **Aucune session n'est lue, et c'est le sujet.** Le lien se transmet à qui
 * l'on veut, y compris à quelqu'un qui n'a pas de compte ici — c'est tout
 * l'intérêt d'un partage. La seule chose qui autorise l'accès est de connaître
 * l'identifiant.
 *
 * Ce qu'on ne renvoie **pas** est aussi important que ce qu'on renvoie :
 * l'identifiant interne de l'analyse et celui de son propriétaire restent ici.
 * Partager une analyse, ce n'est pas ouvrir un compte.
 */

import { NextResponse } from 'next/server'
import { eq, getDb, savedAnalyses } from '@coupparfait/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  context: { params: Promise<{ partage: string }> },
) {
  const { partage } = await context.params
  // Une chaîne vide correspondrait à toutes les analyses non partagées, dont
  // la colonne vaut `null` — la comparaison échouerait, mais on ne fait même
  // pas la requête.
  if (!partage) return NextResponse.json({ analyse: null }, { status: 404 })

  try {
    const lignes = await getDb()
      .select()
      .from(savedAnalyses)
      .where(eq(savedAnalyses.partage, partage))
      .limit(1)

    const ligne = lignes[0]
    if (!ligne) return NextResponse.json({ analyse: null }, { status: 404 })

    return NextResponse.json({
      analyse: {
        source: ligne.source,
        moves: ligne.moves.split(' ').filter(Boolean),
        startFen: ligne.startFen,
        positions: ligne.positions,
        depth: ligne.depth,
        lecteur: ligne.lecteur,
        headers: {
          ...(ligne.whiteName ? { White: ligne.whiteName } : {}),
          ...(ligne.blackName ? { Black: ligne.blackName } : {}),
          ...(ligne.result ? { Result: ligne.result } : {}),
          ...(ligne.playedAt ? { Date: ligne.playedAt } : {}),
          ...(ligne.eco ? { ECO: ligne.eco } : {}),
          ...(ligne.opening ? { Opening: ligne.opening } : {}),
        },
      },
    })
  } catch (error) {
    console.error('[analyses/partagee]', error)
    return NextResponse.json({ analyse: null }, { status: 500 })
  }
}
