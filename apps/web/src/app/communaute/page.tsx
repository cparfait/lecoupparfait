'use client'

/**
 * Sommaire de la communauté.
 *
 * Classement, amis et statistiques se rejoignent ici. La correspondance, elle,
 * vit dans « Jouer » : on ouvre cette boîte-là pour jouer son coup, pas pour
 * prendre des nouvelles.
 *
 * Sur téléphone, la rubrique s'atteint depuis « Plus » ; sur grand écran,
 * depuis son menu. La page est la même.
 */

import { BarChart3, Trophy, Users } from 'lucide-react'
import { CarteDestination } from '@/components/ui/CarteDestination.tsx'
import { TitreDePage } from '@/components/ui/index.tsx'
import { SECTIONS } from '@/lib/navigation.ts'
import { useT } from '@/lib/i18n/index.tsx'

const TEINTE = SECTIONS.find((s) => s.id === 'communaute')?.teinte

/*
  Les trois entrées de la rubrique, par clé de dictionnaire.

  Constante de module : elle ne peut pas appeler `t()`, et la page entière —
  titre, phrase d'introduction, trois intitulés et trois phrases — restait en
  français dans les quarante autres langues.
*/
const ENTREES = [
  {
    href: '/classement',
    icon: Trophy,
    titreKey: 'nav.leaderboard',
    phraseKey: 'rest.leaderboardBlurb',
  },
  { href: '/amis', icon: Users, titreKey: 'nav.friends', phraseKey: 'rest.friendsBlurb' },
  {
    href: '/statistiques',
    icon: BarChart3,
    titreKey: 'nav.stats',
    phraseKey: 'rest.statsBlurb',
  },
] as const

export default function CommunautePage() {
  const t = useT()
  return (
    <div className="page">
      <TitreDePage intro={t('rest.communityIntro')}>{t('rest.community')}</TitreDePage>

      <div className="grille-cartes">
        {ENTREES.map(({ href, icon, titreKey, phraseKey }, index) => (
          <CarteDestination
            key={href}
            href={href}
            icon={icon}
            teinte={TEINTE}
            titre={t(titreKey)}
            phrase={t(phraseKey)}
            className="animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
