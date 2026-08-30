'use client'

/**
 * Menu déroulant : un bouton, un panneau, et les gestes qu'on attend.
 *
 * Extrait de `ThemeQuickSwitch`, qui en contenait déjà la mécanique complète.
 * L'en-tête en compte désormais cinq : sans mise en commun, on aurait six
 * implémentations de la même chose, et elles auraient dérivé — c'est toujours
 * la fermeture au clic extérieur qu'on oublie dans la sixième.
 *
 * Ouverture **au clic**, jamais au survol : un menu qui se déploie au passage
 * de la souris s'ouvre par accident dès qu'on vise le lien d'en dessous.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import clsx from 'clsx'

/**
 * Referme au clic extérieur et à la touche Échap.
 *
 * `pointerdown` plutôt que `click` : un menu qui ne se referme qu'au relâchement
 * reste ouvert pendant tout un glisser-déposer commencé ailleurs.
 */
export function useFermetureExterieure(
  ouvert: boolean,
  fermer: () => void,
): React.RefObject<HTMLDivElement | null> {
  const conteneur = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ouvert) return
    const surPointeur = (evenement: PointerEvent) => {
      if (!conteneur.current?.contains(evenement.target as Node)) fermer()
    }
    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.key === 'Escape') fermer()
    }
    document.addEventListener('pointerdown', surPointeur)
    document.addEventListener('keydown', surTouche)
    return () => {
      document.removeEventListener('pointerdown', surPointeur)
      document.removeEventListener('keydown', surTouche)
    }
  }, [ouvert, fermer])

  return conteneur
}

export function Menu({
  declencheur,
  children,
  label,
  align = 'left',
  sens = 'bas',
  largeur = 'w-64',
  className,
}: {
  /** Contenu du bouton. Reçoit l'état d'ouverture pour orienter un chevron. */
  declencheur: (ouvert: boolean) => ReactNode
  children: ReactNode
  /** Nom accessible du menu. */
  label: string
  align?: 'left' | 'right'
  /**
   * Sens d'ouverture du panneau.
   *
   * `haut` pour un déclencheur posé en bas de fenêtre — la barre d'actions
   * d'une partie, par exemple. Un panneau qui s'ouvre vers le bas y sort du
   * cadre : on voit les deux premières entrées et les suivantes n'existent
   * plus, sans même un défilement pour les atteindre.
   */
  sens?: 'bas' | 'haut'
  largeur?: string
  className?: string
}) {
  const [ouvert, setOuvert] = useState(false)
  const fermer = useCallback(() => setOuvert(false), [])
  const conteneur = useFermetureExterieure(ouvert, fermer)
  const panneauId = useId()
  const boutonRef = useRef<HTMLButtonElement>(null)

  /**
   * Navigation au clavier dans le panneau.
   *
   * Les flèches parcourent les entrées, `Échap` referme **et rend le focus au
   * bouton** — sans ce retour, on se retrouve projeté en haut du document et il
   * faut retraverser toute la page à la tabulation pour revenir où l'on était.
   */
  const surToucheDuPanneau = useCallback(
    (evenement: React.KeyboardEvent<HTMLDivElement>) => {
      if (evenement.key === 'Escape') {
        setOuvert(false)
        boutonRef.current?.focus()
        return
      }
      if (evenement.key !== 'ArrowDown' && evenement.key !== 'ArrowUp') return

      const cibles = Array.from(
        evenement.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
      )
      if (cibles.length === 0) return
      evenement.preventDefault()

      const courant = cibles.indexOf(document.activeElement as HTMLElement)
      const pas = evenement.key === 'ArrowDown' ? 1 : -1
      const suivant = (courant + pas + cibles.length) % cibles.length
      cibles[suivant]?.focus()
    },
    [],
  )

  return (
    <div ref={conteneur} className={clsx('relative', className)}>
      <button
        ref={boutonRef}
        type="button"
        onClick={() => setOuvert((valeur) => !valeur)}
        aria-haspopup="menu"
        aria-expanded={ouvert}
        aria-controls={ouvert ? panneauId : undefined}
        className={clsx(
          'flex items-center gap-1 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm font-medium transition-colors',
          ouvert ? 'bg-surface-hover text-ink' : 'text-muted hover:bg-surface-hover hover:text-ink',
        )}
      >
        {declencheur(ouvert)}
      </button>

      {ouvert && (
        <div
          id={panneauId}
          role="menu"
          aria-label={label}
          onKeyDown={surToucheDuPanneau}
          onClick={fermer}
          className={clsx(
            'animate-slide-up popover absolute z-50 p-1.5 shadow-[var(--shadow-lg)]',
            // Un plafond de hauteur avec défilement : même dans le bon sens,
            // un panneau plus grand que la fenêtre reste inaccessible par le
            // bas. Là, on peut au moins l'atteindre.
            'max-h-[70dvh] overflow-y-auto',
            largeur,
            align === 'right' ? 'right-0' : 'left-0',
            sens === 'haut' ? 'bottom-11' : 'top-11',
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}
