/**
 * Les messages adressés aux joueurs, côté administration.
 *
 *   GET    /api/admin/annonces          ce qui a été dit, et à qui
 *   POST   /api/admin/annonces          adresser un message
 *   DELETE /api/admin/annonces?id=…     le retirer
 *
 * **Une seule route pour les deux portées.** Sans destinataire, le message
 * s'affiche à tout le monde ; avec un pseudo, il n'est vu que par cette
 * personne. C'est la seule différence, et elle tient dans une colonne — voir
 * `announcements` dans le schéma.
 *
 * **Le destinataire est résolu ici, pas côté écran.** L'administrateur écrit
 * un pseudo ; si aucun compte ne porte ce pseudo, on refuse au lieu
 * d'enregistrer un message que personne ne recevrait jamais. C'est le genre
 * d'erreur qu'on ne découvre autrement qu'en se demandant, trois jours plus
 * tard, pourquoi l'intéressé n'a pas réagi.
 *
 * **Retirer n'efface pas.** `withdrawnAt` éteint l'affichage et garde la
 * trace : ce qui a été adressé à quelqu'un doit rester relisible, y compris
 * quand on l'a retiré — et surtout à ce moment-là.
 *
 * Comme toutes les routes d'administration : 404 pour qui n'y a pas droit, et
 * chaque acte au journal.
 */

import { NextResponse } from 'next/server'
import { announcementReads, announcements, desc, eq, getDb, sql, users } from '@coupparfait/db'
import { getAdmin } from '@/lib/server/admin.ts'
import { journaliser } from '@/lib/server/audit.ts'
import { tDeLaRequete } from '@/lib/i18n/serveur.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Longueur maximale d'un message. Au-delà, ce n'est plus un bandeau. */
const MAX_MESSAGE = 600
const PAR_PAGE = 40
const TONS = new Set(['info', 'important'])

export async function GET(request: Request) {
  const t = tDeLaRequete(request)
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: t('api.notFound') }, { status: 404 })

  try {
    const lignes = await getDb()
      .select({
        id: announcements.id,
        message: announcements.message,
        tone: announcements.tone,
        cible: announcements.targetName,
        auteur: announcements.authorName,
        expireLe: announcements.expiresAt,
        retireeLe: announcements.withdrawnAt,
        creeeLe: announcements.createdAt,
        // Le nombre de lectures dit ce qu'aucune autre colonne ne dit : si le
        // message est passé. Pour un message adressé à une personne, il vaut 0
        // ou 1, et c'est exactement l'information qu'on vient chercher.
        lectures: sql<number>`(
          select count(*)::int from ${announcementReads}
          where ${announcementReads.announcementId} = ${announcements.id}
        )`,
      })
      .from(announcements)
      .orderBy(desc(announcements.createdAt))
      .limit(PAR_PAGE)

    return NextResponse.json({ annonces: lignes })
  } catch (error) {
    console.error('[admin/annonces]', error)
    return NextResponse.json({ error: t('api.notFound') }, { status: 503 })
  }
}

export async function POST(request: Request) {
  const t = tDeLaRequete(request)
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: t('api.notFound') }, { status: 404 })

  let corps: { message?: string; pseudo?: string | null; tone?: string; jours?: number }
  try {
    corps = await request.json()
  } catch {
    return NextResponse.json({ error: t('api.unreadable') }, { status: 400 })
  }

  const message = typeof corps.message === 'string' ? corps.message.trim() : ''
  if (!message) {
    return NextResponse.json({ error: t('admin.announceEmpty') }, { status: 400 })
  }
  if (message.length > MAX_MESSAGE) {
    return NextResponse.json({ error: t('admin.announceTooLong') }, { status: 400 })
  }

  const pseudo = typeof corps.pseudo === 'string' ? corps.pseudo.trim() : ''
  const tone = TONS.has(String(corps.tone)) ? String(corps.tone) : 'info'

  /*
    La durée d'affichage, en jours.

    Zéro — le défaut — vaut « jusqu'à ce qu'on le retire ». C'est le bon défaut
    pour un message adressé à quelqu'un, qui doit attendre d'être lu ; une
    annonce générale, elle, gagne à s'éteindre toute seule, et l'écran propose
    sept jours.
  */
  const jours = Number.isFinite(corps.jours)
    ? Math.min(365, Math.max(0, Math.round(corps.jours!)))
    : 0
  const expiresAt = jours > 0 ? new Date(Date.now() + jours * 86_400_000) : null

  try {
    let destinataire: { id: string; username: string } | null = null
    if (pseudo) {
      const [trouve] = await getDb()
        .select({ id: users.id, username: users.username })
        .from(users)
        .where(eq(users.usernameLower, pseudo.toLowerCase()))
        .limit(1)
      if (!trouve) {
        return NextResponse.json({ error: t('admin.announceNoSuchUser') }, { status: 404 })
      }
      destinataire = trouve
    }

    const [creee] = await getDb()
      .insert(announcements)
      .values({
        targetId: destinataire?.id ?? null,
        targetName: destinataire?.username ?? null,
        message,
        tone,
        authorId: admin.userId,
        authorName: admin.username,
        expiresAt,
      })
      .returning({ id: announcements.id })

    await journaliser(admin, {
      action: 'annoncer',
      cible: 'compte',
      cibleId: destinataire?.id ?? null,
      cibleNom: destinataire?.username ?? 'tout le monde',
      // Le texte est consigné : c'est ce qu'on relira, et un journal qui dit
      // « un message a été envoyé » sans dire lequel ne sert à rien.
      detail: { message, tone, jours },
    })

    return NextResponse.json({ ok: true, id: creee?.id })
  } catch (error) {
    console.error('[admin/annonces]', error)
    return NextResponse.json({ error: t('admin.serverDown') }, { status: 503 })
  }
}

export async function DELETE(request: Request) {
  const t = tDeLaRequete(request)
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: t('api.notFound') }, { status: 404 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: t('api.unreadable') }, { status: 400 })

  try {
    const [retiree] = await getDb()
      .update(announcements)
      .set({ withdrawnAt: new Date() })
      .where(eq(announcements.id, id))
      .returning({ id: announcements.id, cible: announcements.targetName })

    if (!retiree) return NextResponse.json({ error: t('api.notFound') }, { status: 404 })

    await journaliser(admin, {
      action: 'retirer-annonce',
      cible: 'compte',
      cibleId: retiree.id,
      cibleNom: retiree.cible ?? 'tout le monde',
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[admin/annonces]', error)
    return NextResponse.json({ error: t('admin.serverDown') }, { status: 503 })
  }
}
