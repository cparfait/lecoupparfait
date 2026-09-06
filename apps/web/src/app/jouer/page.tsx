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
  Mail,
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
    principal: true,
    icon: Cpu,
    titleKey: 'play.vsComputer',
    blurbKey: 'play.vsComputerBlurb',
    detail: '25 niveaux · 7 personnalités · de 100 à 3200 Elo',
    accent: 'var(--accent)',
  },
  {
    href: '/jouer/ami',
    principal: true,
    icon: Users,
    titleKey: 'play.vsFriend',
    blurbKey: 'play.vsFriendBlurb',
    detail: 'De 15 secondes à 14 jours par coup · un lien, ou un ami',
    accent: 'var(--accent-2)',
  },
  {
    // La boîte des correspondances, revenue ici.
    //
    // Elle avait été rangée dans « Communauté » au motif qu'elle concerne des
    // gens plutôt qu'une façon de jouer. C'est vrai de la liste, et faux de ce
    // qu'on vient y faire : on l'ouvre pour jouer son coup. « Contre
    // quelqu'un » propose bien la cadence longue, mais c'est l'écran qui
    // *crée* une partie — celui-ci est l'endroit où l'on retrouve celles qui
    // sont en cours.
    href: '/correspondance',
    icon: Mail,
    titleKey: 'play.correspondence',
    blurbKey: 'play.correspondenceBlurb',
    detail: 'Un coup quand tu peux · de 1 à 14 jours par coup',
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
      <p className="mt-2 max-w-xl text-muted max-lg:text-[14px] max-lg:leading-relaxed">
        Contre la machine pour t’entraîner à ton rythme, contre un ami pour le plaisir, ou à deux
        sur le même écran.
      </p>

      {/* ── Deux grandes portes, puis les autres ───────────────────────────

          Sept cartes identiques disaient que « Regarder une partie » pesait
          autant que « Contre l'ordinateur ». Ce n'est pas vrai de ce qu'on
          vient faire ici : on vient jouer une partie, tout de suite, contre la
          machine ou contre quelqu'un. Ces deux-là prennent la largeur, en
          grand ; les cinq autres suivent en rangées compactes, icône à gauche,
          où l'on voit d'un coup d'œil qu'elles existent sans qu'elles
          réclament la même attention.

          Sur téléphone, tout s'empile dans le même ordre : les deux grandes
          gardent leur relief, les rangées restent des rangées. */}
      <div className="mt-6 grid gap-3 md:mt-8 md:grid-cols-2 md:gap-4">
        {MODES.filter((mode) => 'principal' in mode).map(
          ({ href, icon: Icon, titleKey, blurbKey, detail, accent }, index) => (
            <Link
              key={href}
              href={href}
              className="group animate-slide-up glass gradient-ring relative flex flex-col overflow-hidden p-5 pr-12 transition-transform duration-300 hover:-translate-y-1 md:p-7"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <span
                className="mb-4 grid h-12 w-12 shrink-0 place-items-center rounded-[var(--radius)] md:mb-5 md:h-14 md:w-14"
                style={{
                  background: `color-mix(in oklab, ${accent} 16%, transparent)`,
                  boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accent} 30%, transparent)`,
                }}
              >
                <Icon size={26} style={{ color: accent }} aria-hidden />
              </span>
              <h2 className="font-display text-xl font-semibold tracking-tight md:text-2xl">
                {t(titleKey)}
              </h2>
              <p className="mt-1.5 flex-1 text-[15px] leading-relaxed text-muted">{t(blurbKey)}</p>
              <p className="mt-4 text-[13px] text-faint">{detail}</p>
              <ArrowRight
                size={18}
                className="absolute right-5 top-6 text-faint transition-all duration-300 group-hover:translate-x-1 group-hover:text-ink md:top-7"
                aria-hidden
              />
            </Link>
          ),
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 md:mt-4 md:gap-3 lg:grid-cols-3">
        {MODES.filter((mode) => !('principal' in mode)).map(
          ({ href, icon: Icon, titleKey, blurbKey, accent }, index) => (
            <Link
              key={href}
              href={href}
              /* `pr-11` : la flèche est posée en absolu contre le bord droit,
                 et la phrase lui passerait dessous sans cette réserve. */
              className="group animate-slide-up glass relative flex items-center gap-3.5 overflow-hidden p-3.5 pr-11 transition-transform duration-300 hover:-translate-y-0.5"
              style={{ animationDelay: `${140 + index * 60}ms` }}
            >
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-sm)]"
                style={{
                  background: `color-mix(in oklab, ${accent} 16%, transparent)`,
                  boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accent} 30%, transparent)`,
                }}
              >
                <Icon size={21} style={{ color: accent }} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-semibold">{t(titleKey)}</h2>
                {/* Le détail — « 12 chapitres · une leçon… » — est ce qu'on
                    lit une fois, et il coûte une ligne de plus par rangée. Il
                    reste sur l'écran de destination, où il sert au moment de
                    choisir. */}
                <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted">{t(blurbKey)}</p>
              </div>
              <ArrowRight
                size={17}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-faint transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-ink"
                aria-hidden
              />
            </Link>
          ),
        )}
      </div>

      {/* ── Aperçu des personnalités ─────────────────────────────────── */}
      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Tes adversaires artificiels
          </h2>
          <Link
            href="/jouer/adversaires"
            className="text-[14px] font-medium text-accent hover:underline"
          >
            Tous les portraits
          </Link>
        </div>
        <p className="mt-1.5 text-sm text-muted">
          Chacun a un style de jeu réellement différent — ce n’est pas qu’un habillage : leur façon
          de choisir un coup est biaisée en faveur de ce qu’ils aiment.
        </p>

        {/* Sans carte, et c'est le point : sept encadrés côte à côte sous
            trois autres encadrés font une page de tableau de bord. Ces sept-là
            ne sont pas des boutons — on ne choisit pas son adversaire ici, on
            fait sa connaissance. Un portrait, un nom, une phrase suffisent ;
            le liseré ne servait qu'à occuper l'espace entre eux.

            Ce sont en revanche des **liens**, désormais. Ils ne l'étaient pas,
            et il n'y avait donc rien à savoir de sept personnages qu'on
            affronte pendant des heures : d'où viennent-ils, à quels niveaux les
            croise-t-on, comment les battre. Le survol souligne le nom — le
            reste de la vignette n'a pas à s'agiter au passage de la souris. */}
        <div className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {Object.values(BOT_PERSONALITIES).map((personality) => (
            <Link
              key={personality.id}
              href={`/jouer/adversaires/${personality.id}`}
              className="group flex gap-3"
            >
              <PortraitAdversaire personality={personality} size={44} />
              <div className="min-w-0">
                <p className="text-sm font-semibold group-hover:underline">{personality.name.fr}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{personality.blurb.fr}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
