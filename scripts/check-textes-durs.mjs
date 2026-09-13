#!/usr/bin/env node
/**
 * Cherche les textes écrits en dur dans l'interface.
 *
 * Le chantier de traduction a duré trente-et-une passes, et il a buté deux fois
 * sur le même écueil : **on ne trouve pas ce qu'on cherche par des marques de
 * français**. Les premiers inventaires repéraient les accents et les mots-outils
 * — « le », « pour », « qui ». Ils ont laissé passer deux catégories entières :
 *
 *  1. les phrases dont l'expression régulière de lecture excluait par accident
 *     une lettre courante (une classe de caractères `[^'\\n]` retire aussi le
 *     « n »), soit la quasi-totalité des phrases ;
 *  2. les intitulés d'un seul mot sans accent — « Pause », « Menu », « Classement »
 *     —, qui ne ressemblent à rien de particulier, alors que ce sont précisément
 *     les textes qu'on lit le plus souvent : des boutons.
 *
 * Ce contrôle renverse donc la règle. Il ne cherche plus du français : il liste
 * **tout littéral posé à un endroit que quelqu'un lit** — `title`, `aria-label`,
 * `placeholder`, `label`, ou le texte nu entre deux balises — et laisse le tri à
 * la lecture. Il ne fait pas échouer la construction : la frontière entre un
 * intitulé à traduire et un nom propre (« Stockfish », « Groq », « CC BY-NC-SA »)
 * ne se décide pas par une règle. Il sert à ne plus jamais découvrir cent textes
 * oubliés.
 *
 * Ce qui est volontairement hors du périmètre :
 *
 *  - le **contenu rédactionnel** — leçons, glossaire, fiches d'ouvertures,
 *    principes, aide-mémoire d'arbitrage, explications. Il est écrit, pas
 *    traduit, et n'existe qu'en français et en anglais : voir `localeDuContenu` ;
 *  - les **amorces envoyées au modèle** (`lib/ia/prompts`, `contexte`, `relais`),
 *    qui ne sont pas de l'interface ;
 *  - les **métadonnées de page** (`layout.tsx`), produites côté serveur, qui ne
 *    connaît pas la langue choisie dans le navigateur ;
 *  - `global-error.tsx`, qui s'affiche hors du fournisseur de traduction.
 *
 * Usage :  node scripts/check-textes-durs.mjs
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'web', 'src')

const HORS = [
  'lib/lessons',
  'lib/glossaire',
  'lib/ouvertures/enjeux',
  'lib/credits',
  'lib/apprendre/principes',
  'lib/apprendre/palier',
  'lib/game/themesSeance',
  'lib/i18n',
  'lib/explications',
  'lib/ia/prompts',
  'lib/ia/contexte',
  'lib/ia/relais',
  'lib/speech',
  'app/outils/arbitrage',
  'app/global-error',
  'app/api',
]

/** Les attributs que quelqu'un lit, à l'œil ou à l'oreille. */
const ATTRIBUTS =
  /\b(title|aria-label|placeholder|label|description|hint|intro|titre|phrase|detail|texte|alt|blurb|note|consigne|libelle)=["']([^"'\n]{2,})["']/g

/** Le texte nu entre deux balises, sur une seule ligne. */
const TEXTE_EN_LIGNE = />\s*([A-ZÀ-ÿ][^<>{}\n]{1,})\s*</g

/**
 * Le texte nu seul sur sa ligne.
 *
 * C'est la forme qu'avaient presque tous les intitulés d'un mot : Prettier met
 * le contenu d'une balise sur sa propre ligne dès que les attributs débordent,
 * et le mot s'y retrouve sans aucun voisin qui le désigne comme du texte. On ne
 * le retient donc que si ses voisines le confirment — la ligne d'avant ferme une
 * balise ouvrante, celle d'après en ouvre une fermante.
 */
const TEXTE_SEUL = /^[ \t]*([A-ZÀ-ÿ][^<>{}\n,:;=]*[^\s<>{},:;=])[ \t]*$/

/**
 * Le texte collé à une interpolation.
 *
 * Troisième angle mort, et le plus coûteux des trois : `{n} jour{n > 1 ? 's' :
 * ''} d’affilée`. Aucun des deux motifs ci-dessus ne le voit — il n'est ni seul
 * sur sa ligne, ni précédé d'un chevron — et pourtant c'est du français écrit en
 * dur, avec en prime une règle de pluriel qui n'est celle d'aucune autre langue.
 * On retient donc ce qui sépare deux accolades, ou une accolade d'une balise.
 *
 * Réservé aux `.tsx` : dans un `.ts`, la même forme décrit une annotation de
 * type — `): Promise<void>` — et rien d'autre. La classe exclut par ailleurs la
 * ponctuation du code, pour la même raison.
 */
