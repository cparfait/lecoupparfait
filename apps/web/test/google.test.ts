/**
 * La connexion avec Google : départ, retour, choix du pseudo, liaison.
 *
 * Google n'est jamais appelé : `fetch` est remplacé pour l'échange du code, et
 * rend un jeton d'identité fabriqué ici. Ce qu'on vérifie, c'est ce que le site
 * en fait — et surtout ce qu'il refuse d'en faire : un retour dont le `state`
 * ne correspond pas, une adresse déjà prise, une identité Google déjà liée.
 */

import { strict as assert } from 'node:assert'
import { beforeEach, test } from 'node:test'
import { installerFausseBase, type FausseBase, type Operation } from './support/base.ts'
import { simulerModule } from './support/modules.ts'
import { joueur, session, simulerSession } from './support/session.ts'

process.env.AUTH_GOOGLE_ID = 'client-essai.apps.googleusercontent.com'
process.env.AUTH_GOOGLE_SECRET = 'secret-essai'
process.env.NEXT_PUBLIC_APP_URL = 'https://coupparfait.test'

/** Les témoins de la « requête » en cours, lus et écrits par `cookies()`. */
const temoins = new Map<string, string>()
simulerModule(import.meta.resolve('next/headers'), {
  cookies: async () => ({
    get: (nom: string) => (temoins.has(nom) ? { name: nom, value: temoins.get(nom) } : undefined),
    set: (nom: string, valeur: string) => temoins.set(nom, valeur),
    delete: (nom: string) => temoins.delete(nom),
  }),
  headers: async () => new Headers(),
})
simulerSession()

const { GET: depart } = await import('../src/app/api/auth/google/route.ts')
const { GET: retour } = await import('../src/app/api/auth/google/retour/route.ts')
const { POST: inscrire } = await import('../src/app/api/auth/google/inscription/route.ts')
const { TEMOIN_DEPART, TEMOIN_NOUVEAU, encoderDepart, mettreEnAttente } =
  await import('../src/lib/server/google.ts')

const IDENTITE = {
  sub: 'google-123',
  aud: process.env.AUTH_GOOGLE_ID,
  iss: 'https://accounts.google.com',
  email: 'jeanne@gmail.com',
  email_verified: true,
  name: 'Jeanne Échecs',
}

/** Google rend ce jeton d'identité à l'échange du code. */
function simulerGoogle(charge: Record<string, unknown> = {}) {
  const jeton = { ...IDENTITE, exp: Math.floor(Date.now() / 1000) + 3600, ...charge }
  globalThis.fetch = (async () =>
    Response.json({
      id_token: `entete.${Buffer.from(JSON.stringify(jeton)).toString('base64url')}.signature`,
    })) as typeof fetch
}

let base: FausseBase
let reponses: Record<string, unknown[][]>

beforeEach(() => {
  temoins.clear()
  session.utilisateur = null
  reponses = {}
  base = installerFausseBase((op: Operation) =>
    op.type === 'select' || op.type === 'insert'
      ? (reponses[`${op.type}:${op.table}`]?.shift() ?? [])
      : [],
  )
  simulerGoogle()
})

function revenir(etat = 'etat-essai', mode: 'connexion' | 'lier' = 'connexion', suite = '/') {
  temoins.set(
    TEMOIN_DEPART,
    encoderDepart({ etat: 'etat-essai', verificateur: 'verificateur', mode, suite }),
  )
  return retour(
    new Request(`http://interne:3000/api/auth/google/retour?code=code-essai&state=${etat}`),
  )
}

const destination = (reponse: Response) => reponse.headers.get('location')

test('le départ envoie chez Google avec un état et un défi PKCE, retour sur le site public', () => {
  const reponse = depart(new Request('http://interne:3000/api/auth/google?suite=/jouer'))
  const google = new URL(destination(reponse)!)
  assert.equal(google.host, 'accounts.google.com')
  assert.equal(google.searchParams.get('client_id'), process.env.AUTH_GOOGLE_ID)
  assert.equal(
    google.searchParams.get('redirect_uri'),
    'https://coupparfait.test/api/auth/google/retour',
    'l’adresse publique, jamais celle que voit le serveur derrière le relais',
  )
  assert.equal(google.searchParams.get('code_challenge_method'), 'S256')
  assert.ok(google.searchParams.get('state'))
  assert.match(reponse.headers.get('set-cookie') ?? '', /coupparfait_google=/)
})

