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
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { BOT_PERSONALITIES } from '@coupparfait/core'
import { Card } from '@/components/ui/index.tsx'
import { PortraitAdversaire } from '@/components/brand/PortraitAdversaire.tsx'

export const metadata: Metadata = {
  title: 'Les adversaires artificiels',
  description:
    'Sept adversaires, sept styles de jeu réellement différents — leur histoire, leurs penchants chiffrés, et comment battre chacun d’eux.',
}

export default function GalerieAdversaires() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Tes adversaires artificiels
      </h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-muted max-lg:text-[13px]">
        Sept caractères, répartis sur les vingt-cinq niveaux. Leur style n’est pas un habillage :
        chacun évalue les coups avec une préférence propre, et sa fiche montre les nombres qui la
        produisent — avec ce qu’il faut faire pour le battre.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.values(BOT_PERSONALITIES).map((personnalite) => (
          <Link key={personnalite.id} href={`/jouer/adversaires/${personnalite.id}`}>
            <Card className="group flex h-full gap-3 p-4 transition-colors hover:bg-surface-hover">
              <PortraitAdversaire personality={personnalite} size={56} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[15px] font-semibold">
                  {personnalite.name.fr}
                  <ArrowRight
                    size={14}
                    aria-hidden
                    className="text-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent"
                  />
                </p>
                <p className="mt-0.5 text-[12px] italic text-accent">« {personnalite.devise} »</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{personnalite.blurb.fr}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
