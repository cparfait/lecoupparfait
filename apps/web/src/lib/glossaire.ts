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

export interface Term {
  name: string
  definition: string
  /** Regroupement pour la navigation. */
  family: 'Règles' | 'Pièces et matériel' | 'Phases de la partie' | 'Évaluation et jeu'
}

export const TERMS: Term[] = [
  // ── Règles ────────────────────────────────────────────────────────────────
  {
    name: 'Cadence',
    family: 'Règles',
    definition:
      "Le temps dont chaque joueur dispose. Elle s'écrit avec deux nombres : **« 3 | 2 » veut dire 3 minutes au départ, plus 2 secondes ajoutées à ta pendule à chaque coup joué**. Un seul nombre — « 5 min » — signifie qu'il n'y a rien à récupérer : quand la pendule tombe, la partie est perdue, même avec une dame de plus. La cadence détermine aussi la catégorie de la partie : bullet, blitz, rapide ou classique, chacune tenant son propre classement.",
  },
  {
    name: 'Incrément',
    family: 'Règles',
    definition:
      "Les secondes rendues à chaque coup, le second nombre d'une cadence. Elles servent à une chose précise : éviter de perdre au temps dans une position gagnante, faute des quelques secondes qu'il faut pour jouer les coups évidents de la fin. Avec 2 secondes d'incrément, une partie de trente coups te rend une minute en route.",
  },
  {
    name: 'Roque',
    family: 'Règles',
    definition:
      "Le seul coup qui déplace deux pièces à la fois : le roi fait deux pas vers une tour, qui saute par-dessus lui. Il faut que ni l'un ni l'autre n'ait bougé, que les cases entre eux soient libres, et que le roi ne soit ni en échec, ni ne traverse une case attaquée. Petit roque du côté du roi, grand roque du côté de la dame.",
  },
  {
    name: 'Prise en passant',
    family: 'Règles',
    definition:
      "Quand un pion avance de deux cases et arrive à côté d'un pion adverse, celui-ci peut le prendre comme s'il n'avait avancé que d'une. La prise doit se faire **immédiatement**, au coup suivant, sinon le droit est perdu. C'est la règle la plus souvent ignorée des débutants.",
  },
  {
    name: 'Promotion',
    family: 'Règles',
    definition:
      "Un pion qui atteint la dernière rangée se transforme, obligatoirement, en dame, tour, fou ou cavalier — au choix, et sans rapport avec les pièces déjà capturées. On prend presque toujours la dame ; le cavalier est le seul autre choix parfois utile, car lui seul fait des coups qu'une dame ne peut pas faire.",
  },
  {
    name: 'Échec et mat',
    family: 'Règles',
    definition:
      "Le roi est attaqué et aucun coup légal ne peut y remédier : ni fuir, ni capturer l'attaquant, ni s'interposer. La partie s'arrête immédiatement. C'est le seul but du jeu — tout le reste n'est qu'un moyen.",
  },
  {
    name: 'Pat',
    family: 'Règles',
    definition:
      "Le camp au trait n'a **aucun coup légal**, mais son roi n'est pas en échec. La partie est nulle, quelle que soit la différence de matériel. C'est la déception classique du débutant qui a une dame de plus : le pat est la planche de salut de celui qui perd.",
  },
  {
    name: 'Nulle par répétition',
    family: 'Règles',
    definition:
      "La même position, avec le même joueur au trait et les mêmes droits de roque, apparaît trois fois : la partie est nulle. Souvent obtenue par échec perpétuel, quand un camp donne échec sans fin parce qu'il perdrait autrement.",
  },
  {
    name: 'Règle des cinquante coups',
    family: 'Règles',
    definition:
      'Cinquante coups de chaque camp sans prise ni mouvement de pion : la partie est nulle. Elle évite de faire durer indéfiniment une finale que personne ne sait gagner.',
  },

  // ── Pièces et matériel ────────────────────────────────────────────────────
  {
    name: 'Valeur des pièces',
    family: 'Pièces et matériel',
    definition:
      "Le repère universel : pion 1, cavalier et fou 3, tour 5, dame 9. Le roi n'a pas de valeur — on ne peut pas l'échanger. Ces nombres sont une approximation utile, pas une vérité : un cavalier bien placé vaut souvent plus qu'une tour enfermée.",
  },
  {
    name: 'Paire de fous',
    family: 'Pièces et matériel',
    definition:
      "Posséder les deux fous quand l'adversaire n'en a qu'un. Chaque fou ne voit qu'une couleur de cases ; à deux, ils couvrent tout l'échiquier. On estime l'avantage à environ un demi-pion, davantage en position ouverte.",
  },
  {
    name: 'Mauvais fou',
    family: 'Pièces et matériel',
    definition:
      "Un fou dont les propres pions occupent la couleur de cases. Il ne peut ni les défendre ni passer devant : c'est une pièce payée trois points qui n'en vaut plus qu'un. En finale, un fou de mauvaise couleur annule des positions pourtant gagnées d'un pion.",
  },
  {
    name: 'Qualité',
    family: 'Pièces et matériel',
    definition:
      "L'écart entre une tour et une pièce légère, soit environ deux pions. « Gagner la qualité », c'est prendre une tour contre un fou ou un cavalier. « Sacrifier la qualité » se fait volontairement, en échange d'une position supérieure.",
  },
  {
    name: 'Pion passé',
    family: 'Pièces et matériel',
    definition:
      "Un pion qu'aucun pion adverse ne peut plus arrêter : ni sur sa colonne, ni sur les deux voisines. Il menace d'aller à dame, ce qui oblige l'adversaire à le surveiller. En finale, c'est souvent l'unique facteur qui décide.",
  },
  {
    name: 'Pions doublés',
    family: 'Pièces et matériel',
    definition:
      "Deux pions du même camp sur la même colonne, conséquence d'une prise. Ils ne peuvent pas se défendre l'un l'autre et avancent mal. Le défaut est réel mais rarement décisif — la colonne ouverte qu'ils accompagnent compense souvent.",
  },
  {
    name: 'Pion isolé',
    family: 'Pièces et matériel',
    definition:
      "Un pion sans voisin sur les colonnes adjacentes : aucun pion ne pourra jamais le défendre. Faiblesse en finale, mais l'espace et les cases qu'il donne au milieu de partie en font une arme pour qui sait attaquer.",
  },

  // ── Phases de la partie ───────────────────────────────────────────────────
  {
    name: 'Ouverture',
    family: 'Phases de la partie',
    definition:
      "Les dix à quinze premiers coups, où l'on applique trois principes plutôt que de calculer : occuper le centre, sortir ses pièces, mettre son roi à l'abri. Les ouvertures portent des noms parce qu'elles ont été étudiées pendant des siècles.",
  },
  {
    name: 'Développement',
    family: 'Phases de la partie',
    definition:
      "Sortir ses pièces de leur case de départ vers des cases où elles agissent. Une pièce restée au fond ne compte pas, même si elle est sur l'échiquier. Perdre du temps en ouverture, c'est jouer à trois pièces contre cinq.",
  },
  {
    name: 'Milieu de partie',
    family: 'Phases de la partie',
    definition:
      "La phase où la théorie s'arrête et où l'on doit trouver des plans par soi-même. C'est là que se produisent presque toutes les tactiques, et là qu'un débutant gagne le plus à travailler ses puzzles.",
  },
  {
    name: 'Finale',
    family: 'Phases de la partie',
    definition:
      "Peu de pièces restent, et le roi cesse d'être une cible pour devenir une pièce forte qu'on avance vers le centre. Les règles du milieu de partie s'inversent : la précision remplace l'initiative.",
  },
  {
    name: 'Transposition',
    family: 'Phases de la partie',
    definition:
      "Arriver à une position connue par un ordre de coups différent de l'habituel. C'est pourquoi une ouverture se reconnaît à la position atteinte, jamais à la suite de coups jouée.",
  },

  // ── Évaluation et jeu ─────────────────────────────────────────────────────
  {
    name: 'Évaluation',
    family: 'Évaluation et jeu',
    definition:
      "La note que donne le moteur, comptée en pions : +1,0 signifie « les Blancs ont l'équivalent d'un pion d'avance ». Positif favorise les Blancs, négatif les Noirs. « M3 » annonce un mat en trois coups. En dessous d'un demi-pion, l'écart ne veut rien dire.",
  },
  {
    name: 'Centipion',
    family: 'Évaluation et jeu',
    definition:
      "Un centième de pion, l'unité interne des moteurs. Une « perte moyenne de 40 centipions » veut dire que chaque coup a coûté en moyenne quatre dixièmes de pion par rapport au meilleur.",
  },
  {
    name: 'Précision',
    family: 'Évaluation et jeu',
    definition:
      "Un pourcentage qui résume une partie : à quel point les coups joués se rapprochent des meilleurs. Elle se calcule sur les chances de victoire, pas sur l'évaluation brute — perdre un pion dans une position gagnée ne compte pas comme perdre un pion dans une position égale.",
  },
  {
    name: 'Elo',
    family: 'Évaluation et jeu',
    definition:
      'Le classement des joueurs. Battre plus fort que soi en rapporte beaucoup, perdre contre plus faible en coûte autant. Un débutant tourne autour de 400 à 800, un joueur de club vers 1600, un grand maître au-delà de 2500.',
  },
  {
    name: 'Glicko-2',
    family: 'Évaluation et jeu',
    definition:
      "Une version plus fine de l'Elo, qui suit aussi l'**incertitude** sur ton niveau. Après une longue absence, le classement bouge plus vite : le système sait qu'il te connaît moins bien. C'est celui utilisé ici.",
  },
  {
    name: 'Cadence',
    family: 'Évaluation et jeu',
    definition:
      "Le temps alloué. « 10+5 » veut dire dix minutes chacun, plus cinq secondes ajoutées après chaque coup. Bullet sous 3 minutes, blitz jusqu'à 10, rapide jusqu'à 60, classique au-delà. On progresse beaucoup plus vite en jouant lentement.",
  },
  {
    name: 'Zugzwang',
    family: 'Évaluation et jeu',
    definition:
      "Une situation où l'on est obligé de jouer alors que tout coup dégrade sa position : on perdrait moins en passant son tour, ce que les règles interdisent. Fréquent en finale, c'est souvent le mécanisme même du gain.",
  },
  {
    name: 'Initiative',
    family: 'Évaluation et jeu',
    definition:
      "Mener le jeu : forcer l'adversaire à répondre à tes menaces au lieu de développer les siennes. Elle ne se compte pas en matériel mais se transforme souvent en matériel.",
  },
  {
    name: 'Tempo',
    family: 'Évaluation et jeu',
    definition:
      "Un coup, vu comme une unité de temps. « Gagner un tempo », c'est faire avancer son jeu tout en obligeant l'adversaire à un coup qui ne l'avance pas — par exemple en attaquant une pièce en développant la sienne.",
  },
]

/** Familles dans l'ordre où l'on veut les lire. */
export const FAMILIES = [
  'Règles',
  'Pièces et matériel',
  'Phases de la partie',
  'Évaluation et jeu',
] as const
