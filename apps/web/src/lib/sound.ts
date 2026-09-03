'use client'

/**
 * Bruitages.
 *
 * Le son porte une vraie information pendant une partie : un « clac » sec pour
 * un coup ordinaire, un choc mat pour une capture, une note tendue pour un
 * échec. On finit par savoir ce qui s'est passé sans regarder.
 *
 * Chaque fichier est préchargé une fois puis rejoué à la demande. L'`AudioContext`
 * n'est créé qu'au premier geste de l'utilisateur : les navigateurs refusent de
 * jouer un son avant, et créer le contexte trop tôt le laisse suspendu.
 */

import { getPreferences } from './store/preferences.ts'
import type { Move } from 'chess.js'

export type SoundId =
  | 'move'
  | 'capture'
  | 'check'
  | 'castle'
  | 'promote'
  | 'victory'
  | 'defeat'
  | 'draw'
  | 'lowtime'
  | 'notify'
  | 'confirm'
  | 'error'
  | 'start'

/** Correspondance entre un événement et un fichier. */
const FILES: Record<SoundId, string> = {
  move: '/sounds/move.mp3',
  capture: '/sounds/capture.mp3',
  check: '/sounds/check.mp3',
  // Le roque et la promotion réutilisent des bruitages proches : inutile de
  // multiplier les fichiers pour des nuances qu'on ne distingue pas.
  castle: '/sounds/move.mp3',
  promote: '/sounds/confirmation.mp3',
  victory: '/sounds/victory.mp3',
  defeat: '/sounds/defeat.mp3',
  draw: '/sounds/draw.mp3',
  lowtime: '/sounds/lowtime.mp3',
  notify: '/sounds/genericnotify.mp3',
  confirm: '/sounds/confirmation.mp3',
  error: '/sounds/error.mp3',
  start: '/sounds/newchallenge.mp3',
}

/** Ajustement du volume par bruitage : certains fichiers sont plus forts. */
const GAIN: Partial<Record<SoundId, number>> = {
  move: 0.85,
  capture: 1,
  check: 1,
  victory: 0.8,
  defeat: 0.8,
  lowtime: 0.9,
}

const buffers = new Map<SoundId, AudioBuffer>()
let context: AudioContext | null = null
let master: GainNode | null = null
let unlocked = false

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (context) return context
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  context = new Ctor()
  master = context.createGain()
  master.connect(context.destination)
  return context
}

/**
 * Débloque l'audio. À appeler depuis un gestionnaire d'événement utilisateur —
 * un clic, une touche — sans quoi le navigateur refusera.
 */
export function unlockAudio(): void {
  if (unlocked) return
  const ctx = ensureContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
  unlocked = true
  void preloadSounds()
}

/** Précharge tous les bruitages, en silence et sans bloquer. */
export async function preloadSounds(): Promise<void> {
  const ctx = ensureContext()
  if (!ctx) return
  const unique = [...new Set(Object.entries(FILES).map(([id, url]) => `${id}|${url}`))]
  await Promise.all(
    unique.map(async (entry) => {
      const [id, url] = entry.split('|') as [SoundId, string]
      if (buffers.has(id)) return
      try {
        const response = await fetch(url)
        if (!response.ok) return
        const data = await response.arrayBuffer()
        buffers.set(id, await ctx.decodeAudioData(data))
      } catch {
        // Un bruitage manquant ne doit jamais empêcher de jouer.
      }
    }),
  )
}

/** Joue un bruitage, en respectant les préférences de l'utilisateur. */
export function playSound(id: SoundId, volumeScale = 1): void {
  const prefs = getPreferences()
  if (!prefs.soundEnabled || prefs.volume <= 0) return

  const ctx = ensureContext()
  if (!ctx || !master) return
  if (ctx.state === 'suspended') void ctx.resume()

  const buffer = buffers.get(id)
  if (!buffer) {
    // Pas encore préchargé : on tente une lecture directe, moins précise mais
    // qui évite un silence au tout premier coup de la session.
    void fallbackPlay(id, prefs.volume * volumeScale)
    return
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer
  const gain = ctx.createGain()
  gain.gain.value = prefs.volume * volumeScale * (GAIN[id] ?? 1)
  source.connect(gain)
  gain.connect(master)
  source.start(0)
}

async function fallbackPlay(id: SoundId, volume: number): Promise<void> {
  try {
    const audio = new Audio(FILES[id])
    audio.volume = Math.max(0, Math.min(1, volume))
    await audio.play()
  } catch {
    // Lecture refusée : l'utilisateur n'a pas encore interagi avec la page.
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Bruitage d'un coup
// ─────────────────────────────────────────────────────────────────────────────

export interface MoveSoundContext {
  isCapture: boolean
  isCheck: boolean
  isCheckmate: boolean
  isCastle: boolean
  isPromotion: boolean
}

/**
 * Choisit le bruitage correspondant à un coup.
 * L'ordre de priorité reflète l'importance : un mat prime sur tout le reste.
 */
export function playMoveSound(context: MoveSoundContext): void {
  if (context.isCheckmate) {
    playSound('victory')
    return
  }
  if (context.isCheck) {
    playSound('check')
    return
  }
  if (context.isPromotion) {
    playSound('promote')
    return
  }
  if (context.isCapture) {
    playSound('capture')
    return
  }
  if (context.isCastle) {
    playSound('castle')
    return
  }
  playSound('move')
}

/**
 * Bruitage d'un coup, à partir du coup lui-même.
 *
 * L'adaptateur vers `playMoveSound` — cinq booléens à extraire — était recopié
 * **huit fois**, dans six écrans. Toutes les copies ne se ressemblaient pas :
 * certaines lisaient l'échec dans `board.inCheck()`, d'autres dans le SAN,
 * deux oubliaient le roque, une posait `isCheckmate: false` en dur. Le résultat
 * est qu'un même coup ne faisait pas le même bruit selon l'écran.
 *
 * Tout se lit dans le coup, sans avoir besoin de l'échiquier : le SAN de
 * chess.js porte déjà `+` et `#`, et `flags` porte le roque et la promotion.
 * C'est aussi ce qui rend l'appel possible depuis la partie en direct, où l'on
 * ne reçoit du serveur que le SAN.
 */
export function playMoveFor(move: Move): void {
  playMoveSound({
    isCapture: move.isCapture(),
    isCheck: move.san.includes('+'),
    isCheckmate: move.san.includes('#'),
    isCastle: move.isKingsideCastle() || move.isQueensideCastle(),
    isPromotion: Boolean(move.promotion),
  })
}

/**
 * Bruitage d'un coup dont on n'a que la notation.
 *
 * C'est le cas de la partie en direct : le serveur fait autorité et n'envoie
 * que le SAN. Moins précis que `playMoveFor` sur un seul point — `O-O` et
 * `O-O-O` se reconnaissent, mais une prise notée sans `x` n'existe pas en SAN,
 * donc rien ne se perd en pratique.
 */
export function playMoveForSan(san: string): void {
  playMoveSound({
    isCapture: san.includes('x'),
    isCheck: san.includes('+'),
    isCheckmate: san.includes('#'),
    isCastle: san.startsWith('O-O'),
    isPromotion: san.includes('='),
  })
}

/** Bruitage de fin de partie, selon le résultat du point de vue du joueur. */
export function playResultSound(outcome: 'win' | 'loss' | 'draw'): void {
  playSound(outcome === 'win' ? 'victory' : outcome === 'loss' ? 'defeat' : 'draw')
}
