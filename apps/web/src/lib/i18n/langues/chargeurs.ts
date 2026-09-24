/**
 * Les traductions partielles, chacune dans son propre morceau de JavaScript.
 *
 * `index.ts` importe tout d'un bloc, et c'est ce qu'il faut au serveur et aux
 * scripts de contrôle. Le navigateur, lui, n'a besoin que d'une langue à la
 * fois : chaque entrée ci-dessous est un `import()`, que l'empaqueteur sort du
 * paquet commun et ne livre qu'à qui la demande — voir `chargement.ts`.
 *
 * **La même liste que `TRADUCTIONS`**, et `check-langues` refuse qu'elles
 * divergent : une langue traduite mais absente d'ici s'afficherait en anglais
 * sans que rien ne le signale.
 */

import type { Traduction } from '../dictionary.ts'

export const CHARGEURS: Record<string, () => Promise<Traduction>> = {
  es: () => import('./es.ts').then((m) => m.es),
  de: () => import('./de.ts').then((m) => m.de),
  it: () => import('./it.ts').then((m) => m.it),
  pt: () => import('./pt.ts').then((m) => m.pt),
  nl: () => import('./nl.ts').then((m) => m.nl),
  ru: () => import('./ru.ts').then((m) => m.ru),
  pl: () => import('./pl.ts').then((m) => m.pl),
  tr: () => import('./tr.ts').then((m) => m.tr),
  uk: () => import('./uk.ts').then((m) => m.uk),
  cs: () => import('./cs.ts').then((m) => m.cs),
  hu: () => import('./hu.ts').then((m) => m.hu),
  ro: () => import('./ro.ts').then((m) => m.ro),
  sv: () => import('./sv.ts').then((m) => m.sv),
  el: () => import('./el.ts').then((m) => m.el),
  zh: () => import('./zh.ts').then((m) => m.zh),
  ja: () => import('./ja.ts').then((m) => m.ja),
  hi: () => import('./hi.ts').then((m) => m.hi),
  ar: () => import('./ar.ts').then((m) => m.ar),
}
