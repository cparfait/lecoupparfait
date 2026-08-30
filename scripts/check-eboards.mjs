#!/usr/bin/env node
/**
 * Vérifie les protocoles d'échiquiers électroniques, sans échiquier.
 *
 * C'est ce qui rend le développement possible avant l'achat : chaque codec
 * sait aussi *encoder*, on fabrique donc les trames que la carte enverrait et
 * on contrôle qu'on les relit correctement. Là où la documentation donne un
 * exemple chiffré — Chessnut le fait pour la position de départ et pour
 * l'allumage de e2-e4 — on l'utilise tel quel : c'est le seul moyen d'être sûr
 * qu'on n'a pas inventé un protocole cohérent avec lui-même mais faux.
 *
 * Usage :  node scripts/check-eboards.mjs
 */

import { Chess } from 'chess.js'

const { encodeChessnutFrame, decodeChessnutFrame, encodeChessnutLights } = await import(
  '../apps/web/src/lib/board/codecs/chessnut.ts'
)
const {
  millenniumCommand,
  stripParity,
  MillenniumParser,
  encodeMillenniumStatus,
  decodeMillenniumStatus,
  encodeMillenniumLights,
} = await import('../apps/web/src/lib/board/codecs/millennium.ts')
const { DgtParser, DGT_MESSAGE, encodeDgtBoardDump, decodeDgtBoardDump, encodeDgtFieldUpdate, applyDgtFieldUpdate } =
  await import('../apps/web/src/lib/board/codecs/dgt.ts')
const {
  PegasusParser,
  PEGASUS_MESSAGE,
  encodePegasusBoardDump,
  decodePegasusBoardDump,
  encodePegasusFieldUpdate,
  applyPegasusFieldUpdate,
  encodePegasusLights,
} = await import('../apps/web/src/lib/board/codecs/pegasus.ts')
const {
  CertaboParser,
  calibrate,
  occupancyFromIds,
  startPositionIds,
  encodeCertaboIds,
  encodeCertaboOccupancy,
  encodeCertaboLights,
} = await import('../apps/web/src/lib/board/codecs/certabo.ts')
const { occupancyFromFen, blurOccupancy, matchSnapshot, detectFlip } = await import(
  '../apps/web/src/lib/board/matcher.ts'
)
const { rotateOccupancy, squareIndex, SQUARES } = await import('../apps/web/src/lib/board/types.ts')

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

let failures = 0
let checks = 0

function check(name, condition, detail) {
  checks++
  if (condition) return
  failures++
  console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
}

function same(name, actual, expected) {
  check(name, JSON.stringify(actual) === JSON.stringify(expected), `attendu ${JSON.stringify(expected)}, reçu ${JSON.stringify(actual)}`)
}

function hex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join(' ')
}

/** Photo du plateau après une suite de coups. */
function after(fen, moves) {
  const board = new Chess(fen)
  for (const move of moves) board.move(move)
  return occupancyFromFen(board.fen())
}

// ── Chessnut ────────────────────────────────────────────────────────────────
console.log('\n♟  Chessnut')
{
  const start = occupancyFromFen(START)
  const frame = encodeChessnutFrame(start)

  // Exemple donné par la documentation du protocole : la position de départ
  // commence par 58 23 31 85 44 44 44 44 — un fou noir en f8 se lit dans les
  // quatre bits de poids fort du deuxième octet.
  same('trame de départ (8 premiers octets)', hex(frame.slice(2, 10)), '58 23 31 85 44 44 44 44')
  same('aller-retour position de départ', decodeChessnutFrame(frame), start)

  const middlegame = after(START, ['e4', 'c5', 'Nf3', 'd6'])
  same('aller-retour milieu de partie', decodeChessnutFrame(encodeChessnutFrame(middlegame)), middlegame)

  check('trame trop courte rejetée', decodeChessnutFrame(new Uint8Array([1, 0x24])) === null)
  check('en-tête inconnu rejeté', decodeChessnutFrame(new Uint8Array(38)) === null)

  // Second exemple documenté : allumer e2 et e4.
  same('LEDs e2-e4', hex(encodeChessnutLights(['e2', 'e4'])), '0a 08 00 00 00 00 08 00 08 00')
  same('LEDs éteintes', hex(encodeChessnutLights([])), '0a 08 00 00 00 00 00 00 00 00')
  same('LED a8', hex(encodeChessnutLights(['a8'])), '0a 08 80 00 00 00 00 00 00 00')
  same('LED h1', hex(encodeChessnutLights(['h1'])), '0a 08 00 00 00 00 00 00 00 01')
}

