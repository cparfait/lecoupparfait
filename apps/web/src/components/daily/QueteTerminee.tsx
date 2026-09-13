'use client'

/**
 * « C'est fait. » — la quête du jour vient d'être remplie.
 *
 * Une quête lancée depuis l'accueil n'avait pas de fin visible : on partait
 * enchaîner trois puzzles, on en résolvait un quatrième, un cinquième, sans
 * jamais savoir qu'on avait fini au troisième. Un petit bandeau passait bien
 * en haut de l'écran, mais il passe — c'est sa nature — et il ne dit ni où
 * l'on en est du reste de la journée, ni comment rentrer.
 *
 * Cette boîte-ci dit les trois choses : **c'est fait**, **voilà ce qui
 * reste**, et **voilà les deux suites possibles** — continuer sur cet écran,
 * ou revenir aux quêtes. Rien n'est imposé : « Continuer » ferme simplement la
 * boîte et rend l'écran tel qu'il était.
 *
 * L'animation n'est pas un ornement. C'est le seul moment de la journée où
 * l'application félicite : elle doit se voir sans avoir à être lue, et
 * disparaître aussitôt. Elle est neutralisée sous `prefers-reduced-motion`,
 * où l'annonce reste entièrement lisible — voir `globals.css`.
 */

import { useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Flame, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/index.tsx'
import { useDialogue } from '@/lib/useDialogue.ts'
import type { Quete } from '@/lib/daily/quotidien.ts'
import { useT } from '@/lib/i18n/index.tsx'

export function QueteTerminee({
  quete,
  restantes,
  serie,
  onContinuer,
  libelleContinuer = 'Continuer',
}: {
  quete: Quete
  /** Quêtes encore à faire aujourd'hui, celle-ci déduite. */
  restantes: number
  /** Série en cours, si elle vaut la peine d'être dite. */
  serie?: number
  onContinuer: () => void
  /** « Puzzle suivant », « Rejouer une partie » : chaque écran a son verbe. */
  libelleContinuer?: string
}) {
  const t = useT()
  const boite = useRef<HTMLDivElement>(null)
  useDialogue(boite, { onFermer: onContinuer })

  return (
    <div
      className="fixed inset-0 z-[92] grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quete-terminee-titre"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onContinuer} aria-hidden />

      <div
        ref={boite}
        className="popover animate-slide-up relative w-full max-w-sm overflow-hidden p-6 text-center shadow-[var(--shadow-lg)]"
      >
        {/* La médaille, et l'onde qui en part. Deux animations superposées :
            l'une pose le disque, l'autre le fait respirer une fois. */}
        <span className="relative mx-auto mb-4 grid h-16 w-16 place-items-center" aria-hidden>
          <span className="animate-pulse-ring absolute inset-0 rounded-full bg-[var(--q-best)]/30" />
          <span className="animate-quete-medaille relative grid h-16 w-16 place-items-center rounded-full bg-[color-mix(in_oklab,var(--q-best)_22%,transparent)] text-[var(--q-best)]">
            <Check size={30} strokeWidth={3} />
          </span>
          <Sparkles
            size={16}
            className="animate-quete-etincelle absolute -right-1 -top-1 text-[var(--q-inaccuracy)]"
            style={{ ['--retard' as string]: '160ms' }}
          />
          <Sparkles
            size={12}
            className="animate-quete-etincelle absolute -bottom-1 -left-2 text-[var(--accent)]"
            style={{ ['--retard' as string]: '320ms' }}
          />
        </span>

        <p className="text-[12px] font-semibold text-faint">{t('misc.dailyQuest')}</p>
        <h2 id="quete-terminee-titre" className="font-display text-2xl font-bold tracking-tight">
          {quete.label}
        </h2>
        <p className="mt-1.5 text-sm font-semibold text-[var(--q-best)]">
          +{quete.xp} points
          {serie != null && serie > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-[var(--q-inaccuracy)]">
              <Flame size={13} aria-hidden />
              série de {serie} jour{serie > 1 ? 's' : ''}
            </span>
          )}
        </p>

        <p className="mt-3 text-[14px] leading-relaxed text-muted">
          {restantes === 0
            ? t('misc.allQuestsDone')
            : `Il te reste ${restantes} quête${restantes > 1 ? 's' : ''} aujourd’hui.`}
        </p>

        <div className="mt-6 space-y-2">
          {/* « Continuer » d'abord quand il reste à faire ici, « rentrer »
              d'abord quand la journée est finie : le bouton mis en avant est
              celui qui a le plus de chances d'être le bon. */}
          <Button
            variant={restantes === 0 ? 'secondary' : 'primary'}
            size="lg"
            fullWidth
            onClick={onContinuer}
          >
            {libelleContinuer}
          </Button>
          <Link href="/" className="block">
            <Button
              variant={restantes === 0 ? 'primary' : 'secondary'}
              size="lg"
              fullWidth
              icon={<ArrowRight size={16} />}
            >
              {t(restantes === 0 ? 'misc.seeMyDay' : 'misc.backToQuests')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
