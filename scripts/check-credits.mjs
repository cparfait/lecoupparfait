#!/usr/bin/env node
/**
 * Vérifie que les crédits disent la vérité.
 *
 * La page « Crédits & licences » n'est pas de la politesse : les licences GPL,
 * ISC, Apache et MPL qui traversent ce projet **exigent** l'attribution, et une
 * liste écrite à la main cesse d'être juste au premier `npm install`. Trois
 * dérives, et ce contrôle les attrape toutes les trois :
 *
 *  1. **un paquet d'exécution non crédité** — ajouté un soir, jamais remonté ;
 *  2. **un crédit orphelin** — le paquet est parti, l'entrée est restée ;
 *  3. **une version qui a dérivé** — « Stockfish 18 » sur la page pendant que
 *     `install-stockfish.mjs` va chercher `sf_19`.
 *
 * Il ne va jamais sur le réseau : savoir s'il existe plus récent est le travail
 * de l'onglet « Outils » de l'administration, à la demande.
 *
 * Usage :  node --experimental-strip-types scripts/check-credits.mjs
 */

const { inventorier } = await import('../apps/web/src/lib/credits/inventaire.ts')
const { CREDITS } = await import('../apps/web/src/lib/credits/catalogue.ts')

let checks = 0
let failures = 0

function check(label, condition, detail = '') {
  checks++
  if (condition) return
  failures++
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
}

console.log('\n♟  Crédits et licences\n')

const inventaire = inventorier()

check('la racine du dépôt est trouvée', inventaire.racine !== null)
check(
  'les quatre espaces de travail sont lisibles',
  inventaire.espacesIllisibles.length === 0,
  inventaire.espacesIllisibles.join(', '),
)

// ── Chaque entrée est complète ────────────────────────────────────────────
// Une ligne sans auteur ou sans licence ne remplit pas l'obligation qu'elle
// prétend remplir.
for (const credit of CREDITS) {
  check(`« ${credit.nom} » a un auteur`, credit.auteur.length > 2)
  check(`« ${credit.nom} » a une licence`, credit.licence.length > 2)
  check(`« ${credit.nom} » a un lien`, credit.url.startsWith('https://'))
  check(`« ${credit.nom} » a une note`, credit.note.length > 15)
}

check(
  'aucun nom en double',
  new Set(CREDITS.map((c) => c.nom)).size === CREDITS.length,
  'deux entrées portent le même nom',
)
const paquets = CREDITS.filter((c) => c.paquet).map((c) => c.paquet)
check('aucun paquet crédité deux fois', new Set(paquets).size === paquets.length)

// ── Le rapprochement avec le dépôt ────────────────────────────────────────
const nonCredites = inventaire.paquets.filter((entree) => !entree.credit)
check(
  'chaque dépendance d’exécution est créditée',
  nonCredites.length === 0,
  nonCredites.map((e) => `${e.paquet} (${e.espaces.join(', ')})`).join(', '),
)

check(
  'aucun crédit ne cite un paquet disparu',
  inventaire.orphelins.length === 0,
  inventaire.orphelins.map((c) => `${c.nom} → ${c.paquet}`).join(', '),
)

check(
  'les versions affichées sont celles qu’on installe',
  inventaire.versionsDivergentes.length === 0,
  inventaire.versionsDivergentes.map((v) => `${v.nom} ${v.version} ∉ ${v.fichier}`).join(', '),
)

/*
  La licence annoncée est-elle celle du paquet ?

  Comparaison indicative, et volontairement tolérante : « MIT » et
  « MIT-0 » sont deux licences, mais un paquet peut aussi écrire
  « (MIT OR Apache-2.0) » là où le catalogue en retient une. On signale sans
  faire échouer — c'est l'onglet « Outils » qui montre l'écart en détail, et
  un humain qui tranche.
*/
const licencesDouteuses = inventaire.paquets.filter(
  (entree) =>
    entree.credit &&
    entree.licenceReelle &&
    !entree.licenceReelle.toLowerCase().includes(entree.credit.licence.toLowerCase()) &&
    !entree.credit.licence.toLowerCase().includes(entree.licenceReelle.toLowerCase()),
)
if (licencesDouteuses.length > 0) {
  console.log('\n  ⚠  licences à confirmer (le paquet et le catalogue ne disent pas pareil) :')
  for (const entree of licencesDouteuses) {
    console.log(
      `     ${entree.paquet} : paquet « ${entree.licenceReelle} », catalogue « ${entree.credit.licence} »`,
    )
  }
}

console.log(
  `\n  ${CREDITS.length} entrées, dont ${paquets.length} paquets npm · ${inventaire.paquets.length} dépendances d’exécution trouvées`,
)

if (failures > 0) {
  console.log(`\n✗ ${failures} problème(s) sur ${checks} vérifications\n`)
  process.exit(1)
}
console.log(`\n✓ ${checks} vérifications passées\n`)
