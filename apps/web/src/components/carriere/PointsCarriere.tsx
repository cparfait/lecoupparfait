'use client'

/**
 * Les points de carrière, et d'où ils viennent.
 *
 * La pastille de l'accueil affichait « 🏇 Éclaireur · 2560 pts de carrière » et
 * ne faisait rien. Un chiffre à quatre chiffres qu'on ne peut pas ouvrir ne dit
 * pas ce qu'il récompense : on ne sait ni ce qui l'a fait monter, ni ce qui le
 * ferait monter encore, ni ce qui sépare de la ligne suivante. Le barème est
 * pourtant public et volontairement rond — voir `XP` dans `core/carriere.ts` —,
 * il n'y avait qu'à le montrer.
 *
 * Le panneau répond dans l'ordre des questions : *combien j'en ai*, *où ça me
 * place*, *d'où ils viennent*, *ce que rapporte quoi*.
 *
 * ── Le détail est déduit, et c'est assumé ─────────────────────────────────
 *
 * Aucun journal des gains n'est tenu en base : il y a un total et les compteurs
 * du chapitre en cours. `detailXp` reconstitue le reste à partir des chapitres
 * franchis, dont on sait qu'ils ont vu leur leçon, leurs puzzles et leurs
 * victoires. La somme retombe donc sur le total — sauf pour un compte
 * antérieur à un changement de barème, cas où l'écart s'affiche au lieu d'être
 * absorbé en silence. Un détail qui ne fait pas le compte et ne le dit pas est
 * pire qu'un total nu.
 */

import Link from 'next/link'
import { ArrowRight, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { XP, detailXp, rangPour, type Progression } from '@coupparfait/core'
import { Menu } from '@/components/ui/Menu.tsx'
import { classesChip } from '@/components/ui/index.tsx'
import { XP_TOTAL } from '@/lib/daily/quetes.ts'
import { avecElements, useT } from '@/lib/i18n/index.tsx'

export function PointsCarriere({ progression }: { progression: Progression }) {
  const t = useT()
  const rang = rangPour(progression.xp)

  return (
    <Menu
      align="right"
      largeur="w-[21rem]"
      label={t('career2.pointsAria', { n: progression.xp })}
      className="shrink-0"
      // La pastille garde exactement la forme qu'elle avait quand elle n'était
      // qu'une étiquette : elle vit à côté de celle de la série, et deux
      // voisines de formes différentes se liraient comme deux choses de natures
      // différentes.
      boutonClassName={classesChip('accent', 'transition-colors hover:brightness-125')}
      declencheur={(ouvert) => (
        <>
          <span aria-hidden>{rang.rang.emoji}</span> {rang.rang.nom} · {progression.xp}{' '}
          {t('career2.pointsSuffix')}
          <ChevronDown
            size={11}
            aria-hidden
            className={clsx('transition-transform duration-150', ouvert && 'rotate-180')}
          />
        </>
      )}
    >
      <PanneauPoints progression={progression} />
    </Menu>
  )
}

function PanneauPoints({ progression }: { progression: Progression }) {
  const t = useT()
  const rang = rangPour(progression.xp)
  const { lignes, total } = detailXp(progression)
  /** Ce que le détail n'explique pas. Nul dans la quasi-totalité des cas. */
  const ecart = progression.xp - total

  return (
    <div className="p-2">
      <div className="flex items-baseline gap-2 px-1">
        <p className="font-display text-lg font-bold tracking-tight tabular-nums">
          {t('last.pointsCount', { n: progression.xp })}
        </p>
        <span className="text-[12px] text-faint">{t('last.careerWord')}</span>
      </div>

      {/* ── Où ça place ───────────────────────────────────────────────
          Le rang seul ne dit pas la distance au suivant, et c'est pourtant la
          seule chose qui rend un compteur utile : savoir ce qu'il reste. */}
      <div className="mt-2 px-1">
        <div className="flex items-baseline justify-between gap-2 text-[12px]">
          <span className="font-semibold text-accent">
            <span aria-hidden>{rang.rang.emoji}</span> {rang.rang.nom}
          </span>
          {rang.suivant && (
            <span className="tabular-nums text-faint">
              {t('career2.pointsBefore', {
                n: rang.suivant.seuil - progression.xp,
                rang: rang.suivant.nom,
              })}
            </span>
          )}
        </div>
        <div
          className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-strong"
          role="progressbar"
          aria-valuenow={rang.acquis}
          aria-valuemin={0}
          aria-valuemax={rang.requis ?? rang.acquis}
          aria-label={t('career2.rankProgress')}
        >
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${rang.fraction * 100}%` }}
          />
        </div>
        {!rang.suivant && <p className="mt-1 text-[12px] text-faint">{t('career2.lastRank')}</p>}
      </div>

      {/* ── D'où ils viennent ─────────────────────────────────────────── */}
      <p className="mt-3 px-1 text-[12px] text-faint">{t('misc.whereTheyComeFrom')}</p>
      {lignes.length === 0 ? (
        <p className="mt-1 px-1 text-[12px] text-muted">{t('misc.nothingYet', { n: XP.lecon })}</p>
      ) : (
        <ul className="mt-1 space-y-0.5">
          {lignes.map((ligne) => (
            <li key={ligne.cle} className="flex items-baseline gap-2 px-1 text-[12px]">
              <span className="min-w-0 flex-1 truncate text-muted">
                <strong className="font-semibold tabular-nums text-ink">{ligne.nombre}</strong>{' '}
                {ligne.libelle}
                <span className="text-faint"> × {ligne.unitaire}</span>
              </span>
              <span className="shrink-0 tabular-nums font-semibold text-ink">+{ligne.points}</span>
            </li>
          ))}
          {ecart !== 0 && (
            <li
              className="flex items-baseline gap-2 px-1 text-[12px]"
              title={t('career2.oldScale')}
            >
              <span className="min-w-0 flex-1 truncate text-muted">{t('misc.undetailed')}</span>
              <span className="shrink-0 tabular-nums font-semibold text-ink">
                {ecart > 0 ? '+' : ''}
                {ecart}
              </span>
            </li>
          )}
        </ul>
      )}

      {/* ── Le barème, en clair ───────────────────────────────────────
          Il tient en une phrase, et c'est exprès : quelqu'un doit pouvoir
          prévoir ce que va lui rapporter sa soirée. */}
      <p className="mt-3 border-t border-line/60 px-1 pt-2 text-[12px] leading-relaxed text-muted">
        {avecElements(
          t('career2.scale', {
            lecon: XP.lecon,
            puzzle: XP.puzzle,
            victoire: XP.victoire,
            chapitre: XP.chapitre,
            etoile: XP.etoile,
          }),
          { sansAide: <strong className="font-semibold text-ink">{t('career2.noHelp')}</strong> },
        )}
      </p>
      <p className="mt-2 px-1 text-[12px] leading-relaxed text-faint">
        {t('career2.dayPointsNote', { total: XP_TOTAL })}
      </p>

      <div className="mt-2 border-t border-line/60 pt-2">
        <Link
          href="/carriere"
          className="flex items-center justify-between rounded-[var(--radius-sm)] px-1 py-1.5 text-[14px] font-medium transition-colors hover:bg-surface-hover"
        >
          {t('career2.seeCareerMap')}
          <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
    </div>
  )
}
