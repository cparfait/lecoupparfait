/**
 * Le retour de Google.
 *
 *   GET /api/auth/google/retour?code=…&state=…
 *
 * Trois issues, toutes des redirections :
 *  - **lier** (depuis son profil) : l'identité Google s'attache au compte
 *    connecté, et l'on revient au profil ;
 *  - **compte connu** : la session s'ouvre, on va où l'on allait ;
 *  - **inconnu** : on garde l'identité en attente et l'on fait choisir un
 *    pseudo (`/connexion/google`). Sauf si son adresse est déjà celle d'un
 *    compte : on ne crée pas un doublon, on dit de se connecter puis de lier
 *    Google depuis son profil — voir `@coupparfait/db/google` sur pourquoi on
 *    ne lie jamais d'après l'adresse.
 *
 * Chaque échec renvoie à la connexion avec `?google=<raison>`, que la page
 * traduit en une phrase.
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { adresseConnue, compteGoogle, lierCompteGoogle } from '@coupparfait/db/google'
import {
  DUREE_SECONDES,
  TEMOIN_DEPART,
  TEMOIN_NOUVEAU,
  adresseDeRetour,
  adresseDuSite,
  decoderDepart,
  echangerCode,
  mettreEnAttente,
} from '@/lib/server/google.ts'
import { getCurrentUser, startSession } from '@/lib/server/session.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const site = adresseDuSite(request)
  const parametres = new URL(request.url).searchParams
  const depart = decoderDepart((await cookies()).get(TEMOIN_DEPART)?.value)

  const vers = (chemin: string) => {
    const reponse = NextResponse.redirect(new URL(chemin, site))
    // Le départ ne sert qu'une fois, quelle que soit l'issue.
    reponse.cookies.set(TEMOIN_DEPART, '', { path: '/api/auth/google', maxAge: 0 })
    return reponse
  }
  const echec = (raison: string) => vers(`/connexion?google=${raison}`)

  // Google renvoie `error` quand on a fermé ou refusé l'écran de choix.
  if (parametres.get('error')) return echec('annule')
  if (!depart || parametres.get('state') !== depart.etat) return echec('refuse')
  const code = parametres.get('code')
  if (!code) return echec('refuse')

  const identite = await echangerCode(code, depart.verificateur, adresseDeRetour(request))
  if (!identite) return echec('refuse')

  if (depart.mode === 'lier') {
    const me = await getCurrentUser()
    if (!me) return echec('refuse')
    const issue = await lierCompteGoogle(me.userId, identite.sub)
    const separateur = depart.suite.includes('?') ? '&' : '?'
    return vers(`${depart.suite}${separateur}google=${issue === 'lie' ? 'lie' : 'deja-ailleurs'}`)
  }

  const compte = await compteGoogle(identite.sub)
  if (compte) {
    await startSession(compte.id)
    return vers(depart.suite)
  }

  if (identite.email && (await adresseConnue(identite.email))) return echec('adresse-connue')

  const reponse = vers('/connexion/google')
  reponse.cookies.set(TEMOIN_NOUVEAU, mettreEnAttente(identite), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DUREE_SECONDES,
  })
  return reponse
}
