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
  title: 'lecons.ouverture.title',
  description: 'lecons.ouverture.description',
  level: 'beginner',
  icon: '🌅',
  lessons: [
    {
      id: 'principes-ouverture',
      title: 'lecons.ouverture.principes-ouverture.title',
      summary: 'lecons.ouverture.principes-ouverture.summary',
      level: 'beginner',
      minutes: 7,
      icon: '🧭',
      steps: [
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          say: 'lecons.ouverture.principes-ouverture.e1.say',
          highlight: ['d4', 'd5', 'e4', 'e5'],
        },
        {
          kind: 'play',
          say: 'lecons.ouverture.principes-ouverture.e2.say',
          instruction: 'lecons.ouverture.principes-ouverture.e2.instruction',
          answers: ['e4', 'd4'],
          hint: 'lecons.ouverture.principes-ouverture.e2.hint',
        },
        {
          kind: 'show',
          say: 'lecons.ouverture.principes-ouverture.e3.say',
          arrows: [
            { from: 'e4', to: 'd5', color: 'green' },
            { from: 'e4', to: 'f5', color: 'green' },
          ],
          reply: 'e5',
        },
        {
          kind: 'play',
          say: 'lecons.ouverture.principes-ouverture.e4.say',
          instruction: 'lecons.ouverture.principes-ouverture.e4.instruction',
          answers: ['Nf3'],
          hint: 'lecons.ouverture.principes-ouverture.e4.hint',
          reply: 'Nc6',
        },
        {
          kind: 'play',
          say: 'lecons.ouverture.principes-ouverture.e5.say',
          instruction: 'lecons.ouverture.principes-ouverture.e5.instruction',
          answers: ['Bc4', 'Bb5'],
          hint: 'lecons.ouverture.principes-ouverture.e5.hint',
          reply: 'Nf6',
        },
        {
          kind: 'play',
          say: 'lecons.ouverture.principes-ouverture.e6.say',
          instruction: 'lecons.ouverture.principes-ouverture.e6.instruction',
          answers: ['O-O'],
          hint: 'lecons.ouverture.principes-ouverture.e6.hint',
        },
        {
          kind: 'show',
          say: 'lecons.ouverture.principes-ouverture.e7.say',
        },
      ],
    },
    {
      id: 'erreurs-ouverture',
      title: 'lecons.ouverture.erreurs-ouverture.title',
      summary: 'lecons.ouverture.erreurs-ouverture.summary',
      level: 'beginner',
      minutes: 6,
      icon: '🚫',
      steps: [
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
          say: 'lecons.ouverture.erreurs-ouverture.e1.say',
        },
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2',
          say: 'lecons.ouverture.erreurs-ouverture.e2.say',
        },
        {
          kind: 'show',
          fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 2 3',
          say: 'lecons.ouverture.erreurs-ouverture.e3.say',
        },
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
          say: 'lecons.ouverture.erreurs-ouverture.e4.say',
        },
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppppppp/8/8/8/P6P/1PPPPPP1/RNBQKBNR b KQkq - 0 2',
          say: 'lecons.ouverture.erreurs-ouverture.e5.say',
        },
        {
          kind: 'show',
          fen: 'rnbqkbnr/ppp2ppp/3p4/4p3/4P3/8/PPPPKPPP/RNBQ1BNR b kq - 1 3',
          say: 'lecons.ouverture.erreurs-ouverture.e6.say',
        },
        {
          kind: 'show',
          say: 'lecons.ouverture.erreurs-ouverture.e7.say',
        },
      ],
    },
  ],
}

export const middlegameChapter: Chapter = {
  id: 'milieu',
  title: 'lecons.milieu.title',
  description: 'lecons.milieu.description',
  level: 'intermediate',
  icon: '🏗️',
  lessons: [
    {
      id: 'colonnes-ouvertes',
      title: 'lecons.milieu.colonnes-ouvertes.title',
      summary: 'lecons.milieu.colonnes-ouvertes.summary',
      level: 'intermediate',
      minutes: 6,
      icon: '🛣️',
      steps: [
        {
          kind: 'show',
          fen: 'r2q1rk1/pp2ppbp/2n2np1/2p5/4P3/2N1BN2/PP1Q1PPP/R4RK1 w - - 0 1',
          say: 'lecons.milieu.colonnes-ouvertes.e1.say',
          highlight: ['d1', 'd2', 'd3', 'd5', 'd6', 'd7', 'd8'],
        },
        {
          kind: 'play',
          say: 'lecons.milieu.colonnes-ouvertes.e2.say',
          instruction: 'lecons.milieu.colonnes-ouvertes.e2.instruction',
          answers: ['Rad1', 'Rfd1'],
          hint: 'lecons.milieu.colonnes-ouvertes.e2.hint',
        },
        {
          kind: 'show',
          say: 'lecons.milieu.colonnes-ouvertes.e3.say',
        },
        {
          kind: 'show',
          say: 'lecons.milieu.colonnes-ouvertes.e4.say',
        },
      ],
    },
    {
      id: 'avant-poste',
      title: 'lecons.milieu.avant-poste.title',
      summary: 'lecons.milieu.avant-poste.summary',
      level: 'intermediate',
      minutes: 5,
      icon: '🏰',
      steps: [
        {
          kind: 'show',
          fen: 'r1bq1rk1/pp3ppp/2n1pn2/2ppN3/3P4/2P1P3/PP3PPP/RNBQ1RK1 w - - 0 1',
          say: 'lecons.milieu.avant-poste.e1.say',
          highlight: ['e5'],
        },
        {
          kind: 'show',
          say: 'lecons.milieu.avant-poste.e2.say',
          circles: [{ square: 'e5', color: 'green' }],
        },
        {
          kind: 'show',
          say: 'lecons.milieu.avant-poste.e3.say',
        },
      ],
    },
    {
      id: 'securite-roi',
      title: 'lecons.milieu.securite-roi.title',
      summary: 'lecons.milieu.securite-roi.summary',
      level: 'intermediate',
      minutes: 6,
      icon: '🛡️',
      steps: [
        {
          kind: 'show',
          fen: 'r1bq1rk1/ppp2ppp/2n2n2/2bpp3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 1',
          say: 'lecons.milieu.securite-roi.e1.say',
          highlight: ['f7', 'g7', 'h7'],
        },
        {
          kind: 'show',
          fen: 'r1bq1rk1/ppp2p1p/2n2np1/2bpp3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 1',
          say: 'lecons.milieu.securite-roi.e2.say',
          highlight: ['f6', 'h6'],
        },
        {
          kind: 'show',
          say: 'lecons.milieu.securite-roi.e3.say',
        },
        {
          kind: 'show',
          say: 'lecons.milieu.securite-roi.e4.say',
        },
      ],
    },
  ],
}

