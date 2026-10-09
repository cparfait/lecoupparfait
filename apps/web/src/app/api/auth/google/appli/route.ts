/**
 * Ouvrir, depuis l'appli, une connexion avec Google.
 *
 *   POST /api/auth/google/appli   { mode: 'connexion' | 'lier', suite }
 *     → { adresse }   à ouvrir dans Chrome
 *
 * Appelé par la WebView, avec sa session : c'est ici, et seulement ici, qu'on
 * sait à quel compte lier Google en mode `lier` — Chrome ne la verra pas. La
 * clé de la demande reste dans un témoin de la WebView ; l'adresse n'en porte
 * que l'empreinte. Voir « Depuis l'appli » dans `lib/server/google.ts`.
 */

import { NextResponse } from 'next/server'
import { tDeLaRequete } from '@/lib/i18n/serveur.ts'
import {
  DUREE_SECONDES,
  TEMOIN_APPLI,
  adresseDuSite,
  cheminDuSite,
  googleDisponible,
  preparerDepartAppli,
} from '@/lib/server/google.ts'
import { ipClient } from '@/lib/server/ip.ts'
import { creerLimiteur } from '@/lib/server/limiteur.ts'
import { getCurrentUser } from '@/lib/server/session.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Vingt départs par quart d'heure : de quoi se tromper de compte, pas de quoi remplir la mémoire. */
const departs = creerLimiteur(15 * 60_000, 20)

export async function POST(request: Request) {
  const t = tDeLaRequete(request)
  if (!googleDisponible()) {
    return NextResponse.json({ error: t('auth.google.failUnavailable') }, { status: 503 })
  }
  if (departs.depasse(ipClient(request))) {
    return NextResponse.json({ error: t('api.tooManyAttempts') }, { status: 429 })
  }

  let corps: { mode?: unknown; suite?: unknown }
  try {
    corps = await request.json()
  } catch {
    return NextResponse.json({ error: t('api.unreadable') }, { status: 400 })
  }
  const mode = corps.mode === 'lier' ? 'lier' : 'connexion'
  const suite = cheminDuSite(typeof corps.suite === 'string' ? corps.suite : null) ?? '/'

  let userId: string | null = null
  if (mode === 'lier') {
    userId = (await getCurrentUser())?.userId ?? null
    if (!userId) return NextResponse.json({ error: t('api.signInRequired') }, { status: 401 })
  }

  const { cle, id } = preparerDepartAppli(mode, suite, userId)
  const adresse = new URL('/api/auth/google', adresseDuSite(request))
  adresse.searchParams.set('appli', id)

  const reponse = NextResponse.json({ adresse: adresse.href })
  reponse.cookies.set(TEMOIN_APPLI, cle, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/auth/google',
    maxAge: DUREE_SECONDES,
  })
  return reponse
}
