'use client'

/**
 * La connexion avec Google, depuis l'appli Android.
 *
 * Google refuse sa page dans une WebView. On l'ouvre donc dans Chrome, par
 * l'extension `Browser` de Capacitor (un « onglet personnalisé », par-dessus
 * l'appli), et l'on revient par le lien `RETOUR_APPLI`, que l'extension `App`
 * signale. Le serveur, lui, garde l'issue entre les deux : voir « Depuis
 * l'appli » dans `lib/server/google.ts`.
 *
 * Une coque trop ancienne n'a pas ces extensions : `googleDansAppliPossible`
 * le dit, et le bouton reste masqué.
 */

import { moduleNatif } from '@/lib/appliAndroid.ts'

/** L'extension `@capacitor/browser`. */
interface PluginNavigateur {
  open(options: { url: string }): Promise<void>
  close(): Promise<void>
  addListener(
    evenement: 'browserFinished',
    rappel: () => void,
  ): Promise<{ remove: () => Promise<void> }>
}

/** L'extension `@capacitor/app`. */
interface PluginApp {
  addListener(
    evenement: 'appUrlOpen',
    rappel: (donnees: { url: string }) => void,
  ): Promise<{ remove: () => Promise<void> }>
  getLaunchUrl(): Promise<{ url: string } | undefined>
}

/** Doit rester identique à `RETOUR_APPLI` dans `lib/server/google.ts` et au manifeste Android. */
const RETOUR_APPLI = 'ovh.cparfait.coupparfait://connexion'
const FIN = '/api/auth/google/appli/fin'

/** Vrai dans une appli qui sait passer par Chrome et en revenir. */
export function googleDansAppliPossible(): boolean {
  return moduleNatif('Browser') !== null && moduleNatif('App') !== null
}

/**
 * Une seule fois vers l'issue.
 *
 * Deux signaux peuvent l'annoncer : le lien de retour, et la fermeture de
 * Chrome — que l'on provoque soi-même en recevant le lien. Le second
 * relancerait la page de fin, qui n'aurait plus d'issue à rendre et
 * répondrait « annulée » par-dessus une connexion réussie.
 */
let enRoute = false
function allerALIssue() {
  if (enRoute) return
  enRoute = true
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Une route du serveur, pas une page : elle pose le témoin de session et redirige. Une navigation interne de Next ne l'atteindrait pas.
  window.location.href = FIN
}

/** Ouvre la connexion avec Google dans Chrome. Rend faux si le serveur refuse le départ. */
export async function connecterAvecGoogleDansAppli(
  mode: 'connexion' | 'lier',
  suite: string,
): Promise<boolean> {
  const navigateur = moduleNatif<PluginNavigateur>('Browser')
  if (!navigateur) return false

  const reponse = await fetch('/api/auth/google/appli', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, suite }),
  })
  if (!reponse.ok) return false
  const { adresse } = (await reponse.json()) as { adresse?: string }
  if (!adresse) return false

  // Refermé à la main : on va quand même voir, la connexion a pu aboutir
  // juste avant. Sinon la page de fin dit « annulée ».
  enRoute = false
  const ecoute = await navigateur.addListener('browserFinished', () => {
    void ecoute.remove()
    allerALIssue()
  })
  await navigateur.open({ url: adresse })
  return true
}

/**
 * Écoute le lien de retour, une fois pour toute la vie de la page.
 *
 * Aussi au démarrage (`getLaunchUrl`) : si Android a fermé l'appli pendant
 * qu'on était dans Chrome, c'est le lien de retour qui la relance.
 */
let branche = false
export function brancherRetourGoogle() {
  const app = moduleNatif<PluginApp>('App')
  if (!app || branche) return
  branche = true

  const surLien = (url: string | undefined) => {
    if (!url?.startsWith(RETOUR_APPLI)) return
    void moduleNatif<PluginNavigateur>('Browser')
      ?.close()
      .catch(() => {
        // Déjà refermé : rien à faire.
      })
    allerALIssue()
  }
  void app.addListener('appUrlOpen', ({ url }) => surLien(url))
  void app
    .getLaunchUrl()
    .then((lancement) => {
      /*
        Une fois par lancement, pas une fois par page.

        Le lien de lancement reste celui du processus tant qu'il vit : chaque
        page chargée ensuite le relirait, à commencer par celle où mène la page
        de fin — qui renverrait à la page de fin, et ainsi de suite. La session
        de la WebView survit aux navigations, pas à la fermeture de l'appli :
        c'est exactement la durée voulue.
      */
      const url = lancement?.url
      if (!url || sessionStorage.getItem(CLE_LANCEMENT) === url) return
      sessionStorage.setItem(CLE_LANCEMENT, url)
      surLien(url)
    })
    .catch(() => {
      // Une coque qui ne sait pas le dire : le lien arrivera par l'écouteur.
    })
}

const CLE_LANCEMENT = 'coupparfait.google.lancementTraite'
