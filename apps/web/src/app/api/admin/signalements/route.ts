/**
 * Les messages du tchat signalés par les joueurs.
 *
 *   GET  /api/admin/signalements   ceux qui attendent, du plus récent au plus ancien
 *   POST /api/admin/signalements   { id } : marquer comme traité
 *
 * Désactiver l'auteur ne passe pas par ici : c'est l'action `desactiver` de
 * `api/admin/comptes`, la même que depuis l'onglet des comptes, avec le même
 * journal. Le signalement ne fait que mener à elle.
 */

import { NextResponse } from 'next/server'
import { signalementsATraiter, traiterSignalement } from '@coupparfait/db/signalements'
import { getAdmin } from '@/lib/server/admin.ts'
import { journaliser } from '@/lib/server/audit.ts'
import { tDeLaRequete } from '@/lib/i18n/serveur.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const t = tDeLaRequete(request)
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: t('api.notFound') }, { status: 404 })

  try {
    return NextResponse.json({ signalements: await signalementsATraiter() })
  } catch (erreur) {
    console.error('[admin/signalements]', erreur)
    return NextResponse.json({ error: t('api.actionFailed') }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const t = tDeLaRequete(request)
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: t('api.notFound') }, { status: 404 })

  let corps: { id?: unknown }
  try {
    corps = await request.json()
  } catch {
    return NextResponse.json({ error: t('api.unreadable') }, { status: 400 })
  }
  // Un UUID, et rien d'autre : la base refuserait le reste par une erreur.
  const id = typeof corps.id === 'string' && /^[0-9a-f-]{36}$/i.test(corps.id) ? corps.id : ''
  if (!id) return NextResponse.json({ error: t('api.unknownAction') }, { status: 400 })

  try {
    if (!(await traiterSignalement(id))) {
      return NextResponse.json({ error: t('api.notFound') }, { status: 404 })
    }
    await journaliser(admin, { action: 'traiterSignalement', cible: 'signalement', cibleId: id })
    return NextResponse.json({ ok: true })
  } catch (erreur) {
    console.error('[admin/signalements]', erreur)
    return NextResponse.json({ error: t('api.actionFailed') }, { status: 500 })
  }
}
