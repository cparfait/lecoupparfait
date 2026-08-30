'use client'

/**
 * Rangement des clés d'API.
 *
 * **La clé ne quitte jamais le navigateur autrement que comme en-tête de la
 * requête qu'elle authentifie.** Elle n'est pas écrite en base, elle n'est pas
 * attachée au compte, elle ne part pas dans la synchronisation des préférences.
 *
 * C'est pour cette raison qu'elle a son propre module plutôt qu'un champ de
 * plus dans `store/preferences.ts` : ce fichier annonce en tête que « les
 * comptes connectés synchronisent ensuite ce même objet côté serveur ». Une
 * clé rangée là partirait en base à la première connexion, sans que personne
 * l'ait décidé. Deux stockages séparés rendent l'accident impossible.
 *
 * Contrepartie assumée : la clé est à ressaisir sur chaque appareil, et elle
 * disparaît si l'on vide les données du site. C'est le prix d'un secret qu'on
 * ne confie à personne.
 */

const STORAGE_KEY = 'coupparfait.ia.cles'

type Trousseau = Record<string, string>

function lire(): Trousseau {
  if (typeof window === 'undefined') return {}
  try {
    const brut = window.localStorage.getItem(STORAGE_KEY)
    if (!brut) return {}
    const parsed = JSON.parse(brut) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as Trousseau
  } catch {
    // Stockage local refusé (navigation privée stricte, réglage d'entreprise) :
    // l'assistant sera simplement inutilisable, le reste du site fonctionne.
    return {}
  }
}

function ecrire(trousseau: Trousseau): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trousseau))
  } catch {
    // Sans conséquence : la clé reste valable pour la session en cours.
  }
}

/** Clé enregistrée pour un fournisseur, ou chaîne vide s'il n'y en a pas. */
export function getCle(providerId: string): string {
  return lire()[providerId] ?? ''
}

/** Enregistre la clé d'un fournisseur. Une valeur vide efface l'entrée. */
export function setCle(providerId: string, valeur: string): void {
  const trousseau = lire()
  const propre = valeur.trim()
  if (propre) {
    trousseau[providerId] = propre
  } else {
    delete trousseau[providerId]
  }
  ecrire(trousseau)
}

/** Identifiants des fournisseurs pour lesquels une clé est enregistrée. */
export function fournisseursAvecCle(): string[] {
  return Object.keys(lire())
}

/** Efface toutes les clés. Proposé dans les préférences. */
export function effacerToutesLesCles(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Sans conséquence.
  }
}
