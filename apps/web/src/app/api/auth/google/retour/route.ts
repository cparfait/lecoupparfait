/**
 * Le retour de Google.
 *
 *   GET /api/auth/google/retour?code=…&state=…
 *
 * Quatre issues :
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
 *
 * Parti de l'appli, le parcours a lieu dans Chrome : l'issue n'y est pas
 * appliquée — la session s'ouvrirait dans Chrome, pas dans l'appli. Elle est
 * mise de côté pour la WebView, et Chrome renvoie vers l'appli. Voir « Depuis
 * l'appli » dans `lib/server/google.ts`.
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { compteGoogle, lierCompteGoogle, titulaireDeLAdresse } from '@coupparfait/db/google'
import {
  RETOUR_APPLI,
  TEMOIN_DEPART,
  adresseDeRetour,
  adresseDuSite,
  decoderDepart,
  demandeAppli,
  deposerIssueAppli,
  echangerCode,
  mettreEnAttente,
  type Depart,
  type IssueGoogle,
  type Rattachement,
} from '@/lib/server/google.ts'
import { appliquerIssue } from '@/lib/server/issueGoogle.ts'
import { getCurrentUser } from '@/lib/server/session.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const depart = decoderDepart((await cookies()).get(TEMOIN_DEPART)?.value)
  const issue = await issueDuRetour(request, depart)

  const reponse =
    depart?.appli && deposerIssueAppli(depart.appli, issue)
      ? NextResponse.redirect(RETOUR_APPLI)
      : await appliquerIssue(issue, adresseDuSite(request))
  // Le départ ne sert qu'une fois, quelle que soit l'issue.
  reponse.cookies.set(TEMOIN_DEPART, '', { path: '/api/auth/google', maxAge: 0 })
  return reponse
}

async function issueDuRetour(request: Request, depart: Depart | null): Promise<IssueGoogle> {
  const parametres = new URL(request.url).searchParams
  const echec = (raison: string): IssueGoogle => ({ type: 'echec', raison })

  // Google renvoie `error` quand on a fermé ou refusé l'écran de choix.
  if (parametres.get('error')) return echec('annule')
  if (!depart || parametres.get('state') !== depart.etat) return echec('refuse')
  const code = parametres.get('code')
  if (!code) return echec('refuse')

  const identite = await echangerCode(code, depart.verificateur, adresseDeRetour(request))
  if (!identite) return echec('refuse')

  if (depart.mode === 'lier') {
    // Depuis l'appli, la session est dans la WebView et Chrome ne la voit
    // pas : le compte à lier a été noté à la demande.
    const userId = depart.appli
      ? (demandeAppli(depart.appli)?.userId ?? null)
      : ((await getCurrentUser())?.userId ?? null)
    if (!userId) return echec('refuse')
    const resultat = await lierCompteGoogle(userId, identite.sub)
    return {
      type: 'lier',
      resultat: resultat === 'lie' ? 'lie' : 'deja-ailleurs',
      suite: depart.suite,
    }
  }

  const compte = await compteGoogle(identite.sub)
  if (compte) return { type: 'session', userId: compte.id, suite: depart.suite }

  let rattachement: Rattachement | null = null
  const titulaire = identite.email ? await titulaireDeLAdresse(identite.email) : null
  if (titulaire) {
    // Désactivé, ou déjà lié à un autre compte Google : rien à rejoindre.
    if (titulaire.desactive || titulaire.lie) return echec('adresse-connue')
    if (titulaire.confirme && identite.adresseSure) {
      await lierCompteGoogle(titulaire.id, identite.sub)
      return { type: 'session', userId: titulaire.id, suite: depart.suite }
    }
    rattachement = { id: titulaire.id, pseudo: titulaire.username }
  }

  return { type: 'nouveau', cle: mettreEnAttente(identite, rattachement) }
}
