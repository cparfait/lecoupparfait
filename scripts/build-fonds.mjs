#!/usr/bin/env node
/**
 * Génère les fonds d'ambiance des thèmes, via ComfyUI.
 *
 * Le fond de page était fait de dégradés : trois taches de couleur sur un
 * aplat sombre, et l'ensemble avait l'air austère. Une image donne de la
 * matière que des dégradés n'ont pas — des nuées, de la lumière qui traîne, un
 * échiquier deviné dans la brume. Elle se glisse **sous** les dégradés de
 * `.ambient-backdrop` (`--fond-image`, voir `globals.css`), qui restent
 * par-dessus pour que l'image appartienne au thème plutôt que de le remplacer.
 *
 *   node scripts/build-fonds.mjs                 # les trois thèmes
 *   node scripts/build-fonds.mjs --theme club
 *   node scripts/build-fonds.mjs --theme aurora --seed 7
 *   COMFY_URL=http://127.0.0.1:8188 node scripts/build-fonds.mjs
 *
 * Trois fonds et non quatre : le thème `contraste` existe pour la lisibilité,
 * et un fond, si doux soit-il, est du bruit derrière du texte.
 *
 * Ce qu'on demande au modèle, et ce qu'on lui interdit : un **arrière-plan**,
 * sans sujet, sans texte, sans pièce nette au premier plan. Tout ce qui se
 * lit distinctement dans un fond entre en concurrence avec la page posée
 * dessus. On veut de la lumière et de la matière, pas une illustration.
 *
 * Le tirage sort en 1536 × 864, ce qui suffit à un fond posé en `cover` et
 * flouté par ses propres nuées, et se convertit en WebP dans `public/fond/`.
 */

import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SORTIE = resolve(ROOT, 'apps/web/public/fond')
const COMFY = (process.env.COMFY_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '')

const MODELE = { ckpt: 'juggernautXL_ragnarokBy.safetensors' }
const LARGEUR = 1536
const HAUTEUR = 864

/**
 * Un fond par thème : la même consigne de composition, une palette et une
 * matière différentes. Les couleurs citées sont celles des jetons du thème,
 * pour que l'image et l'interface semblent éclairées par la même source.
 */
const THEMES = {
  aurora: {
    seed: 1851,
    texte: [
      'abstract atmospheric background, deep midnight indigo night sky,',
      'soft aurora borealis ribbons of violet purple and mint teal light drifting across the sky,',
      'a faint chessboard grid receding into mist at the bottom, barely visible, dissolving into darkness,',
      'volumetric haze, bokeh, subtle film grain, cinematic, wide shot,',
      'mostly dark with a few luminous accents, calm and elegant, no subject, no text',
    ].join(' '),
    // Les nuées prennent toute la place ; on éteint un peu pour le texte.
    assombrir: 0.82,
  },
  club: {
    seed: 1931,
    texte: [
      'abstract atmospheric background, dark smoked oak wood grain fading into shadow,',
      'warm amber light falling from above, out of frame, deep mahogany and brass tones,',
      'empty dark wood panelled wall, nothing on the table, everything heavily out of focus,',
      'thin smoke haze drifting through the warm light, subtle film grain, cinematic, wide empty shot,',
      'mostly dark warm browns with golden highlights, calm and elegant, empty room, no objects, no text',
    ].join(' '),
    assombrir: 0.8,
  },
  clair: {
    seed: 1972,
    texte: [
      'abstract minimal background, soft off-white paper, gentle washes of pale lavender and mint,',
      'diffused daylight through a large window, soft gradients, watercolour bleed,',
      'a faint pale chessboard pattern dissolving into white at the bottom, barely visible,',
      'airy, clean, high key, calm and elegant, very subtle, wide shot, no subject, no text',
    ].join(' '),
    // Un thème clair s'éclaircit plutôt qu'il ne s'assombrit : on pousse
    // l'image vers le blanc pour que l'encre reste lisible.
    eclaircir: 0.28,
  },
}

/**
 * Ce qu'on refuse dans un fond : tout ce qui se regarde pour lui-même. Une
 * pièce nette, une main, un visage, une lettre — chacun tirerait l'œil hors
 * de la page.
 */
const NEGATIF = [
  'text, letters, watermark, logo, signature, chess pieces, lamp, table, furniture, objects, sharp objects, people, hands,',
  'faces, figure, character, busy, cluttered, high contrast, oversaturated, cartoon, illustration,',
  'frame, border, vignette lines, jpeg artifacts, blurry text',
].join(' ')

