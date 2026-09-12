'use client'

/**
 * Contexte de traduction.
 *
 * `t('game.check')` renvoie la chaîne du dictionnaire courant. Le chemin est
 * typé : une clé inexistante est une erreur de compilation, pas un `undefined`
 * découvert en production.
 */

import { createContext, useCallback, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { dictionaries, fr, type Dictionary, type Locale, type Traduction } from './dictionary.ts'

/**
 * Tous les chemins pointés valides du dictionnaire, calculés par le typage.
 * Ex. `'game.check'`, `'settings.themes.aurora'`.
 */
type Path<T> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string ? K : `${K}.${Path<T[K]>}`
    }[keyof T & string]

export type TranslationKey = Path<Dictionary>

interface I18nValue {
  locale: Locale
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
  /**
   * Le dictionnaire de la langue choisie, éventuellement partiel.
   *
   * `Traduction` et non `Dictionary` : trente-quatre langues sur trente-six le
   * sont. Ce qui manque ne se lit pas d'ici mais par `t()`, qui remonte la
   * chaîne clé par clé — c'est donc `t()` qu'il faut employer, et cet objet
   * n'est exposé que pour les rares parcours d'une section entière.
   */
  dictionary: Dictionary | Traduction
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  // `?? fr` et non `?? dictionaries[DEFAULT_LOCALE]` : l'index rend
  // `Dictionary | Traduction | undefined`, et le repli doit être typé pour de
  // bon — un code de langue inconnu ne doit pas produire un dictionnaire vide.
  const dictionary: Dictionary | Traduction = dictionaries[locale] ?? fr

  /**
   * La chaîne de repli, clé par clé.
   *
   * Trente-quatre des trente-six langues sont partielles par construction (voir
   * l'en-tête de `dictionary.ts`), et une clé manquante ne doit surtout pas
   * afficher son chemin : « settings.theme » au milieu d'un écran est pire que
   * la même phrase en anglais.
   *
   * L'ordre n'est pas indifférent. L'anglais avant le français parce qu'il est
   * la seconde langue de la quasi-totalité des gens qui ne parlent ni l'un ni
   * l'autre ; le français en dernier parce qu'il est la langue de référence et
   * qu'il a donc, par construction, toutes les clés. Le repli se fait **par
   * clé** et non par dictionnaire : une langue à moitié traduite reste à moitié
   * traduite à l'écran, au lieu de basculer entièrement en anglais à la
   * première clé manquante.
   */
  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      const raw = resolve(dictionary, key) ?? resolve(dictionaries.en, key) ?? resolve(fr, key)

      if (raw === null) {
        // Un chemin invalide ne doit jamais casser l'affichage : on montre la
        // clé, ce qui rend le problème visible sans faire tomber la page.
        // Le typage l'interdit déjà ; il reste les appels dynamiques.
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[i18n] clé manquante : ${key}`)
        }
        return key
      }
      return vars ? interpolate(raw, vars) : raw
    },
    [dictionary],
  )

  const value = useMemo<I18nValue>(() => ({ locale, t, dictionary }), [locale, t, dictionary])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n doit être utilisé à l’intérieur d’un <I18nProvider>')
  }
  return context
}

/** Raccourci le plus courant : `const t = useT()`. */
export function useT() {
  return useI18n().t
}

function resolve(dictionary: unknown, path: string): string | null {
  let current: unknown = dictionary
  for (const segment of path.split('.')) {
    if (typeof current !== 'object' || current === null) return null
    current = (current as Record<string, unknown>)[segment]
  }
  return typeof current === 'string' ? current : null
}

/** Remplace `{nom}` par la valeur correspondante. */
function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  )
}

/**
 * Rend le gras Markdown des textes du dictionnaire.
 * Certaines phrases marketing contiennent `**mot**` ; plutôt que d'embarquer un
 * moteur Markdown pour ça, on découpe sur les doubles astérisques.
 */
export function renderEmphasis(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((chunk, index) =>
    chunk.startsWith('**') && chunk.endsWith('**') ? (
      <strong key={index} className="text-accent-soft font-semibold">
        {chunk.slice(2, -2)}
      </strong>
    ) : (
      <span key={index}>{chunk}</span>
    ),
  )
}

export { DEFAULT_LOCALE, LOCALES, LOCALE_LABELS, localeDuContenu } from './dictionary.ts'
export type { Locale, LocaleDuContenu } from './dictionary.ts'
export { LANGUES, langue } from './langues.ts'
