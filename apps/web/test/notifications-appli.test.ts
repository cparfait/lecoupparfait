/**
 * `/api/notifications` pour l'appli Android : un jeton Firebase au lieu d'un
 * abonnement de navigateur.
 *
 * Le serveur est ici configuré pour Firebase seulement, sans clés VAPID —
 * c'est le cas où une erreur de branchement se verrait : l'appli doit pouvoir
 * s'abonner, le navigateur non.
 */

import { strict as assert } from 'node:assert'
import { beforeEach, test } from 'node:test'
import { installerFausseBase, type FausseBase } from './support/base.ts'
import { joueur, session, simulerSession } from './support/session.ts'

process.env.FCM_COMPTE_SERVICE = Buffer.from(
  JSON.stringify({
    project_id: 'essai',
    client_email: 'essai@essai.iam.gserviceaccount.com',
    private_key: 'clé factice : rien ne part pendant ces tests',
  }),
).toString('base64')
delete process.env.VAPID_PUBLIC_KEY
delete process.env.VAPID_PRIVATE_KEY

simulerSession()

const { GET, POST } = await import('../src/app/api/notifications/route.ts')

const JETON = 'fcm-jeton-du-telephone-'.padEnd(160, 'x')

let base: FausseBase

beforeEach(() => {
  session.utilisateur = joueur('abonne')
  base = installerFausseBase()
})

function abonner(corps: Record<string, unknown>) {
  return POST(
    new Request('http://test/api/notifications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(corps),
    }),
  )
}

test('l’appli apprend que le serveur sait la prévenir', async () => {
  const donnees = (await (await GET(new Request('http://test/api/notifications'))).json()) as {
    disponible: boolean
    appli: boolean
  }
  assert.equal(donnees.appli, true)
  assert.equal(donnees.disponible, false, 'pas de clés VAPID : pas de push du navigateur')
})

test('le jeton du téléphone s’enregistre sur le canal Firebase', async () => {
  const reponse = await abonner({
    appli: { jeton: JETON },
    invitations: true,
    defiDuJour: false,
    timezone: 'Europe/Paris',
  })
  assert.equal(reponse.status, 200)

  const [insertion] = base.sur('insert', 'push_subscriptions')
  const valeurs = insertion!.values as Record<string, unknown>
  assert.equal(valeurs.canal, 'fcm')
  assert.equal(valeurs.endpoint, JETON)
  assert.equal(valeurs.userId, 'abonne')
  assert.equal(valeurs.defiDuJour, false)
  assert.equal(valeurs.p256dh, '', 'pas de clé de chiffrement pour Firebase')
})

test('un jeton absent ou absurde est refusé sans rien écrire', async () => {
  assert.equal((await abonner({ appli: { jeton: 'court' } })).status, 400)
  assert.equal((await abonner({ appli: { jeton: 42 } })).status, 400)
  assert.equal(base.sur('insert', 'push_subscriptions').length, 0)
})

test('sans clés VAPID, un navigateur ne peut pas s’abonner pour autant', async () => {
  const reponse = await abonner({
    abonnement: { endpoint: 'https://push.example/x', keys: { p256dh: 'a', auth: 'b' } },
  })
  assert.equal(reponse.status, 503)
  assert.equal(base.sur('insert', 'push_subscriptions').length, 0)
})

test('sans compte, rien n’est enregistré', async () => {
  session.utilisateur = null
  assert.equal((await abonner({ appli: { jeton: JETON } })).status, 401)
  assert.equal(base.operations.length, 0)
})
