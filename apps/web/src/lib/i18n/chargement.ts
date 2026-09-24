/**
 * Les dictionnaires présents dans le navigateur, et comment en obtenir d'autres.
 *
 * ── Pourquoi on ne charge plus tout ─────────────────────────────────────────
 *
 * Le fournisseur de traduction importait le français, l'anglais et les
 * dix-huit traductions partielles d'un bloc : un morceau de 288 Ko compressés
 * sur chaque page, pour une personne qui ne lit qu'une langue. Le français seul
 * reste dans le paquet commun — c'est la langue de départ, celle de la plupart
 * des visiteurs, et le dernier recours de `t()`. Les autres sont des `import()`,
 * que l'empaqueteur range chacun dans son morceau.
 *
 * ── Et comment on évite le texte qui change sous les yeux ───────────────────
 *
 * Rendre la page en français le temps que l'anglais arrive, puis la remplacer,
 * aurait contredit le serveur — qui rend dans la langue du visiteur — et cassé
 * l'hydratation. `useLangueChargee` **suspend** donc le premier rendu tant que
 * la langue du serveur n'est pas là : pendant l'hydratation, React garde
 * simplement le HTML reçu à l'écran, et hydrate une fois le morceau arrivé.
 * Personne ne voit de français, et le texte hydraté est celui du serveur.
 *
 * Pour que l'attente soit nulle ou presque, le chargement part dès que ce
 * module est évalué, avant même l'hydratation : la langue est déjà posée sur
 * `<html data-langue>` par le serveur (voir `serveur.ts`).
 *
 * Écarté : joindre les dictionnaires à la page par le serveur. Plus simple
 * sur le papier, mais l'anglais — 103 Ko compressés — repartait alors dans le
 * HTML de chaque chargement de page, là où un morceau de JavaScript reste en
 * cache.
 *
 * Ni `'use client'` ni `server-only` : l'écran de secours le lit aussi, et le
 * rendu serveur du fournisseur passe par les mêmes `import()`.
 */

import { fr } from './fr.ts'
import type { Dictionary, Locale, Traduction } from './dictionary.ts'
import { CHARGEURS } from './langues/chargeurs.ts'

export type Dictionnaires = Readonly<Record<Locale, Dictionary | Traduction | undefined>>

/**
 * Les dictionnaires déjà là, par code de langue.
 *
 * Un objet de module, partagé par tout le navigateur : un dictionnaire ne
 * change pas une fois chargé, et le recharger à chaque montage du fournisseur
 * serait un aller-retour pour rien.
 */
const charges: Record<Locale, Dictionary | Traduction> = { fr }

export function dictionnairesCharges(): Dictionnaires {
  return charges
}

/**
 * Vrai quand `t()` peut rendre cette langue comme le serveur.
 *
 * Le français se suffit. Toute autre langue remonte à l'anglais pour ce qui
 * lui manque, et l'anglais étant complet — le typage l'exige —, le français
 * n'est alors jamais atteint : il faut la langue **et** l'anglais, rien de plus.
 */
export function estChargee(locale: Locale): boolean {
  return locale === 'fr' || (locale in charges && 'en' in charges)
}

/**
 * Une promesse que `use()` lit sans suspendre si elle est déjà tenue.
 *
 * `use()` reconnaît une promesse réglée aux champs `status`, `value` et `reason` qu'il
 * y écrit lui-même la première fois qu'il la voit ; une promesse qu'il n'a
 * jamais vue le fait suspendre une fois, même résolue. On écrit donc ces
 * champs nous-mêmes, dès la résolution : le français, déjà là, ne suspend
 * jamais, et une langue chargée avant l'hydratation non plus.
 */
type Suivie = Promise<void> & {
  status?: 'pending' | 'fulfilled' | 'rejected'
  value?: void
  reason?: unknown
}

function tenue(): Suivie {
  const promesse: Suivie = Promise.resolve()
  promesse.status = 'fulfilled'
  return promesse
}

/**
 * Une promesse **par langue, pour toujours** — sauf échec.
 *
 * `useLangueChargee` appelle `use()` à chaque rendu, sans condition : React
 * rejoue un composant suspendu en rappelant les mêmes crochets, et un `use()`
 * sauté au second passage parce que la langue est entre-temps arrivée le
 * faisait échouer (erreur React 467, vue à l'hydratation). Il faut donc
 * toujours lui tendre une promesse, et la même d'un rendu à l'autre.
 */
const promesses = new Map<Locale, Suivie>([['fr', tenue()]])

/**
 * Fait venir une langue et l'anglais qui lui sert de repli.
 *
 * Une langue du registre sans traduction reçoit un dictionnaire vide : elle
 * s'affiche en anglais, comme avant. Un échec réseau rejette la promesse et
 * l'oublie, pour qu'un nouvel essai reparte de zéro.
 */
export function chargerLangue(locale: Locale): Promise<void> {
  const deja = promesses.get(locale)
  if (deja) return deja
  if (estChargee(locale)) {
    const promesse = tenue()
    promesses.set(locale, promesse)
    return promesse
  }

  const promesse: Suivie = Promise.all([
    charges.en ? Promise.resolve(charges.en) : import('./en.ts').then((m) => m.en),
    locale === 'en' ? Promise.resolve(undefined) : (CHARGEURS[locale]?.() ?? Promise.resolve({})),
  ]).then(
    ([anglais, traduction]) => {
      charges.en ??= anglais
      if (traduction) charges[locale] ??= traduction
      promesse.status = 'fulfilled'
    },
    (erreur: unknown) => {
      promesses.delete(locale)
      promesse.status = 'rejected'
      promesse.reason = erreur
      throw erreur
    },
  )
  promesse.status = 'pending'

  promesses.set(locale, promesse)
  return promesse
}

// Le plus tôt possible : ce module est évalué avec le paquet commun, bien avant
// que React n'hydrate. La promesse est gardée dans `promesses`, et c'est elle
// que `useLangueChargee` retrouvera. Un échec ici n'est pas une erreur à signaler :
// le premier rendu retentera, et c'est lui qui le fera voir.
if (typeof document !== 'undefined') {
  const langueDuServeur = document.documentElement.dataset.langue
  if (langueDuServeur) chargerLangue(langueDuServeur).catch(() => {})
}
