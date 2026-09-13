'use client'

/**
 * La galerie des sept adversaires.
 *
 * Sept déclinaisons de la même sculpture — voir `scripts/build-cavale.mjs` :
 * même cadrage, même lumière, seule la matière change, et elle découle du style
 * de jeu. Cette page les montre côte à côte, ce que `/jouer` faisait déjà, mais
 * chaque nom mène désormais quelque part.
 *
 * Elle existe surtout pour que l'adresse d'une fiche puisse être raccourcie :
 * arriver sur `/jouer/adversaires` après avoir coupé la fin de
 * `/jouer/adversaires/mirage` doit mener à la liste, pas à une page
 * introuvable.
 *
 * Composant client depuis qu'elle se traduit : le titre de l'onglet vit dans
 * `layout.tsx`.
 */

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { BOT_PERSONALITIES } from '@coupparfait/core'
import { Card } from '@/components/ui/index.tsx'
import { PortraitAdversaire } from '@/components/brand/PortraitAdversaire.tsx'
import { useT } from '@/lib/i18n/index.tsx'
import { tCoeur } from '@/lib/i18n/resoudre.ts'

export default function GalerieAdversaires() {
  const t = useT()
  /* Noms et phrases des sept adversaires : du contenu rédigé, que le cœur
     n'écrit qu'en français et en anglais. Voir `localeDuContenu`. */

  return (
    <div className="page">
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
        {t('play.opponentsTitle')}
      </h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-muted max-lg:text-[14px]">
        {t('opponent.galleryIntro')}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.values(BOT_PERSONALITIES).map((personnalite) => (
          <Link key={personnalite.id} href={`/jouer/adversaires/${personnalite.id}`}>
            <Card className="group flex h-full gap-3 p-4 transition-colors hover:bg-surface-hover">
              <PortraitAdversaire personality={personnalite} size={56} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[15px] font-semibold">
                  {tCoeur(t, personnalite.name)}
                  <ArrowRight
                    size={14}
                    aria-hidden
                    className="text-faint transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-accent"
                  />
                </p>
                <p className="mt-0.5 text-[12px] italic text-accent">
                  « {tCoeur(t, personnalite.devise)} »
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">
                  {tCoeur(t, personnalite.blurb)}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
