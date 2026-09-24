/**
 * Les erreurs à revoir : le calendrier de Leitner, puis le relevé des fautes
 * dans une analyse enregistrée.
 */

import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import {
  BOITE_MAX,
  INTERVALLES_LEITNER,
  ajouterJours,
  apresRevision,
  estDue,
  estUnJour,
  premiereEcheance,
  releverLesErreurs,
  reponseJuste,
} from '../src/revision.ts'
import type { EngineLine, PositionAnalysis } from '../src/types.ts'

const JOUR = '2026-09-24'

// ── Le calendrier ────────────────────────────────────────────────────────────

test('cinq boîtes, de un à seize jours', () => {
  assert.equal(BOITE_MAX, 5)
  assert.deepEqual([...INTERVALLES_LEITNER], [1, 2, 4, 8, 16])
})

test('une position relevée entre dans la première boîte, due le jour même', () => {
  assert.deepEqual(premiereEcheance(JOUR), { boite: 1, echeance: JOUR })
})

test('une réussite fait monter d’une boîte et attendre son intervalle', () => {
  assert.deepEqual(apresRevision(1, true, JOUR), { boite: 2, echeance: '2026-09-26' })
  assert.deepEqual(apresRevision(2, true, JOUR), { boite: 3, echeance: '2026-09-28' })
  assert.deepEqual(apresRevision(3, true, JOUR), { boite: 4, echeance: '2026-10-02' })
  assert.deepEqual(apresRevision(4, true, JOUR), { boite: 5, echeance: '2026-10-10' })
})

test('la cinquième boîte est un plafond', () => {
  assert.deepEqual(apresRevision(5, true, JOUR), { boite: 5, echeance: '2026-10-10' })
})

test('un échec renvoie dans la première boîte, d’où qu’on parte', () => {
  for (let boite = 1; boite <= BOITE_MAX; boite++) {
    assert.deepEqual(apresRevision(boite, false, JOUR), { boite: 1, echeance: '2026-09-25' })
  }
})

test('une boîte hors bornes est ramenée dans les bornes', () => {
  assert.equal(apresRevision(0, true, JOUR).boite, 2)
  assert.equal(apresRevision(-3, true, JOUR).boite, 2)
  assert.equal(apresRevision(42, true, JOUR).boite, 5)
  assert.equal(apresRevision(Number.NaN, true, JOUR).boite, 2)
})

test('les jours changent de mois et d’année sans se tromper', () => {
  assert.equal(ajouterJours('2026-12-31', 1), '2027-01-01')
  assert.equal(ajouterJours('2028-02-28', 1), '2028-02-29')
  // La nuit du changement d'heure ne fait ni sauter ni doubler de date.
  assert.equal(ajouterJours('2026-10-24', 1), '2026-10-25')
  assert.equal(ajouterJours('2026-10-25', 1), '2026-10-26')
  assert.equal(ajouterJours('2026-03-28', 2), '2026-03-30')
})

test('un jour mal formé est refusé', () => {
  assert.ok(estUnJour('2026-09-24'))
  for (const faux of [
    '2026-02-31',
    '24/09/2026',
    '2026-9-24',
    '2026-09-24T00:00',
    20260924,
    null,
  ]) {
    assert.equal(estUnJour(faux), false, String(faux))
  }
})

test('une position est due le jour de son échéance et après', () => {
  assert.ok(estDue('2026-09-24', JOUR))
  assert.ok(estDue('2026-09-01', JOUR))
  assert.equal(estDue('2026-09-25', JOUR), false)
})

// ── Le relevé ────────────────────────────────────────────────────────────────

/*
  1. e4 e5 2. Dh5 Cc6 3. Fc4 Cf6?? — le coup du berger, vu du côté noir. Au
  sixième demi-coup, g6 tenait (et De7 aussi, à dix centipions près) ; Cf6
  laisse le mat en f7.
*/
const COUPS = ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6']

