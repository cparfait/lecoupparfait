/**
 * Ce que le dépôt utilise vraiment, confronté à ce qu'il crédite.
 *
 * Le catalogue dit ce qu'on croit utiliser ; ce fichier va lire ce qui est
 * déclaré. Trois écarts possibles, et ce sont les trois seuls qui comptent :
 *
 *  - **un paquet non crédité** — ajouté un soir, jamais remonté sur la page des
 *    crédits, et sa licence exige peut-être l'attribution ;
 *  - **un crédit orphelin** — le paquet a été retiré, l'entrée est restée ;
 *  - **une version qui a dérivé** — « Stockfish 18 » écrit à la main pendant
 *    que le script d'installation va chercher `sf_19`.
 *
 * Lu par `/api/admin/outils` et par `scripts/check-credits.mjs`. Rien ici ne
 * touche au réseau : la recherche de mises à jour est le travail de la route,
 * et elle ne se fait qu'à la demande.
 *
 * ── Pourquoi ça lit des fichiers, et ce que ça donne en production ────────
 *
 * L'image de production embarque la sortie « standalone » de Next, plus
 * `scripts/` et `packages/`. On y retrouve donc `apps/web/package.json`, les
 * deux paquets internes et les scripts d'installation — mais pas
 * `apps/server/package.json`, qui n'y sert à rien. L'inventaire dit alors
 * franchement quel espace de travail il n'a pas pu lire, plutôt que de compter
 * comme absent ce qu'il n'a pas su regarder. Le contrôle des tests, lui, tourne
 * sur le dépôt entier et ne laisse rien passer.
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { CREDITS, type Credit } from './catalogue.ts'

/** Les espaces de travail dont les dépendances partent chez l'utilisateur. */
const ESPACES = ['apps/web', 'apps/server', 'packages/core', 'packages/db'] as const

/**
 * Les paquets internes ne se créditent pas eux-mêmes.
 *
 * `@coupparfait/core` et `@coupparfait/db` sont ce dépôt ; les faire figurer
 * dans les crédits reviendrait à se remercier soi-même.
 */
const INTERNES = /^@coupparfait\//

export interface PaquetInventorie {
  paquet: string
  /** La plage déclarée, telle qu'écrite dans les `package.json`. */
  plage: string
  /** Les espaces de travail qui le déclarent. */
  espaces: string[]
  /** Version réellement installée, si `node_modules` est lisible. */
  installee: string | null
  /** Licence annoncée par le paquet lui-même, pour la confronter au catalogue. */
  licenceReelle: string | null
  credit: Credit | null
}

export interface VersionDivergente {
  nom: string
  version: string
  fichier: string
  /** Vrai quand le fichier existe mais ne contient plus cette version. */
  introuvable: boolean
}

export interface Inventaire {
  racine: string | null
  espacesLus: string[]
  espacesIllisibles: string[]
  paquets: PaquetInventorie[]
  /** Crédits qui citent un paquet npm que plus personne ne déclare. */
  orphelins: Credit[]
  versionsDivergentes: VersionDivergente[]
}

/**
 * La racine du dépôt, trouvée en remontant.
 *
 * Next tourne depuis `apps/web` en développement et depuis `/app` en
 * production : aucune des deux ne peut être écrite en dur. On remonte donc
 * jusqu'au dossier qui contient `packages/core/package.json`, qui existe dans
 * les deux cas.
 */
export function racineDuDepot(depart = process.cwd()): string | null {
  let dossier = resolve(depart)
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(dossier, 'packages', 'core', 'package.json'))) return dossier
    const parent = dirname(dossier)
    if (parent === dossier) break
    dossier = parent
  }
  return null
}

function lireJson(chemin: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(chemin, 'utf8')) as Record<string, unknown>
  } catch {
    return null
  }
}

export function inventorier(racine = racineDuDepot()): Inventaire {
  if (!racine) {
    return {
      racine: null,
      espacesLus: [],
      espacesIllisibles: [...ESPACES],
      paquets: [],
      orphelins: [],
      versionsDivergentes: [],
    }
  }

  const espacesLus: string[] = []
  const espacesIllisibles: string[] = []
  /** paquet → plage déclarée et espaces qui la déclarent. */
  const declares = new Map<string, { plage: string; espaces: string[] }>()

  for (const espace of ESPACES) {
    const manifeste = lireJson(join(racine, espace, 'package.json'))
    if (!manifeste) {
      espacesIllisibles.push(espace)
      continue
    }
    espacesLus.push(espace)
    const deps = (manifeste.dependencies ?? {}) as Record<string, string>
    for (const [paquet, plage] of Object.entries(deps)) {
      if (INTERNES.test(paquet)) continue
      const vu = declares.get(paquet)
      if (vu) vu.espaces.push(espace)
      else declares.set(paquet, { plage, espaces: [espace] })
    }
  }

  const paquets: PaquetInventorie[] = [...declares.entries()]
    .map(([paquet, { plage, espaces }]) => {
      const installe = lireJson(join(racine, 'node_modules', paquet, 'package.json'))
      return {
        paquet,
        plage,
        espaces,
        installee: typeof installe?.version === 'string' ? installe.version : null,
        licenceReelle: typeof installe?.license === 'string' ? installe.license : null,
        credit: CREDITS.find((credit) => credit.paquet === paquet) ?? null,
      }
    })
    .sort((a, b) => a.paquet.localeCompare(b.paquet))

  const orphelins = CREDITS.filter((credit) => credit.paquet && !declares.has(credit.paquet))

  /*
    La version affichée est-elle encore celle qu'on installe ?

    Comparaison volontairement grossière — on cherche la chaîne dans le fichier,
    sans savoir quelle constante la porte. C'est suffisant : le jour où
    `sf_18` devient `sf_19`, « 18 » ne s'y trouve plus. Une analyse syntaxique
    du script serait plus juste et bien plus fragile, pour attraper les mêmes
    fautes.
  */
  const versionsDivergentes: VersionDivergente[] = []
  for (const credit of CREDITS) {
    if (!credit.version || !credit.verifieeDans) continue
    const contenu = (() => {
      try {
        return readFileSync(join(racine, credit.verifieeDans), 'utf8')
      } catch {
        return null
      }
    })()
    if (contenu === null || !contenu.includes(credit.version)) {
      versionsDivergentes.push({
        nom: credit.nom,
        version: credit.version,
        fichier: credit.verifieeDans,
        introuvable: contenu !== null,
      })
    }
  }

  return { racine, espacesLus, espacesIllisibles, paquets, orphelins, versionsDivergentes }
}
