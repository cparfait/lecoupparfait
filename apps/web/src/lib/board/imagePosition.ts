'use client'

/**
 * Une position d'échecs, en image.
 *
 * On peut déjà exporter la partie analysée en PGN — un format que les autres
 * moteurs relisent. Restait ce qu'on partage vraiment : **la position**. Un
 * diagramme se colle dans un message, dans un devoir, dans une discussion de
 * club ; un PGN, non.
 *
 * L'image est dessinée ici plutôt que capturée à l'écran. Rasteriser le DOM
 * demanderait une bibliothèque de plus, produirait la barre de coordonnées, les
 * flèches d'analyse et les ombres du thème, et raterait les images SVG une fois
 * sur deux. Soixante-quatre rectangles et trente-deux dessins, c'est le travail
 * d'une trentaine de lignes, et l'on choisit exactement ce qui apparaît.
 *
 * Les couleurs sont celles de l'habillage choisi, et les pièces celles du jeu
 * choisi : l'image ressemble à l'échiquier qu'on avait sous les yeux, sinon
 * elle n'est pas *sa* position.
 */

import { Chess } from 'chess.js'
import type { Color } from 'chess.js'
import { BOARD_SKINS, pieceUrl } from '@/components/board/boardKit.ts'
import type { BoardStyleId } from '@/lib/store/preferences.ts'

/** Côté d'une case, en pixels d'image. 96 donne un carré de 768 px. */
const CASE = 96
/** Marge autour du damier, pour les coordonnées. */
const MARGE = 34

/**
 * Dessine la position et rend un PNG.
 *
 * Les SVG des pièces sont chargés en parallèle : sur un damier complet, les
 * charger l'un après l'autre ajoutait une seconde d'attente pour rien.
 */
export async function positionEnPng(options: {
  fen: string
  orientation?: Color
  habillage: BoardStyleId
  jeu: string
  /** Le coup à souligner, s'il y en a un. */
  dernierCoup?: { from: string; to: string } | null
  /** Écrit sous le damier : les noms, la date, ce qu'on veut. */
  legende?: string | null
}): Promise<Blob | null> {
  const skin = BOARD_SKINS[options.habillage] ?? BOARD_SKINS.aurore
  const orientation = options.orientation ?? 'w'

  const cote = CASE * 8
  const largeur = cote + MARGE * 2
  const hauteur = cote + MARGE * 2 + (options.legende ? 44 : 0)

  const canvas = document.createElement('canvas')
  canvas.width = largeur
  canvas.height = hauteur
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Fond : la couleur du cadre du damier, opaque. Une image transparente se
  // colle mal — dans un message clair, les pièces noires disparaissent.
  ctx.fillStyle = skin.dark
  ctx.fillRect(0, 0, largeur, hauteur)
  ctx.fillStyle = '#0000001a'
  ctx.fillRect(0, 0, largeur, hauteur)

  const colonnes = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  const rangees = ['8', '7', '6', '5', '4', '3', '2', '1']
  const ordreColonnes = orientation === 'w' ? colonnes : [...colonnes].reverse()
  const ordreRangees = orientation === 'w' ? rangees : [...rangees].reverse()

  const positionDe = (carre: string) => {
    const x = ordreColonnes.indexOf(carre[0]!)
    const y = ordreRangees.indexOf(carre[1]!)
    return { x: MARGE + x * CASE, y: MARGE + y * CASE }
  }

  // ── Le damier ─────────────────────────────────────────────────────────────
  for (let ligne = 0; ligne < 8; ligne++) {
    for (let colonne = 0; colonne < 8; colonne++) {
      const claire = (ligne + colonne) % 2 === 0
      ctx.fillStyle = claire ? skin.light : skin.dark
      ctx.fillRect(MARGE + colonne * CASE, MARGE + ligne * CASE, CASE, CASE)
    }
  }

  // Le dernier coup, s'il est connu : c'est ce qui rend un diagramme lisible
  // sans légende — on voit d'où ça vient et où ça va.
  if (options.dernierCoup) {
    ctx.fillStyle = skin.lastMove
    for (const carre of [options.dernierCoup.from, options.dernierCoup.to]) {
      const { x, y } = positionDe(carre)
      ctx.fillRect(x, y, CASE, CASE)
    }
  }

  // ── Les coordonnées ───────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  ctx.font = `600 ${Math.round(MARGE * 0.5)}px ui-sans-serif, system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ordreColonnes.forEach((lettre, index) => {
    ctx.fillText(lettre, MARGE + index * CASE + CASE / 2, MARGE + cote + MARGE / 2)
  })
  ordreRangees.forEach((chiffre, index) => {
    ctx.fillText(chiffre, MARGE / 2, MARGE + index * CASE + CASE / 2)
  })

  // ── Les pièces ────────────────────────────────────────────────────────────
  const board = new Chess(options.fen, { skipValidation: true })
  const aDessiner: Array<{ carre: string; url: string }> = []
  for (const rangee of board.board()) {
    for (const case_ of rangee) {
      if (!case_) continue
      aDessiner.push({ carre: case_.square, url: pieceUrl(options.jeu, case_.color, case_.type) })
    }
  }

  const images = await Promise.all(
    aDessiner.map(
      (piece) =>
        new Promise<{ carre: string; image: HTMLImageElement } | null>((resolve) => {
          const image = new Image()
          image.onload = () => resolve({ carre: piece.carre, image })
          // Une pièce manquante ne doit pas faire échouer toute l'image : on
          // rend le diagramme avec un trou plutôt que rien du tout.
          image.onerror = () => resolve(null)
          image.src = piece.url
        }),
    ),
  )

  for (const dessin of images) {
    if (!dessin) continue
    const { x, y } = positionDe(dessin.carre)
    ctx.drawImage(dessin.image, x, y, CASE, CASE)
  }

  // ── La légende ────────────────────────────────────────────────────────────
  if (options.legende) {
    ctx.fillStyle = 'rgba(255,255,255,0.86)'
    ctx.font = `500 ${Math.round(MARGE * 0.62)}px ui-sans-serif, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(options.legende, largeur / 2, cote + MARGE * 2 + 12)
  }

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'))
}

/** Propose le fichier au téléchargement, sous ce nom. */
export function telecharger(blob: Blob, nom: string): void {
  const url = URL.createObjectURL(blob)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = nom
  lien.click()
  URL.revokeObjectURL(url)
}
