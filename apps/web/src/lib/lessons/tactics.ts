/**
 * Chapitres 2 et 3 — mats élémentaires et tactique.
 *
 * C'est ici qu'un débutant gagne le plus vite. La très grande majorité des
 * parties en dessous de 1500 Elo se décide sur une pièce laissée en prise ou
 * une fourchette non vue : reconnaître ces cinq ou six figures fait gagner
 * plusieurs centaines de points de classement, bien avant toute connaissance
 * d'ouverture.
 */

import type { Chapter } from './types.ts'

export const matesChapter: Chapter = {
  id: 'mats',
  title: 'Savoir mater',
  description:
    'Gagner une dame ne sert à rien si l’on ne sait pas conclure. Voici les mats qu’il faut connaître par cœur, du plus simple au plus utile.',
  level: 'beginner',
  icon: '👑',
  lessons: [
    {
      id: 'mat-couloir',
      title: 'Le mat du couloir',
      summary: 'Le mat le plus fréquent de tous. Et le plus facile à subir.',
      level: 'beginner',
      minutes: 5,
      icon: '🚪',
      steps: [
        {
          kind: 'show',
          fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
          say: "Regarde le roi noir. Il a roqué, il est bien à l'abri… sauf que ses propres pions lui bouchent toute sortie. Il est enfermé sur sa dernière rangée.",
          highlight: ['f7', 'g7', 'h7'],
        },
        {
          kind: 'play',
          say: 'Une tour qui arrive sur cette rangée fait mat immédiatement. Vas-y.',
          instruction: 'Trouve le mat en un coup',
          answers: ['Ra8#'],
          hint: 'La tour monte tout en haut de sa colonne.',
        },
        {
          kind: 'show',
          say: "Échec et mat. Le roi ne peut pas monter — il est déjà en haut — et pas descendre, ses pions occupent les cases. Ça s'appelle le mat du couloir.",
        },
        {
          kind: 'show',
          fen: '6k1/5pp1/7p/8/8/8/8/R5K1 w - - 0 1',
          say: "La parade tient en un coup : avancer un pion pour créer une case d'air. Ici les Noirs ont joué h6, et leur roi peut désormais s'échapper en h7.",
          highlight: ['h7'],
        },
        {
          kind: 'show',
          say: "Prends l'habitude, dès que tes tours quittent la dernière rangée : fais une case d'air à ton roi. Ça t'évitera de perdre des parties gagnées.",
        },
      ],
    },
    {
      id: 'mat-escalier',
      title: 'Le mat de l’escalier',
      summary: 'Deux tours, aucun calcul : la technique se répète jusqu’au mat.',
      level: 'beginner',
      minutes: 6,
      icon: '🪜',
      steps: [
        {
          kind: 'show',
          // Le roi noir démarre en rangée 7 : c'est ce qui rend l'escalier
          // visible. Placé d'emblée en rangée 8, il n'a nulle part où monter et
          // la leçon perd son sujet.
          fen: '8/4k3/8/8/8/8/R7/1R5K w - - 0 1',
          say: "Deux tours suffisent à mater un roi nu, sans même l'aide du sien. Le principe : une tour repousse le roi, l'autre l'empêche de revenir.",
        },
        {
          kind: 'play',
          say: 'Commence par donner échec avec la tour de a2, sur la rangée 7. Le roi noir devra monter.',
          instruction: 'Joue la tour en a7',
          answers: ['Ra7+'],
          hint: 'La tour de a2 monte jusqu’en a7.',
        },
        {
          kind: 'show',
          say: "Le roi noir n'a d'autre choix que de monter en rangée 8. La tour de a7 lui interdit désormais de redescendre.",
          reply: 'Ke8',
        },
        {
          kind: 'play',
          say: "Maintenant l'autre tour vient donner échec sur la rangée 8. C'est mat.",
          instruction: 'Joue la tour en b8',
          answers: ['Rb8#'],
          hint: 'La tour de b1 monte tout en haut.',
        },
        {
          kind: 'show',
          say: "Voilà l'escalier : les tours montent une marche à tour de rôle, le roi recule, et il finit acculé. Aucun calcul, juste la méthode. Quand le roi s'approche d'une tour, on l'éloigne à l'autre bout de sa rangée.",
        },
      ],
    },
    {
      id: 'mat-dame-roi',
      title: 'Mater avec la dame',
      summary: 'La finale la plus fréquente après une promotion. À maîtriser absolument.',
      level: 'beginner',
      minutes: 7,
      icon: '♕',
      steps: [
        {
          kind: 'show',
          fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1',
          say: 'Roi et dame contre roi seul. La méthode : on rétrécit la cage autour du roi adverse avec la dame, puis on amène son propre roi pour donner le coup final.',
        },
        {
          // Le texte disait « place ta dame » sur une étape où rien n'est
          // jouable, et parlait d'un cavalier sur un échiquier qui n'en a
          // aucun. On cherchait la pièce au lieu de voir la figure.
          kind: 'show',
          say: "Une astuce de repérage, et elle porte un nom trompeur : **le saut de cavalier**. Il n'y a aucun cavalier ici — c'est de sa **forme de déplacement** qu'on parle, le L. Les huit cases marquées sont à un saut de cavalier du roi noir. Une dame posée sur l'une d'elles lui retire presque tout, sans jamais l'enfermer complètement : c'est ce qui évite le pat.",
          highlight: ['d3', 'f3', 'c4', 'g4', 'c6', 'g6', 'd7', 'f7'],
        },
        {
          kind: 'play',
          say: "Parmi ces huit cases, ta dame en d1 n'en atteint que quatre : d3, f3, g4 et d7. Prends **d3** — deux cases droit devant elle.",
          instruction: 'Joue la dame en d3',
          answers: ['Qd3'],
          hint: 'La dame monte de deux cases sur sa colonne : de d1 à d3.',
          highlight: ['d3'],
        },
        {
          kind: 'show',
          say: "Regarde le résultat : le roi noir avait huit cases, il n'en a plus que trois — e6, f6 et f4. Et il n'est pas en échec, donc pas de pat. Tu répètes l'opération à chaque fois qu'il bouge, et la cage se referme d'elle-même.",
        },
        {
          kind: 'show',
          fen: '8/8/8/8/8/5k2/5Q2/6K1 b - - 0 1',
          say: "Attention au piège : ici, la dame en f2 colle le roi noir, mais c'est aux Noirs de jouer et ils n'ont aucun coup. Pat. Nulle. Une dame de plus, et zéro point.",
        },
        {
          kind: 'show',
          say: "La règle d'or : ne colle jamais ta dame au roi adverse sans que ton propre roi la défende. Amène-le d'abord, mate ensuite.",
        },
      ],
    },
  ],
}

