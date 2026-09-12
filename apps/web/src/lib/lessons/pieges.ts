/**
 * Chapitre — Tendre et déjouer les pièges.
 *
 * Le chapitre « Les mats de l'ouverture » apprend les quatre mats qu'on **subit**
 * dans ses dix premières parties. Celui-ci va un cran plus loin : des pièges qui
 * ne matent pas mais qui gagnent une pièce, et qui décident la plupart des
 * parties en club bien avant que la théorie n'ait son mot à dire.
 *
 * ── Chaque piège dans les deux sens, et c'est tout l'objet du chapitre ───────
 *
 * Un piège appris d'un seul côté est à moitié appris. Celui qui ne sait que le
 * tendre le tente une fois, tombe sur quelqu'un qui connaît la parade, et n'en
 * retire rien ; celui qui ne sait que s'en défendre ne le reconnaît pas quand
 * l'occasion se présente. Chaque leçon se joue donc deux fois : d'abord du côté
 * qui le tend — jusqu'au gain —, puis du côté qui le voit venir, avec le seul
 * coup qui change tout.
 *
 * Le basculement se fait par une étape d'observation qui porte une `reply` : le
 * déroulé applique toujours la réponse adverse (voir `playback.ts`), ce qui
 * permet de rendre la main à l'apprenant dans l'autre camp sans avoir à écrire
 * de FEN intermédiaire. Toutes les positions partent donc du départ standard, et
 * c'est délibéré : une suite de coups légaux est vérifiable par
 * `check:lessons`, une FEN recopiée à la main ne l'est pas.
 *
 * ── Pourquoi ces cinq-là ────────────────────────────────────────────────────
 *
 * Ils couvrent les cinq mécanismes qu'on retrouve ensuite partout : le
 * sacrifice sur f7, la fausse prise d'un pion « cloué », le mat étouffé au
 * milieu du développement, la sous-promotion, et la pièce enfermée par des
 * pions. Chacun vient d'une ouverture qui se joue réellement — personne
 * n'apprend un piège dans une ligne qu'il ne verra jamais.
 */

import type { Chapter } from './types.ts'
import { START } from './types.ts'

