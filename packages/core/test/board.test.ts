/**
 * L'échange statique.
 *
 * C'est le calcul le plus discret du projet et l'un des plus lourds de
 * conséquences : c'est lui qui décide si un coup est un sacrifice ou une
 * bourde, si une fourchette en est une, et de quelle couleur s'entoure une
 * case d'arrivée sur le plateau. Il n'était couvert par rien.
 *
 * Les positions sont choisies pour que la bonne réponse se calcule de tête, à
 * la main, sans faire confiance au code qu'on teste. Les valeurs sont celles
 * de `PIECE_VALUES` — pion 100, cavalier 305, fou 333, tour 563, dame 950 —
 * et non les valeurs simplifiées de l'affichage.
 */

import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { PIECE_VALUES, staticExchange } from '../src/board.ts'

test('une pièce libre se prend pour ce qu’elle vaut', () => {
  // Un pion noir en e5, attaqué par un pion blanc en d4, que rien ne défend.
  const fen = '4k3/8/8/4p3/3P4/8/8/4K3 w - - 0 1'
  assert.equal(staticExchange(fen, 'e5', 'w'), PIECE_VALUES.p)
})

test('un échange équilibré ne rapporte rien', () => {
  // Pion noir en e5 défendu par le pion f6, pris par le pion d4 : +100 −100.
  const fen = '4k3/8/5p2/4p3/3P4/8/8/4K3 w - - 0 1'
  assert.equal(staticExchange(fen, 'e5', 'w'), 0)
})

test('une capture perdante vaut zéro, et non un nombre négatif', () => {
  /*
    Un cavalier noir en d5, défendu par le pion c6. Le seul attaquant blanc est
    la dame : +305 pour le cavalier, puis −950 en se faisant reprendre.

    Le résultat est **0**, pas −645, et c'est le contrat de la fonction : à
    chaque niveau, `Math.max(0, …)` dit « personne n'est obligé de capturer ».
    La valeur rendue est donc « ce que rapporte la meilleure suite, au pire
    rien du tout ». Toute la plateforme en dépend — les cases sûres du plateau,
    la détection des pièces en prise, la classification des sacrifices —, et
    retirer ce plafond ferait basculer les trois d'un coup, sans erreur de
    typage pour le signaler. D'où ce test.
  */
  const fen = '4k3/8/2p5/3n4/8/8/8/3QK3 w - - 0 1'
  assert.equal(staticExchange(fen, 'd5', 'w'), 0)
})

test('aucune position ne rend une valeur négative', () => {
  const positions = [
    '4k3/8/2p5/3n4/8/8/8/3QK3 w - - 0 1',
    'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
    '4r2k/8/8/4p3/8/8/4R3/4RK2 w - - 0 1',
  ]
  for (const fen of positions) {
    for (const case_ of ['d5', 'e5', 'f7', 'c6'] as const) {
      for (const camp of ['w', 'b'] as const) {
        assert.ok(staticExchange(fen, case_, camp) >= 0, `${fen} ${case_} ${camp}`)
      }
    }
  }
})

test('la pièce la moins chère capture en premier', () => {
  /*
    Un pion noir en e5, attaqué à la fois par le pion d4 et par la dame d1.
    Il est défendu par le pion f6. Le bon calcul prend avec le **pion** :
    +100 puis −100, soit 0. Prendre avec la dame donnerait 100 − 950.
  */
  const fen = '4k3/8/5p2/4p3/3P4/8/8/3QK3 w - - 0 1'
  assert.equal(staticExchange(fen, 'e5', 'w'), 0)
})

test('un attaquant en rayon X entre dans le compte', () => {
  /*
    Le cas que l'implémentation revendique, et qu'il faut donc éprouver.

    Pion noir en e5. Les Blancs ont deux tours empilées sur la colonne e —
    e1 et e2 —, les Noirs une seule en e8. La tour e2 est masquée par... rien,
    mais dès que la tour e1 aura pris, la seconde apparaît derrière elle.

    Compte, en prenant toujours avec la moins chère : Te1xe5 (+100),
    Te8xe5 (−563), Te2xe5 (+563). Net : +100. Sans les attaquants en rayon X,
    la deuxième tour blanche serait invisible et le calcul rendrait
    100 − 563 = −463, c'est-à-dire « ne prends pas », ce qui serait faux.
  */
  const fen = '4r2k/8/8/4p3/8/8/4R3/4RK2 w - - 0 1'
  assert.equal(staticExchange(fen, 'e5', 'w'), PIECE_VALUES.p)
})

test('une case vide ne vaut rien, et ne fait pas planter', () => {
  const fen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1'
  assert.equal(staticExchange(fen, 'e5', 'w'), 0)
})

test('une position illisible ne lève pas', () => {
  // `staticExchange` lit des positions composées, venues de l'éditeur ou d'une
  // leçon : elle ne doit jamais faire échouer l'écran qui l'appelle.
  assert.doesNotThrow(() => staticExchange('n%importe quoi', 'e4', 'w'))
})

// ─────────────────────────────────────────────────────────────────────────────
//  Chute du drapeau — article 6.9
// ─────────────────────────────────────────────────────────────────────────────

import { Chess } from 'chess.js'
import { peutEncoreMater, resultatAuDrapeau } from '../src/board.ts'

test('le drapeau qui tombe donne la partie à celui qui peut encore mater', () => {
  // Roi et dame blancs contre roi noir : les Noirs tombent, les Blancs gagnent.
  assert.equal(resultatAuDrapeau(new Chess('4k3/8/8/8/8/8/8/3QK3 b - - 0 1'), 'b'), '1-0')
  // Un pion suffit : il deviendra dame.
  assert.equal(resultatAuDrapeau(new Chess('4k3/8/8/8/8/8/4P3/4K3 b - - 0 1'), 'b'), '1-0')
})

test('le drapeau qui tombe face à un roi seul ne donne rien : nulle', () => {
  // Roi seul blanc, roi et dame noirs : les Noirs tombent, personne ne gagne.
  assert.equal(resultatAuDrapeau(new Chess('3qk3/8/8/8/8/8/8/4K3 b - - 0 1'), 'b'), '1/2-1/2')
  assert.equal(peutEncoreMater(new Chess('3qk3/8/8/8/8/8/8/4K3 b - - 0 1'), 'w'), false)
})

test('une pièce mineure seule ne mate jamais, deux cavaliers si, deux fous selon leur couleur', () => {
  assert.equal(peutEncoreMater(new Chess('4k3/8/8/8/8/8/8/1N2K3 w - - 0 1'), 'w'), false)
  assert.equal(peutEncoreMater(new Chess('4k3/8/8/8/8/8/8/2B1K3 w - - 0 1'), 'w'), false)
  assert.equal(peutEncoreMater(new Chess('4k3/8/8/8/8/8/8/1NN1K3 w - - 0 1'), 'w'), true)
  assert.equal(peutEncoreMater(new Chess('4k3/8/8/8/8/8/8/1NB1K3 w - - 0 1'), 'w'), true)
  // Deux fous sur la même couleur de case (c1 et e3 sont sombres) : rien.
  assert.equal(peutEncoreMater(new Chess('4k3/8/8/8/8/4B3/8/2B1K3 w - - 0 1'), 'w'), false)
  // Deux fous de couleurs différentes (c1 sombre, d3 claire) : mat possible.
  assert.equal(peutEncoreMater(new Chess('4k3/8/8/8/8/3B4/8/2B1K3 w - - 0 1'), 'w'), true)
})