export const endgameChapter: Chapter = {
  id: 'finale',
  title: 'lecons.finale.title',
  description: 'lecons.finale.description',
  level: 'intermediate',
  icon: '🏁',
  lessons: [
    {
      id: 'roi-actif',
      title: 'lecons.finale.roi-actif.title',
      summary: 'lecons.finale.roi-actif.summary',
      level: 'intermediate',
      minutes: 5,
      icon: '🚶',
      steps: [
        {
          kind: 'show',
          fen: '8/5k2/8/8/8/8/5K2/8 w - - 0 1',
          say: 'lecons.finale.roi-actif.e1.say',
        },
        {
          kind: 'show',
          fen: '8/8/8/3k4/8/8/8/4K3 w - - 0 1',
          say: 'lecons.finale.roi-actif.e2.say',
          arrows: [{ from: 'e1', to: 'e4', color: 'green' }],
        },
        {
          kind: 'play',
          say: 'lecons.finale.roi-actif.e3.say',
          instruction: 'lecons.finale.roi-actif.e3.instruction',
          answers: ['Ke2', 'Kd2', 'Kf2', 'Kd1', 'Kf1'],
          hint: 'lecons.finale.roi-actif.e3.hint',
        },
        {
          kind: 'show',
          say: 'lecons.finale.roi-actif.e4.say',
        },
      ],
    },
    {
      id: 'opposition',
      title: 'lecons.finale.opposition.title',
      summary: 'lecons.finale.opposition.summary',
      level: 'intermediate',
      minutes: 7,
      icon: '⚔️',
      steps: [
        {
          kind: 'show',
          fen: '8/8/4k3/8/4K3/8/8/8 w - - 0 1',
          say: 'lecons.finale.opposition.e1.say',
          highlight: ['e4', 'e6', 'e5'],
        },
        {
          kind: 'show',
          say: 'lecons.finale.opposition.e2.say',
        },
        {
          kind: 'show',
          fen: '8/8/8/4k3/4P3/4K3/8/8 b - - 0 1',
          say: 'lecons.finale.opposition.e3.say',
        },
        {
          kind: 'show',
          fen: '8/8/8/3k4/8/3KP3/8/8 w - - 0 1',
          say: 'lecons.finale.opposition.e4.say',
          arrows: [{ from: 'd3', to: 'd4', color: 'green' }],
        },
        {
          kind: 'show',
          say: 'lecons.finale.opposition.e5.say',
        },
      ],
    },
    {
      id: 'regle-du-carre',
      title: 'lecons.finale.regle-du-carre.title',
      summary: 'lecons.finale.regle-du-carre.summary',
      level: 'intermediate',
      minutes: 5,
      icon: '⬜',
      steps: [
        {
          kind: 'show',
          fen: '8/8/8/8/7k/8/P7/K7 w - - 0 1',
          say: 'lecons.finale.regle-du-carre.e1.say',
        },
        {
          kind: 'show',
          say: 'lecons.finale.regle-du-carre.e2.say',
          highlight: ['a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'f8', 'a8'],
        },
        {
          kind: 'show',
          say: 'lecons.finale.regle-du-carre.e3.say',
        },
        {
          kind: 'show',
          say: 'lecons.finale.regle-du-carre.e4.say',
        },
        {
          kind: 'show',
          say: 'lecons.finale.regle-du-carre.e5.say',
        },
      ],
    },
    {
      id: 'pion-passe',
      title: 'lecons.finale.pion-passe.title',
      summary: 'lecons.finale.pion-passe.summary',
      level: 'intermediate',
      minutes: 6,
      icon: '🏃',
      steps: [
        {
          kind: 'show',
          fen: '8/8/4k3/8/2P5/8/5K2/8 w - - 0 1',
          say: 'lecons.finale.pion-passe.e1.say',
          highlight: ['c4', 'c5', 'c6', 'c7', 'c8'],
        },
        {
          kind: 'show',
          say: 'lecons.finale.pion-passe.e2.say',
        },
        {
          kind: 'show',
          fen: '8/8/8/8/2P5/8/1P3K2/4k3 w - - 0 1',
          say: 'lecons.finale.pion-passe.e3.say',
          highlight: ['c4'],
        },
        {
          kind: 'show',
          say: 'lecons.finale.pion-passe.e4.say',
        },
      ],
    },
  ],
}
