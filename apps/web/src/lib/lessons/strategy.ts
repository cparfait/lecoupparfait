/**
 * Chapitres 4 à 6 — ouverture, milieu de partie, finale.
 *
 * On passe du « comment ça bouge » au « où le mettre ». Le fil conducteur de
 * tout le chapitre : à chaque étape de la partie, il y a **une** question
 * principale à se poser. En ouverture, ai-je sorti mes pièces. Au milieu, quel
 * est mon plan. En finale, où va mon roi.
 */

import type { Chapter } from './types.ts'

export const openingChapter: Chapter = {
  id: 'ouverture',
  title: 'Bien ouvrir',
  description:
    'Trois principes suffisent à jouer correctement les dix premiers coups de n’importe quelle partie — sans apprendre une seule variante par cœur.',
  level: 'beginner',
  icon: '🌅',
  lessons: [
    {
      id: 'principes-ouverture',
      title: 'Les trois principes',
      summary: 'Centre, développement, sécurité du roi. Tout le reste en découle.',
      level: 'beginner',
      minutes: 7,
      icon: '🧭',
      steps: [
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          say: "L'ouverture a trois objectifs, et trois seulement. Occuper le centre. Sortir ses pièces. Mettre son roi à l'abri. Si tes dix premiers coups servent ces trois buts, tu joues bien.",
          highlight: ['d4', 'd5', 'e4', 'e5'],
        },
        {
          kind: 'play',
          say: 'Premier principe : le centre. Avance un pion central de deux cases. Joue e4.',
          instruction: 'Joue le pion en e4',
          answers: ['e4', 'd4'],
          hint: 'Le pion e2 avance de deux cases.',
        },
        {
          kind: 'show',
          say: 'Excellent. Ce pion contrôle d5 et f5, et il libère la diagonale de ton fou et celle de ta dame. Un seul coup, trois bénéfices.',
          arrows: [
            { from: 'e4', to: 'd5', color: 'green' },
            { from: 'e4', to: 'f5', color: 'green' },
          ],
          reply: 'e5',
        },
        {
          kind: 'play',
          say: 'Deuxième principe : le développement. Sors une pièce mineure vers le centre. Le cavalier en f3 est le coup le plus naturel — il attaque déjà le pion e5.',
          instruction: 'Joue le cavalier en f3',
          answers: ['Nf3'],
          hint: 'Le cavalier de g1 saute en f3.',
          reply: 'Nc6',
        },
        {
          kind: 'play',
          say: 'Continue : sors ton fou. En c4 il vise f7, le point le plus faible du camp noir en début de partie.',
          instruction: 'Joue le fou en c4',
          answers: ['Bc4', 'Bb5'],
          hint: 'Le fou de f1 sort en diagonale.',
          reply: 'Nf6',
        },
        {
          kind: 'play',
          say: 'Troisième principe : la sécurité. Tes deux pièces du côté roi sont sorties, tu peux roquer. Fais-le maintenant.',
          instruction: 'Joue le petit roque',
          answers: ['O-O'],
          hint: 'Attrape le roi et pose-le en g1.',
        },
        {
          kind: 'show',
          say: "En quatre coups tu as un pion au centre, deux pièces développées et un roi en sécurité. C'est une ouverture parfaite, et tu n'as rien appris par cœur.",
        },
      ],
    },
    {
      id: 'erreurs-ouverture',
      title: 'Les quatre erreurs classiques',
      summary: 'Ce que font tous les débutants — et pourquoi ça se paie cher.',
      level: 'beginner',
      minutes: 6,
      icon: '🚫',
      steps: [
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
          say: "Erreur numéro un : sortir la dame trop tôt. C'est tentant, elle est puissante. Voyons ce qui se passe.",
        },
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2',
          say: 'Les Blancs jouent la dame en h5. Elle menace le mat en f7 — mais les Noirs parent facilement, et ensuite ils vont la chasser en développant leurs pièces avec gain de temps.',
        },
        {
          kind: 'show',
          fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 2 3',
          say: 'Les Noirs sortent leur cavalier en défendant. Ils développent, les Blancs non. Chaque coup qui chasse la dame fait gagner un temps aux Noirs.',
        },
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
          say: 'Erreur numéro deux : bouger deux fois la même pièce en ouverture. Chaque coup devrait sortir une pièce **nouvelle**. Il y a huit pièces à développer et seulement une dizaine de coups pour le faire.',
        },
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppppppp/8/8/8/P6P/1PPPPPP1/RNBQKBNR b KQkq - 0 2',
          say: 'Erreur numéro trois : les coups de pions inutiles sur les ailes. a3 et h3 ne développent rien, ne prennent pas le centre, et affaiblissent légèrement la position. Deux coups perdus.',
        },
        {
          kind: 'show',
          fen: 'rnbqkbnr/ppp2ppp/3p4/4p3/4P3/8/PPPPKPPP/RNBQ1BNR b kq - 1 3',
          say: 'Erreur numéro quatre : bouger le roi. Non seulement il reste au centre, mais il perd définitivement le droit de roquer. La partie sera très inconfortable.',
        },
        {
          kind: 'show',
          say: 'Retiens simplement : une pièce nouvelle à chaque coup, vers le centre, et le roque avant le dixième coup. Tu éviteras déjà quatre-vingts pour cent des mauvaises ouvertures.',
        },
      ],
    },
  ],
}

