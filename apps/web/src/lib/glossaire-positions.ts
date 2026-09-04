/**
 * Ce que les mots donnent à voir.
 *
 * Le glossaire définissait par des phrases, et rien d'autre : « le roi fait
 * deux pas vers une tour, qui saute par-dessus lui » demande de reconstituer un
 * échiquier de tête, ce qui est précisément l'exercice qu'un débutant ne sait
 * pas encore faire. Or ces mots-là désignent des positions ; une position se
 * montre.
 *
 * Chaque entrée porte donc, quand cela a du sens, une position et parfois un
 * coup à jouer dessus. Le coup compte autant que la position : le roque, la
 * prise en passant et la promotion ne sont pas des configurations mais des
 * *gestes*, et on ne les comprend qu'en les voyant se produire.
 *
 * Toutes ne sont pas illustrées, et ce n'est pas un manque à combler :
 * « Elo », « Précision » ou « Cadence » ne se dessinent pas sur soixante-quatre
 * cases, et une position inventée pour la forme apprendrait de travers.
 *
 * Les positions sont volontairement **nues** — deux rois, ce qu'il faut voir,
 * rien de plus. Une position de partie réelle porterait vingt pièces dont
 * dix-huit sans rapport avec le mot expliqué.
 *
 * Vérifiées une par une : `scripts/check-glossaire.mjs` charge chaque FEN et
 * rejoue chaque coup. Une position illisible ou un coup illégal échoue la
 * commande de test.
 */

export interface PositionIllustree {
  /** Position de départ. */
  fen: string
  /**
   * Les coups à jouer dessus, en notation algébrique.
   *
   * Vide pour ce qui se voit sans bouger — une structure de pions, un pat.
   */
  coups?: string[]
  /** Depuis quel camp on regarde. Les Blancs par défaut. */
  orientation?: 'w' | 'b'
  /** Cases mises en avant, pour ce qui n'est pas un coup. */
  cases?: string[]
  /** Une phrase sous l'échiquier : ce qu'il faut regarder. */
  legende: string
}

/**
 * Indexées par le nom exact du terme, dans `glossaire.ts` ou dans les motifs du
 * cœur. Un nom qui n'existe pas ne casse rien : l'entrée n'est simplement
 * jamais atteinte.
 */
export const POSITIONS_DU_GLOSSAIRE: Record<string, PositionIllustree> = {
  Roque: {
    fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
    coups: ['O-O'],
    legende:
      'Le petit roque des Blancs : le roi va de e1 à g1, et la tour de h1 saute par-dessus lui pour se poser en f1. Un seul coup, deux pièces.',
  },
  'Prise en passant': {
    fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2',
    coups: ['exd6'],
    legende:
      'Le pion noir vient d’avancer de deux cases pour éviter le pion blanc. Celui-ci le prend quand même — en se posant sur la case qu’il a sautée, comme s’il n’avait avancé que d’une.',
  },
  Promotion: {
    fen: '4k3/P7/8/8/8/8/8/4K3 w - - 0 1',
    coups: ['a8=Q'],
    legende:
      'Le pion atteint la dernière rangée et se transforme. Presque toujours en dame — mais le choix est libre, et le cavalier est parfois le seul coup qui gagne.',
  },
  'Échec et mat': {
    fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
    coups: ['Ra8#'],
    legende:
      'Le mat du couloir : le roi noir est enfermé par ses propres pions, la tour arrive sur la huitième rangée, et il n’y a ni fuite, ni parade, ni capture.',
  },
  Pat: {
    fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',
    cases: ['g8', 'g7', 'h7'],
    legende:
      'Les Noirs doivent jouer et n’ont aucun coup légal — leur roi n’est pourtant pas en échec. La partie est nulle : c’est la dame blanche qui s’est privée de sa victoire.',
  },
  'Pion passé': {
    fen: '4k3/pp6/8/3P4/8/8/8/4K3 w - - 0 1',
    cases: ['d5', 'd6', 'd7', 'd8'],
    legende:
      'Plus aucun pion noir ne peut l’arrêter : ni devant lui, ni sur les colonnes voisines. Son chemin jusqu’à la promotion est libre, et c’est ce qui fait sa valeur en finale.',
  },
  'Pions doublés': {
    fen: '4k3/8/8/8/8/2P5/2P5/4K3 w - - 0 1',
    cases: ['c2', 'c3'],
    legende:
      'Deux pions sur la même colonne : celui de derrière ne protégera jamais celui de devant, et ils avancent l’un derrière l’autre. Le prix ordinaire d’une capture vers le centre.',
  },
  'Pion isolé': {
    fen: '4k3/8/8/8/3P4/8/PP4PP/4K3 w - - 0 1',
    cases: ['d4'],
    legende:
      'Aucun pion ami sur les colonnes voisines : personne ne pourra jamais le défendre. Il faudra une pièce pour cela, et une pièce occupée à défendre ne fait rien d’autre.',
  },
  'Mauvais fou': {
    fen: '4k3/8/8/8/2P1P3/3B4/8/4K3 w - - 0 1',
    cases: ['c4', 'e4'],
    legende:
      'Le fou joue sur les cases claires, et ses propres pions occupent les cases claires devant lui. Il regarde par-dessus ses barreaux : la moitié de l’échiquier lui est fermée par son camp.',
  },
  Zugzwang: {
    fen: '8/8/8/4k3/8/4K3/4P3/8 b - - 0 1',
    legende:
      'Les Noirs ne sont pas perdus par la position, mais par l’obligation de jouer : tout coup de leur roi laisse passer le pion blanc. Pouvoir passer son tour les sauverait.',
  },
  'Paire de fous': {
    fen: '4k3/8/8/8/8/8/8/2B1KB2 w - - 0 1',
    cases: ['c1', 'f1'],
    legende:
      'Un fou sur les cases claires, un sur les sombres : à eux deux, plus aucune case ne leur échappe. C’est ce qui vaut mieux qu’un fou et un cavalier en position ouverte.',
  },
}
