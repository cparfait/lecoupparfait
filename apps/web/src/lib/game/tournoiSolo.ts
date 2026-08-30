'use client'

/**
 * Le tournoi contre l'ordinateur, côté navigateur.
 *
 * Il vit dans le stockage local et non en base, pour la même raison que la
 * partie contre l'ordinateur : **il se joue sans compte**. Une seule chose
 * l'exige, la carrière, et c'est un choix assumé ; multiplier les rubriques
 * réservées reviendrait à faire de l'inscription un péage.
 *
 * Un tournoi à la fois. Un carrousel de tournois abandonnés n'aurait aucun
 * intérêt : on garde le dernier, celui qu'on a une chance de vouloir finir.
 */

import type { TournoiSolo } from '@coupparfait/core'

const CLE = 'coupparfait.tournoiSolo'

export function lireTournoi(): TournoiSolo | null {
  try {
    const brut = localStorage.getItem(CLE)
    if (!brut) return null
    const tournoi = JSON.parse(brut) as TournoiSolo
    // Une sauvegarde d'une version antérieure du format ferait planter l'écran
    // plutôt que de simplement ne pas s'ouvrir : on vérifie la forme.
    if (!Array.isArray(tournoi?.concurrents) || !Array.isArray(tournoi?.duels)) return null
    return tournoi
  } catch {
    return null
  }
}

export function ecrireTournoi(tournoi: TournoiSolo): void {
  try {
    localStorage.setItem(CLE, JSON.stringify(tournoi))
  } catch {
    // Stockage refusé : le tournoi se joue quand même, il ne se reprendra pas.
  }
}

export function oublierTournoi(): void {
  try {
    localStorage.removeItem(CLE)
  } catch {
    // Sans conséquence.
  }
}

/**
 * Le résultat de la partie qu'on vient de jouer, déposé par l'écran de jeu.
 *
 * Même relais que pour la carrière : la partie se déroule sur `/jouer/ordinateur`
 * et le tournoi est ailleurs. Passer par le stockage de session plutôt que par
 * l'adresse évite qu'on puisse s'attribuer une victoire en retapant une URL.
 */
const CLE_RESULTAT = 'coupparfait.tournoiResultat'

export function deposerResultat(resultat: string): void {
  try {
    sessionStorage.setItem(CLE_RESULTAT, resultat)
  } catch {
    // Sans conséquence : la ronde restera à jouer.
  }
}

export function reprendreResultat(): string | null {
  try {
    const valeur = sessionStorage.getItem(CLE_RESULTAT)
    if (valeur) sessionStorage.removeItem(CLE_RESULTAT)
    return valeur
  } catch {
    return null
  }
}
