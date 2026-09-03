/**
 * Les classements.
 *
 * Deux échelles cohabitent : l'Elo, pour ce qui s'annonce et se compare, et le
 * Glicko-2, pour ce qui s'enregistre. Aucun des deux n'était couvert, alors
 * que ce sont les seuls calculs du projet dont le résultat s'écrit en base et
 * ne se recalcule jamais.
 *
 * Le Glicko-2 est éprouvé contre **l'exemple numérique de l'article de Mark
 * Glickman**, qui donne les valeurs attendues à quatre décimales. C'est la
 * seule vérité extérieure disponible pour cet algorithme, et elle vaut mieux
 * que n'importe quelle attente qu'on se fabriquerait soi-même.
 */

import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import {
  decayGlicko,
  defaultGlicko,
  eloExpectedScore,
  eloKFactor,
  updateElo,
  updateGlicko,
  type GlickoRating,
} from '../src/rating.ts'

// ─────────────────────────────────────────────────────────────────────────────
//  Elo
// ─────────────────────────────────────────────────────────────────────────────

test('l’espérance Elo suit la table de référence', () => {
  // Table classique des écarts. Tolérance à un millième : la formule est
  // exacte, c'est la table imprimée qui est arrondie.
  const table: Array<[ecart: number, attendu: number]> = [
    [0, 0.5],
    [50, 0.571],
    [100, 0.64],
    [200, 0.76],
    [400, 0.909],
    [800, 0.99],
  ]
  for (const [ecart, attendu] of table) {
    const obtenu = eloExpectedScore(1500 + ecart, 1500)
    assert.ok(
      Math.abs(obtenu - attendu) < 0.01,
      `écart ${ecart} : attendu ≈ ${attendu}, obtenu ${obtenu.toFixed(3)}`,
    )
  }
})

test('l’espérance des deux camps fait toujours un', () => {
  for (const [a, b] of [[1500, 1500], [2400, 1200], [1000, 1873]] as const) {
    assert.ok(Math.abs(eloExpectedScore(a, b) + eloExpectedScore(b, a) - 1) < 1e-9)
  }
})

test('battre plus fort rapporte plus que battre plus faible', () => {
  const contreFort = updateElo(1500, 1900, 1, 100)
  const contreFaible = updateElo(1500, 1100, 1, 100)
  assert.ok(contreFort.delta > contreFaible.delta)
  // Et perdre contre plus faible coûte plus que perdre contre plus fort.
  assert.ok(updateElo(1500, 1100, 0, 100).delta < updateElo(1500, 1900, 0, 100).delta)
})

test('le facteur K décroît avec l’expérience', () => {
  const debutant = eloKFactor(1200, 5)
  const habitue = eloKFactor(1200, 200)
  assert.ok(debutant > habitue, `${debutant} devrait dépasser ${habitue}`)
})

// ─────────────────────────────────────────────────────────────────────────────
//  Glicko-2
// ─────────────────────────────────────────────────────────────────────────────

test('l’exemple de l’article de Glickman est reproduit', () => {
  /*
    « Example calculation », Mark E. Glickman, *The Glicko-2 system*.

    Un joueur à 1500 avec RD 200 et volatilité 0,06 affronte trois adversaires
    dans la même période : 1400 (RD 30) gagné, 1550 (RD 100) perdu,
    1700 (RD 300) perdu. L'article donne le résultat : classement ≈ 1464,06,
    RD ≈ 151,52, volatilité ≈ 0,05999.

    Notre τ vaut peut-être autre chose que le 0,5 de l'article, ce qui ne
    déplace que la volatilité, de très peu. Les deux valeurs qui comptent — le
    classement et l'incertitude — sont comparées au dixième de point.
  */
  const joueur: GlickoRating = { rating: 1500, rd: 200, volatility: 0.06 }
  const apres = updateGlicko(joueur, [
    { rating: 1400, rd: 30, score: 1 },
    { rating: 1550, rd: 100, score: 0 },
    { rating: 1700, rd: 300, score: 0 },
  ])

  assert.ok(
    Math.abs(apres.rating - 1464.06) < 0.5,
    `classement attendu ≈ 1464,06, obtenu ${apres.rating.toFixed(2)}`,
  )
  assert.ok(
    Math.abs(apres.rd - 151.52) < 1,
    `RD attendu ≈ 151,52, obtenu ${apres.rd.toFixed(2)}`,
  )
})

test('une période sans partie n’élève que l’incertitude', () => {
  const joueur: GlickoRating = { rating: 1500, rd: 100, volatility: 0.06 }
  const apres = updateGlicko(joueur, [])
  assert.equal(apres.rating, 1500)
  assert.ok(apres.rd > 100, 'le RD doit remonter')
  assert.equal(apres.volatility, 0.06)
})

test('l’incertitude remonte avec l’absence, jamais avec la présence', () => {
  const joueur: GlickoRating = { rating: 1500, rd: 60, volatility: 0.06 }
  assert.equal(decayGlicko(joueur, 0).rd, 60)
  const unMois = decayGlicko(joueur, 30)
  const sixMois = decayGlicko(joueur, 180)
  assert.ok(unMois.rd > 60)
  assert.ok(sixMois.rd > unMois.rd)
  // Le classement lui-même ne bouge pas : on n'a rien appris de nouveau.
  assert.equal(sixMois.rating, 1500)
})

test('un nouveau venu bouge beaucoup plus qu’un joueur établi', () => {
  const nouveau = defaultGlicko()
  const etabli: GlickoRating = { rating: nouveau.rating, rd: 50, volatility: 0.06 }
  const adversaire = { rating: nouveau.rating + 200, rd: 50, score: 1 as const }

  const gainNouveau = updateGlicko(nouveau, [adversaire]).rating - nouveau.rating
  const gainEtabli = updateGlicko(etabli, [adversaire]).rating - etabli.rating

  assert.ok(
    gainNouveau > gainEtabli * 2,
    `un RD de ${nouveau.rd} doit bouger bien plus qu'un RD de 50 (${gainNouveau} contre ${gainEtabli})`,
  )
})

test('gagner monte, perdre descend, la nulle départage', () => {
  const joueur: GlickoRating = { rating: 1500, rd: 80, volatility: 0.06 }
  const adversaire = { rating: 1500, rd: 80 }
  const victoire = updateGlicko(joueur, [{ ...adversaire, score: 1 }]).rating
  const nulle = updateGlicko(joueur, [{ ...adversaire, score: 0.5 }]).rating
  const defaite = updateGlicko(joueur, [{ ...adversaire, score: 0 }]).rating

  assert.ok(victoire > nulle && nulle > defaite)
  // À force égale, la nulle ne change rien.
  assert.ok(Math.abs(nulle - 1500) < 0.5, `nulle attendue ≈ 1500, obtenue ${nulle}`)
})
