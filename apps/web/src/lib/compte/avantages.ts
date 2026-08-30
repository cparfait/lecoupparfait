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

export interface AvantageCompte {
  /**
   * Le titre de la boîte, **en entier**.
   *
   * Il était composé — « {rubrique} demande un compte » — et le gabarit se
   * cassait au pluriel : « Les statistiques demande un compte ». Une phrase
   * française ne se fabrique pas par concaténation ; on l'écrit.
   */
  titre: string
  /** Pourquoi *celle-ci* demande un compte. Une phrase, jamais deux. */
  raison: string
  /** Ce qu'on y gagne concrètement, en trois points au plus. */
  gains: string[]
}

/**
 * Indexé par chemin, sans requête ni ancre : `/puzzles?defi=1` se ramène à
 * `/puzzles`, qui lui est libre — la clé porte donc le href complet quand la
 * distinction compte.
 */
export const AVANTAGES: Record<string, AvantageCompte> = {
  '/carriere': {
    titre: 'La carrière demande un compte',
    raison:
      'Douze chapitres et une progression qui se garde : elle n’aurait aucun sens si elle disparaissait en fermant l’onglet.',
    gains: [
      'Tes étoiles, ton rang et tes hauts faits conservés',
      'La reprise là où tu t’es arrêté, sur n’importe quel appareil',
      'Un adversaire calibré sur ton niveau réel, chapitre après chapitre',
    ],
  },
  '/tournois': {
    titre: 'Les tournois demandent un compte',
    raison:
      'Une arène apparie des joueurs sur plusieurs rondes : il faut pouvoir te retrouver entre deux parties.',
    gains: [
      'Créer une arène et y inscrire d’autres joueurs',
      'Un classement qui suit d’une ronde à l’autre',
      'Les tournois solo contre l’ordinateur, avec leur tableau',
    ],
  },
  '/amis': {
    titre: 'Le carnet d’amis demande un compte',
    raison: 'Les amis se retrouvent par leur pseudo : il faut donc en avoir un.',
    gains: [
      'Défier quelqu’un d’un clic, sans repasser par un lien',
      'Voir qui est en ligne et qui attend ton coup',
      'Un lien d’invitation à ton nom',
    ],
  },
  '/correspondance': {
    titre: 'La correspondance demande un compte',
    raison:
      'Une partie qui dure des jours doit te reconnaître à chaque retour, sinon elle est perdue au premier onglet fermé.',
    gains: [
      'Plusieurs parties en cours, à ton rythme',
      'Un compteur qui te dit où c’est à toi de jouer',
      'Rien à laisser ouvert entre deux coups',
    ],
  },
  '/statistiques': {
    titre: 'Les statistiques demandent un compte',
    raison:
      'Elles se calculent sur tes parties enregistrées : sans compte, aucune partie n’est à personne.',
    gains: [
      'Ta précision et ton Elo estimé, partie après partie',
      'Tes ouvertures les plus jouées et leurs résultats',
      'La phase de jeu qui te coûte le plus de points',
    ],
  },
  '/etudes': {
    titre: 'Les études demandent un compte',
    raison:
      'Une étude t’appartient et se retrouve d’une session à l’autre : il faut savoir à qui elle est.',
    gains: [
      'Des positions annotées, conservées et reprises',
      'Tes variantes gardées avec leurs commentaires',
    ],
  },
  '/puzzles?defi=1': {
    titre: 'Le défi du jour demande un compte',
    raison:
      'La même position pour tout le monde, une fois par jour : c’est une série, et une série se compte dans le temps.',
    gains: [
      'Ta série de jours consécutifs, et ton record',
      'Les objectifs du jour et les points qui vont avec',
      'Les puzzles ordinaires, eux, restent libres et illimités',
    ],
  },
}

/** Les entrées de navigation qui réclament un compte. */
export function avantagePour(href: string): AvantageCompte | null {
  return AVANTAGES[href] ?? AVANTAGES[href.split(/[?#]/)[0] ?? href] ?? null
}
