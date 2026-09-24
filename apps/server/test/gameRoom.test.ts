/**
 * Le salon de partie.
 *
 * C'est la seule autorité sur les coups et les pendules, et rien ne le
 * couvrait : le test de bout en bout (`scripts/smoke-realtime.mjs`) demande
 * un serveur lancé, et ne sait pas faire tomber un drapeau sans attendre.
 *
 * Tout se joue ici avec une horloge factice injectée au salon : on avance le
 * temps à la main et on appelle `veiller()` là où le serveur laisse battre
 * son intervalle. Aucune base, aucun socket — des identifiants de connexion
 * sont des chaînes, rien de plus.
 */

import { strict as assert } from 'node:assert'
import { after, test } from 'node:test'
import type { Square } from 'chess.js'
import { GameRoom, type RoomEvent } from '../src/realtime/gameRoom.ts'

// ─────────────────────────────────────────────────────────────────────────────
//  Outils
// ─────────────────────────────────────────────────────────────────────────────

/** Une horloge qu'on avance à la main. */
function horloge(depart = 1_000_000) {
  let instant = depart
  return {
    now: () => instant,
    avancer(ms: number) {
      instant += ms
    },
  }
}

const ouverts: GameRoom[] = []
after(() => {
  for (const salon of ouverts) salon.dispose()
})

const ALICE = { clientId: 'alice-navigateur-0001', name: 'Alice' }
const BOB = { clientId: 'bob-navigateur-000002', name: 'Bob' }

/** Un salon avec son horloge, ses événements, et ses deux joueurs assis. */
function partie(
  options: { timeControl?: { initial: number; increment: number }; startFen?: string } = {},
) {
  const h = horloge()
  const room = new GameRoom({
    slug: 'test',
    timeControl: options.timeControl ?? { initial: 60, increment: 0 },
    rated: false,
    startFen: options.startFen,
    now: h.now,
  })
  ouverts.push(room)

  const events: RoomEvent[] = []
  room.subscribe((event) => events.push(event))

  // Alice demande les Blancs : le tirage au sort n'a rien à faire dans un test.
  const alice = room.seat({ ...ALICE, userId: null, rating: null, socketId: 'sA', souhait: 'w' })
  const bob = room.seat({ ...BOB, userId: null, rating: null, socketId: 'sB' })
  assert.equal(alice, 'w')
  assert.equal(bob, 'b')

  const jouer = (socket: string, from: string, to: string) =>
    room.playMove(socket, { from: from as Square, to: to as Square })

  return { room, h, events, jouer, sA: 'sA', sB: 'sB' }
}

const fin = (events: RoomEvent[]) => events.find((e) => e.type === 'end')

// ─────────────────────────────────────────────────────────────────────────────
//  Sièges
// ─────────────────────────────────────────────────────────────────────────────

test('deux joueurs assis, la partie commence ; le troisième regarde', () => {
  const { room, h } = partie()
  const avant = room.snapshot()
  assert.equal(avant.status, 'playing')
  assert.equal(avant.startedAt, h.now())
  assert.equal(avant.players.w?.name, 'Alice')
  assert.equal(avant.players.b?.name, 'Bob')

  const troisieme = room.seat({
    userId: null,
    clientId: 'carol-navigateur-0003',
    name: 'Carol',
    rating: null,
    socketId: 'sC',
  })
  assert.equal(troisieme, null, 'il n’y a que deux sièges')
  assert.equal(room.snapshot().spectators, 1)
  assert.equal(room.colorOf('sC'), null)
})

test('un spectateur ne peut pas jouer', () => {
  const { room } = partie()
  room.seat({
    userId: null,
    clientId: 'carol-navigateur-0003',
    name: 'Carol',
    rating: null,
    socketId: 'sC',
  })
  const refus = room.playMove('sC', { from: 'e2', to: 'e4' })
  assert.deepEqual(refus, { ok: false, reason: 'notAPlayer' })
  assert.equal(room.snapshot().moves.length, 0)
})

test('un coup hors de son tour est refusé', () => {
  const { room, jouer, sB } = partie()
  assert.deepEqual(jouer(sB, 'e7', 'e5'), { ok: false, reason: 'notYourTurn' })
  assert.equal(room.snapshot().moves.length, 0)
})

