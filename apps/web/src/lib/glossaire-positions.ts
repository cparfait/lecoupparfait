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

  // ── Les motifs tactiques ────────────────────────────────────────────────
  //
  // Ce sont les mots que le coach emploie dans ses explications, et ceux des
  // filtres de puzzles. Ils désignent tous une géométrie : une fourchette est
  // une forme avant d'être une idée, et une phrase la décrit d'autant plus mal
  // qu'elle est simple à voir.
  Fourchette: {
    fen: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1',
    coups: ['Nc7+'],
    legende:
      'Une pièce, deux cibles à la fois : le cavalier donne échec au roi et attaque la tour. Le roi doit parer, et la tour tombe au coup suivant.',
  },
  Clouage: {
    fen: '4k3/8/4n3/8/8/8/8/R5K1 w - - 0 1',
    coups: ['Re1'],
    legende:
      'Le cavalier ne peut plus bouger : il découvrirait son propre roi. Il reste sur place, sans défense, et l’on peut prendre son temps pour l’attaquer.',
  },
  Enfilade: {
    fen: '7q/6k1/8/8/8/8/8/B5K1 w - - 0 1',
    coups: ['Bb2+', 'Kf7', 'Bxh8'],
    legende:
      'Le clouage à l’envers : la pièce de valeur est devant, elle doit s’écarter de l’échec, et ce qu’elle protégeait derrière elle se prend.',
  },
  'Attaque à la découverte': {
    fen: '4k3/1q6/8/8/4N3/8/8/4R1K1 w - - 0 1',
    coups: ['Nc5'],
    legende:
      'Le cavalier s’écarte et démasque la tour, qui donne échec. Il en profite pour attaquer la dame : on doit parer l’échec, et la dame n’a personne pour la sauver.',
  },
  'Échec double': {
    fen: '4k3/8/8/8/4N3/8/8/4R1K1 w - - 0 1',
    coups: ['Nf6+'],
    legende:
      'Deux pièces donnent échec en même temps. Aucune capture, aucune interposition ne peut parer les deux : le roi doit bouger, quoi qu’il en coûte.',
  },
  'Mat étouffé': {
    fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1',
    coups: ['Nf7#'],
    legende:
      'Le roi est enfermé par ses propres pièces, et le cavalier — la seule qui saute — vient le mater dans son coin. Rien ne peut prendre le cavalier.',
  },
  'Mat du couloir': {
    fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
    coups: ['Ra8#'],
    legende:
      'Les trois pions n’ont jamais bougé, et le roi n’a pas de fenêtre : la tour arrive sur la rangée et la partie s’arrête. C’est le mat le plus fréquent entre débutants.',
  },
  'Mat en un': {
    fen: '6k1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1',
    coups: ['Rb8#'],
    legende:
      'Un seul coup, et c’est fini. Chercher les mats en un est l’exercice qui apprend le plus vite à voir les cases que le roi adverse n’a pas.',
  },
  'Élimination du défenseur': {
    fen: '3r2k1/1n3ppp/8/8/8/8/5PPP/3RR1K1 w - - 0 1',
    coups: ['Rxd8+', 'Nxd8', 'Re8#'],
    legende:
      'La tour noire tenait la dernière rangée : on l’échange, le cavalier reprend loin de la case qui comptait, et la seconde tour entre. On ne s’attaque pas à la cible, mais à ce qui la garde.',
  },
  'Pièce en prise': {
    fen: '4k3/8/8/3n4/8/1B6/8/4K3 w - - 0 1',
    cases: ['d5'],
    legende:
      'Le cavalier est attaqué par le fou et personne ne le défend : il se prend gratuitement. C’est le premier motif à chercher, à chaque coup, dans les deux camps.',
  },
  'Attaque en rayon X': {
    fen: '3rk3/8/8/8/8/8/8/3RK3 w - - 0 1',
    cases: ['d1', 'd8'],
    legende:
      'Les deux tours se regardent à travers la colonne : ce qui viendra s’intercaler entre elles sera attaqué des deux côtés, et l’attaque « traverse » la pièce.',
  },
  'Sous-promotion': {
    fen: '5rk1/6P1/8/8/8/8/8/6K1 w - - 0 1',
    coups: ['gxf8=N+'],
    legende:
      'Promouvoir en cavalier plutôt qu’en dame : ici, lui seul donne échec. Rare, mais c’est exactement pour ces cas-là que la règle laisse le choix.',
  },
  Opposition: {
    fen: '4k3/8/4K3/8/8/8/8/8 b - - 0 1',
    cases: ['e7'],
    legende:
      'Les rois se font face, une case entre eux, et c’est aux Noirs de jouer : ils doivent s’écarter, et le roi blanc avancera. L’opposition appartient à celui qui n’a pas le trait.',
  },
  Fianchetto: {
    fen: '4k3/8/8/8/8/6P1/5PBP/6K1 w - - 0 1',
    cases: ['g2'],
    legende:
      'Le fou s’installe sur la grande diagonale, derrière son pion avancé d’une case. Il y tient la plus longue ligne de l’échiquier, et garde le roi roqué à côté de lui.',
  },
  'Avant-poste': {
    fen: '4k3/8/3N4/4P3/8/8/8/4K3 w - - 0 1',
    cases: ['d6', 'e5'],
    legende:
      'Un cavalier posé dans le camp adverse, protégé par un pion, et qu’aucun pion ne peut chasser. Il vaut là bien plus qu’une tour mal placée.',
  },
  'Colonne ouverte': {
    fen: '4k3/pp3ppp/8/8/8/8/PP3PPP/3RK3 w - - 0 1',
    cases: ['d1'],
    legende:
      'Plus aucun pion sur la colonne : la tour y voit d’un bout à l’autre. C’est là qu’on met ses tours, et c’est souvent par là qu’on entre chez l’adversaire.',
  },
  'Tour à la septième': {
    fen: '4k3/1p3ppp/8/8/8/8/8/R5K1 w - - 0 1',
    coups: ['Ra7'],
    legende:
      'La tour s’installe sur la rangée des pions adverses : elle les attaque tous à la fois et enferme le roi sur sa dernière rangée. Une tour à la septième vaut souvent un pion.',
  },
  'Pion passé protégé': {
    fen: '4k3/8/8/2PP4/2P5/8/8/4K3 w - - 0 1',
    cases: ['d5', 'c4'],
    legende:
      'Un pion passé que défend un autre pion : le roi adverse ne peut ni le prendre ni le laisser. C’est l’avantage le plus décisif des finales de pions.',
  },
  'Tour derrière le pion passé': {
    fen: '4k3/8/8/3P4/8/8/8/3RK3 w - - 0 1',
    cases: ['d1', 'd5'],
    legende:
      'La tour pousse son pion par-derrière : elle gagne en portée à mesure qu’il avance, quand la tour adverse, elle, en perd. Règle de Tarrasch, et elle tient.',
  },
  'Pion arriéré': {
    fen: '4k3/8/8/8/1P1P4/2P5/8/4K3 w - - 0 1',
    cases: ['c3'],
    legende:
      'Le pion c3 est resté derrière ses voisins et ne peut plus avancer sans se perdre : aucun pion ami ne le défendra jamais. La case devant lui est un avant-poste offert.',
  },
}