test('la suite ne mène jamais hors du site', () => {
  const reponse = depart(
    new Request('http://interne:3000/api/auth/google?suite=//ailleurs.example/piege'),
  )
  const temoin = /coupparfait_google=([^;]+)/.exec(reponse.headers.get('set-cookie') ?? '')![1]!
  const enregistre = JSON.parse(Buffer.from(temoin, 'base64url').toString('utf8'))
  assert.equal(enregistre.suite, '/')
})

test('un retour dont l’état ne correspond pas est refusé', async () => {
  const reponse = await revenir('etat-forge')
  assert.equal(destination(reponse), 'https://coupparfait.test/connexion?google=refuse')
  assert.equal(base.operations.length, 0)
})

test('un jeton pour un autre client est refusé', async () => {
  simulerGoogle({ aud: 'autre-client.apps.googleusercontent.com' })
  const reponse = await revenir()
  assert.equal(destination(reponse), 'https://coupparfait.test/connexion?google=refuse')
})

test('une identité connue ouvre la session', async () => {
  reponses['select:users'] = [[{ id: 'compte-jeanne', username: 'Jeanne' }]]
  const reponse = await revenir('etat-essai', 'connexion', '/jouer')
  assert.equal(destination(reponse), 'https://coupparfait.test/jouer')
})

test('une identité inconnue attend son pseudo', async () => {
  const reponse = await revenir()
  assert.equal(destination(reponse), 'https://coupparfait.test/connexion/google')
  assert.match(reponse.headers.get('set-cookie') ?? '', /coupparfait_google_nouveau=/)
})

test('une adresse déjà prise ne crée pas de doublon, ni ne lie d’office', async () => {
  // Pas de compte Google, mais un compte du site a la même adresse.
  reponses['select:users'] = [[], [{ id: 'autre-compte' }]]
  const reponse = await revenir()
  assert.equal(destination(reponse), 'https://coupparfait.test/connexion?google=adresse-connue')
  assert.equal(base.sur('update', 'users').length, 0)
})

test('connecté, on lie Google à son compte', async () => {
  session.utilisateur = joueur('compte-jeanne', 'Jeanne')
  const reponse = await revenir('etat-essai', 'lier', '/profil/Jeanne')
  assert.equal(destination(reponse), 'https://coupparfait.test/profil/Jeanne?google=lie')
  const [liaison] = base.sur('update', 'users')
  assert.equal((liaison!.set as Record<string, unknown>).googleSub, 'google-123')
})

test('le pseudo choisi crée le compte, sans mot de passe utilisable', async () => {
  temoins.set(
    TEMOIN_NOUVEAU,
    mettreEnAttente({ sub: 'google-123', email: 'jeanne@gmail.com', nom: 'Jeanne Échecs' }),
  )
  reponses['insert:users'] = [[{ id: 'nouveau', username: 'JeanneE', avatar: '♞' }]]
  const reponse = await inscrire(
    new Request('http://interne:3000/api/auth/google/inscription', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pseudo: 'JeanneE', locale: 'fr' }),
    }),
  )
  assert.equal(reponse.status, 200)
  const valeurs = base.sur('insert', 'users')[0]!.values as Record<string, unknown>
  assert.equal(valeurs.googleSub, 'google-123')
  assert.equal(valeurs.email, 'jeanne@gmail.com')
  assert.ok(valeurs.emailVerifiedAt, 'Google a vérifié l’adresse')
  assert.match(String(valeurs.passwordHash), /^google:/)
  assert.equal(temoins.has(TEMOIN_NOUVEAU), false, 'l’attente ne sert qu’une fois')
})

test('sans identité en attente, pas de compte', async () => {
  const reponse = await inscrire(
    new Request('http://interne:3000/api/auth/google/inscription', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pseudo: 'Intrus' }),
    }),
  )
  assert.equal(reponse.status, 410)
  assert.equal(base.sur('insert', 'users').length, 0)
})
