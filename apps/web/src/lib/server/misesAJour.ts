import 'server-only'

/**
 * Ce qui existe de plus récent que ce qu'on utilise, relevé au plus une fois
 * par jour.
 *
 * La recherche ne partait qu'au clic d'un administrateur dans l'onglet Outils :
 * c'était la seule requête du projet vers un tiers, et l'on voulait qu'elle
 * reste un geste volontaire. Mais une mise à jour qu'il faut penser à aller
 * chercher est une mise à jour qu'on découvre des semaines plus tard. Elle part
 * donc aussi d'elle-même, quand un administrateur connecté charge une page et
 * que le dernier relevé a plus d'un jour — jamais pour un joueur, jamais depuis
 * un navigateur, et elle ne transporte toujours que des noms de paquets publics.
 *
 * Le relevé vit en mémoire du processus, comme les demandes Google en attente :
 * un seul serveur web, et un redémarrage qui l'oublie coûte une recherche de
 * plus, rien d'autre.
 *
 * Aucune requête ne peut faire échouer le relevé : un registre injoignable rend
 * `null`, que l'écran affiche « inconnue ».
 */

import { CREDITS } from '@/lib/credits/catalogue.ts'
import { inventorier } from '@/lib/credits/inventaire.ts'
import { comparerVersions } from '@/lib/credits/versions.ts'

/** Au-delà, on renonce : l'écran vaut mieux à moitié rempli qu'en attente. */
const DELAI_MS = 6000

const UN_JOUR_MS = 24 * 60 * 60 * 1000

/**
 * Un relevé où rien n'a répondu dit que le réseau manquait, pas que tout est à
 * jour : on retente dans l'heure au lieu d'attendre le lendemain.
 */
const UNE_HEURE_MS = 60 * 60 * 1000

async function json(url: string, entetes?: Record<string, string>): Promise<unknown | null> {
  try {
    const reponse = await fetch(url, {
      signal: AbortSignal.timeout(DELAI_MS),
      headers: { accept: 'application/json', ...entetes },
      cache: 'no-store',
    })
    if (!reponse.ok) return null
    return await reponse.json()
  } catch {
    return null
  }
}

/** Dernière version publiée sur npm. */
async function dernierePubliee(paquet: string): Promise<string | null> {
  const donnees = (await json(
    `https://registry.npmjs.org/${paquet.replace('/', '%2f')}/latest`,
  )) as { version?: string } | null
  return donnees?.version ?? null
}

/** Dernière version étiquetée sur GitHub, pour ce qui ne vient pas de npm. */
async function derniereEtiquette(depot: string): Promise<string | null> {
  const donnees = (await json(`https://api.github.com/repos/${depot}/releases/latest`, {
    // L'API le demande, et sans lui elle répond parfois en 403.
    'user-agent': 'lecoupparfait-admin',
  })) as { tag_name?: string } | null
  return donnees?.tag_name ?? null
}

export interface Releve {
  /** Dernière version connue, par identifiant de crédit. */
  dernieres: Map<string, string | null>
  quand: number
}

let releve: Releve | null = null
/** Deux administrateurs qui chargent une page en même temps font une recherche. */
let enCours: Promise<Releve> | null = null

function perime(r: Releve): boolean {
  const toutInconnu = [...r.dernieres.values()].every((version) => version === null)
  return Date.now() - r.quand > (toutInconnu ? UNE_HEURE_MS : UN_JOUR_MS)
}

async function relever(): Promise<Releve> {
  const paires = await Promise.all(
    CREDITS.map(async (credit) => {
      const derniere = credit.paquet
        ? await dernierePubliee(credit.paquet)
        : credit.github
          ? await derniereEtiquette(credit.github)
          : null
      return [credit.id, derniere] as const
    }),
  )
  return { dernieres: new Map(paires), quand: Date.now() }
}

/**
 * Le relevé des dernières versions.
 *
 *  - `memoire` : ce qu'on a, sans toucher au réseau, ou `null` ;
 *  - `frais`   : ce qu'on a s'il date de moins d'un jour, sinon un neuf ;
 *  - `forcer`  : un neuf — l'administrateur a cliqué, il veut l'état du jour.
 */
export async function releveDesVersions(
  mode: 'memoire' | 'frais' | 'forcer',
): Promise<Releve | null> {
  if (mode === 'memoire') return releve
  if (mode === 'frais' && releve && !perime(releve)) return releve
  enCours ??= relever()
    .then((neuf) => (releve = neuf))
    .finally(() => (enCours = null))
  return enCours
}

/** Combien d'outils ont une version plus récente publiée, d'après un relevé frais. */
export async function compterMisesAJour(): Promise<number> {
  const r = await releveDesVersions('frais')
  if (!r) return 0
  const parPaquet = new Map(inventorier().paquets.map((entree) => [entree.paquet, entree]))
  return CREDITS.filter((credit) => {
    const installee = credit.paquet ? (parPaquet.get(credit.paquet)?.installee ?? null) : null
    const actuelle = installee ?? credit.version ?? null
    return comparerVersions(actuelle, r.dernieres.get(credit.id) ?? null) === 'plusrecent'
  }).length
}
