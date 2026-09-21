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
  /*
    La pastille n'est plus un aplat : un dégradé de la teinte, franc dans le
    coin éclairé et presque éteint à l'opposé, un liseré interne, et l'icône
    en pleine teinte. C'est le seul objet coloré de la carte — mais il doit
    l'être franchement, sinon six cartes grises font une grille de bureau.
  */
  const pastille = teinte
    ? {
        background: `linear-gradient(135deg, color-mix(in oklab, ${teinte} 34%, transparent), color-mix(in oklab, ${teinte} 10%, transparent))`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${teinte} 36%, transparent), inset 0 1px 0 color-mix(in oklab, white 18%, transparent)`,
        color: teinte,
      }
    : { background: 'var(--surface-strong)', color: 'var(--text-muted)' }
  const halo = teinte ? ({ '--teinte-porte': teinte } as React.CSSProperties) : undefined

  return (
    <Link
      href={href}
      onClick={onClick}
      className={clsx(
        'group glass carte-porte relative flex items-center gap-3.5 overflow-hidden p-4 pr-14',
        /* En tuile à partir de `md` : la pastille en haut, la flèche en face
           d'elle, le titre sur sa propre ligne, la phrase, et le détail
           calé en bas. Rien ne se cogne, quelle que soit la colonne. */
        !compacte && 'md:flex-col md:items-start md:gap-0 md:p-5 md:pr-5',
        className,
      )}
      style={{ ...halo, ...style }}
    >
      <span
        className={clsx(
          'relative grid h-12 w-12 shrink-0 place-items-center rounded-[14px] transition-transform duration-300 group-hover:scale-105',
          !compacte && 'md:h-14 md:w-14 md:rounded-[16px]',
        )}
        style={pastille}
        aria-hidden
      >
        <Icon size={compacte ? 22 : 24} strokeWidth={1.9} />
      </span>

      {/* `md:contents` : au-delà de `md`, la boîte disparaît de la mise en
          page et ses trois enfants deviennent les cases de la grille — le
          titre à côté de l'icône, la phrase et le détail sur deux colonnes. */}
      <span
        className={clsx(
          'min-w-0 flex-1',
          !compacte && 'md:mt-4 md:flex md:w-full md:flex-1 md:flex-col',
        )}
      >
        <span
          className={clsx(
            'flex flex-wrap items-center gap-2 font-display text-[16px] font-bold tracking-[-0.015em]',
            !compacte && 'md:text-[18px] md:leading-tight',
          )}
        >
          {titre}
          {badge}
        </span>
        {phrase && (
          <span
            className={clsx(
              'mt-0.5 line-clamp-2 block text-[14px] leading-snug text-muted',
              !compacte && 'md:mt-1.5 md:line-clamp-none md:leading-relaxed',
            )}
          >
            {phrase}
          </span>
        )}
        {detail && !compacte && (
          <span className="mt-auto hidden pt-4 text-[12px] text-faint md:block">{detail}</span>
        )}
      </span>

      {/* La flèche vit dans un disque : gris et discret au repos, il se
          remplit de l'accent et glisse vers la droite au survol. C'est le
          geste qui dit « ceci s'ouvre » — la carte entière est le lien, mais
          l'œil cherche où appuyer. */}
      <span
        className={clsx(
          'absolute right-4 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full',
          'bg-surface-strong text-muted ring-1 ring-line transition-all duration-300',
          'group-hover:translate-x-0.5 group-hover:bg-accent group-hover:text-[var(--accent-contrast)] group-hover:ring-transparent group-hover:shadow-[0_6px_18px_-6px_var(--accent)]',
          /* Sur la ligne de la pastille : 20 px de marge + la moitié de ses
             56 px. */
          !compacte && 'md:top-12',
        )}
        aria-hidden
      >
        <ArrowRight size={16} strokeWidth={2.2} />
      </span>
    </Link>
  )
}
