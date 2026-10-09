/**
 * La connexion avec Google : départ, retour, choix du pseudo, liaison.
 *
 * Google n'est jamais appelé : `fetch` est remplacé pour l'échange du code, et
 * rend un jeton d'identité fabriqué ici. Ce qu'on vérifie, c'est ce que le site
 * en fait — et surtout ce qu'il refuse d'en faire : un retour dont le `state`
 * ne correspond pas, une identité Google déjà liée, un compte rejoint d'après
 * une adresse que rien ne garantit.
 */

import { strict as assert } from 'node:assert'
import { beforeEach, test } from 'node:test'
import { hashPassword } from '@coupparfait/db/auth'
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
const { GET: attente, POST: inscrire } =
  await import('../src/app/api/auth/google/inscription/route.ts')
const { POST: rattacher } = await import('../src/app/api/auth/google/rattacher/route.ts')
const { POST: departAppli } = await import('../src/app/api/auth/google/appli/route.ts')
const { GET: finAppli } = await import('../src/app/api/auth/google/appli/fin/route.ts')
const {
  RETOUR_APPLI,
  TEMOIN_APPLI,
  TEMOIN_DEPART,
  TEMOIN_NOUVEAU,
  empreinteDeCle,
  encoderDepart,
  mettreEnAttente,
} = await import('../src/lib/server/google.ts')

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
  session.ouverte = null
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

/** Le compte du site qui a déjà l'adresse de Jeanne. */
function titulaire(champs: Record<string, unknown> = {}) {
  return {
    id: 'compte-jeanne',
    username: 'Jeanne',
    emailVerifiedAt: new Date(),
    googleSub: null,
    disabled: false,
    ...champs,
  }
}

test('une adresse confirmée, dont Google fait autorité, rejoint son compte', async () => {
  // Pas de compte Google, mais un compte du site a la même adresse, confirmée.
  reponses['select:users'] = [[], [titulaire()]]
  const reponse = await revenir('etat-essai', 'connexion', '/jouer')
  assert.equal(destination(reponse), 'https://coupparfait.test/jouer')
  const [liaison] = base.sur('update', 'users')
  assert.equal((liaison!.set as Record<string, unknown>).googleSub, 'google-123')
  assert.equal(session.ouverte, 'compte-jeanne')
  assert.equal(base.sur('insert', 'users').length, 0, 'pas de doublon')
})

test('une adresse jamais confirmée : on propose le compte, sans le lier', async () => {
  reponses['select:users'] = [[], [titulaire({ emailVerifiedAt: null })]]
  const reponse = await revenir()
  assert.equal(destination(reponse), 'https://coupparfait.test/connexion/google')
  assert.equal(base.sur('update', 'users').length, 0)
  assert.equal(session.ouverte, null)
  const cle = /coupparfait_google_nouveau=([^;]+)/.exec(
    reponse.headers.get('set-cookie') ?? '',
  )![1]!
  temoins.set(TEMOIN_NOUVEAU, cle)
  const proposee = (await (await attente()).json()) as { rattacher: string | null }
  assert.equal(proposee.rattacher, 'Jeanne')
})

test('une adresse dont Google n’est pas l’autorité : on propose, même confirmée', async () => {
  simulerGoogle({ email: 'jeanne@exemple.fr' })
  reponses['select:users'] = [[], [titulaire()]]
  const reponse = await revenir()
  assert.equal(destination(reponse), 'https://coupparfait.test/connexion/google')
  assert.equal(base.sur('update', 'users').length, 0)
})

test('un domaine Google Workspace fait autorité', async () => {
  simulerGoogle({ email: 'jeanne@club-echecs.fr', hd: 'club-echecs.fr' })
  reponses['select:users'] = [[], [titulaire()]]
  const reponse = await revenir()
  assert.equal(destination(reponse), 'https://coupparfait.test/')
  assert.equal(session.ouverte, 'compte-jeanne')
})

test('un compte désactivé, ou lié à un autre Google, ne se rejoint pas', async () => {
  for (const champs of [{ disabled: true }, { googleSub: 'google-autre' }]) {
    reponses['select:users'] = [[], [titulaire(champs)]]
    const reponse = await revenir()
    assert.equal(destination(reponse), 'https://coupparfait.test/connexion?google=adresse-connue')
  }
  assert.equal(base.sur('update', 'users').length, 0)
  assert.equal(session.ouverte, null)
})

