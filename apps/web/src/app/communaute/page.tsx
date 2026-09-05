'use client'

/**
 * Sommaire de la communauté.
 *
 * C'était la seule rubrique sans page à elle : classement, amis et
 * statistiques ne se rejoignaient nulle part. Sur grand écran, un menu
 * déroulant tenait lieu de sommaire ; sur téléphone, ces écrans n'existaient
 * que dans le panneau « Menu », c'est-à-dire derrière un bouton qui ne dit pas
 * ce qu'il contient.
 *
 * La correspondance, elle, est repartie dans « Jouer » : on ouvre cette
 * boîte-là pour jouer son coup, pas pour prendre des nouvelles.
 *
 * Elle a maintenant sa page, comme les quatre autres, et la barre du bas y
 * mène directement : plus rien à déplier pour savoir ce qu'il y a dans
 * l'application.
 */

import Link from 'next/link'
import { ArrowRight, BarChart3, Trophy, Users } from 'lucide-react'

const ENTREES = [
  {
    href: '/classement',
    icon: Trophy,
    titre: 'Classement',
    phrase:
      'Qui joue ici, et à quel niveau. Chaque cadence a le sien, et les puzzles comptent à part.',
    accent: 'var(--accent-2)',
  },
  {
    href: '/amis',
    icon: Users,
    titre: 'Amis',
    phrase:
      'Ton carnet : qui est en ligne, qui t’a défié, et le lien d’invitation à envoyer à quelqu’un qui n’a pas encore de compte.',
    accent: 'var(--accent)',
  },
  {
    href: '/statistiques',
    icon: BarChart3,
    titre: 'Statistiques',
    phrase:
      'Ce que tes parties disent de ton jeu : l’ouverture où tu marques le moins, la cadence qui te réussit, l’heure où tu joues mal.',
    accent: 'var(--accent-2)',
  },
] as const

export default function CommunautePage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-14">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Communauté</h1>
      <p className="mt-2 max-w-xl text-muted max-lg:text-[13px] max-lg:leading-relaxed">
        Les autres joueurs, et ce que tu fais avec eux : se comparer, se retrouver, et regarder ce
        que tes parties disent de ton jeu.
      </p>

      <div className="mt-6 grid gap-2 md:mt-8 md:grid-cols-2 md:gap-3">
        {ENTREES.map(({ href, icon: Icon, titre, phrase, accent }, index) => (
          <Link
            key={href}
            href={href}
            className="group animate-slide-up glass gradient-ring relative flex flex-row items-center gap-3.5 overflow-hidden p-3.5 pr-11 transition-transform duration-300 hover:-translate-y-1 md:items-start md:p-5"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius)]"
              style={{
                background: `color-mix(in oklab, ${accent} 16%, transparent)`,
                boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accent} 30%, transparent)`,
              }}
            >
              <Icon size={22} style={{ color: accent }} aria-hidden />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block pr-6 text-[15px] font-semibold md:pr-0 md:text-lg">
                {titre}
              </span>
              <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-muted md:mt-1.5 md:line-clamp-none md:leading-relaxed">
                {phrase}
              </span>
            </span>

            <ArrowRight
              size={17}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-faint transition-all duration-300 group-hover:text-ink md:top-6 md:translate-y-0 md:group-hover:translate-x-1"
              aria-hidden
            />
          </Link>
        ))}
      </div>
    </div>
  )
}
