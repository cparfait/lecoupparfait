'use client'

/**
 * Liste des coups.
 *
 * Deux colonnes, numérotées comme dans un livre — c'est la présentation que
 * tout joueur d'échecs sait lire. Chaque coup peut porter une pastille de
 * qualité issue de l'analyse.
 *
 * La liste défile automatiquement pour garder le coup courant visible, et se
 * pilote entièrement au clavier : flèches pour naviguer, Origine et Fin pour
 * les extrémités.
 */

import { useEffect, useRef } from 'react'
import clsx from 'clsx'
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from 'lucide-react'
import type { MoveQuality } from '@coupparfait/core'
import { QUALITY_STYLES } from '@coupparfait/core'
import { groupMoves, type PlayedMove } from '@/lib/game/useChessGame.ts'
import { useSan } from '@/lib/notation.ts'
import { usePreferences } from '@/lib/store/preferences.ts'

export interface MoveListProps {
  moves: PlayedMove[]
  cursor: number
  onSeek: (ply: number) => void
  /** Qualité de chaque demi-coup, si la partie a été analysée. */
  qualities?: Record<number, MoveQuality>
  startFen?: string
  className?: string
  /** Affiche la barre de navigation sous la liste. */
  controls?: boolean
  autoplay?: boolean
  onToggleAutoplay?: () => void
}

export function MoveList({
  moves,
  cursor,
  onSeek,
  qualities,
  startFen,
  className,
  controls = true,
  autoplay,
  onToggleAutoplay,
}: MoveListProps) {
  const locale = usePreferences((state) => state.locale)
  const format = useSan()
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  const rows = groupMoves(moves, startFen)

  // Garde le coup courant dans le champ de vision, sans secousse.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [cursor])

  // Navigation au clavier, active dès que la page a le focus.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      // On ne détourne pas les flèches si l'utilisateur écrit quelque part.
      if (target && /input|textarea|select/i.test(target.tagName)) return

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          onSeek(Math.max(-1, cursor - 1))
          break
        case 'ArrowRight':
          event.preventDefault()
          onSeek(Math.min(moves.length - 1, cursor + 1))
          break
        case 'Home':
          event.preventDefault()
          onSeek(-1)
          break
        case 'End':
          event.preventDefault()
          onSeek(moves.length - 1)
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [cursor, moves.length, onSeek])

  return (
    <div className={clsx('flex min-h-0 flex-col', className)}>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        role="list"
        aria-label="Liste des coups"
      >
        {rows.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-faint">
            Les coups joués apparaîtront ici.
          </p>
        ) : (
          <ol className="text-[13px]">
            {rows.map((row) => (
              <li
                key={row.number}
                className="grid grid-cols-[2.4rem_1fr_1fr] items-stretch border-b border-line/40 last:border-0"
              >
                <span className="grid place-items-center bg-surface/40 text-[11px] font-semibold tabular-nums text-faint">
                  {row.number}
                </span>
                <MoveCell
                  move={row.white}
                  ply={row.whitePly}
                  active={cursor === row.whitePly}
                  quality={qualities?.[row.whitePly]}
                  locale={locale}
                  format={format}
                  onSeek={onSeek}
                  ref={cursor === row.whitePly ? activeRef : undefined}
                />
                <MoveCell
                  move={row.black}
                  ply={row.blackPly}
                  active={cursor === row.blackPly}
                  quality={qualities?.[row.blackPly]}
                  locale={locale}
                  format={format}
                  onSeek={onSeek}
                  ref={cursor === row.blackPly ? activeRef : undefined}
                />
              </li>
            ))}
          </ol>
        )}
      </div>

      {controls && (
        <div className="flex items-center justify-center gap-0.5 border-t border-line/60 p-1.5">
          <NavButton onClick={() => onSeek(-1)} disabled={cursor < 0} label="Début">
            <ChevronFirst size={17} aria-hidden />
          </NavButton>
          <NavButton
            onClick={() => onSeek(cursor - 1)}
            disabled={cursor < 0}
            label="Coup précédent"
          >
            <ChevronLeft size={17} aria-hidden />
          </NavButton>
          {onToggleAutoplay && (
            <NavButton onClick={onToggleAutoplay} label={autoplay ? 'Pause' : 'Lecture'}>
              {autoplay ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
            </NavButton>
          )}
          <NavButton
            onClick={() => onSeek(cursor + 1)}
            disabled={cursor >= moves.length - 1}
            label="Coup suivant"
          >
            <ChevronRight size={17} aria-hidden />
          </NavButton>
          <NavButton
            onClick={() => onSeek(moves.length - 1)}
            disabled={cursor >= moves.length - 1}
            label="Fin"
          >
            <ChevronLast size={17} aria-hidden />
          </NavButton>
        </div>
      )}
    </div>
  )
}

const MoveCell = function MoveCell({
  move,
  ply,
  active,
  quality,
  locale,
  format,
  onSeek,
  ref,
}: {
  move: PlayedMove | null
  ply: number
  active: boolean
  quality?: MoveQuality
  locale: 'fr' | 'en'
  /** Écriture des coups, accordée aux préférences. */
  format: (san: string) => string
  onSeek: (ply: number) => void
  ref?: React.Ref<HTMLButtonElement>
}) {
  if (!move) return <span className="px-2 py-1.5" />

  const san = format(move.san)
  const style = quality ? QUALITY_STYLES[quality] : null
  // Les coups ordinaires ne méritent pas de pastille : on ne signale que ce qui
  // sort de l'ordinaire, sinon la liste devient un sapin de Noël illisible.
  const worthShowing =
    style &&
    quality !== 'excellent' &&
    quality !== 'good' &&
    quality !== 'forced'

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onSeek(ply)}
      className={clsx(
        'flex items-center gap-1 px-2 py-1.5 text-left font-medium transition-colors',
        active ? 'bg-accent/18 text-ink ring-1 ring-inset ring-accent/40' : 'hover:bg-surface-hover',
      )}
      aria-current={active ? 'true' : undefined}
    >
      <span className="truncate">{san}</span>
      {worthShowing && (
        <span
          className="ml-auto shrink-0 text-[11px] font-bold leading-none"
          style={{ color: `var(--q-${style.token})` }}
          title={style.label[locale]}
        >
          {style.glyph}
        </span>
      )}
    </button>
  )
}

function NavButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid h-8 w-9 place-items-center rounded-[var(--radius-sm)] text-muted transition-colors hover:bg-surface-hover hover:text-ink disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  )
}