export const middlegameChapter: Chapter = {
  id: 'milieu',
  title: 'Le milieu de partie',
  description:
    'Les pièces sont sorties, le roi est à l’abri… et maintenant ? Voici comment trouver un plan au lieu de jouer au hasard.',
  level: 'intermediate',
  icon: '🏗️',
  lessons: [
    {
      id: 'colonnes-ouvertes',
      title: 'Les colonnes ouvertes',
      summary: 'Une colonne sans pion, c’est une autoroute. Elle appartient aux tours.',
      level: 'intermediate',
      minutes: 6,
      icon: '🛣️',
      steps: [
        {
          kind: 'show',
          fen: 'r2q1rk1/pp2ppbp/2n2np1/2p5/4P3/2N1BN2/PP1Q1PPP/R4RK1 w - - 0 1',
          say: "Une colonne ouverte est une colonne sans aucun pion, ni blanc ni noir. Ici, la colonne d vient de s'ouvrir : c'est le chemin d'entrée dans le camp adverse.",
          highlight: ['d1', 'd2', 'd3', 'd5', 'd6', 'd7', 'd8'],
        },
        {
          kind: 'play',
          say: "Place ta tour dessus. En finale et en milieu de partie, une tour sur colonne ouverte vaut bien plus qu'une tour coincée derrière ses pions.",
          instruction: 'Joue une tour en d1',
          answers: ['Rad1', 'Rfd1'],
          hint: 'Amène une de tes tours sur la case d1, derrière ta dame.',
        },
        {
          kind: 'show',
          say: 'Le principe se prolonge : deux tours doublées sur la même colonne ouverte sont presque irrésistibles. Et une tour qui atteint la septième rangée y dévore les pions.',
        },
        {
          kind: 'show',
          say: "Quand aucune colonne n'est ouverte, cherche une colonne **semi-ouverte** : sans pion à toi, mais avec un pion adverse. Ce pion devient une cible fixe.",
        },
      ],
    },
    {
      id: 'avant-poste',
      title: 'L’avant-poste',
      summary: 'Une case avancée où ton cavalier est intouchable. Le rêve de toute pièce.',
      level: 'intermediate',
      minutes: 5,
      icon: '🏰',
      steps: [
        {
          kind: 'show',
          fen: 'r1bq1rk1/pp3ppp/2n1pn2/2ppN3/3P4/2P1P3/PP3PPP/RNBQ1RK1 w - - 0 1',
          say: "Un avant-poste, c'est une case avancée dans le camp adverse, protégée par un de tes pions, et qu'aucun pion adverse ne peut jamais attaquer.",
          highlight: ['e5'],
        },
        {
          kind: 'show',
          say: 'Le cavalier en e5 est ici sur un avant-poste : aucun pion noir ne pourra jamais venir le chasser, parce que les pions d et f noirs sont déjà passés ou absents. Il restera là toute la partie.',
          circles: [{ square: 'e5', color: 'green' }],
        },
        {
          kind: 'show',
          say: "Un cavalier sur avant-poste au cœur du camp adverse vaut souvent une tour. Cherche systématiquement ces cases : elles apparaissent dès qu'un adversaire avance ses pions.",
        },
      ],
    },
    {
      id: 'securite-roi',
      title: 'La sécurité du roi',
      summary: 'Trois pions intacts devant lui, ou l’attaque arrive.',
      level: 'intermediate',
      minutes: 6,
      icon: '🛡️',
      steps: [
        {
          kind: 'show',
          fen: 'r1bq1rk1/ppp2ppp/2n2n2/2bpp3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 1',
          say: "Un roi roqué avec ses trois pions intacts devant lui est très difficile à attaquer. C'est la configuration à préserver.",
          highlight: ['f7', 'g7', 'h7'],
        },
        {
          kind: 'show',
          fen: 'r1bq1rk1/ppp2p1p/2n2np1/2bpp3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 1',
          say: 'Chaque pion qui avance devant le roi crée une faiblesse permanente. Ici g6 a affaibli les cases f6 et h6, et surtout la grande diagonale.',
          highlight: ['f6', 'h6'],
        },
        {
          kind: 'show',
          say: "Règle simple : n'avance les pions devant ton roi que si tu y es obligé, ou pour faire une case d'air. Chaque poussée est une porte que tu ouvres.",
        },
        {
          kind: 'show',
          say: "Et le corollaire : quand tu attaques un roi, compte ses défenseurs. Si tu as plus de pièces attaquantes qu'il n'a de défenseurs autour de son roi, lance l'attaque. Sinon, améliore d'abord tes pièces.",
        },
      ],
    },
  ],
}