test('un coup illégal est refusé, et la position ne bouge pas', () => {
  const { room, jouer, sA } = partie()
  const fen = room.snapshot().fen
  assert.deepEqual(jouer(sA, 'e2', 'e5'), { ok: false, reason: 'illegal' })
  assert.equal(room.snapshot().fen, fen)
})

test('un coup légal est joué, diffusé, et passe le trait', () => {
  const { room, events, jouer, sA } = partie()
  assert.deepEqual(jouer(sA, 'e2', 'e4'), { ok: true })
  const coup = events.find((e) => e.type === 'move')
  assert.ok(coup && coup.type === 'move')
  assert.equal(coup.san, 'e4')
  assert.equal(coup.uci, 'e2e4')
  assert.equal(room.snapshot().turn, 'b')
  assert.deepEqual(room.snapshot().lastMove, { from: 'e2', to: 'e4' })
})

// ─────────────────────────────────────────────────────────────────────────────
//  Reprise de coup
// ─────────────────────────────────────────────────────────────────────────────

test('la reprise de coup remet la pendule d’il y a deux demi-coups, réancrée', () => {
  /*
    La position reculait de deux demi-coups, la pendule non : le camp qui
    venait de jouer voyait sa pendule continuer à tourner, et le temps passé à
    répondre à la demande n'était rendu à personne. On rejoue ici la séquence
    pas à pas, avec des durées qu'on peut vérifier de tête.
  */
  const { room, h, jouer, sA, sB } = partie({ timeControl: { initial: 60, increment: 0 } })

  jouer(sA, 'e2', 'e4') // t0 : premier coup, la pendule des Noirs démarre
  h.avancer(5_000)
  jouer(sB, 'e7', 'e5') // t0+5 : Noirs 55 s, la pendule des Blancs démarre
  h.avancer(3_000)
  jouer(sA, 'g1', 'f3') // t0+8 : Blancs 57 s
  h.avancer(4_000)
  jouer(sB, 'b8', 'c6') // t0+12 : Noirs 51 s, au tour des Blancs

  room.requestTakeback(sA)
  assert.equal(room.snapshot().takebackFrom, 'w')
  // Bob réfléchit dix secondes avant d'accepter : ce temps-là ne compte pour
  // personne, la position revient avant que quiconque l'ait consommé.
  h.avancer(10_000)
  room.acceptTakeback(sB)

  const apres = room.snapshot()
  assert.deepEqual(apres.moves, ['e4', 'e5'])
  assert.equal(apres.turn, 'w')
  assert.equal(apres.takebackFrom, null)
  assert.deepEqual(apres.lastMove, { from: 'e7', to: 'e5' })
  assert.ok(apres.clock)
  assert.equal(apres.clock.running, 'w', 'c’est aux Blancs, donc aux Blancs de décompter')
  assert.equal(apres.clock.w, 60_000, 'les Blancs retrouvent leur temps d’avant Cf3')
  assert.equal(apres.clock.b, 55_000, 'les Noirs retrouvent leur temps d’avant Cc6')

  // Et elle repart de maintenant, pas de tout à l'heure.
  h.avancer(2_000)
  assert.equal(room.snapshot().clock?.w, 58_000)
  assert.equal(room.snapshot().clock?.b, 55_000)
})

test('reprendre les deux premiers coups rend une pendule qui ne tourne pour personne', () => {
  const { room, h, jouer, sA, sB } = partie()
  jouer(sA, 'e2', 'e4')
  h.avancer(7_000)
  jouer(sB, 'e7', 'e5')
  room.requestTakeback(sA)
  room.acceptTakeback(sB)

  const apres = room.snapshot()
  assert.deepEqual(apres.moves, [])
  assert.equal(apres.clock?.running, null, 'avant le premier coup, personne ne décompte')
  assert.deepEqual({ w: apres.clock?.w, b: apres.clock?.b }, { w: 60_000, b: 60_000 })

  // Le prochain coup est de nouveau un premier coup : il ne consomme rien.
  h.avancer(30_000)
  jouer(sA, 'd2', 'd4')
  assert.equal(room.snapshot().clock?.w, 60_000)
})

