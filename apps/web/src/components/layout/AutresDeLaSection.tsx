'use client'

/**
 * Le reste de la rubrique, au bas de sa page.
 *
 * Le menu déroulé répétait les trente entrées de la navigation, alors que la
 * page « Jouer » montre déjà ses six façons de jouer : on lisait deux fois la
 * même liste, une fois en petit dans un panneau, une fois en grand dans la
 * page. Les autres rubriques, elles, n'affichaient rien — « Ouvertures » ou
 * « Éditeur » ne s'atteignaient que par le menu.
 *
 * Chaque rubrique porte donc ses voisines en bas de ses pages, et le menu
 * n'a plus qu'à conduire aux rubriques. On descend une page, on voit ce qu'il
 * y a d'autre, on y va : c'est un niveau de navigation en moins pour le pouce.
 *
 * La liste vient de `SECTIONS`, comme l'en-tête et le menu — un seul endroit
 * de vérité. La page courante s'exclut d'elle-même : se proposer soi-même est
 * la meilleure façon de faire douter qu'on y soit déjà.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { SECTIONS } from '@/lib/navigation.ts'
import { useT } from '@/lib/i18n/index.tsx'

export function AutresDeLaSection({
  section: id,
  className,
}: {
  /** Identifiant de la rubrique dans `SECTIONS`. */
  section: string
  className?: string
}) {
  const pathname = usePathname()
  const t = useT()
  const section = SECTIONS.find((entree) => entree.id === id)
  if (!section) return null

  const autres = section.entrees.filter((entree) => {
    const chemin = entree.href.split(/[?#]/)[0] ?? entree.href
    // Une entrée qui porte une requête — « Défi du jour » sur `/puzzles?defi=1`
    // — reste proposée depuis la page nue : ce n'est pas le même écran.
    return chemin !== pathname || entree.href.includes('?')
  })
  if (autres.length === 0) return null

  return (
    <nav
      className={clsx('mt-6', className)}
      aria-label={`Le reste de la rubrique ${t(section.labelKey)}`}
    >
      <p
        className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: section.teinte }}
      >
        <section.icon size={12} aria-hidden />
        {t(section.labelKey)}
        <span
          aria-hidden
          className="h-px flex-1 rounded-full"
          style={{ background: `color-mix(in oklab, ${section.teinte} 30%, transparent)` }}
        />
      </p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {autres.map((entree) => {
          const Icone = entree.icon
          return (
            <Link
              key={entree.href}
              href={entree.href}
              className="flex min-h-11 items-center gap-2.5 rounded-[var(--radius-sm)] bg-surface/70 px-3 py-2 transition-colors hover:bg-surface-hover"
            >
              <Icone size={16} className="shrink-0" style={{ color: section.teinte }} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{t(entree.labelKey)}</span>
                {entree.hintKey && (
                  <span className="block truncate text-[11px] text-faint">{t(entree.hintKey)}</span>
                )}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
