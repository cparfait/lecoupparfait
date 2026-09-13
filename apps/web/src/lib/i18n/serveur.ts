import 'server-only'

/**
 * Traduire dans une route d'API.
 *
 * Les quatre-vingt-quinze messages d'erreur de `app/api` étaient écrits en
 * français. Ce n'était pas un oubli mais un vrai obstacle : une route n'a pas de
 * composant, donc pas de `useT`, et surtout elle ne sait pas *à qui* elle
 * répond — la langue est une préférence conservée dans le navigateur, que le
 * serveur ne voit jamais. Le client affichait donc tel quel un « Partie
 * introuvable. » au milieu d'un écran en japonais.
 *
 * Deux choix possibles, et celui qu'on n'a pas pris mérite d'être dit. On aurait
 * pu faire renvoyer aux routes des **codes** que le client traduit : c'est plus
 * propre pour une API publique, mais cela demandait de toucher chaque route
 * *et* chaque appelant, soit deux cents endroits, pour un service qui n'a pas
 * d'autre client que sa propre interface. On fait donc voyager la langue avec la
 * requête, et les routes répondent dans la langue de celui qui demande.
 *
 * **Le transport est un témoin**, `coupparfait.langue`, écrit par `Providers` à
 * chaque changement de préférence. Pas un en-tête : il faudrait l'ajouter à la
 * centaine d'appels `fetch` du projet, et l'un au moins serait oublié. Pas
 * `Accept-Language` non plus, qui dit la langue du navigateur et non celle que
 * l'on a choisie dans l'application — mais qui sert de second recours, ce qui
 * rend déjà la bonne réponse à quelqu'un qui arrive pour la première fois.
 *
 * Le témoin n'est pas une donnée sensible et ne sert qu'à cela : il ne porte
 * qu'un code de langue, et son absence retombe sur le français.
 */

import { dictionaries, fr, LOCALES, type Locale } from './dictionary.ts'
import type { TranslationKey } from './index.tsx'
import { TEMOIN_LANGUE } from './temoin.ts'

/**
 * La langue de celui qui appelle.
 *
 * L'ordre est celui de la certitude décroissante : ce qu'il a choisi dans
 * l'application, ce que son navigateur annonce, puis le français.
 */
export function localeDeLaRequete(request: Request): Locale {
  const temoins = request.headers.get('cookie') ?? ''
  const trouve = new RegExp(`(?:^|;\\s*)${TEMOIN_LANGUE}=([A-Za-z-]{2,8})`).exec(temoins)
  if (trouve && LOCALES.includes(trouve[1]!)) return trouve[1]!

  for (const morceau of (request.headers.get('accept-language') ?? '').split(',')) {
    // `fr-CA;q=0.9` → `fr`. On ne garde que la langue : le projet n'a pas de
    // variantes régionales, et `fr-CA` doit recevoir le français.
    const code = morceau.trim().split(';')[0]?.split('-')[0]?.toLowerCase()
    if (code && LOCALES.includes(code)) return code
  }

  return 'fr'
}

/**
 * Le `t()` des routes, à la même chaîne de repli que celui de l'interface.
 *
 * Par clé et non par dictionnaire — langue choisie, puis anglais, puis français
 * — pour la raison expliquée dans `I18nProvider` : une langue à moitié traduite
 * doit rester à moitié traduite, et non basculer entièrement à la première clé
 * manquante.
 */
export function tServeur(locale: Locale) {
  const dictionnaire = dictionaries[locale] ?? fr

  return (cle: TranslationKey, vars?: Record<string, string | number>): string => {
    const brut = lire(dictionnaire, cle) ?? lire(dictionaries.en, cle) ?? lire(fr, cle)
    if (brut === null) return cle
    return vars
      ? brut.replace(/\{(\w+)\}/g, (entier, nom: string) =>
          nom in vars ? String(vars[nom]) : entier,
        )
      : brut
  }
}

/** Raccourci : `const t = tDeLaRequete(request)`. */
export function tDeLaRequete(request: Request) {
  return tServeur(localeDeLaRequete(request))
}

function lire(dictionnaire: unknown, chemin: string): string | null {
  let courant: unknown = dictionnaire
  for (const segment of chemin.split('.')) {
    if (typeof courant !== 'object' || courant === null) return null
    courant = (courant as Record<string, unknown>)[segment]
  }
  return typeof courant === 'string' ? courant : null
}
