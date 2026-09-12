#!/usr/bin/env node
/**
 * Récupère les drapeaux des langues proposées.
 *
 * ── Pourquoi des images, et pas des émojis ──────────────────────────────────
 *
 * Le sélecteur de langue affichait `🇫🇷` et `🇬🇧`. Sur macOS, Android et iOS,
 * cela donne deux drapeaux ; sur **Windows**, cela donne « FR » et « GB » en
 * petites capitales, parce que le système n'embarque aucune police de drapeaux
 * et se rabat sur les lettres de code régional qui composent l'émoji. Vu du
 * lecteur, ce n'est pas un parti pris graphique, c'est un affichage cassé.
 *
 * ── Pourquoi les télécharger, et pas les servir d'ailleurs ─────────────────
 *
 * Même règle que les jeux de pièces et les bruitages : tout ce que l'application
 * affiche vient de son propre serveur. Un CDN verrait passer l'adresse de
 * chaque lecteur pour trente-six vignettes, ce qui contredirait la promesse du
 * projet — et ferait dépendre l'écran des réglages d'un tiers.
 *
 * La source est `flag-icons` de Panayiotis Lipiridis, sous licence MIT : des
 * SVG au format 4×3, un fichier par code ISO 3166-1 alpha-2.
 *
 * ── Facultatif, comme tous les téléchargements du projet ───────────────────
 *
 * Sans les fichiers, le sélecteur affiche une pastille de deux lettres au lieu
 * du drapeau, et rien d'autre ne change — voir le composant `Drapeau`. Le
 * script ne fait donc jamais échouer l'installation.
 *
 * Usage :  node scripts/fetch-drapeaux.mjs [--force]
 */

import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const destination = join(root, 'apps', 'web', 'public', 'drapeaux')
const force = process.argv.includes('--force')

const SOURCE = 'https://raw.githubusercontent.com/lipis/flag-icons/main/flags/4x3'

/**
 * La liste vient du registre des langues, pas d'une copie.
 *
 * Ajouter une langue avec un drapeau et oublier de le télécharger donnerait une
 * vignette cassée que personne ne verrait avant de choisir cette langue-là.
 */
const { DRAPEAUX_REQUIS } = await import('../apps/web/src/lib/i18n/langues.ts')

mkdirSync(destination, { recursive: true })

let recuperes = 0
let deja = 0
const manquants = []

for (const code of DRAPEAUX_REQUIS) {
  const fichier = join(destination, `${code}.svg`)
  if (existsSync(fichier) && !force) {
    deja++
    continue
  }

  try {
    const reponse = await fetch(`${SOURCE}/${code}.svg`)
    if (!reponse.ok) throw new Error(String(reponse.status))
    const svg = await reponse.text()

    // Un SVG doit commencer par du SVG. Sans ce contrôle, une page d'erreur
    // HTML se retrouverait enregistrée sous le nom d'un drapeau, et l'image
    // resterait invisible sans qu'on sache pourquoi.
    if (!svg.trimStart().startsWith('<svg')) throw new Error('réponse non SVG')

    writeFileSync(fichier, svg)
    recuperes++
  } catch (erreur) {
    manquants.push(`${code} (${erreur.message})`)
  }
}

console.log(`\n🏳️  Drapeaux — ${DRAPEAUX_REQUIS.length} demandés`)
if (deja > 0) console.log(`  · ${deja} déjà présents`)
if (recuperes > 0) console.log(`  ✓ ${recuperes} téléchargés`)
if (manquants.length > 0) {
  // Un avertissement, jamais une erreur : la pastille de deux lettres prend le
  // relais, et l'installation continue.
  console.warn(`  ! ${manquants.length} indisponibles : ${manquants.join(', ')}`)
  console.warn('    Ces langues afficheront leurs deux premières lettres à la place.')
}
console.log('')
