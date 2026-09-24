/**
 * La tactique — les figures qui gagnent du matériel.
 *
 * C'est ici qu'un débutant gagne le plus vite. La très grande majorité des
 * parties en dessous de 1500 Elo se décide sur une pièce laissée en prise ou
 * une fourchette non vue : reconnaître ces cinq ou six figures fait gagner
 * plusieurs centaines de points de classement, bien avant toute connaissance
 * d'ouverture.
 *
 * Le fichier portait aussi les chapitres du mat, qui pesaient le double du
 * sien : ils vivent maintenant dans `mats.ts`.
 */

import type { Chapter } from './types.ts'

export const tacticsChapter: Chapter = {
  id: 'tactique',
  title: 'lecons.tactique.title',
  description: 'lecons.tactique.description',
  level: 'beginner',
  icon: '⚡',
  lessons: [
    {
      id: 'piece-en-prise',
      title: 'lecons.tactique.piece-en-prise.title',
      summary: 'lecons.tactique.piece-en-prise.summary',
      level: 'beginner',
      minutes: 5,
      icon: '🎯',
      steps: [
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppp1ppp/8/4p3/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 2',
          say: 'lecons.tactique.piece-en-prise.e1.say',
          highlight: ['e5'],
          arrows: [{ from: 'f3', to: 'e5', color: 'red' }],
        },
        {
          kind: 'play',
          say: 'lecons.tactique.piece-en-prise.e2.say',
          instruction: 'lecons.tactique.piece-en-prise.e2.instruction',
          answers: ['Nxe5'],
          hint: 'lecons.tactique.piece-en-prise.e2.hint',
        },
        {
          kind: 'show',
          say: 'lecons.tactique.piece-en-prise.e3.say',
        },
        {
          kind: 'show',
          fen: 'r1bqkbnr/pppp1ppp/2n5/4N3/8/8/PPPPPPPP/RNBQKB1R b KQkq - 0 3',
          say: 'lecons.tactique.piece-en-prise.e4.say',
          highlight: ['e5'],
          arrows: [{ from: 'c6', to: 'e5', color: 'green' }],
        },
      ],
    },
    {
      id: 'fourchette',
      title: 'lecons.tactique.fourchette.title',
      summary: 'lecons.tactique.fourchette.summary',
      level: 'beginner',
      minutes: 6,
      icon: '🍴',
      steps: [
        {
          kind: 'show',
          fen: 'r3k3/8/8/8/8/8/8/4K1N1 w - - 0 1',
          say: 'lecons.tactique.fourchette.e1.say',
        },
        {
          kind: 'show',
          say: 'lecons.tactique.fourchette.e2.say',
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
          say: 'lecons.tactique.fourchette.e3.say',
          instruction: 'lecons.tactique.fourchette.e3.instruction',
          answers: ['Nc7+'],
          hint: 'lecons.tactique.fourchette.e3.hint',
          reply: 'Kf7',
        },
        {
          kind: 'play',
          say: 'lecons.tactique.fourchette.e4.say',
          instruction: 'lecons.tactique.fourchette.e4.instruction',
          answers: ['Nxa8'],
          hint: 'lecons.tactique.fourchette.e4.hint',
        },
        {
          kind: 'show',
          fen: '4k3/8/2n5/8/4P3/8/8/4K3 b - - 0 1',
          say: 'lecons.tactique.fourchette.e5.say',
          highlight: ['e5', 'd4', 'b4', 'a5', 'a7', 'b8', 'd8', 'e7'],
        },
        {
          kind: 'show',
          say: 'lecons.tactique.fourchette.e6.say',
        },
      ],
    },
    {
      id: 'clouage',
      title: 'lecons.tactique.clouage.title',
      summary: 'lecons.tactique.clouage.summary',
      level: 'beginner',
      minutes: 6,
      icon: '📌',
      steps: [
        {
          kind: 'show',
          fen: 'rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 0 4',
          say: 'lecons.tactique.clouage.e1.say',
        },
        {
          kind: 'play',
          say: 'lecons.tactique.clouage.e2.say',
          instruction: 'lecons.tactique.clouage.e2.instruction',
          answers: ['Bg5'],
          hint: 'lecons.tactique.clouage.e2.hint',
        },
        {
          kind: 'show',
          say: 'lecons.tactique.clouage.e3.say',
          arrows: [{ from: 'g5', to: 'd8', color: 'red' }],
        },
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq - 0 2',
          say: 'lecons.tactique.clouage.e4.say',
        },
        {
          kind: 'show',
          fen: 'rnb1kbnr/pppp1ppp/8/4p3/1q2P3/2N5/PPPP1PPP/R1BQKBNR w KQkq - 0 3',
          say: 'lecons.tactique.clouage.e5.say',
          arrows: [{ from: 'b4', to: 'e1', color: 'red' }],
        },
        {
          kind: 'show',
          say: 'lecons.tactique.clouage.e6.say',
        },
      ],
    },
    {
      id: 'enfilade',
      title: 'lecons.tactique.enfilade.title',
      summary: 'lecons.tactique.enfilade.summary',
      level: 'intermediate',
      minutes: 5,
      icon: '🎣',
      steps: [
        {
          kind: 'show',
          fen: '4k3/8/8/8/8/4r3/8/4RK2 w - - 0 1',
          say: 'lecons.tactique.enfilade.e1.say',
        },
        {
          kind: 'show',
          fen: '3rk3/8/8/8/8/8/8/3RK3 w - - 0 1',
          say: 'lecons.tactique.enfilade.e2.say',
        },
        {
          kind: 'show',
          fen: '4k3/8/8/8/8/8/8/R2rK3 w - - 0 1',
          say: 'lecons.tactique.enfilade.e3.say',
        },
        {
          kind: 'show',
          say: 'lecons.tactique.enfilade.e4.say',
        },
      ],
    },
    {
      id: 'decouverte',
      title: 'lecons.tactique.decouverte.title',
      summary: 'lecons.tactique.decouverte.summary',
      level: 'intermediate',
      minutes: 6,
      icon: '🎭',
      steps: [
        {
          kind: 'show',
          fen: '4k3/8/8/4N3/8/8/8/4RK2 w - - 0 1',
          say: 'lecons.tactique.decouverte.e1.say',
          arrows: [{ from: 'e1', to: 'e8', color: 'blue' }],
        },
        {
          kind: 'show',
          say: 'lecons.tactique.decouverte.e2.say',
        },
        {
          kind: 'play',
          say: 'lecons.tactique.decouverte.e3.say',
          instruction: 'lecons.tactique.decouverte.e3.instruction',
          answers: ['Nc6+', 'Nd7+', 'Nf7+', 'Ng6+', 'Nc4+', 'Nd3+', 'Nf3+', 'Ng4+'],
          hint: 'lecons.tactique.decouverte.e3.hint',
        },
        {
          kind: 'show',
          say: 'lecons.tactique.decouverte.e4.say',
        },
        {
          kind: 'show',
          fen: '4k3/8/8/8/8/4N3/8/4RK2 w - - 0 1',
          say: 'lecons.tactique.decouverte.e5.say',
        },
      ],
    },
    {
      id: 'elimination-defenseur',
      title: 'lecons.tactique.elimination-defenseur.title',
      summary: 'lecons.tactique.elimination-defenseur.summary',
      level: 'intermediate',
      minutes: 5,
      icon: '🗡️',
      steps: [
        {
          kind: 'show',
          fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
          say: 'lecons.tactique.elimination-defenseur.e1.say',
          highlight: ['e5', 'c6'],
          arrows: [{ from: 'c6', to: 'e5', color: 'green' }],
        },
        {
          kind: 'show',
          say: 'lecons.tactique.elimination-defenseur.e2.say',
        },
        {
          kind: 'show',
          fen: 'r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
          say: 'lecons.tactique.elimination-defenseur.e3.say',
          arrows: [
            { from: 'b5', to: 'c6', color: 'red' },
            { from: 'c6', to: 'e5', color: 'green' },
          ],
        },
        {
          kind: 'show',
          say: 'lecons.tactique.elimination-defenseur.e4.say',
        },
      ],
    },
    {
      /*
        La routine plutôt qu'un motif de plus.

        Les six leçons qui précèdent enseignent des figures ; celle-ci enseigne
        à les **trouver**. Un débutant voit la fourchette quand on lui dit
        qu'il y en a une, et la rate en partie, où personne ne le dit. Les deux
        positions sont choisies pour que la routine, déroulée dans l'ordre,
        tombe à chaque fois sur le bon coup : trois échecs dans la première,
        dont un seul gagne, et ni échec ni prise dans la seconde, où il faut
        aller jusqu'aux menaces.
      */
      id: 'echecs-prises-menaces',
      title: 'lecons.tactique.echecs-prises-menaces.title',
      summary: 'lecons.tactique.echecs-prises-menaces.summary',
      level: 'beginner',
      minutes: 7,
      icon: '🔎',
      steps: [
        {
          kind: 'show',
          fen: 'r5k1/p3b1pp/8/8/8/8/5PPP/3Q2K1 w - - 0 1',
          say: 'lecons.tactique.echecs-prises-menaces.e1.say',
        },
        {
          // Trois échecs possibles : la dame en b3, en d5, en d8. Le dernier
          // la perd — la tour et le fou la prennent —, le premier ne gagne
          // rien. Seul d5 attaque aussi la tour : environ +6 au moteur, contre
          // +1 pour tout autre coup.
          kind: 'play',
          say: 'lecons.tactique.echecs-prises-menaces.e2.say',
          instruction: 'lecons.tactique.echecs-prises-menaces.e2.instruction',
          answers: ['Qd5+'],
          hint: 'lecons.tactique.echecs-prises-menaces.e2.hint',
          arrows: [
            { from: 'd1', to: 'b3', color: 'blue' },
            { from: 'd1', to: 'd5', color: 'blue' },
            { from: 'd1', to: 'd8', color: 'blue' },
          ],
          // Le roi a le choix entre f8 et h8 ; f8 est la meilleure défense —
          // en h8, la tour prise avec échec mène au mat.
          reply: 'Kf8',
        },
        {
          kind: 'play',
          say: 'lecons.tactique.echecs-prises-menaces.e3.say',
          instruction: 'lecons.tactique.echecs-prises-menaces.e3.instruction',
          answers: ['Qxa8+'],
          hint: 'lecons.tactique.echecs-prises-menaces.e3.hint',
        },
        {
          kind: 'show',
          fen: '6k1/pp3ppp/2pbpn2/8/3PP3/2P4P/PP1NBPP1/6K1 w - - 0 1',
          say: 'lecons.tactique.echecs-prises-menaces.e4.say',
          highlight: ['d6', 'f6'],
        },
        {
          // e5, défendu par d4, attaque le fou et le cavalier : l'un des deux
          // tombe. Le pion d'avance devient une pièce d'avance — le moteur
          // passe d'environ +2,4 à +5,4, et aucun autre coup ne fait mieux
          // que +2,4.
          kind: 'play',
          say: 'lecons.tactique.echecs-prises-menaces.e5.say',
          instruction: 'lecons.tactique.echecs-prises-menaces.e5.instruction',
          answers: ['e5'],
          hint: 'lecons.tactique.echecs-prises-menaces.e5.hint',
          reply: 'Nd5',
        },
        {
          kind: 'play',
          say: 'lecons.tactique.echecs-prises-menaces.e6.say',
          instruction: 'lecons.tactique.echecs-prises-menaces.e6.instruction',
          answers: ['exd6'],
          hint: 'lecons.tactique.echecs-prises-menaces.e6.hint',
        },
        {
          kind: 'show',
          say: 'lecons.tactique.echecs-prises-menaces.e7.say',
        },
      ],
    },
    {
      /*
        Les quatre parades, une position chacune.

        L'ordre est celui dans lequel on les cherche : prendre l'attaquant
        règle tout d'un coup, bloquer coûte souvent une pièce, fuir laisse
        l'initiative, et la contre-attaque — la plus belle — est aussi la plus
        risquée, d'où sa place en dernier.
      */
      id: 'defendre',
      title: 'lecons.tactique.defendre.title',
      summary: 'lecons.tactique.defendre.summary',
      level: 'beginner',
      minutes: 7,
      icon: '🧱',
      steps: [
        {
          kind: 'show',
          fen: '4k3/ppp2ppp/8/8/8/8/PPn2PPP/R2QK2R w - - 0 1',
          say: 'lecons.tactique.defendre.e1.say',
          arrows: [
            { from: 'c2', to: 'e1', color: 'red' },
            { from: 'c2', to: 'a1', color: 'red' },
          ],
        },
        {
          // Le roi peut fuir en d2, e2 ou f1, mais la tour a1 tombe alors.
          kind: 'play',
          say: 'lecons.tactique.defendre.e2.say',
          instruction: 'lecons.tactique.defendre.e2.instruction',
          answers: ['Qxc2'],
          hint: 'lecons.tactique.defendre.e2.hint',
        },
        {
          // Un seul coup légal : ni prise, ni fuite — f1 et h1 sont sur la
          // rangée de la tour, f2 et h2 sont occupées.
          kind: 'play',
          fen: '6k1/3R1ppp/8/8/8/3B4/P4PPP/4r1K1 w - - 0 1',
          say: 'lecons.tactique.defendre.e3.say',
          instruction: 'lecons.tactique.defendre.e3.instruction',
          answers: ['Bf1'],
          hint: 'lecons.tactique.defendre.e3.hint',
        },
        {
          // Gambit dame refusé, 4…h6. Le fou peut aller n'importe où hors de
          // portée — prendre en h6 le perd — ou s'échanger contre le cavalier.
          kind: 'play',
          fen: 'rnbqkb1r/ppp2pp1/4pn1p/3p2B1/2PP4/2N5/PP2PPPP/R2QKBNR w KQkq - 0 5',
          say: 'lecons.tactique.defendre.e4.say',
          instruction: 'lecons.tactique.defendre.e4.instruction',
          answers: ['Bh4', 'Bf4', 'Be3', 'Bd2', 'Bc1', 'Bxf6'],
          hint: 'lecons.tactique.defendre.e4.hint',
          arrows: [{ from: 'h6', to: 'g5', color: 'red' }],
        },
        {
          // La dame d7 attaque la tour a4. La sauver est possible ; mieux vaut
          // la fourchette avec échec, qui gagne la dame.
          kind: 'play',
          fen: '6k1/3q1p1p/6p1/8/R3N3/7P/5PP1/6K1 w - - 0 1',
          say: 'lecons.tactique.defendre.e5.say',
          instruction: 'lecons.tactique.defendre.e5.instruction',
          answers: ['Nf6+'],
          hint: 'lecons.tactique.defendre.e5.hint',
          arrows: [{ from: 'd7', to: 'a4', color: 'red' }],
          reply: 'Kg7',
        },
        {
          kind: 'play',
          say: 'lecons.tactique.defendre.e6.say',
          instruction: 'lecons.tactique.defendre.e6.instruction',
          answers: ['Nxd7'],
          hint: 'lecons.tactique.defendre.e6.hint',
        },
        {
          kind: 'show',
          say: 'lecons.tactique.defendre.e7.say',
        },
      ],
    },
    {
      id: 'sacrifice',
      title: 'lecons.tactique.sacrifice.title',
      summary: 'lecons.tactique.sacrifice.summary',
      level: 'advanced',
      minutes: 6,
      icon: '💥',
      steps: [
        {
          kind: 'show',
          fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 5',
          say: 'lecons.tactique.sacrifice.e1.say',
        },
        {
          kind: 'show',
          fen: 'r1bqkb1r/pppp1Bpp/2n2n2/4p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 4',
          say: 'lecons.tactique.sacrifice.e2.say',
          highlight: ['f7'],
        },
        {
          kind: 'show',
          say: 'lecons.tactique.sacrifice.e3.say',
        },
        {
          kind: 'show',
          say: 'lecons.tactique.sacrifice.e4.say',
        },
      ],
    },
  ],
}
