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
import { ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { SECTIONS } from '@/lib/navigation.ts'
import { useT } from '@/lib/i18n/index.tsx'

/** Les trois accents du thème, pour distinguer les entrées les unes des autres. */
const TEINTES = ['var(--accent)', 'var(--accent-2)', 'var(--accent-3)']

export function AutresDeLaSection({
  section: id,
  className,
  colonne = false,
}: {
  /** Identifiant de la rubrique dans `SECTIONS`. */
  section: string
  className?: string
  /**
   * Une seule colonne, quel que soit l'écran.
   *
   * Dans la colonne latérale d'un puzzle — trois cents pixels —, deux cartes
   * côte à côte n'ont plus la place d'un mot : on lisait « Puzzl… » et
   * « Défi d… ». Empilées, elles gardent leur libellé et leur sous-titre.
   */
  colonne?: boolean
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
      className={clsx(colonne ? 'mt-6' : 'mt-10', className)}
      aria-label={`Le reste de la rubrique ${t(section.labelKey)}`}
    >
      {/* ── Un vrai titre, et non plus une étiquette ────────────────────
          Le bloc était une liste de rangées grises sous un libellé en
          capitales de onze pixels, toutes de la même teinte : quatre lignes
          qui se ressemblaient, en bas d'une page longue, et qu'on prenait pour
          un pied de page. C'est pourtant la seule passerelle entre les écrans
          d'une même rubrique. */}
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-sm)]"
          style={{ background: `color-mix(in oklab, ${section.teinte} 16%, transparent)` }}
          aria-hidden
        >
          <section.icon size={16} style={{ color: section.teinte }} />
        </span>
        <p className="font-display text-lg font-semibold tracking-tight">
          Aussi dans {t(section.labelKey)}
        </p>
        <span
          aria-hidden
          className="h-px flex-1 rounded-full"
          style={{ background: `color-mix(in oklab, ${section.teinte} 30%, transparent)` }}
        />
      </div>

      <div className={clsx('grid gap-2', !colonne && 'sm:grid-cols-2')}>
        {autres.map((entree, index) => {
          const Icone = entree.icon
          /*
            Une teinte par entrée, prise dans la palette du thème.

            Toutes portaient la couleur de la rubrique : quatre pastilles
            identiques, qu'on ne distinguait qu'en lisant. La couleur ne
            classe rien ici — elle sépare, ce qui est déjà tout ce qu'on lui
            demande pour parcourir quatre cartes du regard. Jamais de valeur
            en dur : chaque thème redéfinit ces trois variables.
          */
          const teinte = TEINTES[index % TEINTES.length]!
          return (
            <Link
              key={entree.href}
              href={entree.href}
              /* L'entrée se soulève au survol, comme les portes des pages de
                 rubrique : c'est le même geste, il doit se sentir pareil. */
              className="animate-slide-up group flex min-h-14 items-center gap-3 overflow-hidden rounded-[var(--radius)] border border-line bg-surface/70 px-3 py-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:bg-surface-hover"
              style={{
                animationDelay: `${index * 60}ms`,
                boxShadow: `inset 3px 0 0 0 color-mix(in oklab, ${teinte} 55%, transparent)`,
              }}
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-sm)] transition-transform duration-300 group-hover:scale-110"
                style={{ background: `color-mix(in oklab, ${teinte} 16%, transparent)` }}
                aria-hidden
              >
                <Icone size={17} style={{ color: teinte }} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{t(entree.labelKey)}</span>
                {entree.hintKey && (
                  <span className="block truncate text-[12px] leading-snug text-faint">
                    {t(entree.hintKey)}
                  </span>
                )}
              </span>
              <ChevronRight
                size={16}
                className="shrink-0 text-faint transition-transform duration-300 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
