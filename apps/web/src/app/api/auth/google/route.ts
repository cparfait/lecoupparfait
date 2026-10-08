/**
 * Le départ vers Google.
 *
 *   GET /api/auth/google?mode=connexion|lier&suite=/chemin
 *
 * Un lien ordinaire, pas un appel `fetch` : c'est le navigateur entier qui doit
 * aller chez Google et en revenir. Le `state` et le vérificateur PKCE partent
 * dans un témoin limité au chemin du parcours, pour dix minutes. Voir
 * `lib/server/google.ts`.
 */

import { NextResponse } from 'next/server'
import {
  DUREE_SECONDES,
  TEMOIN_DEPART,
  adresseDuSite,
  cheminDuSite,
  encoderDepart,
  googleDisponible,
  preparerDepart,
} from '@/lib/server/google.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function GET(request: Request) {
  const parametres = new URL(request.url).searchParams
  if (!googleDisponible()) {
    return NextResponse.redirect(new URL('/connexion?google=indisponible', adresseDuSite(request)))
  }

  const mode = parametres.get('mode') === 'lier' ? 'lier' : 'connexion'
  const suite = cheminDuSite(parametres.get('suite')) ?? '/'
  const { depart, adresse } = preparerDepart(request, mode, suite)

  const reponse = NextResponse.redirect(adresse)
  reponse.cookies.set(TEMOIN_DEPART, encoderDepart(depart), {
    httpOnly: true,
    // `lax` et non `strict` : le retour de Google est une navigation venue
    // d'un autre site, et un témoin `strict` n'y serait pas joint.
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/auth/google',
    maxAge: DUREE_SECONDES,
  })
  return reponse
}
