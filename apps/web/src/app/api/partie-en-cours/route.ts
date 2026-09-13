/**
 * La partie contre l'ordinateur laissée en plan.
 *
 *   GET    → l'état sauvegardé, ou `null`
 *   PUT    → enregistre l'état courant (remplace le précédent)
 *   DELETE → oublie la partie, une fois qu'elle est finie ou abandonnée
 *
 * Réservé aux comptes connectés : sans compte il n'y a nulle part où ranger la
 * partie, et c'est un choix assumé de la plateforme. Un visiteur anonyme reçoit
 * `null` sans que ce soit une erreur — c'est le cas nominal, pas un incident,
 * et l'écran de configuration ne doit pas afficher d'avertissement pour ça.
 *
 * Une seule partie conservée par joueur. Un carrousel de parties en cours
 * contre l'ordinateur serait une collection d'abandons : on garde la dernière,
 * celle qu'on a une chance de vouloir reprendre.
 */

import { NextResponse } from 'next/server'
import { activeGames, eq, getDb } from '@coupparfait/db'
import { getCurrentUser } from '@/lib/server/session.ts'
import { tDeLaRequete } from '@/lib/i18n/serveur.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Une partie d'échecs dépasse rarement 300 demi-coups ; au-delà, on refuse. */
const MAX_COUPS = 400

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ partie: null })

  try {
    const database = getDb()
    const lignes = await database
      .select()
      .from(activeGames)
      .where(eq(activeGames.userId, user.userId))
      .limit(1)

    const ligne = lignes[0]
    if (!ligne || !ligne.moves.trim()) return NextResponse.json({ partie: null })

    return NextResponse.json({
      partie: {
        moves: ligne.moves.split(' ').filter(Boolean),
        ...ligne.state,
        enregistreLe: ligne.updatedAt,
      },
    })
  } catch (error) {
    console.error('[partie-en-cours]', error)
    // Une panne de base ne doit pas empêcher de jouer : sans reprise, on
    // commence une nouvelle partie, ce qui reste le comportement d'avant.
    return NextResponse.json({ partie: null })
  }
}

export async function PUT(request: Request) {
  const t = tDeLaRequete(request)
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ ok: false })

  let corps: { moves?: unknown; state?: unknown }
  try {
    corps = (await request.json()) as typeof corps
  } catch {
    return NextResponse.json({ error: t('api.unreadable') }, { status: 400 })
  }

  if (!Array.isArray(corps.moves) || corps.moves.length === 0) {
    return NextResponse.json({ error: t('api.noMoveToSave') }, { status: 400 })
  }
  if (corps.moves.length > MAX_COUPS) {
    return NextResponse.json({ error: t('api.gameTooLong') }, { status: 400 })
  }
  if (!corps.state || typeof corps.state !== 'object' || Array.isArray(corps.state)) {
    return NextResponse.json({ error: t('api.stateMissing') }, { status: 400 })
  }

  const moves = corps.moves.filter((coup): coup is string => typeof coup === 'string').join(' ')
  const state = corps.state as Record<string, unknown>

  try {
    const database = getDb()
    await database
      .insert(activeGames)
      .values({ userId: user.userId, moves, state })
      .onConflictDoUpdate({
        target: activeGames.userId,
        set: { moves, state, updatedAt: new Date() },
      })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[partie-en-cours]', error)
    return NextResponse.json({ ok: false })
  }
}

export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ ok: false })

  try {
    const database = getDb()
    await database.delete(activeGames).where(eq(activeGames.userId, user.userId))
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[partie-en-cours]', error)
    return NextResponse.json({ ok: false })
  }
}
