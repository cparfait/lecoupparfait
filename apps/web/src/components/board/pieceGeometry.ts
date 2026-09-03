/**
 * Modélisation procédurale des pièces en 3D.
 *
 * Aucun fichier de modèle à télécharger : chaque pièce est engendrée par
 * **révolution d'un profil** autour de son axe vertical — exactement la façon
 * dont on tourne une pièce d'échecs sur un tour à bois. Le résultat est net à
 * n'importe quelle échelle, pèse quelques kilo-octets, et se recolore
 * instantanément selon le thème.
 *
 * Seul le cavalier échappe à cette règle : sa tête de cheval n'a pas de symétrie
 * de révolution. Elle est donc extrudée depuis une silhouette 2D.
 *
 * Échelle : une case vaut 1 unité. Un pion mesure 0,62, un roi 1,12 — les
 * proportions Staunton réglementaires.
 */

import * as THREE from 'three'

export type Piece3DType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k'

/** Profil (rayon, hauteur) révolutionné autour de l'axe Y. */
type Profile = Array<[radius: number, height: number]>

/**
 * Socle commun à toutes les pièces : une base évasée, un léger congé, puis le
 * départ du fût. C'est ce qui donne l'unité visuelle du jeu.
 */
function base(radius: number, rise: number): Profile {
  return [
    [0, 0],
    [radius, 0],
    [radius, 0.028],
    [radius * 0.985, 0.045],
    [radius * 0.86, 0.075],
    [radius * 0.72, 0.1],
    [radius * 0.63, rise],
  ]
}

const PROFILES: Record<Piece3DType, Profile> = {
  // ── Pion : fût simple, tête sphérique ────────────────────────────────────
  p: [
    ...base(0.29, 0.13),
    [0.115, 0.2],
    [0.1, 0.29],
    [0.113, 0.34],
    [0.152, 0.365],
    [0.128, 0.395],
    [0.108, 0.415],
    [0.152, 0.45],
    [0.175, 0.5],
    [0.17, 0.55],
    [0.135, 0.598],
    [0.075, 0.625],
    [0, 0.638],
  ],

  // ── Tour : fût cylindrique, couronne évasée (créneaux ajoutés à part) ────
  r: [
    ...base(0.315, 0.15),
    [0.2, 0.22],
    [0.185, 0.4],
    [0.19, 0.47],
    [0.235, 0.5],
    [0.25, 0.53],
    [0.248, 0.62],
    [0.262, 0.66],
    [0.262, 0.7],
    [0.2, 0.7],
    [0.2, 0.66],
    [0, 0.66],
  ],

  // ── Fou : mitre fendue, surmontée d'un bouton ────────────────────────────
  b: [
    ...base(0.3, 0.14),
    [0.115, 0.22],
    [0.1, 0.33],
    [0.128, 0.38],
    [0.185, 0.405],
    [0.152, 0.43],
    [0.128, 0.45],
    [0.185, 0.5],
    [0.205, 0.56],
    [0.192, 0.63],
    [0.155, 0.7],
    [0.1, 0.755],
    [0.052, 0.79],
    [0.062, 0.812],
    [0.078, 0.835],
    [0.062, 0.86],
    [0, 0.872],
  ],

  // ── Cavalier : seul le socle est tourné, la tête est extrudée ────────────
  n: [
    ...base(0.3, 0.14),
    [0.155, 0.2],
    [0.145, 0.3],
    [0.16, 0.34],
    [0.185, 0.36],
    [0.155, 0.385],
    [0, 0.4],
  ],

  // ── Dame : couronne à créneaux fins, sommet en boule ─────────────────────
  q: [
    ...base(0.325, 0.16),
    [0.128, 0.25],
    [0.112, 0.38],
    [0.142, 0.44],
    [0.208, 0.47],
    [0.172, 0.5],
    [0.145, 0.53],
    [0.208, 0.58],
    [0.238, 0.65],
    [0.245, 0.73],
    [0.225, 0.79],
    [0.238, 0.825],
    [0.235, 0.855],
    [0.15, 0.875],
    [0.09, 0.9],
    [0.108, 0.925],
    [0.088, 0.952],
    [0, 0.962],
  ],

  // ── Roi : le plus haut, couronne large, croix ajoutée à part ─────────────
  k: [
    ...base(0.34, 0.17),
    [0.135, 0.26],
    [0.118, 0.4],
    [0.15, 0.46],
    [0.218, 0.49],
    [0.182, 0.52],
    [0.152, 0.555],
    [0.218, 0.61],
    [0.25, 0.69],
    [0.255, 0.78],
    [0.232, 0.845],
    [0.248, 0.882],
    [0.242, 0.912],
    [0.13, 0.932],
    [0.085, 0.95],
    [0, 0.955],
  ],
}

