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
import { explainMove } from '../src/explain.ts'
import { detectMoveMotifs } from '../src/motifs.ts'

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
