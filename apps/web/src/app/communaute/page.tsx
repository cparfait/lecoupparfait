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

const TEINTE = SECTIONS.find((s) => s.id === 'communaute')?.teinte

const ENTREES = [
  {
    href: '/classement',
    icon: Trophy,
    titre: 'Classement',
    phrase:
      'Qui joue ici, et à quel niveau. Chaque cadence a le sien, et les puzzles comptent à part.',
  },
  {
    href: '/amis',
    icon: Users,
    titre: 'Amis',
    phrase:
      'Ton carnet : qui est en ligne, qui t’a défié, et le lien d’invitation à envoyer à quelqu’un qui n’a pas encore de compte.',
  },
  {
    href: '/statistiques',
    icon: BarChart3,
    titre: 'Statistiques',
    phrase:
      'Ce que tes parties disent de ton jeu : l’ouverture où tu marques le moins, la cadence qui te réussit, l’heure où tu joues mal.',
  },
] as const

export default function CommunautePage() {
  return (
    <div className="page">
      <TitreDePage intro="Les autres joueurs, et ce que tu fais avec eux : se comparer, se retrouver, et regarder ce que tes parties disent de ton jeu.">
        Communauté
      </TitreDePage>

      <div className="grille-cartes">
        {ENTREES.map(({ href, icon, titre, phrase }, index) => (
          <CarteDestination
            key={href}
            href={href}
            icon={icon}
            teinte={TEINTE}
            titre={titre}
            phrase={phrase}
            className="animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
