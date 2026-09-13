'use client'

/**
 * Préférences de l'utilisateur.
 *
 * Tout est conservé côté navigateur : la plateforme est utilisable sans compte,
 * les réglages doivent donc survivre sans base de données. Les comptes
 * connectés synchronisent ensuite ce même objet côté serveur.
 */

import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import type { Notation } from '@coupparfait/core'
import type { Locale } from '../i18n/dictionary.ts'
import type { TranslationKey } from '../i18n/index.tsx'
import type { CustomProviderDef } from '../ia/providers/custom.ts'

export type ThemeId = 'aurora' | 'clair'
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
  'aurore' | 'noyer' | 'marbre' | 'ardoise' | 'mousse' | 'papier' | 'neon' | 'sepia'
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
  /**
   * Affiche le mémo d'avant chaque coup sous l'échiquier.
   *
   * Quatre questions — ce que son coup a changé, ce qu'il attaque, ce que mon
   * coup laisse en prise, ce que tient son coup le plus méchant. Même nature
   * que les autres aides : une béquille qu'on allume le temps d'acquérir le
   * réflexe, et qu'on coupe ensuite. La liste vit dans
   * `lib/apprendre/principes.ts`, qui la partage avec la page qui l'explique.
   *
   * Éteint par défaut. Un panneau de plus sous l'échiquier, imposé à tout le
   * monde, coûterait plus cher à ceux qui n'en ont pas besoin qu'il ne
   * rapporterait à ceux qui l'ignorent.
   */
  memoAvantCoup: boolean
  highlightLastMove: boolean
  highlightCheck: boolean
  /** Durée d'animation d'un déplacement, en millisecondes. `0` = instantané. */
  animationMs: number
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
  /**
   * Relire la partie pas à pas plutôt que dans le tableau de bord.
   *
   * Un échiquier, une phrase, un bouton — contre la vue détaillée, qui montre
   * la courbe, les alternatives et les moments clés. Le second suppose qu'on
   * sait déjà lire une évaluation ; le premier est le seul qui tienne sur un
   * téléphone.
   */
  relectureGuidee: boolean
  /** Met la partie en pause après chaque commentaire, le temps de le lire. */
  commentaryPauses: boolean
  /**
   * Commente aussi les coups de l'adversaire.
   *
   * Éteint par défaut, et c'est un arbitrage plutôt qu'une timidité : voir les
   * options de l'adversaire à chaque coup aide à comprendre la partie, mais
   * double le nombre de commentaires et donne une vision qu'on n'a pas sur un
   * échiquier. On le propose à qui veut décortiquer, pas à qui veut jouer.
   */
  commentaryOpponent: boolean
  /** Profondeur de l'analyse instantanée dans le navigateur. */
  clientDepth: number
  /** Affiche la barre d'évaluation pendant les parties (déconseillé en classé). */
  showEvalDuringGame: boolean

  // Assistant IA
  /**
   * Branche un assistant conversationnel par-dessus les explications écrites.
   *
   * Désactivé par défaut, et il doit le rester : tout ce que fait
   * l'application — analyser, expliquer, commenter à voix haute — fonctionne
   * sans le moindre appel à un service extérieur. L'assistant n'ajoute qu'une
   * chose, mais elle compte : on peut lui poser une question de suivi.
   *
   * ⚠️ La clé d'API ne se range **pas** ici. Cet objet part côté serveur pour
   * les comptes connectés (voir l'en-tête du fichier) ; la clé vit dans
   * `lib/ia/cle.ts`, qui ne quitte jamais le navigateur.
   */
  iaEnabled: boolean
  /** Identifiant du fournisseur choisi, vide tant que rien n'est configuré. */
  iaProvider: string
  /** Identifiant du modèle choisi chez ce fournisseur. */
  iaModel: string
  /** Plafond de longueur des réponses, en tokens. */
  iaMaxTokens: number
  /** Services compatibles OpenAI ajoutés à la main — nom et adresse, sans clé. */
  iaCustomProviders: CustomProviderDef[]

  // Comptes de jeu en ligne
  /** Pseudo Chess.com, mémorisé pour ne pas le retaper à chaque import. */
  chesscomUsername: string
  /** Pseudo Lichess, même usage. */
  lichessUsername: string
}

