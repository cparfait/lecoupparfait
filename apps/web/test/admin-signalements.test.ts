/**
 * `/api/admin/signalements` — les messages du tchat signalés.
 *
 * Ce qu'on vérifie : la route reste muette pour qui n'est pas administrateur,
 * elle compte combien de fois un auteur a été signalé, et elle ne marque comme
 * traité qu'un signalement qui existe, en le notant au journal.
 */

import { strict as assert } from 'node:assert'
import { beforeEach, test } from 'node:test'
import { installerFausseBase, type FausseBase, type Operation } from './support/base.ts'
import { joueur, session, simulerSession } from './support/session.ts'

simulerSession()

const { GET, POST } = await import('../src/app/api/admin/signalements/route.ts')

const UN_SIGNALEMENT = '0f8c2a4e-1d2b-4c3d-9e8f-123456789abc'

let base: FausseBase
let reponses: Record<string, unknown[][]>

beforeEach(() => {
  session.utilisateur = { ...joueur('compte-admin', 'Chloé'), role: 'admin' }
  reponses = {}
  base = installerFausseBase((op: Operation) => reponses[`${op.type}:${op.table}`]?.shift() ?? [])
})

function traiter(corps: Record<string, unknown>) {
  return POST(
    new Request('http://test/api/admin/signalements', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(corps),
    }),
  )
}

test('sans droits d’administration, la route n’existe pas', async () => {
  session.utilisateur = joueur('compte-joueur', 'Mathieu')
  assert.equal((await GET(new Request('http://test/api/admin/signalements'))).status, 404)
  assert.equal((await traiter({ id: UN_SIGNALEMENT })).status, 404)
  assert.equal(base.operations.length, 0)
})

test('la liste dit combien de fois l’auteur a été signalé', async () => {
  reponses['select:signalements'] = [
    [
      {
        id: UN_SIGNALEMENT,
        createdAt: new Date('2026-10-09T10:00:00Z'),
        partie: 'abc123',
        texte: 'Tu es nul',
        auteurNom: 'Bob',
        auteurId: 'compte-bob',
        auteurNavigateur: null,
        auteurPseudo: 'Bobby',
        auteurDesactive: false,
      },
    ],
    [{ auteurId: 'compte-bob', auteurNavigateur: null, total: 3 }],
  ]
  const reponse = await GET(new Request('http://test/api/admin/signalements'))
  assert.equal(reponse.status, 200)
  const { signalements } = (await reponse.json()) as {
    signalements: Array<{ auteurPseudo: string; visantLAuteur: number }>
  }
  assert.equal(signalements.length, 1)
  assert.equal(signalements[0]!.auteurPseudo, 'Bobby', 'le pseudo d’aujourd’hui')
  assert.equal(signalements[0]!.visantLAuteur, 3)
})

test('un identifiant qui n’en est pas un est refusé sans toucher la base', async () => {
  const reponse = await traiter({ id: 'pas-un-uuid' })
  assert.equal(reponse.status, 400)
  assert.equal(base.operations.length, 0)
})

test('traiter un signalement le marque, et l’écrit au journal', async () => {
  reponses['update:signalements'] = [[{ id: UN_SIGNALEMENT }]]
  const reponse = await traiter({ id: UN_SIGNALEMENT })
  assert.equal(reponse.status, 200)
  const [marque] = base.sur('update', 'signalements')
  assert.ok((marque!.set as { traiteLe?: Date }).traiteLe instanceof Date)
  const [journal] = base.sur('insert', 'admin_audit')
  assert.equal((journal!.values as { action: string }).action, 'traiterSignalement')
})

test('un signalement inconnu ou déjà traité répond qu’il n’existe pas', async () => {
  const reponse = await traiter({ id: UN_SIGNALEMENT })
  assert.equal(reponse.status, 404)
  assert.equal(base.sur('insert', 'admin_audit').length, 0)
})
