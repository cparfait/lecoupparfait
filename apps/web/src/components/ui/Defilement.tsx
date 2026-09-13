'use client'

/**
 * Une rangée qui défile de côté, avec des flèches pour le dire.
 *
 * Les pastilles de thème d'un puzzle, les vignettes des adversaires : des
 * rangées plus larges que l'écran, qu'on fait glisser au doigt. Elles
 * montraient une réglette de défilement sous leur contenu — une barre grise
 * qui n'indique rien de clair et prend une ligne — ou, sans elle, plus rien du
 * tout : le contenu coupé sur le bord était le seul indice qu'il continuait,
 * et personne ne l'avait lu comme tel.
 *
 * La réglette disparaît, et deux flèches prennent le relais, chacune posée
 * sur le bord où il reste quelque chose à voir. Elles s'effacent d'elles-mêmes
 * quand la rangée tient dans l'écran, et elles se cliquent : à la souris, où
 * glisser une rangée n'est pas un geste naturel, c'est même le seul moyen.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode, Ref } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { useT } from '@/lib/i18n/index.tsx'

export function Defilement({
  children,
  className,
  classeRangee,
  label,
  role,
  ref,
}: {
  children: ReactNode
  /** Sur l'enveloppe : marges, placement. */
  className?: string
  /** Sur la rangée qui défile : écart, rembourrage. */
  classeRangee?: string
  label?: string
  role?: string
  /** La rangée elle-même, pour qui veut la faire défiler vers un élément. */
  ref?: Ref<HTMLDivElement>
}) {
  const rangee = useRef<HTMLDivElement | null>(null)
  const [avant, setAvant] = useState(false)
  const [apres, setApres] = useState(false)

  const mesurer = useCallback(() => {
    const element = rangee.current
    if (!element) return
    // Quatre pixels de tolérance : un défilement à sous-pixel près laisse
    // sinon une flèche allumée pour rien tout au bout de la rangée.
    setAvant(element.scrollLeft > 4)
    setApres(element.scrollLeft + element.clientWidth < element.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const element = rangee.current
    if (!element) return
    mesurer()
    const observateur = new ResizeObserver(mesurer)
    observateur.observe(element)
    for (const enfant of element.children) observateur.observe(enfant)
    return () => observateur.disconnect()
  }, [mesurer, children])

  const glisser = (sens: -1 | 1) => {
    const element = rangee.current
    if (!element) return
    element.scrollBy({ left: sens * element.clientWidth * 0.7, behavior: 'smooth' })
  }

  const poserRef = (element: HTMLDivElement | null) => {
    rangee.current = element
    if (typeof ref === 'function') ref(element)
    else if (ref) ref.current = element
  }

  return (
    <div className={clsx('relative min-w-0', className)}>
      <div
        ref={poserRef}
        role={role}
        aria-label={label}
        onScroll={mesurer}
        className={clsx('flex overflow-x-auto sans-barre', classeRangee)}
      >
        {children}
      </div>
      {avant && <Fleche sens={-1} onClick={() => glisser(-1)} />}
      {apres && <Fleche sens={1} onClick={() => glisser(1)} />}
    </div>
  )
}

/**
 * La flèche, posée sur un dégradé du fond de page : le contenu passe
 * dessous en s'estompant, ce qui dit mieux qu'un trait qu'il continue.
 */
function Fleche({ sens, onClick }: { sens: -1 | 1; onClick: () => void }) {
  const t = useT()
  const Icone = sens < 0 ? ChevronLeft : ChevronRight
  return (
    <div
      className={clsx(
        'pointer-events-none absolute inset-y-0 flex w-14 items-center',
        sens < 0
          ? 'left-0 justify-start bg-gradient-to-r from-[var(--bg)] to-transparent'
          : 'right-0 justify-end bg-gradient-to-l from-[var(--bg)] to-transparent',
      )}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={t(sens < 0 ? 'rest.rowStart' : 'rest.rowNext')}
        className="pointer-events-auto grid h-8 w-8 place-items-center rounded-full popover text-ink transition-colors hover:bg-surface-hover"
      >
        <Icone size={16} aria-hidden />
      </button>
    </div>
  )
}