// ── Millennium ChessLink ────────────────────────────────────────────────────
console.log('\n♟  Millennium ChessLink')
{
  // Le XOR de contrôle d'une commande d'un seul caractère est ce caractère.
  same('contrôle de bloc', stripParity(millenniumCommand('S')), 'S53')

  const parityBytes = millenniumCommand('S')
  check('parité impaire posée', (parityBytes[0] & 0x80) !== 0, hex(parityBytes))

  const start = occupancyFromFen(START)
  const reply = encodeMillenniumStatus(start)
  check('longueur de la réponse d’état', reply.length === 67, `reçu ${reply.length}`)
  same('aller-retour position de départ', decodeMillenniumStatus(reply), start)

  const corrupted = `${reply.slice(0, 66)}0`
  check('contrôle de bloc faux rejeté', decodeMillenniumStatus(corrupted) === null)

  // Le flux arrive en morceaux et les rapports automatiques s'intercalent.
  const parser = new MillenniumParser()
  const stream = millenniumCommand(`${reply}v0102${''}`)
  const first = parser.push(stream.slice(0, 30))
  const second = parser.push(stream.slice(30))
  check('réponse non tronquée', first.length === 0, `reçu ${first.length}`)
  check('réponse reconstituée', second[0] === reply, second[0])

  const lights = encodeMillenniumLights(['a8'])
  check('commande d’allumage', lights.startsWith('L01'), lights.slice(0, 6))
  check('81 LEDs adressées', lights.length === 3 + 162, `reçu ${lights.length}`)
  // a8 : les LEDs 1, 2, 10 et 11 — le coin haut-gauche et ses trois voisines.
  const codes = lights.slice(3).match(/.{2}/g)
  same('coins de a8 allumés', [0, 1, 9, 10].map((index) => codes[index]), ['FF', 'FF', 'FF', 'FF'])
  same('h1 éteint', codes[80], '00')
  same('LEDs éteintes ailleurs', codes.filter((code) => code === 'FF').length, 4)

  const h1 = encodeMillenniumLights(['h1']).slice(3).match(/.{2}/g)
  same('coins de h1 allumés', [70, 71, 79, 80].map((index) => h1[index]), ['FF', 'FF', 'FF', 'FF'])
}

// ── DGT ─────────────────────────────────────────────────────────────────────
console.log('\n♟  DGT')
{
  const start = occupancyFromFen(START)
  const dump = encodeDgtBoardDump(start)
  check('identifiant du message', dump[0] === DGT_MESSAGE.boardDump, hex(dump.slice(0, 3)))

  const parser = new DgtParser()
  // Coupé en trois : un flux série n'arrive jamais aligné sur les messages.
  const messages = [
    ...parser.push(dump.slice(0, 5)),
    ...parser.push(dump.slice(5, 40)),
    ...parser.push(dump.slice(40)),
  ]
  check('un seul message reconstitué', messages.length === 1, `reçu ${messages.length}`)
  same('aller-retour position de départ', decodeDgtBoardDump(messages[0].payload), start)

  // En mode « mise à jour », la carte ne signale que les cases qui changent.
  const lifted = parser.push(encodeDgtFieldUpdate('e2', null))
  const posed = parser.push(encodeDgtFieldUpdate('e4', 'P'))
  let occupancy = start
  occupancy = applyDgtFieldUpdate(occupancy, lifted[0].payload)
  occupancy = applyDgtFieldUpdate(occupancy, posed[0].payload)
  same('e2-e4 par changements de case', occupancy, after(START, ['e4']))

  const noise = parser.push(new Uint8Array([0x00, 0x12, 0x7f]))
  check('octets parasites ignorés', noise.length === 0, `reçu ${noise.length}`)
}

