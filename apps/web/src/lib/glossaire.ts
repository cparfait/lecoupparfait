/**
 * Vocabulaire général des échecs.
 *
 * Les 44 motifs tactiques ont déjà leurs définitions dans le cœur, puisqu'elles
 * servent aux explications. Manquait tout le reste : les mots qu'on entend dès
 * la première partie sans que personne ne les explique — roque, pat, prise en
 * passant, Elo, cadence.
 *
 * Un débutant qui lit « les Blancs sont mieux mais le fou est de mauvaise
 * couleur » a besoin des deux moitiés du vocabulaire, pas d'une seule.
 */

import type { TranslationKey } from '@/lib/i18n/index.tsx'

export interface Term {
  /**
   * Identifiant stable, qui nomme la clé de dictionnaire.
   *
   * Dérivé du texte et non du rang : sans lui, insérer une entrée au milieu de
   * la liste renommerait en silence toutes les suivantes, et chaque traduction
   * se retrouverait sur la mauvaise phrase.
   */
  id: string
  name: TranslationKey
  definition: TranslationKey
  /** Regroupement pour la navigation. */
  family: 'Règles' | 'Pièces et matériel' | 'Phases de la partie' | 'Évaluation et jeu'
}

export const TERMS: Term[] = [
  // ── Règles ────────────────────────────────────────────────────────────────
  {
    id: 'cadence',
    name: 'glossaire.cadence.name',
    family: 'Règles',
    definition: 'glossaire.cadence.definition',
  },
  {
    id: 'increment',
    name: 'glossaire.increment.name',
    family: 'Règles',
    definition: 'glossaire.increment.definition',
  },
  {
    id: 'roque',
    name: 'glossaire.roque.name',
    family: 'Règles',
    definition: 'glossaire.roque.definition',
  },
  {
    id: 'prise-en-passant',
    name: 'glossaire.prise-en-passant.name',
    family: 'Règles',
    definition: 'glossaire.prise-en-passant.definition',
  },
  {
    id: 'promotion',
    name: 'glossaire.promotion.name',
    family: 'Règles',
    definition: 'glossaire.promotion.definition',
  },
  {
    id: 'echec-et-mat',
    name: 'glossaire.echec-et-mat.name',
    family: 'Règles',
    definition: 'glossaire.echec-et-mat.definition',
  },
  {
    id: 'pat',
    name: 'glossaire.pat.name',
    family: 'Règles',
    definition: 'glossaire.pat.definition',
  },
  {
    id: 'nulle-par-repetition',
    name: 'glossaire.nulle-par-repetition.name',
    family: 'Règles',
    definition: 'glossaire.nulle-par-repetition.definition',
  },
  {
    id: 'regle-des-cinquante',
    name: 'glossaire.regle-des-cinquante.name',
    family: 'Règles',
    definition: 'glossaire.regle-des-cinquante.definition',
  },

  // ── Pièces et matériel ────────────────────────────────────────────────────
  {
    id: 'valeur-des-pieces',
    name: 'glossaire.valeur-des-pieces.name',
    family: 'Pièces et matériel',
    definition: 'glossaire.valeur-des-pieces.definition',
  },
  {
    id: 'paire-de-fous',
    name: 'glossaire.paire-de-fous.name',
    family: 'Pièces et matériel',
    definition: 'glossaire.paire-de-fous.definition',
  },
  {
    id: 'mauvais-fou',
    name: 'glossaire.mauvais-fou.name',
    family: 'Pièces et matériel',
    definition: 'glossaire.mauvais-fou.definition',
  },
  {
    id: 'qualite',
    name: 'glossaire.qualite.name',
    family: 'Pièces et matériel',
    definition: 'glossaire.qualite.definition',
  },
  {
    id: 'pion-passe',
    name: 'glossaire.pion-passe.name',
    family: 'Pièces et matériel',
    definition: 'glossaire.pion-passe.definition',
  },
  {
    id: 'pions-doubles',
    name: 'glossaire.pions-doubles.name',
    family: 'Pièces et matériel',
    definition: 'glossaire.pions-doubles.definition',
  },
  {
    id: 'pion-isole',
    name: 'glossaire.pion-isole.name',
    family: 'Pièces et matériel',
    definition: 'glossaire.pion-isole.definition',
  },

  // ── Phases de la partie ───────────────────────────────────────────────────
  {
    id: 'ouverture',
    name: 'glossaire.ouverture.name',
    family: 'Phases de la partie',
    definition: 'glossaire.ouverture.definition',
  },
  {
    id: 'developpement',
    name: 'glossaire.developpement.name',
    family: 'Phases de la partie',
    definition: 'glossaire.developpement.definition',
  },
  {
    id: 'milieu-de-partie',
    name: 'glossaire.milieu-de-partie.name',
    family: 'Phases de la partie',
    definition: 'glossaire.milieu-de-partie.definition',
  },
  {
    id: 'finale',
    name: 'glossaire.finale.name',
    family: 'Phases de la partie',
    definition: 'glossaire.finale.definition',
  },
  {
    id: 'transposition',
    name: 'glossaire.transposition.name',
    family: 'Phases de la partie',
    definition: 'glossaire.transposition.definition',
  },

  // ── Évaluation et jeu ─────────────────────────────────────────────────────
  {
    id: 'evaluation',
    name: 'glossaire.evaluation.name',
    family: 'Évaluation et jeu',
    definition: 'glossaire.evaluation.definition',
  },
  {
    id: 'centipion',
    name: 'glossaire.centipion.name',
    family: 'Évaluation et jeu',
    definition: 'glossaire.centipion.definition',
  },
  {
    id: 'precision',
    name: 'glossaire.precision.name',
    family: 'Évaluation et jeu',
    definition: 'glossaire.precision.definition',
  },
  {
    id: 'elo',
    name: 'glossaire.elo.name',
    family: 'Évaluation et jeu',
    definition: 'glossaire.elo.definition',
  },
  {
    id: 'glicko-2',
    name: 'glossaire.glicko-2.name',
    family: 'Évaluation et jeu',
    definition: 'glossaire.glicko-2.definition',
  },
  {
    id: 'zugzwang',
    name: 'glossaire.zugzwang.name',
    family: 'Évaluation et jeu',
    definition: 'glossaire.zugzwang.definition',
  },
  {
    id: 'initiative',
    name: 'glossaire.initiative.name',
    family: 'Évaluation et jeu',
    definition: 'glossaire.initiative.definition',
  },
  {
    id: 'tempo',
    name: 'glossaire.tempo.name',
    family: 'Évaluation et jeu',
    definition: 'glossaire.tempo.definition',
  },
]

