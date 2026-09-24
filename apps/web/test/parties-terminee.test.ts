/**
 * `POST /api/parties/terminee` — l'archivage d'une partie jouée contre
 * l'ordinateur, et la décision de la classer.
 *
 * Chaque cas vise un correctif précis de la route : retiré, le test rougit.
 */

import { strict as assert } from 'node:assert'
import { beforeEach, test } from 'node:test'
import { botLevel } from '@coupparfait/core'
import { simulerModule } from './support/modules.ts'
import { installerFausseBase, type FausseBase, type Operation } from './support/base.ts'
import { joueur, session, simulerSession } from './support/session.ts'

simulerSession()

// Le classement lui-même vit dans `@coupparfait/db/ratings` et a ses propres
// calculs : ici, on veut seulement savoir si la route **décide** de l'appeler.
const classements: unknown[] = []
simulerModule('@coupparfait/db/ratings', {
  applyGameResult: async (options: unknown) => {
    classements.push(options)
    return { before: 1500, after: 1512, delta: 12 }
  },
})

const { POST } = await import('../src/app/api/parties/terminee/route.ts')

const NIVEAU = 5
/** Quatre coups, aucune fin imposée par la position. */
const OUVERTURE = ['e4', 'e5', 'Nf3', 'Nc6']
/** Douze demi-coups légaux, sans mat ni nulle réglementaire. */
const DOUZE = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'O-O', 'O-O']
/** Le mat du lion : les Noirs matent au quatrième demi-coup. */
const MAT_DES_NOIRS = ['f3', 'e5', 'g4', 'Qh4#']

let base: FausseBase
/** L'annonce de partie classée que la base rendra, ou aucune. */
let annonce: Record<string, unknown> | null

function annonceConforme(userId: string) {
  return {
    userId,
    botLevel: botLevel(NIVEAU).level,
    playerColor: 'w',
    initialTime: 300,
    increment: 0,
    // Une heure plus tôt : le plancher de durée (`assezLente`) est tenu.
    openedAt: new Date(Date.now() - 60 * 60 * 1000),
  }
}

beforeEach(() => {
  annonce = null
  classements.length = 0
  base = installerFausseBase((op: Operation) => {
    if (op.type === 'delete' && op.table === 'rated_intents') return annonce ? [annonce] : []
    if (op.type === 'insert' && op.table === 'games') return [{ id: 'partie-1' }]
    return []
  })
})

function envoyer(corps: unknown) {
  return POST(
    new Request('http://test/api/parties/terminee', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(corps),
    }),
  )
}

function partie(extra: Record<string, unknown> = {}) {
  return {
    mode: 'computer',
    moves: OUVERTURE,
    result: '0-1',
    playerColor: 'w',
    botLevel: NIVEAU,
    initialTime: 300,
    increment: 0,
    ...extra,
  }
}

/** Les valeurs de l'unique partie insérée. */
function partieInseree(): Record<string, unknown> {
  const insertions = base.sur('insert', 'games')
  assert.equal(insertions.length, 1, 'une partie et une seule est rangée')
  return insertions[0]!.values as Record<string, unknown>
}

test('sans compte, rien n’est écrit', async () => {
  session.utilisateur = null
  const reponse = await envoyer(partie())
  assert.equal(reponse.status, 200)
  assert.deepEqual(await reponse.json(), { ok: false, raison: 'anonyme' })
  assert.equal(base.operations.length, 0)
})

test('une FEN de départ malformée rend 400, et non une exception', async () => {
  session.utilisateur = joueur('fen-malformee')
  // Avant le correctif, `new Chess(startFen)` levait hors de tout `try` :
  // l'appel direct rejette alors, et Next en faisait un 500.
  const reponse = await envoyer(partie({ startFen: 'ceci n’est pas une position' }))
  assert.equal(reponse.status, 400)
  assert.equal((await reponse.json()).raison, 'position de départ invalide')
  assert.equal(base.sur('insert', 'games').length, 0)
})

test('une FEN de départ qui n’est pas une chaîne rend 400', async () => {
  session.utilisateur = joueur('fen-nombre')
  const reponse = await envoyer(partie({ startFen: 42 }))
  assert.equal(reponse.status, 400)
  assert.equal((await reponse.json()).raison, 'position de départ invalide')
})

