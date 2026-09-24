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

import { BookOpen, BowArrow, ChessQueen, Croissant, Pizza, Sun, Swords } from 'lucide-react'
import type { Chapter } from './types.ts'

export const repertoireChapter: Chapter = {
  id: 'repertoire',
  title: 'lecons.repertoire.title',
  description: 'lecons.repertoire.description',
  level: 'intermediate',
  icon: BookOpen,
  lessons: [
    // ── 7.1 Partie italienne ────────────────────────────────────────────────
    {
      id: 'italienne',
      title: 'lecons.repertoire.italienne.title',
      summary: 'lecons.repertoire.italienne.summary',
      level: 'beginner',
      minutes: 6,
      icon: Pizza,
      steps: [
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          say: 'lecons.repertoire.italienne.e1.say',
        },
        {
          kind: 'play',
          say: 'lecons.repertoire.italienne.e2.say',
          instruction: 'lecons.repertoire.italienne.e2.instruction',
          answers: ['e4'],
          reply: 'e5',
        },
        {
          kind: 'play',
          say: 'lecons.repertoire.italienne.e3.say',
          instruction: 'lecons.repertoire.italienne.e3.instruction',
          answers: ['Nf3'],
          reply: 'Nc6',
        },
        {
          kind: 'play',
          say: 'lecons.repertoire.italienne.e4.say',
          instruction: 'lecons.repertoire.italienne.e4.instruction',
          answers: ['Bc4'],
          hint: 'lecons.repertoire.italienne.e4.hint',
          reply: 'Bc5',
        },
        {
          kind: 'show',
          say: 'lecons.repertoire.italienne.e5.say',
          highlight: ['c4', 'c5', 'f7', 'f2'],
        },
        {
          kind: 'show',
          say: 'lecons.repertoire.italienne.e6.say',
          arrows: [
            { from: 'c2', to: 'c3', color: 'green' },
            { from: 'd2', to: 'd4', color: 'green' },
          ],
        },
        {
          kind: 'show',
          say: 'lecons.repertoire.italienne.e7.say',
        },
      ],
    },

    // ── 7.2 Partie espagnole ────────────────────────────────────────────────
    {
      id: 'espagnole',
      title: 'lecons.repertoire.espagnole.title',
      summary: 'lecons.repertoire.espagnole.summary',
      level: 'intermediate',
      minutes: 6,
      icon: Sun,
      steps: [
        {
          kind: 'show',
          fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
          say: 'lecons.repertoire.espagnole.e1.say',
        },
        {
          kind: 'play',
          say: 'lecons.repertoire.espagnole.e2.say',
          instruction: 'lecons.repertoire.espagnole.e2.instruction',
          answers: ['Bb5'],
          reply: 'a6',
        },
        {
          kind: 'show',
          say: 'lecons.repertoire.espagnole.e3.say',
          highlight: ['a6', 'b5'],
        },
        {
          kind: 'show',
          say: 'lecons.repertoire.espagnole.e4.say',
          arrows: [
            { from: 'b5', to: 'c6', color: 'orange' },
            { from: 'b5', to: 'a4', color: 'green' },
          ],
        },
        {
          kind: 'show',
          say: 'lecons.repertoire.espagnole.e5.say',
        },
        {
          kind: 'show',
          say: 'lecons.repertoire.espagnole.e6.say',
        },
      ],
    },

    // ── 7.3 Défense sicilienne ──────────────────────────────────────────────
    {
      id: 'sicilienne',
      title: 'lecons.repertoire.sicilienne.title',
      summary: 'lecons.repertoire.sicilienne.summary',
      level: 'intermediate',
      minutes: 7,
      icon: Swords,
      steps: [
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
          say: 'lecons.repertoire.sicilienne.e1.say',
        },
        {
          kind: 'play',
          say: 'lecons.repertoire.sicilienne.e2.say',
          instruction: 'lecons.repertoire.sicilienne.e2.instruction',
          answers: ['c5'],
          orientation: 'b',
          reply: 'Nf3',
        },
        {
          kind: 'show',
          say: 'lecons.repertoire.sicilienne.e3.say',
          orientation: 'b',
          highlight: ['c5', 'd4'],
        },
        {
          kind: 'show',
          fen: 'rnbqkbnr/pp1ppppp/8/8/3pP3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 4',
          orientation: 'b',
          say: 'lecons.repertoire.sicilienne.e4.say',
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'lecons.repertoire.sicilienne.e5.say',
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'lecons.repertoire.sicilienne.e6.say',
          arrows: [
            { from: 'g2', to: 'g4', color: 'red' },
            { from: 'c8', to: 'c1', color: 'green' },
          ],
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'lecons.repertoire.sicilienne.e7.say',
        },
      ],
    },

    // ── 7.4 Défense française ───────────────────────────────────────────────
    {
      id: 'francaise',
      title: 'lecons.repertoire.francaise.title',
      summary: 'lecons.repertoire.francaise.summary',
      level: 'intermediate',
      minutes: 6,
      icon: Croissant,
      steps: [
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
          say: 'lecons.repertoire.francaise.e1.say',
        },
        {
          kind: 'play',
          say: 'lecons.repertoire.francaise.e2.say',
          instruction: 'lecons.repertoire.francaise.e2.instruction',
          answers: ['e6'],
          orientation: 'b',
          reply: 'd4',
        },
        {
          kind: 'play',
          say: 'lecons.repertoire.francaise.e3.say',
          instruction: 'lecons.repertoire.francaise.e3.instruction',
          answers: ['d5'],
          orientation: 'b',
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'lecons.repertoire.francaise.e4.say',
          highlight: ['c8', 'd7', 'e6'],
          circles: [{ square: 'c8', color: 'red' }],
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'lecons.repertoire.francaise.e5.say',
          arrows: [
            { from: 'c8', to: 'a6', color: 'green' },
            { from: 'f7', to: 'f6', color: 'blue' },
          ],
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'lecons.repertoire.francaise.e6.say',
          arrows: [{ from: 'c7', to: 'c5', color: 'green' }],
        },
      ],
    },

    // ── 7.5 Gambit dame ─────────────────────────────────────────────────────
    {
      id: 'gambit-dame',
      title: 'lecons.repertoire.gambit-dame.title',
      summary: 'lecons.repertoire.gambit-dame.summary',
      level: 'intermediate',
      minutes: 6,
      icon: ChessQueen,
      steps: [
        {
          kind: 'show',
          fen: 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2',
          say: 'lecons.repertoire.gambit-dame.e1.say',
        },
        {
          kind: 'play',
          say: 'lecons.repertoire.gambit-dame.e2.say',
          instruction: 'lecons.repertoire.gambit-dame.e2.instruction',
          answers: ['c4'],
        },
        {
          kind: 'show',
          say: 'lecons.repertoire.gambit-dame.e3.say',
          highlight: ['c4', 'd5'],
        },
        {
          kind: 'show',
          fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2',
          say: 'lecons.repertoire.gambit-dame.e4.say',
          arrows: [
            { from: 'e7', to: 'e6', color: 'blue' },
            { from: 'c7', to: 'c6', color: 'green' },
          ],
        },
        {
          kind: 'show',
          say: 'lecons.repertoire.gambit-dame.e5.say',
        },
        {
          kind: 'show',
          say: 'lecons.repertoire.gambit-dame.e6.say',
        },
      ],
    },

    // ── 7.6 Défense est-indienne ────────────────────────────────────────────
    {
      id: 'est-indienne',
      title: 'lecons.repertoire.est-indienne.title',
      summary: 'lecons.repertoire.est-indienne.summary',
      level: 'advanced',
      minutes: 6,
      icon: BowArrow,
      steps: [
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1',
          say: 'lecons.repertoire.est-indienne.e1.say',
        },
        {
          kind: 'play',
          say: 'lecons.repertoire.est-indienne.e2.say',
          instruction: 'lecons.repertoire.est-indienne.e2.instruction',
          answers: ['Nf6'],
          orientation: 'b',
          reply: 'c4',
        },
        {
          kind: 'play',
          say: 'lecons.repertoire.est-indienne.e3.say',
          instruction: 'lecons.repertoire.est-indienne.e3.instruction',
          answers: ['g6'],
          orientation: 'b',
          reply: 'Nc3',
        },
        {
          kind: 'play',
          say: 'lecons.repertoire.est-indienne.e4.say',
          instruction: 'lecons.repertoire.est-indienne.e4.instruction',
          answers: ['Bg7'],
          orientation: 'b',
          arrows: [{ from: 'g7', to: 'a1', color: 'green' }],
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'lecons.repertoire.est-indienne.e5.say',
          highlight: ['d4', 'e4', 'c4'],
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'lecons.repertoire.est-indienne.e6.say',
          arrows: [
            { from: 'e7', to: 'e5', color: 'green' },
            { from: 'f7', to: 'f5', color: 'red' },
          ],
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'lecons.repertoire.est-indienne.e7.say',
        },
      ],
    },
  ],
}