/** Familles dans l'ordre où l'on veut les lire. */
export const FAMILIES = [
  'Règles',
  'Pièces et matériel',
  'Phases de la partie',
  'Évaluation et jeu',
] as const

// ─────────────────────────────────────────────────────────────────────────────
//  Le lexique de ceux qui cherchent
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Les mots qu'on tape, et les termes qu'ils désignent.
 *
 * Le glossaire définit le vocabulaire **juste** : « échec et mat », « pat »,
 * « clouage », « fou de mauvaise couleur ». Ce n'est pas celui qu'on tape dans
 * une barre de recherche. On tape « mat en 1 », « nulle », « épingle », « je
 * donne toujours mes pièces » — et la recherche ne rendait rien, ce qui laissait
 * croire que l'application ne connaissait pas le sujet.
 *
 * La table va donc du mot familier vers les termes à remonter. Trois natures
 * mélangées, volontairement :
 *
 *  - les **synonymes régionaux ou d'usage** — « épingle » pour clouage,
 *    « échange » pour qualité ;
 *  - les **formulations de débutant** — « je perds mes pièces », « bloqué » ;
 *  - les **mots anglais**, parce que tout le monde a appris sur une interface
 *    anglophone avant d'arriver ici.
 *
 * Une seule règle pour l'entretenir : on n'ajoute un mot que parce que quelqu'un
 * l'a réellement tapé. Une liste de synonymes inventés à la table n'aide
 * personne et finit par ramener n'importe quoi.
 */
