/**
 * @coupparfait/core — le cœur métier du Coup Parfait.
 *
 * Un seul point d'entrée pour tout ce qui concerne les échecs eux-mêmes :
 * règles, notation, évaluation, classification, explication, classement,
 * ouvertures, pendules et adversaires artificiels.
 *
 * Ce paquet ne dépend d'aucun framework et ne fait aucune entrée/sortie : il
 * est utilisable tel quel dans le navigateur, dans Node, dans un worker ou
 * dans un test.
 */

// Types du domaine
export * from './types.ts'

// Lecture et raisonnement sur l'échiquier
export * from './board.ts'

// Motifs tactiques et stratégiques
export * from './motifs.ts'

// Évaluation, précision, chances de victoire
export * from './eval.ts'

// Classification des coups joués
export * from './classify.ts'

// Explications en langue naturelle
export * from './explain.ts'

// Classements Elo et Glicko-2
export * from './rating.ts'

// Protocole moteur
export * from './uci.ts'

// Adversaires artificiels
export * from './bots.ts'

// Mode carrière : chapitres, expérience, rangs, hauts faits
export * from './carriere.ts'

// Tournoi contre l'ordinateur : plateau, calendrier, classement
export * from './tournoi-solo.ts'

// Pendules et cadences
export * from './clock.ts'

// Ouvertures ECO
export * from './openings.ts'

// Import / export PGN
export * from './pgn.ts'

// Analyse complète de partie
export * from './report.ts'

// Position de départ standard.
export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

/** Version du paquet, affichée dans les pages « À propos » et les rapports. */
export const CORE_VERSION = '0.1.0'