test('la reprise demande l’accord de l’adversaire, et l’adversaire seul', () => {
  const { room, jouer, sA, sB } = partie()
  jouer(sA, 'e2', 'e4')
  jouer(sB, 'e7', 'e5')

  room.requestTakeback(sA)
  room.acceptTakeback(sA)
  assert.equal(room.snapshot().moves.length, 2, 'accepter sa propre demande ne fait rien')

  // L'adversaire qui demande à son tour vaut acceptation.
  room.requestTakeback(sB)
  assert.equal(room.snapshot().moves.length, 0)
})

test('une reprise ne se demande pas sous deux demi-coups', () => {
  const { room, jouer, sA } = partie()
  jouer(sA, 'e2', 'e4')
  room.requestTakeback(sA)
  assert.equal(room.snapshot().takebackFrom, null)
})

test('accepter une reprise après la fin ne rouvre pas la partie', () => {
  const { room, jouer, sA, sB } = partie()
  jouer(sA, 'e2', 'e4')
  jouer(sB, 'e7', 'e5')
  jouer(sA, 'g1', 'f3')
  room.requestTakeback(sB)
  assert.equal(room.snapshot().takebackFrom, 'b')

  room.resign(sA)
  const apres = room.snapshot()
  assert.equal(apres.status, 'resign')
  assert.equal(apres.takebackFrom, null, 'la fin efface la demande en suspens')

  room.acceptTakeback(sA)
  assert.equal(room.snapshot().moves.length, 3)
  assert.equal(room.snapshot().status, 'resign')
})

// ─────────────────────────────────────────────────────────────────────────────
//  Nulle, abandon
// ─────────────────────────────────────────────────────────────────────────────

test('nulle proposée, refusée, puis acceptée', () => {
  const { room, events, jouer, sA, sB } = partie()
  jouer(sA, 'e2', 'e4')

  room.offerDraw(sA)
  assert.equal(room.snapshot().drawOfferFrom, 'w')
  assert.ok(events.some((e) => e.type === 'drawOffer' && e.from === 'w'))

  room.declineDraw(sA)
  assert.equal(room.snapshot().drawOfferFrom, 'w', 'on ne refuse pas sa propre proposition')
  room.declineDraw(sB)
  assert.equal(room.snapshot().drawOfferFrom, null)
  assert.equal(room.snapshot().status, 'playing')

  room.offerDraw(sB)
  room.offerDraw(sA)
  const dernier = fin(events)
  assert.ok(dernier && dernier.type === 'end')
  assert.equal(dernier.status, 'draw')
  assert.equal(dernier.result, '1/2-1/2')
  assert.equal(room.isFinished, true)
})

test('une proposition de nulle ne survit pas au coup suivant', () => {
  const { room, jouer, sA, sB } = partie()
  jouer(sA, 'e2', 'e4')
  room.offerDraw(sA)
  jouer(sB, 'e7', 'e5')
  assert.equal(room.snapshot().drawOfferFrom, null)
})

test('l’abandon donne la partie à l’adversaire, et arrête les pendules', () => {
  const { room, h, jouer, sA, sB } = partie()
  jouer(sA, 'e2', 'e4')
  room.offerDraw(sA)
  room.resign(sB)

  const apres = room.snapshot()
  assert.equal(apres.status, 'resign')
  assert.equal(apres.result, '1-0')
  assert.equal(apres.drawOfferFrom, null, 'la fin efface la proposition en suspens')
  assert.equal(apres.clock?.running, null)

  const restant = apres.clock?.b
  h.avancer(60_000)
  assert.equal(room.snapshot().clock?.b, restant, 'une pendule arrêtée ne descend plus')

  // Un spectateur, ou un second abandon, ne changent rien.
  room.resign(sA)
  assert.equal(room.snapshot().result, '1-0')
  assert.equal(room.toRecord().winner, 'w')
})

// ─────────────────────────────────────────────────────────────────────────────
//  Drapeau
// ─────────────────────────────────────────────────────────────────────────────

