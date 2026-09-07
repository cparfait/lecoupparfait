#!/usr/bin/env node
/**
 * Vérifie le calculateur Elo contre des cas qu'on peut refaire à la main.
 *
 * Le calcul tient en trois lignes, et c'est justement ce qui le rend facile à
 * fausser sans que rien ne se voie : un signe inversé dans l'écart, un plafond
 * oublié, une table de performance décalée d'une case, et l'écran affiche
 * toujours un nombre plausible. D'où des repères pris dans le règlement de
 * classement FIDE lui-même.
 *
 * Usage :  node scripts/check-outils-elo.mjs
 */

const { scoreAttendu, variation, coefficientK, ecartPerformance, bilan } =
  await import('../apps/web/src/lib/outils/elo.ts')

let checks = 0
let failures = 0

function check(label, condition, detail = '') {
  checks++
  if (condition) return
  failures++
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
}

const proche = (a, b, marge = 0.005) => Math.abs(a - b) <= marge

console.log('\n♟  Score attendu\n')
check('cotes égales : une demi-partie', proche(scoreAttendu(1500, 1500), 0.5))
check('200 points de plus : 0,76', proche(scoreAttendu(1700, 1500), 0.76))
check('200 points de moins : 0,24', proche(scoreAttendu(1500, 1700), 0.24))
check('symétrie', proche(scoreAttendu(1800, 1600) + scoreAttendu(1600, 1800), 1))
check(
  'écart plafonné à 400 : 1000 points de plus valent 400',
  scoreAttendu(2500, 1500) === scoreAttendu(1900, 1500),
)
check('400 de plus : 0,909', proche(scoreAttendu(1900, 1500), 0.909, 0.002))

console.log('\n♟  Variation\n')
check('victoire attendue à 50 % avec K=20 : +10', variation(20, 1, 0.5) === 10)
check('défaite attendue à 50 % avec K=20 : −10', variation(20, 0, 0.5) === -10)
check('nulle attendue à 50 % : rien', variation(40, 0.5, 0.5) === 0)

console.log('\n♟  Coefficient K\n')
check(
  'nouveau joueur : 40',
  coefficientK({ parties: 5, age: 40, cote: 1500, aAtteint2400: false }) === 40,
)
check(
  'junior sous 2300 : 40',
  coefficientK({ parties: 80, age: 15, cote: 2100, aAtteint2400: false }) === 40,
)
check(
  'junior à 2300 : 20',
  coefficientK({ parties: 80, age: 15, cote: 2300, aAtteint2400: false }) === 20,
)
check(
  'adulte confirmé : 20',
  coefficientK({ parties: 80, age: 40, cote: 2100, aAtteint2400: false }) === 20,
)
check(
  '2400 atteint : 10',
  coefficientK({ parties: 80, age: 40, cote: 2450, aAtteint2400: false }) === 10,
)
check(
  '2400 un jour atteint, redescendu : 10',
  coefficientK({ parties: 80, age: 40, cote: 2350, aAtteint2400: true }) === 10,
)
check(
  'âge inconnu : pas junior',
  coefficientK({ parties: 80, age: null, cote: 2100, aAtteint2400: false }) === 20,
)

console.log('\n♟  Performance\n')
check('50 % : +0', ecartPerformance(0.5) === 0)
check('75 % : +193', ecartPerformance(0.75) === 193)
check('25 % : −193', ecartPerformance(0.25) === -193)
check('100 % : +800', ecartPerformance(1) === 800)
check('0 % : −800', ecartPerformance(0) === -800)
check('borné au-delà de 1', ecartPerformance(1.4) === 800)

console.log('\n♟  Bilan de tournoi\n')
// Trois parties à 1500 contre 1500, 1700 et 1300 : une victoire, une nulle, une défaite.
const b = bilan(1500, 20, [
  { adversaire: 1500, resultat: 1 },
  { adversaire: 1700, resultat: 0.5 },
  { adversaire: 1300, resultat: 0 },
])
check('points : 1,5', b.points === 1.5)
check('moyenne des adversaires : 1500', b.moyenneAdversaires === 1500)
check('performance à 50 % = la moyenne', b.performance === 1500)
check('attendu : 0,5 + 0,24 + 0,76 = 1,5', proche(b.attendu, 1.5, 0.01))
check('variation quasi nulle', proche(b.variation, 0, 0.2), `${b.variation}`)
check('nouvelle cote : 1500', b.nouvelleCote === 1500)
check('trois lignes de détail', b.parties.length === 3)
check('sans partie : performance nulle', bilan(1500, 20, []).performance === null)

console.log(
  failures === 0
    ? `\n✓ ${checks} vérifications passées\n`
    : `\n✗ ${failures} échec(s) sur ${checks} vérifications\n`,
)
process.exit(failures === 0 ? 0 : 1)
