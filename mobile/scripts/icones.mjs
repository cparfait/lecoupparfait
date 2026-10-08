#!/usr/bin/env node
/**
 * Les icônes de l'appli Android, tirées des mêmes sources que celles du site.
 *
 * Android ne se contente pas d'une image carrée. Depuis la version 8, une
 * icône est faite de deux calques de 108 dp — un fond, une pièce — que chaque
 * lanceur découpe à sa façon : cercle sur un Pixel, carré arrondi ailleurs,
 * goutte chez d'autres. Seuls les 72 dp du centre sont garantis visibles, et
 * moins encore sous un masque rond. L'icône « maskable » du site, posée telle
 * quelle, y perdait les oreilles et le socle du cavalier.
 *
 * On recompose donc :
 *  - un fond uni, le noir de l'icône du site ;
 *  - le cavalier détouré, centré, haut de 52 % du calque : coins de sa boîte
 *    compris, il tient dans le cercle de 72 dp ;
 *  - sa silhouette en blanc, que les icônes à thème d'Android 13 teintent ;
 *  - pour Android 7, qui ne connaît pas les calques, l'icône du site en carré
 *    arrondi et une variante ronde.
 *
 * À relancer seulement si la marque change : les PNG produits sont versionnés.
 *   node mobile/scripts/icones.mjs
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ici = dirname(fileURLToPath(import.meta.url))
const racine = resolve(ici, '..', '..')
const res = join(racine, 'mobile', 'android', 'app', 'src', 'main', 'res')

/** Le noir et l'accent de `scripts/build-icons.mjs`, pour que les deux icônes se confondent. */
const NOIR = '#08070d'
const ACCENT = '#7C5CFF'

/**
 * Le cavalier détouré en pleine résolution, sinon sa copie WebP du dépôt.
 *
 * Les sources de la marque vivent hors du dépôt (`data/brand-sources/`, voir
 * ATTRIBUTION.md). La copie servie par le site suffit à 206 pixels de haut,
 * soit la densité la plus forte : elle sert de repli sur une machine qui n'a
 * pas les sources.
 */
const PIECE = [
  join(racine, 'data', 'brand-sources', 'cavale-piece.png'),
  join(racine, 'apps', 'web', 'public', 'brand', 'cavale-piece.webp'),
].find((chemin) => existsSync(chemin))
const ICONE_SITE = join(racine, 'apps', 'web', 'public', 'icons', 'icon-512.png')

const DENSITES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }

/** Part de la hauteur du calque de 108 dp occupée par le cavalier. */
const HAUTEUR_PIECE = 0.52

async function pieceCentree(cote) {
  const hauteur = Math.round(cote * HAUTEUR_PIECE)
  const piece = await sharp(PIECE).resize({ height: hauteur }).png().toBuffer()
  return sharp({
    create: { width: cote, height: cote, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: piece, gravity: 'centre' }])
    .png()
}

/** La silhouette en blanc : seule l'opacité compte pour une icône à thème. */
async function silhouette(cote) {
  const hauteur = Math.round(cote * HAUTEUR_PIECE)
  const alpha = await sharp(PIECE)
    .resize({ height: hauteur })
    .ensureAlpha()
    .extractChannel('alpha')
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width, height } = alpha.info
  const blanc = await sharp({
    create: { width, height, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .joinChannel(alpha.data, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer()
  return sharp({
    create: { width: cote, height: cote, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: blanc, gravity: 'centre' }])
    .png()
}

async function iconeRonde(cote) {
  const anneau = Math.max(1, Math.round(cote / 64))
  const champ = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cote}" height="${cote}">` +
      `<circle cx="${cote / 2}" cy="${cote / 2}" r="${cote / 2}" fill="${NOIR}"/>` +
      `<circle cx="${cote / 2}" cy="${cote / 2}" r="${cote / 2 - anneau}" fill="none" ` +
      `stroke="${ACCENT}" stroke-opacity="0.75" stroke-width="${anneau}"/></svg>`,
  )
  const piece = await sharp(PIECE)
    .resize({ height: Math.round(cote * 0.68) })
    .png()
    .toBuffer()
  return sharp(champ)
    .composite([{ input: piece, gravity: 'centre' }])
    .png()
}

if (!PIECE) {
  console.error('✗ Cavalier détouré introuvable (cavale-piece.png ou .webp).')
  process.exit(1)
}

for (const [densite, facteur] of Object.entries(DENSITES)) {
  const dossier = join(res, `mipmap-${densite}`)
  mkdirSync(dossier, { recursive: true })
  const calque = Math.round(108 * facteur)
  const legacy = Math.round(48 * facteur)

  await (await pieceCentree(calque)).toFile(join(dossier, 'ic_launcher_foreground.png'))
  await (await silhouette(calque)).toFile(join(dossier, 'ic_launcher_monochrome.png'))
  await sharp(ICONE_SITE).resize(legacy).png().toFile(join(dossier, 'ic_launcher.png'))
  await (await iconeRonde(legacy)).toFile(join(dossier, 'ic_launcher_round.png'))
}

const adaptative = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome" />
</adaptive-icon>
`
writeFileSync(join(res, 'mipmap-anydpi-v26', 'ic_launcher.xml'), adaptative)
writeFileSync(join(res, 'mipmap-anydpi-v26', 'ic_launcher_round.xml'), adaptative)
writeFileSync(
  join(res, 'values', 'ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${NOIR}</color>
</resources>
`,
)

// Les images par défaut de Capacitor : un logo Capacitor en guise d'écran de
// démarrage, et un fond vectoriel qui n'est plus référencé.
for (const perime of [
  'drawable',
  'drawable-v24',
  ...Object.keys(DENSITES).flatMap((d) => [`drawable-land-${d}`, `drawable-port-${d}`]),
]) {
  rmSync(join(res, perime), { recursive: true, force: true })
}

console.log(`✓ Icônes Android produites depuis ${PIECE}`)
