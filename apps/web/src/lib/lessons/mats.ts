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

import {
  ChartNoAxesColumnIncreasing,
  ChessBishop,
  ChessQueen,
  ChessRook,
  Coins,
  Crosshair,
  Crown,
  DoorClosed,
  Frown,
  Gavel,
  Lock,
  Timer,
} from 'lucide-react'
import type { Chapter } from './types.ts'

export const matesChapter: Chapter = {
  id: 'mats',
  title: 'lecons.mats.title',
  description: 'lecons.mats.description',
  level: 'beginner',
  icon: Crown,
  lessons: [
    {
      id: 'mat-couloir',
      title: 'lecons.mats.mat-couloir.title',
      summary: 'lecons.mats.mat-couloir.summary',
      level: 'beginner',
      minutes: 5,
      icon: DoorClosed,
      steps: [
        {
          kind: 'show',
          fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
          say: 'lecons.mats.mat-couloir.e1.say',
          highlight: ['f7', 'g7', 'h7'],
        },
        {
          kind: 'play',
          say: 'lecons.mats.mat-couloir.e2.say',
          instruction: 'lecons.mats.mat-couloir.e2.instruction',
          answers: ['Ra8#'],
          hint: 'lecons.mats.mat-couloir.e2.hint',
        },
        {
          kind: 'show',
          say: 'lecons.mats.mat-couloir.e3.say',
        },
        {
          kind: 'show',
          fen: '6k1/5pp1/7p/8/8/8/8/R5K1 w - - 0 1',
          say: 'lecons.mats.mat-couloir.e4.say',
          highlight: ['h7'],
        },
        {
          kind: 'show',
          say: 'lecons.mats.mat-couloir.e5.say',
        },
      ],
    },
    {
      id: 'mat-escalier',
      title: 'lecons.mats.mat-escalier.title',
      summary: 'lecons.mats.mat-escalier.summary',
      level: 'beginner',
      minutes: 6,
      icon: ChartNoAxesColumnIncreasing,
      steps: [
        {
          kind: 'show',
          // Le roi noir démarre en rangée 7 : c'est ce qui rend l'escalier
          // visible. Placé d'emblée en rangée 8, il n'a nulle part où monter et
          // la leçon perd son sujet.
          fen: '8/4k3/8/8/8/8/R7/1R5K w - - 0 1',
          say: 'lecons.mats.mat-escalier.e1.say',
        },
        {
          kind: 'play',
          say: 'lecons.mats.mat-escalier.e2.say',
          instruction: 'lecons.mats.mat-escalier.e2.instruction',
          answers: ['Ra7+'],
          hint: 'lecons.mats.mat-escalier.e2.hint',
        },
        {
          kind: 'show',
          say: 'lecons.mats.mat-escalier.e3.say',
          reply: 'Ke8',
        },
        {
          kind: 'play',
          say: 'lecons.mats.mat-escalier.e4.say',
          instruction: 'lecons.mats.mat-escalier.e4.instruction',
          answers: ['Rb8#'],
          hint: 'lecons.mats.mat-escalier.e4.hint',
        },
        {
          kind: 'show',
          say: 'lecons.mats.mat-escalier.e5.say',
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
      title: 'lecons.mats.mat-tour-roi.title',
      summary: 'lecons.mats.mat-tour-roi.summary',
      level: 'beginner',
      minutes: 7,
      icon: ChessRook,
      steps: [
        {
          kind: 'show',
          fen: '4k3/8/8/8/8/8/8/R6K w - - 0 1',
          say: 'lecons.mats.mat-tour-roi.e1.say',
        },
        {
          kind: 'show',
          say: 'lecons.mats.mat-tour-roi.e2.say',
        },
        {
          kind: 'show',
          fen: '4k3/8/4K3/8/8/8/8/7R w - - 0 1',
          say: 'lecons.mats.mat-tour-roi.e3.say',
          highlight: ['d7', 'e7', 'f7'],
        },
        {
          kind: 'play',
          say: 'lecons.mats.mat-tour-roi.e4.say',
          instruction: 'lecons.mats.mat-tour-roi.e4.instruction',
          answers: ['Rh8#'],
          hint: 'lecons.mats.mat-tour-roi.e4.hint',
        },
        {
          kind: 'show',
          say: 'lecons.mats.mat-tour-roi.e5.say',
        },
        {
          kind: 'show',
          fen: '3k4/8/4K3/8/8/8/8/7R w - - 0 1',
          say: 'lecons.mats.mat-tour-roi.e6.say',
          arrows: [{ from: 'd8', to: 'c7', color: 'green' }],
        },
        {
          kind: 'show',
          say: 'lecons.mats.mat-tour-roi.e7.say',
        },
        {
          kind: 'show',
          fen: 'k7/1R6/1K6/8/8/8/8/8 b - - 0 1',
          say: 'lecons.mats.mat-tour-roi.e8.say',
        },
        {
          kind: 'show',
          say: 'lecons.mats.mat-tour-roi.e9.say',
        },
      ],
    },
    {
      id: 'mat-dame-roi',
      title: 'lecons.mats.mat-dame-roi.title',
      summary: 'lecons.mats.mat-dame-roi.summary',
      level: 'beginner',
      minutes: 7,
      icon: ChessQueen,
      steps: [
        {
          kind: 'show',
          fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1',
          say: 'lecons.mats.mat-dame-roi.e1.say',
        },
        {
          // Le texte disait « place ta dame » sur une étape où rien n'est
          // jouable, et parlait d'un cavalier sur un échiquier qui n'en a
          // aucun. On cherchait la pièce au lieu de voir la figure.
          kind: 'show',
          say: 'lecons.mats.mat-dame-roi.e2.say',
          highlight: ['d3', 'f3', 'c4', 'g4', 'c6', 'g6', 'd7', 'f7'],
        },
        {
          kind: 'play',
          say: 'lecons.mats.mat-dame-roi.e3.say',
          instruction: 'lecons.mats.mat-dame-roi.e3.instruction',
          answers: ['Qd3'],
          hint: 'lecons.mats.mat-dame-roi.e3.hint',
          highlight: ['d3'],
        },
        {
          kind: 'show',
          say: 'lecons.mats.mat-dame-roi.e4.say',
        },
        {
          kind: 'show',
          fen: '8/8/8/8/8/5k2/5Q2/6K1 b - - 0 1',
          say: 'lecons.mats.mat-dame-roi.e5.say',
        },
        {
          kind: 'show',
          say: 'lecons.mats.mat-dame-roi.e6.say',
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
      title: 'lecons.mats.mat-deux-fous.title',
      summary: 'lecons.mats.mat-deux-fous.summary',
      level: 'intermediate',
      minutes: 6,
      icon: ChessBishop,
      steps: [
        {
          kind: 'show',
          fen: '7k/8/6K1/8/2B5/8/3B4/8 w - - 0 1',
          say: 'lecons.mats.mat-deux-fous.e1.say',
        },
        {
          kind: 'show',
          say: 'lecons.mats.mat-deux-fous.e2.say',
          highlight: ['g7', 'h7', 'g8'],
        },
        {
          kind: 'show',
          say: 'lecons.mats.mat-deux-fous.e3.say',
          arrows: [{ from: 'c4', to: 'g8', color: 'red' }],
        },
        {
          kind: 'play',
          say: 'lecons.mats.mat-deux-fous.e4.say',
          instruction: 'lecons.mats.mat-deux-fous.e4.instruction',
          answers: ['Bc3#'],
          hint: 'lecons.mats.mat-deux-fous.e4.hint',
        },
        {
          kind: 'show',
          say: 'lecons.mats.mat-deux-fous.e5.say',
        },
        {
          kind: 'show',
          say: 'lecons.mats.mat-deux-fous.e6.say',
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
      title: 'lecons.mats.mat-etouffe.title',
      summary: 'lecons.mats.mat-etouffe.summary',
      level: 'intermediate',
      minutes: 7,
      icon: Lock,
      steps: [
        {
          kind: 'show',
          fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1',
          say: 'lecons.mats.mat-etouffe.e1.say',
          highlight: ['g8', 'g7', 'h7'],
        },
        {
          kind: 'show',
          say: 'lecons.mats.mat-etouffe.e2.say',
        },
        {
          kind: 'play',
          say: 'lecons.mats.mat-etouffe.e3.say',
          instruction: 'lecons.mats.mat-etouffe.e3.instruction',
          answers: ['Nf7#'],
          hint: 'lecons.mats.mat-etouffe.e3.hint',
        },
        {
          kind: 'show',
          say: 'lecons.mats.mat-etouffe.e4.say',
        },
        {
          kind: 'show',
          fen: '5r1k/6pp/7N/8/8/1Q6/8/6K1 w - - 0 1',
          say: 'lecons.mats.mat-etouffe.e5.say',
          highlight: ['g8'],
        },
        {
          kind: 'show',
          say: 'lecons.mats.mat-etouffe.e6.say',
        },
        {
          kind: 'play',
          say: 'lecons.mats.mat-etouffe.e7.say',
          instruction: 'lecons.mats.mat-etouffe.e7.instruction',
          answers: ['Qg8+'],
          hint: 'lecons.mats.mat-etouffe.e7.hint',
          reply: 'Rxg8',
        },
        {
          kind: 'show',
          say: 'lecons.mats.mat-etouffe.e8.say',
          highlight: ['g8'],
        },
        {
          kind: 'play',
          say: 'lecons.mats.mat-etouffe.e9.say',
          instruction: 'lecons.mats.mat-etouffe.e9.instruction',
          answers: ['Nf7#'],
          hint: 'lecons.mats.mat-etouffe.e9.hint',
        },
        {
          kind: 'show',
          say: 'lecons.mats.mat-etouffe.e10.say',
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
  title: 'lecons.mats-ouverture.title',
  description: 'lecons.mats-ouverture.description',
  level: 'beginner',
  icon: Timer,
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
      title: 'lecons.mats-ouverture.mat-imbecile.title',
      summary: 'lecons.mats-ouverture.mat-imbecile.summary',
      level: 'beginner',
      minutes: 5,
      icon: Frown,
      trap: {
        opening: 'lecons.mats-ouverture.mat-imbecile.opening',
        color: 'b',
        risk: 'lecons.mats-ouverture.mat-imbecile.risk',
        theme: 'lecons.mats-ouverture.mat-imbecile.theme',
        caution: 'lecons.mats-ouverture.mat-imbecile.caution',
      },
      steps: [
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          say: 'lecons.mats-ouverture.mat-imbecile.e1.say',
          orientation: 'b',
          reply: 'f3',
        },
        {
          kind: 'show',
          say: 'lecons.mats-ouverture.mat-imbecile.e2.say',
          orientation: 'b',
          highlight: ['h4', 'g3', 'f2', 'e1'],
        },
        {
          kind: 'play',
          say: 'lecons.mats-ouverture.mat-imbecile.e3.say',
          instruction: 'lecons.mats-ouverture.mat-imbecile.e3.instruction',
          answers: ['e5'],
          hint: 'lecons.mats-ouverture.mat-imbecile.e3.hint',
          orientation: 'b',
          reply: 'g4',
        },
        {
          kind: 'show',
          say: 'lecons.mats-ouverture.mat-imbecile.e4.say',
          orientation: 'b',
          highlight: ['h4', 'g3', 'f2', 'e1'],
          arrows: [{ from: 'd8', to: 'h4', color: 'green' }],
        },
        {
          kind: 'play',
          say: 'lecons.mats-ouverture.mat-imbecile.e5.say',
          instruction: 'lecons.mats-ouverture.mat-imbecile.e5.instruction',
          answers: ['Qh4#'],
          hint: 'lecons.mats-ouverture.mat-imbecile.e5.hint',
          orientation: 'b',
        },
        {
          kind: 'show',
          say: 'lecons.mats-ouverture.mat-imbecile.e6.say',
          orientation: 'b',
        },
        {
          kind: 'show',
          say: 'lecons.mats-ouverture.mat-imbecile.e7.say',
          orientation: 'b',
        },
        {
          kind: 'show',
          fen: 'rnbqkbnr/ppppp2p/5p2/6p1/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3',
          say: 'lecons.mats-ouverture.mat-imbecile.e8.say',
          highlight: ['h5', 'g4', 'f3', 'e2'],
        },
        {
          kind: 'play',
          say: 'lecons.mats-ouverture.mat-imbecile.e9.say',
          instruction: 'lecons.mats-ouverture.mat-imbecile.e9.instruction',
          answers: ['Qh5#'],
          hint: 'lecons.mats-ouverture.mat-imbecile.e9.hint',
        },
        {
          kind: 'show',
          say: 'lecons.mats-ouverture.mat-imbecile.e10.say',
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
      title: 'lecons.mats-ouverture.mat-berger.title',
      summary: 'lecons.mats-ouverture.mat-berger.summary',
      level: 'beginner',
      minutes: 7,
      icon: Crosshair,
      trap: {
        opening: 'lecons.mats-ouverture.mat-berger.opening',
        color: 'w',
        risk: 'lecons.mats-ouverture.mat-berger.risk',
        theme: 'lecons.mats-ouverture.mat-berger.theme',
        caution: 'lecons.mats-ouverture.mat-berger.caution',
      },
      steps: [
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
          say: 'lecons.mats-ouverture.mat-berger.e1.say',
          highlight: ['f7'],
        },
        {
          kind: 'play',
          say: 'lecons.mats-ouverture.mat-berger.e2.say',
          instruction: 'lecons.mats-ouverture.mat-berger.e2.instruction',
          answers: ['Bc4'],
          hint: 'lecons.mats-ouverture.mat-berger.e2.hint',
          reply: 'Nc6',
          arrows: [{ from: 'c4', to: 'f7', color: 'red' }],
        },
        {
          kind: 'play',
          say: 'lecons.mats-ouverture.mat-berger.e3.say',
          instruction: 'lecons.mats-ouverture.mat-berger.e3.instruction',
          answers: ['Qh5'],
          hint: 'lecons.mats-ouverture.mat-berger.e3.hint',
          reply: 'Nf6',
        },
        {
          kind: 'show',
          say: 'lecons.mats-ouverture.mat-berger.e4.say',
          highlight: ['f7'],
          arrows: [
            { from: 'c4', to: 'f7', color: 'red' },
            { from: 'h5', to: 'f7', color: 'red' },
          ],
        },
        {
          kind: 'play',
          say: 'lecons.mats-ouverture.mat-berger.e5.say',
          instruction: 'lecons.mats-ouverture.mat-berger.e5.instruction',
          answers: ['Qxf7#'],
          hint: 'lecons.mats-ouverture.mat-berger.e5.hint',
        },
        {
          kind: 'show',
          say: 'lecons.mats-ouverture.mat-berger.e6.say',
        },
        {
          kind: 'show',
          fen: 'r1bqkbnr/pppp1p1p/2n3p1/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 4',
          say: 'lecons.mats-ouverture.mat-berger.e7.say',
          highlight: ['g6'],
        },
        {
          kind: 'show',
          fen: 'r1b1kbnr/ppppqppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
          say: 'lecons.mats-ouverture.mat-berger.e8.say',
          highlight: ['f7'],
        },
        {
          kind: 'show',
          fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3',
          say: 'lecons.mats-ouverture.mat-berger.e9.say',
          highlight: ['f6', 'h5'],
          arrows: [{ from: 'f6', to: 'h5', color: 'green' }],
        },
        {
          kind: 'show',
          fen: 'r1bqkb1r/pppp1p1p/2n2np1/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 2 5',
          say: 'lecons.mats-ouverture.mat-berger.e10.say',
        },
        {
          kind: 'show',
          say: 'lecons.mats-ouverture.mat-berger.e11.say',
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
      title: 'lecons.mats-ouverture.mat-shilling.title',
      summary: 'lecons.mats-ouverture.mat-shilling.summary',
      level: 'intermediate',
      minutes: 8,
      icon: Coins,
      trap: {
        opening: 'lecons.mats-ouverture.mat-shilling.opening',
        color: 'b',
        risk: 'lecons.mats-ouverture.mat-shilling.risk',
        theme: 'lecons.mats-ouverture.mat-shilling.theme',
        caution: 'lecons.mats-ouverture.mat-shilling.caution',
      },
      steps: [
        {
          kind: 'show',
          fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
          say: 'lecons.mats-ouverture.mat-shilling.e1.say',
          orientation: 'b',
        },
        {
          kind: 'play',
          say: 'lecons.mats-ouverture.mat-shilling.e2.say',
          instruction: 'lecons.mats-ouverture.mat-shilling.e2.instruction',
          answers: ['Nd4'],
          hint: 'lecons.mats-ouverture.mat-shilling.e2.hint',
          orientation: 'b',
          reply: 'Nxe5',
        },
        {
          kind: 'show',
          say: 'lecons.mats-ouverture.mat-shilling.e3.say',
          orientation: 'b',
          highlight: ['e5'],
        },
        {
          kind: 'play',
          say: 'lecons.mats-ouverture.mat-shilling.e4.say',
          instruction: 'lecons.mats-ouverture.mat-shilling.e4.instruction',
          answers: ['Qg5'],
          hint: 'lecons.mats-ouverture.mat-shilling.e4.hint',
          orientation: 'b',
          reply: 'Nxf7',
        },
        {
          kind: 'show',
          say: 'lecons.mats-ouverture.mat-shilling.e5.say',
          orientation: 'b',
          arrows: [
            { from: 'f7', to: 'g5', color: 'red' },
            { from: 'f7', to: 'h8', color: 'red' },
          ],
        },
        {
          kind: 'play',
          say: 'lecons.mats-ouverture.mat-shilling.e6.say',
          instruction: 'lecons.mats-ouverture.mat-shilling.e6.instruction',
          answers: ['Qxg2'],
          hint: 'lecons.mats-ouverture.mat-shilling.e6.hint',
          orientation: 'b',
          reply: 'Rf1',
        },
        {
          kind: 'show',
          say: 'lecons.mats-ouverture.mat-shilling.e7.say',
          orientation: 'b',
          highlight: ['f1'],
        },
        {
          kind: 'play',
          say: 'lecons.mats-ouverture.mat-shilling.e8.say',
          instruction: 'lecons.mats-ouverture.mat-shilling.e8.instruction',
          answers: ['Qxe4+'],
          hint: 'lecons.mats-ouverture.mat-shilling.e8.hint',
          orientation: 'b',
          reply: 'Be2',
        },
        {
          kind: 'show',
          say: 'lecons.mats-ouverture.mat-shilling.e9.say',
          orientation: 'b',
          arrows: [{ from: 'e4', to: 'e1', color: 'red' }],
        },
        {
          kind: 'play',
          say: 'lecons.mats-ouverture.mat-shilling.e10.say',
          instruction: 'lecons.mats-ouverture.mat-shilling.e10.instruction',
          answers: ['Nf3#'],
          hint: 'lecons.mats-ouverture.mat-shilling.e10.hint',
          orientation: 'b',
        },
        {
          kind: 'show',
          say: 'lecons.mats-ouverture.mat-shilling.e11.say',
          orientation: 'b',
        },
        {
          kind: 'show',
          say: 'lecons.mats-ouverture.mat-shilling.e12.say',
          orientation: 'b',
        },
        {
          kind: 'show',
          fen: 'r1bqkbnr/pppp1ppp/8/8/2BpP3/8/PPPP1PPP/RNBQK2R w KQkq - 0 5',
          say: 'lecons.mats-ouverture.mat-shilling.e13.say',
          highlight: ['d4'],
        },
        {
          kind: 'show',
          say: 'lecons.mats-ouverture.mat-shilling.e14.say',
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
      title: 'lecons.mats-ouverture.mat-legal.title',
      summary: 'lecons.mats-ouverture.mat-legal.summary',
      level: 'advanced',
      minutes: 8,
      icon: Gavel,
      trap: {
        opening: 'lecons.mats-ouverture.mat-legal.opening',
        color: 'w',
        risk: 'lecons.mats-ouverture.mat-legal.risk',
        theme: 'lecons.mats-ouverture.mat-legal.theme',
        caution: 'lecons.mats-ouverture.mat-legal.caution',
      },
      steps: [
        {
          kind: 'show',
          fen: 'r2qkbnr/ppp2ppp/2np4/4p3/2B1P1b1/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5',
          say: 'lecons.mats-ouverture.mat-legal.e1.say',
          arrows: [{ from: 'g4', to: 'd1', color: 'red' }],
        },
        {
          kind: 'show',
          say: 'lecons.mats-ouverture.mat-legal.e2.say',
        },
        {
          kind: 'play',
          say: 'lecons.mats-ouverture.mat-legal.e3.say',
          instruction: 'lecons.mats-ouverture.mat-legal.e3.instruction',
          answers: ['Nxe5'],
          hint: 'lecons.mats-ouverture.mat-legal.e3.hint',
          reply: 'Bxd1',
        },
        {
          kind: 'show',
          say: 'lecons.mats-ouverture.mat-legal.e4.say',
        },
        {
          kind: 'play',
          say: 'lecons.mats-ouverture.mat-legal.e5.say',
          instruction: 'lecons.mats-ouverture.mat-legal.e5.instruction',
          answers: ['Bxf7+'],
          hint: 'lecons.mats-ouverture.mat-legal.e5.hint',
          reply: 'Ke7',
        },
        {
          kind: 'show',
          say: 'lecons.mats-ouverture.mat-legal.e6.say',
        },
        {
          kind: 'play',
          say: 'lecons.mats-ouverture.mat-legal.e7.say',
          instruction: 'lecons.mats-ouverture.mat-legal.e7.instruction',
          answers: ['Nd5#'],
          hint: 'lecons.mats-ouverture.mat-legal.e7.hint',
        },
        {
          kind: 'show',
          say: 'lecons.mats-ouverture.mat-legal.e8.say',
        },
        {
          kind: 'show',
          fen: 'r2qkbnr/ppp2ppp/3p4/4n3/2B1P1b1/2N5/PPPP1PPP/R1BQK2R w KQkq - 0 6',
          say: 'lecons.mats-ouverture.mat-legal.e9.say',
        },
        {
          kind: 'show',
          say: 'lecons.mats-ouverture.mat-legal.e10.say',
        },
      ],
    },
  ],
}
