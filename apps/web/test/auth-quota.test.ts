/**
 * `POST /api/auth` — les deux quotas de la connexion.
 *
 * Le quota adresse + pseudo ne voit pas l'attaque répartie : il suffit de
 * changer d'adresse (ou d'en écrire une autre dans `X-Forwarded-For`) pour
 * repartir à zéro. Le quota par pseudo seul plafonne cela à quarante essais
 * par compte et par dix minutes, toutes adresses confondues.
 */

import { strict as assert } from 'node:assert'
import { beforeEach, test } from 'node:test'
import { simulerModule } from './support/modules.ts'
import { installerFausseBase } from './support/base.ts'
import { simulerSession } from './support/session.ts'

simulerSession()
installerFausseBase()

/** Les pseudos réellement soumis à la vérification du mot de passe. */
const verifies: string[] = []

// Le module des comptes, remplacé : `authenticate` refuse toujours — ce sont
// des essais de mot de passe — et note qu'il a été appelé. Les autres
// fonctions ne servent pas ici, mais la route les importe.
const inutile = async () => {
  throw new Error('non prévu par ce test')
}
simulerModule('@coupparfait/db/auth', {
  authenticate: async (username: string) => {
    verifies.push(username)
    return { ok: false, error: 'invalidCredentials' }
  },
  createUser: inutile,
  emailStatus: inutile,
  resetPassword: inutile,
  startEmailVerification: inutile,
  startPasswordReset: inutile,
  suggestUsername: () => null,
  verifyEmail: inutile,
})

const { POST } = await import('../src/app/api/auth/route.ts')

beforeEach(() => {
  verifies.length = 0
})

function connexion(username: string, adresse: string) {
  return POST(
    new Request('http://test/api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': adresse },
      body: JSON.stringify({ action: 'signin', username, password: 'mauvais-mot-de-passe' }),
    }),
  )
}

test('le quota par pseudo bloque au-delà de quarante, même en changeant d’adresse', async () => {
  for (let i = 1; i <= 40; i++) {
    const reponse = await connexion('Victime', `203.0.113.${i}`)
    assert.equal(reponse.status, 401, `essai ${i}`)
  }
  assert.equal(verifies.length, 40)

  // Une adresse neuve, jamais vue : seul le quota par pseudo peut refuser.
  const reponse = await connexion('Victime', '192.0.2.200')
  assert.equal(reponse.status, 429)
  // La casse ne rouvre pas la porte.
  assert.equal((await connexion('VICTIME', '192.0.2.201')).status, 429)
  assert.equal(verifies.length, 40, 'le mot de passe n’est plus essayé')

  // Un autre compte n'en pâtit pas.
  assert.equal((await connexion('Voisin', '192.0.2.202')).status, 401)
})

test('le quota adresse + pseudo bloque au-delà de douze', async () => {
  for (let i = 1; i <= 12; i++) {
    assert.equal((await connexion('Autre', '198.51.100.7')).status, 401, `essai ${i}`)
  }
  assert.equal((await connexion('Autre', '198.51.100.7')).status, 429)
})

test('un X-Forwarded-For forgé ne donne pas un compteur neuf', async () => {
  // Le client écrit le premier maillon ; le proxy ajoute le vrai à la fin.
  // Seul ce dernier compte (voir `lib/server/ip.ts`).
  for (let i = 1; i <= 12; i++) {
    const reponse = await connexion('Troisieme', `10.0.0.${i}, 198.51.100.9`)
    assert.equal(reponse.status, 401, `essai ${i}`)
  }
  assert.equal((await connexion('Troisieme', '10.0.0.99, 198.51.100.9')).status, 429)
})