/** Une identité Google en attente, avec le compte à rejoindre. */
function proposer() {
  temoins.set(
    TEMOIN_NOUVEAU,
    mettreEnAttente(
      { sub: 'google-123', email: 'jeanne@gmail.com', nom: 'Jeanne Échecs' },
      { id: 'compte-jeanne', pseudo: 'Jeanne' },
    ),
  )
}

function confirmer(motDePasse: string) {
  return rattacher(
    new Request('http://interne:3000/api/auth/google/rattacher', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ motDePasse }),
    }),
  )
}

test('le mot de passe du compte le rejoint', async () => {
  proposer()
  reponses['select:users'] = [[{ passwordHash: await hashPassword('le-bon-mot-de-passe') }]]
  const reponse = await confirmer('le-bon-mot-de-passe')
  assert.equal(reponse.status, 200)
  const [liaison] = base.sur('update', 'users')
  assert.equal((liaison!.set as Record<string, unknown>).googleSub, 'google-123')
  assert.equal(session.ouverte, 'compte-jeanne')
  assert.equal(temoins.has(TEMOIN_NOUVEAU), false, 'l’attente ne sert qu’une fois')
})

test('un mauvais mot de passe ne rejoint rien', async () => {
  proposer()
  reponses['select:users'] = [[{ passwordHash: await hashPassword('le-bon-mot-de-passe') }]]
  const reponse = await confirmer('un-autre')
  assert.equal(reponse.status, 403)
  assert.equal(base.sur('update', 'users').length, 0)
  assert.equal(session.ouverte, null)
  assert.equal(temoins.has(TEMOIN_NOUVEAU), true, 'on peut réessayer')
})

