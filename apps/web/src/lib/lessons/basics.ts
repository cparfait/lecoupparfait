/**
 * Chapitre 1 — Les bases.
 *
 * Le point de départ absolu : quelqu'un qui n'a jamais joué. On procède pièce
 * par pièce, en isolant chaque fois une seule idée, avec un échiquier presque
 * vide pour que rien ne distraie.
 *
 * L'ordre n'est pas alphabétique mais pédagogique : la tour d'abord parce que
 * son déplacement est le plus simple à énoncer, le cavalier en dernier parmi
 * les pièces mobiles parce que son saut est le plus déroutant.
 */

import type { Chapter } from './types.ts'

export const basicsChapter: Chapter = {
  id: 'bases',
  title: 'Les bases',
  description:
    'L’échiquier, les six pièces, les trois règles spéciales. En une heure, tu sauras jouer une partie complète sans jamais te demander si un coup est autorisé.',
  level: 'beginner',
  icon: '♟️',
  lessons: [
    // ── 1.1 L'échiquier ────────────────────────────────────────────────────
    {
      id: 'echiquier',
      title: 'L’échiquier et ses cases',
      summary: 'Soixante-quatre cases, et un nom pour chacune. C’est la langue du jeu.',
      level: 'beginner',
      minutes: 4,
      icon: '🗺️',
      steps: [
        {
          kind: 'show',
          fen: '8/8/8/8/8/8/8/8 w - - 0 1',
          say: "Voici un échiquier. Soixante-quatre cases, huit colonnes et huit rangées. Une règle avant tout : la case en bas à droite doit toujours être claire.",
        },
        {
          kind: 'show',
          say: "Les colonnes portent des lettres, de a à h, en partant de la gauche. Les rangées portent des chiffres, de 1 à 8, en partant du bas.",
          highlight: ['a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1'],
        },
        {
          kind: 'show',
          say: "Chaque case a donc un nom : la lettre de sa colonne, puis le chiffre de sa rangée. Voici e4, au cœur de l'échiquier.",
          highlight: ['e4'],
          spotlight: ['e4', 'd4', 'd5', 'e5'],
        },
        {
          kind: 'show',
          say: "Ces quatre cases centrales — d4, d5, e4, e5 — sont les plus importantes de l'échiquier. Une pièce placée au centre contrôle beaucoup plus de cases qu'une pièce dans un coin. Retiens-le, c'est la première règle de stratégie.",
          highlight: ['d4', 'd5', 'e4', 'e5'],
        },
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          say: "Voici la position de départ. Les Blancs en bas, les Noirs en haut. Petit truc pour ne jamais se tromper : la dame se place sur une case de sa couleur. Dame blanche sur case claire, dame noire sur case sombre.",
          highlight: ['d1', 'd8'],
        },
      ],
    },

    // ── 1.2 La tour ────────────────────────────────────────────────────────
    {
      id: 'tour',
      title: 'La tour',
      summary: 'Elle va tout droit, aussi loin qu’elle veut. La plus simple, et redoutable.',
      level: 'beginner',
      minutes: 4,
      icon: '♜',
      steps: [
        {
          kind: 'show',
          fen: '7k/8/8/8/3R4/8/8/K7 w - - 0 1',
          say: "La tour se déplace en ligne droite : le long de sa colonne, ou le long de sa rangée. Aussi loin qu'elle veut, tant que la route est libre.",
          highlight: ['d4'],
          arrows: [
            { from: 'd4', to: 'd8', color: 'green' },
            { from: 'd4', to: 'd1', color: 'green' },
            { from: 'd4', to: 'a4', color: 'green' },
            { from: 'd4', to: 'h4', color: 'green' },
          ],
        },
        {
          kind: 'play',
          say: "À toi. Déplace la tour tout en haut de sa colonne, sur la case d8.",
          instruction: 'Joue la tour en d8',
          answers: ['Rd8+'],
          hint: 'Prends la tour et fais-la glisser vers le haut, jusqu’à la case d8.',
        },
        {
          kind: 'show',
          fen: '7k/8/8/8/3R2p1/8/8/K7 w - - 0 1',
          say: "La tour ne saute jamais par-dessus une pièce. Ici, ce pion noir en g4 lui barre la route : elle peut aller jusqu'en g4 pour le capturer, mais pas au-delà.",
          highlight: ['g4'],
          arrows: [{ from: 'd4', to: 'g4', color: 'green' }],
        },
        {
          kind: 'play',
          say: "Capture ce pion. Pour prendre une pièce, on pose simplement la sienne à sa place.",
          instruction: 'Capture le pion en g4',
          answers: ['Rxg4'],
          hint: 'Glisse la tour de d4 jusqu’en g4, sur le pion.',
        },
        {
          kind: 'show',
          say: "Voilà. La tour vaut cinq pions : c'est une pièce lourde, précieuse. Elle devient très forte quand les colonnes s'ouvrent, en fin de partie.",
        },
      ],
    },

    // ── 1.3 Le fou ─────────────────────────────────────────────────────────
    {
      id: 'fou',
      title: 'Le fou',
      summary: 'Il file en diagonale — et reste toute sa vie sur des cases de la même couleur.',
      level: 'beginner',
      minutes: 4,
      icon: '♝',
      steps: [
        {
          kind: 'show',
          fen: '7k/8/8/8/3B4/8/8/K7 w - - 0 1',
          say: "Le fou se déplace en diagonale, aussi loin qu'il veut. Lui non plus ne saute par-dessus rien.",
          highlight: ['d4'],
          arrows: [
            { from: 'd4', to: 'h8', color: 'green' },
            { from: 'd4', to: 'a7', color: 'green' },
            { from: 'd4', to: 'a1', color: 'green' },
            { from: 'd4', to: 'g1', color: 'green' },
          ],
        },
        {
          kind: 'show',
          say: "Regarde bien : ce fou est sur une case sombre, et toutes les cases qu'il peut atteindre sont sombres. Un fou ne change jamais de couleur de case. De toute la partie.",
          circles: [{ square: 'd4', color: 'blue' }],
        },
        {
          kind: 'show',
          say: "C'est pour ça qu'on parle de la paire de fous : avec les deux, on couvre toutes les cases de l'échiquier. Avec un seul, la moitié seulement lui échappe pour toujours.",
        },
        {
          kind: 'play',
          fen: '7k/8/5p2/8/3B4/8/8/K7 w - - 0 1',
          say: "À toi. Capture le pion noir en f6.",
          instruction: 'Capture le pion en f6',
          answers: ['Bxf6'],
          hint: 'Suis la diagonale vers le haut à droite : d4, e5, f6.',
        },
        {
          kind: 'show',
          say: "Le fou vaut environ trois pions, comme le cavalier. En position ouverte, avec peu de pions au centre, il est souvent le plus fort des deux.",
        },
      ],
    },

    // ── 1.4 La dame ────────────────────────────────────────────────────────
    {
      id: 'dame',
      title: 'La dame',
      summary: 'Tour et fou réunis. La pièce la plus puissante — et donc la plus fragile.',
      level: 'beginner',
      minutes: 4,
      icon: '♛',
      steps: [
        {
          kind: 'show',
          fen: '7k/8/8/8/3Q4/8/8/K7 w - - 0 1',
          say: "La dame combine la tour et le fou : lignes droites et diagonales, aussi loin qu'elle veut. Depuis le centre, elle contrôle vingt-sept cases.",
          highlight: ['d4'],
          arrows: [
            { from: 'd4', to: 'd8', color: 'green' },
            { from: 'd4', to: 'h8', color: 'green' },
            { from: 'd4', to: 'h4', color: 'green' },
            { from: 'd4', to: 'g1', color: 'green' },
            { from: 'd4', to: 'd1', color: 'green' },
            { from: 'd4', to: 'a1', color: 'green' },
            { from: 'd4', to: 'a4', color: 'green' },
            { from: 'd4', to: 'a7', color: 'green' },
          ],
        },
        {
          kind: 'show',
          say: "Elle vaut neuf pions. C'est énorme, et c'est justement le problème : n'importe quelle pièce adverse peut la prendre, et on perd immédiatement la partie. Une dame se protège.",
        },
        {
          kind: 'play',
          fen: '3r3k/8/8/8/3Q4/8/8/K7 w - - 0 1',
          say: "Cette tour noire en d8 n'est défendue par personne, et elle est sur la colonne de ta dame. Prends-la.",
          instruction: 'Capture la tour en d8',
          answers: ['Qxd8+'],
          hint: 'La dame monte tout droit le long de la colonne d.',
        },
        {
          kind: 'show',
          say: "Une erreur très courante chez les débutants : sortir la dame dès les premiers coups. Elle se fait alors chasser par des pièces adverses moins précieuses, et on perd du temps à la sauver. Sors-la tard.",
        },
      ],
    },

    // ── 1.5 Le cavalier ────────────────────────────────────────────────────
    {
      id: 'cavalier',
      title: 'Le cavalier',
      summary: 'Le seul qui saute. Déroutant au début, redoutable une fois apprivoisé.',
      level: 'beginner',
      minutes: 5,
      icon: '♞',
      steps: [
        {
          kind: 'show',
          fen: '7k/8/8/8/3N4/8/8/K7 w - - 0 1',
          say: "Le cavalier se déplace en L : deux cases dans une direction, puis une case perpendiculairement. Depuis d4, il peut atteindre huit cases.",
          highlight: ['b3', 'b5', 'c2', 'c6', 'e2', 'e6', 'f3', 'f5'],
        },
        {
          kind: 'show',
          say: "Le truc pour ne jamais se tromper : le cavalier change toujours de couleur de case. D'une case sombre il va sur une case claire, et inversement. Toujours.",
          circles: [{ square: 'd4', color: 'blue' }],
        },
        {
          kind: 'show',
          fen: '7k/8/8/2ppp3/2pNp3/2ppp3/8/K7 w - - 0 1',
          say: "Et surtout : c'est la seule pièce qui saute par-dessus les autres. Ici le cavalier est complètement entouré, et pourtant il peut sortir. Regarde.",
          arrows: [
            { from: 'd4', to: 'c6', color: 'green' },
            { from: 'd4', to: 'e6', color: 'green' },
            { from: 'd4', to: 'b5', color: 'green' },
            { from: 'd4', to: 'f5', color: 'green' },
          ],
        },
        {
          kind: 'play',
          say: "À toi. Fais-le sortir de ce mur : joue le cavalier en c6, par-dessus les pions.",
          instruction: 'Joue le cavalier en c6',
          answers: ['Nc6', 'Ne6', 'Nb5', 'Nf5'],
          hint: 'Deux cases vers le haut, une vers la gauche. Le cavalier passe par-dessus tout.',
        },
        {
          kind: 'show',
          say: "Le cavalier vaut trois pions. Il est excellent dans les positions fermées, encombrées de pions, là où les fous et les tours étouffent.",
        },
      ],
    },

    // ── 1.6 Le pion ────────────────────────────────────────────────────────
    {
      id: 'pion',
      title: 'Le pion',
      summary: 'Il avance tout droit mais capture en diagonale. Et il ne recule jamais.',
      level: 'beginner',
      minutes: 5,
      icon: '♙',
      steps: [
        {
          kind: 'show',
          fen: '7k/8/8/8/8/8/3P4/K7 w - - 0 1',
          say: "Le pion est la pièce la plus étrange. Il avance d'une case, tout droit, et jamais en arrière. Un pion qui avance ne revient pas.",
          arrows: [{ from: 'd2', to: 'd3', color: 'green' }],
        },
        {
          kind: 'show',
          say: "Exception : depuis sa case de départ, il peut avancer de deux cases d'un coup. Une seule fois, à son premier déplacement.",
          arrows: [{ from: 'd2', to: 'd4', color: 'blue' }],
        },
        {
          kind: 'play',
          say: "Avance le pion de deux cases, jusqu'en d4.",
          instruction: 'Joue le pion en d4',
          answers: ['d4'],
          hint: 'Attrape le pion et pose-le deux cases plus haut.',
        },
        {
          kind: 'show',
          fen: '7k/8/8/8/2p1p3/8/3P4/K7 w - - 0 1',
          say: "Voici ce qui déroute tout le monde au début : le pion avance tout droit, mais il capture **en diagonale**. Ces deux pions noirs sont à sa portée.",
          highlight: ['c3', 'e3'],
        },
        {
          kind: 'show',
          fen: '7k/8/8/8/8/2p1p3/3P4/K7 w - - 0 1',
          say: "Regarde : le pion blanc en d2 peut capturer en c3 ou en e3, mais il ne peut pas capturer une pièce qui serait juste devant lui en d3. Elle le bloquerait, tout simplement.",
          arrows: [
            { from: 'd2', to: 'c3', color: 'green' },
            { from: 'd2', to: 'e3', color: 'green' },
          ],
        },
        {
          kind: 'play',
          say: "Capture l'un des deux pions.",
          instruction: 'Capture un pion en diagonale',
          answers: ['dxc3', 'dxe3'],
          hint: 'Le pion prend en diagonale, d’une seule case.',
        },
        {
          kind: 'show',
          say: "Le pion vaut un. C'est l'unité de mesure de tout le jeu. Mais un pion qui atteint le bout de l'échiquier se transforme en dame — on y revient dans deux leçons.",
        },
      ],
    },

    // ── 1.7 Le roi ─────────────────────────────────────────────────────────
    {
      id: 'roi',
      title: 'Le roi',
      summary: 'Il se déplace d’une seule case — mais toute la partie tourne autour de lui.',
      level: 'beginner',
      minutes: 4,
      icon: '♚',
      steps: [
        {
          kind: 'show',
          fen: '7k/8/8/8/3K4/8/8/8 w - - 0 1',
          say: "Le roi se déplace d'une seule case, mais dans toutes les directions. Huit cases possibles depuis le centre.",
          highlight: ['c3', 'c4', 'c5', 'd3', 'd5', 'e3', 'e4', 'e5'],
        },
        {
          kind: 'show',
          fen: '4k3/8/8/8/8/8/8/4K2R w K - 0 1',
          say: "Le roi ne se capture jamais. Quand il est attaqué, on dit qu'il est en échec, et il faut absolument parer. Trois façons de le faire : bouger le roi, capturer l'attaquant, ou interposer une pièce.",
        },
        {
          kind: 'show',
          say: "Si aucune de ces trois parades n'existe, c'est échec et mat : la partie est finie. C'est le seul but du jeu.",
        },
        {
          kind: 'show',
          fen: '7k/5K2/8/8/8/8/8/8 w - - 0 1',
          say: "Dernière règle : deux rois ne peuvent jamais se toucher. Ils doivent toujours garder au moins une case entre eux, sans quoi ils se mettraient mutuellement en échec.",
          highlight: ['g8', 'g7', 'g6', 'f6', 'e6', 'e7', 'e8'],
        },
      ],
    },

    // ── 1.8 Le roque ───────────────────────────────────────────────────────
    {
      id: 'roque',
      title: 'Le roque',
      summary: 'Deux pièces qui bougent en un coup : le seul de tout le jeu.',
      level: 'beginner',
      minutes: 5,
      icon: '🏰',
      steps: [
        {
          kind: 'show',
          fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 1',
          say: "Le roque met le roi à l'abri. C'est le seul coup où deux pièces bougent en même temps : le roi et une tour.",
        },
        {
          kind: 'show',
          say: "Le petit roque, du côté du roi : le roi fait deux pas vers la tour, et la tour saute par-dessus lui pour se poser juste à côté. Regarde.",
          arrows: [
            { from: 'e1', to: 'g1', color: 'green' },
            { from: 'h1', to: 'f1', color: 'blue' },
          ],
        },
        {
          kind: 'play',
          say: "Fais le petit roque. Prends le roi et amène-le sur la case g1 : la tour suivra toute seule.",
          instruction: 'Joue le petit roque',
          answers: ['O-O'],
          hint: 'Attrape le roi en e1 et pose-le en g1.',
        },
        {
          kind: 'show',
          say: "Parfait. Ton roi est maintenant derrière trois pions intacts, et ta tour est sortie de son coin. Deux problèmes réglés en un coup.",
          highlight: ['g1', 'f1', 'f2', 'g2', 'h2'],
        },
        {
          kind: 'show',
          say: "Quatre conditions pour pouvoir roquer. Le roi n'a jamais bougé. La tour concernée n'a jamais bougé. Les cases entre eux sont vides. Et le roi n'est pas en échec, ne traverse pas une case attaquée, et n'arrive pas sur une case attaquée.",
        },
        {
          kind: 'show',
          say: "Il existe aussi le grand roque, du côté de la dame : le roi va en c1, la tour de a1 vient en d1. Il met le roi un peu moins à l'abri, mais active la tour plus vite.",
        },
      ],
    },

    // ── 1.9 Prise en passant et promotion ──────────────────────────────────
    {
      id: 'regles-speciales',
      title: 'Prise en passant et promotion',
      summary: 'Les deux règles que personne ne devine tout seul.',
      level: 'beginner',
      minutes: 5,
      icon: '✨',
      steps: [
        {
          kind: 'show',
          fen: '7k/8/8/3pP3/8/8/8/K7 w - d6 0 1',
          say: "La prise en passant. Le pion noir vient d'avancer de deux cases d'un coup, en passant à côté de ton pion. La règle dit que tu peux le capturer comme s'il n'en avait avancé qu'une.",
          highlight: ['d5', 'd6'],
        },
        {
          kind: 'play',
          say: "Ton pion en e5 capture donc en d6, et le pion noir disparaît de d5. Essaie.",
          instruction: 'Capture en passant : joue le pion en d6',
          answers: ['exd6'],
          hint: 'Pose ton pion e5 sur la case d6, juste derrière le pion noir.',
        },
        {
          kind: 'show',
          say: "Attention : cette prise n'est possible qu'**immédiatement**. Si tu joues autre chose, l'occasion est perdue pour toujours.",
        },
        {
          kind: 'show',
          fen: '7k/3P4/8/8/8/8/8/K7 w - - 0 1',
          say: "La promotion, maintenant. Un pion qui atteint la dernière rangée se transforme. On choisit ce qu'on veut : dame, tour, fou ou cavalier.",
          highlight: ['d8'],
        },
        {
          kind: 'play',
          say: "Avance le pion en d8 et prends une dame — c'est le choix dans plus de quatre-vingt-dix-neuf pour cent des cas.",
          instruction: 'Promeus le pion en dame',
          answers: ['d8=Q', 'd8=Q+'],
          hint: 'Avance le pion d’une case, puis choisis la dame dans le menu.',
        },
        {
          kind: 'show',
          say: "Un pion qui vaut un devient une pièce qui en vaut neuf. C'est pour ça qu'en finale, chaque pion compte énormément : c'est une dame en puissance.",
        },
      ],
    },

    // ── 1.10 Échec, mat, pat ───────────────────────────────────────────────
    {
      id: 'echec-mat-pat',
      title: 'Échec, mat et pat',
      summary: 'Comment on gagne, et comment on rate la victoire d’un cheveu.',
      level: 'beginner',
      minutes: 6,
      icon: '👑',
      steps: [
        {
          kind: 'show',
          fen: '4k3/8/8/8/8/8/4R3/4K3 w - - 0 1',
          say: "Une tour sur la colonne du roi adverse : c'est un échec. Le roi noir est attaqué, il doit réagir.",
          arrows: [{ from: 'e2', to: 'e8', color: 'red' }],
        },
        {
          /*
            La seconde tour est **déjà** en h7, et c'est tout l'exercice.

            Elle était en h1, avec les deux tours à leur case de départ, et le
            coup demandé — « Ra8 » — était annoncé comme un mat qu'il n'était
            pas : une tour en h1 contrôle la rangée 1, pas la 7, et le roi noir
            s'en allait tranquillement en d7, e7 ou f7. L'étape suivante
            expliquait pourtant, en toutes lettres, qu'il ne pouvait pas fuir
            « parce que l'autre tour la contrôle ». La phrase était juste ; la
            position ne l'était pas.

            Un débutant n'a aucun moyen de repérer l'erreur : il apprend une
            fausse définition du mat sur l'écran même qui la lui enseigne.
            `check-lessons.mjs` vérifie désormais les suffixes « + » et « # »
            contre la position réelle.
          */
          kind: 'show',
          fen: '4k3/7R/8/8/8/8/8/R3K3 w - - 0 1',
          say: "Avec deux tours, on peut mater. Voici la technique de l'escalier : celle de h7 barre déjà la rangée 7, il ne reste plus qu'à donner échec sur la dernière.",
          arrows: [{ from: 'h7', to: 'a7', color: 'blue' }],
        },
        {
          kind: 'play',
          say: "Joue la tour en a8 : elle donne échec sur la dernière rangée, et l'autre tour lui interdit de descendre.",
          instruction: 'Joue la tour en a8',
          answers: ['Ra8#'],
          hint: 'La tour de a1 monte tout en haut de sa colonne.',
        },
        {
          kind: 'show',
          say: "Échec et mat. Le roi noir est attaqué, il ne peut pas fuir en rangée 7 parce que l'autre tour la contrôle, et il n'a rien pour capturer ou interposer. Partie terminée.",
        },
        {
          kind: 'show',
          fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',
          say: "Maintenant le piège qui fait rager tous les débutants : le pat. Ici, c'est aux Noirs de jouer. Leur roi n'est **pas** en échec. Mais toutes ses cases sont contrôlées, et il n'a aucune autre pièce.",
          highlight: ['h8', 'g8', 'g7', 'h7'],
        },
        {
          kind: 'show',
          say: "Aucun coup légal, et pas d'échec : c'est un pat, et la partie est nulle. Les Blancs avaient une dame de plus et n'ont rien gagné. Retiens bien : quand ton adversaire n'a presque plus rien, laisse-lui toujours une case.",
        },
      ],
    },

    // ── 1.11 La valeur des pièces ──────────────────────────────────────────
    {
      id: 'valeurs',
      title: 'Combien vaut chaque pièce',
      summary: 'Un barème simple qui te dira, à chaque échange, si tu y gagnes.',
      level: 'beginner',
      minutes: 4,
      icon: '⚖️',
      steps: [
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          say: "Le barème universel. Le pion vaut un. Le cavalier et le fou valent trois. La tour vaut cinq. La dame vaut neuf. Le roi n'a pas de valeur : il est au-dessus de tout, on ne l'échange jamais.",
        },
        {
          kind: 'show',
          say: "À quoi ça sert ? À décider en une seconde si un échange est bon. Donner un cavalier pour une tour, c'est trois contre cinq : excellent. On appelle ça gagner la qualité.",
        },
        {
          kind: 'show',
          say: "Mais ces chiffres ne sont qu'un point de départ. Un cavalier bien placé au centre vaut plus qu'une tour coincée dans un coin. Et si tu peux mater, le matériel ne compte plus du tout.",
        },
        {
          kind: 'show',
          fen: 'r1bqkb1r/pppp1Bpp/2n2n2/4p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 4',
          say: "Exemple : les Blancs viennent de donner leur fou, trois points, contre un simple pion. À première vue c'est absurde. Mais le roi noir est attiré hors de son abri, et l'attaque qui suit vaut bien plus que trois points.",
          highlight: ['f7'],
        },
        {
          kind: 'show',
          say: "Voilà toute la beauté du jeu : le matériel est une boussole, pas une loi. Tu apprendras à savoir quand la suivre et quand la trahir.",
        },
      ],
    },
  ],
}
