/**
 * Les traductions partielles, une par langue.
 *
 * Le français et l'anglais vivent un cran plus haut, dans `fr.ts` et `en.ts` :
 * ce sont les deux seules langues complètes, et le typage l'exige d'elles (voir
 * l'en-tête de `dictionary.ts`). Toutes les autres sont ici, et toutes sont
 * partielles par construction — ce qui manque remonte à l'anglais, puis au
 * français, clé par clé.
 *
 * **Un fichier par langue, et un seul endroit où les déclarer.** Le registre
 * `LANGUES` dit quelles langues existent ; cette table dit lesquelles ont
 * commencé à être traduites. Une langue du registre sans entrée ici s'affiche
 * intégralement en anglais, ce qui est le bon comportement : elle est proposée,
 * elle fonctionne, et `check:langues` la montre à zéro pour cent.
 *
 * Tout est importé d'un bloc et non à la demande. C'est un choix mesuré, le
 * même que pour l'anglais : le dictionnaire entier d'une langue pèse quelques
 * kilooctets une fois compressé, et le chargement différé coûterait un aller-
 * retour réseau au premier rendu — c'est-à-dire un écran qui s'affiche dans la
 * mauvaise langue avant de se corriger sous les yeux du lecteur.
 */

import type { Traduction } from '../dictionary.ts'

import { es } from './es.ts'
import { de } from './de.ts'
import { it } from './it.ts'
import { pt } from './pt.ts'
import { nl } from './nl.ts'
import { ru } from './ru.ts'
import { pl } from './pl.ts'
import { tr } from './tr.ts'
import { uk } from './uk.ts'
import { cs } from './cs.ts'
import { hu } from './hu.ts'
import { ro } from './ro.ts'
import { sv } from './sv.ts'
import { el } from './el.ts'
import { zh } from './zh.ts'
import { ja } from './ja.ts'
import { hi } from './hi.ts'
import { ar } from './ar.ts'

/**
 * Les langues traduites à ce jour.
 *
 * Choisies pour le nombre de joueurs qu'elles couvrent. Les autres langues du
 * registre sont proposées et fonctionnent : elles s'affichent en anglais, et
 * `check:langues` les compte à zéro pour cent — un état visible vaut mieux
 * qu'une langue absente de la liste.
 */
export const TRADUCTIONS: Record<string, Traduction> = {
  es,
  de,
  it,
  pt,
  nl,
  ru,
  pl,
  tr,
  uk,
  cs,
  hu,
  ro,
  sv,
  el,
  zh,
  ja,
  hi,
  ar,
}
