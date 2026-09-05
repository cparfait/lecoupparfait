/**
 * Les motifs tactiques.
 *
 * Ce sont eux qui nourrissent les explications : « ton cavalier fourche la
 * dame et la tour », « ce fou est cloué ». Un faux positif écrit une phrase
 * fausse dans un commentaire adressé à un débutant, ce qui est pire que de ne
 * rien dire — d'où autant de cas **négatifs** que de cas positifs ici.
 *
 * Les positions sont écrites à la main, aussi dépouillées que possible : une
 * position à trois pièces se vérifie de tête, une position de partie réelle
 * ne se vérifie qu'en refaisant tourner le code qu'on teste.
 */

import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { Chess } from 'chess.js'
import {
  detectBackRankWeakness,
  findForcedMate,
  findForks,
  findPinsAndSkewers,
  findTrappedPieces,
  hasBishopPair,
  hasOpposition,
  mateInOne,
} from '../src/motifs.ts'

// ─────────────────────────────────────────────────────────────────────────────
//  Clouages et enfilades
// ─────────────────────────────────────────────────────────────────────────────

test('un clouage absolu est reconnu, et nommé comme tel', () => {
  // Fou blanc en b5, cavalier noir en c6, roi noir en e8 : le cavalier ne peut
  // pas bouger. C'est l'épingle de l'Espagnole, le clouage le plus joué au monde.
  const position = new Chess('4k3/8/2n5/1B6/8/8/8/4K3 b - - 0 1')
  const trouves = findPinsAndSkewers(position, 'b')
  const clouage = trouves.find((t) => t.kind === 'pin' && t.front === 'c6')
  assert.ok(clouage, `aucun clouage trouvé sur c6 (${JSON.stringify(trouves)})`)
  assert.equal(clouage.attacker, 'b5')
  assert.equal(clouage.back, 'e8')
  assert.equal(clouage.absolute, true, 'le roi derrière rend le clouage absolu')
})

test('une enfilade se distingue d’un clouage par l’ordre des valeurs', () => {
  // Tour blanche en a1, dame noire en a4, tour noire en a8 : la dame doit
  // fuir et abandonne la tour. La pièce chère est **devant**.
  const position = new Chess('r3k3/8/8/8/q7/8/8/R3K3 b - - 0 1')
  const trouves = findPinsAndSkewers(position, 'b')
  const enfilade = trouves.find((t) => t.kind === 'skewer')
  assert.ok(enfilade, `aucune enfilade trouvée (${JSON.stringify(trouves)})`)
  assert.equal(enfilade.front, 'a4')
  assert.equal(enfilade.back, 'a8')
})

test('deux pièces alignées sans attaquant ne sont pas un clouage', () => {
  // Le cas négatif qui compte : rien sur la colonne pour exercer la contrainte.
  const position = new Chess('4k3/8/2n5/8/8/8/8/4K3 b - - 0 1')
  assert.deepEqual(findPinsAndSkewers(position, 'b'), [])
})

// ─────────────────────────────────────────────────────────────────────────────
//  Fourchettes
// ─────────────────────────────────────────────────────────────────────────────

test('la fourchette familiale est reconnue', () => {
  // Cavalier blanc en c7, roi noir en e8, tour noire en a8 : échec et la tour
  // tombe. Le cavalier est hors d'atteinte.
  const position = new Chess('r3k3/2N5/8/8/8/8/8/4K3 w - - 0 1')
  const fourchettes = findForks(position, 'w')
  const trouvee = fourchettes.find((f) => f.from === 'c7')
  assert.ok(trouvee, `aucune fourchette depuis c7 (${JSON.stringify(fourchettes)})`)
  assert.ok(trouvee.targets.includes('e8'), 'le roi est une cible')
  assert.ok(trouvee.targets.includes('a8'), 'la tour est une cible')
})

test('une pièce qu’on peut simplement capturer ne fourche rien', () => {
  /*
    Le cas négatif le plus important. Même fourchette que ci-dessus, mais le
    cavalier en c7 est attaqué par le roi noir en b8 et rien ne le défend : le
    prendre règle la question. Annoncer une fourchette ici serait un mauvais
    conseil, pas seulement une imprécision.
  */
  const position = new Chess('rk6/2N5/8/8/8/8/8/4K3 w - - 0 1')
  const depuisC7 = findForks(position, 'w').find((f) => f.from === 'c7')
  assert.equal(depuisC7, undefined)
})

// ─────────────────────────────────────────────────────────────────────────────
//  Mats
// ─────────────────────────────────────────────────────────────────────────────

test('le mat en un est trouvé, et c’est bien un mat', () => {
  // Roi noir enfermé derrière ses trois pions : la dame arrive sur la
  // huitième rangée. On ne fixe pas *lequel* des mats est rendu — il y en a
  // plusieurs, et lequel arrive en premier ne regarde que l'ordre de
  // génération des coups. Ce qui compte, c'est que le coup rendu mate.
  const position = new Chess('6k1/5ppp/8/8/8/8/1B4Q1/6K1 w - - 0 1')
  const mat = mateInOne(position)
  assert.ok(mat, 'un mat en un existe dans cette position')
  assert.ok(mat.san.endsWith('#'), `${mat.san} devrait être noté comme un mat`)
  const verification = new Chess(position.fen())
  verification.move(mat.san)
  assert.equal(verification.isCheckmate(), true, `${mat.san} devrait mater`)
})

