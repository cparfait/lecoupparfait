'use client'

/**
 * Contexte de traduction.
 *
 * `t('game.check')` renvoie la chaîne du dictionnaire courant. Le chemin est
 * typé : une clé inexistante est une erreur de compilation, pas un `undefined`
 * découvert en production.
 */

import { Fragment, createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { dictionaries, fr, type Dictionary, type Locale, type Traduction } from './dictionary.ts'
import { fabriquerT } from './resoudre.ts'

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

  // La chaîne de repli vit dans `resoudre.ts` : l'écran de secours et les routes
  // d'API en ont besoin aussi, et trois copies d'une même règle finissent par
  // diverger sur celle qui compte — le repli se fait par clé, pas par
  // dictionnaire.
  const t = useMemo(() => fabriquerT(locale), [locale])

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

/**
 * Une phrase du dictionnaire dont certains trous reçoivent un élément.
 *
 * `t()` rend une chaîne, et laisse intact un `{trou}` qu'on ne lui a pas
 * rempli. Quand un mot de la phrase doit être mis en valeur — le coup conseillé
 * en couleur, le pseudo en gris —, on remplit ici ces trous-là par des
 * éléments. La phrase reste donc **une** clé : la découper en morceaux autour
 * du `<strong>` figerait l'ordre des mots du français, que l'anglais, l'arabe
 * ou le japonais ne suivent pas.
 */
export function avecElements(texte: string, elements: Record<string, ReactNode>): ReactNode[] {
  return texte.split(/(\{\w+\})/g).map((morceau, index) => {
    const nom = /^\{(\w+)\}$/.exec(morceau)?.[1]
    return (
      <Fragment key={index}>
        {nom !== undefined && nom in elements ? elements[nom] : morceau}
      </Fragment>
    )
  })
}

export { DEFAULT_LOCALE, LOCALES, LOCALE_LABELS, localeDuContenu } from './dictionary.ts'
export type { Locale, LocaleDuContenu } from './dictionary.ts'
export { LANGUES, langue } from './langues.ts'
