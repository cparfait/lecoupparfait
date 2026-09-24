'use client'

/**
 * Choix du mode de jeu.
 *
 * Six portes, à la même taille, dans l'ordre de ce qu'on vient chercher :
 * jouer une partie tout de suite, contre la machine ou contre quelqu'un, puis
 * le reste. La carrière n'est plus ici : elle vit dans « Progresser », au
 * cœur de « Ton chemin », où le palier dit où l'on en est et le chapitre ce
 * qu'il faut faire ensuite. Deux entrées pour un même parcours en faisaient
 * deux parcours.
 *
 * Toutes les cartes sont de la même forme et de la même couleur — celle de la
 * rubrique, sur la pastille seulement. Deux grandes et cinq petites disaient
 * que « Regarder une partie » pesait moins ; l'ordre le dit aussi bien, et la
 * page se lit d'un coup d'œil.
 */

import type { CSSProperties } from 'react'
import Link from 'next/link'
import { Cpu, Eye, Mail, MonitorSmartphone, Trophy, Users } from 'lucide-react'
import { BOT_PERSONALITIES } from '@coupparfait/core'
import { PortraitAdversaire } from '@/components/brand/PortraitAdversaire.tsx'
import { cadreDuPortrait, TEINTES_ADVERSAIRES } from '@/lib/adversaires.ts'
import { CarteDestination } from '@/components/ui/CarteDestination.tsx'
import { TitreDePage, TitreDeSection } from '@/components/ui/index.tsx'
import { useT } from '@/lib/i18n/index.tsx'
import { SECTIONS } from '@/lib/navigation.ts'
import { tCoeur } from '@/lib/i18n/resoudre.ts'

const TEINTE = SECTIONS.find((s) => s.id === 'jouer')?.teinte

const MODES = [
  {
    href: '/jouer/ordinateur',
    icon: Cpu,
    titleKey: 'play.vsComputer',
    blurbKey: 'play.vsComputerBlurb',
    detailKey: 'play.vsComputerDetail',
  },
  {
    href: '/jouer/ami',
    icon: Users,
    titleKey: 'play.vsFriend',
    blurbKey: 'play.vsFriendBlurb',
    detailKey: 'play.vsFriendDetail',
  },
  {
    href: '/correspondance',
    icon: Mail,
    titleKey: 'play.correspondence',
    blurbKey: 'play.correspondenceBlurb',
    detailKey: 'play.correspondenceDetail',
  },
  {
    href: '/jouer/local',
    icon: MonitorSmartphone,
    titleKey: 'play.localGame',
    blurbKey: 'play.localBlurb',
    detailKey: 'play.localDetail',
  },
  {
    href: '/tournois',
    icon: Trophy,
    titleKey: 'play.arena',
    blurbKey: 'play.arenaBlurb',
    detailKey: 'play.arenaDetail',
  },
  {
    href: '/jouer/regarder',
    icon: Eye,
    titleKey: 'play.watchGame',
    blurbKey: 'play.watchBlurb',
    detailKey: 'play.watchDetail',
  },
] as const

export default function PlayLobbyPage() {
  const t = useT()
  /* La langue du **contenu** pour les sept portraits : leurs noms et leurs
     phrases sont écrits dans le cœur, en français et en anglais seulement.
     Voir `localeDuContenu`. */

  return (
    <div className="page">
      <TitreDePage intro={t('play.lobbyIntro')}>{t('play.title')}</TitreDePage>

      <div className="grille-cartes">
        {MODES.map(({ href, icon, titleKey, blurbKey, detailKey }, index) => (
          <CarteDestination
            key={href}
            href={href}
            icon={icon}
            teinte={TEINTE}
            titre={t(titleKey)}
            phrase={t(blurbKey)}
            detail={t(detailKey)}
            className="animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          />
        ))}
      </div>

      {/* ── Aperçu des personnalités ─────────────────────────────────── */}
      <section className="mt-12">
        <TitreDeSection
          hint={t('play.opponentsHint')}
          action={
            <Link href="/jouer/adversaires" className="lien shrink-0">
              {t('play.allPortraits')}
            </Link>
          }
        >
          {t('play.opponentsTitle')}
        </TitreDeSection>

        {/* Des cartes, comme tout le reste de la page.

            Elles n'en avaient pas — « ces sept-là ne sont pas des boutons, on
            fait leur connaissance », disait le commentaire. Sauf qu'ils en
            sont : chacun est un lien vers sa fiche. Et posés en texte nu sous
            huit cartes de verre, ils se lisaient comme une note de bas de
            page, alors que c'est la galerie des adversaires — ce que
            l'application a de plus reconnaissable.

            Elles reprennent donc la grammaire des cartes de destination : le
            portrait dans un cadre à la teinte de sa sculpture, le nom en
            police d'affichage, la phrase en dessous, et le halo de cette même
            teinte qui s'allume au survol (`carte-porte`). La teinte vient de
            `lib/adversaires`, partagée avec l'écran de configuration. */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Object.values(BOT_PERSONALITIES).map((personality, index) => {
            const teinte = TEINTES_ADVERSAIRES[personality.id]
            return (
              <Link
                key={personality.id}
                href={`/jouer/adversaires/${personality.id}`}
                className="group glass carte-porte animate-slide-up relative flex items-start gap-3.5 overflow-hidden p-4"
                style={
                  { '--teinte-porte': teinte, animationDelay: `${index * 50}ms` } as CSSProperties
                }
              >
                <span
                  className="grid h-[60px] w-[52px] shrink-0 place-items-center rounded-[14px] transition-transform duration-300 group-hover:scale-105"
                  style={cadreDuPortrait(teinte)}
                  aria-hidden
                >
                  <PortraitAdversaire personality={personality} size={46} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[16px] font-bold tracking-[-0.015em]">
                    {tCoeur(t, personality.name)}
                  </span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-muted">
                    {tCoeur(t, personality.blurb)}
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
