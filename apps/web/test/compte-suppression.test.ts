/**
 * `DELETE /api/compte` — supprimer son propre compte.
 *
 * Le geste est sans retour : on vérifie surtout qu'il n'arrive **pas** quand
 * il ne doit pas (sans session, mauvais mot de passe, pseudo mal retapé,
 * administrateur), puis qu'il efface bien ce qui appartient au compte et
 * anonymise ce qui doit rester.
 */

import { strict as assert } from 'node:assert'
import { beforeEach, test } from 'node:test'
import { hashPassword } from '@coupparfait/db/auth'
import type { SessionIdentity } from '@coupparfait/db/auth'
import { installerFausseBase, type FausseBase, type Operation } from './support/base.ts'
import { joueur, session, simulerSession } from './support/session.ts'

simulerSession()

const { DELETE } = await import('../src/app/api/compte/route.ts')

const MOT_DE_PASSE = 'cavalier-en-f3'
const EMPREINTE = await hashPassword(MOT_DE_PASSE)

let base: FausseBase

beforeEach(() => {
  session.utilisateur = joueur('partant', 'Partant')
  base = installerFausseBase((op: Operation) =>
    op.type === 'select' && op.table === 'users' ? [{ passwordHash: EMPREINTE }] : [],
  )
})

function supprimer(corps: Record<string, unknown>, ip = '203.0.113.7') {
  return DELETE(
    new Request('http://test/api/compte', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify(corps),
    }),
  )
}

const ecritures = () => base.operations.filter((op) => op.type !== 'select')

test('sans compte, rien n’est touché', async () => {
  session.utilisateur = null
  assert.equal((await supprimer({ motDePasse: MOT_DE_PASSE, pseudo: 'Partant' })).status, 401)
  assert.equal(base.operations.length, 0)
})

test('un administrateur ne peut pas libérer son pseudo', async () => {
  session.utilisateur = { ...joueur('chef', 'Chef'), role: 'admin' } as SessionIdentity
  const reponse = await supprimer({ motDePasse: MOT_DE_PASSE, pseudo: 'Chef' }, '203.0.113.8')
  assert.equal(reponse.status, 403)
  assert.equal(ecritures().length, 0)
})

test('un pseudo mal retapé arrête tout', async () => {
  const reponse = await supprimer({ motDePasse: MOT_DE_PASSE, pseudo: 'Partan' }, '203.0.113.9')
  assert.equal(reponse.status, 400)
  assert.equal(ecritures().length, 0)
})

test('un mauvais mot de passe arrête tout', async () => {
  const reponse = await supprimer({ motDePasse: 'autre', pseudo: 'partant' }, '203.0.113.10')
  assert.equal(reponse.status, 403)
  assert.equal(ecritures().length, 0)
})

test('le compte est anonymisé et tout ce qui lui appartient est effacé', async () => {
  const reponse = await supprimer({ motDePasse: MOT_DE_PASSE, pseudo: ' partant ' }, '203.0.113.11')
  assert.equal(reponse.status, 200)

  const [anonymisation] = base.sur('update', 'users')
  const valeurs = anonymisation!.set as Record<string, unknown>
  assert.match(String(valeurs.username), /^joueur-[0-9a-f]{8}$/)
  assert.equal(valeurs.email, null)
  assert.equal(valeurs.disabled, true)
  assert.match(String(valeurs.passwordHash), /^supprime:/)

  // Les parties restent, sous le nouveau pseudo, de chaque côté de l'échiquier.
  assert.equal(base.sur('update', 'games').length, 2)
  assert.equal(base.sur('update', 'tournament_players').length, 1)

  for (const table of [
    'saved_analyses',
    'mistake_reviews',
    'studies',
    'friendships',
    'challenges',
    'push_subscriptions',
    'ratings',
    'rating_history',
    'puzzle_attempts',
    'daily_progress',
    'sessions',
  ]) {
    assert.equal(base.sur('delete', table).length, 1, `${table} n’est pas effacée`)
  }
})
