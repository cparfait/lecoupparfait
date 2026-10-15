'use client'

/**
 * L'appli Android, vue depuis le site.
 *
 * L'appli (`mobile/`) n'est qu'une coque Capacitor : elle affiche ce site en
 * direct dans sa propre WebView. Le contenu est donc toujours à jour ; la
 * coque — icône, écran de démarrage, code natif —, c'est le Play Store qui la
 * met à jour.
 *
 * Le site a longtemps servi lui-même un APK, qui se mettait à jour seul
 * depuis `/appli`. Il ne le sert plus : un fichier hors magasin demandait trois
 * réglages qu'Android n'explique pas, et le Play Store fait mieux. Restent les
 * téléphones qui l'ont installé (distribution `site`, versions 1.0.0 à 1.3.0) :
 * leur coque ne changera plus jamais, et ce module sert d'abord à les
 * reconnaître pour les envoyer au Play Store. Hors de l'appli, il ne fait rien.
 */

import { useEffect, useSyncExternalStore } from 'react'

/**
 * La dernière version publiée de la coque.
 *
 * À changer en même temps que `versionCode` et `versionName` dans
 * `mobile/android/app/build.gradle` : le test `appliAndroid.test.ts` y veille.
 * L'administration s'en sert pour signaler une coque en retard.
 */
export const APPLI_ANDROID = {
  versionCode: 4,
  versionName: '1.3.0',
} as const

/**
 * La fiche du Play Store.
 *
 * Une adresse `https` et non `market://` : sur ordinateur elle s'ouvre dans
 * le navigateur, qui propose d'installer sur le téléphone ; dans l'appli, la
 * coque confie toute adresse étrangère au site à Android, qui la donne au Play
 * Store.
 */
export const URL_PLAY_STORE =
  'https://play.google.com/store/apps/details?id=ovh.cparfait.coupparfait'

/**
 * Par où l'appli a été installée.
 *
 * `play` : le Play Store, qui la met à jour. `site` : l'APK que le site
 * servait jusqu'en octobre 2026, qui ne recevra plus rien.
 */
export type Distribution = 'site' | 'play'

interface VersionInstallee {
  code: number
  nom: string
  distribution: Distribution
}

/** Le module natif `AppliPlugin.java`, dans toutes les coques depuis la 1.2.0. */
interface PluginAppli {
  version(): Promise<{ code: number; nom: string; distribution: Distribution }>
  /** Depuis la 1.3.0 : les coques plus anciennes ne l'ont pas. */
  reglerSons?(options: { actifs: boolean; volume: number }): Promise<void>
}

/**
 * Le module natif `MiseAJourPlugin.java` des anciens APK du site. Seule sa
 * version sert encore : les coques 1.0.0 et 1.1.0 n'ont que lui pour la dire.
 */
interface PluginMiseAJour {
  version(): Promise<{ code: number; nom: string }>
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

/**
 * Recopie le réglage des sons dans la coque.
 *
 * L'ouverture animée de l'appli a ses bruitages, et la coque les joue avant
 * que le site soit chargé : elle ne peut donc pas lire ce réglage dans le
 * stockage du site. Sans cette copie, l'appli sonnait au démarrage chez qui
 * avait coupé les sons. La copie sert au lancement suivant.
 */
export function accorderSons(actifs: boolean, volume: number) {
  const appli = pont()?.Plugins?.Appli
  if (typeof appli?.reglerSons !== 'function') return
  void appli.reglerSons({ actifs, volume }).catch(() => {
    // Réglage non transmis : l'ouverture garde le précédent.
  })
}

/**
 * La coque qui affiche cette page, demandée à elle-même ; `null` hors de
 * l'appli, ou dans une coque qui ne sait pas répondre.
 */
export async function versionCoque(): Promise<VersionInstallee | null> {
  const plugins = pont()?.Plugins
  try {
    /*
      `Appli` dit la distribution ; les coques 1.0.0 et 1.1.0 ne l'ont pas, et
      ne connaissent que `MiseAJour` — elles viennent toutes du site.
    */
    const appli = plugins?.Appli ? await plugins.Appli.version() : null
    const version = appli ?? (plugins?.MiseAJour ? await plugins.MiseAJour.version() : null)
    if (!version) return null
    return {
      code: version.code,
      nom: version.nom,
      distribution: appli?.distribution ?? 'site',
    }
  } catch {
    // Une coque sans ces modules : on la traite comme hors de l'appli.
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  L'état partagé
// ─────────────────────────────────────────────────────────────────────────────

export interface EtatAppli {
  /** La page tourne dans l'appli Android. */
  natif: boolean
  /** Connue après un aller-retour avec la coque ; `null` hors de l'appli. */
  installee: VersionInstallee | null
}

const INITIAL: EtatAppli = { natif: false, installee: null }

let etat: EtatAppli = INITIAL
const abonnes = new Set<() => void>()

function modifier(partiel: Partial<EtatAppli>) {
  etat = { ...etat, ...partiel }
  for (const abonne of abonnes) abonne()
}

/** Un ancien APK du site : sa coque ne se mettra plus à jour, il faut passer au Play Store. */
export function aQuitterLeSite(installee: VersionInstallee | null): boolean {
  return installee?.distribution === 'site'
}

let initialise = false

function initialiser() {
  if (initialise || typeof window === 'undefined') return
  initialise = true
  if (!dansAppliAndroid()) return

  modifier({ natif: true })
  void versionCoque().then((installee) => {
    if (installee) modifier({ installee })
  })
}

function souscrire(abonne: () => void) {
  abonnes.add(abonne)
  return () => abonnes.delete(abonne)
}

const instantane = () => etat
const instantaneServeur = () => INITIAL

export function useAppliAndroid(): EtatAppli & { aQuitterLeSite: boolean } {
  const valeur = useSyncExternalStore(souscrire, instantane, instantaneServeur)
  useEffect(initialiser, [])
  return { ...valeur, aQuitterLeSite: aQuitterLeSite(valeur.installee) }
}