const TEXTE_COLLE = /[>}][ \t\n]*([^<>{}\n=:;()|$"'`]*[A-Za-zÀ-ÿ]{2,}[^<>{}\n=:;()|$"'`]*)[<{]/g

function textesNus(src) {
  const lignes = src.split('\n')
  const sortie = []
  for (let i = 0; i < lignes.length; i++) {
    const m = TEXTE_SEUL.exec(lignes[i])
    if (!m) continue
    const avant = (lignes[i - 1] ?? '').trimEnd()
    const apres = (lignes[i + 1] ?? '').trimStart()
    if (!avant.endsWith('>') || !apres.startsWith('</')) continue
    sortie.push(m[1])
  }
  return sortie
}

/** Les types de la bibliothèque standard, qui se lisent comme des mots. */
const TYPES = new Set([
  'Promise',
  'Record',
  'Array',
  'Object',
  'String',
  'Number',
  'Boolean',
  'Date',
  'Math',
  'Set',
  'Map',
  'React',
  'Partial',
  'Readonly',
  'Error',
])

/** Ce qui n'est pas une phrase : identifiants, nombres, sigles, symboles. */
const TECHNIQUE =
  /^(?:[a-z0-9_-]+|[\d .,:%+-]+|2D|3D|PGN|FEN|UCI|SAN|ELO|Elo|OK|SVG|USB|HID|CSS|JSON|GATT|npm|node|→|←|↑|↓|…)$/

function* fichiers(dossier) {
  for (const entree of readdirSync(dossier)) {
    const chemin = join(dossier, entree)
    if (statSync(chemin).isDirectory()) yield* fichiers(chemin)
    else if (/\.tsx?$/.test(entree)) yield chemin
  }
}

let total = 0
const parFichier = []

for (const chemin of fichiers(RACINE)) {
  const rel = chemin
    .slice(RACINE.length + 1)
    .split('\\')
    .join('/')
  if (HORS.some((h) => rel.startsWith(h))) continue
  if (rel.endsWith('layout.tsx')) continue

  // Les commentaires n'intéressent personne : le projet les écrit en français
  // par convention de maison, et ils ne s'affichent jamais.
  const src = readFileSync(chemin, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

  // `colle` marque les fragments venus de `TEXTE_COLLE`. Ils échappent au filtre
  // des identifiants : « jour » entre deux accolades est un mot de phrase, pas
  // un nom de variable — et c'est exactement la moitié qui manquait.
  const candidats = [...textesNus(src)].map((valeur) => [valeur, false])
  const motifs = [ATTRIBUTS, TEXTE_EN_LIGNE]
  if (rel.endsWith('.tsx')) motifs.push(TEXTE_COLLE)
  for (const motif of motifs) {
    motif.lastIndex = 0
    let m
    while ((m = motif.exec(src))) candidats.push([m[2] ?? m[1], motif === TEXTE_COLLE])
  }

  const trouves = new Set()
  for (const [brut, colle] of candidats) {
    const valeur = brut.trim()
    if (!valeur || TECHNIQUE.test(valeur)) continue
    if (valeur.startsWith('http') || valeur.startsWith('/') || valeur.includes('--')) continue
    if (!colle && /^[a-z][a-zA-Z]*$/.test(valeur)) continue
    // Du code et non du texte : un appel, une conjonction logique, une constante
    // en capitales, ou un type de la bibliothèque standard. Un mot capitalisé
    // seul, lui, est retenu : « Pause », « Menu », « Erreur » sont des boutons.
    if (/\(|&&|\|\||=>|\.[a-zA-Z]/.test(valeur)) continue
    if (/^[A-Z][A-Z_0-9]+$/.test(valeur)) continue
    if (TYPES.has(valeur)) continue
    trouves.add(valeur)
  }

  if (trouves.size) {
    total += trouves.size
    parFichier.push([rel, [...trouves]])
  }
}

parFichier.sort((a, b) => b[1].length - a[1].length)

for (const [rel, valeurs] of parFichier) {
  console.log(`\n  ${rel}`)
  for (const valeur of valeurs) console.log(`    · ${valeur.slice(0, 110)}`)
}

console.log(
  total === 0
    ? '\n✅  Aucun texte en dur dans l’interface.'
    : `\nℹ️   ${total} littéral(aux) à relire dans ${parFichier.length} fichier(s).` +
        '\n    Tous ne sont pas à traduire : un nom propre — « Stockfish », « Groq »,' +
        '\n    « CC BY-NC-SA » — reste écrit tel quel. Le contrôle ne tranche pas, il montre.',
)
