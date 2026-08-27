'use client'

/**
 * Préférences de l'utilisateur.
 *
 * Tout est conservé côté navigateur : la plateforme est utilisable sans compte,
 * les réglages doivent donc survivre sans base de données. Les comptes
 * connectés synchronisent ensuite ce même objet côté serveur.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Notation } from '@coupparfait/core'
import type { Locale } from '../i18n/dictionary.ts'

export type ThemeId = 'aurora' | 'club' | 'clair' | 'contraste'
export type PieceSetId =
  | 'staunton'
  | 'merida'
  | 'alpha'
  | 'chessnut'
  | 'fantasy'
  | 'celtic'
  | 'spatial'
  | 'rhosgfx'
  | 'pixel'
  | 'letter'
export type BoardStyleId =
  | 'aurore'
  | 'noyer'
  | 'marbre'
  | 'ardoise'
  | 'mousse'
  | 'papier'
  | 'neon'
  | 'sepia'
export type BoardView = '2d' | '3d'
export type EffectsLevel = 'high' | 'low'
export type PieceMaterial = 'ivoire' | 'marbre' | 'verre'

/**
 * Couleurs des pièces en vue 3D.
 *
 * `theme` suit l'habillage du damier — c'est joli mais surprenant : dans un
 * thème violet, les Noirs deviennent violets. Les autres jeux imposent des
 * couleurs de pièces reconnaissables quel que soit le damier.
 */
export type PieceColourId = 'theme' | 'classique' | 'pur' | 'bois' | 'marbre' | 'custom'

export interface Preferences {
  locale: Locale
  /**
   * Écriture des coups.
   *
   * `lettres` suit la langue — « Cf3 » en français, « Nf3 » en anglais.
   * `figurine` utilise les symboles des pièces — « ♘f3 » — comme les livres et
   * les revues internationales : aucune traduction, et on apprend au passage
   * des symboles qu'on retrouvera partout.
   */
  notation: Notation
  theme: ThemeId
  pieceSet: PieceSetId
  boardStyle: BoardStyleId
  view: BoardView
  pieceMaterial: PieceMaterial
  /** Couleurs des pièces en 3D. */
  pieceColours: PieceColourId
  /** Couleurs libres, utilisées quand `pieceColours` vaut « custom ». */
  pieceWhiteCustom: string
  pieceBlackCustom: string
  effects: EffectsLevel

  // Échiquier
  showCoordinates: boolean
  showLegalMoves: boolean
  /**
   * Colore les cases d'arrivée selon la sûreté du coup : vert si la pièce y est
   * en sécurité, rouge si elle serait perdue, doré si le coup gagne du
   * matériel. Une béquille d'apprentissage, à désactiver quand on n'en a plus
   * besoin.
   */
  moveSafetyHints: boolean
  highlightLastMove: boolean
  /**
   * Trace une flèche sur le coup que l'adversaire vient de jouer.
   *
   * Le surlignage des deux cases se remarque mal quand on ne sait pas encore
   * où regarder : la flèche dit d'un coup d'œil *quelle pièce* a bougé et
   * *d'où elle vient*. Indispensable à bas niveau, superflu ensuite — d'où
   * l'interrupteur.
   */
  opponentMoveArrow: boolean
  highlightCheck: boolean
  /** Durée d'animation d'un déplacement, en millisecondes. `0` = instantané. */
  animationMs: number
  /** Demande confirmation avant de valider un coup (utile sur mobile). */
  confirmMove: boolean
  premove: boolean
  /** Rotation automatique de l'échiquier en partie locale. */
  autoFlip: boolean
  /**
   * Garde les Blancs en bas, même quand on joue les Noirs.
   *
   * L'échiquier se lit d'habitude de son propre côté. Certains préfèrent
   * pourtant une orientation fixe : les diagrammes des livres, des cours et des
   * puzzles sont presque tous vus des Blancs, et alterner brouille les repères
   * qu'on est justement en train de construire.
   */
  whiteAlwaysBottom: boolean
  /**
   * Affiche le nom de l'ouverture en cours de partie.
   *
   * C'est une aide à l'apprentissage : on retient les noms parce qu'on les voit
   * apparaître sur ses propres parties. Certains préfèrent jouer sans, d'où
   * l'interrupteur.
   */
  showOpeningName: boolean
  /** Annonce le nom de l'ouverture à voix haute quand il change. */
  announceOpenings: boolean

