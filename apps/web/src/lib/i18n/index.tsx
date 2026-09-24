'use client'

/**
 * Contexte de traduction.
 *
 * `t('game.check')` renvoie la chaîne du dictionnaire courant. Le chemin est
 * typé : une clé inexistante est une erreur de compilation, pas un `undefined`
 * découvert en production.
 */

import { Fragment, createContext, use, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { fr, type Dictionary, type Locale, type Traduction } from './dictionary.ts'
import { chargerLangue, dictionnairesCharges } from './chargement.ts'
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

/**
 * @param locale Une langue **déjà chargée** — celle que rend
 *   `useLangueChargee`. Une langue absente de `chargement.ts` s'afficherait en
 *   français, faute de mieux.
 */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  // `?? fr` et non un dictionnaire vide : l'index rend
  // `Dictionary | Traduction | undefined`, et le repli doit être typé pour de
  // bon — un code de langue inconnu ne doit pas produire un dictionnaire vide.
  const dictionary: Dictionary | Traduction = dictionnairesCharges()[locale] ?? fr

  // La chaîne de repli vit dans `resoudre.ts` : l'écran de secours et les routes
  // d'API en ont besoin aussi, et trois copies d'une même règle finissent par
  // diverger sur celle qui compte — le repli se fait par clé, pas par
  // dictionnaire.
  const t = useMemo(() => fabriquerT(locale, dictionnairesCharges()), [locale])

  const value = useMemo<I18nValue>(() => ({ locale, t, dictionary }), [locale, t, dictionary])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/**
 * La langue à afficher, compte tenu de celles qui sont arrivées.
 *
 * Le premier rendu, au serveur comme au navigateur, est **toujours** dans la
 * langue décidée au serveur, quoi que dise le stockage local : les deux rendus
 * produisent le même texte. Si ses dictionnaires ne sont pas encore là, le
 * rendu **suspend** — au navigateur, React garde alors le HTML du serveur à
 * l'écran et hydrate une fois le morceau arrivé ; au serveur, il attend
 * l'`import()`, qui est local. Le chargement est lancé dès l'évaluation de
 * `chargement.ts`, si bien que l'attente est en pratique celle d'un fichier en
 * cache.
 *
 * Quand la langue voulue change ensuite — un choix dans les préférences, ou un
 * réglage enregistré qui contredit le témoin —, on **ne suspend plus** : il n'y
 * a pas de périmètre d'attente au-dessus du fournisseur, et suspendre sur une
 * mise à jour ferait disparaître la page. On charge dans un effet et on garde
 * l'ancienne langue à l'écran d'ici là, plutôt que d'afficher des phrases
 * françaises le temps d'un aller-retour. Si le chargement échoue, la page reste
 * dans la langue qu'elle avait : lisible, et le prochain choix retentera.
 */
export function useLangueChargee(voulue: Locale, initiale: Locale): Locale {
  const [affichee, setAffichee] = useState(initiale)

  // Sans condition, et c'est indispensable : React rejoue un rendu suspendu en
  // rappelant les mêmes crochets, et un `use()` sauté au second passage le fait
  // échouer. La promesse est la même d'un rendu à l'autre et, une fois tenue,
  // `use()` la lit sans suspendre (voir `chargerLangue`). `affichee` ne change
  // que par l'effet ci-dessous, qui attend le chargement : la suspension ne peut
  // donc se produire qu'au premier rendu.
  use(chargerLangue(affichee))

  useEffect(() => {
    if (voulue === affichee) return
    let abandonne = false
    chargerLangue(voulue).then(
      () => {
        if (!abandonne) setAffichee(voulue)
      },
      (erreur: unknown) => {
        console.error(`[i18n] la langue « ${voulue} » n'a pas pu être chargée`, erreur)
      },
    )
    return () => {
      abandonne = true
    }
  }, [voulue, affichee])

  return affichee
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
