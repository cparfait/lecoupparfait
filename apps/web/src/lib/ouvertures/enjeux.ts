/**
 * Les enjeux des ouvertures — ce qu'on cherche, pas ce qu'on joue.
 *
 * L'explorateur reconnaît 3 810 ouvertures et sait en donner le nom, le code
 * ECO et les statistiques. Ce qu'il ne disait pas, c'est **ce qu'on essaie de
 * faire** : on pouvait connaître le nom de sa propre ouverture, ses dix
 * premiers coups de théorie, et n'avoir aucune idée de quoi jouer au onzième.
 * Or c'est toujours au onzième que commence la partie.
 *
 * ── Vingt-cinq, et pas trois mille huit cent dix ─────────────────────────────
 *
 * Écrire une fiche par ouverture nommée serait absurde : la plupart sont des
 * variantes à six coups de profondeur, et celui qui les atteint n'a pas besoin
 * qu'on lui explique le plan. Vingt-cinq suffisent à couvrir la quasi-totalité
 * de ce qui se joue en club, et chacune est écrite pour être lue **avant** de
 * connaître la théorie.
 *
 * ── Ce que porte chaque fiche ────────────────────────────────────────────────
 *
 * Cinq champs, toujours les mêmes, et le dernier n'est pas décoratif :
 *
 *  - **l'idée** : la raison d'être de l'ouverture, en une phrase ;
 *  - **la structure** : à quoi ressemblent les pions, puisque ce sont eux qui
 *    décident de quel côté jouer et quelle finale attend ;
 *  - **les deux plans**, un par camp : une ouverture n'a pas de plan, elle en a
 *    deux qui s'opposent, et ne connaître que le sien suffit à perdre ;
 *  - **le piège** : celui qu'on tend ou qu'on subit dans les dix premiers
 *    coups. C'est ce qui décide les parties en club, bien avant la théorie.
 *
 * La suite de coups sert à reconnaître la fiche depuis l'échiquier : quand on
 * joue l'ouverture dans l'explorateur, la fiche apparaît d'elle-même. C'est la
 * seule façon de lire « ce que cherche la sicilienne » au moment où la question
 * se pose, c'est-à-dire la main sur les pièces.
 */

export interface FicheEnjeux {
  id: string
  nom: string
  /** Code ECO de la position de référence. */
  eco: string
  /**
   * La suite qui définit l'ouverture, en notation algébrique depuis le départ.
   *
   * Sert à reconnaître la fiche sur un échiquier : on garde la plus longue
   * suite qui soit un début de la partie jouée. Volontairement courte — trois à
   * cinq coups — parce qu'une fiche qui ne s'afficherait qu'après huit coups
   * exacts ne s'afficherait jamais.
   */
  coups: string[]
  /**
   * Les autres noms sous lesquels l'ouverture se dit dans un texte.
   *
   * Le champ `nom` est celui d'un catalogue — « Défense sicilienne », « Partie
   * italienne ». Personne n'écrit cela dans une phrase : on écrit « la
   * sicilienne », « l'italienne », « l'est-indienne ». Sans ces formes-là, un
   * nom d'ouverture rencontré au milieu d'un principe ou d'un levier resterait
   * un mot mort, alors que sa fiche existe à un clic.
   *
   * Écrits en minuscules et sans article : la reconnaissance ignore la casse, et
   * l'article reste en dehors du lien.
   */
  alias: string[]
  /** Qui choisit cette ouverture. */
  pour: 'Blancs' | 'Noirs'
  idee: string
  structure: string
  planBlancs: string
  planNoirs: string
  piege: string
  /** Leçon guidée correspondante, quand il y en a une. */
  lecon?: string
}

