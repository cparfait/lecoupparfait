/**
 * Chapitre 1 — Les bases.
 *
 * Le point de départ absolu : quelqu'un qui n'a jamais joué. On procède pièce
 * par pièce, en isolant chaque fois une seule idée, avec un échiquier presque
 * vide pour que rien ne distraie.
 *
 * L'ordre n'est pas alphabétique mais pédagogique : la tour d'abord parce que
 * son déplacement est le plus simple à énoncer, le cavalier en dernier parmi
 * les pièces mobiles parce que son saut est le plus déroutant.
 */

import {
  Castle,
  ChessBishop,
  ChessKing,
  ChessKnight,
  ChessPawn,
  ChessQueen,
  ChessRook,
  Crown,
  Grid3x3,
  Scale,
  Sparkles,
} from 'lucide-react'
import type { Chapter } from './types.ts'

export const basicsChapter: Chapter = {
  id: 'bases',
  title: 'lecons.bases.title',
  description: 'lecons.bases.description',
  level: 'beginner',
  icon: ChessPawn,
  lessons: [
    // ── 1.1 L'échiquier ────────────────────────────────────────────────────
    {
      id: 'echiquier',
      title: 'lecons.bases.echiquier.title',
      summary: 'lecons.bases.echiquier.summary',
      level: 'beginner',
      minutes: 4,
      icon: Grid3x3,
      steps: [
        {
          kind: 'show',
          fen: '8/8/8/8/8/8/8/8 w - - 0 1',
          say: 'lecons.bases.echiquier.e1.say',
        },
        {
          kind: 'show',
          say: 'lecons.bases.echiquier.e2.say',
          highlight: ['a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1'],
        },
        {
          kind: 'show',
          say: 'lecons.bases.echiquier.e3.say',
          highlight: ['e4'],
          spotlight: ['e4', 'd4', 'd5', 'e5'],
        },
        {
          kind: 'show',
          say: 'lecons.bases.echiquier.e4.say',
          highlight: ['d4', 'd5', 'e4', 'e5'],
        },
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          say: 'lecons.bases.echiquier.e5.say',
          highlight: ['d1', 'd8'],
        },
      ],
    },

    // ── 1.2 La tour ────────────────────────────────────────────────────────
    {
      id: 'tour',
      title: 'lecons.bases.tour.title',
      summary: 'lecons.bases.tour.summary',
      level: 'beginner',
      minutes: 4,
      icon: ChessRook,
      steps: [
        {
          kind: 'show',
          fen: '7k/8/8/8/3R4/8/8/K7 w - - 0 1',
          say: 'lecons.bases.tour.e1.say',
          highlight: ['d4'],
          arrows: [
            { from: 'd4', to: 'd8', color: 'green' },
            { from: 'd4', to: 'd1', color: 'green' },
            { from: 'd4', to: 'a4', color: 'green' },
            { from: 'd4', to: 'h4', color: 'green' },
          ],
        },
        {
          kind: 'play',
          say: 'lecons.bases.tour.e2.say',
          instruction: 'lecons.bases.tour.e2.instruction',
          answers: ['Rd8+'],
          hint: 'lecons.bases.tour.e2.hint',
        },
        {
          kind: 'show',
          fen: '7k/8/8/8/3R2p1/8/8/K7 w - - 0 1',
          say: 'lecons.bases.tour.e3.say',
          highlight: ['g4'],
          arrows: [{ from: 'd4', to: 'g4', color: 'green' }],
        },
        {
          kind: 'play',
          say: 'lecons.bases.tour.e4.say',
          instruction: 'lecons.bases.tour.e4.instruction',
          answers: ['Rxg4'],
          hint: 'lecons.bases.tour.e4.hint',
        },
        {
          kind: 'show',
          say: 'lecons.bases.tour.e5.say',
        },
      ],
    },

    // ── 1.3 Le fou ─────────────────────────────────────────────────────────
    {
      id: 'fou',
      title: 'lecons.bases.fou.title',
      summary: 'lecons.bases.fou.summary',
      level: 'beginner',
      minutes: 4,
      icon: ChessBishop,
      steps: [
        {
          kind: 'show',
          fen: '7k/8/8/8/3B4/8/8/K7 w - - 0 1',
          say: 'lecons.bases.fou.e1.say',
          highlight: ['d4'],
          arrows: [
            { from: 'd4', to: 'h8', color: 'green' },
            { from: 'd4', to: 'a7', color: 'green' },
            { from: 'd4', to: 'a1', color: 'green' },
            { from: 'd4', to: 'g1', color: 'green' },
          ],
        },
        {
          kind: 'show',
          say: 'lecons.bases.fou.e2.say',
          circles: [{ square: 'd4', color: 'blue' }],
        },
        {
          kind: 'show',
          say: 'lecons.bases.fou.e3.say',
        },
        {
          kind: 'play',
          fen: '7k/8/5p2/8/3B4/8/8/K7 w - - 0 1',
          say: 'lecons.bases.fou.e4.say',
          instruction: 'lecons.bases.fou.e4.instruction',
          answers: ['Bxf6'],
          hint: 'lecons.bases.fou.e4.hint',
        },
        {
          kind: 'show',
          say: 'lecons.bases.fou.e5.say',
        },
      ],
    },

    // ── 1.4 La dame ────────────────────────────────────────────────────────
    {
      id: 'dame',
      title: 'lecons.bases.dame.title',
      summary: 'lecons.bases.dame.summary',
      level: 'beginner',
      minutes: 4,
      icon: ChessQueen,
      steps: [
        {
          kind: 'show',
          fen: '7k/8/8/8/3Q4/8/8/K7 w - - 0 1',
          say: 'lecons.bases.dame.e1.say',
          highlight: ['d4'],
          arrows: [
            { from: 'd4', to: 'd8', color: 'green' },
            { from: 'd4', to: 'h8', color: 'green' },
            { from: 'd4', to: 'h4', color: 'green' },
            { from: 'd4', to: 'g1', color: 'green' },
            { from: 'd4', to: 'd1', color: 'green' },
            { from: 'd4', to: 'a1', color: 'green' },
            { from: 'd4', to: 'a4', color: 'green' },
            { from: 'd4', to: 'a7', color: 'green' },
          ],
        },
        {
          kind: 'show',
          say: 'lecons.bases.dame.e2.say',
        },
        {
          kind: 'play',
          fen: '3r3k/8/8/8/3Q4/8/8/K7 w - - 0 1',
          say: 'lecons.bases.dame.e3.say',
          instruction: 'lecons.bases.dame.e3.instruction',
          answers: ['Qxd8+'],
          hint: 'lecons.bases.dame.e3.hint',
        },
        {
          kind: 'show',
          say: 'lecons.bases.dame.e4.say',
        },
      ],
    },

    // ── 1.5 Le cavalier ────────────────────────────────────────────────────
    {
      id: 'cavalier',
      title: 'lecons.bases.cavalier.title',
      summary: 'lecons.bases.cavalier.summary',
      level: 'beginner',
      minutes: 5,
      icon: ChessKnight,
      steps: [
        {
          kind: 'show',
          fen: '7k/8/8/8/3N4/8/8/K7 w - - 0 1',
          say: 'lecons.bases.cavalier.e1.say',
          highlight: ['b3', 'b5', 'c2', 'c6', 'e2', 'e6', 'f3', 'f5'],
        },
        {
          kind: 'show',
          say: 'lecons.bases.cavalier.e2.say',
          circles: [{ square: 'd4', color: 'blue' }],
        },
        {
          kind: 'show',
          fen: '7k/8/8/2ppp3/2pNp3/2ppp3/8/K7 w - - 0 1',
          say: 'lecons.bases.cavalier.e3.say',
          arrows: [
            { from: 'd4', to: 'c6', color: 'green' },
            { from: 'd4', to: 'e6', color: 'green' },
            { from: 'd4', to: 'b5', color: 'green' },
            { from: 'd4', to: 'f5', color: 'green' },
          ],
        },
        {
          kind: 'play',
          say: 'lecons.bases.cavalier.e4.say',
          instruction: 'lecons.bases.cavalier.e4.instruction',
          answers: ['Nc6', 'Ne6', 'Nb5', 'Nf5'],
          hint: 'lecons.bases.cavalier.e4.hint',
        },
        {
          kind: 'show',
          say: 'lecons.bases.cavalier.e5.say',
        },
      ],
    },

    // ── 1.6 Le pion ────────────────────────────────────────────────────────
    {
      id: 'pion',
      title: 'lecons.bases.pion.title',
      summary: 'lecons.bases.pion.summary',
      level: 'beginner',
      minutes: 5,
      icon: ChessPawn,
      steps: [
        {
          kind: 'show',
          fen: '7k/8/8/8/8/8/3P4/K7 w - - 0 1',
          say: 'lecons.bases.pion.e1.say',
          arrows: [{ from: 'd2', to: 'd3', color: 'green' }],
        },
        {
          kind: 'show',
          say: 'lecons.bases.pion.e2.say',
          arrows: [{ from: 'd2', to: 'd4', color: 'blue' }],
        },
        {
          kind: 'play',
          say: 'lecons.bases.pion.e3.say',
          instruction: 'lecons.bases.pion.e3.instruction',
          answers: ['d4'],
          hint: 'lecons.bases.pion.e3.hint',
        },
        {
          kind: 'show',
          fen: '7k/8/8/8/2p1p3/8/3P4/K7 w - - 0 1',
          say: 'lecons.bases.pion.e4.say',
          highlight: ['c3', 'e3'],
        },
        {
          kind: 'show',
          fen: '7k/8/8/8/8/2p1p3/3P4/K7 w - - 0 1',
          say: 'lecons.bases.pion.e5.say',
          arrows: [
            { from: 'd2', to: 'c3', color: 'green' },
            { from: 'd2', to: 'e3', color: 'green' },
          ],
        },
        {
          kind: 'play',
          say: 'lecons.bases.pion.e6.say',
          instruction: 'lecons.bases.pion.e6.instruction',
          answers: ['dxc3', 'dxe3'],
          hint: 'lecons.bases.pion.e6.hint',
        },
        {
          kind: 'show',
          say: 'lecons.bases.pion.e7.say',
        },
      ],
    },

    // ── 1.7 Le roi ─────────────────────────────────────────────────────────
    {
      id: 'roi',
      title: 'lecons.bases.roi.title',
      summary: 'lecons.bases.roi.summary',
      level: 'beginner',
      minutes: 4,
      icon: ChessKing,
      steps: [
        {
          kind: 'show',
          fen: '7k/8/8/8/3K4/8/8/8 w - - 0 1',
          say: 'lecons.bases.roi.e1.say',
          highlight: ['c3', 'c4', 'c5', 'd3', 'd5', 'e3', 'e4', 'e5'],
        },
        {
          kind: 'show',
          fen: '4k3/8/8/8/8/8/8/4K2R w K - 0 1',
          say: 'lecons.bases.roi.e2.say',
        },
        {
          kind: 'show',
          say: 'lecons.bases.roi.e3.say',
        },
        {
          kind: 'show',
          fen: '7k/5K2/8/8/8/8/8/8 w - - 0 1',
          say: 'lecons.bases.roi.e4.say',
          highlight: ['g8', 'g7', 'g6', 'f6', 'e6', 'e7', 'e8'],
        },
      ],
    },

    // ── 1.8 Le roque ───────────────────────────────────────────────────────
    {
      id: 'roque',
      title: 'lecons.bases.roque.title',
      summary: 'lecons.bases.roque.summary',
      level: 'beginner',
      minutes: 5,
      icon: Castle,
      steps: [
        {
          kind: 'show',
          fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 1',
          say: 'lecons.bases.roque.e1.say',
        },
        {
          kind: 'show',
          say: 'lecons.bases.roque.e2.say',
          arrows: [
            { from: 'e1', to: 'g1', color: 'green' },
            { from: 'h1', to: 'f1', color: 'blue' },
          ],
        },
        {
          kind: 'play',
          say: 'lecons.bases.roque.e3.say',
          instruction: 'lecons.bases.roque.e3.instruction',
          answers: ['O-O'],
          hint: 'lecons.bases.roque.e3.hint',
        },
        {
          kind: 'show',
          say: 'lecons.bases.roque.e4.say',
          highlight: ['g1', 'f1', 'f2', 'g2', 'h2'],
        },
        {
          kind: 'show',
          say: 'lecons.bases.roque.e5.say',
        },
        {
          kind: 'show',
          say: 'lecons.bases.roque.e6.say',
        },
      ],
    },

    // ── 1.9 Prise en passant et promotion ──────────────────────────────────
    {
      id: 'regles-speciales',
      title: 'lecons.bases.regles-speciales.title',
      summary: 'lecons.bases.regles-speciales.summary',
      level: 'beginner',
      minutes: 5,
      icon: Sparkles,
      steps: [
        {
          kind: 'show',
          fen: '7k/8/8/3pP3/8/8/8/K7 w - d6 0 1',
          say: 'lecons.bases.regles-speciales.e1.say',
          highlight: ['d5', 'd6'],
        },
        {
          kind: 'play',
          say: 'lecons.bases.regles-speciales.e2.say',
          instruction: 'lecons.bases.regles-speciales.e2.instruction',
          answers: ['exd6'],
          hint: 'lecons.bases.regles-speciales.e2.hint',
        },
        {
          kind: 'show',
          say: 'lecons.bases.regles-speciales.e3.say',
        },
        {
          kind: 'show',
          fen: '7k/3P4/8/8/8/8/8/K7 w - - 0 1',
          say: 'lecons.bases.regles-speciales.e4.say',
          highlight: ['d8'],
        },
        {
          kind: 'play',
          say: 'lecons.bases.regles-speciales.e5.say',
          instruction: 'lecons.bases.regles-speciales.e5.instruction',
          answers: ['d8=Q', 'd8=Q+'],
          hint: 'lecons.bases.regles-speciales.e5.hint',
        },
        {
          kind: 'show',
          say: 'lecons.bases.regles-speciales.e6.say',
        },
      ],
    },

    // ── 1.10 Échec, mat, pat ───────────────────────────────────────────────
    {
      id: 'echec-mat-pat',
      title: 'lecons.bases.echec-mat-pat.title',
      summary: 'lecons.bases.echec-mat-pat.summary',
      level: 'beginner',
      minutes: 6,
      icon: Crown,
      steps: [
        {
          kind: 'show',
          fen: '4k3/8/8/8/8/8/4R3/4K3 w - - 0 1',
          say: 'lecons.bases.echec-mat-pat.e1.say',
          arrows: [{ from: 'e2', to: 'e8', color: 'red' }],
        },
        {
          /*
            La seconde tour est **déjà** en h7, et c'est tout l'exercice.

            Elle était en h1, avec les deux tours à leur case de départ, et le
            coup demandé — « Ra8 » — était annoncé comme un mat qu'il n'était
            pas : une tour en h1 contrôle la rangée 1, pas la 7, et le roi noir
            s'en allait tranquillement en d7, e7 ou f7. L'étape suivante
            expliquait pourtant, en toutes lettres, qu'il ne pouvait pas fuir
            « parce que l'autre tour la contrôle ». La phrase était juste ; la
            position ne l'était pas.

            Un débutant n'a aucun moyen de repérer l'erreur : il apprend une
            fausse définition du mat sur l'écran même qui la lui enseigne.
            `check-lessons.mjs` vérifie désormais les suffixes « + » et « # »
            contre la position réelle.
          */
          kind: 'show',
          fen: '4k3/7R/8/8/8/8/8/R3K3 w - - 0 1',
          say: 'lecons.bases.echec-mat-pat.e2.say',
          arrows: [{ from: 'h7', to: 'a7', color: 'blue' }],
        },
        {
          kind: 'play',
          say: 'lecons.bases.echec-mat-pat.e3.say',
          instruction: 'lecons.bases.echec-mat-pat.e3.instruction',
          answers: ['Ra8#'],
          hint: 'lecons.bases.echec-mat-pat.e3.hint',
        },
        {
          kind: 'show',
          say: 'lecons.bases.echec-mat-pat.e4.say',
        },
        {
          kind: 'show',
          fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',
          say: 'lecons.bases.echec-mat-pat.e5.say',
          highlight: ['h8', 'g8', 'g7', 'h7'],
        },
        {
          kind: 'show',
          say: 'lecons.bases.echec-mat-pat.e6.say',
        },
      ],
    },

    // ── 1.11 La valeur des pièces ──────────────────────────────────────────
    {
      id: 'valeurs',
      title: 'lecons.bases.valeurs.title',
      summary: 'lecons.bases.valeurs.summary',
      level: 'beginner',
      minutes: 4,
      icon: Scale,
      steps: [
        {
          kind: 'show',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          say: 'lecons.bases.valeurs.e1.say',
        },
        {
          kind: 'show',
          say: 'lecons.bases.valeurs.e2.say',
        },
        {
          kind: 'show',
          say: 'lecons.bases.valeurs.e3.say',
        },
        {
          kind: 'show',
          fen: 'r1bqkb1r/pppp1Bpp/2n2n2/4p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 4',
          say: 'lecons.bases.valeurs.e4.say',
          highlight: ['f7'],
        },
        {
          kind: 'show',
          say: 'lecons.bases.valeurs.e5.say',
        },
      ],
    },
  ],
}
