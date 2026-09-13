'use client'

/**
 * Crédits et licences.
 *
 * Ce n'est pas une page de politesse : les licences GPL, CC BY et CC BY-SA
 * **exigent** l'attribution. Sans cette page, la redistribution du projet serait
 * illégale. Elle sert aussi à montrer sur quoi le projet est bâti — c'est une
 * bonne façon de découvrir l'écosystème libre des échecs.
 *
 * Elle ne porte plus sa liste : celle-ci vit dans `lib/credits/catalogue.ts`,
 * que l'administration confronte aux dépendances réelles et qu'un contrôle
 * vérifie à chaque exécution des tests. Écrite ici, elle restait à jour le jour
 * où on l'avait écrite — et il y manquait les dix-sept bibliothèques qui font
 * tourner l'application, Maia, Lc0 et Piper.
 */

import Link from 'next/link'
import { Card } from '@/components/ui/index.tsx'
import { TITRES_CATEGORIE, creditsDe, type Credit } from '@/lib/credits/catalogue.ts'
import { useT } from '@/lib/i18n/index.tsx'

export default function CreditsPage() {
  const t = useT()

  return (
    <div className="page-etroite">
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
        {t('credits.title')}
      </h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-muted max-lg:text-[14px]">
        {t('credits.intro')}
      </p>

      <Section titre={TITRES_CATEGORIE.moteur} credits={creditsDe('moteur')} />
      <Section titre={TITRES_CATEGORIE.donnees} credits={creditsDe('donnees')} />
      <Section titre={TITRES_CATEGORIE.ressources} credits={creditsDe('ressources')} />
      {/* Les bibliothèques en compact : quinze cartes de plus feraient de cette
          page un inventaire, alors qu'elle raconte sur quoi le projet est bâti.
          Une ligne chacune suffit à porter l'attribution que leurs licences
          demandent — nom, auteur, licence, et le lien pour aller voir. */}
      <Bibliotheques credits={creditsDe('bibliotheque')} />

      <Card className="mt-8 p-5">
        <h2 className="font-display text-lg font-semibold">{t('credits.licenceTitle')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {t('credits.licenceBefore')}{' '}
          <strong className="text-ink">{t('credits.licenceStrong')}</strong>
          {t('credits.licenceAfter')}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t('credits.licenceConcretely')}</p>
        <p className="mt-3 text-xs text-faint">
          {t('credits.nonCommercialBefore')} <span className="font-mono">CC BY-NC-SA</span>{' '}
          {t('credits.nonCommercialAfter')}
        </p>
      </Card>

      <p className="mt-8 text-center text-sm">
        <Link href="/a-propos" className="text-accent hover:underline">
          {t('credits.moreAboutProject')}
        </Link>
      </p>
    </div>
  )
}

function Section({ titre, credits }: { titre: string; credits: Credit[] }) {
  const t = useT()

  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-semibold tracking-tight">{titre}</h2>
      <div className="mt-3 space-y-2">
        {credits.map((credit) => (
          <Card key={credit.nom} className="p-4">
            <div className="flex flex-wrap items-baseline gap-2">
              <a
                href={credit.url}
                target="_blank"
                rel="noreferrer noopener"
                className="font-semibold text-accent hover:underline"
              >
                {credit.nom}
                {credit.version ? ` ${credit.version}` : ''}
              </a>
              <span className="text-xs text-muted">
                {t('credits.by', { auteur: credit.auteur })}
              </span>
              <span className="ml-auto rounded-full border border-line px-2 py-0.5 font-mono text-[12px] text-faint">
                {credit.licence}
              </span>
            </div>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{t(credit.note)}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}

function Bibliotheques({ credits }: { credits: Credit[] }) {
  const t = useT()

  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-semibold tracking-tight">
        {TITRES_CATEGORIE.bibliotheque}
      </h2>
      <p className="mt-1 text-[14px] text-muted">
        {t('credits.librariesCount', { n: credits.length })}
      </p>
      <Card className="mt-3 overflow-hidden">
        <ul>
          {credits.map((credit) => (
            <li
              key={credit.paquet ?? credit.nom}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-line/40 px-4 py-2 last:border-0"
            >
              <a
                href={credit.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-[14px] font-semibold text-accent hover:underline"
              >
                {credit.nom}
              </a>
              <span className="text-[12px] text-muted">
                {t('credits.by', { auteur: credit.auteur })}
              </span>
              <span className="ml-auto shrink-0 font-mono text-[12px] text-faint">
                {credit.licence}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  )
}
