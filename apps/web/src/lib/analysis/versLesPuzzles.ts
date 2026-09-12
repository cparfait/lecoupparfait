/**
 * Du motif raté au thème de puzzles.
 *
 * Le rapport d'analyse sait déjà nommer ce qui a coûté la partie : il calcule
 * les motifs présents dans chaque gaffe et en rend les trois plus fréquents
 * (`suggestedThemes` dans `summariseForCoach`). Ce champ existait et n'était
 * **lu par personne** — l'analyse disait « attention aux clouages » et l'écran
 * d'entraînement, à côté, proposait six millions de positions sans rapport.
 *
 * Ce fichier fait le pont, et il a une raison d'exister : les deux vocabulaires
 * ne coïncident pas. Les motifs du cœur sont nommés pour **expliquer un coup**,
 * les étiquettes de Lichess pour **classer une position**. La plupart portent le
 * même nom, quelques-unes non, et trois n'ont aucun équivalent — il n'existe pas
 * de catalogue de positions « tempo ».
 *
 * Mieux vaut ne rien proposer que d'envoyer sur une étiquette qui ne rend aucun
 * puzzle : la fonction rend donc une liste éventuellement vide, et l'appelant
 * n'affiche alors pas la carte.
 */

import type { MotifId } from '@coupparfait/core'

/**
 * Correspondance motif → étiquette de puzzle.
 *
 * Seuls les motifs réellement présents dans le catalogue de Lichess figurent
 * ici. Les absents — `tempo`, `development`, `centreControl`, `openFile` — sont
 * des notions de position, pas d'exercice : on ne résout pas un puzzle de
 * « contrôle du centre ».
 */
const VERS_PUZZLE: Partial<Record<MotifId, string>> = {
  // Les noms identiques, de loin les plus nombreux.
  hangingPiece: 'hangingPiece',
  fork: 'fork',
  pin: 'pin',
  skewer: 'skewer',
  discoveredAttack: 'discoveredAttack',
  doubleCheck: 'doubleCheck',
  deflection: 'deflection',
  interference: 'interference',
  trappedPiece: 'trappedPiece',
  backRankMate: 'backRankMate',
  smotheredMate: 'smotheredMate',
  mateIn1: 'mateIn1',
  mateIn2: 'mateIn2',
  mateIn3: 'mateIn3',
  promotion: 'promotion',
  underPromotion: 'underPromotion',
  enPassant: 'enPassant',
  sacrifice: 'sacrifice',
  xRayAttack: 'xRayAttack',
  zugzwang: 'zugzwang',
  clearance: 'clearance',
  exposedKing: 'exposedKing',

  // Les noms qui diffèrent. C'est pour ces quatre-là que cette table existe :
  // passer l'identifiant du cœur tel quel rendrait zéro puzzle, en silence.
  removingTheDefender: 'capturingDefender',
  decoy: 'attraction',
  zwischenzug: 'intermezzo',
  passedPawn: 'advancedPawn',
}

/**
 * Les thèmes de puzzles correspondant aux motifs suggérés par l'analyse.
 *
 * Dédoublonné et borné : deux motifs peuvent mener au même thème, et proposer
 * six exercices après une partie, c'est n'en faire aucun.
 */
export function themesDePuzzles(motifs: string[], maximum = 3): string[] {
  const sortie: string[] = []
  for (const motif of motifs) {
    const theme = VERS_PUZZLE[motif as MotifId]
    if (!theme || sortie.includes(theme)) continue
    sortie.push(theme)
    if (sortie.length >= maximum) break
  }
  return sortie
}
