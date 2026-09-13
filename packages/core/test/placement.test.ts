/**
 * La lecture du test de niveau.
 *
 * Trois familles de vérifications, dans l'ordre où elles comptent :
 *
 *  1. **Les cas où la réponse est connue d'avance.** Un relevé symétrique —
 *     autant de réussites que d'échecs, sur la même cote — doit rendre cette
 *     cote exactement : c'est le seul point où le maximum de vraisemblance a une
 *     solution analytique, et c'est donc la seule vérité extérieure disponible.
 *  2. **Les cas dégénérés**, qui faisaient diverger la version sans
 *     pseudo-observations : douze sur douze, zéro sur douze, une seule position.
 *  3. **La monotonie**, qui est ce sur quoi repose tout le reste : réussir plus
 *     ne peut pas faire baisser l'estimation, et une position plus difficile
 *     réussie ne peut pas la faire baisser non plus.
 */

import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import {
  COTE_DE_DEPART,
  mesurerNiveau,
  PAS_DU_TEST,
  RD_APRES_TEST,
  releveCoherent,
  viseeSuivante,
  type ObservationDeTest,
} from '../src/placement.ts'

const DEPART = COTE_DE_DEPART

/** Le relevé qu'aurait produit un test où le joueur répond selon `motif`. */
function escalier(motif: string): ObservationDeTest[] {
  let visee = COTE_DE_DEPART
  return [...motif].map((caractere, marche) => {
    const reussie = caractere === 'o'
    const observation = { cote: visee, reussie }
    visee = viseeSuivante(visee, marche, reussie)
    return observation
  })
}

/** Un relevé : `'o'` pour réussi, `'x'` pour raté, tous à la même cote. */
function releve(cote: number, motif: string): ObservationDeTest[] {
  return [...motif].map((caractere) => ({ cote, reussie: caractere === 'o' }))
}

test('un relevé sans observation ne rend rien', () => {
  assert.equal(mesurerNiveau([], DEPART), null)
})

test('un relevé symétrique sur la cote de départ rend exactement cette cote', () => {
  // Le seul point où le maximum se calcule à la main : tout s'annule, le relevé
  // comme les deux pseudo-observations, qui sont à cette cote-là.
  const mesure = mesurerNiveau(releve(DEPART, 'oooxxx'), DEPART)!
  assert.ok(
    Math.abs(mesure.cote - DEPART) <= 1,
    `trois sur six à ${DEPART} devrait rendre ${DEPART}, obtenu ${mesure.cote}`,
  )
})

test('ailleurs, le relevé l’emporte largement sur le tassement', () => {
  /*
    Un relevé symétrique ailleurs qu'au départ ne rend pas exactement la cote
    servie : les deux pseudo-observations tirent vers le départ. C'est voulu —
    voir `mesurerNiveau` — et ce test fixe l'ampleur admise plutôt que de faire
    semblant qu'elle est nulle. Six réponses contre deux fictives : l'estimation
    doit rester dans le premier tiers de l'écart.
  */
  for (const cote of [600, 1500, 2000]) {
    const mesure = mesurerNiveau(releve(cote, 'oooxxx'), DEPART)!
    const ecart = Math.abs(mesure.cote - cote)
    const versLeDepart = Math.abs(DEPART - cote)
    assert.ok(
      mesure.cote !== cote ? ecart < versLeDepart / 3 : true,
      `à ${cote}, le tassement vers ${DEPART} est trop fort : obtenu ${mesure.cote}`,
    )
    // Et il va bien vers le départ, jamais dans l'autre sens.
    assert.ok((mesure.cote - cote) * (DEPART - cote) >= 0)
  }
})

test('plus de réponses, moins de tassement', () => {
  const court = mesurerNiveau(releve(1600, 'oxox'), DEPART)!
  const long = mesurerNiveau(releve(1600, 'oxoxoxoxoxox'), DEPART)!
  assert.ok(
    Math.abs(long.cote - 1600) < Math.abs(court.cote - 1600),
    `douze réponses doivent tasser moins que quatre (${long.cote} contre ${court.cote})`,
  )
})

test('un sans-faute reste fini, et au-dessus des positions vues', () => {
  const mesure = mesurerNiveau(releve(1400, 'oooooooooooo'), DEPART)!
  assert.ok(Number.isFinite(mesure.cote))
  assert.ok(
    mesure.cote > 1400,
    `douze réussites à 1400 doivent placer au-dessus de 1400, obtenu ${mesure.cote}`,
  )
  // Sans pseudo-observation, ce cas partait à l'infini. La borne exacte importe
  // moins que le fait qu'il y en ait une.
  assert.ok(mesure.cote < 2600, `estimation trop haute pour un relevé borné : ${mesure.cote}`)
})

test('un zéro pointé reste fini, et sous les positions vues', () => {
  const mesure = mesurerNiveau(releve(700, 'xxxxxxxxxxxx'), DEPART)!
  assert.ok(Number.isFinite(mesure.cote))
  assert.ok(mesure.cote < 700, `douze échecs à 700 doivent placer sous 700, obtenu ${mesure.cote}`)
  assert.ok(mesure.cote > 0)
})

test('réussir davantage ne fait jamais baisser l’estimation', () => {
  let precedente = -Infinity
  for (let reussites = 0; reussites <= 12; reussites++) {
    const motif = 'o'.repeat(reussites) + 'x'.repeat(12 - reussites)
    const mesure = mesurerNiveau(releve(1200, motif), DEPART)!
    assert.ok(
      mesure.cote >= precedente,
      `${reussites} réussites rendent ${mesure.cote}, moins que ${precedente} avec une de moins`,
    )
    precedente = mesure.cote
  }
})

