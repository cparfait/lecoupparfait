/**
 * Géométrie et habillage de l'échiquier.
 *
 * Un seul système de coordonnées pour les deux vues : la case `a1` est en
 * bas à gauche vue des Blancs. Tout le reste — position en pourcentage,
 * retournement, conversion pointeur → case — se déduit d'ici.
 */

import type { Color, Square } from 'chess.js'
import type { BoardStyleId } from '@/lib/store/preferences.ts'

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
export const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const

/** Colonne 0–7 depuis le nom de case. */
export function fileOf(square: Square): number {
  return square.charCodeAt(0) - 97
}

/** Rangée 0–7 depuis le nom de case (`a1` → 0). */
export function rankOf(square: Square): number {
  return square.charCodeAt(1) - 49
}

export function toSquare(file: number, rank: number): Square | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null
  return `${FILES[file]}${RANKS[rank]}` as Square
}

/**
 * Position d'une case en pourcentage du côté de l'échiquier.
 * `orientation` retourne le plateau : les Noirs voient `h8` en bas à gauche.
 */
export function squarePosition(
  square: Square,
  orientation: Color,
): { left: number; top: number } {
  const file = fileOf(square)
  const rank = rankOf(square)
  const x = orientation === 'w' ? file : 7 - file
  const y = orientation === 'w' ? 7 - rank : rank
  return { left: x * 12.5, top: y * 12.5 }
}

/** Case sous un point, exprimé en coordonnées relatives au conteneur (0–1). */
export function squareAt(
  x: number,
  y: number,
  orientation: Color,
): Square | null {
  if (x < 0 || x > 1 || y < 0 || y > 1) return null
  const column = Math.floor(x * 8)
  const row = Math.floor(y * 8)
  const file = orientation === 'w' ? column : 7 - column
  const rank = orientation === 'w' ? 7 - row : row
  return toSquare(file, rank)
}

/** Vrai si la case est claire. */
export function isLightSquare(square: Square): boolean {
  return (fileOf(square) + rankOf(square)) % 2 === 1
}

