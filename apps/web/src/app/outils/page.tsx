'use client'

/**
 * Le sommaire des outils.
 *
 * La sixième rubrique, et la seule qui ne serve pas à jouer sur l'écran : ce
 * qu'on y trouve accompagne une partie qui se joue ailleurs — sur un vrai
 * plateau, en face de quelqu'un. L'écran au service du bois, et non l'inverse.
 */

import { Calculator, Dices, Scale, Timer } from 'lucide-react'
import { CarteDestination } from '@/components/ui/CarteDestination.tsx'
import { TitreDePage } from '@/components/ui/index.tsx'
import { SECTIONS } from '@/lib/navigation.ts'

const TEINTE = SECTIONS.find((s) => s.id === 'outils')?.teinte

const OUTILS = [
  {
    href: '/outils/pendule',
    titre: 'Pendule',
    phrase:
      'Deux temps, un incrément, on tape son côté après avoir joué. Branchée sur un échiquier électronique, elle note la partie.',
    icon: Timer,
  },
  {
    href: '/outils/elo',
    titre: 'Calculateur Elo',
    phrase:
      'Ta cote, ton coefficient, tes parties : ce que le tournoi te rapporte ou te coûte, et ta performance. Au barème de la FIDE.',
    icon: Calculator,
  },
  {
    href: '/outils/tirage',
    titre: 'Tirage au sort',
    phrase:
      'Qui a les Blancs, qui joue contre qui, dans quel ordre on passe. Un tirage que tout le monde voit.',
    icon: Dices,
  },
  {
    href: '/outils/arbitrage',
    titre: 'Aide-mémoire d’arbitrage',
    phrase:
      'Pièce touchée, coup illégal, drapeau, nulle réclamée : ce que disent les Règles du jeu de la FIDE, en une page.',
    icon: Scale,
  },
]

export default function OutilsPage() {
  return (
    <div className="page">
      <TitreDePage intro="Ce qui sert autour de l’échiquier plutôt que dessus : de quoi accompagner une partie jouée sur un vrai plateau, en face de quelqu’un.">
        Outils
      </TitreDePage>

      <div className="grille-cartes">
        {OUTILS.map((outil) => (
          <CarteDestination
            key={outil.href}
            href={outil.href}
            icon={outil.icon}
            teinte={TEINTE}
            titre={outil.titre}
            phrase={outil.phrase}
          />
        ))}
      </div>
    </div>
  )
}