export const FICHES_ENJEUX: FicheEnjeux[] = [
  // ── Après 1.e4 e5 ───────────────────────────────────────────────────────
  {
    id: 'italienne',
    nom: 'Partie italienne',
    eco: 'C50',
    coups: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
    alias: ['italienne', 'giuoco piano', 'partie italienne'],
    pour: 'Blancs',
    lecon: 'italienne',
    idee: 'Le développement le plus direct qui existe : pion au centre, cavalier, fou, et le fou regarde f7 — la case la plus faible tant que le roi noir n’a pas roqué.',
    structure:
      'Pions e4 contre e5, centre symétrique et fermé tant que personne ne joue d4 ou d5. Tout se décide sur le moment où ce centre s’ouvre.',
    planBlancs:
      'Roquer, puis c3 et d4 pour construire un gros centre de pions. À défaut, la version lente : d3, Nbd2, Nf1-g3 et une attaque de pions sur l’aile roi.',
    planNoirs:
      'La même chose en miroir — c6, d5 — ou bien ...Nf6 pour aller vers la défense des deux cavaliers, qui est plus tranchante.',
    piege:
      'Ne joue jamais Dh5 en espérant le mat du berger : les Noirs parent en développant, et tu passes trois coups à ramener ta dame.',
  },
  {
    id: 'espagnole',
    nom: 'Partie espagnole',
    eco: 'C60',
    coups: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
    alias: ['espagnole', 'ruy lopez', 'partie espagnole'],
    pour: 'Blancs',
    lecon: 'espagnole',
    idee: 'Attaquer le défenseur plutôt que le pion : le fou en b5 ne prend pas e5, il neutralise le cavalier qui le garde.',
    structure:
      'Centre e4 contre e5, souvent refermé par d3 et c3 côté blanc. Les parties se jouent longtemps sans aucun échange de pions.',
    planBlancs:
      'c3, d3, Nbd2, puis la manœuvre de cavalier vers f1 et g3 ou e3. On réarrange lentement et on attaque ensuite sur l’aile roi.',
    planNoirs:
      'a6 pour chasser le fou, puis d6, Be7, 0-0, et la poussée ...b5 qui gagne de l’espace sur l’aile dame.',
    piege:
      'L’arche de Noé : après a6, b5 et c4, les pions noirs enferment le fou blanc sur b3 et le gagnent purement et simplement.',
  },
  {
    id: 'deux-cavaliers',
    nom: 'Défense des deux cavaliers',
    eco: 'C55',
    coups: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'],
    alias: ['défense des deux cavaliers', 'deux cavaliers', 'fegatello', 'fried liver'],
    pour: 'Noirs',
    idee: 'Les Noirs ignorent la menace sur f7 et développent. C’est un pari sur le calcul : la position devient immédiatement tranchante.',
    structure:
      'Centre ouvert dès que d4 ou d5 arrive. Les pions comptent moins que le temps, dans les dix premiers coups.',
    planBlancs:
      'Ng5 pour taper f7 tout de suite, ou le d4 tranquille. Le premier mène au Fegatello, le second à une partie ordinaire.',
    planNoirs: 'Après Ng5, la réponse est d5 — et surtout pas de reprendre en d5 avec le cavalier.',
    piege:
      'Le Fegatello : 4.Cg5 d5 5.exd5 Cxd5 perd sur 6.Cxf7 Rxf7 7.Df3+. Le coup juste est 5…Ca5, qui chasse le fou et garde tout.',
  },
  {
    id: 'ecossaise',
    nom: 'Partie écossaise',
    eco: 'C45',
    coups: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'],
    alias: ['écossaise', 'partie écossaise'],
    pour: 'Blancs',
    idee: 'Ouvrir le centre au troisième coup, avant que les Noirs n’aient fini de s’installer. Rien à mémoriser : les pièces sortent sur des cases évidentes.',
    structure:
      'Le centre s’ouvre tout de suite. Les pions blancs et noirs s’échangent en d4, et il reste deux camps avec des pièces libres.',
    planBlancs:
      'Reprendre en d4 avec le cavalier, puis développer vite et occuper les colonnes ouvertes. Les positions sont simples et les pièges rares.',
    planNoirs:
      '...Bc5 ou ...Nf6 pour attaquer le cavalier d4 et obtenir le même développement libre.',
    piege:
      'Après 4…Fc5, ne joue pas Cxc6 machinalement : les Noirs reprennent en dxc6 et leur fou c5 devient très fort sur la diagonale.',
  },
  {
    id: 'gambit-roi',
    nom: 'Gambit du roi',
    eco: 'C33',
    coups: ['e4', 'e5', 'f4'],
    alias: ['gambit du roi'],
    pour: 'Blancs',
    idee: 'Donner un pion pour prendre tout le centre et ouvrir la colonne f vers le roi noir. C’est la plus romantique des ouvertures et la plus risquée.',
    structure:
      'Colonne f ouverte pour les Blancs, pion noir en plus et diagonale e1-h4 dangereusement dégarnie.',
    planBlancs:
      'Nf3, d4, Bc4 et attaquer en colonne f avant que les Noirs ne consolident leur pion de plus.',
    planNoirs:
      'Rendre le pion au bon moment et viser le roi blanc — la case g3 et la diagonale vers e1 sont les points faibles.',
    piege:
      'Après 2.f4 exf4, ne joue pas 3.Cf3 g5 4.h4 sans savoir où va ta tour : la colonne h s’ouvre dans les deux sens.',
  },
  {
    id: 'petroff',
    nom: 'Défense russe',
    eco: 'C42',
    coups: ['e4', 'e5', 'Nf3', 'Nf6'],
    alias: ['défense russe', 'petroff', 'pétroff'],
    pour: 'Noirs',
    idee: 'Répondre à l’attaque par une attaque symétrique. L’ouverture la plus solide contre 1.e4, et celle qui mène au plus grand nombre de nulles.',
    structure:
      'Souvent un échange de pions centraux et une position presque symétrique, où le moindre avantage se joue sur une colonne.',
    planBlancs: 'Cxe5 puis d4, ou le calme Cc3. L’avantage est minime et se travaille longtemps.',
    planNoirs:
      'Après 3.Cxe5, jouer d6 pour chasser le cavalier avant de reprendre en e4. Jamais 3…Cxe4 tout de suite.',
    piege:
      '3.Cxe5 Cxe4 perd du matériel sur 4.De2 : le cavalier noir est attaqué et la colonne e se retourne contre lui.',
  },
  {
    id: 'philidor',
    nom: 'Défense Philidor',
    eco: 'C41',
    coups: ['e4', 'e5', 'Nf3', 'd6'],
    alias: ['philidor', 'défense philidor'],
    pour: 'Noirs',
    idee: 'Tenir e5 avec un pion plutôt qu’avec une pièce. Solide, et volontairement passif — il faudra un plan actif plus tard.',
    structure:
      'Pions noirs en e5 et d6, qui enferment le fou f8. Les Blancs ont plus d’espace pour rien.',
    planBlancs:
      'd4 pour ouvrir, Nc3, Bc4, et profiter de l’espace pendant que les Noirs se débrouillent avec leur fou.',
    planNoirs:
      'Nf6, Be7, 0-0, puis chercher ...c6 et ...d5 pour se libérer. Sans cette poussée, la position reste étroite.',
    piege:
      'Le mat de Légal : après 3…d6 4.Fc4 Fg4 5.h3 Fh5, prendre le cavalier f3 offre un mat en trois. On ne cloue pas un cavalier qu’on ne peut pas garder.',
    lecon: 'mat-legal',
  },

  // ── Après 1.e4, réponses asymétriques ───────────────────────────────────
  {
    id: 'sicilienne',
    nom: 'Défense sicilienne',
    eco: 'B20',
    coups: ['e4', 'c5'],
    alias: ['sicilienne', 'défense sicilienne'],
    pour: 'Noirs',
    lecon: 'sicilienne',
    idee: 'Refuser la symétrie dès le premier coup. Les Noirs échangent un pion d’aile contre un pion central et obtiennent la colonne c.',
    structure:
      'Après l’échange en d4, les Blancs ont un pion e4 et une colonne d ; les Noirs une colonne c ouverte et une majorité au centre.',
    planBlancs:
      'Attaquer sur l’aile roi : f4, g4, et souvent le roque long pour lancer les pions. La course est le thème de l’ouverture.',
    planNoirs:
      'La colonne c vers le roi blanc, la poussée ...b5, et un cavalier en c4 ou d4. Compter les temps avant de défendre.',
    piege:
      'Ne prends pas le pion b2 avec la dame sans avoir compté : elle se fait souvent enfermer, et les Blancs gagnent l’attaque pour un pion.',
  },
  {
    id: 'najdorf',
    nom: 'Sicilienne Najdorf',
    eco: 'B90',
    coups: ['e4', 'c5', 'Nf3', 'd6', 'd4'],
    alias: ['najdorf'],
    pour: 'Noirs',
    idee: 'Le coup a6 avant tout le reste : il enlève la case b5 aux pièces blanches et prépare ...b5 et ...e5 sans concession.',
    structure:
      'Centre ouvert, pions noirs en d6 et e6 ou e5, et un trou permanent en d5 que les Blancs visent.',
    planBlancs:
      'Fe3, f3, Dd2, roque long, puis g4 et h4. Ou le Fg5 classique, qui attaque tout de suite.',
    planNoirs:
      '...e5 ou ...e6, ...b5, et la contre-attaque en colonne c. La case d5 se défend avec des pièces, pas avec des pions.',
    piege:
      'L’attaque anglaise arrive vite : si tu laisses g4 et h4 venir sans jouer, ton roque tombe en dix coups.',
  },
  {
    id: 'francaise',
    nom: 'Défense française',
    eco: 'C00',
    coups: ['e4', 'e6'],
    alias: ['française', 'défense française'],
    pour: 'Noirs',
    lecon: 'francaise',
    idee: 'Préparer ...d5 pour frapper e4 au coup suivant, en acceptant un inconvénient connu : le fou c8 reste longtemps enfermé.',
    structure:
      'Chaîne de pions e6-d5 contre e4-d4, souvent bloquée après e5. Les Blancs ont de l’espace à l’aile roi, les Noirs la colonne c et la base d4 à attaquer.',
    planBlancs: 'e5 pour fermer, puis attaquer le roi : f4, Nf3, et les pièces vers h5 et g5.',
    planNoirs:
      'Frapper la base de la chaîne avec ...c5, et trouver une case au fou c8 — b7 après ...b6, ou a6.',
    piege:
      'Après 2.d4 d5 3.Cc3 Cf6 4.e5, ne laisse pas ton cavalier f6 sans case : il se retrouve en d7 et le jeu noir s’étouffe.',
  },
  {
    id: 'caro-kann',
    nom: 'Défense Caro-Kann',
    eco: 'B10',
    coups: ['e4', 'c6'],
    alias: ['caro-kann', 'caro kann'],
    pour: 'Noirs',
    idee: 'La française sans son défaut : on prépare ...d5 avec le pion c6 plutôt qu’avec e6, et le fou c8 garde sa diagonale.',
    structure:
      'Souvent un pion noir en d5 échangé contre e4, une structure saine et aucune faiblesse. Les finales y sont bonnes pour les Noirs.',
    planBlancs:
      'L’avance c’est e5 et la poussée c4 ; l’échange c’est exd5 puis une bataille d’espace. Dans les deux cas, jouer vite pour empêcher la consolidation.',
    planNoirs:
      'Sortir le fou c8 en f5 ou g4 avant de jouer e6, développer proprement, et viser la finale.',
    piege:
      'Après 2.d4 d5 3.exd5 cxd5 4.Fd3, ne réponds pas Fg4 : le fou se fait chasser par f3 et tu perds le temps que tu venais de gagner.',
  },
  {
    id: 'scandinave',
    nom: 'Défense scandinave',
    eco: 'B01',
    coups: ['e4', 'd5'],
    alias: ['scandinave', 'défense scandinave'],
    pour: 'Noirs',
    idee: 'Échanger tout de suite le pion central, au prix d’une sortie de dame assumée. La plus simple des défenses à apprendre contre 1.e4.',
    structure:
      'Pion blanc en d4, aucun pion noir au centre, et une dame noire active sur a5 ou d6.',
    planBlancs:
      'Cc3 pour gagner un temps sur la dame, puis d4, Cf3, Fc4 et le roque : un développement plus rapide, c’est tout l’avantage.',
    planNoirs:
      'Dame en a5 ou d6 — une case où elle ne se fait plus chasser — puis Cf6, c6, Ff5, e6 et le roque. Le plan est le même à chaque partie.',
    piege:
      'Dame en d8 après 3.Cc3 concède deux temps pour rien. Et si la dame va en a5, attention au clouage Fd2 suivi de Cd5.',
  },
  {
    id: 'pirc',
    nom: 'Défense Pirc',
    eco: 'B07',
    coups: ['e4', 'd6', 'd4', 'Nf6'],
    alias: ['pirc', 'défense pirc'],
    pour: 'Noirs',
    idee: 'Laisser les Blancs prendre tout le centre, puis le frapper à coups de ...e5 ou ...c5 quand il est trop grand pour être tenu.',
    structure:
      'Gros centre blanc e4-d4, fou noir en g7 sur la longue diagonale, et un roque noir solide.',
    planBlancs:
      'f4 et l’attaque autrichienne, ou le calme Fe2 et 0-0. Tenir le centre est la seule obligation.',
    planNoirs:
      'Fg7, 0-0, puis ...c5 ou ...e5 selon ce que les Blancs ont joué. Le fou g7 doit finir par voir d4.',
    piege:
      'Si tu oublies de frapper le centre, les Blancs jouent e5 et ton fou g7 regarde son propre cavalier jusqu’à la fin.',
  },
  {
    id: 'alekhine',
    nom: 'Défense Alekhine',
    eco: 'B02',
    coups: ['e4', 'Nf6'],
    alias: ['alekhine', 'défense alekhine'],
    pour: 'Noirs',
    idee: 'Provoquer e5 pour donner au pion blanc une avance qu’il devra défendre, et le harceler ensuite avec ...d6.',
    structure:
      'Pions blancs très avancés, souvent e5 et d4 voire c4 : beaucoup d’espace, et autant de points à tenir.',
    planBlancs:
      'Les quatre pions — e5, d4, c4, f4 — si l’on aime le risque ; sinon Cf3, Fe2 et un jeu d’espace tranquille.',
    planNoirs:
      '...d6 pour attaquer e5, échanger, et exploiter les cases que les pions blancs ont laissées derrière eux.',
    piege:
      'Le cavalier noir est chassé trois fois de suite au début : compte bien ses cases de repli avant de t’y engager.',
  },

  // ── Après 1.d4 ──────────────────────────────────────────────────────────
  {
    id: 'gambit-dame',
    nom: 'Gambit dame',
    eco: 'D06',
    coups: ['d4', 'd5', 'c4'],
    alias: ['gambit dame', 'gambit de la dame'],
    pour: 'Blancs',
    lecon: 'gambit-dame',
    idee: 'Ce n’est pas un vrai gambit : si les Noirs prennent en c4, les Blancs récupèrent le pion quand ils veulent avec e3 ou Da4.',
    structure:
      'Tension au centre entre c4 et d5. Tout dépend de qui prend le premier, et avec quoi.',
    planBlancs:
      'Cc3, Cf3, Fg5, e3 : on développe, on garde la tension, et la minorité à l’aile dame attaque plus tard.',
    planNoirs:
      'Tenir d5 avec e6 ou c6, ou prendre en c4 et rendre le centre contre du développement.',
    piege:
      'Le piège de l’éléphant : après Fg5 Cbd7, la prise Cxd5 perd une pièce sur Cxd5 Fxd8 Fb4+. Ne prends pas un pion « cloué » qui ne l’est pas.',
  },
  {
    id: 'gambit-dame-accepte',
    nom: 'Gambit dame accepté',
    eco: 'D20',
    coups: ['d4', 'd5', 'c4', 'dxc4'],
    alias: ['gambit dame accepté'],
    pour: 'Noirs',
    idee: 'Rendre le centre tout de suite pour gagner du temps et placer ses pièces. Les Noirs ne garderont pas le pion, et ce n’est pas le but.',
    structure:
      'Pions blancs e3-d4 contre un pion noir en c-quelque-chose ; les Blancs ont un centre mobile, les Noirs la colonne c.',
    planBlancs:
      'e3 ou e4, reprendre c4, et pousser d4-d5 au bon moment. Le pion isolé qui en résulte est une arme, pas un défaut.',
    planNoirs: '...e6, ...c5 et ...Cc6 pour attaquer d4. Le fou c8 sort avant d’être enfermé.',
    piege:
      'Ne cherche pas à garder le pion c4 avec ...b5 : les Blancs jouent a4 et ta structure d’aile dame s’effondre.',
  },
  {
    id: 'slave',
    nom: 'Défense slave',
    eco: 'D10',
    coups: ['d4', 'd5', 'c4', 'c6'],
    alias: ['slave', 'défense slave'],
    pour: 'Noirs',
    idee: 'Défendre d5 avec c6 plutôt qu’avec e6 : le fou c8 garde sa sortie, et c’est toute la différence avec le gambit dame ordinaire.',
    structure:
      'Pions c6 et d5 très solides. Les Noirs n’ont aucune faiblesse, et aucun jeu avant d’avoir joué ...dxc4 ou ...e6.',
    planBlancs: 'Cf3, Cc3, e3, puis Fd3 et 0-0 ; on cherche ensuite e4 pour ouvrir le centre.',
    planNoirs:
      '...dxc4 suivi de ...Ff5 ou ...b5, ou le plan lent ...e6, ...Cbd7 et ...dxc4 plus tard.',
    piege:
      'Le piège de l’échange : après 3…c6 4.cxd5 cxd5, la position est rigoureusement symétrique et ne donne rien aux Blancs. Ne joue cet échange que si tu veux la nulle.',
  },
  {
    id: 'londres',
    nom: 'Système de Londres',
    eco: 'D02',
    coups: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4'],
    alias: ['système de londres', 'londres'],
    pour: 'Blancs',
    idee: 'Sortir le fou avant de jouer e3, pour ne pas l’enfermer. Un système : les mêmes six coups quoi que jouent les Noirs.',
    structure:
      'Pions blancs d4 et e3, pion noir d5, centre fermé. La partie se joue sur la case e5 et sur l’aile roi.',
    planBlancs:
      'e3, Fd3, Cbd2, c3, puis Ce5 et une attaque lente sur le roque noir. Rien à mémoriser, tout à comprendre.',
    planNoirs:
      'Contester e5 avec ...Cbd7 et ...c5, ou échanger le fou f4 par ...Fd6. Une fois ce fou parti, le système perd son tranchant.',
    piege:
      'Ne joue pas Fd3 avant que le fou c8 ne soit sorti : les Noirs répondent Ff5 et échangent ton meilleur attaquant.',
  },
  {
    id: 'nimzo-indienne',
    nom: 'Défense nimzo-indienne',
    eco: 'E20',
    coups: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'],
    alias: ['nimzo-indienne', 'nimzo indienne', 'nimzo'],
    pour: 'Noirs',
    idee: 'Clouer le cavalier c3 pour empêcher e4. Les Noirs échangent un fou contre un cavalier et obtiennent le contrôle des cases claires.',
    structure:
      'Souvent des pions blancs doublés en c après ...Fxc3 : une faiblesse contre la paire de fous. Tout le jeu part de cet échange.',
    planBlancs:
      'a3 pour forcer l’échange, ou Dc2 pour l’éviter. Ensuite e4 à tout prix, et la paire de fous dans une position ouverte.',
    planNoirs:
      'Empêcher e4 le plus longtemps possible, fixer les pions c doublés et jouer ...c5, ...d6, ...Cc6.',
    piege:
      'Ne rends pas le fou en b4 sans contrepartie : s’il part sans avoir provoqué a3 ni doublé les pions, les Noirs ont perdu la paire pour rien.',
  },
  {
    id: 'est-indienne',
    nom: 'Défense est-indienne',
    eco: 'E60',
    coups: ['d4', 'Nf6', 'c4', 'g6'],
    alias: ['est-indienne', 'est indienne', 'indienne du roi'],
    pour: 'Noirs',
    lecon: 'est-indienne',
    idee: 'Laisser les Blancs prendre le centre entier, roquer derrière le fou g7, puis tout faire sauter avec ...e5.',
    structure:
      'Gros centre blanc, chaîne de pions, et une bataille d’ailes : Blancs à l’aile dame, Noirs à l’aile roi.',
    planBlancs:
      'e4, Fe2, 0-0, puis d5 et la poussée c5 à l’aile dame. Tenir le centre et ne pas s’occuper de l’attaque noire trop tôt.',
    planNoirs:
      '...e5, puis ...f5, ...g4 et les pions sur le roi blanc. L’ouverture la plus tranchante qui existe contre 1.d4.',
    piege:
      'Si le centre se ferme par d5 et que tu n’as pas joué ...f5, ton attaque n’a pas de munitions : la course est perdue avant de commencer.',
  },
  {
    id: 'grunfeld',
    nom: 'Défense Grünfeld',
    eco: 'D80',
    coups: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5'],
    alias: ['grünfeld', 'grunfeld'],
    pour: 'Noirs',
    idee: 'Frapper le centre avant même de roquer. Les Noirs donnent le centre pour l’attaquer à la pièce — c’est l’ouverture hypermoderne par excellence.',
    structure:
      'Grand centre de pions blanc en c3-d4-e4 contre un fou g7 et les pions ...c5. Tout se joue sur la solidité de ce centre.',
    planBlancs:
      'Construire e4-d4-c3 et avancer : si le centre tient, il écrase. Fe3, Cf3, Fe2, 0-0.',
    planNoirs:
      '...Fg7, ...c5, ...Cc6 et la pression sur d4. Le fou g7 est la pièce de toute la partie.',
    piege:
      'Ne prends pas le pion d4 avec la dame trop tôt : les Blancs gagnent deux temps et ton roi n’a pas encore roqué.',
  },
  {
    id: 'catalane',
    nom: 'Ouverture catalane',
    eco: 'E00',
    coups: ['d4', 'Nf6', 'c4', 'e6', 'g3'],
    alias: ['catalane', 'ouverture catalane'],
    pour: 'Blancs',
    idee: 'Un fou en g2 qui regarde d5 à travers tout l’échiquier. Pression lente, sans risque, et très difficile à jouer contre sans plan.',
    structure:
      'Pion blanc d4, pion noir d5 souvent échangé en c4, et une longue diagonale blanche ouverte.',
    planBlancs:
      'Fg2, 0-0, Dc2 ou Da4 pour récupérer c4, puis e4 ou la pression en colonne c et sur d5.',
    planNoirs:
      'Tenir c4 avec ...b5 et ...Fb7, ou rendre le pion et jouer ...c5 pour ouvrir la diagonale de son propre fou.',
    piege:
      'Rendre le pion c4 sans obtenir ...c5 en échange laisse les Noirs sans le moindre jeu pour vingt coups.',
  },
  {
    id: 'hollandaise',
    nom: 'Défense hollandaise',
    eco: 'A80',
    coups: ['d4', 'f5'],
    alias: ['hollandaise', 'défense hollandaise'],
    pour: 'Noirs',
    idee: 'Jouer pour ...e5 dès le premier coup et obtenir une attaque sur l’aile roi. Le prix est connu : la case e6 et la diagonale vers le roi s’affaiblissent.',
    structure:
      'Pions noirs f5 et e6 ou g6, centre fermé, et une colonne f qui sert aux deux camps.',
    planBlancs:
      'g3 et Fg2 pour exploiter les cases claires, ou le gambit Staunton e4 pour ouvrir tout de suite.',
    planNoirs:
      '...Cf6, ...e6, ...Fe7, 0-0, puis ...De8 et ...e5. La poussée e5 est la raison d’être de l’ouverture.',
    piege:
      'Attention à Dh5+ et au fou en g5 dans les premiers coups : le trou en e6 et la diagonale h5-e8 sont le défaut du premier coup.',
  },
  {
    id: 'anglaise',
    nom: 'Ouverture anglaise',
    eco: 'A10',
    coups: ['c4'],
    alias: ['anglaise', 'ouverture anglaise'],
    pour: 'Blancs',
    idee: 'Une sicilienne à l’envers, avec un temps de plus. On prend d5 sous contrôle sans engager le moindre pion central.',
    structure:
      'Très variable : elle transpose dans presque tout. C’est sa force et la raison pour laquelle on la joue par système plutôt que par théorie.',
    planBlancs:
      'Cc3, g3, Fg2, Cf3, 0-0, puis la poussée d4 ou b4 selon ce que les Noirs ont construit.',
    planNoirs:
      '...e5 pour la symétrie, ...Cf6 et ...e6 pour transposer vers le gambit dame, ou ...c5 pour une bataille d’aile dame.',
    piege:
      'Ne joue pas d4 trop tôt : la transposition vers le gambit dame annule l’intérêt de l’ouverture et te fait affronter une théorie que l’anglaise évitait.',
  },
  {
    id: 'reti',
    nom: 'Ouverture Réti',
    eco: 'A09',
    coups: ['Nf3', 'd5', 'c4'],
    alias: ['réti', 'reti'],
    pour: 'Blancs',
    idee: 'Attaquer le pion d5 de loin, sans poser un seul pion au centre. Le centre se prend avec des pièces, pas avec des pions.',
    structure:
      'Aucun pion blanc au centre au début, un fou en g2, et une pression durable sur d5 et c6.',
    planBlancs:
      'g3, Fg2, 0-0, b3 et Fb2 : deux fous sur les longues diagonales, puis d4 ou e4 quand la position est mûre.',
    planNoirs:
      'Tenir d5 avec ...c6 et ...e6, ou prendre en c4 et jouer ...Ff5 pour sortir le fou avant de fermer.',
    piege:
      'Prendre en c4 et vouloir garder le pion coûte l’aile dame : les Blancs jouent a4 et la structure noire se démonte.',
  },
]

/**
 * La fiche qui correspond à une partie jouée.
 *
 * On garde la **plus longue** suite qui soit un début de la partie : sans cela,
 * 1.e4 e5 2.Cf3 Cc6 3.Fb5 afficherait la fiche de l'italienne si elle venait
 * d'abord dans la liste, puisqu'aucune des deux n'est plus « vraie » que l'autre
 * au deuxième coup. La plus longue est la plus précise, toujours.
 *
 * La comparaison porte sur la notation algébrique brute telle que chess.js la
 * produit : c'est celle des fiches, et c'est celle que l'explorateur a dans son
 * historique.
 */
export function ficheDeLaPartie(coups: string[]): FicheEnjeux | null {
  let meilleure: FicheEnjeux | null = null

  for (const fiche of FICHES_ENJEUX) {
    if (fiche.coups.length > coups.length) continue
    const correspond = fiche.coups.every((coup, index) => coup === coups[index])
    if (!correspond) continue
    if (!meilleure || fiche.coups.length > meilleure.coups.length) meilleure = fiche
  }

  return meilleure
}

export function ficheEnjeux(id: string): FicheEnjeux | null {
  return FICHES_ENJEUX.find((fiche) => fiche.id === id) ?? null
}
