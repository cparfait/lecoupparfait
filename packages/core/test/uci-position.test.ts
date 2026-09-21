/**
 * La garde posée devant le moteur.
 *
 * Stockfish 19 a rendu sa lecture stricte : devant un FEN mal formé il écrit
 * `info string CRITICAL ERROR` et **termine le processus**. Ce qui n'était
 * qu'une analyse fausse tue maintenant le moteur, que la réserve met deux
 * secondes à relancer — pour une requête perdue de toute façon.
 *
 * Deux exigences, et la seconde est celle qu'on oublie :
 *
 *  - refuser ce que le moteur refuserait, avant de le lui envoyer ;
 *  - **accepter tout ce qu'il accepte**. Un FEN abrégé — les pièces et le
 *    trait, sans compteurs — est courant dans les recueils de positions ;
 *    Stockfish le complète sans broncher là où `chess.js` exige ses six
 *    champs. Une garde qui s'en tiendrait à `chess.js` refuserait des
 *    positions qui marchaient hier : la protection deviendrait la panne.
 *
 * Les cas ci-dessous ont été confrontés un à un au binaire Stockfish 19 réel
 * avant d'être écrits ici. Ce test-ci ne relance pas de moteur — il fige le
 * verdict observé, pour qu'il ne dérive pas sans qu'on le voie.
 */

import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { completeFen, positionCommand, validatePosition } from '../src/uci.ts'

const DEPART = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const PIECES = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'

// ── Ce que le moteur accepte, la garde l'accepte ────────────────────────────

test('un FEN complet passe', () => {
  assert.equal(validatePosition(DEPART).ok, true)
})

test('un FEN tronqué passe, comme chez le moteur', () => {
  for (const fen of [
    `${PIECES} w KQkq - 0`,
    `${PIECES} w KQkq -`,
    `${PIECES} w KQkq`,
    `${PIECES} w`,
    PIECES,
  ]) {
    assert.equal(validatePosition(fen).ok, true, fen)
  }
})

test('les champs manquants prennent les valeurs du moteur', () => {
  assert.equal(completeFen(`${PIECES} w KQkq`), DEPART)
  assert.equal(completeFen(`${PIECES} w KQkq -`), DEPART)
  assert.equal(completeFen(`${PIECES} w KQkq - 0`), DEPART)
})

/*
  Le roque manquant vaut `-`, et non `KQkq`. C'est le choix de Stockfish — il
  répond `Fen: … w - - 0 1` à `position fen <pièces> w` —, donc c'est le nôtre :
  une garde qui compléterait autrement enverrait au moteur une position que
  l'application croirait différente.

  La conséquence se lit mal et mérite son test : un diagramme écrit sans droits
  de roque **n'est pas** la position initiale, puisque personne n'y peut plus
  roquer. Compléter ne devine pas l'intention, ça applique une règle.
*/
test('le roque absent vaut « aucun », pas « tous »', () => {
  assert.equal(completeFen(`${PIECES} w`), `${PIECES} w - - 0 1`)
  assert.notEqual(completeFen(`${PIECES} w`), DEPART)
})

test('un FEN déjà complet n’est pas retouché', () => {
  const milieu = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3'
  assert.equal(completeFen(milieu), milieu)
})

// ── Ce que le moteur refuse, la garde le refuse d'abord ─────────────────────

test('un champ présent mais absurde est refusé', () => {
  for (const fen of [
    `${PIECES} w KQkq zz 0 1`, // prise en passant impossible
    `${PIECES} x KQkq - 0 1`, // trait qui n'est ni « w » ni « b »
    'rnbqkbnrr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // neuf cases
    'bidon',
    '',
  ]) {
    assert.equal(validatePosition(fen).ok, false, fen)
  }
})

test('une position sans roi est refusée', () => {
  assert.equal(validatePosition('8/8/8/4k3/8/8/8/8 w - - 0 1').ok, false)
})

test('un coup UCI mal formé est refusé avec le FEN valide', () => {
  const verdict = validatePosition(DEPART, ['e2e4', 'bidon'])
  assert.equal(verdict.ok, false)
  assert.match(verdict.ok === false ? verdict.raison : '', /bidon/)
})

// ── La commande envoyée ─────────────────────────────────────────────────────

test('la position de départ passe par « startpos »', () => {
  assert.equal(positionCommand(DEPART), 'position startpos')
  assert.equal(positionCommand(`${PIECES} w KQkq`), 'position startpos')
})

test('le moteur reçoit toujours un FEN à six champs', () => {
  const commande = positionCommand('4k3/8/8/8/8/8/8/4K3 b')
  assert.equal(commande, 'position fen 4k3/8/8/8/8/8/8/4K3 b - - 0 1')
})

test('les coups suivent la position', () => {
  assert.equal(positionCommand(DEPART, ['e2e4', 'e7e5']), 'position startpos moves e2e4 e7e5')
})

test('construire une commande invalide lève plutôt que de tuer le moteur', () => {
  assert.throws(() => positionCommand('bidon'), /Position refusée/)
  assert.throws(() => positionCommand(DEPART, ['pas-un-coup']), /Position refusée/)
})
