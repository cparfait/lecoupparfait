'use client'

/**
 * « Prochaine étape » : le chapitre de carrière en cours, et un seul bouton.
 *
 * C'est le cœur de l'accueil connecté, et le seul endroit où il porte une
 * action pleine. Les trois temps du chapitre — la leçon, les puzzles, le duel
 * — s'affichent avec ce qui en est fait, pour qu'on sache combien il reste
 * avant le chapitre suivant ; le bouton « Continuer » mène au premier qui
 * reste, comme sur la page de la carrière (`prochaineEtape`).
 *
 * Sur bureau, une frise des chapitres montre en plus où l'on est dans le
 * chemin entier.
 */

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Map } from 'lucide-react'
import clsx from 'clsx'
import {
  BOT_PERSONALITIES,
  CARRIERE_TERMINEE,
  CHAPITRES,
  botLevel,
  chapitre as chapitreNumero,
  etapesDe,
  niveauEffectif,
  prochaineEtape,
  type Etape,
  type Progression,
} from '@coupparfait/core'
import { PortraitAdversaire } from '@/components/brand/PortraitAdversaire.tsx'
import { ButtonLink, Skeleton } from '@/components/ui/index.tsx'
import { titreDEtape } from '@/lib/carriere/textes.ts'
import { useT } from '@/lib/i18n/index.tsx'
import { tCoeur } from '@/lib/i18n/resoudre.ts'

export function ProchaineEtape({ progression }: { progression: Progression | null | undefined }) {
  const t = useT()

  if (progression === undefined) {
    return <Skeleton className="h-64 w-full rounded-[var(--radius)]" />
  }

  const chapitre = progression ? chapitreNumero(progression.chapter) : null
  const terminee = progression != null && progression.chapter >= CARRIERE_TERMINEE

  // Carrière terminée, ou pas encore de progression lisible : la carte dit où
  // aller, sans inventer d'étape.
  if (!chapitre || !progression || terminee) {
    return (
      <section aria-labelledby="prochaine-etape" className="glass flex flex-col gap-2.5 p-4 lg:p-6">
        <h2
          id="prochaine-etape"
          className="font-display text-[1.25rem] font-bold leading-tight tracking-tight lg:text-[1.6rem]"
        >
          {t(terminee ? 'chemin.careerDone' : 'homeIn.startCareer')}
        </h2>
        <p className="text-[14px] leading-relaxed text-muted">
          {t('chemin.careerBlurb', { n: CHAPITRES.length })}
        </p>
        <ButtonLink
          href="/carriere"
          variant={terminee ? 'secondary' : 'primary'}
          size="md"
          icon={terminee ? <Map size={15} /> : <ArrowRight size={15} />}
          className="mt-1 self-start"
        >
          {t(terminee ? 'homeIn.reviewPath' : 'homeIn.start')}
        </ButtonLink>
      </section>
    )
  }

  const suite = prochaineEtape(chapitre, progression)
  const etapes = etapesDe(chapitre, progression)
  const enCours = suite?.cle ?? null
  const adversaire = BOT_PERSONALITIES[chapitre.adversaire]
  const eloAdversaire = botLevel(niveauEffectif(chapitre, progression)).elo

  return (
    <section
      aria-labelledby="prochaine-etape"
      className="glass flex flex-col gap-3 p-4 lg:gap-[18px] lg:p-6"
    >
      <div>
        <span className="text-[12px] font-semibold text-faint lg:text-[13px]">
          {t('chemin.nextStep', { n: chapitre.numero, total: CHAPITRES.length })}
        </span>
        <h2
          id="prochaine-etape"
          className="mt-1 font-display text-[1.25rem] font-bold leading-tight tracking-tight lg:text-[1.6rem]"
        >
          {chapitre.titre}
        </h2>
      </div>

      {/* La frise des chapitres, sur bureau seulement : sur téléphone, le
          « chapitre 7 sur 12 » du dessus dit la même chose en une ligne. */}
      <ol
        aria-label={t('chemin.chaptersAria', { n: chapitre.numero, total: CHAPITRES.length })}
        className="hidden gap-1.5 lg:grid"
        style={{ gridTemplateColumns: `repeat(${CHAPITRES.length}, minmax(0, 1fr))` }}
      >
        {CHAPITRES.map((c) => (
          <li
            key={c.numero}
            aria-hidden
            className={clsx(
              'grid h-[30px] place-items-center rounded-[8px] text-[12px] font-bold tabular-nums',
              c.numero < chapitre.numero &&
                'bg-[color-mix(in_oklab,var(--q-best)_16%,transparent)] text-[var(--q-best)]',
              c.numero === chapitre.numero &&
                'border-2 border-accent bg-[color-mix(in_oklab,var(--accent)_18%,transparent)] text-ink',
              c.numero > chapitre.numero && 'border border-line text-faint',
            )}
          >
            {c.numero}
          </li>
        ))}
      </ol>

      <ol className="flex flex-col gap-2.5 lg:grid lg:grid-cols-3 lg:gap-3">
        {etapes.map((etape, i) => (
          <LigneEtape
            key={etape.cle}
            etape={etape}
            rang={i + 1}
            enCours={etape.cle === enCours}
            titre={
              etape.cle === 'duel'
                ? t('chemin.duelAgainst', { adversaire: tCoeur(t, adversaire.name) })
                : titreDEtape(t, etape)
            }
            fin={
              etape.termine
                ? t('chemin.stepDone')
                : etape.cle === 'duel'
                  ? t('chemin.aboutElo', { elo: eloAdversaire })
                  : etape.total > 1
                    ? `${etape.fait} / ${etape.total}`
                    : null
            }
            pastille={
              etape.cle === 'duel' && !etape.termine ? (
                <PortraitAdversaire
                  personality={adversaire}
                  size={28}
                  className="shrink-0 rounded-full"
                />
              ) : null
            }
          />
        ))}
      </ol>

      {suite && (
        <ButtonLink
          href={suite.lien}
          variant="primary"
          size="lg"
          icon={<ArrowRight size={17} className="rtl:-scale-x-100" />}
          className="w-full lg:w-auto lg:self-start"
        >
          {t('chemin.continue')}
        </ButtonLink>
      )}
      <Link
        href="/carriere"
        className="-mt-1 inline-flex min-h-11 items-center self-center text-[13px] font-medium text-faint hover:text-[var(--accent-text)] lg:self-start"
      >
        {t('homeIn.seeTheMap')}
      </Link>
    </section>
  )
}