export const SYNONYMES: Record<string, string[]> = {
  // Les pièces et les coups, en langage courant.
  epingle: ['Clouage'],
  epingler: ['Clouage'],
  brochette: ['Enfilade'],
  embrochement: ['Enfilade'],
  echange: ['Qualité', 'Valeur des pièces'],
  qualite: ['Qualité'],
  'double attaque': ['Fourchette'],
  'attaque double': ['Fourchette'],
  'petit roque': ['Roque'],
  'grand roque': ['Roque'],
  'prise en l air': ['Prise en passant'],
  'pion qui devient dame': ['Promotion'],
  'dame a la place du pion': ['Promotion'],

  // Les fins de partie, qu'on nomme de travers dans les deux sens.
  nulle: ['Pat', 'Nulle par répétition', 'Règle des cinquante coups'],
  'match nul': ['Pat', 'Nulle par répétition'],
  egalite: ['Pat', 'Nulle par répétition'],
  'mat en 1': ['Échec et mat'],
  'mat en un': ['Échec et mat'],
  'echec perpetuel': ['Nulle par répétition'],

  // Ce que les gens décrivent au lieu de le nommer.
  'je perds mes pieces': ['Valeur des pièces'],
  'je donne mes pieces': ['Valeur des pièces'],
  gaffe: ['Valeur des pièces'],
  bloque: ['Elo', 'Glicko-2'],
  'je stagne': ['Elo', 'Glicko-2'],
  classement: ['Elo', 'Glicko-2'],
  niveau: ['Elo', 'Glicko-2'],

  // L'anglais, parce qu'on a presque tous appris dessus.
  checkmate: ['Échec et mat'],
  stalemate: ['Pat'],
  draw: ['Pat', 'Nulle par répétition'],
  castling: ['Roque'],
  castle: ['Roque'],
  pin: ['Clouage'],
  skewer: ['Enfilade'],
  fork: ['Fourchette'],
  'en passant': ['Prise en passant'],
  promotion: ['Promotion'],
  blunder: ['Valeur des pièces'],
  rating: ['Elo', 'Glicko-2'],
  'time control': ['Cadence'],
  increment: ['Incrément'],
  'bad bishop': ['Mauvais fou'],
  'bishop pair': ['Paire de fous'],
  'passed pawn': ['Pion passé'],
  'open file': ['Colonne ouverte'],
  tempo: ['Tempo'],
  initiative: ['Initiative'],
}

/**
 * Les termes que cette recherche désigne, en plus de ce qu'elle trouve seule.
 *
 * Comparaison sur une forme normalisée — sans accents, sans casse, sans
 * ponctuation — et par inclusion dans les deux sens : « epingl » doit trouver
 * « épingle », et « je stagne à 1000 » doit trouver « je stagne ». La recherche
 * du glossaire normalise déjà de son côté ; la table est écrite directement sous
 * la forme normalisée pour que les deux soient comparables sans détour.
 */
export function termesSynonymes(recherche: string): string[] {
  const aiguille = normaliserPourLexique(recherche)
  if (aiguille.length < 3) return []

  const trouves = new Set<string>()
  for (const [mot, termes] of Object.entries(SYNONYMES)) {
    const cle = normaliserPourLexique(mot)
    if (aiguille.includes(cle) || cle.includes(aiguille)) {
      for (const terme of termes) trouves.add(terme)
    }
  }
  return [...trouves]
}

function normaliserPourLexique(valeur: string): string {
  return valeur
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