test('l’ordre des réponses ne change rien', () => {
  const a = mesurerNiveau(releve(1100, 'ooxoxx'), DEPART)!
  const b = mesurerNiveau(releve(1100, 'xxoxoo'), DEPART)!
  assert.equal(a.cote, b.cote)
  assert.equal(a.sigma, b.sigma)
})

test('la même réussite vaut plus cher sur une position plus dure', () => {
  const facile = mesurerNiveau([...releve(1000, 'oxox'), { cote: 900, reussie: true }], DEPART)!
  const dure = mesurerNiveau([...releve(1000, 'oxox'), { cote: 1600, reussie: true }], DEPART)!
  assert.ok(
    dure.cote > facile.cote,
    `réussir à 1600 devrait valoir plus que réussir à 900 (${dure.cote} contre ${facile.cote})`,
  )
})

test('les douze réponses comptent, y compris la dernière', () => {
  const onze = releve(1200, 'oxoxoxoxoxo')
  const avecEchec = mesurerNiveau([...onze, { cote: 1200, reussie: false }], DEPART)!
  const avecReussite = mesurerNiveau([...onze, { cote: 1200, reussie: true }], DEPART)!
  assert.ok(
    avecReussite.cote > avecEchec.cote,
    'la douzième réponse doit peser sur le résultat, elle ne pesait sur rien',
  )
})

test('un relevé serré autour du niveau est plus sûr qu’un relevé qui file', () => {
  // Six positions à la mesure du joueur : chacune informe au maximum.
  const serre = mesurerNiveau(releve(1200, 'oxoxox'), DEPART)!
  // Six positions hors de portée : on n'apprend presque rien de chacune.
  const hasard = mesurerNiveau(
    [
      ...releve(2600, 'xxx'),
      ...releve(2600, 'xxx'),
    ],
    DEPART,
  )!
  assert.ok(
    serre.sigma < hasard.sigma,
    `un relevé serré doit être plus sûr (${serre.sigma} contre ${hasard.sigma})`,
  )
})

test('l’écart-type d’un test de douze positions est de l’ordre de cent points', () => {
  // Ce n'est pas une convention : c'est la précision d'un relevé binaire de
  // douze réponses sur l'échelle d'Elo, et elle borne tout ce que le test peut
  // promettre. Si ce nombre change, c'est que le modèle a changé.
  const mesure = mesurerNiveau(releve(1200, 'oxoxoxoxoxox'), DEPART)!
  assert.ok(
    mesure.sigma > 80 && mesure.sigma < 110,
    `écart-type attendu autour de 95, obtenu ${mesure.sigma}`,
  )
})

test('l’incertitude d’amorce reste plus large que celle du test', () => {
  // La conversion vers l'échelle des parties et l'écart entre tactique et jeu
  // ne sont pas mesurés par le test : l'amorce doit en tenir compte.
  const mesure = mesurerNiveau(releve(1200, 'oxoxoxoxoxox'), DEPART)!
  assert.ok(RD_APRES_TEST > mesure.sigma)
  // Et rester nettement sous l'incertitude d'un compte dont on ne sait rien.
  assert.ok(RD_APRES_TEST < 350)
})

// ─────────────────────────────────────────────────────────────────────────────
//  Cohérence du relevé
// ─────────────────────────────────────────────────────────────────────────────

test('un escalier réellement joué est accepté', () => {
  assert.ok(releveCoherent(escalier('oxoxoxoxoxox')))
  assert.ok(releveCoherent(escalier('oooooooooooo')))
  assert.ok(releveCoherent(escalier('xxxxxxxxxxxx')))
})

test('un escalier bruité par le tirage reste accepté', () => {
  // Le catalogue sert une position à ±120 de ce qui est demandé : c'est le cas
  // ordinaire, pas une anomalie.
  const bruite = escalier('oxoxoxoxoxox').map((observation, rang) => ({
    ...observation,
    cote: observation.cote + (rang % 2 === 0 ? 115 : -115),
  }))
  assert.ok(releveCoherent(bruite))
})

test('douze positions de maître annoncées résolues sont refusées', () => {
  // Le relevé fabriqué le plus rentable : que des positions très cotées, toutes
  // réussies. Il ne forme aucun escalier.
  const fabrique: ObservationDeTest[] = Array.from({ length: 12 }, () => ({
    cote: 2600,
    reussie: true,
  }))
  assert.equal(releveCoherent(fabrique), false)
})

test('un relevé vide ou trop long est refusé', () => {
  assert.equal(releveCoherent([]), false)
  assert.equal(releveCoherent(escalier('o'.repeat(PAS_DU_TEST.length + 1))), false)
})

test('deux positions hors des parages passent, trois non', () => {
  const depart = escalier('oxoxoxoxoxox')
  const avec = (combien: number) =>
    depart.map((observation, rang) =>
      rang < combien ? { ...observation, cote: 2600 } : observation,
    )
  assert.ok(releveCoherent(avec(2)))
  assert.equal(releveCoherent(avec(3)), false)
})

test('le sans-faute plafonne là où l’escalier plafonne', () => {
  const parfait = escalier('oooooooooooo')
  const derniere = parfait[parfait.length - 1]!
  // Somme des pas = 1340 : la dernière position servie est à 1000 + 1290.
  assert.equal(derniere.cote, 2290)
  const mesure = mesurerNiveau(parfait, DEPART)!
  assert.ok(
    mesure.cote > 2290,
    `un sans-faute doit placer au-dessus de la dernière position vue, obtenu ${mesure.cote}`,
  )
})