  // Son
  soundEnabled: boolean
  volume: number

  // Voix
  voiceEnabled: boolean
  /**
   * Moteur de synthèse.
   *
   * `neural` = les voix Piper du serveur, nettement plus naturelles ; on
   * retombe automatiquement sur le navigateur si le serveur n'en propose pas.
   * `system` = la synthèse du navigateur, imposée.
   */
  voiceEngine: 'neural' | 'system'
  /** Nom de la voix système choisie, ou `null` pour la voix par défaut. */
  voiceName: string | null
  /** Identifiant de la voix neuronale choisie, ou `null` pour la première. */
  neuralVoice: string | null
  voiceRate: number
  voicePitch: number
  /** Annonce chaque coup joué, en plus des explications. */
  announceMoves: boolean

  // Analyse
  /**
   * Mode commenté : après chaque coup, le moteur montre ce qu'on aurait pu
   * jouer et pourquoi. Volontairement indisponible en partie contre un ami —
   * ce serait de l'assistance moteur en direct.
   */
  commentaryMode: boolean
  /** Met la partie en pause après chaque commentaire, le temps de le lire. */
  commentaryPauses: boolean
  /** Profondeur de l'analyse instantanée dans le navigateur. */
  clientDepth: number
  /** Affiche la barre d'évaluation pendant les parties (déconseillé en classé). */
  showEvalDuringGame: boolean
}

const DEFAULTS: Preferences = {
  locale: 'fr',
  notation: 'lettres',
  theme: 'aurora',
  pieceSet: 'staunton',
  boardStyle: 'aurore',
  view: '2d',
  pieceMaterial: 'ivoire',
  // Par défaut on impose l'ivoire et l'ébène plutôt que de suivre le thème :
  // des pièces violettes sont déroutantes, même dans un thème violet.
  pieceColours: 'classique',
  pieceWhiteCustom: '#f2ead8',
  pieceBlackCustom: '#26221e',
  effects: 'high',

  showCoordinates: true,
  showLegalMoves: true,
  moveSafetyHints: false,
  highlightLastMove: true,
  opponentMoveArrow: true,
  highlightCheck: true,
  animationMs: 190,
  confirmMove: false,
  premove: true,
  autoFlip: false,
  whiteAlwaysBottom: false,
  showOpeningName: true,
  announceOpenings: false,

  soundEnabled: true,
  volume: 0.55,

  voiceEnabled: true,
  // On préfère la voix neuronale par défaut : quand elle est là, l'écart de
  // qualité est tel qu'il n'y a pas d'arbitrage à faire. Et quand elle n'est
  // pas là, ce réglage ne change rien.
  voiceEngine: 'neural',
  voiceName: null,
  neuralVoice: null,
  voiceRate: 1.02,
  voicePitch: 1,
  announceMoves: false,

  commentaryMode: false,
  // Le mode commenté sert à étudier ses coups : enchaîner aussitôt sur la
  // réponse de l'adversaire ne laisse pas le temps de lire le commentaire ni de
  // regarder les flèches. On attend donc un clic.
  commentaryPauses: true,
  clientDepth: 14,
  showEvalDuringGame: false,
}

interface PreferencesStore extends Preferences {
  set: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void
  patch: (values: Partial<Preferences>) => void
  reset: () => void
  /** Vrai une fois les valeurs relues depuis le stockage local. */
  hydrated: boolean
}