function LigneEtape({
  etape,
  rang,
  enCours,
  titre,
  fin,
  pastille,
}: {
  etape: Etape
  rang: number
  enCours: boolean
  titre: string
  fin: string | null
  pastille: ReactNode
}) {
  const avance = etape.total > 0 ? etape.fait / etape.total : 0
  return (
    <li
      className={clsx(
        'flex items-center gap-3 lg:rounded-[14px] lg:bg-surface-strong lg:p-3.5',
        enCours && 'lg:ring-2 lg:ring-inset lg:ring-accent',
      )}
    >
      {etape.termine ? (
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--q-best)_16%,transparent)] text-[var(--q-best)] lg:h-8 lg:w-8"
          aria-hidden
        >
          <Check size={15} strokeWidth={2.6} />
        </span>
      ) : (
        (pastille ?? (
          <span
            className={clsx(
              'grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-bold lg:h-8 lg:w-8',
              enCours
                ? 'border-2 border-accent text-[var(--accent-text)]'
                : 'border border-line text-faint',
            )}
            aria-hidden
          >
            {rang}
          </span>
        ))
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span
          className={clsx(
            'truncate text-[14px]',
            enCours ? 'font-semibold text-ink' : 'text-muted',
          )}
        >
          {titre}
        </span>
        {/* La barre des puzzles, seulement pour l'étape en cours qui se compte. */}
        {enCours && etape.total > 1 && (
          <span className="block h-[5px] overflow-hidden rounded-full bg-surface-strong lg:bg-surface">
            <span
              className="block h-full rounded-full bg-accent"
              style={{ width: `${avance * 100}%` }}
            />
          </span>
        )}
      </span>
      {fin && (
        <span
          className={clsx(
            'shrink-0 text-[12px] tabular-nums',
            enCours ? 'font-semibold text-muted' : 'text-faint',
          )}
        >
          {fin}
        </span>
      )}
    </li>
  )
}
