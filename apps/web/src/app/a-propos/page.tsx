'use client'

/**
 * À propos.
 *
 * Une page qui répond aux trois questions que se pose quelqu'un qui découvre un
 * outil gratuit : c'est quoi, pourquoi c'est gratuit, et où vont mes données.
 * Y répondre franchement vaut mieux que n'importe quel argumentaire.
 *
 * Composant client depuis qu'elle se traduit : le titre de l'onglet, lui, vit
 * dans `layout.tsx` — voir la note qui s'y trouve.
 */

import Link from 'next/link'
import { BOT_LEVELS, BOT_PERSONALITIES, CHAPITRES, motifGlossary } from '@coupparfait/core'
import { Card, Chip, TitreDePage } from '@/components/ui/index.tsx'
import { CURRICULUM_STATS } from '@/lib/lessons/index.ts'
import { TERMS } from '@/lib/glossaire.ts'
import { useT } from '@/lib/i18n/index.tsx'

export default function AboutPage() {
  const t = useT()
  /* Les chiffres se comptent, ils ne se recopient pas.

     « 30 leçons guidées » était écrit à la main, et le programme en comptait
     déjà davantage : une page qui se veut franche sur ses données ne peut pas
     se tromper sur les siennes. Tout ce qui vit dans le code se lit donc à la
     source — leçons, niveaux, personnalités, chapitres, vocabulaire — et ne
     peut plus vieillir. Restent en dur les deux jeux de données extérieurs,
     ouvertures et puzzles, dont le volume est fixé par l'import. */
  const chiffres = [
    { value: '3 810', label: t('about.openings') },
    { value: '6 M', label: t('about.puzzles') },
    { value: String(CURRICULUM_STATS.lessons), label: t('about.lessons') },
    { value: String(Object.keys(BOT_LEVELS).length), label: t('about.levels') },
    { value: String(Object.keys(BOT_PERSONALITIES).length), label: t('about.personalities') },
    { value: String(CHAPITRES.length), label: t('about.chapters') },
    {
      value: String(TERMS.length + motifGlossary().length),
      label: t('about.words'),
    },
    { value: '7', label: t('about.tablebases') },
  ]

  return (
    <div className="page-etroite">
      <TitreDePage action={<Chip tone="accent">{t('about.licence')}</Chip>}>
        {t('about.title')}
      </TitreDePage>

      <div className="space-y-5 leading-relaxed text-muted">
        <p>
          {t('about.whatBefore')} <strong className="text-ink">{t('about.whatStrong')}</strong>
          {t('about.whatAfter')}
        </p>

        <h2 className="pt-2 font-display text-xl font-semibold tracking-tight text-ink">
          {t('about.freeTitle')}
        </h2>
        <p>{t('about.free1')}</p>
        <p>{t('about.free2')}</p>

        <h2 className="pt-2 font-display text-xl font-semibold tracking-tight text-ink">
          {t('about.dataTitle')}
        </h2>
        <p>{t('about.data1')}</p>
        <p>{t('about.data2')}</p>

        <h2 className="pt-2 font-display text-xl font-semibold tracking-tight text-ink">
          {t('about.howTitle')}
        </h2>
        <p>{t('about.how1')}</p>
        <p>
          {t('about.how2Before')} <strong className="text-ink">{t('about.how2Strong')}</strong>{' '}
          {t('about.how2After')}
        </p>

        <h2 className="pt-2 font-display text-xl font-semibold tracking-tight text-ink">
          {t('about.selfHostTitle')}
        </h2>
        <p>
          {t('about.selfHostBefore')}{' '}
          <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[14px]">
            docker compose up
          </code>{' '}
          {t('about.selfHostAfter')}
        </p>
      </div>

      <Card className="mt-8 p-5">
        <h2 className="font-display text-lg font-semibold">{t('about.numbersTitle')}</h2>
        <dl className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          {chiffres.map((entry) => (
            <div key={entry.label}>
              <dt className="font-display text-xl font-bold tabular-nums text-ink">
                {entry.value}
              </dt>
              <dd className="mt-0.5 text-xs leading-snug text-muted">{entry.label}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <p className="mt-6 text-center text-sm">
        <Link href="/credits" className="text-accent hover:underline">
          {t('about.credits')}
        </Link>
      </p>
    </div>
  )
}
