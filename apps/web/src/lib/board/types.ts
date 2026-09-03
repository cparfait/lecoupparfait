/**
 * Échiquiers électroniques — vocabulaire commun.
 *
 * Toutes les cartes du marché disent la même chose de trois façons
 * différentes : « voici ce qu'il y a sur les 64 cases ». Certaines connaissent
 * le type de chaque pièce (Chessnut, Millennium, DGT, Certabo), d'autres ne
 * savent que dire « occupée » ou « vide » (TabuTronic Sentio, ChessUp).
 *
 * On ramène donc tout à un seul type — {@link Occupancy} — et la logique
 * difficile (rapprocher deux photos successives avec les coups légaux) s'écrit
 * une fois pour toutes dans `matcher.ts`. Chaque protocole ne devient plus
 * qu'un décodeur d'une trentaine de lignes.
 */

/**
 * Contenu des 64 cases, dans l'ordre de lecture d'un FEN : `a8` en 0, `h1` en
 * 63.
 *
 * Chaque case vaut :
 *  - `null` — vide ;
 *  - une lettre FEN (`'P'`, `'n'`, …) — pièce identifiée, majuscule = Blancs ;
 *  - `'?'` — occupée par une pièce dont la carte ignore le type.
 */
export type Occupancy = readonly (string | null)[]

/** Case occupée par une pièce inconnue. */
export const UNKNOWN_PIECE = '?'

/** Les 64 cases, dans l'ordre de {@link Occupancy}. */
export const SQUARES: readonly string[] = (() => {
  const squares: string[] = []
  for (let rank = 8; rank >= 1; rank--) {
    for (const file of 'abcdefgh') squares.push(`${file}${rank}`)
  }
  return squares
})()

const INDEX_BY_SQUARE = new Map(SQUARES.map((square, index) => [square, index]))

/** Indice d'une case dans {@link Occupancy}, ou `-1` si le nom est invalide. */
export function squareIndex(square: string): number {
  return INDEX_BY_SQUARE.get(square) ?? -1
}

/** Colonne (0 = `a`) et rangée (1 = première rangée) d'une case. */
export function squareCoords(square: string): { file: number; rank: number } | null {
  const index = squareIndex(square)
  if (index < 0) return null
  return { file: index % 8, rank: 8 - Math.floor(index / 8) }
}

/**
 * Retourne la photo de 180°.
 *
 * Un joueur qui installe la carte dans l'autre sens ne fait rien d'anormal —
 * c'est même la situation normale quand on joue les Noirs sur une carte sans
 * repère. On détecte l'orientation à la connexion plutôt que de l'imposer.
 */
export function rotateOccupancy(occupancy: Occupancy): Occupancy {
  return [...occupancy].reverse()
}

// ─────────────────────────────────────────────────────────────────────────────
//  Pilotes
// ─────────────────────────────────────────────────────────────────────────────

export type BoardDriverId =
  'chessnut' | 'chessnut-usb' | 'millennium' | 'millennium-usb' | 'pegasus' | 'dgt' | 'certabo'

/** Le mécanisme du navigateur par lequel on parle à la carte. */
export type BoardTransport = 'bluetooth' | 'serial' | 'hid'

/** Une carte connectée. */
export interface PhysicalBoard {
  readonly driver: BoardDriverId
  /** Nom du modèle tel que la carte l'annonce, à défaut celui du pilote. */
  readonly label: string
  /** La carte sait-elle allumer des cases ? */
  readonly lights: boolean
  /** Photo de l'occupation des cases, à chaque changement. */
  onSnapshot(listener: (occupancy: Occupancy) => void): () => void
  /** Perte de la carte : câble débranché, extinction, Bluetooth coupé. */
  onClose(listener: (reason?: string) => void): () => void
  /**
   * Allume les cases indiquées, éteint les autres.
   *
   * Sans effet — et sans erreur — sur les cartes sans LEDs : l'appelant n'a
   * pas à savoir à quel modèle il parle.
   */
  setLights(squares: readonly string[]): void
  close(): Promise<void>
}

export interface BoardDriver {
  readonly id: BoardDriverId
  readonly label: string
  /** Modèles couverts, pour l'affichage dans le sélecteur. */
  readonly models: string
  readonly transport: BoardTransport
  /** Le navigateur expose-t-il l'API nécessaire ? */
  available(): boolean
  /**
   * Ouvre la carte. Doit être appelé depuis un geste de l'utilisateur : les
   * trois APIs concernées ouvrent un sélecteur de périphérique.
   */
  connect(): Promise<PhysicalBoard>
}

// ─────────────────────────────────────────────────────────────────────────────
//  Petite fabrique d'écouteurs
// ─────────────────────────────────────────────────────────────────────────────

export interface Emitter<T> {
  on(listener: (value: T) => void): () => void
  emit(value: T): void
  clear(): void
}

export function createEmitter<T>(): Emitter<T> {
  const listeners = new Set<(value: T) => void>()
  return {
    on(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    emit(value) {
      for (const listener of [...listeners]) listener(value)
    },
    clear() {
      listeners.clear()
    },
  }
}
