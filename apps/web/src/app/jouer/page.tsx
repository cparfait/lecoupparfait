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

      {/* ── Les six portes ───────────────────────────────────────────────

          Deux mises en page pour la même liste, et le partage se fait à `md`,
          là où la grille passe à trois colonnes.

          Au-delà, une carte par colonne : icône posée en haut, titre, phrase,
          et la ligne de détail en capitales. C'est une vitrine, on la parcourt
          du regard.

          En dessous, les six cartes s'empilent — et une vitrine empilée
          devient un couloir. Chacune faisait près de deux cents points de
          haut : la carrière, en sixième position, se trouvait à trois écrans
          de défilement de « Contre l'ordinateur ». On les remet donc en
          rangées : icône à gauche, texte à droite, sans la ligne de détail.
          Six rangées tiennent alors dans un écran et demi, et l'on voit qu'il
          y a six façons de jouer — ce qui est la première chose que cet écran
          a à dire. */}
      <div className="mt-6 grid gap-2 md:mt-8 md:gap-3 md:grid-cols-3">
        {MODES.map(({ href, icon: Icon, titleKey, blurbKey, detail, accent }, index) => (
          <Link
            key={href}
            href={href}
            className="group animate-slide-up glass gradient-ring relative flex flex-row items-center gap-3.5 overflow-hidden p-3.5 transition-transform duration-300 hover:-translate-y-1 md:flex-col md:items-stretch md:gap-0 md:p-6"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius)] md:mb-5 md:h-12 md:w-12"
              style={{
                background: `color-mix(in oklab, ${accent} 16%, transparent)`,
                boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accent} 30%, transparent)`,
              }}
            >
              <Icon size={22} style={{ color: accent }} aria-hidden />
            </span>

            {/* `md:contents` : au-delà de `md` cette boîte disparaît de la mise
                en page et ses trois enfants redeviennent ceux de la carte,
                ce qui rend au `flex-1` de la phrase son effet d'origine —
                pousser la ligne de détail contre le bas. */}
            <div className="min-w-0 flex-1 md:contents">
              <h2 className="pr-6 text-[15px] font-semibold md:pr-0 md:text-lg">{t(titleKey)}</h2>
              <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted md:mt-1.5 md:line-clamp-none md:flex-1 md:text-sm md:leading-relaxed">
                {t(blurbKey)}
              </p>
              {/* Le détail — « 25 niveaux · 7 personnalités » — est ce qu'on
                  lit une fois, et il coûte deux lignes sur un téléphone. Il
                  reste sur l'écran de réglages, où il sert au moment de
                  choisir. */}
              <p className="mt-4 hidden text-[11px] uppercase tracking-wide text-faint md:block">
                {detail}
              </p>
            </div>

            <ArrowRight
              size={17}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-faint transition-all duration-300 group-hover:text-ink md:right-5 md:top-6 md:translate-y-0 md:group-hover:translate-x-1"
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
