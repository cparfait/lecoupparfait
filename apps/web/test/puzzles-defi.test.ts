/**
 * `POST /api/puzzles` avec `defiDuJour` — le défi du jour noté au moment où il
 * est joué, et `fusionnerAvancement`, qui décide de ce qu'il reste quand deux
 * routes écrivent la même journée.
 */

import { strict as assert } from 'node:assert'
import { beforeEach, test } from 'node:test'
import { installerFausseBase, type FausseBase, type Operation } from './support/base.ts'
import { joueur, session, simulerSession } from './support/session.ts'

simulerSession()

const { POST } = await import('../src/app/api/puzzles/route.ts')
const { fusionnerAvancement } = await import('../src/lib/server/journee.ts')

const JOUR = '2026-09-24'

let base: FausseBase
/** La journée déjà enregistrée, ou aucune. */
let journee: Record<string, unknown> | null

beforeEach(() => {
  journee = null
  session.utilisateur = joueur('defi')
  base = installerFausseBase((op: Operation) => {
    if (op.type === 'select' && op.table === 'daily_progress') return journee ? [journee] : []
    // Le puzzle lui-même est inconnu : la route répond 404 après avoir noté
    // le défi, ce qui suffit ici — le classement n'est pas le sujet.
    return []
  })
})

function tenter(corps: Record<string, unknown>) {
  return POST(
    new Request('http://test/api/puzzles', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ puzzleId: 'p1', ...corps }),
    }),
  )
}

/** Les quêtes écrites dans la journée, par insertion ou par mise à jour. */
function questsEcrites(): Record<string, number> {
  const ecritures = [
    ...base.sur('insert', 'daily_progress'),
    ...base.sur('update', 'daily_progress'),
  ]
  assert.equal(ecritures.length, 1, 'la journée est écrite une fois')
  const ecriture = ecritures[0]!
  return ((ecriture.values ?? ecriture.set) as { quests: Record<string, number> }).quests
}

test('un défi résolu note le défi et la tentative', async () => {
  await tenter({ solved: true, defiDuJour: JOUR })
  const insertion = base.sur('insert', 'daily_progress')[0]
  assert.ok(insertion, 'la journée est créée')
  assert.equal((insertion.values as { day: string }).day, JOUR)
  assert.deepEqual(questsEcrites(), { defi: 1, defitente: 1 })
})

test('un défi échoué ne note que la tentative', async () => {
  await tenter({ solved: false, defiDuJour: JOUR })
  // `deepEqual` strict : une clé `defi` en trop, même à 0, fait échouer.
  assert.deepEqual(questsEcrites(), { defitente: 1 })
})

test('un jour mal formé est ignoré', async () => {
  for (const defiDuJour of ['24/09/2026', '2026-9-24', 20260924, '2026-09-24T00:00']) {
    await tenter({ solved: true, defiDuJour })
  }
  assert.equal(base.operations.filter((op) => op.table === 'daily_progress').length, 0)
})

test('sans défi du jour, la journée n’est pas touchée', async () => {
  await tenter({ solved: true })
  assert.equal(base.operations.filter((op) => op.table === 'daily_progress').length, 0)
})

test('sans compte, rien n’est écrit', async () => {
  session.utilisateur = null
  const reponse = await tenter({ solved: true, defiDuJour: JOUR })
  assert.deepEqual(await reponse.json(), { rating: null, anonymous: true })
  assert.equal(base.operations.length, 0)
})

test('un défi échoué après coup n’efface pas un défi déjà résolu', async () => {
  // La journée envoyée par `/api/quotidien` a déjà le défi et trois puzzles.
  journee = { userId: 'defi', day: JOUR, quests: { defi: 1, puzzles: 3 }, streak: 4, bestStreak: 9 }
  await tenter({ solved: false, defiDuJour: JOUR })
  assert.equal(base.sur('insert', 'daily_progress').length, 0)
  assert.deepEqual(questsEcrites(), { defi: 1, puzzles: 3, defitente: 1 })
  const miseAJour = base.sur('update', 'daily_progress')[0]!.set as Record<string, unknown>
  assert.equal(miseAJour.streak, 4, 'la série n’est pas remise à zéro')
  assert.equal(miseAJour.bestStreak, 9)
})

test('fusionnerAvancement garde le maximum, quête par quête', () => {
  assert.deepEqual(
    fusionnerAvancement(
      { defi: 1, puzzles: 5, lecon: 0 },
      { defi: 0, puzzles: 2, lecon: 1, partie: 1 },
    ),
    { defi: 1, puzzles: 5, lecon: 1, partie: 1 },
  )
  // Et dans l'autre sens : l'ordre d'arrivée des deux routes ne change rien.
  assert.deepEqual(
    fusionnerAvancement(
      { defi: 0, puzzles: 2, lecon: 1, partie: 1 },
      { defi: 1, puzzles: 5, lecon: 0 },
    ),
    { defi: 1, puzzles: 5, lecon: 1, partie: 1 },
  )
})
