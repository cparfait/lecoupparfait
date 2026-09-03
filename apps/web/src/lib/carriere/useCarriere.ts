'use client'

/**
 * L'avancement de carrière, partagé par toute l'interface.
 *
 * Trois écrans le lisent — la carte, la leçon, les puzzles — et un quatrième
 * l'écrit, la partie contre l'ordinateur. Refaire un `fetch` dans chacun
 * signifierait quatre requêtes par navigation pour une réponse qui ne change
 * pas entre elles, et surtout quatre copies d'un état qui doivent rester
 * d'accord. Même parti pris que `useIdentite` et `quotidien.ts` : un seul
 * appel, plusieurs lecteurs, une mise à jour qui les atteint tous.
 *
 * `undefined` tant qu'on ne sait pas, `null` pour un visiteur sans compte.
 * Cette troisième valeur évite d'afficher « crée un compte » pendant un
 * dixième de seconde à quelqu'un qui en a un.
 */

import { useEffect, useSyncExternalStore } from 'react'
import type { Progression } from '@coupparfait/core'

export interface Gains {
  xp: number
  etoiles: number
  badges: string[]
  chapitreTermine: boolean
}

/** Ce qu'on annonce au serveur. Jamais « passe au chapitre suivant ». */
export type Fait =
  | { type: 'lecon' }
  | { type: 'puzzle' }
  | { type: 'aide' }
  | { type: 'partie'; gagnee: boolean; coups?: number }

let progression: Progression | null | undefined = undefined
let enCours: Promise<void> | null = null
const abonnes = new Set<() => void>()

function prevenir(): void {
  for (const rappel of abonnes) rappel()
}

function souscrire(rappel: () => void): () => void {
  abonnes.add(rappel)
  return () => abonnes.delete(rappel)
}

const instantane = () => progression
/** Le rendu serveur ne connaît pas la session : rien à afficher. */
const instantaneServeur = () => undefined

/** Relit l'avancement. Les appels concurrents partagent la même requête. */
export function rafraichirCarriere(): Promise<void> {
  if (enCours) return enCours

  enCours = fetch('/api/carriere', { cache: 'no-store' })
    .then((reponse) => (reponse.ok ? reponse.json() : { progression: null }))
    .then((data: { progression: Progression | null }) => {
      progression = data.progression
      prevenir()
    })
    .catch(() => {
      // Serveur injoignable : on ne sait pas, et le dire est plus honnête que
      // d'afficher une carrière vierge à quelqu'un qui en a une.
      progression = null
      prevenir()
    })
    .finally(() => {
      enCours = null
    })

  return enCours
}

export function useCarriere(): Progression | null | undefined {
  const valeur = useSyncExternalStore(souscrire, instantane, instantaneServeur)

  useEffect(() => {
    if (progression === undefined) void rafraichirCarriere()
  }, [])

  return valeur
}

/**
 * Annonce un fait au serveur et retourne ce qu'il a accordé.
 *
 * L'appelant n'a rien à calculer : la nouvelle progression et les gains
 * arrivent tels que le serveur les a décidés, et le store est mis à jour au
 * passage. Retourne `null` plutôt que de lever — un puzzle réussi reste réussi
 * même si l'enregistrement échoue, et une erreur réseau n'a pas à interrompre
 * ce qu'on était en train de faire.
 */
export async function signaler(fait: Fait): Promise<Gains | null> {
  try {
    const reponse = await fetch('/api/carriere', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fait),
    })
    const data = (await reponse.json()) as {
      ok?: boolean
      progression?: Progression
      gains?: Gains | null
    }
    if (!data.ok || !data.progression) return null
    progression = data.progression
    prevenir()
    return data.gains ?? null
  } catch {
    return null
  }
}

/** Repart de zéro. */
export async function recommencerCarriere(): Promise<boolean> {
  try {
    const reponse = await fetch('/api/carriere', { method: 'DELETE' })
    const data = (await reponse.json()) as { ok?: boolean; progression?: Progression }
    if (!data.ok) return false
    progression = data.progression ?? null
    prevenir()
    return true
  } catch {
    return false
  }
}

/**
 * Le chapitre en cours d'après l'URL.
 *
 * Les écrans de leçon, de puzzle et de partie sont atteints avec un paramètre
 * `?carriere=3`. Sa présence est ce qui distingue « je révise la fourchette
 * parce que j'en ai envie » de « je passe le chapitre 4 » : sans lui, on
 * validerait une étape à chaque puzzle résolu n'importe où sur le site.
 */
export function chapitreDeLUrl(recherche: string | URLSearchParams | null): number | null {
  if (!recherche) return null
  const params = typeof recherche === 'string' ? new URLSearchParams(recherche) : recherche
  const brut = params.get('carriere')
  if (!brut) return null
  const numero = Number(brut)
  return Number.isInteger(numero) && numero >= 1 && numero <= 12 ? numero : null
}

/**
 * Dépose ce qui vient d'être gagné, pour que la carte le fête.
 *
 * La leçon, les puzzles et la partie se déroulent sur leur propre écran ; c'est
 * la carte qui célèbre. Sans ce relais, on reviendrait sur une carrière qui a
 * avancé sans que rien ne l'ait souligné — exactement le contraire du but.
 *
 * Le stockage de session plutôt qu'un paramètre d'URL : les gains sont un objet,
 * et une URL qui trimballe « +650 points, trois étoiles » se falsifie en la
 * retapant. Ici, rien ne se célèbre qui n'ait d'abord été accordé par le
 * serveur.
 */
export function deposerGains(gains: Gains | null, titre: string): void {
  if (!gains) return
  if (gains.xp === 0 && gains.badges.length === 0 && !gains.chapitreTermine) return
  try {
    sessionStorage.setItem('coupparfait.carriereGains', JSON.stringify({ gains, titre }))
  } catch {
    // Stockage refusé : on perd la fête, jamais la progression.
  }
}

/**
 * L'avancement tel qu'il est à cet instant, hors rendu React.
 *
 * `useCarriere` couvre l'affichage ; ceci sert aux rappels qui doivent décider
 * *après* avoir signalé un fait — typiquement l'écran des puzzles, qui a besoin
 * de savoir si le compte du chapitre est atteint pour renvoyer vers la carte.
 * Sans cet accès, il faudrait refaire une requête pour lire une valeur que le
 * store vient de recevoir.
 */
export function progressionActuelle(): Progression | null | undefined {
  return progression
}
