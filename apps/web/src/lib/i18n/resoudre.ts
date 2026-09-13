/**
 * La chaîne de repli, en un seul endroit.
 *
 * Elle existait en deux exemplaires — un dans `I18nProvider` pour l'interface, un
 * dans `serveur.ts` pour les routes d'API — et un troisième s'annonçait pour
 * `global-error.tsx`. Trois copies d'une règle qui compte : **le repli se fait par
 * clé et non par dictionnaire**, langue choisie, puis anglais, puis français.
 *
 * L'ordre n'est pas indifférent. L'anglais avant le français parce qu'il est la
 * seconde langue de la quasi-totalité des gens qui ne parlent ni l'un ni l'autre ;
 * le français en dernier parce qu'il est la langue de référence et qu'il a donc,
 * par construction, toutes les clés. Par clé, parce qu'une langue à moitié
 * traduite doit rester à moitié traduite à l'écran, au lieu de basculer
 * entièrement en anglais à la première clé manquante.
 *
 * Ni `'use client'` ni `server-only` : ce fichier est de la donnée et une boucle
 * `for`. Il doit pouvoir servir des deux côtés, et notamment à l'écran de secours,
 * qui s'affiche quand tout le reste a échoué.
 */

import { dictionaries, fr, type Locale } from './dictionary.ts'
import type { TranslationKey } from './index.tsx'

export function resoudre(dictionnaire: unknown, chemin: string): string | null {
  let courant: unknown = dictionnaire
  for (const segment of chemin.split('.')) {
    if (typeof courant !== 'object' || courant === null) return null
    courant = (courant as Record<string, unknown>)[segment]
  }
  return typeof courant === 'string' ? courant : null
}

/** Remplace `{nom}` par la valeur correspondante. */
export function interpoler(modele: string, vars: Record<string, string | number>): string {
  return modele.replace(/\{(\w+)\}/g, (entier, nom: string) =>
    nom in vars ? String(vars[nom]) : entier,
  )
}

export type Traducteur = (cle: TranslationKey, vars?: Record<string, string | number>) => string

/**
 * Traduit une clé venue du cœur.
 *
 * `packages/core` ne peut pas importer `TranslationKey` : c'est l'application
 * web qui dépend de lui, et non l'inverse. Ses textes affichables sont donc des
 * `string`, et il faut bien les faire entrer quelque part.
 *
 * Ce passage est explicite, et c'est délibéré. Élargir `t` pour qu'il accepte
 * n'importe quelle chaîne aurait été plus court d'une quarantaine d'appels, et
 * aurait coûté la garantie qui compte : le typage a refusé plusieurs clés
 * inventées pendant ce chantier, et il ne le ferait plus. Une fonction à part
 * dit où l'on quitte le domaine du typage, et `check-cles-coeur` vérifie ce que
 * le compilateur ne peut plus voir.
 */
export function tCoeur(t: Traducteur, cle: string, vars?: Record<string, string | number>): string {
  return t(cle as TranslationKey, vars)
}

/**
 * Le `t()` d'une langue.
 *
 * Une clé absente des trois dictionnaires rend son propre chemin : le typage
 * l'interdit déjà, mais un appel calculé peut y échapper, et montrer
 * « settings.theme » au milieu d'un écran rend le défaut visible sans faire
 * tomber la page.
 */
export function fabriquerT(locale: Locale): Traducteur {
  // `?? fr` et non `?? dictionaries[DEFAULT_LOCALE]` : l'index rend
  // `Dictionary | Traduction | undefined`, et le repli doit être typé pour de
  // bon — un code de langue inconnu ne doit pas produire un dictionnaire vide.
  const dictionnaire = dictionaries[locale] ?? fr

  return (cle, vars) => {
    const brut = resoudre(dictionnaire, cle) ?? resoudre(dictionaries.en, cle) ?? resoudre(fr, cle)

    if (brut === null) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[i18n] clé manquante : ${cle}`)
      }
      return cle
    }
    return vars ? interpoler(brut, vars) : brut
  }
}
