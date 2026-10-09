'use client'

/**
 * L'appli Android, vue depuis le site.
 *
 * L'appli (`mobile/`) n'est qu'une coque Capacitor : elle affiche ce site en
 * direct dans sa propre WebView. Le contenu est donc toujours à jour, mais
 * pas la coque — icône, écran de démarrage, code natif. Et comme l'APK ne
 * passe pas par le Play Store, personne ne la mettrait à jour.
 *
 * Le site, lui, sait toujours quelle est la dernière coque publiée :
 * `APPLI_ANDROID`, livrée avec l'APK lui-même dans `public/telechargements`.
 * Ce module compare avec la version installée, que la coque expose par son
 * module natif `MiseAJour`, et pilote le téléchargement puis l'installeur
 * d'Android. Hors de l'appli, il ne fait rien.
 *
 * L'état est partagé : le bandeau de `MiseEnRoute` et la page `/appli`
 * montrent le même téléchargement, pas deux.
 */

import { useCallback, useEffect, useSyncExternalStore } from 'react'

/**
 * La dernière version publiée de l'APK.
 *
 * À changer en même temps que `versionCode` et `versionName` dans
 * `mobile/android/app/build.gradle`, et que le fichier servi : le test
 * `appliAndroid.test.ts` y veille.
 */
export const APPLI_ANDROID = {
  versionCode: 3,
  versionName: '1.2.0',
  fichier: '/telechargements/le-coup-parfait.apk',
} as const

/** L'adresse de téléchargement, qui change à chaque version : aucun relais ne resert l'ancienne. */
export const URL_APK = `${APPLI_ANDROID.fichier}?v=${APPLI_ANDROID.versionCode}`

/**
 * Par où l'appli a été installée.
 *
 * `site` : l'APK de la page /appli, qui se met à jour lui-même. `play` : le
 * Play Store, qui met l'appli à jour à sa place — Google interdit toute autre
 * voie, et le site n'y propose donc rien.
 */
export type Distribution = 'site' | 'play'

interface VersionInstallee {
  code: number
  nom: string
  distribution: Distribution
  /** L'utilisateur a permis à l'appli d'« installer des applis inconnues ». */
  installationAutorisee: boolean
}

/** Le module natif `AppliPlugin.java`, présent dans les deux distributions. */
interface PluginAppli {
  version(): Promise<{ code: number; nom: string; distribution: Distribution }>
}

/** Le module natif `MiseAJourPlugin.java`, dans l'APK du site seulement. */
interface PluginMiseAJour {
  version(): Promise<{ code: number; nom: string; installationAutorisee: boolean }>
  autoriser(): Promise<void>
  installer(options: { url: string }): Promise<void>
  addListener(
    evenement: 'progression',
    rappel: (donnees: { pourcentage: number }) => void,
  ): Promise<{ remove: () => Promise<void> }>
}

/** Ce que l'appli injecte dans la page, et seulement là. */
interface PontCapacitor {
  isNativePlatform?: () => boolean
  getPlatform?: () => string
  Plugins?: {
    Appli?: PluginAppli
    MiseAJour?: PluginMiseAJour
    SystemBars?: { setStyle(options: { style: 'LIGHT' | 'DARK' }): Promise<void> }
  }
}

function pont(): PontCapacitor | null {
  if (typeof window === 'undefined') return null
  const capacitor = (window as Window & { Capacitor?: PontCapacitor }).Capacitor
  if (!capacitor?.isNativePlatform?.() || capacitor.getPlatform?.() !== 'android') return null
  return capacitor
}

/** Vrai dans l'appli Android. À n'appeler qu'après l'hydratation. */
export function dansAppliAndroid(): boolean {
  return pont() !== null
}

/**
 * Un module natif de l'appli, par son nom, ou `null` hors de l'appli — ou
 * dans une coque trop ancienne pour le connaître.
 */
export function moduleNatif<T>(nom: string): T | null {
  const plugins = pont()?.Plugins as Record<string, unknown> | undefined
  return (plugins?.[nom] as T | undefined) ?? null
}

/**
 * Accorde les icônes de la barre d'état au thème du site.
 *
 * L'appli dessine la page sous la barre d'état, et ses icônes restaient
 * blanches : sur le thème clair, l'heure et la batterie disparaissaient.
 */
export function accorderBarreEtat(theme: 'aurora' | 'clair') {
  void pont()
    ?.Plugins?.SystemBars?.setStyle({ style: theme === 'clair' ? 'LIGHT' : 'DARK' })
    .catch(() => {
      // Une coque trop ancienne pour ce module : les icônes restent claires.
    })
}

// ─────────────────────────────────────────────────────────────────────────────
//  La préférence : se mettre à jour sans qu'on le demande
// ─────────────────────────────────────────────────────────────────────────────

const CLE_AUTO = 'coupparfait.appli.miseAJourAuto'