/** Hauteur totale de chaque pièce, utilisée pour l'ombre et la caméra. */
export const PIECE_HEIGHTS: Record<Piece3DType, number> = {
  p: 0.64,
  r: 0.72,
  n: 0.78,
  b: 0.87,
  q: 0.96,
  k: 1.12,
}

/**
 * Engendre la géométrie tournée d'une pièce.
 * @param segments finesse de la révolution ; 48 suffit visuellement, 24 en mode performance
 */
function latheOf(type: Piece3DType, segments: number): THREE.BufferGeometry {
  const points = PROFILES[type].map(([r, h]) => new THREE.Vector2(Math.max(r, 0.0001), h))
  const geometry = new THREE.LatheGeometry(points, segments)
  geometry.computeVertexNormals()
  return geometry
}

/** Créneaux de la tour : quatre blocs disposés en croix sur la couronne. */
function rookBattlements(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  const notch = new THREE.BoxGeometry(0.11, 0.075, 0.32)
  for (let i = 0; i < 2; i++) {
    const a = notch.clone()
    a.rotateY((i * Math.PI) / 2)
    a.translate(0, 0.7, 0)
    parts.push(a)
  }
  return mergeGeometries(parts)
}

/** Croix sommitale du roi. */
function kingCross(): THREE.BufferGeometry {
  const vertical = new THREE.BoxGeometry(0.052, 0.19, 0.052)
  vertical.translate(0, 1.045, 0)
  const horizontal = new THREE.BoxGeometry(0.13, 0.05, 0.052)
  horizontal.translate(0, 1.055, 0)
  return mergeGeometries([vertical, horizontal])
}

/** Pointes de la couronne de la dame. */
function queenSpikes(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  for (let i = 0; i < 8; i++) {
    const spike = new THREE.SphereGeometry(0.038, 8, 6)
    const angle = (i / 8) * Math.PI * 2
    spike.translate(Math.cos(angle) * 0.2, 0.87, Math.sin(angle) * 0.2)
    parts.push(spike)
  }
  return mergeGeometries(parts)
}

/** Fente caractéristique de la mitre du fou. */
function bishopSlit(): THREE.BufferGeometry {
  const slit = new THREE.BoxGeometry(0.035, 0.16, 0.42)
  slit.translate(0, 0.71, 0)
  return slit
}

/**
 * Silhouette de la tête de cavalier, extrudée dans l'épaisseur.
 *
 * Les points décrivent le profil vu de côté : museau, chanfrein, oreille,
 * encolure. C'est volontairement stylisé — un cheval anatomique se lirait mal
 * à la taille d'une case sur un téléphone.
 */
function knightHead(): THREE.BufferGeometry {
  const shape = new THREE.Shape()
  shape.moveTo(-0.2, 0.0) // arrière de l'encolure
  shape.lineTo(-0.15, 0.16)
  shape.lineTo(-0.17, 0.3)
  shape.quadraticCurveTo(-0.14, 0.4, -0.05, 0.42) // crinière
  shape.lineTo(-0.02, 0.36)
  shape.lineTo(0.03, 0.44) // oreille
  shape.lineTo(0.07, 0.34)
  shape.quadraticCurveTo(0.16, 0.33, 0.2, 0.25) // front
  shape.quadraticCurveTo(0.26, 0.18, 0.23, 0.1) // chanfrein
  shape.lineTo(0.2, 0.04)
  shape.quadraticCurveTo(0.12, 0.0, 0.05, 0.02) // museau et bouche
  shape.quadraticCurveTo(-0.05, 0.02, -0.1, -0.02)
  shape.lineTo(-0.2, 0.0)

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.2,
    bevelEnabled: true,
    bevelThickness: 0.022,
    bevelSize: 0.022,
    bevelSegments: 3,
    curveSegments: 12,
  })
  geometry.translate(0, 0.38, -0.1)
  geometry.computeVertexNormals()
  return geometry
}

