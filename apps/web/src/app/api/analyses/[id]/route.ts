/**
 * Une analyse conservée, en entier.
 *
 *   GET    → les coups et les évaluations, de quoi rejouer le rapport
 *   DELETE → l'oublie
 *
 * C'est ici, et seulement ici, qu'on rapatrie la colonne `positions` : elle
 * pèse plusieurs dizaines de kilo-octets, et la liste s'en passe très bien.
 *
 * Les deux verbes filtrent sur le propriétaire en plus de l'identifiant. Un
 * UUID est impossible à deviner, mais s'appuyer là-dessus, c'est faire d'un
 * identifiant un secret — et un identifiant finit toujours par circuler.
 */

import { NextResponse } from 'next/server'
import { and, eq, getDb, savedAnalyses } from '@coupparfait/db'
import { getCurrentUser } from '@/lib/server/session.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ analyse: null }, { status: 401 })

  const { id } = await context.params

  try {
    const database = getDb()
    const lignes = await database
      .select()
      .from(savedAnalyses)
      .where(and(eq(savedAnalyses.id, id), eq(savedAnalyses.userId, user.userId)))
      .limit(1)

    const ligne = lignes[0]
    if (!ligne) return NextResponse.json({ analyse: null }, { status: 404 })

    return NextResponse.json({
      analyse: {
        id: ligne.id,
        source: ligne.source,
        moves: ligne.moves.split(' ').filter(Boolean),
        startFen: ligne.startFen,
        positions: ligne.positions,
        depth: ligne.depth,
        lecteur: ligne.lecteur,
        // Reconstruits au format PGN : c'est ce qu'attend la relecture pour
        // nommer les joueurs et annoncer le résultat.
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
    console.error('[analyses/id]', error)
    return NextResponse.json({ analyse: null }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  const { id } = await context.params

  try {
    const database = getDb()
    await database
      .delete(savedAnalyses)
      .where(and(eq(savedAnalyses.id, id), eq(savedAnalyses.userId, user.userId)))
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[analyses/id]', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
