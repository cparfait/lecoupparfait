'use client'

/**
 * Échiquier commutable.
 *
 * Expose une seule interface pour les deux rendus et permet d'alterner en
 * pleine partie. Le composant 3D n'est chargé que si on le demande : sans cela,
 * Three.js pèserait sur le premier affichage de chaque page, y compris pour les
 * joueurs qui ne quitteront jamais la 2D.
 *
 * Le plein écran est proposé pour les deux vues, mais il compte surtout en 3D :
 * la perspective réclame de la place, et sur un ordinateur portable l'échiquier
 * partage l'écran avec la liste des coups et le panneau du coach.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Box, Grid2x2, Maximize2, Minimize2 } from 'lucide-react'
import clsx from 'clsx'
import { Board2D, type Board2DProps } from './Board2D.tsx'
import { usePreferences } from '@/lib/store/preferences.ts'
import { useT } from '@/lib/i18n/index.tsx'

const Board3D = dynamic(() => import('./Board3D.tsx').then((m) => m.Board3D), {
  ssr: false,
  loading: () => (
    <div className="grid aspect-square w-full place-items-center rounded-[var(--radius)] glass">
      <span className="text-sm text-muted">Chargement de la 3D…</span>
    </div>
  ),
})

export interface ChessBoardProps extends Board2DProps {
  /** Affiche les boutons de bascule 2D / 3D et de plein écran. */
  showViewToggle?: boolean
}

export function ChessBoard({ showViewToggle = true, ...props }: ChessBoardProps) {
  const view = usePreferences((state) => state.view)
  const containerRef = useRef<HTMLDivElement>(null)
  const [fullscreen, setFullscreen] = useState(false)

  // L'utilisateur peut sortir du plein écran par la touche Échap sans passer
  // par notre bouton : on suit donc l'état réel du document.
  useEffect(() => {
    const onChange = () => {
      setFullscreen(document.fullscreenElement === containerRef.current)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = useCallback(() => {
    const element = containerRef.current
    if (!element) return

    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {
        // Sortie refusée : l'état sera resynchronisé par l'événement.
      })
      return
    }
    void element.requestFullscreen?.().catch(() => {
      // Certains navigateurs mobiles refusent le plein écran sur un élément
      // quelconque. Ce n'est pas bloquant, on reste en affichage normal.
    })
  }, [])

  return (
    <div
      ref={containerRef}
      className={clsx(
        'relative w-full',
        fullscreen && 'grid place-items-center bg-[var(--bg)]',
      )}
      // En plein écran, le conteneur occupe tout l'écran et centre le plateau.
      style={fullscreen ? { width: '100vw', height: '100vh' } : undefined}
    >
      {/*
        Le plateau est toujours carré. En affichage normal il prend toute la
        largeur disponible ; en plein écran on lui impose explicitement le côté
        du plus petit bord de l'écran.

        C'est indispensable : `aspect-square w-full` seul donnerait, sur un
        écran large, un carré aussi haut que l'écran est large — donc un plateau
        qui déborde très largement vers le bas.
      */}
      <div
        className="relative"
        style={
          fullscreen
            ? {
                width: 'min(100vw - 1.5rem, 100vh - 1.5rem)',
                height: 'min(100vw - 1.5rem, 100vh - 1.5rem)',
              }
            : { width: '100%' }
        }
      >
        {view === '3d' ? <Board3D {...props} /> : <Board2D {...props} />}

        {showViewToggle && (
          <ViewToggle fullscreen={fullscreen} onToggleFullscreen={toggleFullscreen} />
        )}
      </div>
    </div>
  )
}

/**
 * Bascule 2D / 3D et plein écran.
 *
 * Volontairement posée sur l'échiquier plutôt que reléguée dans les
 * préférences : c'est un choix qu'on refait souvent — la 3D pour admirer, la 2D
 * pour calculer.
 */
export function ViewToggle({
  className,
  fullscreen,
  onToggleFullscreen,
}: {
  className?: string
  fullscreen?: boolean
  onToggleFullscreen?: () => void
}) {
  const view = usePreferences((state) => state.view)
  const setPreference = usePreferences((state) => state.set)
  const t = useT()

  return (
    <div
      className={clsx(
        'absolute right-2 top-2 z-50 flex gap-0.5 rounded-full p-0.5',
        'glass-strong shadow-[var(--shadow)]',
        className,
      )}
      role="group"
      aria-label={t('game.switchView')}
    >
      {(
        [
          { id: '2d', icon: Grid2x2, label: t('game.view2D') },
          { id: '3d', icon: Box, label: t('game.view3D') },
        ] as const
      ).map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => setPreference('view', id)}
          aria-pressed={view === id}
          title={label}
          className={clsx(
            'grid h-8 w-8 place-items-center rounded-full transition-all',
            view === id
              ? 'bg-accent text-[var(--accent-contrast)] shadow-[var(--glow)]'
              : 'text-muted hover:text-ink hover:bg-surface-hover',
          )}
        >
          <Icon size={15} strokeWidth={2.2} aria-hidden />
          <span className="sr-only">{label}</span>
        </button>
      ))}

      {onToggleFullscreen && (
        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-pressed={fullscreen}
          title={fullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          className="grid h-8 w-8 place-items-center rounded-full text-muted transition-all hover:bg-surface-hover hover:text-ink"
        >
          {fullscreen ? (
            <Minimize2 size={15} strokeWidth={2.2} aria-hidden />
          ) : (
            <Maximize2 size={15} strokeWidth={2.2} aria-hidden />
          )}
          <span className="sr-only">
            {fullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          </span>
        </button>
      )}
    </div>
  )
}