export const piegesChapter: Chapter = {
  id: 'pieges',
  title: 'Tendre et déjouer les pièges',
  description:
    'Cinq pièges d’ouverture qui gagnent une pièce, appris des deux côtés : on le tend jusqu’au gain, puis on le voit venir et on le déjoue. Ce sont eux qui décident les parties en club, bien avant la théorie.',
  level: 'intermediate',
  // Pas le 🪤 : « Les mats de l'ouverture » le porte déjà, et deux chapitres
  // avec la même icône dans le même sommaire ne se distinguent plus.
  icon: '🎣',
  lessons: [
    // ── Le Fegatello ────────────────────────────────────────────────────────
    {
      id: 'piege-fegatello',
      title: 'Le Fegatello',
      summary:
        'Deux pièces sur f7, un cavalier donné, et le roi noir dehors au septième coup. Puis le coup unique qui annule tout.',
      level: 'beginner',
      minutes: 7,
      icon: '🍖',
      steps: [
        {
          kind: 'show',
          fen: START,
          say: 'Le Fegatello, ou « foie frit » en italien. Les Blancs donnent un cavalier sur f7 pour sortir le roi noir. On commence par le tendre.',
        },
        {
          kind: 'play',
          say: 'Pion roi, comme d’habitude.',
          instruction: 'Joue e4',
          answers: ['e4'],
          reply: 'e5',
        },
        {
          kind: 'play',
          say: 'Cavalier f3, qui attaque e5.',
          instruction: 'Joue le cavalier en f3',
          answers: ['Nf3'],
          reply: 'Nc6',
        },
        {
          kind: 'play',
          say: 'Et le fou en c4. Regarde bien sa diagonale : elle finit sur f7.',
          instruction: 'Joue le fou en c4',
          answers: ['Bc4'],
          highlight: ['f7'],
          reply: 'Nf6',
        },
        {
          kind: 'show',
          say: 'Les Noirs développent leur cavalier et ignorent f7. C’est jouable, mais ça demande de connaître la suite.',
          highlight: ['f7'],
        },
        {
          kind: 'play',
          say: 'Cavalier g5. Maintenant deux pièces attaquent f7, et f7 n’est défendu que par le roi.',
          instruction: 'Joue le cavalier en g5',
          answers: ['Ng5'],
          arrows: [
            { from: 'g5', to: 'f7', color: 'red' },
            { from: 'c4', to: 'f7', color: 'red' },
          ],
          reply: 'd5',
        },
        {
          kind: 'play',
          say: 'Les Noirs contre-attaquent au centre. Prends le pion.',
          instruction: 'Prends en d5 avec le pion e',
          answers: ['exd5'],
          reply: 'Nxd5',
        },
        {
          kind: 'show',
          say: 'Voilà la faute. Reprendre en d5 avec le cavalier laisse f7 sans défense suffisante. Tout le piège tient dans ce coup-là.',
          highlight: ['d5', 'f7'],
        },
        {
          kind: 'play',
          say: 'Cavalier prend f7. Tu donnes une pièce, et tu sais pourquoi.',
          instruction: 'Prends en f7 avec le cavalier',
          answers: ['Nxf7'],
          reply: 'Kxf7',
        },
        {
          kind: 'play',
          say: 'Dame f3. Échec, et elle attaque en même temps le cavalier cloué en d5.',
          instruction: 'Joue la dame en f3',
          answers: ['Qf3+'],
          arrows: [
            { from: 'f3', to: 'f7', color: 'red' },
            { from: 'f3', to: 'd5', color: 'orange' },
          ],
          reply: 'Ke6',
        },
        {
          kind: 'show',
          say: 'Le roi noir est au milieu de l’échiquier au huitième coup, le cavalier d5 est attaqué deux fois, et les Blancs ont encore toutes leurs pièces à sortir. C’est largement suffisant pour une pièce.',
          highlight: ['e6', 'd5'],
        },
        {
          kind: 'show',
          fen: START,
          orientation: 'b',
          say: 'Maintenant on change de camp. Tu joues les Noirs, et tu dois éviter tout ça.',
          reply: 'e4',
        },
        {
          kind: 'play',
          say: 'Réponds au centre.',
          instruction: 'Joue e5',
          answers: ['e5'],
          orientation: 'b',
          reply: 'Nf3',
        },
        {
          kind: 'play',
          say: 'Défends ton pion.',
          instruction: 'Joue le cavalier en c6',
          answers: ['Nc6'],
          orientation: 'b',
          reply: 'Bc4',
        },
        {
          kind: 'play',
          say: 'Développe ton cavalier roi.',
          instruction: 'Joue le cavalier en f6',
          answers: ['Nf6'],
          orientation: 'b',
          reply: 'Ng5',
        },
        {
          kind: 'play',
          say: 'Le cavalier arrive sur g5. La seule réponse est de frapper au centre.',
          instruction: 'Joue d5',
          answers: ['d5'],
          orientation: 'b',
          hint: 'Le pion d7 avance de deux cases : il attaque le fou c4 en passant.',
          reply: 'exd5',
        },
        {
          kind: 'play',
          say: 'Et voici le coup qui déjoue tout le piège : cavalier a5. Il attaque le fou c4 au lieu de reprendre en d5.',
          instruction: 'Joue le cavalier de c6 en a5',
          answers: ['Na5'],
          orientation: 'b',
          hint: 'Ne reprends pas le pion : c’est exactement ce que les Blancs attendent. Va chercher le fou.',
          reply: 'Bb5+',
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'Le fou doit fuir, f7 n’est plus attaqué que par une pièce, et les Noirs rendront le pion d5 au pire. Un seul coup, et le Fegatello n’existe plus.',
          highlight: ['a5', 'f7'],
        },
      ],
    },

    // ── Le piège de l'éléphant ──────────────────────────────────────────────
    {
      id: 'piege-elephant',
      title: 'Le piège de l’éléphant',
      summary:
        'Un pion qui a l’air de tomber tout seul, et une dame qui se donne pour gagner une pièce. Le piège le plus rentable du gambit dame.',
      level: 'intermediate',
      minutes: 7,
      icon: '🐘',
      steps: [
        {
          kind: 'show',
          fen: START,
          orientation: 'b',
          say: 'Celui-ci se subit plus souvent qu’il ne se tend. Tu joues les Noirs, et tu vas laisser les Blancs prendre un pion qu’ils ne peuvent pas prendre.',
          reply: 'd4',
        },
        {
          kind: 'play',
          say: 'Réponds symétriquement.',
          instruction: 'Joue d5',
          answers: ['d5'],
          orientation: 'b',
          reply: 'c4',
        },
        {
          kind: 'play',
          say: 'Le gambit dame. Soutiens ton pion d5 avec le pion e.',
          instruction: 'Joue e6',
          answers: ['e6'],
          orientation: 'b',
          reply: 'Nc3',
        },
        {
          kind: 'play',
          say: 'Développe ton cavalier roi.',
          instruction: 'Joue le cavalier en f6',
          answers: ['Nf6'],
          orientation: 'b',
          reply: 'Bg5',
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'Le fou cloue ton cavalier f6 contre ta dame. C’est ce clouage que les Blancs vont croire réel.',
          arrows: [{ from: 'g5', to: 'd8', color: 'red' }],
        },
        {
          kind: 'play',
          say: 'Cavalier b8 en d7. Il ajoute un défenseur à f6 — et il tend le piège.',
          instruction: 'Joue le cavalier de b8 en d7',
          answers: ['Nbd7'],
          orientation: 'b',
          hint: 'Le cavalier de b8 va en d7, pas ailleurs.',
          reply: 'cxd5',
        },
        {
          kind: 'play',
          say: 'Reprends avec ton pion e.',
          instruction: 'Prends en d5 avec le pion e6',
          answers: ['exd5'],
          orientation: 'b',
          reply: 'Nxd5',
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'Voilà. Les Blancs prennent en d5 parce que ton cavalier f6 est cloué. Sauf qu’il ne l’est pas vraiment : ce qui est derrière vaut moins que ce qu’on va gagner.',
          highlight: ['d5', 'f6', 'd8'],
        },
        {
          kind: 'play',
          say: 'Prends le cavalier avec ton cavalier f6. Oui, tu perds la dame.',
          instruction: 'Prends en d5 avec le cavalier f6',
          answers: ['Nxd5'],
          orientation: 'b',
          hint: 'Le cavalier cloué bouge quand même. Fais-le.',
          reply: 'Bxd8',
        },
        {
          kind: 'play',
          say: 'Et maintenant le coup de tout le piège : fou b4, échec.',
          instruction: 'Joue le fou de f8 en b4',
          answers: ['Bb4+'],
          orientation: 'b',
          arrows: [{ from: 'b4', to: 'e1', color: 'red' }],
          reply: 'Qd2',
        },
        {
          kind: 'play',
          say: 'Les Blancs doivent s’interposer avec leur dame. Prends-la.',
          instruction: 'Prends la dame en d2',
          answers: ['Bxd2+'],
          orientation: 'b',
          reply: 'Kxd2',
        },
        {
          kind: 'play',
          say: 'Et tu récupères le fou qui campe sur ta case d8.',
          instruction: 'Prends en d8 avec le roi',
          answers: ['Kxd8'],
          orientation: 'b',
          reply: 'Nf3',
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'Compte : tu as donné la dame et un fou, tu as récupéré une dame, un cavalier et un fou. Une pièce de plus, et la partie est gagnée. Retiens la leçon générale : un clouage contre la dame n’interdit pas de bouger, il faut calculer.',
          highlight: ['d8', 'd5'],
        },
      ],
    },

    // ── Le piège de Kieninger ───────────────────────────────────────────────
    {
      id: 'piege-kieninger',
      title: 'Le piège de Kieninger',
      summary:
        'Un mat étouffé au huitième coup, en pleine ouverture, parce qu’un pion pris à l’aile ouvre une colonne qu’on n’avait pas regardée.',
      level: 'intermediate',
      minutes: 6,
      icon: '😵',
      steps: [
        {
          kind: 'show',
          fen: START,
          orientation: 'b',
          say: 'Le gambit Budapest, et le plus joli mat d’ouverture qui existe. Tu joues les Noirs.',
          reply: 'd4',
        },
        {
          kind: 'play',
          say: 'Cavalier f6 d’abord.',
          instruction: 'Joue le cavalier en f6',
          answers: ['Nf6'],
          orientation: 'b',
          reply: 'c4',
        },
        {
          kind: 'play',
          say: 'Et maintenant le gambit : e5. Tu offres un pion pour activer tes pièces.',
          instruction: 'Joue e5',
          answers: ['e5'],
          orientation: 'b',
          reply: 'dxe5',
        },
        {
          kind: 'play',
          say: 'Cavalier g4. Il va rechercher le pion e5.',
          instruction: 'Joue le cavalier de f6 en g4',
          answers: ['Ng4'],
          orientation: 'b',
          reply: 'Bf4',
        },
        {
          kind: 'play',
          say: 'Les Blancs défendent leur pion. Amène un deuxième attaquant.',
          instruction: 'Joue le cavalier en c6',
          answers: ['Nc6'],
          orientation: 'b',
          reply: 'Nf3',
        },
        {
          kind: 'play',
          say: 'Fou b4, échec. Ce n’est pas un coup en l’air : il va forcer les Blancs à boucher avec leur cavalier b1.',
          instruction: 'Joue le fou en b4',
          answers: ['Bb4+'],
          orientation: 'b',
          reply: 'Nbd2',
        },
        {
          kind: 'play',
          say: 'Dame e7. Elle se met sur la colonne e — retiens cette colonne, tout le mat est là.',
          instruction: 'Joue la dame en e7',
          answers: ['Qe7'],
          orientation: 'b',
          arrows: [{ from: 'e7', to: 'e2', color: 'blue' }],
          reply: 'a3',
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'Les Blancs attaquent ton fou avec a3. Un coup naturel, et c’est la faute : ils s’occupent de l’aile alors que leur roi est encore au centre.',
          highlight: ['b4', 'e1'],
        },
        {
          kind: 'play',
          say: 'Ignore le fou. Reprends le pion e5 avec le cavalier de g4.',
          instruction: 'Prends en e5 avec le cavalier g4',
          answers: ['Ngxe5'],
          orientation: 'b',
          hint: 'C’est le cavalier de g4 qui prend, pas celui de c6.',
          reply: 'axb4',
        },
        {
          kind: 'play',
          say: 'Les Blancs prennent le fou. Maintenant : cavalier d3. Échec et mat.',
          instruction: 'Joue le cavalier de e5 en d3',
          answers: ['Nd3#'],
          orientation: 'b',
          hint: 'Le cavalier de e5 saute en d3. Regarde la colonne e avant de douter.',
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'Mat étouffé. Le roi n’a aucune case : sa dame, son fou et son cavalier l’entourent. Et le pion e2 ne peut pas prendre le cavalier, parce qu’en quittant e2 il ouvrirait la colonne sur ta dame e7.',
          highlight: ['d3', 'e2', 'e7', 'e1'],
        },
      ],
    },

    // ── Le piège de Lasker ──────────────────────────────────────────────────
    {
      id: 'piege-lasker',
      title: 'Le piège de Lasker',
      summary:
        'Le seul piège d’ouverture où promouvoir en dame perd et promouvoir en cavalier gagne. Une sous-promotion, au septième coup.',
      level: 'advanced',
      minutes: 6,
      icon: '♘',
      steps: [
        {
          kind: 'show',
          fen: START,
          orientation: 'b',
          say: 'Le gambit Albin. Tu joues les Noirs, et tu vas finir par promouvoir un pion en cavalier — pas en dame.',
          reply: 'd4',
        },
        {
          kind: 'play',
          say: 'Réponds d5.',
          instruction: 'Joue d5',
          answers: ['d5'],
          orientation: 'b',
          reply: 'c4',
        },
        {
          kind: 'play',
          say: 'Et le gambit Albin : e5.',
          instruction: 'Joue e5',
          answers: ['e5'],
          orientation: 'b',
          reply: 'dxe5',
        },
        {
          kind: 'play',
          say: 'Pousse ton pion d en d4. Il y sera très difficile à déloger.',
          instruction: 'Joue d4',
          answers: ['d4'],
          orientation: 'b',
          reply: 'e3',
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'Les Blancs jouent e3 pour se débarrasser du pion d4. C’est la faute du piège : ce coup ouvre une diagonale vers leur roi.',
          highlight: ['e3', 'e1'],
        },
        {
          kind: 'play',
          say: 'Fou b4, échec.',
          instruction: 'Joue le fou en b4',
          answers: ['Bb4+'],
          orientation: 'b',
          reply: 'Bd2',
        },
        {
          kind: 'play',
          say: 'Prends en e3 avec ton pion d4.',
          instruction: 'Prends en e3',
          answers: ['dxe3'],
          orientation: 'b',
          reply: 'Bxb4',
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'Les Blancs prennent ton fou et se croient bien. Ton pion e3, lui, est à deux cases de la promotion, et la case f2 n’est tenue que par le roi.',
          highlight: ['e3', 'f2'],
        },
        {
          kind: 'play',
          say: 'Prends en f2, échec.',
          instruction: 'Prends en f2 avec le pion e3',
          answers: ['exf2+'],
          orientation: 'b',
          reply: 'Ke2',
        },
        {
          kind: 'play',
          say: 'Et maintenant le coup de la leçon : prends le cavalier g1 et promeus en **cavalier**. Avec échec.',
          instruction: 'Prends en g1 et promeus en cavalier',
          answers: ['fxg1=N+'],
          orientation: 'b',
          hint: 'La case g1 porte le cavalier blanc. Choisis le cavalier dans le sélecteur de promotion, pas la dame.',
          reply: 'Rxg1',
        },
        {
          kind: 'play',
          say: 'La tour reprend. Fou g4, échec — et la dame blanche est perdue.',
          instruction: 'Joue le fou en g4',
          answers: ['Bg4+'],
          orientation: 'b',
          arrows: [{ from: 'g4', to: 'd1', color: 'orange' }],
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'Le roi est en échec sur la diagonale, et quoi qu’il fasse le fou prend la dame en d1. Promouvoir en dame aurait donné échec aussi — mais les Blancs l’auraient prise, et il ne resterait rien. C’est la seule sous-promotion d’ouverture qu’il faut connaître.',
          highlight: ['g4', 'd1', 'e2'],
        },
      ],
    },

    // ── L'arche de Noé ──────────────────────────────────────────────────────
    {
      id: 'piege-arche-de-noe',
      title: 'L’arche de Noé',
      summary:
        'Trois pions noirs qui avancent, et le fou blanc se retrouve sans une seule case. Le piège le plus vieux de l’espagnole.',
      level: 'intermediate',
      minutes: 7,
      icon: '🛶',
      steps: [
        {
          kind: 'show',
          fen: START,
          orientation: 'b',
          say: 'L’espagnole. Tu joues les Noirs, et tu vas enfermer le fou blanc avec des pions. On appelle ça l’arche de Noé parce que le piège est aussi vieux que le déluge.',
          reply: 'e4',
        },
        {
          kind: 'play',
          say: 'Réponds e5.',
          instruction: 'Joue e5',
          answers: ['e5'],
          orientation: 'b',
          reply: 'Nf3',
        },
        {
          kind: 'play',
          say: 'Défends ton pion.',
          instruction: 'Joue le cavalier en c6',
          answers: ['Nc6'],
          orientation: 'b',
          reply: 'Bb5',
        },
        {
          kind: 'play',
          say: 'Le fou en b5 attaque le défenseur de e5. Chasse-le avec a6.',
          instruction: 'Joue a6',
          answers: ['a6'],
          orientation: 'b',
          reply: 'Ba4',
        },
        {
          kind: 'play',
          say: 'Soutiens ton pion e5 une deuxième fois.',
          instruction: 'Joue d6',
          answers: ['d6'],
          orientation: 'b',
          reply: 'd4',
        },
        {
          kind: 'play',
          say: 'Les Blancs ouvrent le centre. Réponds b5 : le fou n’a déjà plus beaucoup de cases.',
          instruction: 'Joue b5',
          answers: ['b5'],
          orientation: 'b',
          arrows: [{ from: 'b5', to: 'a4', color: 'red' }],
          reply: 'Bb3',
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'Le fou se réfugie en b3. Regarde ses cases de fuite : a2 et c2 sont occupées par ses propres pions, a4 et c4 seront tenues par tes pions. Il ne lui reste rien.',
          highlight: ['b3', 'a2', 'c2', 'a4', 'c4'],
        },
        {
          kind: 'play',
          say: 'Échange au centre : cavalier prend d4.',
          instruction: 'Prends en d4 avec le cavalier',
          answers: ['Nxd4'],
          orientation: 'b',
          reply: 'Nxd4',
        },
        {
          kind: 'play',
          say: 'Reprends avec ton pion.',
          instruction: 'Prends en d4 avec le pion e5',
          answers: ['exd4'],
          orientation: 'b',
          reply: 'Qxd4',
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'Voilà la faute : la dame reprend en d4, au lieu de s’occuper du fou. Maintenant tu la chasses, et chaque coup de chasse avance tes pions vers le fou.',
          highlight: ['d4', 'b3'],
        },
        {
          kind: 'play',
          say: 'Pion c5 : il attaque la dame.',
          instruction: 'Joue c5',
          answers: ['c5'],
          orientation: 'b',
          reply: 'Qd5',
        },
        {
          kind: 'play',
          say: 'Fou e6 : tu la chasses encore, en développant.',
          instruction: 'Joue le fou en e6',
          answers: ['Be6'],
          orientation: 'b',
          reply: 'Qc6+',
        },
        {
          kind: 'play',
          say: 'Bouche l’échec avec ton fou.',
          instruction: 'Joue le fou en d7',
          answers: ['Bd7'],
          orientation: 'b',
          reply: 'Qd5',
        },
        {
          kind: 'play',
          say: 'Et le dernier pion : c4. Le fou b3 est pris au filet.',
          instruction: 'Joue c4',
          answers: ['c4'],
          orientation: 'b',
          arrows: [{ from: 'c4', to: 'b3', color: 'orange' }],
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'Le fou n’a aucune case : ses propres pions lui bouchent a2 et c2, tes pions tiennent a4 et c4. Il tombera au coup suivant. Retiens le mécanisme plutôt que la suite de coups : des pions peuvent enfermer une pièce, et un fou qui recule sur une aile est souvent déjà perdu.',
          highlight: ['b3', 'c4', 'b5'],
        },
      ],
    },
  ],
}