test('un `eco` qui n’est pas une chaîne est ignoré, la partie reste rangée', async () => {
  session.utilisateur = joueur('eco-nombre')
  // `eco: 42` atteignait `body.eco?.slice(0, 3)` et levait : 500. Le champ
  // n'est qu'une information d'affichage, il devient `null`.
  const reponse = await envoyer(partie({ eco: 42, opening: { nom: 'objet' }, opponentName: 7 }))
  assert.equal(reponse.status, 200)
  assert.equal((await reponse.json()).ok, true)
  const valeurs = partieInseree()
  assert.equal(valeurs.eco, null)
  assert.equal(valeurs.opening, null)
  assert.equal(valeurs.blackName, 'Ordinateur')
})

test('des durées illisibles valent zéro plutôt que NaN', async () => {
  session.utilisateur = joueur('durees')
  const reponse = await envoyer(partie({ initialTime: 'abc', increment: null }))
  assert.equal(reponse.status, 200)
  const valeurs = partieInseree()
  assert.equal(valeurs.initialTime, 0)
  assert.equal(valeurs.increment, 0)
})

test('un PGN démesuré est refusé', async () => {
  session.utilisateur = joueur('pgn')
  const reponse = await envoyer(partie({ pgn: 'x'.repeat(64 * 1024 + 1) }))
  assert.equal(reponse.status, 400)
  assert.equal(base.sur('insert', 'games').length, 0)
})

test('un résultat que la position contredit est refusé', async () => {
  session.utilisateur = joueur('incoherent')
  // Les Noirs ont maté ; le client annonce la victoire des Blancs.
  const reponse = await envoyer(partie({ moves: MAT_DES_NOIRS, result: '1-0' }))
  assert.equal(reponse.status, 400)
  assert.equal((await reponse.json()).raison, 'résultat incohérent')
  assert.equal(base.sur('insert', 'games').length, 0)
})

test('le résultat imposé par la position est accepté', async () => {
  session.utilisateur = joueur('coherent')
  const reponse = await envoyer(partie({ moves: MAT_DES_NOIRS, result: '0-1' }))
  assert.equal(reponse.status, 200)
  assert.equal(partieInseree().result, '0-1')
})

test('une victoire que rien ne prouve n’est pas classée', async () => {
  const moi = joueur('victoire-invérifiable')
  session.utilisateur = moi
  annonce = annonceConforme(moi.userId)
  // Douze coups, aucune fin sur l'échiquier, et le joueur dit avoir gagné :
  // « l'ordinateur a abandonné ».
  const reponse = await envoyer(partie({ moves: DOUZE, result: '1-0', classee: true }))
  const corps = await reponse.json()
  assert.equal(corps.classee, false)
  assert.equal(corps.raison, 'resultat-non-verifiable')
  assert.equal(partieInseree().rated, false)
  assert.equal(classements.length, 0)
})

test('une partie trop courte s’archive sans être classée', async () => {
  const moi = joueur('trop-courte')
  session.utilisateur = moi
  annonce = annonceConforme(moi.userId)
  const reponse = await envoyer(partie({ classee: true }))
  const corps = await reponse.json()
  assert.equal(corps.ok, true)
  assert.equal(corps.classee, false)
  assert.equal(corps.raison, 'trop-courte')
  assert.equal(partieInseree().rated, false)
  assert.equal(classements.length, 0)
})

test('témoin : la même partie, assez longue, est classée', async () => {
  // Sans ce cas, les refus ci-dessus pourraient venir d'une annonce mal
  // imitée plutôt que de la règle qu'ils visent.
  const moi = joueur('classee')
  session.utilisateur = moi
  annonce = annonceConforme(moi.userId)
  const reponse = await envoyer(partie({ moves: DOUZE, classee: true }))
  const corps = await reponse.json()
  assert.equal(corps.classee, true, JSON.stringify(corps))
  assert.equal(partieInseree().rated, true)
  assert.equal(classements.length, 1)
  assert.deepEqual(corps.classement, { avant: 1500, apres: 1512, variation: 12 })
})

test('une partie classée qui part d’une position imposée ne l’est pas', async () => {
  const moi = joueur('position-imposee')
  session.utilisateur = moi
  annonce = annonceConforme(moi.userId)
  const reponse = await envoyer(
    partie({
      // La position initiale, moins la tour a8 des Noirs.
      startFen: '1nbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQk - 0 1',
      moves: DOUZE,
      classee: true,
    }),
  )
  const corps = await reponse.json()
  assert.equal(corps.classee, false)
  assert.equal(corps.raison, 'position-imposee')
})
