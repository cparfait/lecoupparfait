'use client'

/**
 * « Ton palier » : la seule échelle de niveau de l'accueil.
 *
 * L'accueil affichait jusqu'ici plusieurs nombres de niveau à la fois — le
 * classement par cadence dans le profil, l'Elo des adversaires, les points de
 * carrière — sans dire lequel répondait à « où j'en suis ? ». La réponse que
 * l'application donne partout ailleurs, ce sont les six paliers : c'est donc
 * la seule échelle qu'on montre ici. Le niveau estimé s'écrit en petit, comme
 * la borne qui le situe dans son palier, et jamais comme un classement.
 *
 * Le palier est celui de la page `/apprendre/palier`, calculé de la même
 * façon (`useNiveauRetenu`) : les deux écrans doivent dire la même chose.
 *
 * Sans aucun niveau connu, la carte n'invente rien : elle invite au test.
 */

import Link from 'next/link'
import { ChevronRight, Target } from 'lucide-react'
import clsx from 'clsx'
import { ButtonLink, Skeleton } from '@/components/ui/index.tsx'
import { PALIERS, palierPour, type Palier } from '@/lib/apprendre/palier.ts'
import { useNiveauRetenu } from '@/lib/apprendre/useNiveauRetenu.ts'
import { useT } from '@/lib/i18n/index.tsx'
import { PAS_DU_TEST } from '@coupparfait/core'

/** Largeur « visuelle » du dernier palier, qui n'a pas de borne haute. */
const ETENDUE_DU_DERNIER = 300

/** Où l'on en est dans son palier, de 0 à 1. */
function avancement(palier: Palier, elo: number): number {
  const etendue = Number.isFinite(palier.max) ? palier.max + 1 - palier.min : ETENDUE_DU_DERNIER
  return Math.max(0, Math.min(1, (elo - palier.min) / etendue))
}

function bornes(palier: Palier, t: ReturnType<typeof useT>): string {
  return Number.isFinite(palier.max)
    ? t('chemin.tierBounds', { min: palier.min, max: palier.max })
    : t('chemin.tierBoundsTop', { min: palier.min })
}

export function CartePalier() {
  const t = useT()
  const niveau = useNiveauRetenu()

  if (niveau === undefined) return <Skeleton className="h-36 w-full rounded-[var(--radius)]" />

  if (niveau === null) {
    return (
      <section aria-labelledby="ton-palier" className="glass flex flex-col gap-2.5 p-4 lg:p-6">
        <span className="text-[12px] font-semibold text-faint lg:text-[13px]">
          {t('chemin.tierUnknown')}
        </span>
        <h2
          id="ton-palier"
          className="font-display text-[1.25rem] font-bold leading-tight tracking-tight lg:text-[1.6rem]"
        >
          {t('chemin.noLevelTitle')}
        </h2>
        <p className="text-[14px] leading-relaxed text-muted">
          {t('chemin.noLevelText', { n: PAS_DU_TEST.length, total: PALIERS.length })}
        </p>
        <ButtonLink
          href="/apprendre/niveau"
          variant="secondary"
          size="md"
          icon={<Target size={15} />}
          className="mt-1 self-start"
        >
          {t('chemin.takeTest')}
        </ButtonLink>
      </section>
    )
  }

  const palier = palierPour(niveau.elo)
  const index = PALIERS.findIndex((entree) => entree.id === palier.id)
  const fraction = avancement(palier, niveau.elo)

  return (
    <section
      aria-labelledby="ton-palier"
      className="glass flex flex-col gap-2.5 p-4 lg:gap-3.5 lg:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <span className="text-[12px] font-semibold text-faint lg:text-[13px]">
            {t('chemin.tierOf', { n: index + 1, total: PALIERS.length })}
            {/* Sur bureau, le niveau estimé monte à côté du rang du palier : la
                ligne du bas porte déjà les bornes de chacun des six. */}
            <span className="hidden lg:inline">
              {' · '}
              {t('chemin.estimatedAt', { elo: niveau.elo })}
            </span>
          </span>
          <h2
            id="ton-palier"
            className="mt-1 font-display text-[1.25rem] font-bold leading-tight tracking-tight lg:text-[1.6rem]"
          >
            {t(palier.nom)}
          </h2>
        </div>
        <Link
          href="/apprendre/palier"
          className="hidden min-h-11 items-center gap-1 text-[14px] font-semibold text-[var(--accent-text)] hover:underline lg:inline-flex"
        >
          {t('chemin.whatCostsPoints')}
        </Link>
      </div>

      {/* Six segments, un par palier : ceux d'en dessous pleins, le sien rempli
          à proportion, ceux d'au-dessus vides. Sur bureau, chaque segment porte
          ses bornes et son nom. */}
      <div
        role="img"
        aria-label={t('chemin.tierAria', {
          n: index + 1,
          total: PALIERS.length,
          pct: Math.round(fraction * 100),
        })}
        className="grid gap-1 lg:gap-1.5"
        style={{ gridTemplateColumns: `repeat(${PALIERS.length}, minmax(0, 1fr))` }}
      >
        {PALIERS.map((entree, i) => (
          <div key={entree.id} className="flex min-w-0 flex-col gap-2">
            <div className="h-2 overflow-hidden rounded-full bg-surface-strong">
              <div
                className="h-full rounded-full bg-[var(--rub-apprendre)]"
                style={{ width: i < index ? '100%' : i === index ? `${fraction * 100}%` : '0%' }}
              />
            </div>
            <span className="hidden text-[12px] leading-snug text-faint lg:block" aria-hidden>
              {bornes(entree, t)}
              <br />
              <span className={clsx(i === index ? 'font-semibold text-ink' : 'text-muted')}>
                {t(entree.nom)}
              </span>
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 lg:hidden">
        <span className="text-[13px] text-muted">
          {bornes(palier, t)} · {t('chemin.estimatedAt', { elo: niveau.elo })}
        </span>
        <Link
          href="/apprendre/palier"
          className="-my-3 inline-flex min-h-11 items-center gap-0.5 text-end text-[13px] font-semibold text-[var(--accent-text)]"
        >
          {t('chemin.whatCostsPoints')}
          <ChevronRight size={14} className="shrink-0 rtl:-scale-x-100" aria-hidden />
        </Link>
      </div>
    </section>
  )
}
