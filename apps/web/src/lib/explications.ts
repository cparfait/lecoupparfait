/**
 * Ce que veulent dire les mots des statistiques.
 *
 * Un tableau de statistiques est une liste de noms propres : « Ouverture
 * hongroise », « Rapide », « Pat ». Ils sont posés là comme si tout le monde
 * les connaissait — or c'est exactement l'inverse : on lit ses statistiques
 * pour apprendre quelque chose de son jeu, et le débutant qui découvre qu'il
 * marque 83 % à l'ouverture hongroise n'a aucun moyen de savoir de quoi il
 * s'agit, ni s'il l'a jouée exprès.
 *
 * Les définitions ne sont pas réécrites ici : le glossaire les tient déjà, et
 * deux textes pour un même mot divergent toujours. On y puise, et l'on
 * n'ajoute que ce qui manquait — les fins de partie et les cadences, que le
 * glossaire ne détaille pas une par une.
 *
 * Les ouvertures, elles, ne peuvent pas être écrites à l'avance : il y en a
 * 3 810. Leur explication se construit au moment du clic, à partir du livre
 * d'ouvertures — voir `BoiteExplication`.
 */

import { TERMS } from './glossaire.ts'

/** Définition du glossaire portant ce nom, ou `null`. */
export function definitionDuGlossaire(nom: string): string | null {
  return TERMS.find((terme) => terme.name === nom)?.definition ?? null
}

export interface TexteExplication {
  titre: string
  /** Le corps, en un ou deux paragraphes. Le gras `**mot**` y est admis. */
  texte: string
  /** Renvoi vers le glossaire, quand le mot y a sa propre entrée. */
  terme?: string
}

/**
 * Les fins de partie.
 *
 * Ce sont les mots de la colonne « Comment tes parties finissent », et deux
 * d'entre eux se lisent de travers tant qu'on ne les explique pas :
 * « Adversaire parti » ressemble à une victoire par forfait alors que la
 * partie peut avoir été gagnée ou perdue, et « Pat » passe pour une variante
 * du mat alors qu'il en est l'inverse exact.
 */
export const FINS: Record<string, TexteExplication> = {
  checkmate: {
    titre: 'Échec et mat',
    texte:
      definitionDuGlossaire('Échec et mat') ??
      'Le roi est attaqué et aucun coup légal n’y remédie.',
    terme: 'Échec et mat',
  },
  stalemate: {
    titre: 'Pat',
    texte:
      (definitionDuGlossaire('Pat') ?? '') +
      ' Dans tes statistiques, c’est la ligne à surveiller : un pat est presque toujours une victoire qu’on a laissée filer en fin de partie, faute d’avoir laissé une case au roi adverse.',
    terme: 'Pat',
  },
  resigned: {
    titre: 'Abandon',
    texte:
      'Un joueur s’est reconnu perdu et a arrêté la partie avant le mat. C’est la fin la plus courante entre joueurs expérimentés : une fois la position sans espoir, jouer les vingt coups qui restent n’apprend plus rien à personne. **Abandonner trop tôt, en revanche, est une habitude coûteuse** — beaucoup de positions « perdues » se sauvent encore contre un adversaire de son propre niveau.',
  },
  timeout: {
    titre: 'Temps écoulé',
    texte:
      'La pendule est tombée. La partie est perdue même avec une dame de plus — sauf si l’adversaire n’a plus de quoi mater, auquel cas elle est nulle. **Beaucoup de défaites au temps dans une même colonne veulent dire une cadence trop courte pour ta façon de jouer**, pas un manque de rapidité : on ne gagne pas de temps en jouant plus vite, on en gagne en hésitant moins.',
    terme: 'Cadence',
  },
  draw: {
    titre: 'Nulle',
    texte:
      'Personne ne gagne : accord entre les joueurs, répétition de la même position trois fois, cinquante coups sans prise ni poussée de pion, ou matériel insuffisant pour mater. Chacun repart avec un demi-point.',
    terme: 'Nulle par répétition',
  },
  abandoned: {
    titre: 'Adversaire parti',
    texte:
      'Un joueur a quitté la partie sans la terminer, et le temps d’attente s’est écoulé. Le résultat suit la position et le règlement de la partie : **ce n’est donc pas toujours une victoire**, c’est pourquoi cette ligne compte ses parties et ses gains séparément.',
  },
  aborted: {
    titre: 'Annulée',
    texte:
      'La partie s’est arrêtée avant d’avoir vraiment commencé — trop peu de coups joués pour qu’elle compte. Elle ne touche ni au classement ni au score, et n’est là que pour l’inventaire.',
  },
}

/**
 * Les cadences.
 *
 * Elles portent des noms de catégories — bullet, blitz, rapide — dont les
 * bornes ne sont écrites nulle part sur cet écran. Or c'est précisément ce
 * qu'on veut savoir en lisant « tu marques 74 % en rapide » : rapide à partir
 * de combien ?
 */
export const CADENCES: Record<string, TexteExplication> = {
  ultraBullet: {
    titre: 'Ultra-bullet',
    texte:
      'Moins de 30 secondes pour toute la partie. C’est un jeu d’adresse plus qu’un jeu d’échecs : on y joue au motif reconnu et à la main, jamais au calcul.',
    terme: 'Cadence',
  },
  bullet: {
    titre: 'Bullet',
    texte:
      'Moins de 3 minutes par joueur. On n’y calcule plus, on reconnaît : c’est la cadence qui récompense le mieux l’entraînement aux puzzles, et la plus mauvaise pour apprendre une ouverture.',
    terme: 'Cadence',
  },
  blitz: {
    titre: 'Blitz',
    texte:
      'De 3 à 10 minutes par joueur. Assez pour un plan, trop peu pour le vérifier. C’est la cadence la plus jouée en ligne, et celle où l’écart entre ce qu’on sait et ce qu’on joue est le plus grand.',
    terme: 'Cadence',
  },
  rapid: {
    titre: 'Rapide',
    texte:
      'De 10 à 60 minutes par joueur. La première cadence où l’on a le temps de calculer une variante jusqu’au bout. **C’est celle où l’on progresse le plus vite** : une partie y contient plus de décisions réfléchies que dix parties de bullet.',
    terme: 'Cadence',
  },
  classical: {
    titre: 'Classique',
    texte:
      'Plus d’une heure par joueur. La cadence des tournois sur échiquier : on y joue peu de parties, mais chacune s’analyse ensuite ligne par ligne.',
    terme: 'Cadence',
  },
  correspondence: {
    titre: 'Correspondance',
    texte:
      'De un à quatorze jours par coup. On joue sa partie entre deux occupations, et l’on a le droit de bouger les pièces pour chercher — c’est le format qui apprend le mieux les finales.',
    terme: 'Cadence',
  },
}
