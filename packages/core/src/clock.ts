/**
 * Pendules et cadences.
 *
 * La règle de base : le temps ne se décompte que pendant le tour du joueur, et
 * l'incrément est ajouté **après** que le coup a été joué (cadence Fischer).
 *
 * Toute l'horloge est calculée à partir d'horodatages absolus plutôt que de
 * décomptes locaux : c'est le serveur qui fait autorité, le navigateur ne fait
 * qu'interpoler entre deux mises à jour. Sinon un onglet en arrière-plan, dont
 * le navigateur ralentit les minuteries, perdrait au temps sans raison.
 */

import type { Color, SpeedCategory, TimeControl } from './types.ts'

// ─────────────────────────────────────────────────────────────────────────────
//  Cadences proposées
// ─────────────────────────────────────────────────────────────────────────────

export interface TimeControlPreset extends TimeControl {
  id: string
  label: string
  category: SpeedCategory
}

export const TIME_CONTROLS: TimeControlPreset[] = [
  { id: '15+0', initial: 15, increment: 0, label: '15 sec', category: 'ultraBullet' },
  { id: '30+0', initial: 30, increment: 0, label: '30 sec', category: 'ultraBullet' },
  { id: '60+0', initial: 60, increment: 0, label: '1 min', category: 'bullet' },
  { id: '60+1', initial: 60, increment: 1, label: '1 | 1', category: 'bullet' },
  { id: '120+1', initial: 120, increment: 1, label: '2 | 1', category: 'bullet' },
  { id: '180+0', initial: 180, increment: 0, label: '3 min', category: 'blitz' },
  { id: '180+2', initial: 180, increment: 2, label: '3 | 2', category: 'blitz' },
  { id: '300+0', initial: 300, increment: 0, label: '5 min', category: 'blitz' },
  { id: '300+3', initial: 300, increment: 3, label: '5 | 3', category: 'blitz' },
  { id: '600+0', initial: 600, increment: 0, label: '10 min', category: 'rapid' },
  { id: '600+5', initial: 600, increment: 5, label: '10 | 5', category: 'rapid' },
  { id: '900+10', initial: 900, increment: 10, label: '15 | 10', category: 'rapid' },
  { id: '1800+0', initial: 1800, increment: 0, label: '30 min', category: 'classical' },
  { id: '1800+20', initial: 1800, increment: 20, label: '30 | 20', category: 'classical' },
  { id: '5400+30', initial: 5400, increment: 30, label: '90 | 30', category: 'classical' },
  { id: '0+0', initial: 0, increment: 0, label: 'Sans limite', category: 'correspondence' },
]

/**
 * Catégorie d'une cadence, selon la formule de Lichess : on estime la durée
 * totale sur une partie d'une quarantaine de coups.
 */
export function speedCategory(tc: TimeControl): SpeedCategory {
  if (tc.initial === 0 && tc.increment === 0) return 'correspondence'
  const estimated = tc.initial + 40 * tc.increment
  if (estimated < 30) return 'ultraBullet'
  if (estimated < 180) return 'bullet'
  if (estimated < 480) return 'blitz'
  if (estimated < 1500) return 'rapid'
  return 'classical'
}

export const SPEED_LABELS: Record<SpeedCategory, { fr: string; en: string; icon: string }> = {
  ultraBullet: { fr: 'Ultra-bullet', en: 'UltraBullet', icon: '🚀' },
  bullet: { fr: 'Bullet', en: 'Bullet', icon: '🔫' },
  blitz: { fr: 'Blitz', en: 'Blitz', icon: '⚡' },
  rapid: { fr: 'Rapide', en: 'Rapid', icon: '🐇' },
  classical: { fr: 'Classique', en: 'Classical', icon: '🐢' },
  correspondence: { fr: 'Correspondance', en: 'Correspondence', icon: '✉️' },
}

/** `300+3` → `{ initial: 300, increment: 3 }`. */
export function parseTimeControl(id: string): TimeControl | null {
  const match = id.match(/^(\d+)\+(\d+)$/)
  if (!match) return null
  return { initial: Number(match[1]), increment: Number(match[2]) }
}

export function formatTimeControl(tc: TimeControl): string {
  if (tc.initial === 0 && tc.increment === 0) return '∞'
  const minutes = tc.initial / 60
  const shown = Number.isInteger(minutes) ? String(minutes) : (tc.initial / 60).toFixed(1)
  return tc.increment > 0 ? `${shown}|${tc.increment}` : `${shown} min`
}

// ─────────────────────────────────────────────────────────────────────────────
//  État d'horloge
// ─────────────────────────────────────────────────────────────────────────────

