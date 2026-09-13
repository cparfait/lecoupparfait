/**
 * Ce qu'un compte apporte, rubrique par rubrique.
 *
 * Le projet tient à sa promesse : jouer, apprendre, résoudre des puzzles et
 * analyser fonctionnent entièrement sans inscription. Quelques rubriques font
 * exception, et elles ont toutes la même raison — **elles ont besoin de savoir
 * à qui appartient quelque chose**. Une progression, une amitié, une partie qui
 * dure trois semaines : rien de tout cela n'existe sans un « toi » qui survit à
 * la fermeture de l'onglet.
 *
 * Jusqu'ici cette raison n'était dite qu'*après* le clic, sur la page d'arrivée.
 * Depuis le menu, une entrée réservée ressemblait à toutes les autres : on
 * cliquait sur « Carrière », on atterrissait sur un mur. Le mur était bien
 * rédigé, mais c'était quand même un mur, et l'on y arrivait par surprise.
 *
 * D'où ce fichier : une phrase par rubrique, dite **au moment du clic**, et qui
 * répond à la seule question qui compte alors — pourquoi celle-ci et pas les
 * autres. Le texte est écrit pour être vrai s'il est lu seul : on ne promet
 * jamais qu'un compte débloque ce qui est déjà libre.
 */

import type { TranslationKey } from '@/lib/i18n/index.tsx'

export interface AvantageCompte {
  /**
   * Le titre de la boîte, **en entier**.
   *
   * Il était composé — « {rubrique} demande un compte » — et le gabarit se
   * cassait au pluriel : « Les statistiques demande un compte ». Une phrase
   * française ne se fabrique pas par concaténation ; on l'écrit.
   */
  titre: TranslationKey
  /** Pourquoi *celle-ci* demande un compte. Une phrase, jamais deux. */
  raison: TranslationKey
  /** Ce qu'on y gagne concrètement, en trois points au plus. */
  gains: TranslationKey[]
}

/**
 * Indexé par chemin, sans requête ni ancre : `/puzzles?defi=1` se ramène à
 * `/puzzles`, qui lui est libre — la clé porte donc le href complet quand la
 * distinction compte.
 *
 * Les textes sont des clés de dictionnaire et non des phrases : c'est une
 * constante de module, qui ne peut pas appeler `t()`. Elles restaient donc en
 * français dans les quarante autres langues, sur un écran dont le seul rôle est
 * d'expliquer — c'est-à-dire le pire endroit pour ne pas être compris. Le
 * dialogue `PorteDuCompte` résout au rendu.
 */
export const AVANTAGES: Record<string, AvantageCompte> = {
  '/carriere': {
    titre: 'catalog.careerGate',
    raison: 'catalog.careerGateWhy',
    gains: ['catalog.careerGain1', 'catalog.careerGain2', 'catalog.careerGain3'],
  },
  '/tournois': {
    titre: 'catalog.tourneyGate',
    raison: 'catalog.tourneyGateWhy',
    gains: ['catalog.tourneyGain1', 'catalog.tourneyGain2', 'catalog.tourneyGain3'],
  },
  '/amis': {
    titre: 'catalog.friendsGate',
    raison: 'catalog.friendsGateWhy',
    gains: ['catalog.friendsGain1', 'catalog.friendsGain2', 'catalog.friendsGain3'],
  },
  '/correspondance': {
    titre: 'catalog.corrGate',
    raison: 'catalog.corrGateWhy',
    gains: ['catalog.corrGain1', 'catalog.corrGain2', 'catalog.corrGain3'],
  },
  '/statistiques': {
    titre: 'catalog.statsGate',
    raison: 'catalog.statsGateWhy',
    gains: ['catalog.statsGain1', 'catalog.statsGain2', 'catalog.statsGain3'],
  },
  '/etudes': {
    titre: 'catalog.studiesGate',
    raison: 'catalog.studiesGateWhy',
    gains: ['catalog.studiesGain1', 'catalog.studiesGain2'],
  },
  '/puzzles?defi=1': {
    titre: 'catalog.dailyGate',
    raison: 'catalog.dailyGateWhy',
    gains: ['catalog.dailyGain1', 'catalog.dailyGain2', 'catalog.dailyGain3'],
  },
}

/** Les entrées de navigation qui réclament un compte. */
export function avantagePour(href: string): AvantageCompte | null {
  return AVANTAGES[href] ?? AVANTAGES[href.split(/[?#]/)[0] ?? href] ?? null
}
