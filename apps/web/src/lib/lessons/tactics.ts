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