const DEFAULTS: Preferences = {
  locale: 'fr',
  /*
    Les coups s'écrivent avec la pièce dessinée, pas avec son initiale.

    « Cf3 », « Dxd5 », « Fb5 » : trois lettres à apprendre avant de pouvoir
    lire une liste de coups, et rien dans « C » ne ressemble à un cavalier.
    La figurine se lit sans rien savoir — on reconnaît le dessin de la pièce
    qu'on a sous les yeux sur l'échiquier —, elle ne dépend d'aucune langue,
    et c'est celle des livres et des revues.

    Le réglage reste dans Préférences pour qui préfère les lettres.
  */
  notation: 'figurine',
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
  memoAvantCoup: false,
  highlightLastMove: true,
  highlightCheck: true,
  animationMs: 190,
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
  // Éteinte par défaut : quelqu'un qui arrive sur l'analyse a le plus souvent
  // déjà une idée de ce qu'il cherche, et la vue détaillée répond plus vite.
  // Le pas à pas se choisit, et le choix se retient ensuite.
  relectureGuidee: false,
  // Le mode commenté sert à étudier ses coups : enchaîner aussitôt sur la
  // réponse de l'adversaire ne laisse pas le temps de lire le commentaire ni de
  // regarder les flèches. On attend donc un clic.
  commentaryPauses: true,
  commentaryOpponent: false,
  clientDepth: 14,
  showEvalDuringGame: false,

  iaEnabled: false,
  iaProvider: '',
  iaModel: '',
  // Assez pour trois ou quatre phrases suivies, pas assez pour une dissertation
  // qu'on ne lirait pas — et le plafond borne aussi la dépense de l'utilisateur.
  iaMaxTokens: 700,
  iaCustomProviders: [],

  chesscomUsername: '',
  lichessUsername: '',
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
      version: 7,
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
        // v3 avait ajouté une flèche sur le coup de l'adversaire, retirée
        // depuis : les deux cases vertes du dernier coup disent la même chose
        // sans encombrer l'échiquier. La clé reste sans effet dans les
        // réglages déjà enregistrés.
        // v4 : arrivée de l'assistant IA. On l'installe éteint chez ceux qui
        // utilisent déjà l'application — une fonction qui appelle un service
        // extérieur ne s'allume pas toute seule à la faveur d'une mise à jour.
        if (from < 4) {
          state.iaEnabled = false
          state.iaCustomProviders = []
        }
        // v5 : les coups s'écrivent en figurine. Le changement de défaut
        // n'aurait touché que les nouveaux venus, et ce sont justement ceux
        // qui utilisent déjà l'application qui butent sur « Cf3 » à longueur
        // de partie. Le réglage reste ouvert dans Préférences.
        if (from < 5) state.notation = 'figurine'
        // v6 : deux thèmes au lieu de quatre. « Club » et « Contraste » ont
        // disparu ; qui les avait choisis retombe sur le thème sombre.
        if (from < 6 && state.theme !== 'clair') state.theme = 'aurora'
        // v7 : « confirmer chaque coup » n'a jamais été branché — le réglage
        // existait, la case aussi, et rien ne la lisait. On retire la clé des
        // réglages enregistrés pour qu'elle ne survive pas au type.
        if (from < 7) delete (state as Record<string, unknown>).confirmMove
        return state as Preferences
      },
      /**
       * Le thème, quand rien n'est enregistré, est celui que l'amorce de
       * `layout.tsx` a posé sur le document avant le premier rendu — clair ou
       * sombre selon le système. On relit l'attribut au lieu de recalculer :
       * une seule décision, prise une seule fois, et le magasin ne peut pas
       * contredire ce que la page affiche déjà. `merge` n'est appelé qu'au
       * navigateur, pendant la relecture du stockage ; le rendu serveur garde
       * la valeur par défaut, et l'attribut posé par l'amorce couvre l'écart.
       */
      merge: (persisted, current) => {
        const enregistre = (persisted ?? {}) as Partial<Preferences>
        const theme = enregistre.theme ?? themeDuDocument() ?? current.theme
        return { ...current, ...enregistre, theme }
      },
      partialize: ({ set: _set, patch: _patch, reset: _reset, hydrated: _h, ...rest }) => rest,
      /**
       * Marque la fin de la relecture des réglages enregistrés.
       *
       * On passe par `state.patch` et **non** par `usePreferences.setState` :
       * le stockage local étant synchrone, zustand relit les réglages pendant
       * la création du magasin, c'est-à-dire avant que la constante
       * `usePreferences` ne soit affectée. L'appeler ici levait donc une
       * erreur — silencieuse, parce que zustand l'intercepte pour la passer au
       * second argument de ce même rappel. Résultat : `hydrated` restait
       * indéfiniment `false`, ce qui n'a longtemps rien cassé de visible
       * puisque personne n'en dépendait à l'affichage.
       */
      onRehydrateStorage: () => (state) => {
        state?.patch({ hydrated: true } as unknown as Partial<Preferences>)
      },
    },
  ),
)

