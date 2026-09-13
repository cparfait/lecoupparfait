'use client'

/**
 * « Et maintenant ? » — la suite d'une analyse.
 *
 * L'analyse disait très bien ce qui s'était passé : la précision, les moments
 * clés, le coup qu'il fallait jouer, et même une phrase de conclusion — « ton
 * point faible du jour : les pièces laissées en prise ». Puis elle s'arrêtait
 * là. On refermait l'onglet, et rien de tout cela ne se transformait en
 * entraînement : *Analyser* et *S'entraîner* étaient deux silos, et il fallait
 * aller choisir soi-même un thème dans une liste de douze, en se souvenant de
 * celui dont l'analyse venait de parler.
 *
 * Trois choses ici, et pas une de plus :
 *
 *  1. **Le point à travailler**, la phrase que le cœur rédigeait déjà ;
 *  2. **la phase la plus faible**, calculée par `gradePhases` — une fonction du
 *     cœur qui existait et que personne n'appelait. « Tu perds tes parties en
 *     finale » est l'information la plus actionnable qu'une analyse puisse
 *     donner ;
 *  3. **trois puzzles au maximum**, sur les motifs exacts qui ont coûté la
 *     partie. Trois, parce que six ne se font pas.
 *
 * La carte ne s'affiche que si elle a quelque chose à dire : une partie sans
 * faute n'a pas de point à travailler, et l'inventer serait pire que se taire.
 */

import Link from 'next/link'
import { ArrowRight, Compass, Puzzle, Target } from 'lucide-react'
import clsx from 'clsx'
import {
  gradePhases,
  motifCopy,
  PHASE_LABELS,
  weakestPhase,
  type Color,
  type FullGameReport,
  type Locale,
  type MotifId,
} from '@coupparfait/core'
import { Card, Chip } from '@/components/ui/index.tsx'
import { EnTeteDeCarte } from '@/components/ui/EnTeteDeCarte.tsx'
import { themesDePuzzles } from '@/lib/analysis/versLesPuzzles.ts'
import { useT } from '@/lib/i18n/index.tsx'
import { tCoeur } from '@/lib/i18n/resoudre.ts'

/**
 * En dessous de cette note, la phase mérite d'être nommée.
 *
 * Un A ou un B ne se travaille pas : dire « ta plus faible phase est
 * l'ouverture, note B » à quelqu'un qui a bien joué partout transforme un bon
 * bilan en reproche. On ne nomme donc que C et D.
 */
const NOTES_A_TRAVAILLER = new Set(['C', 'D'])

export function EtMaintenant({
  report,
  camp,
  focus,
  motifs,
  locale,
  className,
}: {
  report: FullGameReport
  /** Le camp dont on parle : celui du joueur, ou celui qu'on regarde. */
  camp: Color
  /** La phrase du coach — un seul axe de travail, déjà rédigée par le cœur. */
  focus: string
  /** Motifs ayant coûté le plus cher, tels que le rapport les a comptés. */
  motifs: string[]
  locale: Locale
  className?: string
}) {
  const t = useT()
  const themes = themesDePuzzles(motifs)
  const notes = gradePhases(report, camp)
  const plusFaible = weakestPhase(notes)
  const phaseANommer = plusFaible && NOTES_A_TRAVAILLER.has(plusFaible.grade) ? plusFaible : null

  // Rien à dire : ni motif exploitable, ni phase faible. La carte s'efface
  // plutôt que d'afficher une section vide avec un titre prometteur.
  if (themes.length === 0 && !phaseANommer) return null

  return (
    <Card className={clsx('overflow-hidden', className)}>
      <EnTeteDeCarte
        titre={t('next2.title')}
        icone={<Compass size={14} aria-hidden />}
        teinte="var(--rub-entrainer)"
      />

      <div className="p-4">
        <p className="text-[14px] leading-relaxed">{focus}</p>

        {/* ── La phase à travailler ──────────────────────────────────── */}
        {phaseANommer && (
          <div className="mt-3 flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-line bg-bg-elev px-3 py-2.5">
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full font-display text-[13px] font-bold"
              style={{
                background: 'color-mix(in oklab, var(--q-inaccuracy) 18%, transparent)',
                color: 'var(--q-inaccuracy-text)',
              }}
              aria-hidden
            >
              {phaseANommer.grade}
            </span>
            <span className="min-w-0 text-[13px] leading-snug">
              <strong>{PHASE_LABELS[phaseANommer.phase][locale === 'en' ? 'en' : 'fr']}</strong> —{' '}
              {phaseANommer.accuracy.toFixed(0)} % de précision sur {phaseANommer.moves} coups,
              {phaseANommer.mistakes > 0
                ? t(phaseANommer.mistakes > 1 ? 'next2.andMistakes' : 'next2.andOneMistake', {
                    n: phaseANommer.mistakes,
                  })
                : t('next2.noSeriousMistake')}{' '}
              <span className="text-muted">{t('next2.costliestPhase')}</span>
            </span>
          </div>
        )}

        {/* ── Les puzzles du motif ───────────────────────────────────── */}
        {themes.length > 0 && (
          <>
            <p className="mt-4 text-[12px] font-semibold text-faint">{t('next2.whereItRecurs')}</p>
            <ul className="mt-1.5 space-y-1.5">
              {themes.map((theme) => {
                const copy = motifCopy(theme as MotifId, locale)
                return (
                  <li key={theme}>
                    <Link
                      href={`/puzzles?theme=${encodeURIComponent(theme)}`}
                      className="flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-line bg-bg-elev px-3 py-2.5 transition-colors hover:bg-surface-hover"
                      title={copy ? tCoeur(t, copy.definition) : undefined}
                    >
                      <Puzzle size={14} className="shrink-0 text-faint" aria-hidden />
                      <span className="min-w-0 flex-1 text-[14px] font-medium">
                        {copy ? tCoeur(t, copy.name) : theme}
                      </span>
                      <Chip tone="accent">{t('last.train')}</Chip>
                      <ArrowRight size={14} className="shrink-0 text-faint" aria-hidden />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}

        {/* Le palier, en dernier : c'est le pas de recul, quand on a fini de
            regarder cette partie-là. */}
        <Link href="/apprendre/palier" className="lien mt-4 inline-flex items-center gap-1.5">
          <Target size={13} aria-hidden />
          {t('next2.whatProgresses')}
        </Link>
      </div>
    </Card>
  )
}
