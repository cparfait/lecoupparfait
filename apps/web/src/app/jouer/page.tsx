'use client'

/**
 * Choix du mode de jeu.
 *
 * Sept portes, à la même taille, dans l'ordre de ce qu'on vient chercher :
 * jouer une partie tout de suite, contre la machine ou contre quelqu'un, puis
 * le reste. La carrière ferme la liste, et sa place ici plutôt que dans
 * « Apprendre » est un choix : ce sont douze duels contre des adversaires
 * choisis. On y vient pour jouer.
 *
 * Toutes les cartes sont de la même forme et de la même couleur — celle de la
 * rubrique, sur la pastille seulement. Deux grandes et cinq petites disaient
 * que « Regarder une partie » pesait moins ; l'ordre le dit aussi bien, et la
 * page se lit d'un coup d'œil.
 */

import Link from 'next/link'
import {
  Cpu,
  Eye,
  Footprints,
  GraduationCap,
  Mail,
  MonitorSmartphone,
  Trophy,
  Users,
} from 'lucide-react'
import { BOT_PERSONALITIES } from '@coupparfait/core'
import { PortraitAdversaire } from '@/components/brand/PortraitAdversaire.tsx'
import { CarteDestination } from '@/components/ui/CarteDestination.tsx'
import { TitreDePage, TitreDeSection } from '@/components/ui/index.tsx'
import { useT } from '@/lib/i18n/index.tsx'
import { SECTIONS } from '@/lib/navigation.ts'

const TEINTE = SECTIONS.find((s) => s.id === 'jouer')?.teinte

const MODES = [
  {
    href: '/jouer/ordinateur',
    icon: Cpu,
    titleKey: 'play.vsComputer',
    blurbKey: 'play.vsComputerBlurb',
    detail: '25 niveaux · 7 personnalités · de 100 à 3200 Elo',
  },
  // La séance en deuxième, juste derrière la partie libre contre la machine :
  // c'est la même partie, avec un thème et un bilan. Mise plus bas, personne ne
  // la trouverait — et c'est le seul mode de cette page qui apprenne quelque
  // chose sans demander de compte.
  {
    href: '/jouer/pedagogique',
    icon: GraduationCap,
    titleKey: 'play.seance',
    blurbKey: 'play.seanceBlurb',
    detail: '10 thèmes · adversaire calibré sur ton palier · mode commenté',
  },
  {
    href: '/jouer/ami',
    icon: Users,
    titleKey: 'play.vsFriend',
    blurbKey: 'play.vsFriendBlurb',
    detail: 'De 15 secondes à 14 jours par coup · un lien, ou un ami',
  },
  {
    href: '/correspondance',
    icon: Mail,
    titleKey: 'play.correspondence',
    blurbKey: 'play.correspondenceBlurb',
    detail: 'Un coup quand tu peux · de 1 à 14 jours par coup',
  },
  {
    href: '/jouer/local',
    icon: MonitorSmartphone,
    titleKey: 'play.localGame',
    blurbKey: 'play.localBlurb',
    detail: 'L’échiquier se retourne à chaque coup si tu le souhaites',
  },
  {
    href: '/tournois',
    icon: Trophy,
    titleKey: 'play.arena',
    blurbKey: 'play.arenaBlurb',
    detail: 'On arrive quand on veut, on repart quand on veut',
  },
  {
    href: '/jouer/regarder',
    icon: Eye,
    titleKey: 'play.watchGame',
    blurbKey: 'play.watchBlurb',
    detail: 'Les parties commencées, suivies coup par coup',
  },
  {
    href: '/carriere',
    icon: Footprints,
    titleKey: 'play.career',
    blurbKey: 'play.careerBlurb',
    detail: '12 chapitres · une leçon, des puzzles et un duel par chapitre',
  },
] as const

export default function PlayLobbyPage() {
  const t = useT()

  return (
    <div className="page">
      <TitreDePage intro="Contre la machine pour t’entraîner à ton rythme, contre un ami pour le plaisir, ou à deux sur le même écran.">
        {t('play.title')}
      </TitreDePage>

      <div className="grille-cartes">
        {MODES.map(({ href, icon, titleKey, blurbKey, detail }, index) => (
          <CarteDestination
            key={href}
            href={href}
            icon={icon}
            teinte={TEINTE}
            titre={t(titleKey)}
            phrase={t(blurbKey)}
            detail={detail}
            className="animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          />
        ))}
      </div>

      {/* ── Aperçu des personnalités ─────────────────────────────────── */}
      <section className="mt-12">
        <TitreDeSection
          hint="Chacun a un style de jeu réellement différent : leur façon de choisir un coup est biaisée en faveur de ce qu’ils aiment."
          action={
            <Link href="/jouer/adversaires" className="lien shrink-0">
              Tous les portraits
            </Link>
          }
        >
          Tes adversaires artificiels
        </TitreDeSection>

        {/* Sans carte : ces sept-là ne sont pas des boutons, on fait leur
            connaissance. Un portrait, un nom, une phrase. */}
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