function graphe({ seed, texte }) {
  return {
    modele: { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: MODELE.ckpt } },
    positif: { class_type: 'CLIPTextEncode', inputs: { text: texte, clip: ['modele', 1] } },
    negatif: { class_type: 'CLIPTextEncode', inputs: { text: NEGATIF, clip: ['modele', 1] } },
    latent: {
      class_type: 'EmptyLatentImage',
      inputs: { width: LARGEUR, height: HAUTEUR, batch_size: 1 },
    },
    echantillon: {
      class_type: 'KSampler',
      inputs: {
        model: ['modele', 0],
        seed,
        steps: 30,
        // Guidage lâche, volontairement : un fond n'a pas de consigne de
        // matière à tenir, et un guidage ferme durcit les dégradés.
        cfg: 5,
        sampler_name: 'dpmpp_2m',
        scheduler: 'karras',
        positive: ['positif', 0],
        negative: ['negatif', 0],
        latent_image: ['latent', 0],
        denoise: 1,
      },
    },
    decode: {
      class_type: 'VAEDecode',
      inputs: { samples: ['echantillon', 0], vae: ['modele', 2] },
    },
    sortie: { class_type: 'SaveImage', inputs: { images: ['decode', 0], filename_prefix: 'fond' } },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Dialogue avec ComfyUI — même mécanique que `build-cavale.mjs`
// ─────────────────────────────────────────────────────────────────────────────

async function api(chemin, options) {
  const reponse = await fetch(`${COMFY}${chemin}`, options)
  if (!reponse.ok) {
    throw new Error(`${chemin} → ${reponse.status} ${reponse.statusText}\n${await reponse.text()}`)
  }
  return reponse
}

async function soumettre(prompt) {
  const reponse = await api('/prompt', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, client_id: 'build-fonds' }),
  })
  const { prompt_id: id, node_errors: erreurs } = await reponse.json()
  if (erreurs && Object.keys(erreurs).length > 0) {
    throw new Error(`ComfyUI refuse le graphe :\n${JSON.stringify(erreurs, null, 2)}`)
  }
  return id
}

async function attendre(id, { timeoutMs = 10 * 60_000 } = {}) {
  const limite = Date.now() + timeoutMs
  let dernierPoint = 0
  while (Date.now() < limite) {
    const historique = await (await api(`/history/${id}`)).json()
    const tache = historique[id]
    if (tache) {
      const statut = tache.status ?? {}
      if (statut.status_str === 'error' || statut.completed === false) {
        const message = (statut.messages ?? [])
          .filter(([type]) => type === 'execution_error')
          .map(([, detail]) => `${detail.node_type} : ${detail.exception_message}`)
          .join('\n')
        throw new Error(message || 'ComfyUI a interrompu la tâche.')
      }
      if (statut.completed) return tache
    }
    if (Date.now() - dernierPoint > 5_000) {
      process.stdout.write('.')
      dernierPoint = Date.now()
    }
    await new Promise((r) => setTimeout(r, 1_000))
  }
  throw new Error(`Toujours rien après ${Math.round(timeoutMs / 60_000)} minutes — tâche ${id}.`)
}

async function recuperer(tache) {
  const images = Object.values(tache.outputs ?? {}).flatMap((sortie) => sortie.images ?? [])
  const image = images.at(-1)
  if (!image) throw new Error("La tâche s'est terminée sans produire d'image.")
  const requete = new URLSearchParams({
    filename: image.filename,
    subfolder: image.subfolder ?? '',
    type: image.type ?? 'output',
  })
  return Buffer.from(await (await api(`/view?${requete}`)).arrayBuffer())
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Du PNG de ComfyUI au WebP posé dans `public/fond/`.
 *
 * L'image est légèrement floutée : ce qui reste de net dans un fond — un
 * grain, une arête — se voit à travers le verre des cartes et fait vibrer le
 * texte. Puis assombrie ou éclaircie selon le thème, pour que la page reste
 * lisible sans que le CSS ait à poser un voile de plus.
 */
async function enregistrer(nom, png, { assombrir, eclaircir }) {
  await mkdir(SORTIE, { recursive: true })
  let image = sharp(png).blur(1.2)
  if (assombrir) image = image.modulate({ brightness: assombrir })
  if (eclaircir) {
    image = image.composite([
      {
        input: {
          create: {
            width: LARGEUR,
            height: HAUTEUR,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: eclaircir },
          },
        },
        blend: 'over',
      },
    ])
  }
  const destination = resolve(SORTIE, `${nom}.webp`)
  const resultat = await image.webp({ quality: 74, effort: 6 }).toFile(destination)
  return { destination, taille: resultat.size }
}

function lireOptions(argv) {
  const valeur = (nom) => {
    const index = argv.indexOf(nom)
    return index === -1 ? undefined : argv[index + 1]
  }
  return { theme: valeur('--theme'), seed: valeur('--seed') }
}

async function main() {
  const options = lireOptions(process.argv.slice(2))
  const noms = options.theme ? [options.theme] : Object.keys(THEMES)

  for (const nom of noms) {
    const theme = THEMES[nom]
    if (!theme) throw new Error(`Thème inconnu : ${nom}. Choix : ${Object.keys(THEMES).join(', ')}`)
    const seed = options.seed ? Number(options.seed) : theme.seed
    process.stdout.write(`${nom} (graine ${seed}) `)
    const id = await soumettre(graphe({ seed, texte: theme.texte }))
    const tache = await attendre(id)
    const png = await recuperer(tache)
    const { destination, taille } = await enregistrer(nom, png, theme)
    console.log(` → ${destination} (${Math.round(taille / 1024)} Ko)`)
  }
}

main().catch((erreur) => {
  console.error(erreur.message)
  process.exit(1)
})