/**
 * Fusionne plusieurs géométries en une seule.
 *
 * Réimplémenté ici plutôt qu'importé de `three/addons` : le module d'aide
 * n'est pas exposé de la même façon selon les empaqueteurs, et la fonction
 * tient en vingt lignes.
 */
function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = new THREE.BufferGeometry()
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []

  for (const geometry of geometries) {
    const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry
    const position = nonIndexed.getAttribute('position')
    const normal = nonIndexed.getAttribute('normal')
    const uv = nonIndexed.getAttribute('uv')

    for (let i = 0; i < position.count; i++) {
      positions.push(position.getX(i), position.getY(i), position.getZ(i))
      if (normal) normals.push(normal.getX(i), normal.getY(i), normal.getZ(i))
      if (uv) uvs.push(uv.getX(i), uv.getY(i))
      else uvs.push(0, 0)
    }
  }

  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  if (normals.length === positions.length) {
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  }
  merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  if (normals.length !== positions.length) merged.computeVertexNormals()
  return merged
}

/**
 * Géométrie complète d'une pièce : corps tourné plus ornements.
 * Les résultats sont mis en cache : douze géométries pour toute la partie.
 */
const cache = new Map<string, THREE.BufferGeometry>()

export function pieceGeometry(
  type: Piece3DType,
  quality: 'high' | 'low' = 'high',
): THREE.BufferGeometry {
  const key = `${type}-${quality}`
  const cached = cache.get(key)
  if (cached) return cached

  const segments = quality === 'high' ? 48 : 20
  const body = latheOf(type, segments)

  let geometry: THREE.BufferGeometry
  switch (type) {
    case 'r':
      geometry = mergeGeometries([body, rookBattlements()])
      break
    case 'k':
      geometry = mergeGeometries([body, kingCross()])
      break
    case 'q':
      geometry = mergeGeometries([body, queenSpikes()])
      break
    case 'b':
      geometry = quality === 'high' ? mergeGeometries([body, bishopSlit()]) : body
      break
    case 'n':
      geometry = mergeGeometries([body, knightHead()])
      break
    default:
      geometry = body
  }

  geometry.computeBoundingSphere()
  cache.set(key, geometry)
  return geometry
}

/** Libère les géométries en cache (changement de qualité, démontage). */
export function disposePieceGeometries(): void {
  for (const geometry of cache.values()) geometry.dispose()
  cache.clear()
}

// ─────────────────────────────────────────────────────────────────────────────
//  Matériaux
// ─────────────────────────────────────────────────────────────────────────────

export interface MaterialRecipe {
  roughness: number
  metalness: number
  clearcoat: number
  clearcoatRoughness: number
  transmission: number
  ior: number
  thickness: number
  /** Diffusion sous la surface, qui donne son aspect chaud à l'ivoire. */
  sheen: number
}

/**
 * Trois familles de matériaux, choisies dans les préférences.
 *
 * L'ivoire est légèrement translucide et très peu rugueux ; le marbre est mat
 * avec un vernis ; le verre transmet la lumière, ce qui suppose une scène
 * suffisamment éclairée pour que les pièces restent lisibles.
 */
export const MATERIALS: Record<string, MaterialRecipe> = {
  ivoire: {
    roughness: 0.32,
    metalness: 0.02,
    clearcoat: 0.55,
    clearcoatRoughness: 0.25,
    transmission: 0,
    ior: 1.45,
    thickness: 0,
    sheen: 0.35,
  },
  marbre: {
    roughness: 0.18,
    metalness: 0.04,
    clearcoat: 0.9,
    clearcoatRoughness: 0.08,
    transmission: 0,
    ior: 1.5,
    thickness: 0,
    sheen: 0.1,
  },
  verre: {
    roughness: 0.06,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    transmission: 0.82,
    ior: 1.52,
    thickness: 0.55,
    sheen: 0,
  },
}