test('aucun mat en un n’est inventé dans une position calme', () => {
  const position = new Chess('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
  assert.equal(mateInOne(position), null)
})

test('un mat forcé en deux est trouvé, et sa ligne commence par le bon coup', () => {
  // Mat du couloir en deux temps : la tour s'invite, le roi n'a pas d'air.
  const position = new Chess('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1')
  const ligne = findForcedMate(position, 3)
  assert.ok(ligne, 'la position est un mat forcé')
  assert.equal(ligne[0], 'Ra8#')
})

test('la faiblesse du couloir se détecte, et pas là où elle n’est pas', () => {
  // Roi en g8 derrière trois pions intacts : le couloir est une faiblesse.
  assert.equal(detectBackRankWeakness(new Chess('6k1/5ppp/8/8/8/8/8/R5K1 b - - 0 1'), 'b'), true)
  // Le même roi avec une case d'air en h7 : plus de faiblesse.
  assert.equal(detectBackRankWeakness(new Chess('6k1/5pp1/7p/8/8/8/8/R5K1 b - - 0 1'), 'b'), false)
})

// ─────────────────────────────────────────────────────────────────────────────
//  Motifs de position
// ─────────────────────────────────────────────────────────────────────────────

test('la paire de fous se compte, sans se tromper de couleur', () => {
  const position = new Chess('4k3/8/8/8/8/8/8/2B1KB2 w - - 0 1')
  assert.equal(hasBishopPair(position, 'w'), true)
  assert.equal(hasBishopPair(position, 'b'), false)
  // Deux fous de même couleur de cases ne font pas la paire : c1 et e3 sont
  // tous les deux sur des cases sombres.
  assert.equal(hasBishopPair(new Chess('4k3/8/8/8/8/4B3/8/2B1K3 w - - 0 1'), 'w'), false)
})

test('l’opposition appartient à celui qui n’a pas le trait', () => {
  /*
    Rois en e4 et e6, une seule case entre eux. L'opposition est au camp qui
    **ne** doit **pas** jouer : celui qui a le trait doit céder du terrain.
  */
  const traitAuxBlancs = new Chess('8/8/4k3/8/4K3/8/8/8 w - - 0 1')
  assert.equal(hasOpposition(traitAuxBlancs, 'b'), true, 'les Noirs, qui attendent')
  assert.equal(hasOpposition(traitAuxBlancs, 'w'), false, 'pas les Blancs, qui doivent jouer')

  // Rois décalés en diagonale non alignée : personne n'a l'opposition.
  const decales = new Chess('8/8/5k2/8/4K3/8/8/8 w - - 0 1')
  assert.equal(hasOpposition(decales, 'b'), false)
  assert.equal(hasOpposition(decales, 'w'), false)
})

test('l’opposition se compte aussi à distance, et sur les diagonales', () => {
  /*
    Ce sont les deux cas que la faute de parité masquait avec le premier : la
    fonction ne rendait jamais vrai, donc rien ne distinguait une règle fausse
    d'une règle incomplète.
  */

  // Opposition à distance : e2 contre e8, cinq cases entre les rois.
  const lointaine = new Chess('4k3/8/8/8/8/8/4K3/8 w - - 0 1')
  assert.equal(hasOpposition(lointaine, 'b'), true, 'six cases d’écart : distance paire')
  assert.equal(hasOpposition(lointaine, 'w'), false)

  // Opposition diagonale : c3 contre e5, une case entre les rois.
  const diagonale = new Chess('8/8/8/4k3/8/2K5/8/8 w - - 0 1')
  assert.equal(hasOpposition(diagonale, 'b'), true, 'sur la diagonale aussi')

  /*
    Distance impaire : les rois se font face avec deux cases entre eux, et c'est
    celui qui a le trait qui prendra l'opposition en avançant. Personne ne l'a
    encore — c'est exactement le cas que l'ancienne règle déclarait bon.
  */
  const personne = new Chess('8/4k3/8/8/4K3/8/8/8 w - - 0 1')
  assert.equal(hasOpposition(personne, 'b'), false, 'distance de 3 : pas d’opposition')
  assert.equal(hasOpposition(personne, 'w'), false)
})

test('une pièce piégée est repérée, et une pièce libre ne l’est pas', () => {
  /*
    Le fou blanc en a7 a pris un pion et se retrouve enfermé : le cavalier c6
    l'attaque et couvre sa seule case de fuite, b8 ; l'autre sortie, Fxb6, se
    reprend par le pion c7. C'est le piège classique du fou qui « gagne » le
    pion a7.
  */
  const piege = new Chess('4k3/B1p5/1pn5/8/8/8/8/4K3 w - - 0 1')
  const piegees = findTrappedPieces(piege, 'w')
  assert.ok(piegees.includes('a7'), `a7 devrait être piégé (${JSON.stringify(piegees)})`)

  // Le même fou au grand air n'est pas piégé : il n'est même pas menacé.
  const libre = new Chess('4k3/8/8/8/4B3/8/8/4K3 w - - 0 1')
  assert.deepEqual(findTrappedPieces(libre, 'w'), [])
})
