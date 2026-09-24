/**
 * `/api/revoir` — les erreurs à revoir : le rattrapage des analyses déjà
 * rangées, la lecture du jour, et le résultat d'une révision dans la boîte de
 * Leitner.
 */

import { strict as assert } from 'node:assert'
import { beforeEach, test } from 'node:test'
import { installerFausseBase, type FausseBase, type Operation } from './support/base.ts'
import { joueur, session, simulerSession } from './support/session.ts'

simulerSession()

const { GET, POST } = await import('../src/app/api/revoir/route.ts')
const { POST: POST_ANALYSES } = await import('../src/app/api/analyses/route.ts')

const JOUR = '2026-09-24'
const CARTE = '0b6f3c2a-5d1e-4f7a-9b8c-1d2e3f4a5b6c'

/*
  1. e4 e5 2. Dh5 Cc6 3. Fc4 Cf6?? — les Noirs laissent le mat en f7. Les
  évaluations sont celles qu'un navigateur aurait rangées.
*/
function ligne(score: number | 'mat', pv: string[], multipv = 1) {
  return {
    multipv,
    depth: 14,
    pv,
    score: score === 'mat' ? { type: 'mate', value: 1 } : { type: 'cp', value: score },
  }
}
const ANALYSE_EN_RETARD = {
  id: 'analyse-1',
  moves: 'e4 e5 Qh5 Nc6 Bc4 Nf6',
  startFen: null,
  lecteur: 'b',
  positions: [
    { fen: 'a', depth: 14, bestMove: 'e2e4', source: 'client', lines: [ligne(30, ['e2e4'])] },
    { fen: 'b', depth: 14, bestMove: 'e7e5', source: 'client', lines: [ligne(30, ['e7e5'])] },
    { fen: 'c', depth: 14, bestMove: 'g1f3', source: 'client', lines: [ligne(30, ['g1f3'])] },
    { fen: 'd', depth: 14, bestMove: 'b8c6', source: 'client', lines: [ligne(0, ['b8c6'])] },
    { fen: 'e', depth: 14, bestMove: 'f1c4', source: 'client', lines: [ligne(0, ['f1c4'])] },
    {
      fen: 'f',
      depth: 14,
      bestMove: 'g7g6',
      source: 'client',
      lines: [ligne(50, ['g7g6']), ligne(60, ['d8e7'], 2), ligne(400, ['g8h6'], 3)],
    },
    { fen: 'g', depth: 14, bestMove: 'h5f7', source: 'client', lines: [ligne('mat', ['h5f7'])] },
  ],
}

let base: FausseBase
/** Ce que rend chaque lecture, table par table, dans l'ordre des appels. */
let reponses: Record<string, unknown[][]>

beforeEach(() => {
  session.utilisateur = joueur('revise')
  reponses = {}
  base = installerFausseBase((op: Operation) => {
    if (op.type !== 'select' || !op.table) return []
    return reponses[op.table]?.shift() ?? []
  })
})

function lire(jour: string | null = JOUR) {
  const adresse = jour ? `http://test/api/revoir?jour=${jour}` : 'http://test/api/revoir'
  return GET(new Request(adresse))
}

function reviser(corps: Record<string, unknown>) {
  return POST(
    new Request('http://test/api/revoir', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(corps),
    }),
  )
}

test('sans compte, rien n’est lu ni écrit', async () => {
  session.utilisateur = null
  assert.equal((await lire()).status, 401)
  assert.equal((await reviser({ id: CARTE, reussie: true, jour: JOUR })).status, 401)
  assert.equal(base.operations.length, 0)
})

test('une analyse rangée avant la fonction est relevée au premier affichage', async () => {
  reponses.saved_analyses = [[ANALYSE_EN_RETARD], [{ n: 1 }]]
  reponses.mistake_reviews = [[], [{ total: 1, prochaine: null }]]

  const reponse = await lire()
  assert.equal(reponse.status, 200)

  const insertion = base.sur('insert', 'mistake_reviews')
  assert.equal(insertion.length, 1, 'les fautes sont rangées en une fois')
  const cartes = insertion[0]!.values as Array<Record<string, unknown>>
  assert.equal(cartes.length, 1, 'une seule faute des Noirs')
  assert.equal(cartes[0]!.playedUci, 'g8f6')
  assert.equal(cartes[0]!.bestUci, 'g7g6')
  assert.deepEqual(cartes[0]!.accepted, ['g7g6', 'd8e7'])
  assert.equal(cartes[0]!.box, 1)
  assert.equal(cartes[0]!.analysisId, 'analyse-1')

  const marquage = base.sur('update', 'saved_analyses')
  assert.equal(marquage.length, 1)
  assert.deepEqual(marquage[0]!.set, { revisionsExtraites: true })

  const corps = await reponse.json()
  assert.equal(corps.jour, JOUR)
  assert.equal(corps.total, 1)
  assert.equal(corps.analyses, 1)
  assert.equal(corps.enRetard, false)
})

