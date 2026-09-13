/**
 * Dictionnaire de l'interface.
 *
 * Volontairement sans bibliothèque : un objet imbriqué, une fonction `t()` qui
 * accepte un chemin pointé et des variables. C'est 40 lignes de code plutôt
 * qu'une dépendance, et le typage garantit qu'aucune clé n'est inventée.
 *
 * Le français est la langue de référence : c'est lui qui définit la forme du
 * dictionnaire, toutes les autres s'y conforment.
 *
 * ── Deux régimes, et c'est le point du fichier ──────────────────────────────
 *
 * L'**anglais** est typé `Dictionary`, c'est-à-dire exactement la forme du
 * français : une clé ajoutée là-bas et oubliée ici casse la compilation. C'est
 * le seul mécanisme qui empêche la traduction de référence de dériver en
 * silence, et il vaut qu'on le garde sur une langue au moins — celle qui sert
 * de repli à toutes les autres.
 *
 * Les **trente-quatre autres** sont typées `Traduction`, c'est-à-dire un
 * dictionnaire partiel. Exiger d'elles les trois cent vingt-deux clés d'un
 * coup reviendrait à interdire qu'une langue existe avant d'être finie, et
 * aucune ne serait jamais commencée. Ce qui manque remonte à l'anglais, puis au
 * français (voir `resolve` dans `index.tsx`) ; ce qui est inventé reste refusé
 * par le typage.
 *
 * Les deux langues complètes vivent dans `fr.ts` et `en.ts` ; les autres dans
 * `langues/<code>.ts`, un fichier par langue.
 */

import { fr } from './fr.ts'
import { en } from './en.ts'
import { LANGUES } from './langues.ts'
import { TRADUCTIONS } from './langues/index.ts'

export { fr } from './fr.ts'
export { en } from './en.ts'
export type { Dictionary } from './fr.ts'

import type { Dictionary } from './fr.ts'

/**
 * Un dictionnaire partiel : chaque section et chaque clé peuvent manquer.
 *
 * Récursif **pour de bon**, et il ne l'était pas : la forme précédente rendait
 * optionnelles les sections et leurs clés, mais s'arrêtait là. Une clé dont la
 * valeur est elle-même un objet — `auth.errors`, `settings.themes` — devait donc
 * être fournie **entière**, et ajouter une phrase à l'une d'elles cassait la
 * compilation des trente-neuf langues d'un coup, pour un texte que `t()` sait
 * pourtant aller chercher ailleurs clé par clé.
 *
 * Le typage disait ainsi le contraire de ce que fait l'exécution. Il dit
 * maintenant la même chose : tout peut manquer, rien ne peut être inventé.
 */
type Partielle<T> = { [K in keyof T]?: T[K] extends string ? string : Partielle<T[K]> }

export type Traduction = Partielle<Dictionary>

/**
 * Les dictionnaires, par code de langue.
 *
 * Le français et l'anglais sont complets ; les autres arrivent du dossier
 * `langues/`, et celles qui n'ont pas encore de fichier reçoivent un
 * dictionnaire vide — elles s'affichent donc intégralement en anglais, ce qui
 * est le comportement voulu tant que personne ne les a traduites.
 */
export const dictionaries: Record<string, Dictionary | Traduction> = {
  fr,
  en,
  ...Object.fromEntries(
    LANGUES.filter((langue) => langue.code !== 'fr' && langue.code !== 'en').map((langue) => [
      langue.code,
      TRADUCTIONS[langue.code] ?? {},
    ]),
  ),
}

/**
 * Le code d'une langue de l'interface.
 *
 * Une chaîne et non plus une union fermée de deux valeurs : la liste vit dans
 * `langues.ts` et change, et un type qui l'énumère obligerait à la recopier.
 * Ce qui compte — qu'un code inconnu ne casse rien — est garanti ailleurs, par
 * `langue()` qui retombe sur le français.
 */
export type Locale = string

export const LOCALES: Locale[] = LANGUES.map((langue) => langue.code)
export const DEFAULT_LOCALE: Locale = 'fr'

/**
 * La langue dans laquelle le **contenu** est disponible.
 *
 * Il y a deux choses très différentes derrière le mot « langue » ici :
 *
 *  - l'**interface** — les boutons, les titres, les messages — qui vit dans ce
 *    dictionnaire et peut exister dans autant de langues qu'on en traduit ;
 *  - le **contenu** — les explications de coups, les définitions de motifs, les
 *    leçons, les fiches d'ouverture — qui est rédigé, pas traduit, et que le
 *    cœur ne sait produire qu'en français et en anglais.
 *
 * Les confondre donnerait un écran en polonais où le coach commenterait en
 * polonais des phrases qui n'existent pas. Toute frontière vers le cœur passe
 * donc par ici, et une langue non couverte lit le contenu en anglais.
 */
export type LocaleDuContenu = 'fr' | 'en'

export function localeDuContenu(locale: Locale): LocaleDuContenu {
  return locale === 'fr' ? 'fr' : 'en'
}

/**
 * Étiquettes des langues, conservées sous leur ancien nom.
 *
 * `flag` porte désormais le code du fichier SVG de `public/drapeaux/`, ou une
 * chaîne vide quand la langue n'a pas de drapeau honnête — voir l'en-tête de
 * `langues.ts`. Le composant `Drapeau` s'occupe des deux cas.
 */
export const LOCALE_LABELS: Record<Locale, { label: string; flag: string }> = Object.fromEntries(
  LANGUES.map((langue) => [langue.code, { label: langue.nom, flag: langue.drapeau ?? '' }]),
)
