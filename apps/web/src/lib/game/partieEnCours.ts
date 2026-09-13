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
import type { useT } from '@/lib/i18n/index.tsx'

/** Ce qu'il faut pour reconstituer la partie à l'identique. */
export interface EtatPartieEnCours {
  /** Niveau du bot, 1 à `BOT_LEVELS.length`. */
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

/**
 * Annonce une partie classée au serveur, avant d'y jouer le premier coup.
 *
 * Sans cette annonce, tout se décidait à l'arrivée : le niveau de l'adversaire,
 * la cadence — donc la catégorie de classement — et le camp étaient ceux que le
 * navigateur déclarait *après* avoir vu le résultat. `POST /api/parties/classee`
 * les fige pendant qu'ils ne servent encore à rien, et la fin de partie ne
 * classe que ce qui leur ressemble.
 *
 * **Sans blocage, mais pas silencieux.** La partie commence dans tous les cas —
 * on ne retient personne sur un aller-retour réseau. Mais l'appelant apprend
 * que l'annonce a échoué, et doit le dire : jouer vingt minutes une partie
 * qu'on croit classée pour découvrir à la fin qu'elle ne l'est pas est pire que
 * de l'apprendre au premier coup, où il est encore temps de recommencer.
 */
export async function annoncerPartieClassee(annonce: {
  botLevel: number
  playerColor: Color
  initialTime: number
  increment: number
}): Promise<boolean> {
  try {
    const reponse = await fetch('/api/parties/classee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(annonce),
    })
    const donnees = (await reponse.json()) as { ok?: boolean }
    return donnees.ok === true
  } catch {
    return false
  }
}

/** Oublie la partie enregistrée — partie finie, abandonnée, ou remplacée. */
export function oublierPartieEnCours(): void {
  void fetch('/api/partie-en-cours', { method: 'DELETE' }).catch(() => {})
}

/**
 * « il y a 3 heures », pour situer la partie qu'on propose de reprendre.
 *
 * Les quatre formulations étaient écrites en français, avec le « s » du pluriel
 * ajouté à la main — une règle qui n'est celle d'aucune autre langue. C'est
 * `Intl.RelativeTimeFormat` qui les dit maintenant, dans la langue de
 * l'interface ; seul « à l'instant » reste une phrase à nous, parce qu'il ne
 * correspond à aucune unité de temps.
 */
export function depuis(iso: string, bcp47: string, t: ReturnType<typeof useT>): string {
  const ecart = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(ecart / 60_000)
  if (minutes < 2) return t('rest.justNow')

  const relatif = new Intl.RelativeTimeFormat(bcp47, { numeric: 'auto' })
  if (minutes < 60) return relatif.format(-minutes, 'minute')
  const heures = Math.round(minutes / 60)
  if (heures < 24) return relatif.format(-heures, 'hour')
  return relatif.format(-Math.round(heures / 24), 'day')
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
  /** Partie annoncée classée avant de commencer — voir l'écran de réglages. */
  classee?: boolean
}

/** Ce que le serveur renvoie d'une partie classée. */
export interface VariationClassement {
  avant: number
  apres: number
  variation: number
}

/** Ce que devient une partie qu'on a envoyée : classée, ou non, et pourquoi. */
export interface SortDeLaPartie {
  classement: VariationClassement | null
  /**
   * Le code du refus, quand on avait demandé le classement et qu'il n'a pas eu
   * lieu — `trop-courte`, `non-annoncee`, `position-imposee`… Traduit à
   * l'affichage : voir `computer.unrated*` dans le dictionnaire.
   */
  raison: string | null
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
 * Sans blocage : le résultat est déjà affiché, l'archivage n'a pas à s'inviter
 * dans ce moment-là. Mais il rend ce que le serveur a décidé — la variation de
 * classement, **et la raison quand il n'y en a pas**. Cette raison était
 * renvoyée depuis toujours et jetée ici même : quelqu'un qui avait demandé une
 * partie classée voyait sa partie finir sans un mot, ce qui ressemble à une
 * panne et n'apprend rien.
 */
export async function archiverPartie(partie: PartieTerminee): Promise<SortDeLaPartie> {
  if (partie.moves.length === 0) return { classement: null, raison: null }
  try {
    const reponse = await fetch('/api/parties/terminee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partie),
    })
    const data = (await reponse.json()) as {
      classement?: VariationClassement
      raison?: string
    }
    return { classement: data.classement ?? null, raison: data.raison ?? null }
  } catch {
    // Le réseau a lâché après la partie : on ne sait pas ce qu'elle est
    // devenue, et prétendre le contraire dans un sens ou dans l'autre serait
    // pire que de se taire.
    return { classement: null, raison: null }
  }
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
