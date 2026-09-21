#!/usr/bin/env node
/**
 * Mesure la couverture de chaque langue.
 *
 * Trente-quatre des trente-six langues sont **partielles par construction** :
 * exiger les trois cent vingt-deux clés d'un coup reviendrait à interdire
 * qu'une langue existe avant d'être finie, et aucune ne serait jamais
 * commencée (voir l'en-tête de `lib/i18n/dictionary.ts`).
 *
 * Le prix de ce choix, c'est qu'on ne sait plus où on en est. Un dictionnaire
 * à quatre-vingt-dix pour cent et un dictionnaire à dix pour cent compilent
 * aussi bien l'un que l'autre, et à l'écran la différence ressemble à un bug —
 * une phrase en anglais au milieu du polonais. Ce script rend l'état visible :
 * c'est le seul moyen de savoir ce qu'il reste à faire.
 *
 * Ce qu'il refuse, en revanche :
 *
 *  - une **clé inventée**, qui n'existe pas dans le dictionnaire français. Le
 *    typage l'interdit déjà pour les fichiers TypeScript ; ce contrôle couvre
 *    le cas d'une clé retirée du français et oubliée ailleurs ;
 *  - une **valeur vide**, qui affiche du blanc au lieu de retomber sur
 *    l'anglais — pire que la clé manquante ;
 *  - une langue déclarée dans le registre sans **étiquette BCP-47** ou sans nom,
 *    puisque la synthèse vocale et le sélecteur s'en servent.
 *
 * Usage :  node scripts/check-langues.mjs
 */

const { fr } = await import('../apps/web/src/lib/i18n/fr.ts')
const { en } = await import('../apps/web/src/lib/i18n/en.ts')
const { LANGUES } = await import('../apps/web/src/lib/i18n/langues.ts')
const { TRADUCTIONS } = await import('../apps/web/src/lib/i18n/langues/index.ts')

/** Tous les chemins pointés d'un dictionnaire, à plat. */
function chemins(objet, prefixe = '') {
  const sortie = []
  for (const [cle, valeur] of Object.entries(objet)) {
    const chemin = prefixe ? `${prefixe}.${cle}` : cle
    if (typeof valeur === 'string') sortie.push(chemin)
    else if (valeur && typeof valeur === 'object') sortie.push(...chemins(valeur, chemin))
  }
  return sortie
}

function lire(objet, chemin) {
  let courant = objet
  for (const segment of chemin.split('.')) {
    if (!courant || typeof courant !== 'object') return undefined
    courant = courant[segment]
  }
  return typeof courant === 'string' ? courant : undefined
}

const reference = chemins(fr)
let erreurs = 0

console.log(`\n🌍  Langues — ${LANGUES.length} proposées, ${reference.length} clés de référence\n`)

// ── Le registre lui-même ────────────────────────────────────────────────────
const codes = new Set()
for (const langue of LANGUES) {
  if (codes.has(langue.code)) {
    erreurs++
    console.error(`  ✗ code de langue en double : ${langue.code}`)
  }
  codes.add(langue.code)

  if (!langue.nom || !langue.bcp47) {
    erreurs++
    console.error(`  ✗ ${langue.code} — nom ou étiquette BCP-47 manquants`)
  }
  // L'étiquette sert à la synthèse vocale : « fr » seul ne suffit pas à
  // choisir une voix, il faut la région.
  if (langue.bcp47 && !/^[a-z]{2}-[A-Z]{2}$/.test(langue.bcp47)) {
    erreurs++
    console.error(`  ✗ ${langue.code} — étiquette BCP-47 douteuse : ${langue.bcp47}`)
  }
}

// Une traduction sans langue déclarée ne serait jamais servie.
for (const code of Object.keys(TRADUCTIONS)) {
  if (!codes.has(code)) {
    erreurs++
    console.error(`  ✗ traduction « ${code} » absente du registre des langues`)
  }
}

