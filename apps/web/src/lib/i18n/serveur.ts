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

import { cookies, headers } from 'next/headers'
import { LOCALES, type Locale } from './dictionary.ts'
import { fabriquerT, type Traducteur } from './resoudre.ts'
import { TEMOIN_LANGUE } from './temoin.ts'

/**
 * Le code de langue d'un témoin et d'un `Accept-Language`.
 *
 * L'ordre est celui de la certitude décroissante : ce que le visiteur a choisi
 * dans l'application, ce que son navigateur annonce, puis le français. Les deux
 * appelants ci-dessous lisent la même chose à deux endroits différents — une
 * requête d'API d'un côté, le rendu d'une page de l'autre —, d'où cette forme
 * commune : la règle qui décide de la langue de quelqu'un n'existe qu'une fois.
 */
function choisirLocale(temoin: string | undefined, acceptLanguage: string | null): Locale {
  if (temoin && LOCALES.includes(temoin)) return temoin

  for (const morceau of (acceptLanguage ?? '').split(',')) {
    // `fr-CA;q=0.9` → `fr`. On ne garde que la langue : le projet n'a pas de
    // variantes régionales, et `fr-CA` doit recevoir le français.
    const code = morceau.trim().split(';')[0]?.split('-')[0]?.toLowerCase()
    if (code && LOCALES.includes(code)) return code
  }

  return 'fr'
}

/** La langue de celui qui appelle une route d'`app/api`. */
export function localeDeLaRequete(request: Request): Locale {
  const temoins = request.headers.get('cookie') ?? ''
  const trouve = new RegExp(`(?:^|;\\s*)${TEMOIN_LANGUE}=([A-Za-z-]{2,8})`).exec(temoins)
  return choisirLocale(trouve?.[1], request.headers.get('accept-language'))
}

/**
 * La langue du visiteur, au rendu de la page.
 *
 * L'application démarrait en français et ne regardait `Accept-Language` nulle
 * part : quelqu'un dont le navigateur est en japonais arrivait sur un écran
 * français, et devait trouver le réglage — écrit en français — pour en sortir.
 * Les trente-six langues ne servaient donc qu'à ceux qui savaient déjà qu'elles
 * existaient.
 *
 * La décision est prise **ici, au serveur**, et non par un effet au navigateur :
 * le texte du premier rendu vient du magasin des préférences, et un effet ne
 * s'exécute qu'après. On aurait affiché une page française avant de la
 * remplacer — et surtout, le serveur et le client auraient produit deux textes
 * différents pour la même page.
 *
 * La mise en page racine pose le résultat sur `<html data-langue>`, que le
 * magasin relit quand rien n'est enregistré. Même mécanisme que le thème, et
 * pour la même raison : une seule décision, prise une seule fois.
 */
export async function localeDuVisiteur(): Promise<Locale> {
  const [boite, entetes] = await Promise.all([cookies(), headers()])
  return choisirLocale(boite.get(TEMOIN_LANGUE)?.value, entetes.get('accept-language'))
}

/** Raccourci : `const t = tDeLaRequete(request)`. */
export function tDeLaRequete(request: Request): Traducteur {
  return fabriquerT(localeDeLaRequete(request))
}
