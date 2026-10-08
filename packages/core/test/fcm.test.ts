/**
 * L'enveloppe des notifications de l'appli Android.
 *
 * Ce qui se vérifie sans réseau : la lecture du compte de service, telle
 * qu'elle arrive d'un `.env`, et le message remis à Firebase — c'est lui qui
 * décide du canal Android, de l'urgence et de la page ouverte au toucher.
 */

import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { corpsFcm, lireCompteDeService } from '../src/fcm.ts'

const COMPTE = {
  type: 'service_account',
  project_id: 'le-coup-parfait',
  client_email: 'firebase-adminsdk@le-coup-parfait.iam.gserviceaccount.com',
  private_key: '-----BEGIN PRIVATE KEY-----\nMII…\n-----END PRIVATE KEY-----\n',
}

test('le compte de service se lit en base64, comme dans le .env', () => {
  const valeur = Buffer.from(JSON.stringify(COMPTE)).toString('base64')
  assert.deepEqual(lireCompteDeService(valeur), {
    projectId: 'le-coup-parfait',
    clientEmail: COMPTE.client_email,
    privateKey: COMPTE.private_key,
  })
})

test('le compte de service se lit aussi en JSON brut', () => {
  assert.equal(lireCompteDeService(JSON.stringify(COMPTE))?.projectId, 'le-coup-parfait')
})

test('sans configuration, ou illisible, rien n’est activé', () => {
  assert.equal(lireCompteDeService(undefined), null)
  assert.equal(lireCompteDeService('  '), null)
  const erreurs = console.error
  console.error = () => undefined
  try {
    assert.equal(lireCompteDeService('pas du base64 de JSON'), null)
    assert.equal(lireCompteDeService(JSON.stringify({ project_id: 'incomplet' })), null)
  } finally {
    console.error = erreurs
  }
})

test('le message porte le canal, la page à ouvrir et l’urgence', () => {
  const { message } = corpsFcm('jeton-du-telephone', {
    titre: 'Alice t’invite à jouer',
    corps: '5 + 3',
    url: '/',
    fil: 'invitation',
    ttlSecondes: 300,
    urgent: true,
  })
  assert.equal(message.token, 'jeton-du-telephone')
  assert.deepEqual(message.notification, { title: 'Alice t’invite à jouer', body: '5 + 3' })
  assert.deepEqual(message.data, { url: '/', fil: 'invitation' })
  assert.equal(message.android.priority, 'high')
  assert.equal(message.android.ttl, '300s')
  assert.equal(message.android.notification.channel_id, 'invitation')
})

test('un rappel ne réveille pas le téléphone', () => {
  const { message } = corpsFcm('jeton', {
    titre: 'Défi du jour',
    corps: '…',
    url: '/',
    fil: 'defi-du-jour',
    ttlSecondes: 21600,
    urgent: false,
  })
  assert.equal(message.android.priority, 'normal')
})
