/**
 * Les deux chapitres du mat.
 *
 * Ils étaient dans `tactics.ts`, qui en portait déjà deux et allait en porter
 * trois : le fichier s'appelait « tactique » et contenait surtout des mats.
 *
 * La séparation se fait sur **le moment où le mat arrive**, parce que c'est ce
 * qui change ce qu'on doit savoir :
 *
 *  - « Savoir mater » — la fin de partie. Le matériel est réduit, il n'y a plus
 *    rien à calculer, seulement une technique à appliquer. On n'y cherche pas
 *    un mat : on le construit.
 *  - « Les mats de l'ouverture » — les dix premiers coups. Toutes les pièces
 *    sont là, rien n'est technique, et le mat tombe parce que l'adversaire a
 *    joué un coup naturel de trop. On ne les trouve pas en réfléchissant : on
 *    les reconnaît, ou on les subit.
 *
 * Le second chapitre n'existait pas. Le mat du berger n'était nommé nulle part
 * dans l'application — ni leçon, ni glossaire, ni motif — alors que c'est le
 * premier mat que tout débutant subit et le premier qu'il essaie ensuite.
 *
 * Chaque leçon d'ouverture enseigne **les deux côtés et les variantes** : la
 * ligne qui mate, les réponses qui l'annulent, et ce qu'il en coûte à celui qui
 * l'a tentée pour rien. Une leçon qui n'enseignerait que l'attaque ferait du
 * mal : passé la première semaine, plus personne ne tombe dans le berger, et
 * celui qui a appris à sortir sa dame en h5 continue de la sortir pendant un an.
 *
 * Toutes les lignes sont vérifiées par `scripts/check-lessons.mjs`, qui rejoue
 * chaque coup et refuse un « # » sur une position où le roi peut encore bouger.
 */

import type { Chapter } from './types.ts'