/**
 * Quelques réglages, et pas tout le store.
 *
 * `usePreferences()` sans sélecteur abonne le composant à **toute** la
 * préférence : changer le volume re-rendait l'échiquier, et régler la
 * profondeur du moteur re-rendait l'écran de jeu. Le store en compte une
 * cinquantaine, dont l'immense majorité ne concerne pas celui qui lit.
 *
 * `useShallow` compare l'objet rendu champ par champ : deux lectures qui
 * donnent les mêmes valeurs ne déclenchent pas de rendu, alors même que le
 * sélecteur fabrique un objet neuf à chaque appel.
 *
 * Utilisation :
 *
 *     const { pieceSet, boardStyle } = usePreferencesDe('pieceSet', 'boardStyle')
 *
 * `set`, `patch` et `reset` se demandent comme les autres champs : ce sont des
 * fonctions stables, elles ne provoquent jamais de rendu.
 */
export function usePreferencesDe<K extends keyof PreferencesStore>(
  ...cles: K[]
): Pick<PreferencesStore, K> {
  // Les clés arrivent dans un tableau neuf à chaque rendu ; c'est sans
  // conséquence, `useShallow` compare le **résultat**, pas le sélecteur. La
  // jointure sert de dépendance stable pour la mémoïsation du sélecteur.
  const empreinte = cles.join(',')
  const selecteur = useMemo(
    () =>
      (state: PreferencesStore): Pick<PreferencesStore, K> => {
        const extrait = {} as Pick<PreferencesStore, K>
        for (const cle of empreinte.split(',') as K[]) extrait[cle] = state[cle]
        return extrait
      },
    [empreinte],
  )
  return usePreferences(useShallow(selecteur))
}

/** Lecture hors composant React (sons, moteur, workers). */
export function getPreferences(): Preferences {
  return usePreferences.getState()
}

// ─────────────────────────────────────────────────────────────────────────────
//  Détection automatique des machines modestes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Le thème que le document porte déjà, s'il est valide.
 *
 * L'amorce de `layout.tsx` le pose avant tout rendu ; hors navigateur, ou si
 * quelqu'un a écrit n'importe quoi dans l'attribut, on ne renvoie rien.
 */
function themeDuDocument(): ThemeId | undefined {
  if (typeof document === 'undefined') return undefined
  const theme = document.documentElement.dataset.theme
  return theme === 'aurora' || theme === 'clair' ? theme : undefined
}

/**
 * Estime si l'appareil peut encaisser les effets lourds.
 *
 * On croise quatre signaux disponibles sans permission : la préférence
 * système « animations réduites », le nombre de cœurs, la mémoire annoncée,
 * et le pointeur grossier — un téléphone à six cœurs ou moins n'a pas le GPU
 * d'un portable. C'est approximatif, mais bien meilleur que d'imposer du flou
 * et du bloom à un téléphone d'entrée de gamme.
 *
 * **La même règle est recopiée dans l'amorce en ligne de `layout.tsx`**, qui
 * ne peut rien importer : elle décide avant le premier rendu, ici on décide
 * pour de bon. Les deux doivent rester identiques, sinon l'écran change
 * d'aspect entre le chargement et l'hydratation.
 */
