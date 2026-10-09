import 'server-only'

/**
 * Appliquer l'issue d'une connexion avec Google, là où l'on se trouve.
 *
 * Sur le site, c'est le retour de Google lui-même qui l'applique
 * (`api/auth/google/retour`). Dans l'appli, ce retour a lieu dans Chrome : il
 * met l'issue de côté, et c'est la WebView qui l'applique ensuite
 * (`api/auth/google/appli/fin`). Une seule façon de faire, pour que les deux
 * chemins ne divergent pas.
 */

import { NextResponse } from 'next/server'
import { DUREE_SECONDES, TEMOIN_NOUVEAU, type IssueGoogle } from './google.ts'
import { startSession } from './session.ts'

export async function appliquerIssue(issue: IssueGoogle, site: string): Promise<NextResponse> {
  const vers = (chemin: string) => NextResponse.redirect(new URL(chemin, site))

  switch (issue.type) {
    case 'session':
      await startSession(issue.userId)
      return vers(issue.suite)

    case 'lier': {
      const separateur = issue.suite.includes('?') ? '&' : '?'
      return vers(`${issue.suite}${separateur}google=${issue.resultat}`)
    }

    case 'echec':
      return vers(`/connexion?google=${issue.raison}`)

    case 'nouveau': {
      const reponse = vers('/connexion/google')
      reponse.cookies.set(TEMOIN_NOUVEAU, issue.cle, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: DUREE_SECONDES,
      })
      return reponse
    }
  }
}