export const matesChapter: Chapter = {
  id: 'mats',
  title: 'Savoir mater',
  description:
    'Gagner une dame ne sert à rien si l’on ne sait pas conclure. Les cinq techniques qui terminent une partie, du couloir aux deux fous.',
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
      /*
        Roi et tour, après les deux tours — et non avant.

        L'ordre n'est pas celui du matériel mais celui de la difficulté. Deux
        tours matent seules, par une mécanique qui se répète : c'est la leçon
        qui précède. Une tour seule ne mate pas du tout, il faut y amener son
        roi et le placer juste, ce qui demande la notion d'opposition. C'est
        pourtant la finale la plus fréquente des trois.

        La leçon ne déroule pas la technique complète — pousser un roi du
        centre au bord prend une quinzaine de coups et aucune étape scriptée ne
        les tiendrait. Elle enseigne la **position finale** et les deux fautes
        qui l'empêchent : donner échec sans opposition, et coller la tour.
      */
      id: 'mat-tour-roi',
      title: 'Mater avec le roi et la tour',
      summary: 'La finale la plus fréquente. Une tour ne mate jamais seule : tout est dans le roi.',
      level: 'beginner',
      minutes: 7,
      icon: '♖',
      steps: [
        {
          kind: 'show',
          fen: '4k3/8/8/8/8/8/8/R6K w - - 0 1',
          say: 'Roi et tour contre roi seul. Une tour ne mate jamais toute seule : essaie autant que tu veux, il te manquera toujours une case. C’est ton roi qui fait le travail, la tour ne donne que le coup final.',
        },
        {
          kind: 'show',
          say: 'La méthode tient en trois temps. La tour coupe une rangée pour interdire au roi noir de redescendre. Ton roi monte le rejoindre. Et quand les deux rois se font face, la tour mate.',
        },
        {
          kind: 'show',
          fen: '4k3/8/4K3/8/8/8/8/7R w - - 0 1',
          say: 'Voici la position à reconnaître, et c’est la seule à retenir. Les deux rois se font face, une case entre eux. Ton roi interdit à lui seul les trois cases devant lui : d7, e7 et f7. Il ne reste au roi noir que d8 et f8, sur sa rangée.',
          highlight: ['d7', 'e7', 'f7'],
        },
        {
          kind: 'play',
          say: 'Et une tour prend une rangée entière d’un seul coup. Vas-y.',
          instruction: 'Trouve le mat en un coup',
          answers: ['Rh8#'],
          hint: 'La tour monte tout en haut de sa colonne, le plus loin possible du roi noir.',
        },
        {
          kind: 'show',
          say: 'Échec et mat. La tour tient d8, e8 et f8 ; ton roi tient d7, e7 et f7. Six cases à deux, et il n’en faut pas une de plus.',
        },
        {
          kind: 'show',
          fen: '3k4/8/4K3/8/8/8/8/7R w - - 0 1',
          say: 'Première faute, et de loin la plus courante : donner échec trop tôt. Ici les rois ne se font pas face, ils sont décalés. La tour en h8 ferait échec, oui, mais le roi noir filerait en c7 et tout serait à refaire.',
          arrows: [{ from: 'd8', to: 'c7', color: 'green' }],
        },
        {
          kind: 'show',
          say: 'Alors ne donne pas cet échec. Avance d’abord ton roi pour le mettre en face, puis mate. Un échec qui ne mate pas ne fait rien avancer dans cette finale : il rend juste sa liberté au roi adverse.',
        },
        {
          kind: 'show',
          fen: 'k7/1R6/1K6/8/8/8/8/8 b - - 0 1',
          say: 'Seconde faute, et elle coûte la partie entière : coller la tour contre le roi. Regarde. Le roi noir n’est pas en échec, et il n’a aucun coup. C’est un pat. Nulle, avec une tour de plus.',
        },
        {
          kind: 'show',
          say: 'D’où la règle : la tour mate depuis l’autre bout de l’échiquier, jamais à côté du roi. Loin, elle est intouchable et elle tient toute la rangée. Près, elle se fait manger ou elle fait nulle.',
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
    {
      /*
        Les deux fous — la dernière technique contre un roi nu.

        Elle vient après la dame et la tour parce qu'elle est plus rare et
        qu'elle demande de voir une figure plutôt que d'appliquer une
        mécanique : deux fous sur deux diagonales voisines forment un mur, et
        c'est le mur qu'il faut reconnaître, pas une suite de coups.

        Le fou et le cavalier contre roi nu n'y sont pas, et n'y seront pas :
        trente coups de technique pure pour une position qui n'arrive presque
        jamais. Ce serait la seule leçon du chapitre qu'on n'utilise pas.
      */
      id: 'mat-deux-fous',
      title: 'Mater avec les deux fous',
      summary:
        'Deux fous côte à côte font un mur qu’aucun roi ne franchit. Encore faut-il le voir.',
      level: 'intermediate',
      minutes: 6,
      icon: '♗',
      steps: [
        {
          kind: 'show',
          fen: '7k/8/6K1/8/2B5/8/3B4/8 w - - 0 1',
          say: 'Deux fous matent un roi seul, et c’est la seule paire de pièces légères qui y arrive à coup sûr. Le principe : chacun ne voit qu’une couleur de cases, mais à deux ils voient tout.',
        },
        {
          kind: 'show',
          say: 'Le mat ne tombe que dans un coin ou tout au bord. Ici le roi noir est déjà en h8, et ton roi en g6 lui interdit g7 et h7. Il ne lui reste qu’une case : g8.',
          highlight: ['g7', 'h7', 'g8'],
        },
        {
          kind: 'show',
          say: 'Et cette case-là, ton fou de c4 la surveille déjà, depuis l’autre bout de sa diagonale. Le roi noir est donc enfermé sans être en échec. Il ne manque plus que l’échec.',
          arrows: [{ from: 'c4', to: 'g8', color: 'red' }],
        },
        {
          kind: 'play',
          say: 'Ton second fou, celui des cases noires, n’a qu’à se poser sur la grande diagonale pour toucher h8.',
          instruction: 'Joue le fou en c3',
          answers: ['Bc3#'],
          hint: 'Le fou de d2 recule d’une case en diagonale, vers c3.',
        },
        {
          kind: 'show',
          say: 'Échec et mat. Voilà le mur : un fou donne l’échec sur une diagonale, l’autre couvre la case de fuite sur la diagonale voisine, et ton roi tient les deux cases qui restent. Les trois pièces sont indispensables.',
        },
        {
          kind: 'show',
          say: 'La technique, en une phrase : rapproche tes deux fous côte à côte, ils forment une barrière que le roi ne peut pas traverser, puis avance la barrière vers un bord en amenant ton roi derrière. Ne sépare jamais les fous, c’est tout le secret.',
        },
      ],
    },
    {
      /*
        Le mat étouffé, en deux temps.

        La figure nue d'abord — cavalier contre roi enfermé par ses propres
        pièces — parce que c'est elle qu'on doit reconnaître. Le legs de
        Philidor ensuite, où l'on donne sa dame pour boucher la dernière case :
        sans avoir vu la figure, ce sacrifice est incompréhensible ; après, il
        est évident. L'ordre inverse n'apprend rien.
      */
      id: 'mat-etouffe',
      title: 'Le mat étouffé',
      summary: 'Un cavalier mate un roi que ses propres pièces ont enfermé. Le plus beau du jeu.',
      level: 'intermediate',
      minutes: 7,
      icon: '😵',
      steps: [
        {
          kind: 'show',
          fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1',
          say: 'Regarde le roi noir. Il a roqué, il est à l’abri, et il est enfermé — par sa propre tour en g8 et par ses propres pions en g7 et h7. Il n’a pas une seule case libre.',
          highlight: ['g8', 'g7', 'h7'],
        },
        {
          kind: 'show',
          say: 'Contre un roi comme celui-là, le cavalier est la seule pièce qui compte. Une tour ou une dame, on peut les prendre ou s’interposer devant. Un cavalier, non : il saute, et son échec ne se bloque jamais.',
        },
        {
          kind: 'play',
          say: 'Le cavalier saute en f7. De là il touche h8, et rien ne peut ni le prendre ni s’interposer.',
          instruction: 'Joue le cavalier en f7',
          answers: ['Nf7#'],
          hint: 'Le cavalier de g5 fait un L vers f7.',
        },
        {
          kind: 'show',
          say: 'Échec et mat avec un cavalier et rien d’autre. C’est ce qu’on appelle un mat étouffé : le roi meurt étouffé par ses propres défenseurs.',
        },
        {
          kind: 'show',
          fen: '5r1k/6pp/7N/8/8/1Q6/8/6K1 w - - 0 1',
          say: 'Maintenant la version célèbre, et il y manque une chose. Les pions enferment toujours le roi, mais la tour est en f8 : la case g8 est libre. Le cavalier en f7 ne serait plus qu’un échec.',
          highlight: ['g8'],
        },
        {
          kind: 'show',
          say: 'Il faut donc boucher g8, et la seule pièce qui peut y aller est ta dame. On va l’y donner.',
        },
        {
          kind: 'play',
          say: 'La dame va en g8 et se laisse prendre. Elle n’est pas perdue : ton cavalier de h6 surveille g8, donc le roi ne peut pas la manger. Seule la tour peut.',
          instruction: 'Joue la dame en g8',
          answers: ['Qg8+'],
          hint: 'La dame de b3 file en diagonale jusqu’en g8.',
          reply: 'Rxg8',
        },
        {
          kind: 'show',
          say: 'La tour a dû prendre — c’était son unique coup légal. Et en prenant, elle vient de se poser exactement sur la case par laquelle son roi pouvait s’échapper.',
          highlight: ['g8'],
        },
        {
          kind: 'play',
          say: 'La cage est refermée, par les Noirs eux-mêmes. Finis.',
          instruction: 'Trouve le mat',
          answers: ['Nf7#'],
          hint: 'Le cavalier de h6 saute en f7.',
        },
        {
          kind: 'show',
          say: 'Une dame contre un mat. Ça s’appelle le legs de Philidor, et c’est la plus vieille combinaison notée du jeu. Le réflexe à garder : dès qu’un roi adverse a roqué et qu’il n’a aucune case d’air, cherche un cavalier.',
        },
      ],
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
//  Chapitre 3 — les mats de l'ouverture
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Les quatre mats qu'on rencontre vraiment dans ses premières parties.
 *
 * Le classement est celui du nombre de coups, qui est aussi celui de la
 * difficulté : deux coups, quatre, sept, huit. Chacun repose sur une faute
 * différente, et c'est la faute qu'il faut retenir plutôt que la suite de
 * coups :
 *
 *  - **l'imbécile** : avoir avancé les deux pions qui gardent son roi ;
 *  - **le berger** : ne pas avoir compté les attaquants de f7 ;
 *  - **le Shilling** : avoir pris un pion offert ;
 *  - **Légal** : avoir cru qu'une pièce clouée ne peut pas bouger.
 *
 * Deux d'entre eux se donnent par les Noirs — l'imbécile et le Shilling. Les
 * leçons les font donc jouer depuis le camp noir, échiquier retourné : on
 * apprend mal un mat en le regardant à l'envers.
 *
 * Le mat de Damiano n'y est pas, malgré sa réputation. Vérification faite, la
 * position après 1.e4 e5 2.Cf3 f6 3.Cxe5 fxe5 4.Dh5+ ne donne **aucun mat
 * forcé** — ni par échecs successifs jusqu'à six coups, ni autrement de façon
 * présentable. Ce qu'elle donne est une tour et une attaque gagnante, ce qui
 * est autre chose ; en faire une leçon de mat aurait été enseigner une suite
 * que l'adversaire n'est pas obligé de jouer.
 *
 * Légal ferme le chapitre parce qu'il demande de connaître le clouage, qui
 * s'enseigne au chapitre suivant. C'est le seul endroit du programme où l'ordre
 * des chapitres n'est pas strictement croissant, et c'est assumé : on subit
 * Légal bien avant d'avoir un vocabulaire pour le nommer.
 */
export const openingMatesChapter: Chapter = {
  id: 'mats-ouverture',
  title: 'Les mats de l’ouverture',
  description:
    'Les mats qui tombent dans les dix premiers coups. Chacun avec ses variantes : la ligne qui mate, les réponses qui l’annulent, et le prix à payer quand on l’a tenté pour rien.',
  level: 'beginner',
  icon: '🪤',
  lessons: [
    {
      /*
        Le mat de l'imbécile — le plus court du jeu, et une leçon de prévention.

        Personne ne le donnera jamais en partie : il faut que l'adversaire joue
        deux coups absurdes d'affilée. Son intérêt est entièrement à l'envers —
        il nomme la diagonale e1-h4 et la raison de ne pas y toucher. D'où la
        dernière moitié de la leçon, où l'apprenant change de camp et le subit.
      */
      id: 'mat-imbecile',
      title: 'Le mat de l’imbécile',
      summary: 'Deux coups. Le mat le plus rapide possible — et celui qu’il faut savoir éviter.',
      level: 'beginner',
      minutes: 5,
      icon: '🤦',
      steps: [
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          say: 'Le mat le plus rapide du jeu tient en deux coups. Tu ne le donneras probablement jamais — il faut que l’adversaire s’y prête — mais il t’apprend la diagonale la plus dangereuse de l’échiquier.',
          orientation: 'b',
          reply: 'f3',
        },
        {
          kind: 'show',
          say: 'Les Blancs ont avancé le pion f. Regarde ce qu’il vient d’ouvrir : une diagonale qui part de h4 et qui arrive droit sur leur roi, en passant par g3 et f2.',
          orientation: 'b',
          highlight: ['h4', 'g3', 'f2', 'e1'],
        },
        {
          kind: 'play',
          say: 'Tu as les Noirs. Réponds e5, un coup tout à fait normal — il occupe le centre, et il libère ta dame sur cette même diagonale.',
          instruction: 'Joue le pion en e5',
          answers: ['e5'],
          hint: 'Le pion e7 avance de deux cases.',
          orientation: 'b',
          reply: 'g4',
        },
        {
          kind: 'show',
          say: 'Et les Blancs avancent le pion g. C’est le second coup fatal : g3 n’est plus défendu par personne, f2 est vide, et la diagonale est grande ouverte de h4 jusqu’au roi blanc.',
          orientation: 'b',
          highlight: ['h4', 'g3', 'f2', 'e1'],
          arrows: [{ from: 'd8', to: 'h4', color: 'green' }],
        },
        {
          kind: 'play',
          say: 'À toi. Ta dame n’a qu’à parcourir la diagonale.',
          instruction: 'Trouve le mat',
          answers: ['Qh4#'],
          hint: 'La dame de d8 file en diagonale : e7, f6, g5, h4.',
          orientation: 'b',
        },
        {
          kind: 'show',
          say: 'Échec et mat en deux coups. Le roi blanc est attaqué et il ne peut rien faire : f2 est la seule case libre autour de lui, et ta dame la couvre. Rien ne peut s’interposer en g3 ni en f2, et rien n’atteint ta dame.',
          orientation: 'b',
        },
        {
          kind: 'show',
          say: 'Les variantes ne changent rien à l’affaire. f3 puis g4, f4 puis g4, ou g4 puis f3 : le mat est le même. Ce qui compte n’est pas l’ordre des coups mais le résultat — les deux pions f et g partis, et plus personne sur la diagonale du roi.',
          orientation: 'b',
        },
        {
          kind: 'show',
          fen: 'rnbqkbnr/ppppp2p/5p2/6p1/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3',
          say: 'Maintenant retourne l’échiquier, parce que c’est là que la leçon sert. Tu as les Blancs, et les Noirs viennent de jouer f6 puis g5. Ils ont commis exactement la même faute, un coup plus tard.',
          highlight: ['h5', 'g4', 'f3', 'e2'],
        },
        {
          kind: 'play',
          say: 'Punis-les.',
          instruction: 'Trouve le mat',
          answers: ['Qh5#'],
          hint: 'La dame de d1 file en diagonale jusqu’en h5.',
        },
        {
          kind: 'show',
          say: 'Voilà la vraie leçon, et elle tient en une phrase : n’avance jamais les pions f et g ensemble avant d’avoir roqué. Ce sont eux qui gardent ton roi, et ils le gardent à deux ou pas du tout.',
        },
      ],
    },
    {
      /*
        Le mat du berger — et sa parade, qui compte davantage.

        C'est le premier mat que tout débutant subit, et le premier qu'il
        essaie ensuite sur tout le monde. Les trois dernières étapes sont la
        vraie leçon : ce qu'il coûte de l'avoir tenté.
      */
      id: 'mat-berger',
      title: 'Le mat du berger',
      summary:
        'Quatre coups, et la partie est finie. Le connaître, c’est surtout ne plus le subir.',
      level: 'beginner',
      minutes: 7,
      icon: '🐑',
      steps: [
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
          say: 'Au tout début de la partie, une case est plus faible que toutes les autres : f7. Regarde qui la défend. Personne, sauf le roi lui-même.',
          highlight: ['f7'],
        },
        {
          kind: 'play',
          say: 'Le fou sort en c4. De là, il regarde f7 en diagonale, par-dessus tout l’échiquier.',
          instruction: 'Joue le fou en c4',
          answers: ['Bc4'],
          hint: 'Le fou de f1 sort en diagonale : e2, d3, c4.',
          reply: 'Nc6',
          arrows: [{ from: 'c4', to: 'f7', color: 'red' }],
        },
        {
          kind: 'play',
          say: 'Les Noirs ont développé un cavalier, mais il ne défend pas f7. Amène maintenant ta dame en h5 : elle vise f7 elle aussi. Deux attaquants contre un seul défenseur.',
          instruction: 'Joue la dame en h5',
          answers: ['Qh5'],
          hint: 'La dame de d1 file en diagonale jusqu’en h5.',
          reply: 'Nf6',
        },
        {
          kind: 'show',
          say: 'Les Noirs sortent leur second cavalier. Le coup a l’air naturel — il développe une pièce et il attaque ta dame — et il perd la partie sur le coup suivant.',
          highlight: ['f7'],
          arrows: [
            { from: 'c4', to: 'f7', color: 'red' },
            { from: 'h5', to: 'f7', color: 'red' },
          ],
        },
        {
          kind: 'play',
          say: 'À toi. La dame prend en f7, et le fou la défend.',
          instruction: 'Trouve le mat',
          answers: ['Qxf7#'],
          hint: 'La dame de h5 descend manger le pion f7.',
        },
        {
          kind: 'show',
          say: 'Échec et mat. Le roi ne peut pas prendre la dame, le fou c4 la protège. Il ne peut pas fuir non plus : la dame lui interdit e7 et d7, et ses propres pièces occupent d8 et f8.',
        },
        {
          kind: 'show',
          fen: 'r1bqkbnr/pppp1p1p/2n3p1/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 4',
          say: 'Première variante, et c’est la parade principale. Au lieu du cavalier, les Noirs avancent le pion g6. Il chasse la dame et il bouche sa diagonale d’un seul coup. Il n’y a plus de mat.',
          highlight: ['g6'],
        },
        {
          kind: 'show',
          fen: 'r1b1kbnr/ppppqppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
          say: 'Seconde parade, tout aussi bonne : la dame noire en e7. Elle défend f7 une seconde fois, et deux attaquants contre deux défenseurs ne font plus rien du tout.',
          highlight: ['f7'],
        },
        {
          kind: 'show',
          fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3',
          say: 'Troisième variante, et celle-là punit. Si les Noirs ont sorti leur cavalier en f6 d’entrée, ne joue surtout pas la dame en h5 : ce cavalier-là couvre h5, et il la mangerait tout simplement.',
          highlight: ['f6', 'h5'],
          arrows: [{ from: 'f6', to: 'h5', color: 'green' }],
        },
        {
          kind: 'show',
          fen: 'r1bqkb1r/pppp1p1p/2n2np1/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 2 5',
          say: 'Et voilà ce qui t’attend quand la parade arrive. Ta dame a dû reculer en f3, elle a perdu deux coups, les Noirs ont développé deux cavaliers et poussé g6. Tu as trois temps de retard et une dame qui gêne ton propre cavalier.',
        },
        {
          kind: 'show',
          say: 'Retiens donc les deux côtés. Si une dame vise ta case f7, réponds g6 ou défends avec ta dame en e7. Et ne compte pas sur ce mat toi-même : dès que ton adversaire le connaît, tu as juste sorti ta dame trop tôt, et tu vas passer la partie à la faire fuir.',
        },
      ],
    },
    {
      /*
        Le piège du Shilling — un mat donné par les Noirs, et par étouffement.

        Il complète le chapitre par le seul cas où le mat vient de l'appât :
        les Noirs offrent un pion et matent celui qui l'accepte. La figure
        finale est la même que celle du mat étouffé de l'autre chapitre — un
        roi entouré de ses propres pièces, tué par un cavalier —, ce qui vaut
        d'être dit à l'apprenant : ce n'est pas une suite à retenir mais une
        figure déjà vue, de l'autre côté de l'échiquier.
      */
      id: 'mat-shilling',
      title: 'Le piège du Shilling',
      summary:
        'Les Noirs offrent un pion. Celui qui le prend est maté en sept coups, par ses propres pièces.',
      level: 'intermediate',
      minutes: 8,
      icon: '🪙',
      steps: [
        {
          kind: 'show',
          fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
          say: 'Partie italienne, la plus jouée de toutes. Tu as les Noirs. Ce piège se vendait un shilling dans les cafés d’échecs de Londres : on pariait cette pièce sur la partie, et on la gagnait.',
          orientation: 'b',
        },
        {
          kind: 'play',
          say: 'Joue ton cavalier en d4. Il a l’air perdu au milieu de rien, et c’est tout l’appât : il attaque le cavalier f3 et il laisse ton pion e5 sans défense.',
          instruction: 'Joue le cavalier en d4',
          answers: ['Nd4'],
          hint: 'Le cavalier de c6 fait un L vers d4.',
          orientation: 'b',
          reply: 'Nxe5',
        },
        {
          kind: 'show',
          say: 'Et les Blancs prennent le pion. C’est le coup naturel : le pion est gratuit, et leur cavalier était attaqué de toute façon. C’est aussi le coup qui perd.',
          orientation: 'b',
          highlight: ['e5'],
        },
        {
          kind: 'play',
          say: 'Ta dame sort en g5. Elle attaque le cavalier e5 et le pion g2 en même temps, et les Blancs ne peuvent pas défendre les deux.',
          instruction: 'Joue la dame en g5',
          answers: ['Qg5'],
          hint: 'La dame de d8 file en diagonale : e7, f6, g5.',
          orientation: 'b',
          reply: 'Nxf7',
        },
        {
          kind: 'show',
          say: 'Les Blancs cherchent la complication : leur cavalier prend en f7 et attaque ta dame et ta tour d’un seul coup. Ne sauve ni l’une ni l’autre.',
          orientation: 'b',
          arrows: [
            { from: 'f7', to: 'g5', color: 'red' },
            { from: 'f7', to: 'h8', color: 'red' },
          ],
        },
        {
          kind: 'play',
          say: 'Prends le pion g2 avec ta dame. Elle menace maintenant la tour h1, et elle s’installe dans le camp blanc.',
          instruction: 'Prends le pion en g2',
          answers: ['Qxg2'],
          hint: 'La dame de g5 descend toute sa colonne jusqu’en g2.',
          orientation: 'b',
          reply: 'Rf1',
        },
        {
          kind: 'show',
          say: 'Les Blancs mettent leur tour en f1, où leur roi la défend. Regarde bien la case qu’ils viennent de boucher : f1. Leur roi en avait besoin.',
          orientation: 'b',
          highlight: ['f1'],
        },
        {
          kind: 'play',
          say: 'Reprends le pion e4 avec échec. Ta dame se met sur la colonne du roi blanc.',
          instruction: 'Prends le pion en e4',
          answers: ['Qxe4+'],
          hint: 'La dame de g2 prend en diagonale : f3, e4.',
          orientation: 'b',
          reply: 'Be2',
        },
        {
          kind: 'show',
          say: 'Les Blancs s’interposent avec leur fou en e2. Et ce fou est cloué : il est entre ta dame et leur roi, il ne peut plus bouger de la partie.',
          orientation: 'b',
          arrows: [{ from: 'e4', to: 'e1', color: 'red' }],
        },
        {
          kind: 'play',
          say: 'Ton cavalier de d4, celui que tout le monde prenait pour une bêtise, saute en f3.',
          instruction: 'Joue le cavalier en f3',
          answers: ['Nf3#'],
          hint: 'Le cavalier de d4 fait un L vers f3.',
          orientation: 'b',
        },
        {
          kind: 'show',
          say: 'Échec et mat. Compte les cases autour du roi blanc : d1 sa dame, d2 son pion, e2 son fou, f1 sa tour, f2 son pion. Toutes occupées par les siens. Et personne ne peut prendre ton cavalier — le fou e2 est cloué, la tour f1 est bloquée par son propre pion.',
          orientation: 'b',
        },
        {
          kind: 'show',
          say: 'C’est la même figure que le mat étouffé, vue de l’autre côté : un roi tué par ses propres défenseurs, avec un cavalier. Tu la reconnaîtras désormais dans les deux sens.',
          orientation: 'b',
        },
        {
          kind: 'show',
          fen: 'r1bqkbnr/pppp1ppp/8/8/2BpP3/8/PPPP1PPP/RNBQK2R w KQkq - 0 5',
          say: 'Et la variante qui refuse le piège, celle qu’il faut connaître dans l’autre sens : prendre le cavalier au lieu du pion. Les Blancs échangent en d4, il n’y a plus de dame en g5, plus de mat, et ce sont eux qui sont mieux.',
          highlight: ['d4'],
        },
        {
          kind: 'show',
          say: 'Deux règles à en tirer. Quand on t’offre un pion en plein début de partie, demande-toi pourquoi avant de le prendre. Et quand tu es déjà dans le piège, rends du matériel tout de suite — le fou en f7 avec échec — plutôt que de courir après la dame adverse.',
        },
      ],
    },
    {
      /*
        Le mat de Légal — le clouage qui n'en est pas un.

        Le pendant du berger : le berger punit celui qui ne défend pas f7,
        Légal punit celui qui croit qu'une pièce clouée ne peut pas bouger.

        La leçon part du sacrifice et non du début de la partie : les huit
        premiers coups n'apprennent rien, et une leçon qui les fait jouer perd
        son sujet dans du développement.
      */
      id: 'mat-legal',
      title: 'Le mat de Légal',
      summary: 'Une pièce clouée peut bouger. Celui qui l’oublie perd en sept coups.',
      level: 'advanced',
      minutes: 8,
      icon: '📌',
      steps: [
        {
          kind: 'show',
          fen: 'r2qkbnr/ppp2ppp/2np4/4p3/2B1P1b1/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5',
          say: 'Le fou noir en g4 vise ton cavalier f3, et derrière ce cavalier il y a ta dame en d1. Le cavalier est donc cloué : s’il bouge, tu perds ta dame.',
          arrows: [{ from: 'g4', to: 'd1', color: 'red' }],
        },
        {
          kind: 'show',
          say: 'Sauf que ce clouage-là n’est pas absolu. Ce n’est pas ton roi qui est derrière, c’est ta dame — le cavalier a parfaitement le droit de partir. La seule question est de savoir si ça vaut neuf points.',
        },
        {
          kind: 'play',
          say: 'Le cavalier cloué prend le pion e5. Il attaque en même temps le cavalier c6 et il ouvre la diagonale de ton fou vers f7.',
          instruction: 'Prends le pion en e5 avec le cavalier',
          answers: ['Nxe5'],
          hint: 'Le cavalier de f3 saute sur le pion e5.',
          reply: 'Bxd1',
        },
        {
          kind: 'show',
          say: 'Les Noirs ont pris la dame. Neuf points d’avance, et la partie est perdue en deux coups. C’est tout le piège : le coup gourmand est celui qui perd.',
        },
        {
          kind: 'play',
          say: 'Le fou se donne en f7. Le roi ne peut pas le prendre, ton cavalier e5 défend la case.',
          instruction: 'Prends le pion en f7 avec le fou',
          answers: ['Bxf7+'],
          hint: 'Le fou de c4 mange le pion f7.',
          reply: 'Ke7',
        },
        {
          kind: 'show',
          say: 'Le roi noir n’avait qu’un seul coup légal. Il monte en e7, au milieu de ses propres pièces, et il y est enfermé.',
        },
        {
          kind: 'play',
          say: 'Ton troisième attaquant arrive. Le cavalier de c3 se pose en d5, et personne ne peut l’en chasser.',
          instruction: 'Joue le cavalier en d5',
          answers: ['Nd5#'],
          hint: 'Le cavalier de c3 fait un L vers d5.',
        },
        {
          kind: 'show',
          say: 'Échec et mat, avec un fou et deux cavaliers, contre une dame. Le roi noir est cerné par son propre camp : sa dame occupe d8, son fou occupe f8, et tes trois pièces tiennent tout le reste.',
        },
        {
          kind: 'show',
          fen: 'r2qkbnr/ppp2ppp/3p4/4n3/2B1P1b1/2N5/PPPP1PPP/R1BQK2R w KQkq - 0 6',
          say: 'Et la variante qui sauve tout, la seule : reprendre le cavalier au lieu de prendre la dame. Les Noirs rendent la pièce, ils gardent leur roi, et la partie continue à peu près à égalité. Ils n’avaient qu’à refuser le cadeau.',
        },
        {
          kind: 'show',
          say: 'Deux choses à garder. Quand une pièce adverse est clouée sur autre chose que le roi, elle peut bouger — vérifie toujours ce qu’elle menace en partant. Et quand on t’offre une dame en plein début de partie, compte les pièces qui regardent ton roi avant de la prendre.',
        },
      ],
    },
  ],
}
