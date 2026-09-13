import 'server-only'

/**
 * Le titre et la description d'une page, dans la langue du visiteur.
 *
 * Les quarante-cinq `layout.tsx` du projet posaient leurs métadonnées en
 * français. C'était assumé et c'était un mauvais calcul : l'argument disait
 * qu'elles s'adressent aux moteurs de recherche, mais elles s'affichent aussi
 * dans l'onglet, dans les favoris, dans l'historique et dans un aperçu de lien
 * partagé — quatre endroits que lit une personne, pas un robot.
 *
 * **Le prix est réel et il est payé sciemment.** Lire le témoin de langue rend
 * la route dynamique : ces quarante-cinq pages étaient rendues une fois pour
 * toutes, elles le seront désormais à chaque visite. C'est supportable ici —
 * leur contenu est de toute façon un composant client qui va chercher ses
 * données après coup, et le projet s'héberge sur une machine, pas sur un réseau
 * de diffusion. Ce serait un mauvais échange sur un site de contenu statique.
 *
 * L'autre voie, un segment de langue dans l'adresse (`/fr/…`, `/en/…`), rendrait
 * la chose statique à nouveau, au prix de quarante-et-une copies de chaque route
 * et d'une réécriture de toute la navigation. Elle reste ouverte le jour où le
 * coût du rendu se voit.
 */

import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { LOCALES } from './dictionary.ts'
import type { TranslationKey } from './index.tsx'
import { fabriquerT, type Traducteur } from './resoudre.ts'
import { TEMOIN_LANGUE } from './temoin.ts'

/**
 * Le `t()` du rendu de page.
 *
 * Le témoin seul, sans repli sur `Accept-Language` : contrairement aux routes
 * d'API, on est ici dans le tout premier chargement possible, où le témoin peut
 * manquer — et l'en-tête du navigateur donnerait alors une langue que
 * l'application n'utilise pas encore, puisqu'elle démarre en français et ne lit
 * pas `navigator.language`. Le titre de l'onglet ne correspondrait pas à l'écran
 * qu'il surmonte. Le témoin est posé dès le premier rendu du client ; seule la
 * toute première page d'une visite sans témoin porte donc un titre français.
 */
export async function tDesMetadonnees(): Promise<Traducteur> {
  const boite = await cookies()
  const code = boite.get(TEMOIN_LANGUE)?.value
  return fabriquerT(code && LOCALES.includes(code) ? code : 'fr')
}

/**
 * Le cas courant : un titre, parfois une description, parfois rien à indexer.
 *
 * Rend l'objet, pas la fonction : Next veut un export nommé `generateMetadata`,
 * et chaque mise en page l'écrit donc elle-même, en une ligne.
 */
export async function metadonnees(
  titre: TranslationKey,
  options: { description?: TranslationKey; sansIndexation?: boolean } = {},
): Promise<Metadata> {
  const t = await tDesMetadonnees()
  return {
    title: t(titre),
    ...(options.description ? { description: t(options.description) } : {}),
    ...(options.sansIndexation ? { robots: { index: false, follow: false } } : {}),
  }
}

/**
 * Même chose pour une rubrique qui a des pages en dessous d'elle.
 *
 * Un `title` en chaîne consomme le gabarit de la mise en page racine et n'en
 * repose aucun : les pages filles perdaient le suffixe « · Le Coup Parfait », et
 * leur onglet s'appelait simplement « Contre l'ordinateur ». On redonne donc le
 * gabarit à ce niveau. Le suffixe, lui, est le nom du site : il ne se traduit
 * pas.
 */
export async function metadonneesDeRubrique(
  titre: TranslationKey,
  description?: TranslationKey,
): Promise<Metadata> {
  const t = await tDesMetadonnees()
  return {
    title: { default: t(titre), template: '%s · Le Coup Parfait' },
    ...(description ? { description: t(description) } : {}),
  }
}