export const endgameChapter: Chapter = {
  id: 'finale',
  title: 'Les finales',
  description:
    'Peu de pièces, beaucoup de précision. C’est là que se gagnent les parties égales — et là que la plupart des joueurs de club n’ont jamais rien appris.',
  level: 'intermediate',
  icon: '🏁',
  lessons: [
    {
      id: 'roi-actif',
      title: 'Le roi devient une pièce',
      summary: 'Toute la partie il se cachait. En finale, il monte au front.',
      level: 'intermediate',
      minutes: 5,
      icon: '🚶',
      steps: [
        {
          kind: 'show',
          fen: '8/5k2/8/8/8/8/5K2/8 w - - 0 1',
          say: "Tant que les dames sont sur l'échiquier, le roi se cache. Dès qu'elles disparaissent, tout change : le roi devient une pièce d'attaque, à peu près aussi forte qu'un cavalier.",
        },
        {
          kind: 'show',
          fen: '8/8/8/3k4/8/8/8/4K3 w - - 0 1',
          say: 'En finale, le premier réflexe est toujours le même : centraliser son roi. Un roi au centre atteint les deux ailes ; un roi dans son coin arrive toujours trop tard.',
          arrows: [{ from: 'e1', to: 'e4', color: 'green' }],
        },
        {
          kind: 'play',
          say: 'Avance ton roi vers le centre.',
          instruction: 'Avance le roi',
          answers: ['Ke2', 'Kd2', 'Kf2', 'Kd1', 'Kf1'],
          hint: 'Le roi monte d’une case vers le centre.',
        },
        {
          kind: 'show',
          say: "Un joueur qui oublie d'activer son roi en finale perd des positions parfaitement tenables. C'est sans doute l'erreur la plus coûteuse à partir de 1200 Elo.",
        },
      ],
    },
    {
      id: 'opposition',
      title: 'L’opposition',
      summary: 'Le duel de rois qui décide toutes les finales de pions.',
      level: 'intermediate',
      minutes: 7,
      icon: '⚔️',
      steps: [
        {
          kind: 'show',
          fen: '8/8/4k3/8/4K3/8/8/8 w - - 0 1',
          say: "Deux rois face à face, une case entre eux : c'est l'opposition. Et voici le paradoxe : celui qui **doit** jouer la perd, parce qu'il est obligé de céder du terrain.",
          highlight: ['e4', 'e6', 'e5'],
        },
        {
          kind: 'show',
          say: "Ici c'est aux Blancs de jouer, donc les Noirs ont l'opposition. Le roi blanc va devoir s'écarter, et le roi noir avancera.",
        },
        {
          kind: 'show',
          fen: '8/8/8/4k3/4P3/4K3/8/8 b - - 0 1',
          say: "Voilà pourquoi c'est décisif. Roi et pion contre roi : si le roi défenseur garde l'opposition devant le pion, la partie est nulle. S'il la perd, le pion passe.",
        },
        {
          kind: 'show',
          fen: '8/8/8/3k4/8/3KP3/8/8 w - - 0 1',
          say: "La technique gagnante : pousse ton **roi** avant ton pion. Le roi ouvre la voie, le pion suit. Pousser le pion en premier est l'erreur classique qui transforme un gain en nulle.",
          arrows: [{ from: 'd3', to: 'd4', color: 'green' }],
        },
        {
          kind: 'show',
          say: 'Retiens la formule : en finale de pions, le roi passe devant. Toujours.',
        },
      ],
    },
    {
      id: 'regle-du-carre',
      title: 'La règle du carré',
      summary: 'Un coup d’œil suffit pour savoir si un roi rattrape un pion.',
      level: 'intermediate',
      minutes: 5,
      icon: '⬜',
      steps: [
        {
          kind: 'show',
          fen: '8/8/8/8/7k/8/P7/K7 w - - 0 1',
          say: 'Ton pion en a2 veut aller à dame. Le roi noir en h4 est loin. Le rattrape-t-il ? Il existe une astuce pour répondre en une seconde, sans compter.',
        },
        {
          kind: 'show',
          say: "Trace un carré dont un côté va du pion jusqu'à sa case de promotion. Ici, du pion a2 jusqu'à a8 : six cases. Le carré fait donc six sur six, de a2 à f8.",
          highlight: ['a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'f8', 'a8'],
        },
        {
          kind: 'show',
          say: "La règle : si le roi adverse est **dans** ce carré, ou peut y entrer en jouant, il rattrape le pion. S'il est dehors et que c'est à toi de jouer, le pion passe.",
        },
        {
          kind: 'show',
          say: "Ici le roi noir est en h4, à l'extérieur du carré. Si tu pousses le pion, il ne le rattrapera jamais. Une règle géométrique, aucun calcul.",
        },
        {
          kind: 'show',
          say: 'Attention : le carré rétrécit à chaque poussée du pion, mais le pion qui part de sa deuxième rangée peut avancer de deux cases — le carré se compte alors depuis la troisième rangée.',
        },
      ],
    },
    {
      id: 'pion-passe',
      title: 'Le pion passé',
      summary: 'Aucun pion adverse ne peut plus l’arrêter. En finale, il vaut de l’or.',
      level: 'intermediate',
      minutes: 6,
      icon: '🏃',
      steps: [
        {
          kind: 'show',
          fen: '8/8/4k3/8/2P5/8/5K2/8 w - - 0 1',
          say: "Un pion passé est un pion qu'aucun pion adverse ne peut plus arrêter : ni sur sa colonne, ni sur les colonnes voisines. Il n'a plus qu'à courir.",
          highlight: ['c4', 'c5', 'c6', 'c7', 'c8'],
        },
        {
          kind: 'show',
          say: "En finale, un pion passé oblige l'adversaire à immobiliser une pièce pour le surveiller. C'est un avantage énorme, même s'il ne va jamais à dame.",
        },
        {
          kind: 'show',
          fen: '8/8/8/8/2P5/8/1P3K2/4k3 w - - 0 1',
          say: "Encore mieux : le pion passé **protégé**, soutenu par un autre pion. L'adversaire ne peut ni le prendre ni le bloquer durablement avec son roi.",
          highlight: ['c4'],
        },
        {
          kind: 'show',
          say: "Et la règle de Tarrasch, à retenir absolument : les tours se placent **derrière** les pions passés. Derrière le tien pour le pousser, derrière celui de l'adversaire pour le retenir.",
        },
      ],
    },
  ],
}