export const tacticsChapter: Chapter = {
  id: 'tactique',
  title: 'La tactique',
  description:
    'Les figures qui gagnent du matériel. C’est le chapitre qui fait le plus progresser un joueur en dessous de 1500 : la plupart des parties se perdent sur l’une de ces six choses.',
  level: 'beginner',
  icon: '⚡',
  lessons: [
    {
      id: 'piece-en-prise',
      title: 'La pièce en prise',
      summary: 'La cause numéro un des parties perdues. Un réflexe de deux secondes suffit.',
      level: 'beginner',
      minutes: 5,
      icon: '🎯',
      steps: [
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppp1ppp/8/4p3/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 2',
          say: "Une pièce en prise, c'est une pièce attaquée que personne ne défend. Ici, le pion noir en e5 est attaqué par le cavalier, et aucune pièce noire ne le protège.",
          highlight: ['e5'],
          arrows: [{ from: 'f3', to: 'e5', color: 'red' }],
        },
        {
          kind: 'play',
          say: "Prends-le. C'est gratuit.",
          instruction: 'Capture le pion en e5',
          answers: ['Nxe5'],
          hint: 'Le cavalier saute de f3 en e5.',
        },
        {
          kind: 'show',
          say: "Voilà le réflexe à prendre. Avant **chaque** coup, pose-toi deux questions. Un : qu'est-ce que mon adversaire attaque ? Deux : qu'est-ce qu'il laisse sans défense ?",
        },
        {
          kind: 'show',
          fen: 'r1bqkbnr/pppp1ppp/2n5/4N3/8/8/PPPPPPPP/RNBQKB1R b KQkq - 0 3',
          say: "Attention quand même : ici les Noirs ont défendu leur pion avec le cavalier c6. Reprendre serait maintenant un simple échange, plus un cadeau. Une pièce attaquée **et défendue** n'est pas en prise.",
          highlight: ['e5'],
          arrows: [{ from: 'c6', to: 'e5', color: 'green' }],
        },
      ],
    },
    {
      id: 'fourchette',
      title: 'La fourchette',
      summary: 'Une pièce, deux cibles. On ne peut pas tout sauver.',
      level: 'beginner',
      minutes: 6,
      icon: '🍴',
      steps: [
        {
          kind: 'show',
          fen: 'r3k3/8/8/8/8/8/8/4K1N1 w - - 0 1',
          say: "Une fourchette, c'est une pièce qui en attaque deux d'un coup. Le cavalier est le champion toutes catégories, parce qu'il saute et qu'on le voit mal venir.",
        },
        {
          kind: 'show',
          say: 'Regarde : si le cavalier atteint la case c7, il attaque en même temps le roi en e8 et la tour en a8.',
          highlight: ['c7'],
          arrows: [
            { from: 'c7', to: 'e8', color: 'red' },
            { from: 'c7', to: 'a8', color: 'red' },
          ],
        },
        {
          // L'exercice se joue depuis une position où la fourchette est à un
          // saut : c'est la compétence visée — la **reconnaître** — et non
          // promener le cavalier pendant quatre coups.
          kind: 'play',
          fen: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1',
          say: 'À toi de jouer. Le cavalier est maintenant en b5, à un saut de c7. Pose-le sur la case et regarde ce qui arrive aux Noirs.',
          instruction: 'Joue le cavalier en c7',
          answers: ['Nc7+'],
          hint: 'Depuis b5, le cavalier saute en c7 : échec au roi, et la tour est visée en même temps.',
          reply: 'Kf7',
        },
        {
          kind: 'play',
          say: "Le roi noir a dû parer l'échec — il n'avait pas le choix, et c'est là toute la force de la fourchette royale : pendant qu'il se sauve, il abandonne la tour. Prends-la.",
          instruction: 'Prends la tour en a8',
          answers: ['Nxa8'],
          hint: 'Le cavalier de c7 va manger la tour en a8.',
        },
        {
          kind: 'show',
          fen: '4k3/8/2n5/8/4P3/8/8/4K3 b - - 0 1',
          say: "Voici l'autre situation : la fourchette qu'on **subit**. Ce cavalier noir en c6 est à un saut de e5 et d4. Chaque fois qu'un cavalier adverse approche de tes pièces, cherche les cases d'où il pourrait en toucher deux.",
          highlight: ['e5', 'd4', 'b4', 'a5', 'a7', 'b8', 'd8', 'e7'],
        },
        {
          kind: 'show',
          say: "La fourchette la plus rentable est celle qui touche le roi : l'adversaire est **obligé** de parer l'échec, et l'autre pièce tombe. C'est ce qu'on appelle une fourchette royale.",
        },
      ],
    },
    {
      id: 'clouage',
      title: 'Le clouage',
      summary: 'Une pièce coincée devant une plus précieuse ne peut plus bouger.',
      level: 'beginner',
      minutes: 6,
      icon: '📌',
      steps: [
        {
          kind: 'show',
          fen: 'rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 0 4',
          say: "Le clouage. Une pièce est coincée devant une pièce plus précieuse : si elle bouge, l'autre tombe.",
        },
        {
          kind: 'play',
          say: 'Joue le fou en g5. Il vise le cavalier f6, et juste derrière ce cavalier se trouve la dame noire en d8.',
          instruction: 'Joue le fou en g5',
          answers: ['Bg5'],
          hint: 'Le fou de c1 monte en diagonale : d2, e3, f4, g5.',
        },
        {
          kind: 'show',
          say: "Voilà le clouage. Le cavalier f6 ne peut plus bouger sans livrer la dame. Il est devenu une cible immobile : tu peux l'attaquer autant que tu veux, il ne s'échappera pas.",
          arrows: [{ from: 'g5', to: 'd8', color: 'red' }],
        },
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq - 0 2',
          say: 'Il existe deux sortes de clouages. Le clouage **relatif**, comme celui du cavalier devant la dame : la pièce peut légalement bouger, mais ça coûte cher.',
        },
        {
          kind: 'show',
          fen: 'rnb1kbnr/pppp1ppp/8/4p3/1q2P3/2N5/PPPP1PPP/R1BQKBNR w KQkq - 0 3',
          say: "Et le clouage **absolu** : quand c'est le roi qui est derrière. La pièce ne peut alors pas bouger du tout, ce serait illégal. Ici le cavalier c3 est cloué par la dame noire en b4.",
          arrows: [{ from: 'b4', to: 'e1', color: 'red' }],
        },
        {
          kind: 'show',
          say: 'Réflexe à acquérir : quand une pièce adverse est clouée, attaque-la une fois de plus. Elle ne peut pas fuir, elle finira par tomber.',
        },
      ],
    },
    {
      id: 'enfilade',
      title: 'L’enfilade',
      summary: 'Le clouage à l’envers : la pièce de valeur est devant, et elle doit fuir.',
      level: 'intermediate',
      minutes: 5,
      icon: '🎣',
      steps: [
        {
          kind: 'show',
          fen: '4k3/8/8/8/8/4r3/8/4RK2 w - - 0 1',
          say: "L'enfilade, c'est le clouage inversé : la pièce précieuse est devant, la moins précieuse derrière. On attaque la première, elle doit s'écarter, et on prend la seconde.",
        },
        {
          kind: 'show',
          fen: '3rk3/8/8/8/8/8/8/3RK3 w - - 0 1',
          say: 'Ici, roi noir en e8 et tour noire en d8, tous deux sur la même rangée. Une tour blanche qui arrive sur cette rangée donne échec au roi… et vise la tour derrière.',
        },
        {
          kind: 'show',
          fen: '4k3/8/8/8/8/8/8/R2rK3 w - - 0 1',
          say: "Variante en ligne. La tour blanche en a1 vise la tour noire en d1, mais c'est le roi blanc qui est derrière. Voilà ce qu'il ne faut jamais laisser arriver.",
        },
        {
          kind: 'show',
          say: "En pratique, l'enfilade se cherche quand deux pièces adverses sont alignées : même rangée, même colonne, même diagonale. Prends le réflexe de regarder ces alignements à chaque coup.",
        },
      ],
    },
    {
      id: 'decouverte',
      title: 'L’attaque à la découverte',
      summary: 'Une pièce s’écarte et démasque une autre. Deux menaces d’un seul coup.',
      level: 'intermediate',
      minutes: 6,
      icon: '🎭',
      steps: [
        {
          kind: 'show',
          fen: '4k3/8/8/4N3/8/8/8/4RK2 w - - 0 1',
          say: 'Regarde cet alignement : la tour blanche en e1, le cavalier en e5, et le roi noir en e8. Tous les trois sur la colonne e.',
          arrows: [{ from: 'e1', to: 'e8', color: 'blue' }],
        },
        {
          kind: 'show',
          say: "Le cavalier bloque la ligne de la tour. Mais s'il s'écarte, la tour donne échec instantanément. Et le cavalier, lui, part où il veut : il peut aller capturer quelque chose pendant que l'adversaire pare l'échec.",
        },
        {
          kind: 'play',
          say: 'Fais partir le cavalier en c6 : il donne échec par découverte tout en attaquant depuis sa nouvelle case.',
          instruction: 'Joue le cavalier en c6',
          answers: ['Nc6+', 'Nd7+', 'Nf7+', 'Ng6+', 'Nc4+', 'Nd3+', 'Nf3+', 'Ng4+'],
          hint: 'N’importe quel déplacement du cavalier libère la colonne. Choisis-en un.',
        },
        {
          kind: 'show',
          say: "C'est la tactique la plus rentable du jeu, parce que l'adversaire ne peut parer qu'une menace à la fois — et l'échec est toujours prioritaire.",
        },
        {
          kind: 'show',
          fen: '4k3/8/8/8/8/4N3/8/4RK2 w - - 0 1',
          say: "Le sommet du genre est l'échec double : le cavalier donne échec **et** démasque la tour. Là, plus aucune parade ne fonctionne. Ni capture, ni interposition : le roi doit bouger, un point c'est tout.",
        },
      ],
    },
    {
      id: 'elimination-defenseur',
      title: 'Éliminer le défenseur',
      summary: 'Une pièce bien défendue ? Commence par supprimer son gardien.',
      level: 'intermediate',
      minutes: 5,
      icon: '🗡️',
      steps: [
        {
          kind: 'show',
          fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
          say: 'Le pion e5 est défendu par le cavalier c6. On ne peut donc pas simplement le prendre. Mais que se passe-t-il si ce cavalier disparaît ?',
          highlight: ['e5', 'c6'],
          arrows: [{ from: 'c6', to: 'e5', color: 'green' }],
        },
        {
          kind: 'show',
          say: "C'est toute l'idée : au lieu d'attaquer la cible, on s'en prend à son défenseur. Une fois le gardien parti, la cible tombe d'elle-même.",
        },
        {
          kind: 'show',
          fen: 'r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
          say: "Voilà pourquoi la partie espagnole commence par le fou en b5 : il attaque le cavalier c6, qui défend le pion e5. C'est une menace indirecte, et elle structure toute l'ouverture.",
          arrows: [
            { from: 'b5', to: 'c6', color: 'red' },
            { from: 'c6', to: 'e5', color: 'green' },
          ],
        },
        {
          kind: 'show',
          say: "Quand une pièce adverse te bloque, ne t'acharne pas dessus. Demande-toi plutôt : qui la protège ? Et attaque celui-là.",
        },
      ],
    },
    {
      id: 'sacrifice',
      title: 'Le sacrifice',
      summary: 'Donner du matériel pour obtenir mieux : du temps, des lignes, un roi à nu.',
      level: 'advanced',
      minutes: 6,
      icon: '💥',
      steps: [
        {
          kind: 'show',
          fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 5',
          say: "Un sacrifice, c'est donner volontairement du matériel pour obtenir autre chose : ouvrir une ligne, exposer un roi, gagner trois temps de développement.",
        },
        {
          kind: 'show',
          fen: 'r1bqkb1r/pppp1Bpp/2n2n2/4p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 4',
          say: "Le sacrifice classique en f7 : le fou se donne pour attirer le roi noir hors de son abri. Trois points contre un pion — mais le roi va se retrouver au milieu de l'échiquier.",
          highlight: ['f7'],
        },
        {
          kind: 'show',
          say: "Comment savoir si un sacrifice est correct ? Compte ce que tu obtiens **en coups**, pas en points. Si l'adversaire doit passer trois coups à ramener son roi, tu as trois coups d'avance pour amener tes pièces.",
        },
        {
          kind: 'show',
          say: "Règle de prudence pour un débutant : ne sacrifie que si tu vois la suite jusqu'au bout. Un sacrifice qu'on ne sait pas justifier n'est pas un sacrifice, c'est une pièce en moins.",
        },
      ],
    },
  ],
}
