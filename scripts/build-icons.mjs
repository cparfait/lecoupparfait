#!/usr/bin/env node
/**
 * Compose la marque, puis en tire les icônes de l'application.
 *
 * La marque n'est pas un fichier qu'on dessine : elle est **assemblée** ici, à
 * partir du tirage de la bannière du thème `club` — `brand/cavale-club.png`, le
 * cavalier de bois sculpté produit par `scripts/build-cavale.mjs`. On le
 * détoure au plus près, on le pose sur le champ violet de la marque, et le
 * résultat est écrit dans `brand/logo-cavale.png`.
 *
 * Deux approches ont précédé celle-ci, et chacune a échoué à sa façon :
 *
 *  1. **Vectoriser.** Relever le contour alpha d'un rendu, le simplifier, le
 *     remplir d'un dégradé. Net à toute taille et teintable par thème — et
 *     bosselé, l'arête dorsale se lisant comme un liseré autour de la pièce.
 *     Une sculpture éclairée ne se réduit pas à une silhouette sans perdre ce
 *     qui la rendait belle.
 *  2. **Retirer une image dédiée.** Demander au modèle une icône complète,
 *     pavé compris. Six pistes, trois passes — le modèle photographiait
 *     l'icône au lieu de la dessiner, ajoutait des cornes de licorne, dérivait
 *     vers le profil grec. On a fini par obtenir une belle pièce, mais une
 *     autre que celle de la bannière.
 *
 * Réutiliser le tirage de la bannière règle les deux problèmes d'un coup : la
 * marque et le personnage sont la même image, au pixel près, et il n'y a plus
 * rien à faire converger.
 *
 * Les coins sont arrondis ici, au masque, plutôt que dessinés dans l'image :
 * un arrondi approximatif se voit immédiatement sur une icône.
 *
 * L'icône « maskable » réserve une marge de sécurité de 10 % sur chaque bord :
 * Android recadre les icônes en cercle, en carré arrondi ou en goutte selon le
 * lanceur, et sans cette marge le cavalier se ferait rogner.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const iconsDir = join(root, 'apps', 'web', 'public', 'icons')

mkdirSync(iconsDir, { recursive: true })
const brandDir = join(root, 'apps', 'web', 'public', 'brand')
const marque = join(brandDir, 'logo-cavale.png')

// ─────────────────────────────────────────────────────────────────────────────
//  La marque : le cavalier de la bannière, posé sur le champ violet
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Le champ : noir, et cerné d'accent.
 *
 * C'était un dégradé violet. Une icône violette sur l'écran d'accueil d'un
 * téléphone se noie dans la moitié des autres, et dans l'application elle
 * donnait une pastille violette dans un en-tête violet — la marque disparaissait
 * dans son propre habillage. Le noir, lui, ne ressemble à rien d'autre et fait
 * ressortir le buis, qui est ce qu'on veut voir.
 *
 * L'anneau porte la couleur d'accent du thème par défaut. Il n'est pas
 * décoratif : sur un fond sombre, une icône à fond noir sans contour n'a plus
 * de bord du tout et se confond avec l'écran.
 */
const NOIR = '#08070d'
const ACCENT = '#7C5CFF'

const CHAMP = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">' +
    `<rect width="1024" height="1024" fill="${NOIR}"/>` +
    `<rect x="8" y="8" width="1008" height="1008" rx="216" ry="216" fill="none" ` +
    `stroke="${ACCENT}" stroke-opacity="0.75" stroke-width="16"/></svg>`,
)

/**
 * 6 % de marge, et pas davantage.
 *
 * C'est le réglage qui décide de la lisibilité à seize pixels : à 14 %, la
 * pièce flotte au milieu d'un carré violet et n'est plus qu'une tache brune ;
 * à 6 %, elle occupe l'icône et sa silhouette reste lisible dans un onglet.
 */
const MARGE = 0.06

// `trim` retire les bords transparents du tirage : `build-cavale.mjs` recadre
// déjà au plus près, mais la réserve qu'il laisse s'ajouterait à la nôtre.
const pieceNette = sharp(join(brandDir, 'cavale-club.png')).trim({
  background: { r: 0, g: 0, b: 0, alpha: 0 },
  threshold: 0,
})

/** La marque à 1024, avec la marge demandée autour de la pièce. */
const composerMarque = async (marge) => {
  const cote = Math.round(1024 * (1 - marge * 2))
  const piece = await pieceNette
    .clone()
    .resize({ width: cote, height: cote, fit: 'inside' })
    .png()
    .toBuffer()
  // Ancrée en bas, et centrée horizontalement : un cavalier d'échecs repose sur
  // sa base. Le faire flotter au milieu du carré lui retire son socle, et c'est
  // le socle qui dit qu'il s'agit d'une pièce de jeu.
  const { width, height } = await sharp(piece).metadata()
  return sharp(CHAMP).composite([
    {
      input: piece,
      left: Math.round((1024 - width) / 2),
      top: Math.max(0, 1024 - Math.round(1024 * marge) - height),
    },
  ])
}

await (await composerMarque(MARGE)).png({ compressionLevel: 9 }).toFile(marque)
console.log('  ✓ brand/logo-cavale.png')

/** Le masque d'arrondi, au rayon de 22 % — celui d'une icône d'application. */
const arrondi = (taille) =>
  Buffer.from(
    `<svg width="${taille}" height="${taille}"><rect width="${taille}" height="${taille}" ` +
      `rx="${Math.round(taille * 0.22)}" ry="${Math.round(taille * 0.22)}" fill="#fff"/></svg>`,
  )

/** Redimensionne la marque et lui découpe ses coins. */
const icone = (taille) =>
  sharp(marque)
    .resize(taille, taille)
    .composite([{ input: arrondi(taille), blend: 'dest-in' }])
    .png({ compressionLevel: 9 })

const SIZES = [192, 512]

for (const size of SIZES) {
  await icone(size).toFile(join(iconsDir, `icon-${size}.png`))
  console.log(`  ✓ icon-${size}.png`)
}

// Version « maskable » : mêmes ingrédients, plus de marge.
//
// On la recompose depuis la pièce plutôt que de rétrécir la marque finie sur un
// fond ajouté. Toutes les tentatives dans ce sens ont laissé un raccord visible
// — un violet écrit en dur ne tombe jamais sur celui du champ, une couleur
// prélevée au coin non plus, et une copie floutée ne raccorde que si le fond
// varie. Repartir du même dégradé est la seule façon de n'avoir aucun bord :
// il n'y a plus deux fonds à faire coïncider, il n'y en a qu'un.
//
// En deux passes, et c'est imposé par `sharp` : il applique ses opérations dans
// un ordre fixe — redimensionner d'abord, composer ensuite — quel que soit
// l'ordre d'écriture. Enchaîner `.composite().resize(512)` réduisait donc le
// champ à 512 px avant d'y coller une pièce de 655, et la bibliothèque
// refusait la composition.
const maskable = await (await composerMarque(0.18)).png().toBuffer()
await sharp(maskable)
  .resize(512, 512)
  .png({ compressionLevel: 9 })
  .toFile(join(iconsDir, 'icon-maskable-512.png'))
console.log('  ✓ icon-maskable-512.png')

// Favicon classique, pour les onglets et les vieux agrégateurs.
await icone(32).toFile(join(root, 'apps', 'web', 'public', 'favicon.png'))
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