export const usePreferences = create<PreferencesStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      hydrated: false,
      set: (key, value) => set({ [key]: value } as Partial<PreferencesStore>),
      patch: (values) => set(values as Partial<PreferencesStore>),
      reset: () => set({ ...DEFAULTS }),
    }),
    {
      name: 'coupparfait.preferences',
      version: 3,
      /**
       * Reprise des réglages enregistrés par une version antérieure.
       *
       * Sans cela, un changement de valeur par défaut ne touche que les
       * nouveaux venus : ceux qui utilisent déjà l'application gardent
       * l'ancien comportement sans jamais savoir qu'il a changé.
       */
      migrate: (persisted, from) => {
        const state = (persisted ?? {}) as Partial<Preferences>
        // v2 : le mode commenté marque une pause après chaque coup.
        if (from < 2) state.commentaryPauses = true
        // v3 : le coup de l'adversaire est fléché.
        if (from < 3) state.opponentMoveArrow = true
        return state as Preferences
      },
      partialize: ({ set: _set, patch: _patch, reset: _reset, hydrated: _h, ...rest }) => rest,
      onRehydrateStorage: () => (state) => {
        state?.patch({} as Partial<Preferences>)
        usePreferences.setState({ hydrated: true })
      },
    },
  ),
)

/** Lecture hors composant React (sons, moteur, workers). */
export function getPreferences(): Preferences {
  return usePreferences.getState()
}

// ─────────────────────────────────────────────────────────────────────────────
//  Détection automatique des machines modestes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estime si l'appareil peut encaisser les effets lourds.
 *
 * On croise trois signaux disponibles sans permission : le nombre de cœurs, la
 * mémoire annoncée, et la préférence système « animations réduites ». C'est
 * approximatif, mais bien meilleur que d'imposer du flou et du bloom à un
 * téléphone d'entrée de gamme.
 */
export function detectEffectsCapability(): EffectsLevel {
  if (typeof window === 'undefined') return 'high'

  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'low'

  const cores = navigator.hardwareConcurrency ?? 4
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false

  if (cores <= 4 && memory <= 4) return 'low'
  if (coarsePointer && cores <= 6) return 'low'
  return 'high'
}

