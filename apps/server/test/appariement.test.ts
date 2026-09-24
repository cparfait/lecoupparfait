/**
 * L'appariement rapide : la file, sans socket ni base.
 *
 * Une horloge factice fait grandir l'écart admis sans attendre ; le salon
 * réservé se vérifie avec `GameRoom` directement, comme dans
 * `gameRoom.test.ts`.
 */

import { strict as assert } from 'node:assert'
import { after, test } from 'node:test'
import { cadencesAppariables, creerFile, ecartAdmis, type Candidat } from '../src/appariement.ts'
import { GameRoom } from '../src/realtime/gameRoom.ts'

function horloge(depart = 1_000_000) {
  let instant = depart
  return {
    now: () => instant,
    avancer(ms: number) {
      instant += ms
    },
  }
}

let numero = 0
/** Un candidat plausible ; chaque appel est une personne différente. */
function joueur(extra: Partial<Omit<Candidat, 'depuis'>> = {}): Omit<Candidat, 'depuis'> {
  numero++
  return {
    socketId: `s${numero}`,
    cadence: '180+2',
    userId: null,
    clientId: `navigateur-${String(numero).padStart(6, '0')}`,
    name: `Joueur ${numero}`,
    rating: null,
    adresse: '203.0.113.7',
    ...extra,
  }
}

test('deux joueurs sur la même cadence sont appariés et sortent de la file', () => {
  const file = creerFile()
  const a = joueur()
  const b = joueur()
  file.inscrire(a)
  assert.deepEqual(file.apparier(), [], 'seul, on attend')
  file.inscrire(b)
  const paires = file.apparier()
  assert.equal(paires.length, 1)
  assert.deepEqual(paires[0]!.map((c) => c.socketId).sort(), [a.socketId, b.socketId].sort())
  assert.equal(file.taille(), 0)
})

test('deux cadences différentes ne s’apparient pas', () => {
  const file = creerFile()
  file.inscrire(joueur({ cadence: '180+2' }))
  file.inscrire(joueur({ cadence: '600+5' }))
  assert.deepEqual(file.apparier(), [])
  assert.equal(file.taille('180+2'), 1)
  assert.equal(file.taille('600+5'), 1)
})

test('une cadence inconnue ou sans pendule est refusée', () => {
  const file = creerFile()
  assert.deepEqual(file.inscrire(joueur({ cadence: '0+0' })), {
    ok: false,
    code: 'badTimeControl',
  })
  assert.deepEqual(file.inscrire(joueur({ cadence: '999+999' })), {
    ok: false,
    code: 'badTimeControl',
  })
  assert.ok(cadencesAppariables().every((tc) => tc.initial > 0))
})

test('l’écart de classement admis s’élargit avec l’attente', () => {
  const h = horloge()
  const file = creerFile({ now: h.now })
  file.inscrire(joueur({ userId: 'u1', rating: 1500 }))
  file.inscrire(joueur({ userId: 'u2', rating: 1900 }))
  assert.deepEqual(file.apparier(), [], '400 points d’écart : pas tout de suite')
  h.avancer(20_000)
  assert.deepEqual(file.apparier(), [], '350 admis après 20 s : toujours pas')
  h.avancer(10_000)
  assert.equal(file.apparier().length, 1, '450 admis après 30 s')
  assert.equal(ecartAdmis(90_000), Number.POSITIVE_INFINITY, 'au-delà, plus de limite')
})

test('le plus ancien prend le plus proche en classement', () => {
  const file = creerFile()
  const ancien = joueur({ userId: 'u1', rating: 1500 })
  const loin = joueur({ userId: 'u2', rating: 1620 })
  const proche = joueur({ userId: 'u3', rating: 1510 })
  file.inscrire(ancien)
  file.inscrire(loin)
  file.inscrire(proche)
  const [paire] = file.apparier()
  assert.deepEqual(
    paire!.map((c) => c.socketId),
    [ancien.socketId, proche.socketId],
  )
  assert.equal(file.taille(), 1)
})

test('un invité s’apparie quel que soit le classement d’en face', () => {
  const file = creerFile()
  file.inscrire(joueur({ userId: 'u1', rating: 2400 }))
  file.inscrire(joueur())
  assert.equal(file.apparier().length, 1)
})

test('annuler, ou se déconnecter, retire de la file', () => {
  const file = creerFile()
  const a = joueur()
  file.inscrire(a)
  assert.equal(file.retirer(a.socketId), true)
  assert.equal(file.retirer(a.socketId), false, 'deux annulations ne font pas d’erreur')
  file.inscrire(joueur())
  assert.deepEqual(file.apparier(), [], 'le partant n’est pas apparié')
})

