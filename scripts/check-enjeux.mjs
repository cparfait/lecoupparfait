#!/usr/bin/env node
/**
 * Vérifie les fiches d'enjeux des ouvertures.
 *
 * Une fiche fausse est pire que pas de fiche : quelqu'un qui lit « la sicilienne
 * commence par 1.e4 c6 » n'a aucun moyen de savoir que c'est l'application qui
 * se trompe, et il retiendra l'erreur. Même raisonnement que pour les leçons,
 * et même forme de contrôle.
 *
 * Ce qui est vérifié :
 *
 *  - chaque suite de coups est **jouable** depuis la position initiale ;
 *  - le code ECO a la forme attendue — une lettre de A à E, deux chiffres ;
 *  - les identifiants sont uniques, sans quoi `ficheEnjeux` en rendrait une au
 *    hasard ;
 *  - deux fiches ne partagent pas la même suite de coups : elles seraient alors
 *    indistinguables sur l'échiquier, et `ficheDeLaPartie` en choisirait une
 *    arbitrairement ;
 *  - chaque `lecon` citée existe réellement dans le programme ;
 *  - chaque champ de texte est rempli, et la suite ne dépasse pas six coups —
 *    au-delà, la fiche ne s'afficherait presque jamais d'elle-même, puisqu'il
 *    faudrait que la partie suive exactement la théorie aussi longtemps.
 *
 * Usage :  node scripts/check-enjeux.mjs
 */

import { Chess } from 'chess.js'

const { FICHES_ENJEUX } = await import('../apps/web/src/lib/ouvertures/enjeux.ts')
const { ALL_LESSONS } = await import('../apps/web/src/lib/lessons/index.ts')

const ECO = /^[A-E][0-9]{2}$/
/** Au-delà, la fiche ne se reconnaîtrait plus d'elle-même sur un échiquier. */
const COUPS_MAX = 6

let erreurs = 0
const vus = new Set()
const suites = new Map()
/** Alias de prose déjà revendiqués, pour refuser les doublons entre fiches. */
const aliasVus = new Map()
const lecons = new Set(ALL_LESSONS.map((lecon) => lecon.id))

function echec(fiche, message) {
  erreurs++
  console.error(`  ✗ ${fiche.id} — ${message}`)
}

console.log(`\n📖  Enjeux des ouvertures — ${FICHES_ENJEUX.length} fiches`)

for (const fiche of FICHES_ENJEUX) {
  if (vus.has(fiche.id)) echec(fiche, 'identifiant en double')
  vus.add(fiche.id)

  if (!ECO.test(fiche.eco)) echec(fiche, `code ECO invalide : ${fiche.eco}`)

  if (fiche.coups.length === 0) echec(fiche, 'aucun coup')
  if (fiche.coups.length > COUPS_MAX) {
    echec(fiche, `${fiche.coups.length} coups — au-delà de ${COUPS_MAX}, la fiche ne sort jamais`)
  }

  const cle = fiche.coups.join(' ')
  const jumelle = suites.get(cle)
  if (jumelle) echec(fiche, `même suite que « ${jumelle} » : indistinguables sur l'échiquier`)
  suites.set(cle, fiche.id)

  // ── La suite est-elle jouable ? ───────────────────────────────────────────
  const echiquier = new Chess()
  for (const [rang, san] of fiche.coups.entries()) {
    try {
      echiquier.move(san)
    } catch {
      echec(fiche, `coup ${rang + 1} injouable : ${san} (après « ${cle} »)`)
      break
    }
  }

  /*
    Les textes, avec deux seuils et non un seul.

    Un nom d'ouverture fait quatre lettres — « Réti » — là où une explication
    qui tient en moins de quarante caractères n'explique rien. Un seuil unique
    refusait donc les vingt-deux noms légitimes du catalogue, ce qui est le
    meilleur moyen de faire désactiver un contrôle.
  */
  if (!fiche.nom || fiche.nom.trim().length < 4) echec(fiche, 'nom vide ou trop court')
  for (const champ of ['idee', 'structure', 'planBlancs', 'planNoirs', 'piege']) {
    if (!fiche[champ] || String(fiche[champ]).trim().length < 40) {
      echec(fiche, `champ « ${champ} » vide ou trop court pour expliquer quoi que ce soit`)
    }
  }

  if (fiche.pour !== 'Blancs' && fiche.pour !== 'Noirs') {
    echec(fiche, `« pour » invalide : ${fiche.pour}`)
  }

  if (fiche.lecon && !lecons.has(fiche.lecon)) {
    echec(fiche, `leçon inconnue : ${fiche.lecon}`)
  }

  /*
    Les alias de prose.

    Ce sont eux qui rendent un nom d'ouverture cliquable au milieu d'un texte —
    « les ouvertures qui contrôlent le centre de loin, est-indienne,
    sicilienne ». Deux fiches qui revendiqueraient le même alias enverraient le
    lecteur sur l'une des deux au hasard, et l'on ne s'en apercevrait jamais :
    les deux pages existent, les deux ont l'air plausibles.

    Minuscules imposées, parce que la reconnaissance compare en minuscules : un
    alias écrit « Sicilienne » ne correspondrait à rien, en silence.
  */
  if (!Array.isArray(fiche.alias) || fiche.alias.length === 0) {
    echec(fiche, 'aucun alias de prose : le nom ne sera jamais cliquable dans un texte')
  }
  for (const alias of fiche.alias ?? []) {
    if (alias !== alias.toLowerCase()) {
      echec(fiche, `alias « ${alias} » : attendu en minuscules`)
    }
    if (alias.length < 4) {
      echec(fiche, `alias « ${alias} » trop court : il accrocherait n'importe quel mot`)
    }
    const proprietaire = aliasVus.get(alias)
    if (proprietaire && proprietaire !== fiche.id) {
      echec(fiche, `alias « ${alias} » déjà revendiqué par ${proprietaire}`)
    }
    aliasVus.set(alias, fiche.id)
  }
}

/*
  Les deux premiers coups doivent être couverts.

  Ce n'est pas une règle esthétique : la fiche s'affiche dans l'explorateur dès
  que la suite correspond, et quelqu'un qui joue 1.e4 sans suite reconnue ne
  verrait jamais rien. On vérifie donc qu'au moins une fiche part de chacun des
  deux premiers coups les plus joués.
*/
for (const premier of ['e4', 'd4']) {
  if (!FICHES_ENJEUX.some((fiche) => fiche.coups[0] === premier)) {
    erreurs++
    console.error(`  ✗ aucune fiche après 1.${premier}`)
  }
}

if (erreurs > 0) {
  console.error(`\n❌  ${erreurs} problème${erreurs > 1 ? 's' : ''} dans les fiches d'enjeux.\n`)
  process.exit(1)
}

console.log(`\n✅  ${FICHES_ENJEUX.length} fiches valides, toutes les suites jouables.\n`)
