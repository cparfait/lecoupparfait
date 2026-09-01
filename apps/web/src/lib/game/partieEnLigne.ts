'use client'

/**
 * Le chemin du retour vers une partie en direct.
 *
 * Une partie contre un ami vit dans la mémoire du serveur temps réel, et non en
 * base : rien n'en est écrit tant qu'elle n'est pas finie. Il n'y a donc rien à
 * interroger pour savoir « ai-je une partie en cours ? », et quelqu'un qui
 * quittait l'onglet — un lien touché par mégarde, un retour arrière, un
 * téléphone qui met l'onglet en veille — n'avait plus que son historique de
 * navigation pour retrouver l'adresse. Ceux qui étaient passés par un lien reçu
 * dans une conversation devaient rouvrir la conversation.
 *
 * On retient donc l'adresse ici, dans le navigateur, le temps que la partie
 * dure. C'est le bon endroit : la place au serveur est gardée par socket, elle
 * n'appartient pas au compte — deux appareils sont deux sièges, et le retour se
 * fait depuis celui qui est parti.
 *
 * Rien n'est retenu d'une partie finie : `oublier` est appelé sur le résultat,
 * et la péremption ci-dessous couvre les cas où l'onglet s'est fermé avant.
 */

import { useEffect, useState } from 'react'

/** Le siège est perdu au bout d'une minute de déconnexion : voir `gameRoom`. */
const CLE = 'coupparfait.partieEnLigne'

/**
 * Au-delà, on n'en parle plus.
 *
 * Le serveur déclare forfait après une minute d'absence, mais une partie
 * abandonnée par les *deux* joueurs peut survivre bien plus longtemps sans que
 * personne ne la termine. Un quart d'heure est le compromis : assez pour un
 * onglet refermé et rouvert, trop peu pour reproposer demain matin une partie
 * de la veille.
 */
const PEREMPTION_MS = 15 * 60 * 1000

export interface PartieEnLigne {
  slug: string
  /** L'adresse complète, paramètres compris : la cadence y est, et elle compte. */
  href: string
  adversaire: string | null
  /** Instant du dernier signe de vie de cette partie. */
  vueLe: number
}

export function retenirPartieEnLigne(partie: Omit<PartieEnLigne, 'vueLe'>): void {
  try {
    const valeur: PartieEnLigne = { ...partie, vueLe: Date.now() }
    window.localStorage.setItem(CLE, JSON.stringify(valeur))
    window.dispatchEvent(new Event('coupparfait:partie-en-ligne'))
  } catch {
    // Stockage refusé : on perd le raccourci, pas la partie.
  }
}

export function oublierPartieEnLigne(): void {
  try {
    window.localStorage.removeItem(CLE)
    window.dispatchEvent(new Event('coupparfait:partie-en-ligne'))
  } catch {
    // Sans conséquence.
  }
}

/**
 * La partie à reprendre, telle qu'un composant peut la suivre.
 *
 * Trois sources de changement, et il faut les trois : la page de partie qui
 * écrit son souvenir dans le même onglet — d'où l'événement maison, `storage`
 * ne se déclenchant que pour les *autres* onglets —, un autre onglet, et la
 * péremption, qui n'émet rien du tout et se découvre en relisant.
 *
 * Rend `null` au premier rendu, y compris quand une partie est en cours : le
 * stockage local n'existe pas au rendu serveur, et le lire pendant le rendu
 * ferait diverger les deux.
 */
export function usePartieEnLigne(): PartieEnLigne | null {
  const [partie, setPartie] = useState<PartieEnLigne | null>(null)

  useEffect(() => {
    const relire = () => setPartie(partieEnLigneRetenue())
    relire()
    window.addEventListener('coupparfait:partie-en-ligne', relire)
    window.addEventListener('storage', relire)
    const rythme = setInterval(relire, 20_000)
    return () => {
      window.removeEventListener('coupparfait:partie-en-ligne', relire)
      window.removeEventListener('storage', relire)
      clearInterval(rythme)
    }
  }, [])

  return partie
}

/** La partie à reprendre, si elle est encore fraîche. */
export function partieEnLigneRetenue(): PartieEnLigne | null {
  try {
    const brut = window.localStorage.getItem(CLE)
    if (!brut) return null
    const partie = JSON.parse(brut) as PartieEnLigne
    if (!partie?.slug || typeof partie.vueLe !== 'number') return null
    if (Date.now() - partie.vueLe > PEREMPTION_MS) {
      window.localStorage.removeItem(CLE)
      return null
    }
    return partie
  } catch {
    return null
  }
}
