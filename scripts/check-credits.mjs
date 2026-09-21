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
 *  3. **une version qui a dérivé** — « Stockfish 19 » sur la page pendant que
 *     `install-stockfish.mjs` va chercher `sf_20`.
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
  ── Et la version écrite dans les phrases ? ──────────────────────────────────

  Le contrôle ci-dessus confronte le catalogue au script d'installation. Il ne
  voit pas les textes : « Stockfish 18 » vivait aussi en toutes lettres dans
  vingt fichiers de langue, dans le pied de page et dans `ATTRIBUTION.md`, et
  la montée en version les laissait tous derrière sans que rien ne proteste.
  Angle mort d'autant plus coûteux qu'il est multilingue : on corrige le
  français, on oublie les dix-neuf autres, et l'erreur ne se voit que depuis
  une langue qu'on ne lit pas.

  On cherche donc « <nom> <nombre> » partout où l'application parle, et on
  exige que le nombre soit celui du catalogue. Volontairement limité aux
  crédits qui portent une version écrite à la main — les paquets npm ont leur
  numéro dans un `package.json`, personne ne le recopie dans une phrase.
*/
const { readFileSync, readdirSync, existsSync } = await import('node:fs')
const { join, dirname, resolve } = await import('node:path')
const { fileURLToPath } = await import('node:url')

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Les fichiers où l'application s'adresse à quelqu'un. */
function fichiersParlants() {
  const trouves = []
  const dossiers = [
    join(racine, 'apps', 'web', 'src', 'lib', 'i18n'),
    join(racine, 'apps', 'web', 'src', 'lib', 'i18n', 'langues'),
    join(racine, 'apps', 'web', 'src', 'components', 'layout'),
  ]
  for (const dossier of dossiers) {
    if (!existsSync(dossier)) continue
    for (const nom of readdirSync(dossier)) {
      if (/\.tsx?$/.test(nom)) trouves.push(join(dossier, nom))
    }
  }
  for (const nom of ['ATTRIBUTION.md', 'README.md']) {
    const chemin = join(racine, nom)
    if (existsSync(chemin)) trouves.push(chemin)
  }
  return trouves
}

const parlants = fichiersParlants()
const versionnes = CREDITS.filter((credit) => credit.version)

for (const credit of versionnes) {
  const motif = new RegExp(`${credit.nom}\\s+(\\d+(?:\\.\\d+)*)`, 'g')
  const fautes = []

  for (const chemin of parlants) {
    const contenu = readFileSync(chemin, 'utf8')
    for (const [, ecrite] of contenu.matchAll(motif)) {
      if (ecrite === credit.version) continue
      const relatif = chemin.slice(racine.length + 1).replace(/\\/g, '/')
      fautes.push(`${relatif} dit « ${credit.nom} ${ecrite} »`)
    }
  }

  check(
    `les textes disent « ${credit.nom} ${credit.version} »`,
    fautes.length === 0,
    [...new Set(fautes)].slice(0, 6).join(' · '),
  )
}

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
