#!/usr/bin/env node
/**
 * Génère les icônes PNG de l'application à partir de l'icône vectorielle.
 *
 * Les navigateurs et systèmes d'exploitation réclament encore des PNG à taille
 * fixe pour l'écran d'accueil, même quand un SVG est fourni. On les produit donc
 * ici plutôt que de versionner des binaires.
 *
 * L'icône « maskable » réserve une marge de sécurité de 10 % sur chaque bord :
 * Android recadre les icônes en cercle, en carré arrondi ou en goutte selon le
 * lanceur, et sans cette marge le cavalier se ferait rogner.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const iconsDir = join(root, 'apps', 'web', 'public', 'icons')

mkdirSync(iconsDir, { recursive: true })
const svg = readFileSync(join(iconsDir, 'icon.svg'))

const SIZES = [192, 512]

for (const size of SIZES) {
  await sharp(svg, { density: 400 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(join(iconsDir, `icon-${size}.png`))
  console.log(`  ✓ icon-${size}.png`)
}

// Version « maskable » : l'illustration occupe 80 % du cadre, le reste est une
// marge de la couleur de fond.
const inner = Math.round(512 * 0.8)
const padded = await sharp(svg, { density: 400 }).resize(inner, inner).png().toBuffer()
await sharp({
  create: {
    width: 512,
    height: 512,
    channels: 4,
    background: { r: 91, g: 60, b: 224, alpha: 1 },
  },
})
  .composite([{ input: padded, gravity: 'centre' }])
  .png({ compressionLevel: 9 })
  .toFile(join(iconsDir, 'icon-maskable-512.png'))
console.log('  ✓ icon-maskable-512.png')

// Favicon classique, pour les onglets et les vieux agrégateurs.
await sharp(svg, { density: 400 })
  .resize(32, 32)
  .png()
  .toFile(join(root, 'apps', 'web', 'public', 'favicon.png'))
console.log('  ✓ favicon.png')

// Image de partage sur les réseaux sociaux : format 1200 × 630 attendu partout.
const card = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0a12"/>
      <stop offset="60%" stop-color="#141026"/>
      <stop offset="100%" stop-color="#0d1f1b"/>
    </linearGradient>
    <radialGradient id="halo" cx="0.22" cy="0.3" r="0.6">
      <stop offset="0%" stop-color="#7C5CFF" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="#7C5CFF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="halo2" cx="0.85" cy="0.8" r="0.5">
      <stop offset="0%" stop-color="#00E5A8" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#00E5A8" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <rect width="1200" height="630" fill="url(#halo)"/>
  <rect width="1200" height="630" fill="url(#halo2)"/>
  <text x="90" y="290" font-family="Georgia, serif" font-size="86" font-weight="700" fill="#f2f1f8">Les échecs,</text>
  <text x="90" y="386" font-family="Georgia, serif" font-size="86" font-weight="700" fill="#9b83ff">enfin expliqués.</text>
  <text x="94" y="452" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="#a9a7bd">Le Coup Parfait — libre, gratuit, sans publicité</text>
</svg>`
await sharp(Buffer.from(card)).png().toFile(join(root, 'apps', 'web', 'public', 'og-image.png'))
console.log('  ✓ og-image.png')

writeFileSync(
  join(iconsDir, 'README.md'),
  'Ces PNG sont engendrés depuis `icon.svg` par `node scripts/build-icons.mjs`.\nNe les modifie pas à la main : modifie le SVG et relance le script.\n',
)

console.log('\n✓ Icônes générées.')
