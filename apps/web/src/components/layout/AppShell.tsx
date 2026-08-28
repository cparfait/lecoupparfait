'use client'

/**
 * Ossature de l'application.
 *
 * Deux navigations distinctes plutôt qu'une seule adaptative :
 *  - sur **grand écran**, une barre supérieure avec les rubriques ;
 *  - sur **mobile**, une barre inférieure fixe, à portée de pouce, qui reste
 *    visible pendant une partie.
 *
 * La barre inférieure disparaît en mode plein écran pour laisser toute la place
 * à l'échiquier.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen,
  BookMarked,
  Crown,
  Eye,
  Gauge,
  GraduationCap,
  Home,
  Menu,
  Puzzle,
  Settings,
  Swords,
  Trophy,
  Users,
  User,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { ChallengeWatcher } from '@/components/social/ChallengeWatcher.tsx'
import type { ReactNode } from 'react'
import { useT } from '@/lib/i18n/index.tsx'
import type { TranslationKey } from '@/lib/i18n/index.tsx'
import { ThemeQuickSwitch } from './ThemeQuickSwitch.tsx'
import { VoiceQuickToggle } from './VoiceQuickToggle.tsx'

interface NavItem {
  href: string
  labelKey: TranslationKey
  icon: typeof Home
  /** Présent dans la barre inférieure mobile. */
  primary?: boolean
}

const NAV: NavItem[] = [
  { href: '/jouer', labelKey: 'nav.play', icon: Swords, primary: true },
  { href: '/apprendre', labelKey: 'nav.learn', icon: GraduationCap, primary: true },
  { href: '/puzzles', labelKey: 'nav.puzzles', icon: Puzzle, primary: true },
  { href: '/vision', labelKey: 'nav.vision', icon: Eye },
  { href: '/ouvertures', labelKey: 'nav.openings', icon: BookOpen },
  { href: '/finales', labelKey: 'nav.endgames', icon: Crown },
  { href: '/analyse', labelKey: 'nav.analysis', icon: Gauge, primary: true },
  { href: '/glossaire', labelKey: 'nav.glossary', icon: BookMarked },
  { href: '/classement', labelKey: 'nav.leaderboard', icon: Trophy },
  { href: '/amis', labelKey: 'nav.friends', icon: Users },
]

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const t = useT()
  const [menuOpen, setMenuOpen] = useState(false)

  // Toute navigation referme le menu : sinon il resterait ouvert par-dessus la
  // nouvelle page.
  useEffect(() => setMenuOpen(false), [pathname])

  // Les pages de partie masquent la navigation mobile pour libérer l'écran.
  const immersive = /^\/(jouer|puzzles|apprendre)\/[^/]+/.test(pathname)

  return (
    <div className="flex min-h-dvh flex-col">
      {/* ── Barre supérieure ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-line/70 backdrop-blur-xl">
        <div
          className="absolute inset-0 -z-10 bg-[var(--bg)]/72"
          aria-hidden
        />
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-2 px-3 sm:px-5">
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2 rounded-[var(--radius-sm)] px-1.5 py-1"
            aria-label="Le Coup Parfait — accueil"
          >
            <LogoMark />
            <span className="hidden font-display text-[17px] font-semibold tracking-tight sm:block">
              Le Coup Parfait
            </span>
          </Link>

          <nav className="ml-2 hidden items-center gap-0.5 md:flex" aria-label="Navigation principale">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={clsx(
                    'relative rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-colors',
                    active ? 'text-ink' : 'text-muted hover:text-ink hover:bg-surface-hover',
                  )}
                >
                  {t(item.labelKey)}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-[11px] h-[2px] rounded-full bg-accent" />
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <VoiceQuickToggle />
            <ThemeQuickSwitch />
            <Link
              href="/preferences"
              className="grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] text-muted transition-colors hover:bg-surface-hover hover:text-ink"
              aria-label={t('nav.settings')}
            >
              <Settings size={17} aria-hidden />
            </Link>
            <Link
              href="/connexion"
              className="hidden h-9 items-center rounded-[var(--radius-sm)] bg-accent px-3.5 text-[13px] font-semibold text-[var(--accent-contrast)] transition-all hover:brightness-110 sm:inline-flex"
            >
              {t('nav.signIn')}
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] text-muted transition-colors hover:bg-surface-hover hover:text-ink md:hidden"
              aria-label={t('nav.menu')}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
            </button>
          </div>
        </div>

        {menuOpen && <MobileMenu items={NAV} pathname={pathname} />}
      </header>

      {/* ── Contenu ──────────────────────────────────────────────────── */}
      <main className={clsx('flex-1', !immersive && 'pb-20 md:pb-0')}>{children}</main>

      {/* Un ami peut proposer une partie pendant qu'on lit une leçon : le
          guetteur vit donc dans la coque, pas dans une page. */}
      <ChallengeWatcher />

      {/* ── Barre inférieure mobile ──────────────────────────────────── */}
      {!immersive && <BottomBar pathname={pathname} />}

      <SiteFooter />
    </div>
  )
}