export interface ClockState {
  /** Temps restant, en millisecondes, au moment de `updatedAt`. */
  remaining: Record<Color, number>
  /** Camp dont la pendule tourne, ou `null` si la partie est à l'arrêt. */
  running: Color | null
  /** Horodatage serveur de la dernière mise à jour (epoch ms). */
  updatedAt: number
  control: TimeControl
}

export function createClock(control: TimeControl, now: number): ClockState {
  const ms = control.initial * 1000
  return {
    remaining: { w: ms, b: ms },
    // La pendule des Blancs ne démarre qu'au premier coup : sinon un joueur qui
    // attend son adversaire perdrait du temps avant même que la partie commence.
    running: null,
    updatedAt: now,
    control,
  }
}

/**
 * Temps réellement restant à l'instant `now`, sans modifier l'état.
 * C'est cette fonction que l'interface appelle 10 fois par seconde.
 */
export function remainingAt(clock: ClockState, now: number): Record<Color, number> {
  if (!clock.running) return { ...clock.remaining }
  const elapsed = Math.max(0, now - clock.updatedAt)
  const running = clock.running
  return {
    w: running === 'w' ? Math.max(0, clock.remaining.w - elapsed) : clock.remaining.w,
    b: running === 'b' ? Math.max(0, clock.remaining.b - elapsed) : clock.remaining.b,
  }
}

/**
 * Applique un coup : arrête la pendule du joueur, ajoute son incrément, et
 * lance celle de l'adversaire.
 *
 * @param mover camp qui vient de jouer
 * @param now horodatage serveur du coup
 * @param firstMove vrai s'il s'agit du tout premier coup de la partie
 */
export function applyMove(
  clock: ClockState,
  mover: Color,
  now: number,
  firstMove = false,
): ClockState {
  if (clock.control.initial === 0 && clock.control.increment === 0) {
    return { ...clock, running: mover === 'w' ? 'b' : 'w', updatedAt: now }
  }

  const current = remainingAt(clock, now)
  const opponent: Color = mover === 'w' ? 'b' : 'w'

  // Le premier coup ne consomme rien : la pendule n'avait pas encore démarré.
  const spent = firstMove || clock.running !== mover ? 0 : current[mover]
  const after = firstMove || clock.running !== mover ? clock.remaining[mover] : spent

  return {
    ...clock,
    remaining: {
      ...current,
      [mover]: after + clock.control.increment * 1000,
    } as Record<Color, number>,
    running: opponent,
    updatedAt: now,
  }
}

/** Met la pendule en pause (fin de partie, abandon, offre de nulle acceptée). */
export function stopClock(clock: ClockState, now: number): ClockState {
  return { ...clock, remaining: remainingAt(clock, now), running: null, updatedAt: now }
}

/** Camp dont le temps est écoulé, ou `null`. */
export function flaggedColor(clock: ClockState, now: number): Color | null {
  if (!clock.running) return null
  if (clock.control.initial === 0) return null
  const remaining = remainingAt(clock, now)
  if (remaining.w <= 0) return 'w'
  if (remaining.b <= 0) return 'b'
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
//  Affichage
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formate un temps restant.
 * Sous dix secondes on affiche les dixièmes : c'est le moment où chaque
 * fraction compte, et voir le chiffre défiler fait monter la tension.
 */
export function formatClock(ms: number): string {
  if (ms <= 0) return '0:00'
  const totalSeconds = ms / 1000
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(Math.floor(seconds)).padStart(2, '0')}`
  }
  if (totalSeconds < 10) {
    return `${Math.floor(seconds)}.${Math.floor((seconds % 1) * 10)}`
  }
  return `${minutes}:${String(Math.floor(seconds)).padStart(2, '0')}`
}

/** Niveau d'urgence, pour colorer la pendule et déclencher un son. */
export function clockUrgency(ms: number, control: TimeControl): 'calm' | 'low' | 'critical' {
  if (control.initial === 0) return 'calm'
  const criticalThreshold = Math.max(10_000, control.initial * 1000 * 0.05)
  const lowThreshold = Math.max(30_000, control.initial * 1000 * 0.15)
  if (ms <= criticalThreshold) return 'critical'
  if (ms <= lowThreshold) return 'low'
  return 'calm'
}

/**
 * Temps recommandé pour ce coup, affiché en mode entraînement.
 * Répartit le temps restant sur les coups probablement restants, avec une garde
 * pour ne jamais tomber à zéro.
 */
export function suggestedThinkTimeMs(
  remainingMs: number,
  moveNumber: number,
  control: TimeControl,
): number {
  const expectedRemainingMoves = Math.max(12, 45 - moveNumber)
  const budget = remainingMs / expectedRemainingMoves + control.increment * 900
  return Math.max(500, Math.round(budget))
}
