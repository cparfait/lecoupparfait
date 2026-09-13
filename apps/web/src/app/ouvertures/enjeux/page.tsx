'use client'

/**
 * Les enjeux des ouvertures — vingt-cinq fiches.
 *
 * L'explorateur répond à « comment ça s'appelle ? » et « qu'est-ce qui
 * existe ? ». Il ne répondait pas à la seule question qui change une partie :
 * **qu'est-ce que je cherche à faire ?** On pouvait connaître le nom de son
 * ouverture, ses dix premiers coups, et n'avoir aucune idée de quoi jouer au
 * onzième — or c'est toujours au onzième que la partie commence.
 *
 * Vingt-cinq fiches, et non trois mille huit cent dix : celui qui atteint une
 * variante à six coups de profondeur n'a pas besoin qu'on lui explique le plan.
 * Ces vingt-cinq couvrent ce qui se joue en club.
 *
 * Le rangement se fait par premier coup, parce que c'est la question qu'on se
 * pose en premier : « je joue 1.e4, qu'est-ce qu'on me répond ? »
 */

import { useMemo, useState } from 'react'
import { BookOpen, Search } from 'lucide-react'
import { AutresDeLaSection } from '@/components/layout/AutresDeLaSection.tsx'
import { ButtonLink, Card, Chip, TitreDePage } from '@/components/ui/index.tsx'
import { CarteEnjeux } from '@/components/ouvertures/CarteEnjeux.tsx'
import { FICHES_ENJEUX, type FicheEnjeux } from '@/lib/ouvertures/enjeux.ts'
import { useSan } from '@/lib/notation.ts'
import { useT } from '@/lib/i18n/index.tsx'
import type { TranslationKey } from '@/lib/i18n/index.tsx'

/** Ignore accents et casse : on cherche « francaise » et on trouve « française ». */
function normalise(valeur: string): string {
  return valeur.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * Les trois familles, par premier coup.
 *
 * « Autres » regroupe l'anglaise et le Réti : deux ouvertures qui ne posent
 * aucun pion au centre au premier coup, et qui se jouent pour cette raison même.
 */
const FAMILLES: Array<{
  titreKey: TranslationKey
  sousKey: TranslationKey
  test: (fiche: FicheEnjeux) => boolean
}> = [
  {
    titreKey: 'stakesList.afterE4',
    sousKey: 'stakesList.afterE4Sub',
    test: (fiche) => fiche.coups[0] === 'e4',
  },
  {
    titreKey: 'stakesList.afterD4',
    sousKey: 'stakesList.afterD4Sub',
    test: (fiche) => fiche.coups[0] === 'd4',
  },
  {
    titreKey: 'stakesList.noCentrePawn',
    sousKey: 'stakesList.noCentrePawnSub',
    test: (fiche) => fiche.coups[0] !== 'e4' && fiche.coups[0] !== 'd4',
  },
]

export default function EnjeuxPage() {
  const t = useT()
  const [recherche, setRecherche] = useState('')
  const ecrire = useSan()

  const visibles = useMemo(() => {
    const aiguille = normalise(recherche.trim())
    if (aiguille.length < 2) return FICHES_ENJEUX
    return FICHES_ENJEUX.filter(
      (fiche) =>
        normalise(t(fiche.nom)).includes(aiguille) ||
        normalise(fiche.eco).includes(aiguille) ||
        normalise(t(fiche.idee)).includes(aiguille) ||
        normalise(t(fiche.piege)).includes(aiguille),
    )
  }, [recherche, t])

  return (
    <div className="page">
      <TitreDePage
        retour={{ href: '/ouvertures', label: t('nav.openings') }}
        intro={t('stakesList.pageIntro', { n: FICHES_ENJEUX.length })}
      >
        {t('stakesList.title')}
      </TitreDePage>

      {/* Le parti pris, dit une fois en haut : c'est lui qui explique pourquoi
          il n'y a pas de liste de coups à apprendre ici. */}
      <Card className="p-4">
        <p className="max-w-3xl text-[14px] leading-relaxed text-muted">{t('stakesList.intro')}</p>
      </Card>

      {/* ── Recherche ───────────────────────────────────────────────────── */}
      <div className="relative mt-5">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
          aria-hidden
        />
        <input
          type="search"
          value={recherche}
          onChange={(event) => setRecherche(event.target.value)}
          placeholder={t('stakesList.searchPlaceholder')}
          aria-label={t('stakesList.searchAria')}
          className="h-11 w-full rounded-[var(--radius-sm)] border border-line bg-surface pl-9 pr-3 text-sm placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_30%,transparent)]"
        />
      </div>

      {visibles.length === 0 && (
        <p className="mt-8 text-center text-sm text-muted">
          {t('stakesList.noMatch', { recherche })}
        </p>
      )}

      {/* ── Les fiches, par premier coup ────────────────────────────────── */}
      <div className="mt-8 space-y-10">
        {FAMILLES.map((famille) => {
          const fiches = visibles.filter(famille.test)
          if (fiches.length === 0) return null

          return (
            <section key={famille.titreKey}>
              <div className="mb-1 flex items-baseline gap-2.5">
                <h2 className="font-display text-xl font-bold tracking-tight">
                  {t(famille.titreKey)}
                </h2>
                <Chip>{fiches.length}</Chip>
              </div>
              <p className="mb-3 text-[13px] text-muted">{t(famille.sousKey)}</p>

              <div className="space-y-3">
                {fiches.map((fiche) => (
                  <CarteEnjeux key={fiche.id} fiche={fiche} ecrire={ecrire} />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <Card className="mt-10 flex flex-wrap items-center gap-3 p-4">
        <p className="min-w-[14rem] flex-1 text-[14px] leading-relaxed text-muted">
          {t('stakesList.explorerNote')}
        </p>
        <ButtonLink href="/ouvertures" icon={<BookOpen size={15} />}>
          {t('rest.explorer')}
        </ButtonLink>
      </Card>

      <AutresDeLaSection section="apprendre" />
    </div>
  )
}
