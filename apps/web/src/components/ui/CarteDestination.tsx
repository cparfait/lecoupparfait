'use client'

/**
 * La carte de destination : une porte vers un écran.
 *
 * Chaque page-sommaire dessinait la sienne — grandes cartes et petites
 * rangées sur « Jouer », trois vitrines sur « S'entraîner », une liste étroite
 * sur « Outils » — et l'on changeait de grammaire en changeant de rubrique.
 * Une seule forme, ici : une pastille d'icône dans la teinte de la rubrique,
 * un titre, une phrase, un détail, une flèche.
 *
 * La teinte ne va que sur la pastille. La carte elle-même reste grise : c'est
 * la règle « une couleur, un rôle » de `globals.css`.
 *
 * Deux tailles :
 *   - ordinaire : sur grand écran, l'icône au-dessus du titre, le détail en
 *     bas ; sur téléphone, une rangée — icône, texte, flèche ;
 *   - compacte : toujours une rangée. Pour les listes longues et « Plus ».
 */

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { MouseEventHandler, ReactNode } from 'react'
import clsx from 'clsx'

export function CarteDestination({
  href,
  icon: Icon,
  teinte,
  titre,
  phrase,
  detail,
  badge,
  compacte = false,
  onClick,
  className,
  style,
}: {
  href: string
  icon: LucideIcon
  /** La teinte de la rubrique. Sans elle, la pastille est grise. */
  teinte?: string
  titre: ReactNode
  phrase?: ReactNode
  /** Une ligne de plus, en petit, sur la carte ordinaire à partir de `md`. */
  detail?: ReactNode
  /** Une pastille à côté du titre : « relevé », « nouveau ». */
  badge?: ReactNode
  compacte?: boolean
  onClick?: MouseEventHandler<HTMLAnchorElement>
  className?: string
  style?: React.CSSProperties
}) {
  const pastille = teinte
    ? {
        background: `color-mix(in oklab, ${teinte} 16%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${teinte} 30%, transparent)`,
        color: teinte,
      }
    : { background: 'var(--surface-strong)', color: 'var(--text-muted)' }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={clsx(
        'group glass relative flex items-center gap-3.5 overflow-hidden p-3.5 pr-11 transition-transform duration-200 hover:-translate-y-0.5',
        !compacte && 'md:flex-col md:items-stretch md:gap-0 md:p-5',
        className,
      )}
      style={style}
    >
      <span
        className={clsx(
          'grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-sm)]',
          !compacte && 'md:mb-4 md:h-12 md:w-12 md:rounded-[var(--radius)]',
        )}
        style={pastille}
        aria-hidden
      >
        <Icon size={22} />
      </span>

      {/* `md:contents` : au-delà de `md`, la boîte disparaît de la mise en
          page et ses enfants redeviennent ceux de la carte, ce qui rend au
          `flex-1` de la phrase son effet — pousser le détail contre le bas. */}
      <span className={clsx('min-w-0 flex-1', !compacte && 'md:contents')}>
        <span
          className={clsx(
            'flex flex-wrap items-center gap-2 text-[15px] font-semibold',
            !compacte && 'md:text-[17px]',
          )}
        >
          {titre}
          {badge}
        </span>
        {phrase && (
          <span
            className={clsx(
              'mt-0.5 line-clamp-2 block text-[14px] leading-snug text-muted',
              !compacte && 'md:mt-1.5 md:line-clamp-none md:flex-1 md:leading-relaxed',
            )}
          >
            {phrase}
          </span>
        )}
        {detail && !compacte && (
          <span className="mt-4 hidden text-[12px] text-faint md:block">{detail}</span>
        )}
      </span>

      <ArrowRight
        size={17}
        className={clsx(
          'absolute right-4 top-1/2 -translate-y-1/2 text-faint transition-all duration-200 group-hover:text-ink',
          !compacte && 'md:top-5 md:translate-y-0 md:group-hover:translate-x-1',
        )}
        aria-hidden
      />
    </Link>
  )
}