test('sans compte proposé, le mot de passe ne sert à rien', async () => {
  temoins.set(
    TEMOIN_NOUVEAU,
    mettreEnAttente({ sub: 'google-123', email: 'jeanne@gmail.com', nom: 'Jeanne Échecs' }),
  )
  const reponse = await confirmer('peu-importe')
  assert.equal(reponse.status, 410)
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

// ─────────────────────────────────────────────────────────────────────────────
//  Depuis l'appli : le parcours passe par Chrome
// ─────────────────────────────────────────────────────────────────────────────

/** Ce que la WebView reçoit en ouvrant une demande : la clé (témoin) et l'adresse pour Chrome. */
async function ouvrirDemande(mode: 'connexion' | 'lier' = 'connexion', suite = '/jouer') {
  const reponse = await departAppli(
    new Request('http://interne:3000/api/auth/google/appli', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.9' },
      body: JSON.stringify({ mode, suite }),
    }),
  )
  const cle = new RegExp(`${TEMOIN_APPLI}=([^;]+)`).exec(
    reponse.headers.get('set-cookie') ?? '',
  )?.[1]
  const corps = (await reponse.json().catch(() => ({}))) as { adresse?: string }
  return { reponse, cle, adresse: corps.adresse }
}

/** Le retour de Google dans Chrome, pour la demande `id`. Chrome n'a pas la session de l'appli. */
function revenirDansChrome(id: string, mode: 'connexion' | 'lier' = 'connexion', suite = '/jouer') {
  temoins.clear()
  session.utilisateur = null
  temoins.set(
    TEMOIN_DEPART,
    encoderDepart({ etat: 'etat-essai', verificateur: 'verificateur', mode, suite, appli: id }),
  )
  return retour(
    new Request('http://interne:3000/api/auth/google/retour?code=code-essai&state=etat-essai'),
  )
}

/** De retour dans l'appli : la WebView retire l'issue avec sa clé. */
function finirDansLAppli(cle: string | undefined) {
  temoins.clear()
  if (cle) temoins.set(TEMOIN_APPLI, cle)
  return finAppli(new Request('http://interne:3000/api/auth/google/appli/fin'))
}

test('l’appli ouvre une demande : la clé reste dans la WebView, l’adresse n’en a que l’empreinte', async () => {
  const { reponse, cle, adresse } = await ouvrirDemande()
  assert.equal(reponse.status, 200)
  assert.ok(cle)
  const appli = new URL(adresse!).searchParams.get('appli')
  assert.equal(appli, empreinteDeCle(cle!))
  assert.notEqual(appli, cle, 'la clé ne passe jamais par Chrome')
})

test('Chrome ne part que pour une demande ouverte par l’appli', async () => {
  const inconnue = depart(new Request('http://interne:3000/api/auth/google?appli=inventee'))
  assert.equal(destination(inconnue), 'https://coupparfait.test/connexion?google=refuse')

  const { adresse } = await ouvrirDemande('connexion', '/apprendre')
  const reponse = depart(
    new Request(adresse!.replace('https://coupparfait.test', 'http://interne:3000')),
  )
  const temoin = new RegExp(`${TEMOIN_DEPART}=([^;]+)`).exec(
    reponse.headers.get('set-cookie') ?? '',
  )![1]!
  const enregistre = JSON.parse(Buffer.from(temoin, 'base64url').toString('utf8'))
  assert.equal(enregistre.suite, '/apprendre', 'la suite vient de la demande')
  assert.equal(enregistre.appli, new URL(adresse!).searchParams.get('appli'))
})

test('compte connu : rien ne s’ouvre dans Chrome, la session s’ouvre dans l’appli', async () => {
  const { cle, adresse } = await ouvrirDemande()
  reponses['select:users'] = [[{ id: 'compte-jeanne', username: 'Jeanne' }]]
  const dansChrome = await revenirDansChrome(new URL(adresse!).searchParams.get('appli')!)
  assert.equal(destination(dansChrome), RETOUR_APPLI, 'Chrome renvoie vers l’appli')
  assert.equal(session.ouverte, null, 'aucune session dans Chrome')

  const dansLAppli = await finirDansLAppli(cle)
  assert.equal(destination(dansLAppli), 'https://coupparfait.test/jouer')
  assert.equal(session.ouverte, 'compte-jeanne')
})

test('identité nouvelle : l’appli reçoit l’attente et mène au choix du pseudo', async () => {
  const { cle, adresse } = await ouvrirDemande()
  await revenirDansChrome(new URL(adresse!).searchParams.get('appli')!)
  const dansLAppli = await finirDansLAppli(cle)
  assert.equal(destination(dansLAppli), 'https://coupparfait.test/connexion/google')
  assert.match(dansLAppli.headers.get('set-cookie') ?? '', /coupparfait_google_nouveau=/)
})

test('l’issue ne se retire qu’une fois, et pas sans la clé', async () => {
  const { cle, adresse } = await ouvrirDemande()
  reponses['select:users'] = [[{ id: 'compte-jeanne', username: 'Jeanne' }]]
  await revenirDansChrome(new URL(adresse!).searchParams.get('appli')!)

  // L'empreinte vue passer dans Chrome ne suffit pas.
  const avecLEmpreinte = await finirDansLAppli(new URL(adresse!).searchParams.get('appli')!)
  assert.equal(destination(avecLEmpreinte), 'https://coupparfait.test/connexion?google=annule')
  assert.equal(session.ouverte, null)

  await finirDansLAppli(cle)
  session.ouverte = null
  const deuxieme = await finirDansLAppli(cle)
  assert.equal(destination(deuxieme), 'https://coupparfait.test/connexion?google=annule')
  assert.equal(session.ouverte, null)
})

test('Chrome refermé avant la fin : l’appli dit « annulée »', async () => {
  const { cle } = await ouvrirDemande()
  const dansLAppli = await finirDansLAppli(cle)
  assert.equal(destination(dansLAppli), 'https://coupparfait.test/connexion?google=annule')
})

test('lier depuis l’appli : le compte vient de la WebView, pas de Chrome', async () => {
  session.utilisateur = null
  assert.equal((await ouvrirDemande('lier', '/profil/Jeanne')).reponse.status, 401)

  session.utilisateur = joueur('compte-jeanne', 'Jeanne')
  const { cle, adresse } = await ouvrirDemande('lier', '/profil/Jeanne')
  await revenirDansChrome(new URL(adresse!).searchParams.get('appli')!, 'lier', '/profil/Jeanne')
  const [liaison] = base.sur('update', 'users')
  assert.equal((liaison!.set as Record<string, unknown>).googleSub, 'google-123')

  const dansLAppli = await finirDansLAppli(cle)
  assert.equal(destination(dansLAppli), 'https://coupparfait.test/profil/Jeanne?google=lie')
})