function position(fen: string, lignes: Array<[number | `#${number}`, string[]]>): PositionAnalysis {
  const lines: EngineLine[] = lignes.map(([score, pv], i) => ({
    multipv: i + 1,
    depth: 16,
    pv,
    score:
      typeof score === 'number'
        ? { type: 'cp', value: score }
        : { type: 'mate', value: Number(score.slice(1)) },
  }))
  return { fen, depth: 16, lines, bestMove: lines[0]?.pv[0] ?? null, source: 'client' }
}

const FEN_AVANT_CF6 = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3'
const FEN_APRES_CF6 = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4'

const POSITIONS: PositionAnalysis[] = [
  position('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', [[30, ['e2e4']]]),
  position('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', [[30, ['e7e5']]]),
  position('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', [[30, ['g1f3']]]),
  position('rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2', [[0, ['b8c6']]]),
  position('r1bqkbnr/pppp1ppp/2n5/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 2 3', [[0, ['f1c4']]]),
  position(FEN_AVANT_CF6, [
    [50, ['g7g6', 'h5f3']],
    [60, ['d8e7', 'g1f3']],
    [400, ['g8h6', 'd2d4']],
  ]),
  position(FEN_APRES_CF6, [['#1', ['h5f7']]]),
]

test('la gaffe du joueur devient une position à revoir', async () => {
  const releve = await releverLesErreurs({ moves: COUPS, positions: POSITIONS, lecteur: 'b' })
  assert.equal(releve.length, 1)
  const [gaffe] = releve
  assert.equal(gaffe!.ply, 5)
  assert.equal(gaffe!.fen, FEN_AVANT_CF6)
  assert.equal(gaffe!.joueSan, 'Nf6')
  assert.equal(gaffe!.joueUci, 'g8f6')
  assert.equal(gaffe!.meilleurUci, 'g7g6')
  assert.equal(gaffe!.quality, 'blunder')
  // De7 était à dix centipions : équivalent. Ch6, à quatre pions : non.
  assert.deepEqual(gaffe!.acceptes, ['g7g6', 'd8e7'])
  assert.ok(gaffe!.explication.fr.headline.length > 0)
  assert.ok(gaffe!.explication.en.headline.length > 0)
  assert.notEqual(gaffe!.explication.fr.headline, gaffe!.explication.en.headline)
})

test('les fautes de l’adversaire ne sont pas les siennes', async () => {
  const releve = await releverLesErreurs({ moves: COUPS, positions: POSITIONS, lecteur: 'w' })
  assert.deepEqual(releve, [])
})

test('sans camp de joueur, rien n’est relevé', async () => {
  const releve = await releverLesErreurs({ moves: COUPS, positions: POSITIONS, lecteur: null })
  assert.deepEqual(releve, [])
})

test('des évaluations mal formées ne font pas lever', async () => {
  const abimees = POSITIONS.map((p, i) =>
    i === 5 ? ({ ...p, lines: [{ multipv: 1, pv: ['g7g6'] }] } as unknown as PositionAnalysis) : p,
  )
  assert.deepEqual(await releverLesErreurs({ moves: COUPS, positions: abimees, lecteur: 'b' }), [])
  const courtes = POSITIONS.slice(0, 3)
  assert.deepEqual(await releverLesErreurs({ moves: COUPS, positions: courtes, lecteur: 'b' }), [])
})

test('une réponse juste : un coup accepté, ou n’importe quel mat', () => {
  assert.ok(reponseJuste(FEN_AVANT_CF6, 'g7g6', ['g7g6', 'd8e7']))
  assert.ok(reponseJuste(FEN_AVANT_CF6, 'd8e7', ['g7g6', 'd8e7']))
  assert.equal(reponseJuste(FEN_AVANT_CF6, 'g8f6', ['g7g6', 'd8e7']), false)
  // Dxf7# n'est dans aucune liste, mais il mate.
  assert.ok(reponseJuste(FEN_APRES_CF6, 'h5f7', []))
  assert.equal(reponseJuste(FEN_APRES_CF6, 'zzzz', []), false)
})