function LogoMark() {
  return (
    <span className="relative grid h-8 w-8 place-items-center">
      <span
        className="absolute inset-0 rounded-[10px] opacity-90 transition-transform duration-300 group-hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
          boxShadow: 'var(--glow)',
        }}
      />
      <Crown size={16} className="relative text-[var(--accent-contrast)]" aria-hidden />
    </span>
  )
}

function MobileMenu({ items, pathname }: { items: NavItem[]; pathname: string }) {
  const t = useT()
  return (
    <div className="animate-slide-up border-t border-line bg-[var(--bg-elev)] md:hidden">
      <nav className="grid grid-cols-2 gap-1 p-3" aria-label="Navigation">
        {items.map((item) => {
          const Icon = item.icon
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium',
                active ? 'bg-surface-strong text-ink' : 'text-muted',
              )}
            >
              <Icon size={16} aria-hidden />
              {t(item.labelKey)}
            </Link>
          )
        })}
        <Link
          href="/connexion"
          className="col-span-2 mt-1 flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-accent px-3 py-2.5 text-sm font-semibold text-[var(--accent-contrast)]"
        >
          <User size={16} aria-hidden />
          {t('nav.signIn')}
        </Link>
      </nav>
    </div>
  )
}

function BottomBar({ pathname }: { pathname: string }) {
  const t = useT()
  const items = NAV.filter((item) => item.primary)

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-[var(--bg)]/88 backdrop-blur-xl safe-bottom md:hidden"
      aria-label="Navigation rapide"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around px-1 pt-1.5">
        {items.map((item) => {
          const Icon = item.icon
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={clsx(
                'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[var(--radius-sm)] px-1 py-1.5 transition-colors',
                active ? 'text-accent' : 'text-faint',
              )}
            >
              <Icon size={19} strokeWidth={active ? 2.4 : 1.9} aria-hidden />
              <span className="truncate text-[10px] font-medium leading-none">
                {t(item.labelKey)}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function SiteFooter() {
  return (
    <footer className="browser-only mt-auto hidden border-t border-line/60 py-6 md:block">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-5 text-xs text-faint">
        <p>
          Le Coup Parfait — logiciel libre sous licence AGPL-3.0. Aucune publicité, aucun traqueur,
          aucune donnée revendue.
        </p>
        <nav className="flex gap-4" aria-label="Liens secondaires">
          <Link href="/a-propos" className="transition-colors hover:text-ink">
            À propos
          </Link>
          <Link href="/credits" className="transition-colors hover:text-ink">
            Crédits &amp; licences
          </Link>
          <a
            href="https://github.com/official-stockfish/Stockfish"
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-ink"
          >
            Stockfish 18
          </a>
        </nav>
      </div>
    </footer>
  )
}
