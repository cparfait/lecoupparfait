/**
 * Chapitre 7 — Un répertoire d'ouvertures.
 *
 * Parti pris : **aucune variante à mémoriser**. Ce chapitre enseigne l'*idée*
 * de chaque grande ouverture — ce que chaque camp cherche à obtenir, où vont
 * les pièces, quel plan suit — parce que c'est ce qui reste quand l'adversaire
 * sort de la théorie au quatrième coup, ce qui arrive presque toujours.
 *
 * Six ouvertures suffisent à couvrir l'immense majorité des parties : trois
 * après 1.e4, trois après 1.d4.
 */

import type { Chapter } from './types.ts'

export const repertoireChapter: Chapter = {
  id: 'repertoire',
  title: 'Comprendre les ouvertures',
  description:
    'Les six ouvertures qu’on rencontre le plus, expliquées par leurs idées et non par leurs variantes. Objectif : savoir quoi faire au coup 8, même quand l’adversaire a joué autre chose que le livre.',
  level: 'intermediate',
  icon: '📖',
  lessons: [
    // ── 7.1 Partie italienne ────────────────────────────────────────────────
    {
      id: 'italienne',
      title: 'La partie italienne',
      summary: 'La plus ancienne, la plus naturelle. Toutes les pièces vers le centre, sans détour.',
      level: 'beginner',
      minutes: 6,
      icon: '🇮🇹',
      steps: [
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          say: "L'italienne, c'est le développement le plus direct qui existe. Pion au centre, cavalier, fou. Trois coups, trois principes respectés.",
        },
        {
          kind: 'play',
          say: "Commence par le pion roi.",
          instruction: 'Joue e4',
          answers: ['e4'],
          reply: 'e5',
        },
        {
          kind: 'play',
          say: "Cavalier f3. Il attaque le pion e5 et vise le centre.",
          instruction: 'Joue le cavalier en f3',
          answers: ['Nf3'],
          reply: 'Nc6',
        },
        {
          kind: 'play',
          say: "Et maintenant le coup qui donne son nom à l'ouverture : fou c4. Il pointe vers f7, la case la plus faible du camp noir tant que le roi n'a pas roqué.",
          instruction: 'Joue le fou en c4',
          answers: ['Bc4'],
          hint: 'Le fou de f1 sort en diagonale jusqu’en c4.',
          reply: 'Bc5',
        },
        {
          kind: 'show',
          say: "Voilà la position type. Les deux camps ont un pion au centre, un cavalier et un fou dehors. C'est le Giuoco Piano — « le jeu tranquille ».",
          highlight: ['c4', 'c5', 'f7', 'f2'],
        },
        {
          kind: 'show',
          say: "L'idée blanche pour la suite : roquer, jouer c3 et d4 pour construire un gros centre de pions. L'idée noire : la même chose en miroir, avec c6 et d5.",
          arrows: [
            { from: 'c2', to: 'c3', color: 'green' },
            { from: 'd2', to: 'd4', color: 'green' },
          ],
        },
        {
          kind: 'show',
          say: "Le piège à connaître : ne joue jamais la dame en h5 pour tenter un mat rapide. Les Noirs parent et chassent la dame en développant. Tu perds trois temps, ils en gagnent trois.",
        },
      ],
    },

    // ── 7.2 Partie espagnole ────────────────────────────────────────────────
    {
      id: 'espagnole',
      title: 'La partie espagnole',
      summary: 'L’ouverture la plus jouée au plus haut niveau depuis cent cinquante ans.',
      level: 'intermediate',
      minutes: 6,
      icon: '🇪🇸',
      steps: [
        {
          kind: 'show',
          fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
          say: "Même début que l'italienne, mais le fou va en b5 au lieu de c4. Ce petit changement transforme toute la partie.",
        },
        {
          kind: 'play',
          say: "Joue le fou en b5. Il attaque le cavalier c6, qui défend le pion e5.",
          instruction: 'Joue le fou en b5',
          answers: ['Bb5'],
          reply: 'a6',
        },
        {
          kind: 'show',
          say: "Les Noirs répondent presque toujours a6 pour chasser le fou. C'est le coup Morphy, et c'est une question : le fou prend-il, ou recule-t-il ?",
          highlight: ['a6', 'b5'],
        },
        {
          kind: 'show',
          say: "Prendre en c6 donne aux Noirs des pions doublés mais la paire de fous : c'est la variante d'échange, jouable et simple. Reculer en a4 garde la tension : c'est la ligne principale, et celle de tous les champions du monde.",
          arrows: [
            { from: 'b5', to: 'c6', color: 'orange' },
            { from: 'b5', to: 'a4', color: 'green' },
          ],
        },
        {
          kind: 'show',
          say: "L'idée profonde de l'espagnole : la menace sur c6 n'est pas immédiate — reprendre le pion e5 tout de suite perd une pièce sur d4. C'est une pression **à long terme** qui gêne les Noirs pendant vingt coups.",
        },
        {
          kind: 'show',
          say: "Retiens surtout ceci : dans l'espagnole, les Blancs jouent lentement. c3, d3, Cbd2, Cf1, Cg3 — le cavalier fait tout le tour de l'échiquier pour rejoindre l'attaque. On appelle ça la manœuvre espagnole.",
        },
      ],
    },

    // ── 7.3 Défense sicilienne ──────────────────────────────────────────────
    {
      id: 'sicilienne',
      title: 'La défense sicilienne',
      summary: 'La réponse la plus combative à 1.e4. Déséquilibrée dès le premier coup.',
      level: 'intermediate',
      minutes: 7,
      icon: '⚔️',
      steps: [
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
          say: "Face à 1.e4, la sicilienne répond c5. Pas e5, qui donne une partie symétrique : c5, qui crée un déséquilibre immédiat.",
        },
        {
          kind: 'play',
          say: "Joue c5. Ce coup unique ouvre la porte à des milliers de variantes — mais l'idée derrière est toujours la même.",
          instruction: 'Joue le pion en c5',
          answers: ['c5'],
          orientation: 'b',
          reply: 'Nf3',
        },
        {
          kind: 'show',
          say: "Pourquoi c5 plutôt que e5 ? Parce que le pion c attaque d4 sans bloquer la diagonale du fou noir, et surtout parce qu'après l'échange en d4, les Noirs se retrouvent avec deux pions centraux contre un.",
          orientation: 'b',
          highlight: ['c5', 'd4'],
        },
        {
          kind: 'show',
          fen: 'rnbqkbnr/pp1ppppp/8/8/3pP3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 4',
          orientation: 'b',
          say: "Après d4 cxd4, les Blancs reprennent avec le cavalier. Regarde la structure : les Noirs ont échangé un pion d'aile contre un pion central. C'est un petit gain permanent.",
        },
        {
          kind: 'show',
          orientation: 'b',
          say: "En contrepartie, les Blancs ont de l'avance au développement et la colonne d ouverte. La sicilienne est un pari : du matériel structurel contre du temps.",
        },
        {
          kind: 'show',
          orientation: 'b',
          say: "Les Blancs attaquent généralement sur l'aile roi, les Noirs sur l'aile dame le long de la colonne c. Ce sont deux courses parallèles, et c'est ce qui rend ces parties si tranchantes.",
          arrows: [
            { from: 'g2', to: 'g4', color: 'red' },
            { from: 'c8', to: 'c1', color: 'green' },
          ],
        },
        {
          kind: 'show',
          orientation: 'b',
          say: "Si tu débutes, retiens simplement : joue c5, d6, Cf6, Cc6, e6, puis Fe7 et roque. C'est le dispositif Scheveningue, et il tient face à tout.",
        },
      ],
    },

    // ── 7.4 Défense française ───────────────────────────────────────────────
    {
      id: 'francaise',
      title: 'La défense française',
      summary: 'Solide comme un roc, avec un seul défaut — et un plan pour le corriger.',
      level: 'intermediate',
      minutes: 6,
      icon: '🇫🇷',
      steps: [
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
          say: "La française répond e6 à 1.e4. Un coup modeste, qui prépare d5 pour contester le centre immédiatement.",
        },
        {
          kind: 'play',
          say: "Joue e6. Un coup discret, mais qui prépare la vraie réponse au coup suivant.",
          instruction: 'Joue le pion en e6',
          answers: ['e6'],
          orientation: 'b',
          reply: 'd4',
        },
        {
          kind: 'play',
          say: "Et maintenant d5, le vrai coup de la française : les Noirs attaquent le centre blanc de front.",
          instruction: 'Joue le pion en d5',
          answers: ['d5'],
          orientation: 'b',
        },
        {
          kind: 'show',
          orientation: 'b',
          say: "La structure est très solide : deux pions qui se défendent l'un l'autre. Mais elle a un défaut célèbre — le fou de cases claires est enfermé derrière ses propres pions e6 et d5.",
          highlight: ['c8', 'd7', 'e6'],
          circles: [{ square: 'c8', color: 'red' }],
        },
        {
          kind: 'show',
          orientation: 'b',
          say: "On l'appelle le « mauvais fou français ». Tout le plan noir consiste à lui trouver une sortie : soit par b6 et Fa6, soit en poussant f6 pour ouvrir la diagonale.",
          arrows: [
            { from: 'c8', to: 'a6', color: 'green' },
            { from: 'f7', to: 'f6', color: 'blue' },
          ],
        },
        {
          kind: 'show',
          orientation: 'b',
          say: "L'autre plan noir, systématique : attaquer la base de la chaîne de pions blanche avec c5. En française, on joue presque toujours c5 tôt ou tard.",
          arrows: [{ from: 'c7', to: 'c5', color: 'green' }],
        },
      ],
    },

    // ── 7.5 Gambit dame ─────────────────────────────────────────────────────
    {
      id: 'gambit-dame',
      title: 'Le gambit dame',
      summary: 'Un pion offert qui n’en est pas un. L’ouverture la plus solide après 1.d4.',
      level: 'intermediate',
      minutes: 6,
      icon: '♕',
      steps: [
        {
          kind: 'show',
          fen: 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2',
          say: "Après 1.d4 d5, les Blancs jouent c4. On appelle ça un gambit, mais c'est un abus de langage : le pion n'est pas vraiment donné.",
        },
        {
          kind: 'play',
          say: "Joue c4, en attaquant le pion d5 depuis le côté. C'est le gambit dame.",
          instruction: 'Joue le pion en c4',
          answers: ['c4'],
        },
        {
          kind: 'show',
          say: "Si les Noirs prennent en c4, les Blancs récupèrent le pion sans effort avec e3 puis Fxc4. Pendant ce temps ils auront occupé le centre. Prendre n'est donc pas gagner un pion, c'est céder le centre.",
          highlight: ['c4', 'd5'],
        },
        {
          kind: 'show',
          fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2',
          say: "La vraie question posée aux Noirs est : comment défendre d5 ? Avec e6, c'est le gambit dame refusé, solide mais qui enferme le fou. Avec c6, c'est la slave, qui garde le fou libre.",
          arrows: [
            { from: 'e7', to: 'e6', color: 'blue' },
            { from: 'c7', to: 'c6', color: 'green' },
          ],
        },
        {
          kind: 'show',
          say: "Le plan blanc dans toutes ces lignes est le même : Cc3, Cf3, Fg5 pour clouer, e3, Fd3, roque, puis pousser e4 au bon moment pour ouvrir le centre.",
        },
        {
          kind: 'show',
          say: "Retiens le principe général de 1.d4 : ces parties sont plus lentes que celles de 1.e4. On manœuvre, on améliore ses pièces, et l'avantage se construit sur vingt coups au lieu de dix.",
        },
      ],
    },

    // ── 7.6 Défense est-indienne ────────────────────────────────────────────
    {
      id: 'est-indienne',
      title: 'La défense est-indienne',
      summary: 'Laisser le centre à l’adversaire… pour mieux le détruire ensuite.',
      level: 'advanced',
      minutes: 6,
      icon: '🏹',
      steps: [
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1',
          say: "L'est-indienne renverse tout ce qu'on a appris : les Noirs laissent volontairement les Blancs prendre tout le centre.",
        },
        {
          kind: 'play',
          say: "Cavalier f6 d'abord.",
          instruction: 'Joue le cavalier en f6',
          answers: ['Nf6'],
          orientation: 'b',
          reply: 'c4',
        },
        {
          kind: 'play',
          say: "Puis g6, pour préparer le fianchetto du fou.",
          instruction: 'Joue le pion en g6',
          answers: ['g6'],
          orientation: 'b',
          reply: 'Nc3',
        },
        {
          kind: 'play',
          say: "Et le fou en g7. Il balaie la grande diagonale, droit sur le centre et l'aile dame blanche.",
          instruction: 'Joue le fou en g7',
          answers: ['Bg7'],
          orientation: 'b',
          arrows: [{ from: 'g7', to: 'a1', color: 'green' }],
        },
        {
          kind: 'show',
          orientation: 'b',
          say: "Voilà l'idée : le fou g7 et le cavalier f6 exercent une pression à distance sur le centre blanc. Les Noirs ne l'occupent pas, ils le visent.",
          highlight: ['d4', 'e4', 'c4'],
        },
        {
          kind: 'show',
          orientation: 'b',
          say: "Le plan noir classique : roquer, jouer d6, puis e5 pour frapper le centre. Si les Blancs ferment avec d5, les Noirs lancent f5, f4, g5 et attaquent le roi. Ce sont parmi les parties les plus violentes du jeu.",
          arrows: [
            { from: 'e7', to: 'e5', color: 'green' },
            { from: 'f7', to: 'f5', color: 'red' },
          ],
        },
        {
          kind: 'show',
          orientation: 'b',
          say: "Attention : c'est une ouverture exigeante. Elle demande de savoir attendre pendant que l'adversaire construit, sans paniquer. Ne l'adopte que quand tu es à l'aise avec les positions fermées.",
        },
      ],
    },
  ],
}
