/**
 * Le sommaire des outils.
 *
 * La sixième rubrique, et la seule qui ne serve pas à jouer sur l'écran : ce
 * qu'on y trouve accompagne une partie qui se joue ailleurs — sur un vrai
 * plateau, en face de quelqu'un. L'écran au service du bois, et non l'inverse.
 *
 * Un seul outil pour l'instant, et la page le dit plutôt que de meubler : une
 * rubrique qui promet une famille d'outils en n'en montrant qu'un est moins
 * honnête qu'une rubrique qui annonce son premier.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Calculator, Dices, Scale, Timer } from 'lucide-react'
import { Card } from '@/components/ui/index.tsx'

export const metadata: Metadata = {
  title: 'Outils',
  description:
    'La pendule, le calculateur Elo, le tirage au sort et l’aide-mémoire d’arbitrage : ce qui sert autour d’un vrai échiquier.',
}

const OUTILS = [
  {
    href: '/outils/pendule',
    titre: 'Pendule',
    resume:
      'Deux temps, un incrément, on tape son côté après avoir joué. Branchée sur un échiquier électronique, elle bascule toute seule et note la partie — qui s’ouvre ensuite dans l’analyse.',
    icone: Timer,
  },
  {
    href: '/outils/elo',
    titre: 'Calculateur Elo',
    resume:
      'Ta cote, ton coefficient, tes parties : ce que le tournoi te rapporte ou te coûte, partie par partie, et ta performance. Au barème de la FIDE.',
    icone: Calculator,
  },
  {
    href: '/outils/tirage',
    titre: 'Tirage au sort',
    resume:
      'Qui a les Blancs, qui joue contre qui, dans quel ordre on passe. Un tirage que tout le monde voit, et personne ne conteste.',
    icone: Dices,
  },
  {
    href: '/outils/arbitrage',
    titre: 'Aide-mémoire d’arbitrage',
    resume:
      'Pièce touchée, coup illégal, drapeau, nulle réclamée, téléphone qui sonne : ce que disent les Règles du jeu de la FIDE, en une page.',
    icone: Scale,
  },
]

export default function OutilsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Outils</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-muted max-lg:text-[14px]">
        Ce qui sert autour de l’échiquier plutôt que dessus : de quoi accompagner une partie jouée
        sur un vrai plateau, en face de quelqu’un — et ce qui vient avant et après, au club.
      </p>

      <div className="mt-6 space-y-3">
        {OUTILS.map((outil) => {
          const Icone = outil.icone
          return (
            <Link key={outil.href} href={outil.href}>
              <Card className="group flex items-start gap-4 p-5 transition-colors hover:bg-surface-hover">
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-sm)]"
                  style={{
                    background: 'color-mix(in oklab, var(--q-inaccuracy) 16%, transparent)',
                    color: 'var(--q-inaccuracy)',
                  }}
                  aria-hidden
                >
                  <Icone size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-lg font-semibold">
                    {outil.titre}
                    <ArrowRight
                      size={15}
                      aria-hidden
                      className="text-faint transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-accent"
                    />
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted">
                    {outil.resume}
                  </span>
                </span>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
