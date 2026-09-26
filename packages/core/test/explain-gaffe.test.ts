/**
 * Une gaffe se lit avec son remède.
 *
 * Le cas signalé : Da5, gaffe à 41 points. Le panneau n'affiche que deux
 * paragraphes, et le clouage puis la pièce piégée les occupaient ; « mieux
 * valait Dh4+ », rédigé en dernier, ne se lisait nulle part. On lisait en
 * prime « le cavalier en b4 est collée… Elle ne peut plus bouger ».
 */

import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { Chess } from 'chess.js'
import type { PieceSymbol, Square } from 'chess.js'
import { classifyMove } from '../src/classify.ts'
import { explainMove } from '../src/explain.ts'
import { detectMoveMotifs } from '../src/motifs.ts'
import type { EngineLine } from '../src/types.ts'

/** La position de la partie signalée, Noirs au trait, avant Da5. */
const AVANT = '1r1qkb1r/5p1p/2p5/4pp2/1N2nP2/P2QP3/1PP3PP/R1B1K2R b - - 1 16'

function expliquerDa5(openingName: string | null = null) {
  const board = new Chess(AVANT)
  const joue = board.move('Qa5')
  const motifs = detectMoveMotifs({
    fenBefore: AVANT,
    fenAfter: board.fen(),
    from: joue.from as Square,
    to: joue.to as Square,
    piece: joue.piece as PieceSymbol,
    isEnPassant: false,
    color: 'b',
  })
  return explainMove({
    locale: 'fr',
    san: 'Qa5',
    fenBefore: AVANT,
    fenAfter: board.fen(),
    quality: 'blunder',
    scoreBefore: { type: 'cp', value: -382 },
    scoreAfter: { type: 'cp', value: 118 },
    winLoss: 41,
    mover: 'b',
    motifs,
    bestSan: 'Qh4+',
    bestLine: ['Qh4+', 'g3', 'Nxg3', 'hxg3'],
    openingName,
  })
}

test('le remède tient dans les deux paragraphes affichés', () => {
  const { body, betterMove } = expliquerDa5()
  assert.ok(betterMove)
  assert.equal(body[1], betterMove)
  assert.match(body[1]!, /^Mieux valait Dh4\+/)
})

test('le nom de l’ouverture cède sa place au remède', () => {
  const { body, betterMove } = expliquerDa5('Partie espagnole')
  assert.equal(body[1], betterMove)
  assert.match(body.at(-1)!, /Partie espagnole/)
})

test('le cavalier reste au masculin', () => {
  const texte = expliquerDa5().body.join(' ')
  assert.doesNotMatch(texte, /cavalier en b4 est (collée|piégée)/)
  assert.doesNotMatch(texte, /\bElle\b/)
  assert.match(texte, /le cavalier en b4 est collé devant son roi en e1\. Il ne peut plus bouger/)
})

// ─── Le sacrifice qui ne rapporte rien ───────────────────────────────────────
//
// Txe3+ à −18 : tour donnée pour un pion, évaluation tombée à −9, et le coup
// s'affichait « brillant ! ». Les chances de victoire, saturées, n'avaient
// presque pas bougé ; la matière, elle, était perdue.

const AVANT_TXE3 = '5b1r/4kp1p/8/q3pp2/4rP2/4P2P/1PP1K1P1/1nB4R b - - 0 23'

function classerTxe3(apres: number) {
  const lignes = [
    { multipv: 1, score: { type: 'cp', value: -1821 }, pv: ['e5f4'] },
    { multipv: 2, score: { type: 'cp', value: -1821 }, pv: ['h8g8'] },
  ] as EngineLine[]
  return classifyMove({
    fenBefore: AVANT_TXE3,
    uci: 'e4e3',
    san: 'Rxe3+',
    before: { score: { type: 'cp', value: -1821 }, lines: lignes },
    after: { score: { type: 'cp', value: apres } },
  }).quality
}

test('une tour donnée pour rien n’est pas brillante, même à +18', () => {
  assert.equal(classerTxe3(-917), 'inaccuracy')
})

test('un sacrifice qui garde l’évaluation reste brillant', () => {
  assert.equal(classerTxe3(-1800), 'brilliant')
})