test('le drapeau tombe pour le camp au trait, constaté par le veilleur', () => {
  const { room, h, events, jouer, sA, sB } = partie({ timeControl: { initial: 60, increment: 0 } })
  jouer(sA, 'e2', 'e4')
  h.avancer(1_000)
  jouer(sB, 'e7', 'e5')

  h.avancer(59_000)
  room.veiller()
  assert.equal(room.snapshot().status, 'playing', 'à 59 s, rien n’est tombé')

  h.avancer(2_000)
  room.veiller()
  const dernier = fin(events)
  assert.ok(dernier && dernier.type === 'end')
  assert.equal(dernier.status, 'timeout')
  assert.equal(dernier.result, '0-1', 'les Blancs sont tombés, les Noirs ont de quoi mater')
  assert.equal(room.snapshot().clock?.w, 0)
})

test('un coup tenté après la chute du drapeau est refusé, et la partie finie', () => {
  const { room, h, jouer, sA, sB } = partie()
  jouer(sA, 'e2', 'e4')
  h.avancer(61_000)
  assert.deepEqual(jouer(sB, 'e7', 'e5'), { ok: false, reason: 'flagged' })
  assert.equal(room.snapshot().status, 'timeout')
  assert.equal(room.snapshot().result, '1-0')
})

test('article 6.9 : un roi seul ne gagne pas au temps, la partie est nulle', () => {
  /*
    Blancs : roi a1, dame h1. Noirs : roi h8, rien d'autre. Si le drapeau des
    Blancs tombe, les Noirs ne peuvent plus mater par aucune suite de coups
    légaux : la partie est nulle, pas perdue. Le statut reste `timeout` — c'est
    bien la pendule qui a fini la partie.
  */
  const { room, h, events, jouer, sA, sB } = partie({ startFen: '7k/8/8/8/8/8/8/K6Q w - - 0 1' })
  jouer(sA, 'h1', 'h2') // échec sur la colonne h
  h.avancer(1_000)
  jouer(sB, 'h8', 'g7')

  h.avancer(61_000)
  room.veiller()
  const dernier = fin(events)
  assert.ok(dernier && dernier.type === 'end')
  assert.equal(dernier.status, 'timeout')
  assert.equal(dernier.result, '1/2-1/2')

  const record = room.toRecord()
  assert.equal(record.status, 'timeout')
  assert.equal(record.result, '1/2-1/2')
  assert.equal(record.winner, null)
})

test('article 6.9, l’autre sens : le camp qui a encore une dame gagne au temps', () => {
  const { room, h, jouer, sA } = partie({ startFen: '7k/8/8/8/8/8/8/K6Q w - - 0 1' })
  jouer(sA, 'h1', 'h2')
  h.avancer(61_000)
  room.veiller()
  assert.equal(room.snapshot().status, 'timeout')
  assert.equal(room.snapshot().result, '1-0')
})

// ─────────────────────────────────────────────────────────────────────────────
//  Connexions
// ─────────────────────────────────────────────────────────────────────────────

test('déconnexion puis retour : le même navigateur retrouve son siège', () => {
  const { room } = partie()
  room.disconnect('sA')
  assert.equal(room.playerAt('w')?.connected, false)
  assert.equal(room.colorOf('sA'), null)

  const retour = room.seat({ ...ALICE, userId: null, rating: null, socketId: 'sA2' })
  assert.equal(retour, 'w')
  assert.equal(room.playerAt('w')?.connected, true)
  assert.equal(room.colorOf('sA2'), 'w')
  assert.equal(room.snapshot().spectators, 0)
})

test('deux onglets : le siège n’est perdu qu’à la dernière connexion fermée', () => {
  const { room } = partie()
  room.seat({ ...ALICE, userId: null, rating: null, socketId: 'sA2' })
  room.disconnect('sA')
  assert.equal(room.playerAt('w')?.connected, true, 'l’autre onglet est encore là')
  room.disconnect('sA2')
  assert.equal(room.playerAt('w')?.connected, false)
  assert.equal(room.isEmpty, false, 'Bob est toujours connecté')
})

