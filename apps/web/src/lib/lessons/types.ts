/**
 * Structure des leçons.
 *
 * Une leçon est une suite d'**étapes**. Chaque étape place une position, dit
 * quelque chose, et attend éventuellement une action du joueur. C'est le format
 * minimal qui permet d'enseigner à la fois une règle (« le fou se déplace en
 * diagonale »), un motif (« voici une fourchette ») et une technique (« pousse
 * le pion en gardant l'opposition »).
 *
 * Le texte de chaque étape est lu à voix haute par la synthèse vocale. Il est
 * donc écrit pour être **entendu** : phrases courtes, pas de parenthèses, pas
 * de symboles imprononçables. La notation est convertie automatiquement.
 */

import type { Square } from 'chess.js'

export type LessonLevel = 'beginner' | 'intermediate' | 'advanced'

export interface LessonStep {
  /**
   * Nature de l'étape :
   *  - `show`   on montre et on explique, le joueur observe ;
   *  - `play`   le joueur doit jouer un coup précis ;
   *  - `choose` le joueur doit jouer l'un des coups acceptés ;
   *  - `free`   le joueur joue librement, l'ordinateur répond ; l'étape est
   *             validée quand l'objectif est atteint (mat, gain de matériel…).
   */
  kind: 'show' | 'play' | 'choose' | 'free'

  /** Position au début de l'étape. Reprend celle de l'étape précédente si absent. */
  fen?: string

  /** Ce que dit le coach. Affiché et prononcé. */
  say: string

  /** Consigne courte affichée sous l'échiquier pendant l'action. */
  instruction?: string

  /** Coups acceptés, en notation algébrique. Le premier est le coup montré. */
  answers?: string[]

  /** Réponse automatique de l'adversaire après un coup juste. */
  reply?: string

  /** Cases mises en évidence. */
  highlight?: Square[]

  /** Flèches tracées sur l'échiquier. */
  arrows?: Array<{ from: Square; to: Square; color?: 'green' | 'red' | 'blue' | 'orange' }>

  /** Cercles tracés. */
  circles?: Array<{ square: Square; color?: 'green' | 'red' | 'blue' | 'orange' }>

  /**
   * Ne laisse visibles que ces cases, le reste est estompé.
   * Très utile pour les toutes premières leçons : on isole ce qui compte.
   */
  spotlight?: Square[]

  /** Message affiché si le joueur se trompe. */
  hint?: string

  /** Orientation de l'échiquier pendant l'étape. */
  orientation?: 'w' | 'b'

  /** Objectif pour les étapes libres. */
  goal?: 'checkmate' | 'winMaterial' | 'promote' | 'draw'

  /** Niveau du moteur pour les étapes libres (1 à 25). */
  botLevel?: number
}

export interface Lesson {
  id: string
  title: string
  /** Une phrase qui donne envie et annonce ce qu'on va savoir faire. */
  summary: string
  level: LessonLevel
  /** Durée estimée, en minutes. */
  minutes: number
  /** Emoji identifiant la leçon dans la liste. */
  icon: string
  steps: LessonStep[]
}

export interface Chapter {
  id: string
  title: string
  description: string
  level: LessonLevel
  icon: string
  lessons: Lesson[]
}

/** Position de départ standard, raccourci pour alléger les définitions. */
export const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

/** Échiquier vide, avec les deux rois placés hors du champ d'action. */
export const EMPTY_BOARD = '7k/8/8/8/8/8/8/K7 w - - 0 1'
