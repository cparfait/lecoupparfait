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
import { useT, type TranslationKey } from '@/lib/i18n/index.tsx'

const TEINTE = SECTIONS.find((s) => s.id === 'outils')?.teinte

const OUTILS: Array<{
  href: string
  titre: TranslationKey
  phrase: TranslationKey
  icon: typeof Timer
}> = [
  {
    href: '/outils/pendule',
    titre: 'nav.clock',
    phrase: 'tools.clockBlurb',
    icon: Timer,
  },
  {
    href: '/outils/elo',
    titre: 'elo.title',
    phrase: 'tools.eloBlurb',
    icon: Calculator,
  },
  {
    href: '/outils/tirage',
    titre: 'tools.drawTitle',
    phrase: 'tools.drawBlurb',
    icon: Dices,
  },
  {
    href: '/outils/arbitrage',
    titre: 'tools.arbiterTitle',
    phrase: 'tools.arbiterBlurb',
    icon: Scale,
  },
]

export default function OutilsPage() {
  const t = useT()
  return (
    <div className="page">
      <TitreDePage intro={t('tools.intro')}>{t('nav.tools')}</TitreDePage>

      <div className="grille-cartes">
        {OUTILS.map((outil) => (
          <CarteDestination
            key={outil.href}
            href={outil.href}
            icon={outil.icon}
            teinte={TEINTE}
            titre={t(outil.titre)}
            phrase={t(outil.phrase)}
          />
        ))}
      </div>
    </div>
  )
}