/** Cases dans l'ordre d'affichage, ligne par ligne. */
export function orderedSquares(orientation: Color): Square[] {
  const out: Square[] = []
  for (let row = 0; row < 8; row++) {
    for (let column = 0; column < 8; column++) {
      const file = orientation === 'w' ? column : 7 - column
      const rank = orientation === 'w' ? 7 - row : row
      const square = toSquare(file, rank)
      if (square) out.push(square)
    }
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
//  Habillages de damier
// ─────────────────────────────────────────────────────────────────────────────

export interface BoardSkin {
  light: string
  dark: string
  /** Texture optionnelle superposée aux cases sombres. */
  texture?: string
  /** Bordure du plateau. */
  frame: string
  /** Couleur des coordonnées sur case claire / sombre. */
  coordLight: string
  coordDark: string
  /**
   * Couleur des deux cases du dernier coup.
   *
   * Un vert dans tous les habillages, comme sur les grandes plateformes : c'est
   * le repère qu'on cherche en premier en revenant sur l'écran, il doit être le
   * même partout. Seule l'intensité s'ajuste au damier.
   */
  lastMove: string
  /** Surlignage de sélection. */
  selected: string
  /** Point indiquant un coup légal. */
  hint: string
  /** Anneau indiquant une capture possible. */
  capture: string
  /** Halo du roi en échec. */
  check: string
}

/**
 * Palettes de damier.
 *
 * Les couleurs de surlignage sont définies par habillage plutôt que globalement :
 * un jaune qui ressort sur du noyer disparaît sur du papier.
 */
export const BOARD_SKINS: Record<BoardStyleId, BoardSkin> = {
  aurore: {
    light: '#ded6ea',
    dark: '#655a86',
    frame: 'rgb(255 255 255 / 0.07)',
    coordLight: 'rgb(101 90 134 / 0.75)',
    coordDark: 'rgb(222 214 234 / 0.65)',
    lastMove: 'rgba(86, 205, 118, 0.42)',
    selected: 'rgba(0, 229, 168, 0.4)',
    hint: 'rgba(20, 16, 40, 0.28)',
    capture: 'rgba(255, 122, 89, 0.85)',
    check: 'rgba(229, 72, 77, 0.9)',
  },
  noyer: {
    light: '#e9dbc3',
    dark: '#9c6f43',
    texture:
      'repeating-linear-gradient(101deg, rgb(0 0 0 / 0.05) 0 2px, transparent 2px 7px)',
    frame: '#3d2c1b',
    coordLight: 'rgb(120 86 51 / 0.85)',
    coordDark: 'rgb(233 219 195 / 0.8)',
    lastMove: 'rgba(96, 190, 96, 0.46)',
    selected: 'rgba(122, 173, 118, 0.45)',
    hint: 'rgba(60, 40, 20, 0.26)',
    capture: 'rgba(176, 62, 44, 0.85)',
    check: 'rgba(190, 45, 40, 0.9)',
  },
  marbre: {
    light: '#eef1f5',
    dark: '#78818f',
    texture:
      'radial-gradient(60% 90% at 30% 20%, rgb(255 255 255 / 0.14), transparent 60%)',
    frame: 'rgb(120 129 143 / 0.5)',
    coordLight: 'rgb(120 129 143 / 0.85)',
    coordDark: 'rgb(238 241 245 / 0.85)',
    lastMove: 'rgba(90, 200, 120, 0.42)',
    selected: 'rgba(50, 180, 150, 0.4)',
    hint: 'rgba(40, 50, 65, 0.24)',
    capture: 'rgba(210, 80, 60, 0.85)',
    check: 'rgba(215, 60, 60, 0.9)',
  },
  ardoise: {
    light: '#cfd5da',
    dark: '#47555f',
    frame: 'rgb(71 85 95 / 0.6)',
    coordLight: 'rgb(71 85 95 / 0.85)',
    coordDark: 'rgb(207 213 218 / 0.85)',
    lastMove: 'rgba(110, 220, 140, 0.38)',
    selected: 'rgba(90, 230, 190, 0.38)',
    hint: 'rgba(20, 30, 38, 0.28)',
    capture: 'rgba(255, 120, 90, 0.85)',
    check: 'rgba(240, 70, 70, 0.9)',
  },
  mousse: {
    light: '#e9efd9',
    dark: '#6b8a4f',
    frame: 'rgb(107 138 79 / 0.55)',
    coordLight: 'rgb(93 118 70 / 0.85)',
    coordDark: 'rgb(233 239 217 / 0.85)',
    // Seule exception au vert : sur un damier déjà vert, un surlignage vert ne
    // se voit pas. C'est précisément pour cette raison que les plateformes au
    // damier vert surlignent en jaune.
    lastMove: 'rgba(255, 236, 90, 0.55)',
    selected: 'rgba(90, 190, 220, 0.4)',
    hint: 'rgba(40, 55, 30, 0.26)',
    capture: 'rgba(200, 80, 55, 0.85)',
    check: 'rgba(210, 60, 55, 0.9)',
  },
  papier: {
    light: '#f6f1e6',
    dark: '#c6b9a2',
    texture:
      'repeating-linear-gradient(45deg, rgb(0 0 0 / 0.02) 0 1px, transparent 1px 4px)',
    frame: 'rgb(198 185 162 / 0.7)',
    coordLight: 'rgb(150 135 110 / 0.9)',
    coordDark: 'rgb(90 78 60 / 0.7)',
    lastMove: 'rgba(96, 190, 120, 0.38)',
    selected: 'rgba(80, 175, 140, 0.38)',
    hint: 'rgba(80, 70, 55, 0.24)',
    capture: 'rgba(190, 80, 60, 0.8)',
    check: 'rgba(200, 60, 55, 0.85)',
  },
  neon: {
    light: '#232a42',
    dark: '#0e1224',
    texture:
      'linear-gradient(135deg, rgb(124 92 255 / 0.16), transparent 55%, rgb(0 229 168 / 0.14))',
    frame: 'rgb(124 92 255 / 0.35)',
    coordLight: 'rgb(150 165 220 / 0.8)',
    coordDark: 'rgb(120 135 190 / 0.8)',
    lastMove: 'rgba(80, 240, 150, 0.36)',
    selected: 'rgba(124, 92, 255, 0.5)',
    hint: 'rgba(180, 200, 255, 0.3)',
    capture: 'rgba(255, 90, 120, 0.85)',
    check: 'rgba(255, 60, 90, 0.95)',
  },
  sepia: {
    light: '#f2e5cf',
    dark: '#ab8760',
    frame: '#6b5136',
    coordLight: 'rgb(140 108 72 / 0.85)',
    coordDark: 'rgb(242 229 207 / 0.85)',
    lastMove: 'rgba(112, 178, 96, 0.48)',
    selected: 'rgba(140, 170, 120, 0.45)',
    hint: 'rgba(80, 58, 36, 0.26)',
    capture: 'rgba(180, 70, 50, 0.85)',
    check: 'rgba(195, 55, 45, 0.9)',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
//  Annotations
// ─────────────────────────────────────────────────────────────────────────────

export type AnnotationColor = 'green' | 'red' | 'blue' | 'orange' | 'accent'

export const ANNOTATION_COLORS: Record<AnnotationColor, string> = {
  green: '#21b96b',
  red: '#e5484d',
  blue: '#4a9eff',
  orange: '#f0870c',
  accent: 'var(--accent)',
}

export interface Arrow {
  from: Square
  to: Square
  color: AnnotationColor
  /** Épaisseur relative — les flèches du moteur sont plus fines. */
  weight?: 'thin' | 'normal' | 'bold'
  /** Étiquette affichée au bout de la flèche, ex. « +1.2 ». */
  label?: string
}

export interface CircleMark {
  square: Square
  color: AnnotationColor
}

/**
 * Coordonnées du centre d'une case dans le repère du SVG de superposition
 * (100 × 100, indépendant de la taille réelle du plateau).
 */
export function squareCentre(square: Square, orientation: Color): { x: number; y: number } {
  const { left, top } = squarePosition(square, orientation)
  return { x: left + 6.25, y: top + 6.25 }
}

/**
 * Trace une flèche de `from` vers `to`.
 *
 * Les coups de cavalier reçoivent un tracé coudé plutôt qu'une diagonale : c'est
 * ainsi qu'on les lit dans les livres, et cela évite de traverser des cases qui
 * n'ont rien à voir avec le coup.
 */
export function arrowPath(
  from: Square,
  to: Square,
  orientation: Color,
): { path: string; angle: number; tip: { x: number; y: number } } {
  const a = squareCentre(from, orientation)
  const b = squareCentre(to, orientation)

  const dx = Math.abs(fileOf(to) - fileOf(from))
  const dy = Math.abs(rankOf(to) - rankOf(from))
  const isKnightMove = (dx === 1 && dy === 2) || (dx === 2 && dy === 1)

  // Recule la pointe pour qu'elle affleure le bord de la case visée.
  const shorten = 3.4

  if (isKnightMove) {
    // Coude : on parcourt d'abord le grand côté, puis le petit.
    const corner =
      dx === 1
        ? { x: a.x, y: b.y }
        : { x: b.x, y: a.y }
    const angle = Math.atan2(b.y - corner.y, b.x - corner.x)
    const tip = {
      x: b.x - Math.cos(angle) * shorten,
      y: b.y - Math.sin(angle) * shorten,
    }
    return {
      path: `M ${a.x} ${a.y} L ${corner.x} ${corner.y} L ${tip.x} ${tip.y}`,
      angle: (angle * 180) / Math.PI,
      tip,
    }
  }

  const angle = Math.atan2(b.y - a.y, b.x - a.x)

  /**
   * Retrait proportionnel à la portée du coup.
   *
   * Les retraits étaient constants : 2,6 au départ et 3,4 à l'arrivée, soit six
   * unités sur les douze et demie que mesure une case. Sur un coup d'une seule
   * case il ne restait que six unités de trait, dont la pointe en dévorait la
   * moitié — un moignon, pas une flèche. On les proportionne donc, à taille
   * pleine dès deux cases parcourues.
   */
  const portee = Math.hypot(b.x - a.x, b.y - a.y)
  const facteur = Math.min(1, portee / 25)

  const start = {
    x: a.x + Math.cos(angle) * 2.6 * facteur,
    y: a.y + Math.sin(angle) * 2.6 * facteur,
  }
  const tip = {
    x: b.x - Math.cos(angle) * shorten * facteur,
    y: b.y - Math.sin(angle) * shorten * facteur,
  }
  return {
    path: `M ${start.x} ${start.y} L ${tip.x} ${tip.y}`,
    angle: (angle * 180) / Math.PI,
    tip,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Pièces
// ─────────────────────────────────────────────────────────────────────────────

/** Chemin du fichier SVG d'une pièce. */
export function pieceUrl(set: string, color: Color, type: string): string {
  return `/pieces/${set}/${color}${type.toUpperCase()}.svg`
}

/** Lit une FEN et retourne les pièces posées, avec une identité stable. */
export interface BoardPiece {
  /** Identifiant stable entre deux positions, pour animer le déplacement. */
  id: string
  square: Square
  color: Color
  type: string
}

/**
 * Convertit le champ « placement » d'une FEN en liste de pièces.
 *
 * L'identifiant est dérivé de la case : il suffit pour que React réutilise le
 * même nœud DOM tant que la pièce ne bouge pas. L'animation d'un déplacement est
 * gérée séparément, en connaissant le coup joué.
 */
export function piecesFromFen(fen: string): BoardPiece[] {
  const placement = fen.split(' ')[0] ?? ''
  const pieces: BoardPiece[] = []
  let rank = 7
  let file = 0

  for (const character of placement) {
    if (character === '/') {
      rank--
      file = 0
      continue
    }
    if (character >= '1' && character <= '8') {
      file += Number(character)
      continue
    }
    const square = toSquare(file, rank)
    if (square) {
      const color: Color = character === character.toUpperCase() ? 'w' : 'b'
      pieces.push({
        id: square,
        square,
        color,
        type: character.toLowerCase(),
      })
    }
    file++
  }
  return pieces
}
