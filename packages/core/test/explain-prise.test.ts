/**
 * Une prise s'explique par ce qu'elle prend.
 *
 * Le cas signalé : après cxd4, le coach écrivait seulement « depuis d4, ton
 * pion attaque le cavalier en c3 et le pion en e3 ». Le joueur voyait un pion
 * sans défense que e3 allait prendre, sous le verdict « excellent », et ne
 * comprenait pas — faute d'avoir lu qu'il venait lui-même de prendre un pion,
 * et qu'on ne faisait que le lui rendre.
 */

import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { Chess } from 'chess.js'
import { explainMove } from '../src/explain.ts'
import type { MoveExplanationInput } from '../src/explain.ts'

/** La position de la partie signalée, Noirs au trait, avant cxd4. */
const AVANT = '1r1qkb1r/2p2ppp/p3pn2/2pp1b2/3P1P2/P1N1PN2/1PP1Q1PP/R1B1K2R b KQk - 0 10'

function expliquer(fenBefore: string, san: string, extra: Partial<MoveExplanationInput> = {}) {
  const board = new Chess(fenBefore)
  const mover = board.turn()
  board.move(san)
  return explainMove({
    locale: 'fr',
    san,
    fenBefore,
    fenAfter: board.fen(),
    quality: 'excellent',
    scoreBefore: { type: 'cp', value: -80 },
    scoreAfter: { type: 'cp', value: -92 },
    winLoss: 1,
    mover,
    motifs: [],
    ...extra,
  })
}

test('la prise est dite, et l’échange avec elle', () => {
  const { body, highlights } = expliquer(AVANT, 'cxd4')
  assert.match(body[0]!, /^Tu prends le pion en d4\./)
  assert.match(body[0]!, /reprendre en d4 avec le pion en e3 ou le cavalier en f3/)
  assert.match(body[0]!, /pion contre pion, le matériel reste égal/)
  // Les pièces qui peuvent reprendre sont nommées : elles doivent se voir.
  assert.ok(highlights.includes('e3') && highlights.includes('f3'))
})

test('le coup d’en face se raconte du côté de celui qui le subit', () => {
  const { body } = expliquer(AVANT, 'cxd4', { lecteur: 'w' })
  assert.match(body[0]!, /^Ton adversaire prend ton pion en d4\./)
  assert.match(body[0]!, /Tu peux reprendre en d4/)
})

test('une pièce ramassée sans reprise possible est dite telle', () => {
  const { body } = expliquer('r3k3/8/8/8/P7/8/8/4K3 b - - 0 1', 'Rxa4')
  assert.match(
    body[0]!,
    /^Tu prends le pion en a4\. Aucune pièce adverse ne peut reprendre en a4\./,
  )
})

test('un bilan incertain n’est pas tranché', () => {
  // Le fou prend c2, la dame e2 peut reprendre : fou contre pion, et tout
  // dépend des défenseurs de chaque camp. On dit la prise, rien de plus.
  const { body } = expliquer(AVANT, 'Bxc2')
  assert.equal(body[0], 'Tu prends le pion en c2.')
})

test('un coup calme ne parle pas de prise', () => {
  const { body } = expliquer(AVANT, 'h6')
  assert.ok(body.every((phrase) => !/prend/.test(phrase)))
})