export function detectEffectsCapability(): EffectsLevel {
  if (typeof window === 'undefined') return 'high'

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  const cores = navigator.hardwareConcurrency || 4
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false

  return reduced || (cores <= 4 && memory <= 4) || (coarse && cores <= 6) ? 'low' : 'high'
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
//
//  Les intitulés et les phrases de ces quatre tables sont des clés de
//  dictionnaire et non du texte : ce sont des constantes de module, donc sans
//  accès à `t()`, et leurs quarante textes restaient en français dans toutes les
//  autres langues. La page des préférences résout au rendu.
// ─────────────────────────────────────────────────────────────────────────────

export const THEME_LIST: Array<{ id: ThemeId; swatch: [string, string, string] }> = [
  { id: 'aurora', swatch: ['#0b0b14', '#7c5cff', '#f2f1f8'] },
  { id: 'clair', swatch: ['#f7f7f9', '#5b3ce0', '#14141c'] },
]

/**
 * Jeux de pièces disponibles.
 *
 * Tous sont sous licence libre sans clause non commerciale — voir
 * `ATTRIBUTION.md` à la racine du dépôt pour les auteurs et les licences.
 */
export const PIECE_SETS: Array<{
  id: PieceSetId
  labelKey: TranslationKey
  blurbKey: TranslationKey
}> = [
  { id: 'staunton', labelKey: 'catalog.setStaunton', blurbKey: 'catalog.setStauntonHint' },
  { id: 'merida', labelKey: 'catalog.setMerida', blurbKey: 'catalog.setMeridaHint' },
  { id: 'alpha', labelKey: 'catalog.setAlpha', blurbKey: 'catalog.setAlphaHint' },
  { id: 'chessnut', labelKey: 'catalog.setChessnut', blurbKey: 'catalog.setChessnutHint' },
  { id: 'fantasy', labelKey: 'catalog.setFantasy', blurbKey: 'catalog.setFantasyHint' },
  { id: 'celtic', labelKey: 'catalog.setCeltic', blurbKey: 'catalog.setCelticHint' },
  { id: 'spatial', labelKey: 'catalog.setSpatial', blurbKey: 'catalog.setSpatialHint' },
  { id: 'rhosgfx', labelKey: 'catalog.setRhos', blurbKey: 'catalog.setRhosHint' },
  { id: 'pixel', labelKey: 'catalog.setPixel', blurbKey: 'catalog.setPixelHint' },
  { id: 'letter', labelKey: 'catalog.setLetter', blurbKey: 'catalog.setLetterHint' },
]

export const BOARD_STYLES: Array<{
  id: BoardStyleId
  labelKey: TranslationKey
  light: string
  dark: string
}> = [
  { id: 'aurore', labelKey: 'catalog.boardAurore', light: '#dfd7ea', dark: '#6b5f8c' },
  { id: 'noyer', labelKey: 'catalog.boardNoyer', light: '#e8dcc8', dark: '#8a6a45' },
  { id: 'marbre', labelKey: 'catalog.boardMarbre', light: '#eceff3', dark: '#7f8794' },
  { id: 'ardoise', labelKey: 'catalog.boardArdoise', light: '#cdd3d8', dark: '#4c5a63' },
  { id: 'mousse', labelKey: 'catalog.boardMousse', light: '#e6ecd8', dark: '#6b8a4f' },
  { id: 'papier', labelKey: 'catalog.boardPapier', light: '#f4efe4', dark: '#c3b7a2' },
  { id: 'neon', labelKey: 'catalog.boardNeon', light: '#1d2233', dark: '#0d1020' },
  { id: 'sepia', labelKey: 'catalog.boardSepia', light: '#f0e2cc', dark: '#a5825b' },
]

export const PIECE_MATERIALS: Array<{ id: PieceMaterial; labelKey: TranslationKey }> = [
  { id: 'ivoire', labelKey: 'catalog.matIvory' },
  { id: 'marbre', labelKey: 'catalog.matMarble' },
  { id: 'verre', labelKey: 'catalog.matGlass' },
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
  labelKey: TranslationKey
  white: string
  black: string
  blurbKey: TranslationKey
}> = [
  {
    id: 'classique',
    labelKey: 'catalog.colClassic',
    white: '#f2ead8',
    black: '#26221e',
    blurbKey: 'catalog.colClassicHint',
  },
  {
    id: 'pur',
    labelKey: 'catalog.colPure',
    white: '#fbfbfd',
    black: '#141418',
    blurbKey: 'catalog.colPureHint',
  },
  {
    id: 'bois',
    labelKey: 'catalog.colWood',
    white: '#e8d5b0',
    black: '#4a3020',
    blurbKey: 'catalog.colWoodHint',
  },
  {
    id: 'marbre',
    labelKey: 'catalog.colMarble',
    white: '#f0f2f5',
    black: '#3a4048',
    blurbKey: 'catalog.colMarbleHint',
  },
  {
    id: 'theme',
    labelKey: 'catalog.colTheme',
    white: '',
    black: '',
    blurbKey: 'catalog.colThemeHint',
  },
  {
    id: 'custom',
    labelKey: 'catalog.colCustom',
    white: '',
    black: '',
    blurbKey: 'catalog.colCustomHint',
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