test('un compte dont le jeton a expiré retrouve son siège par son navigateur', () => {
  /*
    Le jeton du temps réel ne dure qu'un quart d'heure : celui qui se
    reconnecte à la vingtième minute arrive sans identité. Même navigateur,
    même siège — et le siège garde le compte. Un autre compte, lui, ne passe
    pas, même avec cet identifiant de navigateur.
  */
  const h = horloge()
  const room = new GameRoom({
    slug: 'compte',
    timeControl: { initial: 600, increment: 0 },
    rated: false,
    now: h.now,
  })
  ouverts.push(room)
  room.seat({ ...ALICE, userId: 'u-alice', rating: 1500, socketId: 'sA', souhait: 'w' })
  room.disconnect('sA')

  const autre = room.seat({ ...ALICE, userId: 'u-mallory', rating: null, socketId: 'sM' })
  assert.equal(autre, 'b', 'un autre compte prend le siège libre, pas celui d’Alice')

  const retour = room.seat({ ...ALICE, userId: null, rating: null, socketId: 'sA2' })
  assert.equal(retour, 'w')
  assert.equal(room.colorOfUser('u-alice'), 'w', 'le siège reste au compte')
  assert.equal(room.snapshot().players.w?.rating, 1500)
})

test('changer de salon : la déconnexion du socket libère le premier siège', () => {
  // C'est ce que la couche socket fait quand une même connexion rejoint un
  // autre salon ; ici, on vérifie que le salon quitté voit bien le départ.
  // Dix minutes de cadence : le délai d'abandon est la moitié, soit cinq
  // minutes, et la pendule des Noirs n'est pas tombée avant.
  const { room, h, events, jouer, sA, sB } = partie({ timeControl: { initial: 600, increment: 0 } })
  jouer(sA, 'e2', 'e4')
  room.disconnect(sB)
  assert.equal(room.playerAt('b')?.connected, false)
  assert.ok(
    events.some(
      (e) => e.type === 'chat' && e.message.code === 'disconnected' && e.message.name === 'Bob',
    ),
  )

  h.avancer(299_000)
  room.veiller()
  assert.equal(room.snapshot().status, 'playing', 'pas encore')

  // Alice attend : passé le délai, Bob perd par abandon.
  h.avancer(2_000)
  room.veiller()
  assert.equal(room.snapshot().status, 'abandoned')
  assert.equal(room.snapshot().result, '1-0')
})

test('une absence prolongée avant tout coup annule la partie au lieu de la donner', () => {
  const { room, h, sB } = partie()
  room.disconnect(sB)
  h.avancer(61_000)
  room.veiller()
  assert.equal(room.snapshot().status, 'aborted')
  assert.equal(room.snapshot().result, '*')
})

test('l’absent ne perd pas si personne ne l’attend', () => {
  // Sans pendule : c'est le cas qu'on joue en plusieurs fois, et celui où
  // fermer l'onglet faisait perdre.
  const { room, h, jouer, sA, sB } = partie({ timeControl: { initial: 0, increment: 0 } })
  jouer(sA, 'e2', 'e4')
  room.disconnect(sA)
  room.disconnect(sB)
  h.avancer(10 * 60_000)
  room.veiller()
  assert.equal(room.snapshot().status, 'playing')
})

// ─────────────────────────────────────────────────────────────────────────────
//  Survie à un redémarrage
// ─────────────────────────────────────────────────────────────────────────────

test('les annonces du salon voyagent en code et en nom, le texte français en repli', () => {
  // Elles partaient en français, affichées telles quelles dans toutes les
  // langues. Le client traduit maintenant le code ; le texte ne reste que pour
  // les pages d'avant et les messages déjà enregistrés.
  const { room, events, sB } = partie()
  const annonces = () =>
    events.flatMap((e) => (e.type === 'chat' && e.message.system ? [e.message] : []))

  assert.deepEqual(
    annonces().map((m) => [m.code, m.name]),
    [
      ['joined', 'Alice'],
      ['joined', 'Bob'],
    ],
  )

  room.annoncerIndice(sB)
  room.avertir('restarting')
  room.abort()
  const [indice, redemarrage, annulation] = annonces().slice(-3)
  assert.equal(indice?.code, 'hint')
  assert.equal(indice?.name, 'Bob')
  assert.equal(indice?.text, 'Bob a demandé un indice au moteur.')
  assert.equal(redemarrage?.code, 'restarting')
  assert.equal(redemarrage?.name, undefined)
  assert.equal(annulation?.code, 'aborted')
  assert.equal(annulation?.text, 'Partie annulée.')
})

