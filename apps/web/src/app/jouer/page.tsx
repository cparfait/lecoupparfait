'use client'

/**
 * Choix du mode de jeu.
 *
 * Quatre portes d'entrée, présentées à taille égale : personne ne doit avoir
 * l'impression que jouer contre un ami est une fonctionnalité secondaire.
 */

import Link from 'next/link'
import { ArrowRight, Cpu, Eye, Mailbox, MonitorSmartphone, Users } from 'lucide-react'
import { BOT_PERSONALITIES, SPEED_LABELS, TIME_CONTROLS } from '@coupparfait/core'
import { Card, Chip } from '@/components/ui/index.tsx'
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
    detail: 'Temps réel · aucun compte requis pour ton invité',
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
    href: '/correspondance',
    icon: Mailbox,
    titleKey: 'play.correspondence',
    blurbKey: 'play.correspondenceBlurb',
    detail: 'Un coup par jour · la partie t’attend',
    accent: 'var(--accent)',
  },
  {
    href: '/jouer/regarder',
    icon: Eye,
    titleKey: 'play.watchGame',
    blurbKey: 'play.watchBlurb',
    detail: 'Les parties commencées, suivies coup par coup',
    accent: 'var(--accent-2)',
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

        <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {Object.values(BOT_PERSONALITIES).map((personality) => (
            <Card key={personality.id} className="flex gap-3 p-4">
              <span className="text-2xl" aria-hidden>
                {personality.emoji}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{personality.name.fr}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{personality.blurb.fr}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Cadences ────────────────────────────────────────────────── */}
      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold tracking-tight">Les cadences</h2>
        <p className="mt-1.5 text-sm text-muted">
          Le premier nombre est le temps de départ, le second ce que chaque coup te rapporte.
          En « 5 | 3 », tu commences avec cinq minutes et tu gagnes trois secondes par coup.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {TIME_CONTROLS.filter((tc) => tc.id !== '0+0').map((tc) => (
            <Chip key={tc.id} tone="neutral">
              <span aria-hidden>{SPEED_LABELS[tc.category].icon}</span>
              {tc.label}
            </Chip>
          ))}
        </div>
      </section>
    </div>
  )
}