// ── DGT Pegasus ─────────────────────────────────────────────────────────────
console.log('\n♟  DGT Pegasus')
{
  // La carte ne détecte que la présence : la photo attendue est la position
  // dont on a effacé le type des pièces.
  const start = blurOccupancy(occupancyFromFen(START))
  const dump = encodePegasusBoardDump(occupancyFromFen(START))
  check('en-tête du message', dump[0] === PEGASUS_MESSAGE.boardDump && dump[1] === 0 && dump[2] === 67, hex(dump.slice(0, 3)))

  const parser = new PegasusParser()
  const messages = [...parser.push(dump.slice(0, 7)), ...parser.push(dump.slice(7))]
  check('un seul message reconstitué', messages.length === 1, `reçu ${messages.length}`)
  same('aller-retour position de départ', decodePegasusBoardDump(messages[0].payload), start)

  // Sans clé de développeur, la carte répond 0x7F partout : ce n'est pas une
  // position, et la prendre pour telle afficherait un plateau imaginaire.
  check('carte verrouillée détectée', decodePegasusBoardDump(new Uint8Array(64).fill(0x7f)) === null)

  const lifted = parser.push(encodePegasusFieldUpdate('e2', false))
  const posed = parser.push(encodePegasusFieldUpdate('e4', true))
  let occupancy = start
  occupancy = applyPegasusFieldUpdate(occupancy, lifted[0].payload)
  occupancy = applyPegasusFieldUpdate(occupancy, posed[0].payload)
  same('e2-e4 par changements de case', occupancy, blurOccupancy(after(START, ['e4'])))

  // Les deux exemples chiffrés de la documentation du protocole.
  same('LED c8, un éclat', [...encodePegasusLights(['c8'], { once: true })], [96, 6, 5, 7, 1, 1, 2, 0])
  same('LEDs a8-a7, pulsation', [...encodePegasusLights(['a8', 'a7'])], [96, 7, 5, 7, 0, 1, 0, 8, 0])
  same('LEDs éteintes', [...encodePegasusLights([])], [96, 2, 0, 0])

  // Une commande doit tenir dans un paquet BLE : on borne le nombre de cases.
  const many = encodePegasusLights(SQUARES)
  check('commande bornée à un paquet', many.length <= 20, `${many.length} octets`)
  same('longueur annoncée juste', many[1], many.length - 2)
}

// ── Certabo ─────────────────────────────────────────────────────────────────
console.log('\n♟  Certabo')
{
  const start = occupancyFromFen(START)
  const ids = startPositionIds()

  const parser = new CertaboParser()
  const text = encodeCertaboIds(ids)
  const bytes = Uint8Array.from([...text].map((character) => character.charCodeAt(0)))
  const frames = [...parser.push(bytes.slice(0, 100)), ...parser.push(bytes.slice(100))]
  check('trame de puces reconstituée', frames.length === 1 && frames[0].kind === 'ids', JSON.stringify(frames.length))
  same('puces relues dans l’ordre', frames[0].ids, ids)

  const calibration = calibrate(frames[0].ids)
  check('étalonnage depuis la position de départ', calibration !== null)
  same('position reconstituée', occupancyFromIds(frames[0].ids, calibration), start)

  // Une puce inconnue reste « occupée, type inconnu » — le rapprochement sait
  // faire avec, c'est le cas ordinaire du Sentio.
  const partial = occupancyFromIds(ids, {})
  check('puces inconnues signalées', partial.every((square) => square === null || square === '?'))

  check('étalonnage refusé hors position de départ', calibrate(new Array(64).fill('')) === null)

  // Sentio : huit octets, un par rangée.
  const sentio = new CertaboParser()
  const sentioText = encodeCertaboOccupancy(start)
  const sentioFrames = sentio.push(
    Uint8Array.from([...sentioText].map((character) => character.charCodeAt(0))),
  )
  check('trame de présence reconnue', sentioFrames.length === 1 && sentioFrames[0].kind === 'occupancy')
  same('présence relue', sentioFrames[0].squares, blurOccupancy(start))

  same('LEDs a1', [...encodeCertaboLights(['a1'])], [128, 0, 0, 0, 0, 0, 0, 0])
  same('LEDs h8', [...encodeCertaboLights(['h8'])], [0, 0, 0, 0, 0, 0, 0, 1])
}

