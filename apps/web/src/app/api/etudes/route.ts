/**
 * Études.
 *
 *   GET  /api/etudes            → mes études
 *   GET  /api/etudes?slug=xxx   → une étude et ses chapitres
 *   POST /api/etudes            { action: … }
 *
 * La lecture d'une étude ne demande pas de session : une étude partagée par
 * son adresse doit s'ouvrir sans compte, comme une partie. C'est la fonction
 * de lecture qui décide, selon la visibilité, s'il y a quelque chose à
 * renvoyer.
 */

import { NextResponse } from 'next/server'
import {
  addChapter,
  createStudy,
  deleteChapter,
  deleteStudy,
  getStudy,
  listStudies,
  saveChapter,
  updateStudy,
} from '@coupparfait/db/studies'
import { getCurrentUser } from '@/lib/server/session.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get('slug')
  const me = await getCurrentUser()

  if (slug) {
    const study = await getStudy(slug, me?.userId ?? null)
    // Introuvable et sans droit d'accès donnent la même réponse : distinguer
    // apprendrait qu'une étude privée existe sous cette adresse.
    if (!study) return NextResponse.json({ error: 'Étude introuvable.' }, { status: 404 })
    return NextResponse.json({ study, own: me?.userId === study.owner.id })
  }

  if (!me) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })
  return NextResponse.json({ studies: await listStudies(me.userId) })
}

export async function POST(request: Request) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })

  let body: {
    action?: string
    id?: string
    studyId?: string
    chapterId?: string
    title?: string
    description?: string
    visibility?: string
    startFen?: string | null
    moves?: string[]
    comments?: Record<string, string>
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 })
  }

  switch (body.action) {
    case 'create': {
      const created = await createStudy(me.userId, String(body.title ?? ''))
      if (!created) return NextResponse.json({ error: 'Création impossible.' }, { status: 500 })
      return NextResponse.json({ ok: true, slug: created.slug })
    }

    case 'update': {
      const done = await updateStudy(me.userId, String(body.id ?? ''), {
        title: body.title,
        description: body.description,
        visibility: body.visibility,
      })
      if (!done) return NextResponse.json({ error: 'Étude introuvable.' }, { status: 404 })
      return NextResponse.json({ ok: true })
    }

    case 'delete': {
      const done = await deleteStudy(me.userId, String(body.id ?? ''))
      if (!done) return NextResponse.json({ error: 'Étude introuvable.' }, { status: 404 })
      return NextResponse.json({ ok: true })
    }

    case 'addChapter': {
      const chapter = await addChapter(me.userId, String(body.studyId ?? ''), {
        title: String(body.title ?? 'Chapitre'),
        startFen: body.startFen ?? null,
        moves: body.moves ?? [],
      })
      if (!chapter) return NextResponse.json({ error: 'Étude introuvable.' }, { status: 404 })
      return NextResponse.json({ ok: true, chapter })
    }

    case 'saveChapter': {
      const done = await saveChapter(me.userId, String(body.chapterId ?? ''), {
        title: body.title,
        moves: body.moves,
        comments: body.comments,
      })
      if (!done) return NextResponse.json({ error: 'Chapitre introuvable.' }, { status: 404 })
      return NextResponse.json({ ok: true })
    }

    case 'deleteChapter': {
      const done = await deleteChapter(me.userId, String(body.chapterId ?? ''))
      if (!done) return NextResponse.json({ error: 'Chapitre introuvable.' }, { status: 404 })
      return NextResponse.json({ ok: true })
    }

    default:
      return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
  }
}
