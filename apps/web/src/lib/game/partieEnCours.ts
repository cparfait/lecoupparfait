'use client'

/**
 * Reprise d'une partie contre l'ordinateur.
 *
 * Quitter une page ne devrait pas effacer une partie en cours. C'est pourtant
 * ce qui arrivait : la position ne vivait que dans la mémoire du composant, et
 * un rafraîchissement, un clic sur « Analyse » ou un téléphone qui décharge la
 * réduisaient à rien.
 *
 * On enregistre donc l'état après chaque coup, pour les comptes connectés — il
 * faut bien un endroit où le ranger. Sans compte, rien ne change : la partie
 * reste locale, comme avant.
 *
 * L'écriture est **silencieuse et sans blocage**. Elle a lieu pendant qu'on
 * joue : une erreur réseau ne doit ni interrompre la partie, ni afficher quoi
 * que ce soit. Au pire on perd la reprise, ce qui est exactement la situation
 * d'avant.
 */

import type { Color } from 'chess.js'

/** Ce qu'il faut pour reconstituer la partie à l'identique. */
export interface EtatPartieEnCours {
  /** Niveau du bot, 1 à 25. */
  level: number
  /** Camp du joueur. */
  playerColor: Color
  /** Identifiant de cadence, ex. `600+5`. */
  timeControlId: string
  /** Vrai pour Maia, faux pour Stockfish bridé. */
  human: boolean
  /** Temps restant de chaque camp, en millisecondes. `null` en partie sans pendule. */
  clock: { w: number; b: number } | null
}

export interface PartieEnCours extends EtatPartieEnCours {
  /** Coups joués, en notation algébrique anglaise. */
  moves: string[]
  /** Date du dernier enregistrement, au format ISO. */
  enregistreLe: string
}

/** Lit la partie sauvegardée. `null` si aucune, ou si l'on n'est pas connecté. */
export async function chargerPartieEnCours(): Promise<PartieEnCours | null> {
  try {
    const reponse = await fetch('/api/partie-en-cours', { cache: 'no-store' })
    if (!reponse.ok) return null
    const donnees = (await reponse.json()) as { partie?: PartieEnCours | null }
    const partie = donnees.partie
    // Une partie sans coup n'est pas une partie à reprendre : c'est une partie
    // qu'on vient d'ouvrir et qu'on a quittée aussitôt.
    if (!partie || !Array.isArray(partie.moves) || partie.moves.length === 0) return null
    return partie
  } catch {
    return null
  }
}

/** Enregistre l'état courant. Sans effet si l'on n'est pas connecté. */
export function enregistrerPartieEnCours(moves: string[], state: EtatPartieEnCours): void {
  if (moves.length === 0) return
  void fetch('/api/partie-en-cours', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ moves, state }),
  }).catch(() => {
    // Silence volontaire : voir l'en-tête du fichier.
  })
}

/** Oublie la partie enregistrée — partie finie, abandonnée, ou remplacée. */
export function oublierPartieEnCours(): void {
  void fetch('/api/partie-en-cours', { method: 'DELETE' }).catch(() => {})
}

/** « il y a 3 heures », pour situer la partie qu'on propose de reprendre. */
export function depuis(iso: string): string {
  const ecart = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(ecart / 60_000)
  if (minutes < 2) return 'à l’instant'
  if (minutes < 60) return `il y a ${minutes} minutes`
  const heures = Math.round(minutes / 60)
  if (heures < 24) return `il y a ${heures} heure${heures > 1 ? 's' : ''}`
  const jours = Math.round(heures / 24)
  return `il y a ${jours} jour${jours > 1 ? 's' : ''}`
}

// ─────────────────────────────────────────────────────────────────────────────
//  Archivage
// ─────────────────────────────────────────────────────────────────────────────

/** Ce qu'il faut savoir d'une partie terminée pour la conserver. */
export interface PartieTerminee {
  mode: 'computer' | 'local'
  moves: string[]
  pgn?: string
  result: string
  status?: string
  playerColor?: 'w' | 'b'
  opponentName?: string
  botLevel?: number
  initialTime?: number
  increment?: number
  startFen?: string | null
  eco?: string | null
  opening?: string | null
  startedAt?: string
}

/**
 * Range une partie terminée dans l'historique du compte.
 *
 * Pendant du couple ci-dessus : celui-là garde la partie qu'on peut *reprendre*,
 * celui-ci garde celle qu'on a *finie*. Une partie contre l'ordinateur ne
 * passait par aucun des deux une fois jouée : elle disparaissait avec l'onglet,
 * et « Parties récentes » restait vide pour quelqu'un qui avait joué toute la
 * soirée.
 *
 * Silencieux et sans blocage, pour la même raison qu'au-dessus : le résultat
 * est déjà affiché, l'archivage n'a pas à s'inviter dans ce moment-là.
 */
export function archiverPartie(partie: PartieTerminee): void {
  if (partie.moves.length === 0) return
  void fetch('/api/parties/terminee', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partie),
  }).catch(() => {
    // Silence volontaire : voir l'en-tête du fichier.
  })
}

/** Efface une partie de l'historique. Retourne `false` si le serveur refuse. */
export async function effacerPartie(slug: string): Promise<boolean> {
  try {
    const reponse = await fetch(`/api/parties/terminee/${slug}`, { method: 'DELETE' })
    const data = (await reponse.json()) as { ok?: boolean }
    return data.ok === true
  } catch {
    return false
  }
}
