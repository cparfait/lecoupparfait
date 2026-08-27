'use client'

/**
 * Navigation dans une partie : début, précédent, lecture, suivant, fin.
 *
 * Ces boutons existaient déjà, mais au bas de la liste des coups — c'est-à-dire
 * tout en bas à droite, hors du champ de vision de qui regarde l'échiquier, et
 * souvent hors de l'écran. On les place ici sous le plateau, là où le regard
 * est.
 *
 * Ils ne changent jamais la partie : reculer n'annule rien.
 */

import { useEffect } from 'react'
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import clsx from 'clsx'

export interface GameNavProps {
  /** Demi-coup affiché. `-1` = position de départ. */
  cursor: number
  /** Nombre de demi-coups joués. */
  count: number
  onSeek: (index: number) => void
  /** Défilement automatique — omis, le bouton lecture ne s'affiche pas. */
  autoplay?: boolean
  onToggleAutoplay?: () => void
  /**
   * Borne basse du curseur.
   *
   * L'analyse commente un coup : elle n'a rien à dire avant le premier, et
   * s'arrête donc à `0`. Une partie en cours, elle, sait montrer l'échiquier
   * initial, où le curseur vaut `-1`.
   */
  min?: number
  className?: string
}

export function GameNav({
  cursor,
  count,
  onSeek,
  autoplay,
  onToggleAutoplay,
  min = -1,
  className,
}: GameNavProps) {
  const last = count - 1
  const atStart = cursor <= min
  const atEnd = cursor >= last

  // Les flèches du clavier sont le réflexe acquis partout ailleurs. On laisse
  // les champs de saisie tranquilles, et les raccourcis système intacts.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      // La cible n'est pas toujours un élément : une touche pressée sans rien
      // de focalisé vise `document`, qui n'a pas de `closest`.
      const target = event.target
      if (
        target instanceof Element &&
        target.closest('input, textarea, select, [contenteditable="true"]')
      ) {
        return
      }

      switch (event.key) {
        case 'ArrowLeft':
          onSeek(Math.max(min, cursor - 1))
          break
        case 'ArrowRight':
          onSeek(Math.min(last, cursor + 1))
          break
        case 'Home':
          onSeek(min)
          break
        case 'End':
          onSeek(last)
          break
        default:
          return
      }
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cursor, last, min, onSeek])

  return (
    <div
      className={clsx(
        'flex items-center gap-0.5 rounded-[var(--radius-sm)] border border-line/60 p-0.5',
        className,
      )}
      role="group"
      aria-label="Revoir les coups"
    >
      <SeekButton onClick={() => onSeek(min)} disabled={atStart} label="Premier coup (Début)">
        <ChevronFirst size={16} aria-hidden />
      </SeekButton>
      <SeekButton
        onClick={() => onSeek(cursor - 1)}
        disabled={atStart}
        label="Coup précédent (flèche gauche)"
      >
        <ChevronLeft size={16} aria-hidden />
      </SeekButton>
      {onToggleAutoplay && (
        <SeekButton
          onClick={onToggleAutoplay}
          label={autoplay ? 'Interrompre la lecture' : 'Dérouler la partie coup par coup'}
          accent={autoplay}
        >
          {autoplay ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
        </SeekButton>
      )}
      <SeekButton
        onClick={() => onSeek(cursor + 1)}
        disabled={atEnd}
        label="Coup suivant (flèche droite)"
      >
        <ChevronRight size={16} aria-hidden />
      </SeekButton>
      <SeekButton onClick={() => onSeek(last)} disabled={atEnd} label="Dernier coup (Fin)">
        <ChevronLast size={16} aria-hidden />
      </SeekButton>
    </div>
  )
}

/**
 * Bouton de navigation.
 *
 * Volontairement discret : reculer d'un coup n'est pas une action de jeu, et
 * ces boutons voisinent avec « Abandonner ». Ce qu'il ne faut pas confondre,
 * c'est leur effet — d'où l'infobulle, qui nomme aussi la touche.
 */
function SeekButton({
  onClick,
  disabled,
  label,
  accent,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  label: string
  accent?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={clsx(
        'grid h-7 w-7 place-items-center rounded-[var(--radius-sm)] transition-colors hover:bg-surface-hover hover:text-ink disabled:cursor-default disabled:text-faint/40 disabled:hover:bg-transparent',
        accent ? 'text-accent' : 'text-muted',
      )}
    >
      {children}
    </button>
  )
}
