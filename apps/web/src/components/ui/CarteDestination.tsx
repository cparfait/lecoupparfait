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
 *   - ordinaire : sur grand écran, une grille de deux colonnes — l'icône et le
 *     titre sur la même ligne, la phrase et le détail dessous sur toute la
 *     largeur. L'icône était au-dessus du titre : trois lignes empilées pour
 *     ce qui en tient sur deux, et les huit portes de « Jouer » ne rentraient
 *     plus dans un écran. Sur téléphone, une rangée — icône, texte, flèche ;
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
        /* `grid-rows` : la phrase occupe la rangée souple, ce qui garde le
           détail contre le bas quand la grille étire les cartes à la même
           hauteur — ce que faisait `flex-1` dans la colonne. */
        !compacte &&
          'md:grid md:grid-cols-[auto_1fr] md:grid-rows-[auto_1fr_auto] md:items-center md:gap-x-3.5 md:gap-y-1.5 md:p-5',
        className,
      )}
      style={style}
    >
      <span
        className={clsx(
          'grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-sm)]',
          !compacte && 'md:h-12 md:w-12 md:rounded-[var(--radius)]',
        )}
        style={pastille}
        aria-hidden
      >
        <Icon size={22} />
      </span>

      {/* `md:contents` : au-delà de `md`, la boîte disparaît de la mise en
          page et ses trois enfants deviennent les cases de la grille — le
          titre à côté de l'icône, la phrase et le détail sur deux colonnes. */}
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
              !compacte && 'md:col-span-2 md:mt-0 md:self-start md:line-clamp-none md:leading-relaxed',
            )}
          >
            {phrase}
          </span>
        )}
        {detail && !compacte && (
          <span className="mt-4 hidden text-[12px] text-faint md:col-span-2 md:mt-2 md:block">
            {detail}
          </span>
        )}
      </span>

      <ArrowRight
        size={17}
        className={clsx(
          'absolute right-4 top-1/2 -translate-y-1/2 text-faint transition-all duration-200 group-hover:text-ink',
          /* Sur la ligne de l'icône : 20 px de marge + la moitié des 48 px de
             la pastille. Elle était calée sur le haut de la carte, où plus
             rien ne commence maintenant que le titre a rejoint l'icône. */
          !compacte && 'md:top-11 md:group-hover:translate-x-1',
        )}
        aria-hidden
      />
    </Link>
  )
}
