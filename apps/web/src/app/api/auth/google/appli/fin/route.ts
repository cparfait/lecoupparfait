/**
 * Retirer, dans l'appli, l'issue d'une connexion avec Google.
 *
 *   GET /api/auth/google/appli/fin
 *
 * La WebView y va quand l'appli se rouvre sur `RETOUR_APPLI`, ou quand on
 * referme Chrome à la main. Le témoin qu'elle a reçu au départ désigne sa
 * demande : l'issue qui y attend s'applique ici, dans la WebView — la session
 * s'ouvre là où elle doit. Sans issue (Chrome refermé avant la fin, demande
 * expirée), on revient à la connexion avec « annulée ».
 */

import { cookies } from 'next/headers'
import { TEMOIN_APPLI, adresseDuSite, retirerIssueAppli } from '@/lib/server/google.ts'
import { appliquerIssue } from '@/lib/server/issueGoogle.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const issue = retirerIssueAppli((await cookies()).get(TEMOIN_APPLI)?.value) ?? {
    type: 'echec' as const,
    raison: 'annule',
  }
  const reponse = await appliquerIssue(issue, adresseDuSite(request))
  // La demande ne sert qu'une fois.
  reponse.cookies.set(TEMOIN_APPLI, '', { path: '/api/auth/google', maxAge: 0 })
  return reponse
}