// ── La couverture, langue par langue ────────────────────────────────────────
const lignes = []
for (const langue of LANGUES) {
  const dictionnaire =
    langue.code === 'fr' ? fr : langue.code === 'en' ? en : (TRADUCTIONS[langue.code] ?? {})

  let traduites = 0
  for (const chemin of reference) {
    const valeur = lire(dictionnaire, chemin)
    if (valeur === undefined) continue
    if (valeur.trim() === '') {
      erreurs++
      console.error(`  ✗ ${langue.code} — clé vide : ${chemin}`)
      continue
    }
    traduites++
  }

  // Une clé qui n'existe plus en français traîne encore ailleurs.
  const connues = new Set(reference)
  for (const chemin of chemins(dictionnaire)) {
    if (!connues.has(chemin)) {
      erreurs++
      console.error(`  ✗ ${langue.code} — clé inconnue du français : ${chemin}`)
    }
  }

  lignes.push({
    code: langue.code,
    nom: langue.nom,
    traduites,
    taux: Math.round((traduites / reference.length) * 100),
  })
}

// Les plus avancées d'abord : c'est l'ordre dans lequel on veut lire un état.
lignes.sort((a, b) => b.taux - a.taux || a.code.localeCompare(b.code))

for (const ligne of lignes) {
  const barre = '█'.repeat(Math.round(ligne.taux / 5)).padEnd(20, '·')
  const marque = ligne.taux === 100 ? '✓' : ligne.taux === 0 ? '·' : '~'
  console.log(
    `  ${marque} ${ligne.code.padEnd(3)} ${ligne.nom.padEnd(18)} ${barre} ${String(ligne.taux).padStart(3)} %  ${ligne.traduites}/${reference.length}`,
  )
}

const completes = lignes.filter((ligne) => ligne.taux === 100).length
const entamees = lignes.filter((ligne) => ligne.taux > 0 && ligne.taux < 100).length
const vides = lignes.filter((ligne) => ligne.taux === 0).length

console.log(
  `\n  ${completes} complètes · ${entamees} en cours · ${vides} en anglais faute de traduction`,
)

/*
  ── Les dictionnaires annoncent-ils le bon nombre d'adversaires ? ────────────

  L'échelle est passée de vingt-sept échelons à quinze. Six chaînes d'interface,
  le README, la documentation et un chiffre écrit en dur sur l'accueil
  annonçaient encore « 25 niveaux » — et ce « 25 » était déjà faux **avant** la
  réduction, puisqu'il y en avait vingt-sept. Personne ne l'avait vu, et rien ne
  pouvait le voir : un nombre recopié dans une phrase ne se compare à rien.

  On le compare maintenant. Le contrôle lit `BOT_LEVELS` et refuse toute chaîne
  qui annonce un autre compte, dans n'importe laquelle des langues. C'est
  d'autant plus utile que l'erreur est multilingue : on corrige le français, on
  oublie les vingt autres, et la faute ne se voit que depuis une langue qu'on ne
  lit pas.

  Les clés surveillées sont celles qui annoncent un barème. Les autres nombres
  des dictionnaires — vingt-cinq ouvertures, douze positions — ne regardent pas
  les adversaires et ne sont pas touchés.
*/
const { BOT_LEVELS } = await import('../packages/core/src/bots.ts')
const attendu = String(BOT_LEVELS.length)
/** Les chemins dont la phrase commence par un compte d'échelons. */
const cheminsBareme = reference.filter((chemin) =>
  /(^|\.)(vsComputerHint|levelsTitle|vsComputerDetail)$/.test(chemin),
)

for (const langue of LANGUES) {
  const dictionnaire =
    langue.code === 'fr' ? fr : langue.code === 'en' ? en : (TRADUCTIONS[langue.code] ?? {})

  for (const chemin of cheminsBareme) {
    const valeur = lire(dictionnaire, chemin)
    if (valeur === undefined) continue
    // Le premier nombre de ces phrases est le compte d'échelons ; le suivant,
    // quand il existe, est le nombre de personnalités.
    const premier = valeur.match(/(?<![0-9])\d{1,3}(?![0-9])/)
    if (!premier || premier[0] === attendu) continue
    erreurs++
    console.error(
      `  ✗ ${langue.code} — ${chemin} annonce « ${premier[0]} » adversaires, il y en a ${attendu}`,
    )
  }
}

if (erreurs > 0) {
  console.error(`\n❌  ${erreurs} problème${erreurs > 1 ? 's' : ''} dans les dictionnaires.\n`)
  process.exit(1)
}

console.log('\n✅  Dictionnaires cohérents : aucune clé inventée, aucune valeur vide.\n')