test('une analyse qu’on enregistre voit ses fautes relevées aussitôt', async () => {
  base = installerFausseBase((op: Operation) =>
    op.type === 'insert' && op.table === 'saved_analyses' ? [{ id: 'analyse-2' }] : [],
  )
  const reponse = await POST_ANALYSES(
    new Request('http://test/api/analyses', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        moves: ANALYSE_EN_RETARD.moves.split(' '),
        positions: ANALYSE_EN_RETARD.positions,
        lecteur: 'b',
        depth: 14,
      }),
    }),
  )
  assert.deepEqual(await reponse.json(), { ok: true, id: 'analyse-2' })
  const cartes = base.sur('insert', 'mistake_reviews')[0]!.values as Array<Record<string, unknown>>
  assert.equal(cartes.length, 1)
  assert.equal(cartes[0]!.analysisId, 'analyse-2')
})

test('un jour mal formé retombe sur celui du serveur', async () => {
  const corps = await (await lire('24/09/2026')).json()
  assert.match(corps.jour, /^\d{4}-\d{2}-\d{2}$/)
  assert.notEqual(corps.jour, '24/09/2026')
})

test('une position retrouvée monte d’une boîte', async () => {
  reponses.mistake_reviews = [[{ box: 2, dueOn: JOUR }]]
  const corps = await (await reviser({ id: CARTE, reussie: true, jour: JOUR })).json()
  assert.deepEqual(corps, { ok: true, boite: 3, echeance: '2026-09-28' })
  const ecriture = base.sur('update', 'mistake_reviews')[0]!.set as Record<string, unknown>
  assert.equal(ecriture.box, 3)
  assert.equal(ecriture.dueOn, '2026-09-28')
  assert.equal(ecriture.lastReviewedOn, JOUR)
})

test('une position manquée retombe dans la première boîte', async () => {
  reponses.mistake_reviews = [[{ box: 4, dueOn: '2026-09-20' }]]
  const corps = await (await reviser({ id: CARTE, reussie: false, jour: JOUR })).json()
  assert.deepEqual(corps, { ok: true, boite: 1, echeance: '2026-09-25' })
})

test('un second envoi de la même révision ne compte pas deux fois', async () => {
  reponses.mistake_reviews = [[{ box: 3, dueOn: '2026-09-28' }]]
  const corps = await (await reviser({ id: CARTE, reussie: true, jour: JOUR })).json()
  assert.equal(corps.inchangee, true)
  assert.equal(corps.boite, 3)
  assert.equal(base.sur('update', 'mistake_reviews').length, 0)
})

test('une position inconnue, ou d’un autre joueur, rend 404', async () => {
  const reponse = await reviser({ id: CARTE, reussie: true, jour: JOUR })
  assert.equal(reponse.status, 404)
  assert.equal(base.sur('update', 'mistake_reviews').length, 0)
})

test('un corps mal formé est refusé sans toucher à la base', async () => {
  for (const corps of [
    { id: 'pas-un-uuid', reussie: true },
    { id: CARTE, reussie: 'oui' },
    { id: CARTE },
  ]) {
    assert.equal((await reviser(corps)).status, 400, JSON.stringify(corps))
  }
  assert.equal(base.operations.length, 0)
})

test('au-delà de trente lectures par minute, la route freine', async () => {
  session.utilisateur = joueur('presse')
  const statuts: number[] = []
  for (let i = 0; i < 31; i++) statuts.push((await lire()).status)
  assert.ok(statuts.slice(0, 30).every((s) => s === 200))
  const dernier = await lire()
  assert.equal(dernier.status, 429)
  assert.ok(Number(dernier.headers.get('Retry-After')) > 0)
})
