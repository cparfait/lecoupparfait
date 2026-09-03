/**
 * Lecture et écriture du PGN.
 *
 * C'est la porte d'entrée et la porte de sortie de la plateforme : un PGN mal
 * lu perd la partie d'un joueur, un PGN mal écrit la rend illisible ailleurs.
 * L'analyseur de secours, lui, existe précisément pour les fichiers approximatifs
 * qu'on trouve dans la nature — c'est donc lui qu'il faut éprouver avec des
 * cas laids.
 *
 * `resultatImpose` est ici aussi : elle est née dans la route qui archive les
 * parties, et c'est elle qui empêche un résultat inventé de s'inscrire au
 * classement.
 */

import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { Chess } from 'chess.js'
import {
  formatPgnTimeControl,
  parseAnyGameInput,
  parsePgn,
  replayPositions,
  resultToScore,
  resultatImpose,
  toPgn,
} from '../src/pgn.ts'

const DEPART = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

// ─────────────────────────────────────────────────────────────────────────────
//  Import
// ─────────────────────────────────────────────────────────────────────────────

const PARTIE = `[Event "Partie d'essai"]
[Site "Le Coup Parfait"]
[Date "2026.09.03"]
[Round "-"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0`

test('un PGN ordinaire se lit entièrement', () => {
  const partie = parsePgn(PARTIE)
  assert.ok(partie)
  assert.equal(partie.headers.White, 'Alice')
  assert.equal(partie.result, '1-0')
  assert.deepEqual(partie.moves, ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#'])
})

test('les variantes et les commentaires ne sont pas pris pour des coups', () => {
  const brut = `[White "A"]
[Black "B"]
[Result "*"]

1. e4 { un bon début } e5 (1... c5 2. Nf3) 2. Nf3 $1 Nc6?! *`
  const partie = parsePgn(brut)
  assert.ok(partie)
  // c5 et Nf3 de la variante ne doivent pas entrer dans la ligne principale.
  assert.deepEqual(partie.moves, ['e4', 'e5', 'Nf3', 'Nc6'])
})

test('une partie qui ne part pas de la position initiale garde sa position', () => {
  const fen = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1'
  const partie = parsePgn(`[SetUp "1"]\n[FEN "${fen}"]\n[Result "*"]\n\n1. e4 *`)
  assert.ok(partie)
  assert.equal(partie.startFen, fen)
  assert.deepEqual(partie.moves, ['e4'])
})

test('une FEN seule est acceptée comme une partie sans coup', () => {
  const partie = parseAnyGameInput('4k3/8/8/8/8/8/8/4K2R w K - 0 1')
  assert.ok(partie)
  assert.equal(partie.moves.length, 0)
  assert.ok(partie.startFen.startsWith('4k3'))
})

test('une entrée vide ou illisible ne rend rien, et ne lève pas', () => {
  assert.equal(parseAnyGameInput(''), null)
  assert.equal(parseAnyGameInput('   '), null)
  assert.equal(parseAnyGameInput('bonjour'), null)
})

// ─────────────────────────────────────────────────────────────────────────────
//  Aller-retour
// ─────────────────────────────────────────────────────────────────────────────

test('écrire puis relire rend exactement les mêmes coups', () => {
  const echiquier = new Chess()
  const joues = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7']
  const analyses = joues.map((san, index) => {
    const coup = echiquier.move(san)
    return {
      ply: index + 1,
      moveNumber: Math.floor(index / 2) + 1,
      color: coup.color,
      san: coup.san,
      uci: `${coup.from}${coup.to}`,
      fenBefore: coup.before,
      fenAfter: coup.after,
      quality: 'good' as const,
      scoreBefore: { type: 'cp' as const, value: 0 },
      scoreAfter: { type: 'cp' as const, value: 0 },
    }
  })

  const pgn = toPgn(analyses as never, {
    headers: { White: 'Alice', Black: 'Bob', Result: '*' },
  })
  const relu = parsePgn(pgn)
  assert.ok(relu, 'le PGN qu’on produit doit être relisible par notre propre analyseur')
  assert.deepEqual(relu.moves, joues)
  assert.equal(relu.headers.White, 'Alice')
})

test('le roque traverse l’aller-retour', () => {
  // Le roque est le coup qui casse le plus souvent les analyseurs maison :
  // `O-O` avec la lettre O, `0-0` avec le chiffre, et deux longueurs.
  const partie = parsePgn(
    `[Result "*"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6 5. Nc3 O-O *`,
  )
  assert.ok(partie)
  assert.ok(partie.moves.includes('O-O'))
  assert.equal(partie.moves.filter((san) => san === 'O-O').length, 2)
})

test('rejouer une partie rend une position par demi-coup, plus la position de départ', () => {
  const positions = replayPositions(DEPART, ['e4', 'e5', 'Nf3'])
  assert.equal(positions.length, 4)
  assert.equal(positions[0], DEPART)
  // Un coup illisible arrête la relecture au lieu de tout perdre.
  assert.equal(replayPositions(DEPART, ['e4', 'Xz9', 'e5']).length, 2)
})

test('le score d’un camp se lit dans le résultat', () => {
  assert.equal(resultToScore('1-0', 'w'), 1)
  assert.equal(resultToScore('1-0', 'b'), 0)
  assert.equal(resultToScore('1/2-1/2', 'w'), 0.5)
  assert.equal(resultToScore('*', 'w'), null)
})

test('la cadence PGN s’écrit au format attendu', () => {
  assert.equal(formatPgnTimeControl({ initial: 300, increment: 3 }), '300+3')
  assert.equal(formatPgnTimeControl({ initial: 0, increment: 0 }), '-')
})

// ─────────────────────────────────────────────────────────────────────────────
//  Le résultat que la position impose
// ─────────────────────────────────────────────────────────────────────────────

function apres(coups: string[], fen?: string): Chess {
  const echiquier = new Chess(fen)
  for (const san of coups) echiquier.move(san)
  return echiquier
}

test('un mat impose son résultat, dans les deux sens', () => {
  assert.equal(resultatImpose(apres(['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#'])), '1-0')
  assert.equal(resultatImpose(apres(['f3', 'e5', 'g4', 'Qh4#'])), '0-1')
})

test('les quatre nulles de l’échiquier imposent la nulle', () => {
  // Pat.
  assert.equal(resultatImpose(new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')), '1/2-1/2')
  // Matériel insuffisant.
  assert.equal(resultatImpose(new Chess('7k/8/6K1/8/8/8/8/8 w - - 0 1')), '1/2-1/2')
  // Cinquante coups.
  assert.equal(resultatImpose(new Chess('7k/8/6K1/8/8/8/5R2/r7 w - - 100 80')), '1/2-1/2')
  // Répétition : la même position trois fois, par un aller-retour de cavaliers.
  const triple = apres(['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8'])
  assert.equal(resultatImpose(triple), '1/2-1/2')
})

test('une position vivante n’impose rien — c’est le cas qui compte', () => {
  // C'est là que se logeait la faille : la partie n'est pas finie sur
  // l'échiquier, donc le résultat déclaré ne peut être ni prouvé ni réfuté.
  assert.equal(resultatImpose(apres(['e4', 'e5', 'Nf3', 'Nc6'])), null)
  assert.equal(resultatImpose(new Chess()), null)
})
