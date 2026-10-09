/**
 * Les visuels de la fiche Play Store : l'icône et la bannière.
 *
 *   node scripts/fiche-play.mjs   →   play-store/icone-512.png
 *                                      play-store/banniere-1024x500.png
 *
 * L'icône du site ne convient pas telle quelle : elle porte ses coins arrondis
 * et son liseré violet, et Google applique lui-même son masque — on aurait
 * eu un arrondi dans un arrondi. Celle-ci est carrée, à fond plein, le
 * cavalier au centre.
 *
 * La bannière reprend l'image de partage du site (`og-image.png`) recadrée au
 * format de Google, avec le cavalier en pied sur la droite.
 */

import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const mobile = join(dirname(fileURLToPath(import.meta.url)), '..')
const racine = join(mobile, '..')
const sharp = createRequire(join(racine, 'apps', 'web', 'package.json'))('sharp')

const sortie = join(mobile, 'play-store')
mkdirSync(sortie, { recursive: true })

/** Le premier fichier qui existe : la source en pleine résolution, sinon la copie du site. */
function source(...chemins) {
  return chemins.find((chemin) => existsSync(chemin))
}
const PIECE = source(
  join(racine, 'data', 'brand-sources', 'cavale-piece.png'),
  join(racine, 'apps', 'web', 'public', 'brand', 'cavale-piece.webp'),
)
const PORTRAIT = source(
  join(racine, 'data', 'brand-sources', 'cavale-aurora.png'),
  join(racine, 'apps', 'web', 'public', 'brand', 'cavale-aurora.webp'),
)
const PARTAGE = join(racine, 'apps', 'web', 'public', 'og-image.png')

/** Le fond de l'icône du site, relevé dans `icons/icon-512.png`. */
const NOIR = { r: 8, g: 7, b: 13 }

// ── L'icône : 512 × 512, sans transparence ni arrondi ──
const cote = 512
const piece = await sharp(PIECE)
  .resize({ height: Math.round(cote * 0.8) })
  .png()
  .toBuffer()
await sharp({ create: { width: cote, height: cote, channels: 3, background: NOIR } })
  .composite([{ input: piece, gravity: 'centre' }])
  .png()
  .toFile(join(sortie, 'icone-512.png'))

// ── La bannière : 1024 × 500 ──
const largeur = 1024
const hauteur = 500
const fond = await sharp(PARTAGE)
  .resize({ width: largeur, height: hauteur, fit: 'cover', position: 'centre' })
  .toBuffer()
const cavalier = await sharp(PORTRAIT)
  .resize({ height: Math.round(hauteur * 0.92) })
  .png()
  .toBuffer()
const { width: largeurCavalier } = await sharp(cavalier).metadata()
await sharp(fond)
  .composite([
    {
      input: cavalier,
      top: hauteur - Math.round(hauteur * 0.92),
      left: largeur - largeurCavalier - 24,
    },
  ])
  .png()
  .toFile(join(sortie, 'banniere-1024x500.png'))

console.log(`✓ play-store/icone-512.png et play-store/banniere-1024x500.png`)
