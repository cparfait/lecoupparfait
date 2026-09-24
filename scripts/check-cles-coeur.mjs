#!/usr/bin/env node
/**
 * Vérifie les clés de dictionnaire émises par le cœur.
 *
 * `packages/core` ne peut pas importer `TranslationKey` : c'est l'application
 * web qui dépend de lui, et non l'inverse. Ses textes affichables sont donc des
 * `string` — le nom d'un motif, le verdict d'un coup, la devise d'un adversaire
 * — et le compilateur ne peut plus dire s'ils désignent quelque chose.
 *
 * C'était la seule garantie perdue de tout le chantier de traduction, et elle
 * compte : le typage a refusé plusieurs clés inventées en route, dont deux qui
 * se lisaient parfaitement bien. Ce contrôle la rend, une passe plus tard.
 *
 * Il vérifie aussi le **sens inverse** — une entrée du dictionnaire que plus
 * aucun objet du cœur ne réclame. C'est le genre de chose qui survit à un motif
 * supprimé : la traduction reste, personne ne la lit, et les trente-neuf langues
 * la traduisent pour rien.
 *
 * Usage :  node scripts/check-cles-coeur.mjs
 */

const { fr } = await import('../apps/web/src/lib/i18n/fr.ts')
const coeur = await import('../packages/core/src/index.ts')

/** Les racines du dictionnaire que le cœur alimente. */
const RACINES = ['motifs', 'qualites', 'bots', 'axes', 'niveaux', 'rangs']

function resoudre(chemin) {
  let courant = fr
  for (const segment of chemin.split('.')) {
    if (!courant || typeof courant !== 'object') return null
    courant = courant[segment]
  }
  return typeof courant === 'string' ? courant : null
}

/** Tous les chemins pointés d'un objet, à plat. */
function chemins(objet, prefixe = '') {
  const sortie = []
  for (const [cle, valeur] of Object.entries(objet ?? {})) {
    const chemin = prefixe ? `${prefixe}.${cle}` : cle
    if (typeof valeur === 'string') sortie.push(chemin)
    else if (valeur && typeof valeur === 'object') sortie.push(...chemins(valeur, chemin))
  }
  return sortie
}

/**
 * Les clés que le cœur réclame réellement, lues sur ses objets.
 *
 * On parcourt les valeurs plutôt que le texte des fichiers : une clé composée
 * à l'exécution — et il y en a, `BOT_LEVELS` reprend celle de sa personnalité —
 * n'apparaîtrait dans aucune source.
 */
const reclamees = new Set()

function recolter(valeur) {
  if (typeof valeur === 'string') {
    if (RACINES.some((racine) => valeur.startsWith(`${racine}.`))) reclamees.add(valeur)
    return
  }
  if (Array.isArray(valeur)) {
    for (const element of valeur) recolter(element)
    return
  }
  if (valeur && typeof valeur === 'object') {
    for (const element of Object.values(valeur)) recolter(element)
  }
}

for (const nom of ['BOT_PERSONALITIES', 'BOT_LEVELS', 'QUALITY_STYLES', 'RANGS']) {
  recolter(coeur[nom])
}
// Les motifs ne sont pas exportés en table : on passe par le glossaire, qui les
// énumère tous, et par `motifCopy` pour les champs qu'il ne rend pas.
for (const motif of coeur.motifGlossary('fr')) {
  recolter(motif.name)
  recolter(motif.definition)
}
// Les noms de niveau se composent depuis l'identifiant de chaque tranche.
for (const tranche of coeur.TRANCHES_DEFI) recolter(coeur.cleDeTranche(tranche.id))
// Les axes de style ne sortent que par `penchants`, qui les compose.
for (const racine of ['axes']) {
  for (const chemin of chemins(fr[racine], racine)) reclamees.add(chemin)
}

let erreurs = 0

console.log(`\n🔑  Clés du cœur — ${reclamees.size} réclamées`)

for (const cle of [...reclamees].sort()) {
  if (resoudre(cle) === null) {
    console.error(`  ✗ ${cle} : réclamée par le cœur, absente du dictionnaire français`)
    erreurs += 1
  }
}

const offertes = new Set(RACINES.flatMap((racine) => chemins(fr[racine], racine)))
for (const cle of [...offertes].sort()) {
  if (!reclamees.has(cle)) {
    console.error(`  ✗ ${cle} : dans le dictionnaire, réclamée par personne`)
    erreurs += 1
  }
}

if (erreurs > 0) {
  console.error(`\n${erreurs} problème(s) aux clés du cœur.`)
  process.exit(1)
}
console.log(`✔ ${reclamees.size} clés, toutes définies et toutes lues.`)