function lireAuto(): boolean {
  try {
    // Activée par défaut : c'est la seule façon de ne pas garder une vieille
    // coque des mois durant, faute d'avoir pensé à ouvrir cette page.
    return window.localStorage.getItem(CLE_AUTO) !== '0'
  } catch {
    return true
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  L'état partagé
// ─────────────────────────────────────────────────────────────────────────────

export type EtapeMiseAJour =
  /** Rien en cours. */
  | 'repos'
  /** Le réglage « applis inconnues » est ouvert ; on reprend au retour. */
  | 'autorisation'
  | 'telechargement'
  /** L'installeur d'Android est à l'écran : la suite lui appartient. */
  | 'installeur'
  | 'erreur'

export interface EtatAppli {
  /** La page tourne dans l'appli Android. */
  natif: boolean
  /** Connue après un aller-retour avec la coque ; `null` hors de l'appli. */
  installee: VersionInstallee | null
  miseAJourAuto: boolean
  etape: EtapeMiseAJour
  /** Pendant le téléchargement, quand le serveur en annonce la taille. */
  pourcentage: number | null
}

const INITIAL: EtatAppli = {
  natif: false,
  installee: null,
  miseAJourAuto: true,
  etape: 'repos',
  pourcentage: null,
}

let etat: EtatAppli = INITIAL
const abonnes = new Set<() => void>()

function modifier(partiel: Partial<EtatAppli>) {
  etat = { ...etat, ...partiel }
  for (const abonne of abonnes) abonne()
}

/** Une coque du site plus ancienne que la dernière publiée. Celle du Play Store n'est pas de notre ressort. */
export function aMettreAJour(installee: VersionInstallee | null): boolean {
  return (
    installee !== null &&
    installee.distribution === 'site' &&
    installee.code < APPLI_ANDROID.versionCode
  )
}

async function relireVersion() {
  const plugins = pont()?.Plugins
  try {
    /*
      `Appli` dit la distribution ; les coques 1.0.0 et 1.1.0 ne l'ont pas, et
      ne connaissent que `MiseAJour` — elles viennent toutes du site. Celui-ci
      seul sait aussi si l'installation est autorisée : la question n'a pas de
      sens pour le Play Store.
    */
    const appli = plugins?.Appli ? await plugins.Appli.version() : null
    const miseAJour = plugins?.MiseAJour ? await plugins.MiseAJour.version() : null
    const version = appli ?? miseAJour
    if (!version) return
    modifier({
      installee: {
        code: version.code,
        nom: version.nom,
        distribution: appli?.distribution ?? 'site',
        installationAutorisee: miseAJour?.installationAutorisee ?? false,
      },
    })
  } catch {
    // Une coque sans ces modules : on la traite comme hors de l'appli.
  }
}

let initialise = false

function initialiser() {
  if (initialise || typeof window === 'undefined') return
  initialise = true
  if (!dansAppliAndroid()) return

  modifier({ natif: true, miseAJourAuto: lireAuto() })
  void relireVersion()

  // De retour du réglage « applis inconnues » : l'autorisation a peut-être été
  // donnée, et la mise à jour demandée reprend d'elle-même.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    void relireVersion().then(() => {
      if (etat.etape === 'autorisation' && etat.installee?.installationAutorisee) {
        void mettreAJour()
      } else if (etat.etape === 'installeur') {
        // Installeur refermé sans installer : on repropose.
        modifier({ etape: 'repos', pourcentage: null })
      }
    })
  })
}

/** Lance la mise à jour, en passant par l'autorisation si elle manque. */
export async function mettreAJour() {
  const plugin = pont()?.Plugins?.MiseAJour
  if (!plugin || etat.etape === 'telechargement') return

  if (!etat.installee?.installationAutorisee) {
    modifier({ etape: 'autorisation' })
    await plugin.autoriser().catch(() => modifier({ etape: 'erreur' }))
    return
  }

  modifier({ etape: 'telechargement', pourcentage: null })
  const ecoute = await plugin
    .addListener('progression', ({ pourcentage }) => modifier({ pourcentage }))
    .catch(() => null)
  try {
    await plugin.installer({ url: new URL(URL_APK, window.location.origin).href })
    modifier({ etape: 'installeur', pourcentage: null })
  } catch {
    modifier({ etape: 'erreur', pourcentage: null })
  } finally {
    void ecoute?.remove()
  }
}

let autoLancee = false

/**
 * La mise à jour automatique : une fois par lancement, et seulement quand
 * Android la laisse passer sans détour.
 *
 * Si l'autorisation d'installer manque, on n'ouvre pas les paramètres de
 * soi-même — une appli qui jette son joueur dans un écran système au démarrage
 * se fait désinstaller. Le bandeau propose alors le bouton, et c'est tout.
 */
export function lancerMiseAJourAuto() {
  if (
    autoLancee ||
    !etat.miseAJourAuto ||
    etat.etape !== 'repos' ||
    !aMettreAJour(etat.installee) ||
    !etat.installee?.installationAutorisee
  ) {
    return
  }
  autoLancee = true
  void mettreAJour()
}

export function choisirMiseAJourAuto(active: boolean) {
  try {
    window.localStorage.setItem(CLE_AUTO, active ? '1' : '0')
  } catch {
    // Stockage refusé : le choix vaut pour cette visite seulement.
  }
  modifier({ miseAJourAuto: active })
}

function souscrire(abonne: () => void) {
  abonnes.add(abonne)
  return () => abonnes.delete(abonne)
}

const instantane = () => etat
const instantaneServeur = () => INITIAL

export function useAppliAndroid(): EtatAppli & {
  aJour: boolean
  mettreAJour: () => Promise<void>
} {
  const valeur = useSyncExternalStore(souscrire, instantane, instantaneServeur)
  useEffect(initialiser, [])
  const lancer = useCallback(() => mettreAJour(), [])
  return { ...valeur, aJour: !aMettreAJour(valeur.installee), mettreAJour: lancer }
}
