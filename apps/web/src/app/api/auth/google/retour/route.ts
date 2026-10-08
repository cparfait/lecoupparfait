/**
 * Le retour de Google.
 *
 *   GET /api/auth/google/retour?code=…&state=…
 *
 * Quatre issues, toutes des redirections :
 *  - **lier** (depuis son profil) : l'identité Google s'attache au compte
 *    connecté, et l'on revient au profil ;
 *  - **compte connu** : la session s'ouvre, on va où l'on allait ;
 *  - **adresse connue** : un compte a déjà cette adresse. Confirmée par
 *    courriel, et Google en est l'autorité : on y rattache Google et l'on
 *    ouvre la session. Sinon on le propose (`/connexion/google`), et le mot de
 *    passe du compte le confirmera — voir `@coupparfait/db/google` sur
 *    pourquoi l'adresse seule ne suffit pas toujours ;
 *  - **inconnu** : on garde l'identité en attente et l'on fait choisir un
 *    pseudo (`/connexion/google`).
 *
 * Chaque échec renvoie à la connexion avec `?google=<raison>`, que la page
 * traduit en une phrase.
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { compteGoogle, lierCompteGoogle, titulaireDeLAdresse } from '@coupparfait/db/google'
import {
  DUREE_SECONDES,
  TEMOIN_DEPART,
  TEMOIN_NOUVEAU,
  adresseDeRetour,
  adresseDuSite,
  decoderDepart,
  echangerCode,
  mettreEnAttente,
  type Rattachement,
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

  let rattachement: Rattachement | null = null
  const titulaire = identite.email ? await titulaireDeLAdresse(identite.email) : null
  if (titulaire) {
    // Désactivé, ou déjà lié à un autre compte Google : rien à rejoindre.
    if (titulaire.desactive || titulaire.lie) return echec('adresse-connue')
    if (titulaire.confirme && identite.adresseSure) {
      await lierCompteGoogle(titulaire.id, identite.sub)
      await startSession(titulaire.id)
      return vers(depart.suite)
    }
    rattachement = { id: titulaire.id, pseudo: titulaire.username }
  }

  const reponse = vers('/connexion/google')
  reponse.cookies.set(TEMOIN_NOUVEAU, mettreEnAttente(identite, rattachement), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DUREE_SECONDES,
  })
  return reponse
}
