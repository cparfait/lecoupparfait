'use client'

/**
 * Page d'accueil.
 *
 * Un principe : montrer plutôt que promettre. L'échiquier de la bannière rejoue
 * en boucle une combinaison célèbre — l'Immortelle d'Anderssen — pendant que le
 * commentaire s'écrit à côté. C'est exactement ce que fait le produit, en
 * démonstration, sans avoir à cliquer.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  Database,
  Gauge,
  Heart,
  Sparkles,
  Users,
  Volume2,
} from 'lucide-react'
import { Chess } from 'chess.js'
import { Board2D } from '@/components/board/Board2D.tsx'
import { ButtonLink, Card, Chip } from '@/components/ui/index.tsx'
import { renderEmphasis, useI18n } from '@/lib/i18n/index.tsx'

/**
 * L'Immortelle — Anderssen contre Kieseritzky, Londres 1851.
 *
 * Le choix n'est pas gratuit : cette partie est célèbre parce qu'Anderssen
 * sacrifie un fou, les deux tours puis la dame, et mate avec ses trois pièces
 * mineures restantes. C'est la meilleure illustration possible de l'idée que
 * l'évaluation matérielle ne dit pas tout — précisément ce que l'application
 * cherche à faire comprendre.
 */
const IMMORTAL = [
  'e4', 'e5', 'f4', 'exf4', 'Bc4', 'Qh4+', 'Kf1', 'b5', 'Bxb5', 'Nf6',
  'Nf3', 'Qh6', 'd3', 'Nh5', 'Nh4', 'Qg5', 'Nf5', 'c6', 'g4', 'Nf6',
  'Rg1', 'cxb5', 'h4', 'Qg6', 'h5', 'Qg5', 'Qf3', 'Ng8', 'Bxf4', 'Qf6',
  'Nc3', 'Bc5', 'Nd5', 'Qxb2', 'Bd6', 'Bxg1', 'e5', 'Qxa1+', 'Ke2', 'Na6',
  'Nxg7+', 'Kd8', 'Qf6+', 'Nxf6', 'Be7#',
]

/** Commentaires affichés aux moments charnières de la démonstration. */
const COMMENTARY: Record<number, string> = {
  0: 'Le gambit du roi : les Blancs offrent un pion pour ouvrir des lignes vers le roi adverse.',
  9: 'Les Noirs ramassent du matériel pendant que les Blancs développent. Deux philosophies s’affrontent.',
  21: 'Un deuxième pion tombe. L’évaluation donne les Noirs largement gagnants — et pourtant.',
  35: 'Les Noirs viennent de prendre la tour a1. Ils ont une dame et deux tours d’avance.',
  40: 'Cavalier prend g7, échec. Le roi noir est nu au centre : le matériel ne le protège plus.',
  42: 'Sacrifice de la dame ! Anderssen abandonne sa dernière pièce lourde.',
  44: 'Fou e7, mat. Trois pièces mineures suffisent quand le roi n’a plus une seule case.',
}

