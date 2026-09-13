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
  title: 'lecons.pieges.title',
  description: 'lecons.pieges.description',
  level: 'intermediate',
  // Pas le 🪤 : « Les mats de l'ouverture » le porte déjà, et deux chapitres
  // avec la même icône dans le même sommaire ne se distinguent plus.
  icon: '🎣',
  lessons: [
    // ── Le Fegatello ────────────────────────────────────────────────────────
    {
      id: 'piege-fegatello',
      title: 'lecons.pieges.piege-fegatello.title',
      summary: 'lecons.pieges.piege-fegatello.summary',
      level: 'beginner',
      minutes: 7,
      icon: '🍖',
      steps: [
        {
          kind: 'show',
          fen: START,
          say: 'lecons.pieges.piege-fegatello.e1.say',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-fegatello.e2.say',
          instruction: 'lecons.pieges.piege-fegatello.e2.instruction',
          answers: ['e4'],
          reply: 'e5',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-fegatello.e3.say',
          instruction: 'lecons.pieges.piege-fegatello.e3.instruction',
          answers: ['Nf3'],
          reply: 'Nc6',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-fegatello.e4.say',
          instruction: 'lecons.pieges.piege-fegatello.e4.instruction',
          answers: ['Bc4'],
          highlight: ['f7'],
          reply: 'Nf6',
        },
        {
          kind: 'show',
          say: 'lecons.pieges.piege-fegatello.e5.say',
          highlight: ['f7'],
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-fegatello.e6.say',
          instruction: 'lecons.pieges.piege-fegatello.e6.instruction',
          answers: ['Ng5'],
          arrows: [
            { from: 'g5', to: 'f7', color: 'red' },
            { from: 'c4', to: 'f7', color: 'red' },
          ],
          reply: 'd5',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-fegatello.e7.say',
          instruction: 'lecons.pieges.piege-fegatello.e7.instruction',
          answers: ['exd5'],
          reply: 'Nxd5',
        },
        {
          kind: 'show',
          say: 'lecons.pieges.piege-fegatello.e8.say',
          highlight: ['d5', 'f7'],
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-fegatello.e9.say',
          instruction: 'lecons.pieges.piege-fegatello.e9.instruction',
          answers: ['Nxf7'],
          reply: 'Kxf7',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-fegatello.e10.say',
          instruction: 'lecons.pieges.piege-fegatello.e10.instruction',
          answers: ['Qf3+'],
          arrows: [
            { from: 'f3', to: 'f7', color: 'red' },
            { from: 'f3', to: 'd5', color: 'orange' },
          ],
          reply: 'Ke6',
        },
        {
          kind: 'show',
          say: 'lecons.pieges.piege-fegatello.e11.say',
          highlight: ['e6', 'd5'],
        },
        {
          kind: 'show',
          fen: START,
          orientation: 'b',
          say: 'lecons.pieges.piege-fegatello.e12.say',
          reply: 'e4',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-fegatello.e13.say',
          instruction: 'lecons.pieges.piege-fegatello.e13.instruction',
          answers: ['e5'],
          orientation: 'b',
          reply: 'Nf3',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-fegatello.e14.say',
          instruction: 'lecons.pieges.piege-fegatello.e14.instruction',
          answers: ['Nc6'],
          orientation: 'b',
          reply: 'Bc4',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-fegatello.e15.say',
          instruction: 'lecons.pieges.piege-fegatello.e15.instruction',
          answers: ['Nf6'],
          orientation: 'b',
          reply: 'Ng5',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-fegatello.e16.say',
          instruction: 'lecons.pieges.piege-fegatello.e16.instruction',
          answers: ['d5'],
          orientation: 'b',
          hint: 'lecons.pieges.piege-fegatello.e16.hint',
          reply: 'exd5',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-fegatello.e17.say',
          instruction: 'lecons.pieges.piege-fegatello.e17.instruction',
          answers: ['Na5'],
          orientation: 'b',
          hint: 'lecons.pieges.piege-fegatello.e17.hint',
          reply: 'Bb5+',
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'lecons.pieges.piege-fegatello.e18.say',
          highlight: ['a5', 'f7'],
        },
      ],
    },

    // ── Le piège de l'éléphant ──────────────────────────────────────────────
    {
      id: 'piege-elephant',
      title: 'lecons.pieges.piege-elephant.title',
      summary: 'lecons.pieges.piege-elephant.summary',
      level: 'intermediate',
      minutes: 7,
      icon: '🐘',
      steps: [
        {
          kind: 'show',
          fen: START,
          orientation: 'b',
          say: 'lecons.pieges.piege-elephant.e1.say',
          reply: 'd4',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-elephant.e2.say',
          instruction: 'lecons.pieges.piege-elephant.e2.instruction',
          answers: ['d5'],
          orientation: 'b',
          reply: 'c4',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-elephant.e3.say',
          instruction: 'lecons.pieges.piege-elephant.e3.instruction',
          answers: ['e6'],
          orientation: 'b',
          reply: 'Nc3',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-elephant.e4.say',
          instruction: 'lecons.pieges.piege-elephant.e4.instruction',
          answers: ['Nf6'],
          orientation: 'b',
          reply: 'Bg5',
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'lecons.pieges.piege-elephant.e5.say',
          arrows: [{ from: 'g5', to: 'd8', color: 'red' }],
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-elephant.e6.say',
          instruction: 'lecons.pieges.piege-elephant.e6.instruction',
          answers: ['Nbd7'],
          orientation: 'b',
          hint: 'lecons.pieges.piege-elephant.e6.hint',
          reply: 'cxd5',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-elephant.e7.say',
          instruction: 'lecons.pieges.piege-elephant.e7.instruction',
          answers: ['exd5'],
          orientation: 'b',
          reply: 'Nxd5',
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'lecons.pieges.piege-elephant.e8.say',
          highlight: ['d5', 'f6', 'd8'],
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-elephant.e9.say',
          instruction: 'lecons.pieges.piege-elephant.e9.instruction',
          answers: ['Nxd5'],
          orientation: 'b',
          hint: 'lecons.pieges.piege-elephant.e9.hint',
          reply: 'Bxd8',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-elephant.e10.say',
          instruction: 'lecons.pieges.piege-elephant.e10.instruction',
          answers: ['Bb4+'],
          orientation: 'b',
          arrows: [{ from: 'b4', to: 'e1', color: 'red' }],
          reply: 'Qd2',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-elephant.e11.say',
          instruction: 'lecons.pieges.piege-elephant.e11.instruction',
          answers: ['Bxd2+'],
          orientation: 'b',
          reply: 'Kxd2',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-elephant.e12.say',
          instruction: 'lecons.pieges.piege-elephant.e12.instruction',
          answers: ['Kxd8'],
          orientation: 'b',
          reply: 'Nf3',
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'lecons.pieges.piege-elephant.e13.say',
          highlight: ['d8', 'd5'],
        },
      ],
    },

    // ── Le piège de Kieninger ───────────────────────────────────────────────
    {
      id: 'piege-kieninger',
      title: 'lecons.pieges.piege-kieninger.title',
      summary: 'lecons.pieges.piege-kieninger.summary',
      level: 'intermediate',
      minutes: 6,
      icon: '😵',
      steps: [
        {
          kind: 'show',
          fen: START,
          orientation: 'b',
          say: 'lecons.pieges.piege-kieninger.e1.say',
          reply: 'd4',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-kieninger.e2.say',
          instruction: 'lecons.pieges.piege-kieninger.e2.instruction',
          answers: ['Nf6'],
          orientation: 'b',
          reply: 'c4',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-kieninger.e3.say',
          instruction: 'lecons.pieges.piege-kieninger.e3.instruction',
          answers: ['e5'],
          orientation: 'b',
          reply: 'dxe5',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-kieninger.e4.say',
          instruction: 'lecons.pieges.piege-kieninger.e4.instruction',
          answers: ['Ng4'],
          orientation: 'b',
          reply: 'Bf4',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-kieninger.e5.say',
          instruction: 'lecons.pieges.piege-kieninger.e5.instruction',
          answers: ['Nc6'],
          orientation: 'b',
          reply: 'Nf3',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-kieninger.e6.say',
          instruction: 'lecons.pieges.piege-kieninger.e6.instruction',
          answers: ['Bb4+'],
          orientation: 'b',
          reply: 'Nbd2',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-kieninger.e7.say',
          instruction: 'lecons.pieges.piege-kieninger.e7.instruction',
          answers: ['Qe7'],
          orientation: 'b',
          arrows: [{ from: 'e7', to: 'e2', color: 'blue' }],
          reply: 'a3',
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'lecons.pieges.piege-kieninger.e8.say',
          highlight: ['b4', 'e1'],
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-kieninger.e9.say',
          instruction: 'lecons.pieges.piege-kieninger.e9.instruction',
          answers: ['Ngxe5'],
          orientation: 'b',
          hint: 'lecons.pieges.piege-kieninger.e9.hint',
          reply: 'axb4',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-kieninger.e10.say',
          instruction: 'lecons.pieges.piege-kieninger.e10.instruction',
          answers: ['Nd3#'],
          orientation: 'b',
          hint: 'lecons.pieges.piege-kieninger.e10.hint',
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'lecons.pieges.piege-kieninger.e11.say',
          highlight: ['d3', 'e2', 'e7', 'e1'],
        },
      ],
    },

    // ── Le piège de Lasker ──────────────────────────────────────────────────
    {
      id: 'piege-lasker',
      title: 'lecons.pieges.piege-lasker.title',
      summary: 'lecons.pieges.piege-lasker.summary',
      level: 'advanced',
      minutes: 6,
      icon: '♘',
      steps: [
        {
          kind: 'show',
          fen: START,
          orientation: 'b',
          say: 'lecons.pieges.piege-lasker.e1.say',
          reply: 'd4',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-lasker.e2.say',
          instruction: 'lecons.pieges.piege-lasker.e2.instruction',
          answers: ['d5'],
          orientation: 'b',
          reply: 'c4',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-lasker.e3.say',
          instruction: 'lecons.pieges.piege-lasker.e3.instruction',
          answers: ['e5'],
          orientation: 'b',
          reply: 'dxe5',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-lasker.e4.say',
          instruction: 'lecons.pieges.piege-lasker.e4.instruction',
          answers: ['d4'],
          orientation: 'b',
          reply: 'e3',
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'lecons.pieges.piege-lasker.e5.say',
          highlight: ['e3', 'e1'],
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-lasker.e6.say',
          instruction: 'lecons.pieges.piege-lasker.e6.instruction',
          answers: ['Bb4+'],
          orientation: 'b',
          reply: 'Bd2',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-lasker.e7.say',
          instruction: 'lecons.pieges.piege-lasker.e7.instruction',
          answers: ['dxe3'],
          orientation: 'b',
          reply: 'Bxb4',
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'lecons.pieges.piege-lasker.e8.say',
          highlight: ['e3', 'f2'],
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-lasker.e9.say',
          instruction: 'lecons.pieges.piege-lasker.e9.instruction',
          answers: ['exf2+'],
          orientation: 'b',
          reply: 'Ke2',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-lasker.e10.say',
          instruction: 'lecons.pieges.piege-lasker.e10.instruction',
          answers: ['fxg1=N+'],
          orientation: 'b',
          hint: 'lecons.pieges.piege-lasker.e10.hint',
          reply: 'Rxg1',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-lasker.e11.say',
          instruction: 'lecons.pieges.piege-lasker.e11.instruction',
          answers: ['Bg4+'],
          orientation: 'b',
          arrows: [{ from: 'g4', to: 'd1', color: 'orange' }],
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'lecons.pieges.piege-lasker.e12.say',
          highlight: ['g4', 'd1', 'e2'],
        },
      ],
    },

    // ── L'arche de Noé ──────────────────────────────────────────────────────
    {
      id: 'piege-arche-de-noe',
      title: 'lecons.pieges.piege-arche-de-noe.title',
      summary: 'lecons.pieges.piege-arche-de-noe.summary',
      level: 'intermediate',
      minutes: 7,
      icon: '🛶',
      steps: [
        {
          kind: 'show',
          fen: START,
          orientation: 'b',
          say: 'lecons.pieges.piege-arche-de-noe.e1.say',
          reply: 'e4',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-arche-de-noe.e2.say',
          instruction: 'lecons.pieges.piege-arche-de-noe.e2.instruction',
          answers: ['e5'],
          orientation: 'b',
          reply: 'Nf3',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-arche-de-noe.e3.say',
          instruction: 'lecons.pieges.piege-arche-de-noe.e3.instruction',
          answers: ['Nc6'],
          orientation: 'b',
          reply: 'Bb5',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-arche-de-noe.e4.say',
          instruction: 'lecons.pieges.piege-arche-de-noe.e4.instruction',
          answers: ['a6'],
          orientation: 'b',
          reply: 'Ba4',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-arche-de-noe.e5.say',
          instruction: 'lecons.pieges.piege-arche-de-noe.e5.instruction',
          answers: ['d6'],
          orientation: 'b',
          reply: 'd4',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-arche-de-noe.e6.say',
          instruction: 'lecons.pieges.piege-arche-de-noe.e6.instruction',
          answers: ['b5'],
          orientation: 'b',
          arrows: [{ from: 'b5', to: 'a4', color: 'red' }],
          reply: 'Bb3',
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'lecons.pieges.piege-arche-de-noe.e7.say',
          highlight: ['b3', 'a2', 'c2', 'a4', 'c4'],
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-arche-de-noe.e8.say',
          instruction: 'lecons.pieges.piege-arche-de-noe.e8.instruction',
          answers: ['Nxd4'],
          orientation: 'b',
          reply: 'Nxd4',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-arche-de-noe.e9.say',
          instruction: 'lecons.pieges.piege-arche-de-noe.e9.instruction',
          answers: ['exd4'],
          orientation: 'b',
          reply: 'Qxd4',
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'lecons.pieges.piege-arche-de-noe.e10.say',
          highlight: ['d4', 'b3'],
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-arche-de-noe.e11.say',
          instruction: 'lecons.pieges.piege-arche-de-noe.e11.instruction',
          answers: ['c5'],
          orientation: 'b',
          reply: 'Qd5',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-arche-de-noe.e12.say',
          instruction: 'lecons.pieges.piege-arche-de-noe.e12.instruction',
          answers: ['Be6'],
          orientation: 'b',
          reply: 'Qc6+',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-arche-de-noe.e13.say',
          instruction: 'lecons.pieges.piege-arche-de-noe.e13.instruction',
          answers: ['Bd7'],
          orientation: 'b',
          reply: 'Qd5',
        },
        {
          kind: 'play',
          say: 'lecons.pieges.piege-arche-de-noe.e14.say',
          instruction: 'lecons.pieges.piege-arche-de-noe.e14.instruction',
          answers: ['c4'],
          orientation: 'b',
          arrows: [{ from: 'c4', to: 'b3', color: 'orange' }],
        },
        {
          kind: 'show',
          orientation: 'b',
          say: 'lecons.pieges.piege-arche-de-noe.e15.say',
          highlight: ['b3', 'c4', 'b5'],
        },
      ],
    },
  ],
}
