'use client'

/**
 * Choix du mode de jeu.
 *
 * Des portes d'entrée présentées à taille égale : personne ne doit avoir
 * l'impression que jouer contre un ami est une fonctionnalité secondaire.
 *
 * La carrière ferme la liste, et sa place ici plutôt que dans « Apprendre » est
 * un choix : ce sont douze duels contre des adversaires choisis, avec une leçon
 * et des puzzles autour. On y vient pour jouer.
 */

import Link from 'next/link'
import {
  ArrowRight,
  Cpu,
  Eye,
  Footprints,
  MonitorSmartphone,
  Trophy,
  Users,
} from 'lucide-react'
import { BOT_PERSONALITIES } from '@coupparfait/core'
import { PortraitAdversaire } from '@/components/brand/PortraitAdversaire.tsx'
import { useT } from '@/lib/i18n/index.tsx'

const MODES = [
  {
    href: '/jouer/ordinateur',
    icon: Cpu,
    titleKey: 'play.vsComputer',
    blurbKey: 'play.vsComputerBlurb',
    detail: '25 niveaux · 7 personnalités · de 250 à 3200 Elo',
    accent: 'var(--accent)',
  },
  {
    href: '/jouer/ami',
    icon: Users,
    titleKey: 'play.vsFriend',
    blurbKey: 'play.vsFriendBlurb',
    detail: 'De 15 secondes à 14 jours par coup · un lien, ou un ami',
    accent: 'var(--accent-2)',
  },
  {
    href: '/jouer/local',
    icon: MonitorSmartphone,
    titleKey: 'play.localGame',
    blurbKey: 'play.localBlurb',
    detail: 'L’échiquier se retourne à chaque coup si tu le souhaites',
    accent: 'var(--accent-3)',
  },
  {
    href: '/tournois',
    icon: Trophy,
    titleKey: 'play.arena',
    blurbKey: 'play.arenaBlurb',
    detail: 'On arrive quand on veut, on repart quand on veut',
    accent: 'var(--accent-3)',
  },
  {
    href: '/jouer/regarder',
    icon: Eye,
    titleKey: 'play.watchGame',
    blurbKey: 'play.watchBlurb',
    detail: 'Les parties commencées, suivies coup par coup',
    accent: 'var(--accent-2)',
  },
  {
    // En dernier, et sur le même écran que les autres.
    //
    // La carrière ouvrait la liste : on arrive ici en voulant jouer tout de
    // suite, et la première porte proposait un programme en douze chapitres.
    // Elle reste à sa place, au bout de la même grille — visible sans avoir à
    // faire défiler, mais après ce qu'on est venu chercher.
    href: '/carriere',
    icon: Footprints,
    titleKey: 'play.career',
    blurbKey: 'play.careerBlurb',
    detail: '12 chapitres · une leçon, des puzzles et un duel par chapitre',
    accent: 'var(--accent)',
  },
] as const

export default function PlayLobbyPage() {
  const t = useT()

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-14">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        {t('play.title')}
      </h1>
      <p className="mt-2 max-w-xl text-muted">
        Contre la machine pour t’entraîner à ton rythme, contre un ami pour le plaisir, ou à
        deux sur le même écran.
      </p>

      <div className="mt-8 grid gap-3 md:grid-cols-3">
        {MODES.map(({ href, icon: Icon, titleKey, blurbKey, detail, accent }, index) => (
          <Link
            key={href}
            href={href}
            className="group animate-slide-up glass gradient-ring relative flex flex-col overflow-hidden p-6 transition-transform duration-300 hover:-translate-y-1"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <span
              className="mb-5 grid h-12 w-12 place-items-center rounded-[var(--radius)]"
              style={{
                background: `color-mix(in oklab, ${accent} 16%, transparent)`,
                boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accent} 30%, transparent)`,
              }}
            >
              <Icon size={22} style={{ color: accent }} aria-hidden />
            </span>

            <h2 className="text-lg font-semibold">{t(titleKey)}</h2>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">{t(blurbKey)}</p>
            <p className="mt-4 text-[11px] uppercase tracking-wide text-faint">{detail}</p>

            <ArrowRight
              size={17}
              className="absolute right-5 top-6 text-faint transition-all duration-300 group-hover:translate-x-1 group-hover:text-ink"
              aria-hidden
            />
          </Link>
        ))}
      </div>

      {/* ── Aperçu des personnalités ─────────────────────────────────── */}
      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Tes adversaires artificiels
        </h2>
        <p className="mt-1.5 text-sm text-muted">
          Chacun a un style de jeu réellement différent — ce n’est pas qu’un habillage : leur
          façon de choisir un coup est biaisée en faveur de ce qu’ils aiment.
        </p>

        {/* Sans carte, et c'est le point : sept encadrés côte à côte sous
            trois autres encadrés font une page de tableau de bord. Ces sept-là
            ne sont pas des boutons — on ne choisit pas son adversaire ici, on
            fait sa connaissance. Un portrait, un nom, une phrase suffisent ;
            le liseré ne servait qu'à occuper l'espace entre eux. */}
        <div className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {Object.values(BOT_PERSONALITIES).map((personality) => (
            <div key={personality.id} className="flex gap-3">
              <PortraitAdversaire personality={personality} size={44} />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{personality.name.fr}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{personality.blurb.fr}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