test('un ancien message sans code, relu en base, reste tel quel', () => {
  const { room } = partie()
  const brut = JSON.parse(JSON.stringify(room.etatPersistant())) as { chat: unknown[] }
  brut.chat = [{ from: 'Le Coup Parfait', text: 'Coup repris.', at: 1, system: true }]
  const relu = GameRoom.restaurer(brut, {})
  assert.ok(relu)
  ouverts.push(relu)
  assert.deepEqual(relu.snapshot().chat, brut.chat)
})

test('un salon relu de son instantané reprend la même partie, pendule comprise', () => {
  const { room, h, jouer, sA, sB } = partie({ timeControl: { initial: 180, increment: 2 } })
  jouer(sA, 'e2', 'e4')
  h.avancer(5_000)
  jouer(sB, 'e7', 'e5')
  h.avancer(3_000)
  jouer(sA, 'g1', 'f3')

  // Comme la base : aller-retour par JSON, puis relecture une minute plus tard.
  const brut = JSON.parse(JSON.stringify(room.etatPersistant())) as unknown
  h.avancer(60_000)
  const relu = GameRoom.restaurer(brut, { now: h.now })
  assert.ok(relu)
  ouverts.push(relu)

  const avant = room.snapshot()
  const apres = relu.snapshot()
  assert.equal(apres.fen, avant.fen)
  assert.deepEqual(apres.moves, avant.moves)
  assert.equal(apres.status, 'playing')
  assert.deepEqual(apres.lastMove, avant.lastMove)
  assert.equal(apres.players.w?.name, 'Alice')
  assert.equal(apres.players.w?.connected, false, 'les connexions appartiennent au processus mort')
  // La minute d'arrêt est prise au camp au trait, et à lui seul. Chacun a
  // déjà touché son incrément : les Noirs pour e5, les Blancs pour e4 et Cf3.
  assert.equal(apres.clock?.running, 'b')
  assert.equal(apres.clock?.b, 180_000 - 5_000 + 2_000 - 60_000)
  assert.equal(apres.clock?.w, 180_000 - 3_000 + 2_000 + 2_000)

  // Les joueurs reviennent, et la reprise de coup a toujours son historique.
  assert.equal(relu.seat({ ...ALICE, userId: null, rating: null, socketId: 'nA' }), 'w')
  assert.equal(relu.seat({ ...BOB, userId: null, rating: null, socketId: 'nB' }), 'b')
  relu.requestTakeback('nA')
  relu.acceptTakeback('nB')
  assert.deepEqual(relu.snapshot().moves, ['e4'])
  assert.equal(relu.snapshot().clock?.running, 'b')
  assert.equal(relu.snapshot().clock?.b, 180_000, 'la pendule d’avant e5')
})

test('un instantané sans historique de pendules se reprend quand même', () => {
  const { room, jouer, sA, sB } = partie()
  jouer(sA, 'e2', 'e4')
  jouer(sB, 'e7', 'e5')
  jouer(sA, 'g1', 'f3')

  const brut = JSON.parse(JSON.stringify(room.etatPersistant())) as Record<string, unknown>
  delete brut.clockHistory
  const relu = GameRoom.restaurer(brut)
  assert.ok(relu)
  ouverts.push(relu)
  relu.seat({ ...ALICE, userId: null, rating: null, socketId: 'nA' })
  relu.seat({ ...BOB, userId: null, rating: null, socketId: 'nB' })
  relu.requestTakeback('nA')
  relu.acceptTakeback('nB')
  assert.deepEqual(relu.snapshot().moves, ['e4'])
  // Au moins le bon camp décompte, même si le temps consommé n'est pas rendu.
  assert.equal(relu.snapshot().clock?.running, 'b')
})

test('un instantané illisible est écarté, jamais rejoué de travers', () => {
  assert.equal(GameRoom.restaurer(null), null)
  assert.equal(GameRoom.restaurer({ version: 2, slug: 'x' }), null)
  assert.equal(GameRoom.restaurer({ version: 1 }), null)
})