// ── Du plateau au coup ──────────────────────────────────────────────────────
console.log('\n♟  Rapprochement position / coup légal')
{
  const game = new Chess(START)
  same('position en place', matchSnapshot(game, occupancyFromFen(START)), { kind: 'ready' })

  same('coup simple', matchSnapshot(game, after(START, ['e4'])), {
    kind: 'move',
    from: 'e2',
    to: 'e4',
    promotion: undefined,
    askPromotion: false,
  })

  // Le roque bouge deux pièces : lu case par case, il devient deux coups.
  const castling = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1'
  const castled = new Chess(castling)
  same('petit roque', matchSnapshot(castled, after(castling, ['O-O'])), {
    kind: 'move',
    from: 'e1',
    to: 'g1',
    promotion: undefined,
    askPromotion: false,
  })
  same('grand roque', matchSnapshot(castled, after(castling, ['O-O-O'])), {
    kind: 'move',
    from: 'e1',
    to: 'c1',
    promotion: undefined,
    askPromotion: false,
  })

  // La prise en passant vide une case qui n'est ni le départ ni l'arrivée.
  const passant = 'k7/8/8/3pP3/8/8/8/K7 w - d6 0 2'
  const enPassant = new Chess(passant)
  same('prise en passant', matchSnapshot(enPassant, after(passant, ['exd6'])), {
    kind: 'move',
    from: 'e5',
    to: 'd6',
    promotion: undefined,
    askPromotion: false,
  })

  // Promotion : la carte qui lit les types tranche toute seule.
  const promotion = '7k/P7/8/8/8/8/8/K7 w - - 0 1'
  const promoting = new Chess(promotion)
  same('promotion en cavalier reconnue', matchSnapshot(promoting, after(promotion, ['a8=N'])), {
    kind: 'move',
    from: 'a7',
    to: 'a8',
    promotion: 'n',
    askPromotion: false,
  })

  // Sur une carte à simple présence, les quatre promotions se ressemblent :
  // on demande la pièce à l'écran plutôt que de choisir à la place du joueur.
  same(
    'promotion ambiguë sur carte sans types',
    matchSnapshot(promoting, blurOccupancy(after(promotion, ['a8=Q']))),
    { kind: 'move', from: 'a7', to: 'a8', askPromotion: true },
  )

  // Le joueur qui n'a pas de dame sous la main pose son pion sur la case.
  const pawnLeft = [...after(promotion, ['a8=Q'])]
  pawnLeft[squareIndex('a8')] = 'P'
  same('pion laissé sur la case de promotion', matchSnapshot(promoting, pawnLeft), {
    kind: 'move',
    from: 'a7',
    to: 'a8',
    askPromotion: true,
  })

  // Pièce en l'air : on attend, on ne joue rien.
  const lifted = [...occupancyFromFen(START)]
  lifted[squareIndex('e2')] = null
  same('pièce levée', matchSnapshot(game, lifted), { kind: 'lifted', squares: ['e2'] })

  // Plateau qui a dérivé : on liste les cases fautives, pour les LEDs.
  const wrong = [...occupancyFromFen(START)]
  wrong[squareIndex('e4')] = 'Q'
  same('plateau en désaccord', matchSnapshot(game, wrong), { kind: 'mismatch', squares: ['e4'] })

  // Carte posée à l'envers : un geste normal quand on joue les Noirs.
  const start = occupancyFromFen(START)
  check('orientation directe', detectFlip(start, start) === false)
  check('orientation inversée', detectFlip(start, rotateOccupancy(start)) === true)
  check('orientation indécidable', detectFlip(start, lifted) === null)
}

console.log(
  failures === 0
    ? `\n✓ ${checks} vérifications passées\n`
    : `\n✗ ${failures} échec(s) sur ${checks} vérifications\n`,
)
process.exit(failures === 0 ? 0 : 1)
