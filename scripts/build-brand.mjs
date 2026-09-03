#!/usr/bin/env node
/**
 * Convertit les images de marque en WebP, à la taille réellement affichée.
 *
 * **Le problème.** `public/brand` pesait 12 Mo de PNG, embarqués tels quels
 * dans l'image Docker et servis tels quels à chaque visiteur. Les sept
 * portraits d'adversaires en faisaient six à eux seuls — des tirages de 536 ×
 * 960, affichés à quarante-huit pixels de haut. On envoyait quatre-vingt-dix
 * mille pixels pour en montrer deux mille.
 *
 * **Ce qu'on fait.** Les sources restent des PNG en pleine résolution, mais
 * hors du dépôt : `data/brand-sources/`, que `.gitignore` couvre. Ce script en
 * tire des WebP à deux fois la taille d'affichage — l'écran Retina, et rien
 * de plus.
 *
 * **Pourquoi un script et pas `next/image`.** Le composant optimise à la
 * demande, en mémoire, à chaque déploiement neuf ; ici la source ne change
 * jamais, et la conversion à la construction donne un fichier qu'on peut
 * servir depuis n'importe où, y compris un cache d'un an. `next/image` reste
 * utilisé pour l'affichage, avec ces WebP en entrée.
 *
 * Usage :  node scripts/build-brand.mjs
 */

import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCES = join(racine, 'data', 'brand-sources')
const SORTIE = join(racine, 'apps', 'web', 'public', 'brand')

/**
 * Largeur de sortie, par image.
 *
 * Deux fois la taille d'affichage la plus grande, pour les écrans à forte
 * densité. Au-delà, on paie des octets que personne ne voit.
 */
const LARGEURS = {
  // Les portraits d'adversaires s'affichent au plus à 56 px de haut, soit
  // environ 31 px de large au format de la sculpture.
  'adversaires/fonceur': 128,
  'adversaires/gambiteur': 128,
  'adversaires/machine': 128,
  'adversaires/novice': 128,
  'adversaires/positionnel': 128,
  'adversaires/prudent': 128,
  'adversaires/tacticien': 128,
  // La tuile de la relecture guidée : 56 px, demandée à 128 par `next/image`.
  'logo-cavale': 256,
  // Le logo de l'en-tête : 32 px.
  'cavale-piece': 128,
  // La sculpture de la bannière d'accueil : 40 % d'une bannière large, soit
  // ~600 px sur un grand écran. C'est la seule qui mérite d'être grande.
  'cavale-aurora': 1200,
  'cavale-clair': 1200,
  'cavale-club': 1200,
  'cavale-contraste': 1200,
}

if (!existsSync(SOURCES)) {
  console.error(`✗ Sources introuvables : ${SOURCES}`)
  console.error('  Elles sont hors du dépôt — voir ATTRIBUTION.md.')
  process.exit(1)
}

function* png(dossier, prefixe = '') {
  for (const entree of readdirSync(dossier)) {
    const chemin = join(dossier, entree)
    if (statSync(chemin).isDirectory()) {
      yield* png(chemin, `${prefixe}${entree}/`)
      continue
    }
    if (entree.endsWith('.png')) yield [`${prefixe}${entree.slice(0, -4)}`, chemin]
  }
}

let avant = 0
let apres = 0

for (const [nom, source] of png(SOURCES)) {
  const largeur = LARGEURS[nom]
  if (!largeur) {
    console.warn(`  ⚠ ${nom} : aucune largeur déclarée, ignoré`)
    continue
  }

  const destination = join(SORTIE, `${nom}.webp`)
  mkdirSync(dirname(destination), { recursive: true })

  // `withoutEnlargement` : si la source est déjà plus petite que la cible, on
  // ne l'agrandit pas — agrandir n'ajoute aucune information et coûte des
  // octets.
  await sharp(source)
    .resize({ width: largeur, withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toFile(destination)

  const poidsAvant = statSync(source).size
  const poidsApres = statSync(destination).size
  avant += poidsAvant
  apres += poidsApres

  const ko = (octets) => `${Math.round(octets / 1024)} ko`
  console.log(`  ✓ ${nom.padEnd(24)} ${ko(poidsAvant).padStart(8)} → ${ko(poidsApres).padStart(7)}`)
}

const mo = (octets) => `${(octets / 1024 / 1024).toFixed(1)} Mo`
console.log(
  `\n✓ ${mo(avant)} → ${mo(apres)} (${Math.round((1 - apres / avant) * 100)} % de moins)\n`,
)
