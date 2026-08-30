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
 *
 * Les deux boutons vivent sous le plateau, jamais dessus : posés dans le coin
 * haut-droit, ils masquaient les cases qui s'y trouvent — h8 vu des blancs, a1
 * vu des noirs — et, se trouvant au-dessus, captaient aussi le clic. La pièce
 * était donc à la fois invisible et injouable.
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
  /**
   * Place réservée au reste de la page, en `rem`.
   *
   * Un échiquier dimensionné sur la seule largeur devient, sur un écran large
   * et peu haut, plus grand que la fenêtre : on ne voit plus les pendules, la
   * barre d'actions ni les boutons sous le plateau. On lui donne donc aussi
   * une borne en hauteur, calculée sur ce que la page occupe autour de lui.
   *
   * Mesuré sur la page « contre l'ordinateur » : en-tête 57 px, marges 48 px,
   * bandeau adverse 56 px, bandeau joueur et barre d'actions 100 px — soit
   * 261 px, arrondis à 17 rem.
   */
  reservedHeight?: number
  /**
   * Prendre la place que le parent laisse, plutôt que de l'estimer.
   *
   * À réserver aux pages dont la colonne a une hauteur imposée : le plateau se
   * cale alors sur ce qui reste réellement, si bien qu'un bandeau apparaissant
   * au-dessous le rétrécit d'autant au lieu de pousser les pendules et la barre
   * d'actions hors de l'écran.
   *
   * On mesure au lieu d'écrire `max-height: 100%` : un pourcentage ne se
   * résout que contre une hauteur définie, et celle d'un élément flexible ne
   * l'est pas — la règle était donc ignorée. Le calcul ne boucle pas : le
   * conteneur tient sa hauteur du partage flex, pas de son contenu.
   */
  fitParentHeight?: boolean
}

/**
 * Taille en deçà de laquelle un échiquier ne s'utilise plus.
 *
 * Sur une fenêtre très basse, la borne en hauteur seule finirait par produire
 * un plateau de quelques centimètres : mieux vaut alors laisser la page
 * défiler que rendre les pièces incliquables.
 */
const MIN_BOARD_PX = 260

/**
 * Hauteur de la rangée des boutons, sous le plateau.
 *
 * Elle se retranche de la place disponible : sans cela, le plateau garderait sa
 * taille et la rangée déborderait de la colonne — ce qui repousserait hors de
 * l'écran la barre d'actions, exactement ce que `fitParentHeight` évite.
 *
 * 32 px de bouton, 2 px de gouttière et 6 px de marge haute.
 */
const TOGGLE_ROW_PX = 40

export function ChessBoard({
  showViewToggle = true,
  reservedHeight = 17,
  fitParentHeight = false,
  ...props
}: ChessBoardProps) {
  const view = usePreferences((state) => state.view)
  const containerRef = useRef<HTMLDivElement>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [fitSide, setFitSide] = useState<number | null>(null)
  const toggleRow = showViewToggle ? TOGGLE_ROW_PX : 0

  useEffect(() => {
    if (!fitParentHeight) return
    const area = containerRef.current?.parentElement
    if (!area) return

    const measure = () => {
      const box = area.getBoundingClientRect()
      const style = getComputedStyle(area)
      const height =
        box.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
      // Une hauteur nulle signifie que la colonne n'est pas encore posée : on
      // s'abstient plutôt que de réduire le plateau à rien.
      setFitSide(
        height > 0 ? Math.floor(Math.min(box.width, height - toggleRow)) : null,
      )
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(area)
    return () => observer.disconnect()
  }, [fitParentHeight, toggleRow])

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
        Le plateau est toujours carré, et la rangée de boutons se cale sur sa
        largeur. En affichage normal la colonne prend toute la largeur
        disponible ; en plein écran on lui impose explicitement le côté du plus
        petit bord de l'écran.

        C'est indispensable : `aspect-square w-full` seul donnerait, sur un
        écran large, un carré aussi haut que l'écran est large — donc un plateau
        qui déborde très largement vers le bas.
      */}
      <div
        className="flex flex-col"
        style={
          fullscreen
            ? {
                width: `min(100vw - 1.5rem, 100vh - 1.5rem - ${toggleRow}px)`,
              }
            : // `dvh` plutôt que `vh` : sur mobile, la barre d'adresse se
              // rétracte au défilement et `vh` reste figé sur la hauteur
              // maximale, ce qui redonne un plateau trop grand.
              {
                width:
                  fitSide != null
                    ? `${Math.max(MIN_BOARD_PX, fitSide)}px`
                    : `min(100%, max(${MIN_BOARD_PX}px, calc(100dvh - ${reservedHeight}rem - ${toggleRow}px)))`,
                marginInline: 'auto',
              }
        }
      >
        <div className="relative w-full" style={{ aspectRatio: '1 / 1' }}>
          {view === '3d' ? <Board3D {...props} /> : <Board2D {...props} />}
        </div>

        {showViewToggle && (
          <ViewToggle
            className="mt-1.5 self-end"
            fullscreen={fullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
        )}
      </div>
    </div>
  )
}

/**
 * Bascule 2D / 3D et plein écran.
 *
 * Volontairement gardée près de l'échiquier plutôt que reléguée dans les
 * préférences : c'est un choix qu'on refait souvent — la 3D pour admirer, la 2D
 * pour calculer. Près, mais pas dessus : un plateau n'a pas de marge, chaque
 * pixel du carré appartient à une case.
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
        'flex w-fit gap-0.5 rounded-full p-0.5',
        'popover !rounded-full shadow-[var(--shadow)]',
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
