/**
 * Les messages de l'équipe, côté joueur.
 *
 *   GET  /api/annonces        ce qui m'est adressé et que je n'ai pas encore lu
 *   POST /api/annonces { id } je l'ai lu, ne me le remontre plus
 *
 * **On ne rend jamais qu'un message à la fois.** Le plus récent, et rien
 * d'autre : trois bandeaux empilés à l'ouverture d'une page ne se lisent pas,
 * ils se referment. Le suivant apparaîtra à la page d'après.
 *
 * **Sans compte, seules les annonces générales.** Un visiteur anonyme n'a pas
 * de destinataire possible, et sa lecture ne s'enregistre nulle part : il
 * referme le bandeau dans son navigateur. C'est cohérent avec le reste de la
 * plateforme, qui se visite sans compte.
 *
 * Silencieux en cas de panne : un message de l'équipe n'est pas une
 * fonctionnalité dont l'absence doit se voir.
 */

import { NextResponse } from 'next/server'
import { and, announcementReads, announcements, desc, eq, getDb, isNull, or, sql } from '@coupparfait/db'
import { getCurrentUser } from '@/lib/server/session.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()

  try {
    const base = getDb()

    /*
      Les trois conditions d'affichage, dans l'ordre où elles éliminent :
      le message n'a pas été retiré, il n'a pas expiré, et il m'est destiné —
      soit parce qu'il n'a pas de destinataire, soit parce que c'est moi.
    */
    const visible = and(
      isNull(announcements.withdrawnAt),
      or(isNull(announcements.expiresAt), sql`${announcements.expiresAt} > now()`),
      user
        ? or(isNull(announcements.targetId), eq(announcements.targetId, user.userId))
        : isNull(announcements.targetId),
    )

    const dejaLues = user
      ? sql`not exists (
          select 1 from ${announcementReads}
          where ${announcementReads.announcementId} = ${announcements.id}
            and ${announcementReads.userId} = ${user.userId}
        )`
      : sql`true`

    const [annonce] = await base
      .select({
        id: announcements.id,
        message: announcements.message,
        tone: announcements.tone,
        personnel: sql<boolean>`${announcements.targetId} is not null`,
        auteur: announcements.authorName,
        creeeLe: announcements.createdAt,
      })
      .from(announcements)
      .where(and(visible, dejaLues))
      .orderBy(desc(announcements.createdAt))
      .limit(1)

    return NextResponse.json({ annonce: annonce ?? null })
  } catch (error) {
    console.error('[annonces]', error)
    return NextResponse.json({ annonce: null })
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  // Sans compte, la lecture se retient dans le navigateur : il n'y a pas de
  // ligne où l'écrire, et ce n'est pas une erreur.
  if (!user) return NextResponse.json({ ok: true, retenu: false })

  let corps: { id?: string }
  try {
    corps = await request.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  if (!corps.id) return NextResponse.json({ ok: false }, { status: 400 })

  try {
    await getDb()
      .insert(announcementReads)
      .values({ announcementId: corps.id, userId: user.userId })
      // Refermer deux fois le même message — deux onglets ouverts — n'est pas
      // un conflit à signaler.
      .onConflictDoNothing()
    return NextResponse.json({ ok: true, retenu: true })
  } catch (error) {
    console.error('[annonces]', error)
    return NextResponse.json({ ok: false })
  }
}