/** Vrai si le navigateur peut faire tourner Stockfish multi-fils. */
export function supportsThreadedEngine(): boolean {
  return (
    typeof SharedArrayBuffer !== 'undefined' &&
    typeof globalThis.crossOriginIsolated !== 'undefined' &&
    globalThis.crossOriginIsolated === true
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Catalogues affichés dans les préférences
// ─────────────────────────────────────────────────────────────────────────────

export const THEME_LIST: Array<{ id: ThemeId; swatch: [string, string, string] }> = [
  { id: 'aurora', swatch: ['#07070c', '#7c5cff', '#00e5a8'] },
  { id: 'club', swatch: ['#14100b', '#c9a227', '#e8dcc8'] },
  { id: 'clair', swatch: ['#f7f7f9', '#5b3ce0', '#00926e'] },
  { id: 'contraste', swatch: ['#000000', '#ffe600', '#ffffff'] },
]

/**
 * Jeux de pièces disponibles.
 *
 * Tous sont sous licence libre sans clause non commerciale — voir
 * `ATTRIBUTION.md` à la racine du dépôt pour les auteurs et les licences.
 */
export const PIECE_SETS: Array<{ id: PieceSetId; label: string; blurb: string }> = [
  { id: 'staunton', label: 'Staunton', blurb: 'Le standard des tournois depuis 1849.' },
  { id: 'merida', label: 'Merida', blurb: 'Contours nets, très lisible en petite taille.' },
  { id: 'alpha', label: 'Alpha', blurb: 'Silhouettes pleines, sans détail superflu.' },
  { id: 'chessnut', label: 'Chessnut', blurb: 'Épuré et contemporain.' },
  { id: 'fantasy', label: 'Fantasy', blurb: 'Volumes sculptés, ombres douces.' },
  { id: 'celtic', label: 'Celtique', blurb: 'Entrelacs et lignes gravées.' },
  { id: 'spatial', label: 'Spatial', blurb: 'Formes futuristes en perspective.' },
  { id: 'rhosgfx', label: 'Rhos', blurb: 'Aplats colorés, domaine public.' },
  { id: 'pixel', label: 'Pixel', blurb: 'Hommage aux échiquiers 8 bits.' },
  { id: 'letter', label: 'Lettres', blurb: 'Initiales seules — lisibilité maximale.' },
]

export const BOARD_STYLES: Array<{
  id: BoardStyleId
  label: string
  light: string
  dark: string
}> = [
  { id: 'aurore', label: 'Aurore', light: '#dfd7ea', dark: '#6b5f8c' },
  { id: 'noyer', label: 'Noyer', light: '#e8dcc8', dark: '#8a6a45' },
  { id: 'marbre', label: 'Marbre', light: '#eceff3', dark: '#7f8794' },
  { id: 'ardoise', label: 'Ardoise', light: '#cdd3d8', dark: '#4c5a63' },
  { id: 'mousse', label: 'Mousse', light: '#e6ecd8', dark: '#6b8a4f' },
  { id: 'papier', label: 'Papier', light: '#f4efe4', dark: '#c3b7a2' },
  { id: 'neon', label: 'Néon', light: '#1d2233', dark: '#0d1020' },
  { id: 'sepia', label: 'Sépia', light: '#f0e2cc', dark: '#a5825b' },
]

export const PIECE_MATERIALS: Array<{ id: PieceMaterial; label: string }> = [
  { id: 'ivoire', label: 'Ivoire' },
  { id: 'marbre', label: 'Marbre' },
  { id: 'verre', label: 'Verre' },
]

/**
 * Jeux de couleurs de pièces pour la vue 3D.
 *
 * Les pièces 2D sont des fichiers vectoriels aux couleurs fixes : cette
 * préférence ne concerne donc que la 3D, où la couleur est un simple paramètre
 * de matériau.
 */
export const PIECE_COLOURS: Array<{
  id: PieceColourId
  label: string
  white: string
  black: string
  blurb: string
}> = [
  {
    id: 'classique',
    label: 'Ivoire & ébène',
    white: '#f2ead8',
    black: '#26221e',
    blurb: 'Les couleurs d’un vrai jeu de tournoi.',
  },
  {
    id: 'pur',
    label: 'Blanc & noir',
    white: '#fbfbfd',
    black: '#141418',
    blurb: 'Contraste maximal, aucune ambiguïté.',
  },
  {
    id: 'bois',
    label: 'Érable & noyer',
    white: '#e8d5b0',
    black: '#4a3020',
    blurb: 'Deux essences de bois, chaleureux.',
  },
  {
    id: 'marbre',
    label: 'Marbre',
    white: '#f0f2f5',
    black: '#3a4048',
    blurb: 'Froid et minéral.',
  },
  {
    id: 'theme',
    label: 'Suivre le thème',
    white: '',
    black: '',
    blurb: 'Les pièces prennent les couleurs du damier.',
  },
  {
    id: 'custom',
    label: 'Personnalisé',
    white: '',
    black: '',
    blurb: 'Choisis toi-même les deux couleurs.',
  },
]

/** Résout les couleurs effectives des pièces, thème et personnalisation compris. */
export function resolvePieceColours(
  preferences: Pick<Preferences, 'pieceColours' | 'pieceWhiteCustom' | 'pieceBlackCustom'>,
  themeLight: string,
  themeDark: string,
): { white: string; black: string } {
  if (preferences.pieceColours === 'theme') {
    return { white: themeLight, black: themeDark }
  }
  if (preferences.pieceColours === 'custom') {
    return { white: preferences.pieceWhiteCustom, black: preferences.pieceBlackCustom }
  }
  const entry = PIECE_COLOURS.find((colour) => colour.id === preferences.pieceColours)
  return entry && entry.white
    ? { white: entry.white, black: entry.black }
    : { white: '#f2ead8', black: '#26221e' }
}
