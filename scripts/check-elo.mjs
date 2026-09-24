#!/usr/bin/env node
/**
 * Vérifie que l'estimation de niveau tient ses propres repères.
 *
 * Ce contrôle existe à cause d'un défaut précis : la fonction documentait cinq
 * points de calibration — 110 cp ≈ 1000 Elo, 10 cp ≈ 2700 — et n'en atteignait
 * aucun. Elle rendait 450 là où elle annonçait 1000, et son terme ACPL passait
 * sous zéro pour un débutant. Rien ne le signalait : le mélange avec la
 * précision et le plancher (alors à 400) ramenaient toujours le résultat dans une
 * fourchette crédible.
 *
 * D'où la règle appliquée ici : un commentaire qui annonce des chiffres doit
 * être exécutable. `ELO_ANCHORS` est la source, la fonction doit s'y tenir.
 *
 * Usage :  node scripts/check-elo.mjs
 */

const { ELO_ANCHORS, ELO_PLANCHER, estimateElo } = await import('../packages/core/src/eval.ts')
const { BOT_LEVELS } = await import('../packages/core/src/bots.ts')

let checks = 0
let failures = 0

function check(label, condition, detail = '') {
  checks++
  if (condition) return
  failures++
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
}

console.log('\n♟  Repères de calibration\n')

/** Une partie complète : la confiance est pleine, rien ne tire vers 1200. */
const COUPS = 40

/**
 * Tolérance de 120 points.
 *
 * Les repères sont des ordres de grandeur observés, pas des constantes
 * physiques, et deux estimateurs mélangés ne peuvent pas passer exactement par
 * cinq points. Serrer davantage transformerait ce contrôle en moule à
 * coefficients, ce qui interdirait toute amélioration du modèle.
 */
const TOLERANCE = 120

for (const { acpl, accuracy, elo } of ELO_ANCHORS) {
  const obtenu = estimateElo(acpl, accuracy, COUPS)
  const ecart = Math.abs(obtenu - elo)
  check(
    `${String(acpl).padStart(3)} cp / ${accuracy} % → ${elo} Elo`,
    ecart <= TOLERANCE,
    `obtenu ${obtenu}, écart de ${ecart}`,
  )
  if (ecart <= TOLERANCE) {
    console.log(
      `  ✓ ${String(acpl).padStart(3)} cp · ${String(accuracy).padStart(2)} % → ${obtenu} Elo (visé ${elo})`,
    )
  }
}

console.log('\n♟  Propriétés\n')

// Monotonie : mieux jouer ne doit jamais faire baisser l'estimation.
let precedent = -Infinity
let monotone = true
for (let acpl = 200; acpl >= 5; acpl -= 5) {
  const valeur = estimateElo(acpl, 50 + (200 - acpl) / 4, COUPS)
  if (valeur < precedent) monotone = false
  precedent = valeur
}
check('l’estimation ne baisse jamais quand le jeu s’améliore', monotone)

// Le terme ACPL seul reste dans le domaine du plausible, y compris tout en bas.
// C'est exactement ce qui manquait : il descendait à −190 pour 110 centipions.
const planchers = [300, 200, 150, 110].map((acpl) => 4390 - 710 * Math.log(acpl))
check(
  'le terme ACPL reste positif pour un débutant',
  planchers.every((valeur) => valeur > 0),
  `le pire vaut ${Math.round(Math.min(...planchers))}`,
)

// Une partie trop courte ne conclut rien.
check('une partie de 4 coups ne conclut rien', estimateElo(10, 95, 4) === 1200)

// Les bornes tiennent.
// Le plancher est celui de l'échelle : à 400, un débutant qui battait le
// niveau 1 (100) lisait « 400 » après son analyse.
check(
  'le plancher est celui du premier adversaire',
  ELO_PLANCHER === BOT_LEVELS[0].elo,
  `${ELO_PLANCHER} contre ${BOT_LEVELS[0].elo}`,
)
check('plancher tenu', estimateElo(2000, 0, 200) === ELO_PLANCHER)
check(
  'une partie très faible descend sous 400',
  estimateElo(300, 20, 40) < 400,
  `obtenu ${estimateElo(300, 20, 40)}`,
)
check('plafond à 3000', estimateElo(0, 100, 200) <= 3000)

// ── Le nombre de niveaux annoncé ─────────────────────────────────────────────
//
// Chaque changement d'échelle a laissé derrière lui un nombre périmé dans un
// texte — « vingt-cinq niveaux » a survécu deux refontes. Ces quatre phrases
// l'écrivent en toutes lettres, dans chaque langue, et le README aussi : leur
// premier nombre doit être celui de BOT_LEVELS.
{
  const { readFileSync, readdirSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const { join } = await import('node:path')
  const racine = fileURLToPath(new URL('..', import.meta.url))
  const dossier = join(racine, 'apps', 'web', 'src', 'lib', 'i18n')
  const fichiers = [
    join(dossier, 'fr.ts'),
    join(dossier, 'en.ts'),
    ...readdirSync(join(dossier, 'langues'))
      .filter((f) => /^[a-z]{2}\.ts$/.test(f))
      .map((f) => join(dossier, 'langues', f)),
  ]
  const CLES = ['vsComputerHint', 'levelsTitle', 'vsComputerDetail', 'rootDesc']
  const attendu = String(BOT_LEVELS.length)
  for (const fichier of fichiers) {
    const texte = readFileSync(fichier, 'utf8')
    for (const cle of CLES) {
      const m = texte.match(new RegExp(String.raw`\b${cle}:\s*(['"])([\s\S]*?)\1`))
      if (!m) continue
      const nombre = m[2].match(/\d+/)?.[0]
      if (!nombre) continue
      check(
        `${fichier.split(/[\/]/).at(-1)} · ${cle} annonce ${attendu} niveaux`,
        nombre === attendu,
        `il en annonce ${nombre}`,
      )
    }
  }
  const readme = readFileSync(join(racine, 'README.md'), 'utf8')
  const ligne = readme.match(/(\d+) niveaux d'ordinateur/)
  check(
    `le README annonce ${attendu} niveaux d'ordinateur`,
    ligne?.[1] === attendu,
    `il en annonce ${ligne?.[1] ?? 'aucun'}`,
  )
}

console.log(
  failures === 0
    ? `\n✓ ${checks} vérifications passées\n`
    : `\n✗ ${failures} échec(s) sur ${checks} vérifications\n`,
)
process.exit(failures === 0 ? 0 : 1)