export default function HomePage() {
  const { t } = useI18n()

  return (
    <>
      <Hero />
      <Features />
      <Numbers />
      <FinalCall />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Bannière
// ─────────────────────────────────────────────────────────────────────────────

function Hero() {
  const { t } = useI18n()
  const [ply, setPly] = useState(0)
  const [fen, setFen] = useState(new Chess().fen())
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [comment, setComment] = useState(COMMENTARY[0]!)

  // Déroulé automatique de la partie de démonstration.
  useEffect(() => {
    const board = new Chess()
    for (let i = 0; i < ply; i++) {
      try {
        board.move(IMMORTAL[i]!)
      } catch {
        break
      }
    }
    setFen(board.fen())
    const history = board.history({ verbose: true })
    const last = history[history.length - 1]
    setLastMove(last ? { from: last.from, to: last.to } : null)

    const found = COMMENTARY[ply]
    if (found) setComment(found)

    const isEnd = ply >= IMMORTAL.length
    const delay = isEnd ? 4200 : COMMENTARY[ply] ? 2600 : 900
    const timer = setTimeout(() => setPly(isEnd ? 0 : ply + 1), delay)
    return () => clearTimeout(timer)
  }, [ply])

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid w-full max-w-[1400px] items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:gap-16 lg:py-20">
        {/* ── Texte ─────────────────────────────────────────────────── */}
        <div className="animate-slide-up">
          <Chip tone="accent" className="mb-5">
            <Sparkles size={11} aria-hidden />
            100 % gratuit · code libre · sans publicité
          </Chip>

          <h1 className="font-display text-[clamp(2.2rem,6vw,4.1rem)] font-bold leading-[1.03] tracking-tight">
            <span className="text-gradient">Les échecs,</span>
            <br />
            enfin expliqués.
          </h1>

          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-muted">
            {renderEmphasis(t('home.heroSubtitle'))}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/jouer" variant="primary" size="lg" icon={<ArrowRight size={17} />}>
              {t('home.ctaPlay')}
            </ButtonLink>
            <ButtonLink href="/apprendre" variant="outline" size="lg">
              {t('home.ctaLearn')}
            </ButtonLink>
          </div>

          <p className="mt-4 text-xs text-faint">
            Aucune inscription nécessaire pour jouer ou apprendre.
          </p>
        </div>

        {/* ── Démonstration ─────────────────────────────────────────── */}
        <div className="animate-slide-up [animation-delay:120ms]">
          <div className="relative">
            <div
              className="absolute -inset-6 -z-10 rounded-full opacity-60 blur-3xl"
              style={{
                background:
                  'radial-gradient(circle at 30% 30%, var(--aurora-1), transparent 60%), radial-gradient(circle at 70% 70%, var(--aurora-2), transparent 60%)',
              }}
              aria-hidden
            />
            <div className="mx-auto w-full max-w-[440px]">
              <Board2D
                fen={fen}
                orientation="w"
                playable={null}
                lastMove={lastMove as never}
                allowAnnotations={false}
              />
            </div>
          </div>

          <Card className="mt-4 flex items-start gap-3 p-3.5">
            <span
              className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full"
              style={{ background: 'color-mix(in oklab, var(--accent) 20%, transparent)' }}
            >
              <Volume2 size={14} className="text-accent" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
                Le coach commente · Anderssen – Kieseritzky, Londres 1851
              </p>
              <p className="mt-1 text-sm leading-relaxed">{comment}</p>
            </div>
          </Card>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Fonctionnalités
// ─────────────────────────────────────────────────────────────────────────────

function Features() {
  const { t } = useI18n()

  const items = [
    { icon: Volume2, titleKey: 'home.features.coachTitle', bodyKey: 'home.features.coachBody', href: '/apprendre' },
    { icon: Gauge, titleKey: 'home.features.analysisTitle', bodyKey: 'home.features.analysisBody', href: '/analyse' },
    { icon: Sparkles, titleKey: 'home.features.levelsTitle', bodyKey: 'home.features.levelsBody', href: '/jouer/ordinateur' },
    { icon: Database, titleKey: 'home.features.dataTitle', bodyKey: 'home.features.dataBody', href: '/ouvertures' },
    { icon: Users, titleKey: 'home.features.friendsTitle', bodyKey: 'home.features.friendsBody', href: '/jouer/ami' },
    { icon: Heart, titleKey: 'home.features.freeTitle', bodyKey: 'home.features.freeBody', href: '/a-propos' },
  ] as const

  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 py-12 sm:px-6 lg:py-20">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ icon: Icon, titleKey, bodyKey, href }, index) => (
          <Link
            key={titleKey}
            href={href}
            className="group animate-slide-up glass gradient-ring relative overflow-hidden p-5 transition-transform duration-300 hover:-translate-y-1"
            style={{ animationDelay: `${index * 55}ms` }}
          >
            <span
              className="mb-4 grid h-10 w-10 place-items-center rounded-[var(--radius-sm)]"
              style={{
                background: 'color-mix(in oklab, var(--accent) 16%, transparent)',
                boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--accent) 28%, transparent)',
              }}
            >
              <Icon size={18} className="text-accent" aria-hidden />
            </span>
            <h3 className="text-base font-semibold">{t(titleKey)}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t(bodyKey)}</p>
            <ArrowRight
              size={16}
              className="absolute right-4 top-5 text-faint opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100"
              aria-hidden
            />
          </Link>
        ))}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Chiffres
// ─────────────────────────────────────────────────────────────────────────────

function Numbers() {
  const { t } = useI18n()

  const stats = [
    { value: '3 810', label: t('home.statsOpenings'), icon: BookOpen },
    { value: '6 057 356', label: t('home.statsPuzzles'), icon: Database },
    { value: '25', label: 'niveaux d’adversaires, de 250 à 3200 Elo', icon: Sparkles },
    { value: '7', label: 'pièces : finales résolues à la perfection', icon: Gauge },
  ]

  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 pb-12 sm:px-6 lg:pb-20">
      <Card className="grid gap-px overflow-hidden sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ value, label, icon: Icon }) => (
          <div key={label} className="bg-[var(--bg-elev)]/40 p-6 text-center">
            <Icon size={16} className="mx-auto mb-2 text-accent" aria-hidden />
            <p className="font-display text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">
              {value}
            </p>
            <p className="mt-1 text-xs leading-snug text-muted">{label}</p>
          </div>
        ))}
      </Card>
      <p className="mt-3 text-center text-[11px] text-faint">
        Jeux de données publics sous licence CC0, fournis par Lichess. Moteur Stockfish 18 sous GPL.
      </p>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Appel final
// ─────────────────────────────────────────────────────────────────────────────

function FinalCall() {
  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 pb-20 sm:px-6">
      <Card glow className="relative overflow-hidden px-6 py-12 text-center sm:px-12 sm:py-16">
        <div
          className="absolute inset-0 -z-10 opacity-70"
          style={{
            background:
              'radial-gradient(60ch 30ch at 50% 0%, var(--aurora-1), transparent 70%)',
          }}
          aria-hidden
        />
        <h2 className="font-display text-[clamp(1.6rem,4vw,2.6rem)] font-bold tracking-tight">
          Ta première partie commence maintenant.
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-muted">
          Choisis un adversaire à ta mesure, joue, et laisse le coach t’expliquer chaque coup.
          Rien à installer, rien à payer, jamais.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/jouer/ordinateur" variant="primary" size="lg">
            Jouer contre l’ordinateur
          </ButtonLink>
          <ButtonLink href="/jouer/ami" variant="outline" size="lg">
            Défier un ami
          </ButtonLink>
        </div>
      </Card>
    </section>
  )
}