test('une double inscription remplace la première, et l’on ne joue pas contre soi', () => {
  const file = creerFile()
  const onglet1 = joueur({ userId: 'u1', rating: 1500 })
  const onglet2 = { ...onglet1, socketId: 'autre-onglet', cadence: '600+5' }
  file.inscrire(onglet1)
  const seconde = file.inscrire(onglet2)
  assert.deepEqual(seconde, { ok: true, remplaces: [onglet1.socketId] })
  assert.equal(file.taille(), 1)
  assert.equal(file.candidat('autre-onglet')?.cadence, '600+5')

  // Même navigateur sans compte : même règle.
  const invite = joueur()
  file.inscrire(invite)
  file.inscrire({ ...invite, socketId: 'invite-bis', cadence: '600+5' })
  assert.equal(file.taille(), 2)
  // Le compte et l'invité, deux personnes, sur la même cadence : appariés.
  assert.equal(file.apparier().length, 1)
})

test('la même connexion qui redemande garde une seule place', () => {
  const file = creerFile()
  const a = joueur()
  file.inscrire(a)
  assert.deepEqual(file.inscrire(a), { ok: true, remplaces: [] })
  assert.equal(file.taille(), 1)
})

test('la file est bornée', () => {
  const file = creerFile({ maximum: 2 })
  assert.equal(file.inscrire(joueur()).ok, true)
  assert.equal(file.inscrire(joueur()).ok, true)
  assert.deepEqual(file.inscrire(joueur()), { ok: false, code: 'queueFull' })
})

test('réinscrit, un candidat garde son ancienneté', () => {
  const h = horloge()
  const file = creerFile({ now: h.now })
  file.inscrire(joueur({ userId: 'u1', rating: 1500 }))
  file.inscrire(joueur({ userId: 'u2', rating: 1510 }))
  h.avancer(60_000)
  const [[a]] = file.apparier() as [[Candidat, Candidat]]
  file.reinscrire(a)
  file.inscrire(joueur({ userId: 'u3', rating: 2200 }))
  // 700 points : admis seulement parce que `a` attend depuis une minute.
  assert.equal(file.apparier().length, 1)
})

// ── Le salon réservé ─────────────────────────────────────────────────────────

const ouverts: GameRoom[] = []
after(() => {
  for (const salon of ouverts) salon.dispose()
})

test('un siège réservé revient à son titulaire, pas à un tiers', () => {
  const h = horloge()
  const room = new GameRoom({
    slug: 'appar',
    timeControl: { initial: 180, increment: 2 },
    rated: false,
    now: h.now,
  })
  ouverts.push(room)
  room.reserver('w', { userId: 'u1', clientId: 'navigateur-alice', name: 'Alice', rating: 1500 })
  room.reserver('b', { userId: null, clientId: 'navigateur-bob01', name: 'Bob', rating: null })
  assert.equal(room.snapshot().status, 'playing')

  const intrus = room.seat({
    userId: null,
    clientId: 'navigateur-intrus',
    name: 'Intrus',
    rating: null,
    socketId: 'sX',
  })
  assert.equal(intrus, null, 'le tiers regarde')

  // Le compte, même revenu sans jeton valable, retrouve les Blancs par son navigateur.
  const alice = room.seat({
    userId: null,
    clientId: 'navigateur-alice',
    name: 'Invité',
    rating: null,
    socketId: 'sA',
    souhait: 'b',
  })
  assert.equal(alice, 'w', 'le souhait ne déloge pas la réservation')
  const bob = room.seat({
    userId: null,
    clientId: 'navigateur-bob01',
    name: 'Bob',
    rating: null,
    socketId: 'sB',
  })
  assert.equal(bob, 'b')
  assert.equal(room.snapshot().players.w?.name, 'Alice')
})

test('un apparié qui ne vient jamais : la partie s’annule pour celui qui est venu', () => {
  const h = horloge()
  const room = new GameRoom({
    slug: 'appar2',
    timeControl: { initial: 180, increment: 2 },
    rated: false,
    now: h.now,
  })
  ouverts.push(room)
  room.reserver('w', { userId: null, clientId: 'navigateur-alice', name: 'Alice', rating: null })
  room.reserver('b', { userId: null, clientId: 'navigateur-bob01', name: 'Bob', rating: null })
  room.seat({
    userId: null,
    clientId: 'navigateur-alice',
    name: 'Alice',
    rating: null,
    socketId: 'sA',
  })
  h.avancer(16 * 60_000)
  room.veiller()
  const fin = room.snapshot()
  assert.equal(fin.status, 'aborted')
  assert.equal(fin.result, '*')
})
