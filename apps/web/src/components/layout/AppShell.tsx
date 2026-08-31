'use client'

/**
 * Ossature de l'application.
 *
 * Deux navigations distinctes plutôt qu'une seule adaptative :
 *  - sur **grand écran**, une barre supérieure de cinq menus déroulants ;
 *  - sur **mobile**, une barre inférieure fixe, à portée de pouce, qui reste
 *    visible pendant une partie.
 *
 * Le classement des rubriques est **par verbe** — jouer, apprendre,
 * s'entraîner, analyser — parce qu'on ouvre l'application en sachant ce qu'on
 * vient faire bien avant de savoir avec quel outil. La structure elle-même vit
 * dans `lib/navigation.ts` : ce fichier ne fait que la mettre en scène, et les
 * trois surfaces la lisent au même endroit.
 *
 * La barre inférieure disparaît en mode plein écran pour laisser toute la place
 * à l'échiquier.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Lock, Menu as MenuIcon, Settings, X } from 'lucide-react'
import clsx from 'clsx'
import { LogoMark as MarqueCavale } from '@/components/brand/LogoMark.tsx'
import { AccountButton } from '@/components/layout/AccountButton.tsx'
import { ChallengeWatcher } from '@/components/social/ChallengeWatcher.tsx'
import { PastilleSerie } from '@/components/daily/PastilleSerie.tsx'
import { Menu } from '@/components/ui/Menu.tsx'
import { PorteDuCompte } from '@/components/compte/PorteDuCompte.tsx'
import type { ReactNode } from 'react'
import { useT } from '@/lib/i18n/index.tsx'
import { useIdentite } from '@/lib/auth/useIdentite.ts'
import { avantagePour, type AvantageCompte } from '@/lib/compte/avantages.ts'
import { RACCOURCIS_MOBILES, SECTIONS, sectionActive } from '@/lib/navigation.ts'
import { ThemeQuickSwitch } from './ThemeQuickSwitch.tsx'
import { VoiceQuickToggle } from './VoiceQuickToggle.tsx'

/**
 * Ce qu'il y a à dire avant d'ouvrir cette rubrique, s'il y a quelque chose.
 *
 * Rend l'explication quand la destination demande un compte **et** que
 * personne n'est connecté ; `null` sinon, et le lien fait son travail
 * ordinaire. C'est aussi ce qui décide du cadenas affiché dans les menus : une
 * seule source, donc jamais un cadenas sur une entrée qui laisse passer.
 *
 * Le cas `undefined` de l'identité — on ne sait pas encore — rend `null` lui
 * aussi, délibérément : mieux vaut une explication manquée qu'une boîte
 * s'ouvrant au nez de quelqu'un de connecté parce que la réponse tardait.
 */
type Intercepteur = (href: string) => AvantageCompte | null

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const t = useT()
  const [menuOpen, setMenuOpen] = useState(false)
  const identite = useIdentite()
  const [porte, setPorte] = useState<{ avantage: AvantageCompte; href: string } | null>(null)

  const intercepter = useCallback<Intercepteur>(
    (href) => (identite === null ? avantagePour(href) : null),
    [identite],
  )

  /**
   * Ouvrir la boîte referme le menu qui l'a déclenchée.
   *
   * Sur téléphone le menu occupe tout l'écran : sans cela il restait déroulé
   * derrière la boîte, et l'on refermait la boîte pour retomber sur une liste
   * qu'on croyait avoir quittée. Le clic est consommé par l'explication, il ne
   * doit pas laisser le menu ouvert dans son dos.
   */
  const ouvrirPorte = useCallback((demande: { avantage: AvantageCompte; href: string }) => {
    setMenuOpen(false)
    setPorte(demande)
  }, [])

  // Toute navigation referme le menu : sinon il resterait ouvert par-dessus la
  // nouvelle page.
  useEffect(() => setMenuOpen(false), [pathname])
  // Et la boîte, pour la même raison : « Voir quand même » navigue, la boîte
  // n'a plus rien à dire sur la page où l'on vient d'arriver.
  useEffect(() => setPorte(null), [pathname])

  // Les pages de partie masquent la navigation mobile pour libérer l'écran.
  const immersive = /^\/(jouer|puzzles|apprendre)\/[^/]+/.test(pathname)

  return (
    <div className="flex min-h-dvh flex-col">
      {/* ── Barre supérieure ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-line/70 backdrop-blur-xl">
        <div className="absolute inset-0 -z-10 bg-[var(--bg)]/72" aria-hidden />
        {/* Le resserrement sous 360 px n'est pas cosmétique.
            Six commandes à droite — série, voix, thème, préférences, compte,
            menu — tiennent à 375 px et débordaient de treize pixels à 320 :
            l'en-tête gagnait une barre de défilement horizontale sur un iPhone
            SE. On récupère la place sur les marges et les écarts, qui ne se
            voient pas, plutôt qu'en retirant une commande, qui se verrait. */}
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-2 px-3 [@media(max-width:359px)]:px-1.5 sm:px-5">
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
            {SECTIONS.map((section) => (
              <MenuSection
                key={section.id}
                section={section}
                pathname={pathname}
                intercepter={intercepter}
                onPorte={ouvrirPorte}
              />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 [@media(max-width:359px)]:gap-0.5">
            <PastilleSerie />
            <VoiceQuickToggle />
            <ThemeQuickSwitch />
            <Link
              href="/preferences"
              className="grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] text-muted transition-colors hover:bg-surface-hover hover:text-ink"
              aria-label={t('nav.settings')}
            >
              <Settings size={17} aria-hidden />
            </Link>
            <AccountButton />
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] text-muted transition-colors hover:bg-surface-hover hover:text-ink md:hidden"
              aria-label={t('nav.menu')}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={18} aria-hidden /> : <MenuIcon size={18} aria-hidden />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <MobileMenu pathname={pathname} intercepter={intercepter} onPorte={ouvrirPorte} />
        )}
      </header>

      {/* Hors de l'en-tête : la boîte se superpose à toute la page, et un
          parent en `backdrop-blur` avec un `z-index` propre la piégerait dans
          son contexte d'empilement. */}
      {porte && (
        <PorteDuCompte
          avantage={porte.avantage}
          href={porte.href}
          onFermer={() => setPorte(null)}
        />
      )}

      {/* ── Contenu ──────────────────────────────────────────────────── */}
      <main className={clsx('flex-1', !immersive && 'pb-20 md:pb-0')}>{children}</main>

      {/* Un ami peut proposer une partie pendant qu'on lit une leçon : le
          guetteur vit donc dans la coque, pas dans une page. */}
      <ChallengeWatcher />

      {/* ── Barre inférieure mobile ──────────────────────────────────── */}
      {!immersive && (
        <BottomBar
          pathname={pathname}
          menuOpen={menuOpen}
          onToggleMenu={() => setMenuOpen((open) => !open)}
        />
      )}

      {/* Pas de pied de page sur un écran de partie.
          L'écran de jeu est calibré pour tenir exactement dans la fenêtre :
          l'échiquier se dimensionne sur la hauteur disponible, et la barre
          d'actions se place juste dessous. Un pied de page ajouté après coup
          rallonge le document de sa propre hauteur — mesuré à 74 px — et
          impose donc une barre de défilement à un écran qui, par
          construction, n'a rien à faire défiler. On perdait la barre
          d'actions sous le bord de la fenêtre. */}
      {!immersive && <SiteFooter />}
    </div>
  )
}

/**
 * La marque, dans l'en-tête.
 *
 * Il y avait ici une seconde marque, écrite sur place : une icône `Crown` de
 * lucide posée sur un pavé dégradé. Elle avait deux défauts, et le premier
 * explique le second.
 *
 * D'abord, ce n'était pas la marque. `components/brand/LogoMark.tsx` dessine un
 * cavalier depuis toujours, et personne ne le voyait : l'en-tête affichait une
 * couronne, le favicon une autre couronne, et le cavalier restait dans un
 * fichier que rien n'importait. Trois marques pour une application, dont la
 * seule vraie était invisible.
 *
 * Ensuite, son pavé dégradait du violet vers la menthe — `--accent` vers
 * `--accent-2`. C'est précisément ce que la charte interdit en tête de
 * `LogoMark.tsx` : deux familles de teintes dans un même dégradé, et l'on
 * retombe sur le gabarit gratuit. Un fichier qui ne connaît pas la règle ne
 * peut pas la suivre — c'est le sort de toute copie.
 *
 * Il ne reste donc que l'enveloppe, qui porte l'agrandissement au survol.
 */
function LogoMark() {
  return (
    <MarqueCavale
      size={32}
      className="rounded-[10px] transition-transform duration-300 group-hover:scale-105"
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Navigation sur grand écran
// ─────────────────────────────────────────────────────────────────────────────

function MenuSection({
  section,
  pathname,
  intercepter,
  onPorte,
}: {
  section: (typeof SECTIONS)[number]
  pathname: string
  intercepter: Intercepteur
  onPorte: (porte: { avantage: AvantageCompte; href: string }) => void
}) {
  const t = useT()
  const active = sectionActive(section, pathname)

  return (
    <Menu
      largeur="w-72"
      label={t(section.labelKey)}
      declencheur={(ouvert) => (
        <>
          <span className={clsx(active && 'text-ink')}>{t(section.labelKey)}</span>
          <ChevronDown
            size={14}
            aria-hidden
            className={clsx('transition-transform duration-200', ouvert && 'rotate-180')}
          />
          {active && (
            <span className="absolute inset-x-2.5 -bottom-[11px] h-[2px] rounded-full bg-accent" />
          )}
        </>
      )}
    >
      {/* Le titre du panneau mène à la page-sommaire : un menu se referme au
          premier clic, et vouloir simplement « voir ce qu'il y a dans Jouer »
          doit mener quelque part plutôt qu'obliger à choisir tout de suite. */}
      {section.sommaire && (
        <Link
          href={section.sommaire}
          className="mb-1 flex items-center justify-between rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint transition-colors hover:bg-surface-hover hover:text-ink"
        >
          {t(section.labelKey)}
          <span aria-hidden>→</span>
        </Link>
      )}

      {section.entrees.map((entree) => {
        const Icone = entree.icon
        // Réservée, et seulement pour un visiteur anonyme : le cadenas
        // disparaît dès qu'il n'a plus rien à annoncer.
        const reservee = intercepter(entree.href)
        return (
          <Link
            key={entree.href}
            href={entree.href}
            role="menuitem"
            onClick={(event) => {
              if (!reservee) return
              // On explique avant d'emmener. La boîte propose « Voir quand
              // même » : rien n'est interdit, seulement annoncé.
              event.preventDefault()
              onPorte({ avantage: reservee, href: entree.href })
            }}
            className="flex items-start gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 transition-colors hover:bg-surface-hover"
          >
            <Icone size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{t(entree.labelKey)}</span>
              {entree.hintKey && (
                <span className="block text-[11px] leading-snug text-faint">
                  {t(entree.hintKey)}
                </span>
              )}
            </span>
            {reservee && (
              <Lock
                size={12}
                className="mt-1 shrink-0 text-faint"
                aria-label="demande un compte"
              />
            )}
          </Link>
        )
      })}
    </Menu>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Navigation sur mobile
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Menu mobile : les mêmes sections, dépliées.
 *
 * Sur un écran étroit on préfère tout montrer plutôt que d'empiler un second
 * niveau de repli : cinq titres et une vingtaine de liens tiennent dans un
 * défilement court, alors qu'un accordéon demanderait un geste de plus pour
 * chaque rubrique.
 */
function MobileMenu({
  pathname,
  intercepter,
  onPorte,
}: {
  pathname: string
  intercepter: Intercepteur
  onPorte: (porte: { avantage: AvantageCompte; href: string }) => void
}) {
  const t = useT()

  return (
    <div className="animate-slide-up max-h-[70dvh] overflow-y-auto border-t border-line bg-[var(--bg-elev)] md:hidden">
      {/*
        ── Lisibilité du menu déroulé ──────────────────────────────────────

        Trente entrées grises, séparées par des titres gris plus petits, sur un
        fond gris : tout y était, et l'on ne distinguait rien. Le regard n'a
        aucun point d'accroche pour savoir où finit « Jouer » et où commence
        « Apprendre », ce qui oblige à *lire* la liste entière au lieu de la
        balayer.

        Trois changements, aucun décoratif :

         - **le titre prend la couleur de sa section** et tire un filet jusqu'au
           bord. C'est le repère qui survit à un défilement rapide au pouce, et
           c'est aussi la couleur qu'on retrouve sur l'icône de chaque entrée ;
         - **les entrées passent en `text-ink` sur une surface** au lieu de
           flotter en gris sur le fond. Une ligne qu'on peut toucher doit
           ressembler à une chose qu'on peut toucher ;
         - **l'entrée courante porte un anneau d'accent** plutôt qu'un simple
           fond légèrement plus clair, indistinguable des autres sur un écran
           de téléphone en plein jour.
      */}
      <nav className="space-y-4 p-3" aria-label="Navigation">
        {SECTIONS.map((section) => (
          <div key={section.id}>
            <p
              className="mb-1.5 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: section.teinte }}
            >
              <section.icon size={12} aria-hidden />
              {t(section.labelKey)}
              <span
                aria-hidden
                className="h-px flex-1 rounded-full"
                style={{ background: `color-mix(in oklab, ${section.teinte} 30%, transparent)` }}
              />
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {section.entrees.map((entree) => {
                const Icone = entree.icon
                const chemin = entree.href.split(/[?#]/)[0] ?? entree.href
                const active = pathname === chemin
                const reservee = intercepter(entree.href)
                return (
                  <Link
                    key={entree.href}
                    href={entree.href}
                    onClick={(event) => {
                      if (!reservee) return
                      event.preventDefault()
                      onPorte({ avantage: reservee, href: entree.href })
                    }}
                    className={clsx(
                      'flex items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-surface-strong text-ink ring-1 ring-inset ring-accent/50'
                        : 'bg-surface/70 text-ink',
                    )}
                  >
                    <Icone
                      size={16}
                      className="shrink-0"
                      style={{ color: section.teinte }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">{t(entree.labelKey)}</span>
                    {reservee && (
                      <Lock
                        size={11}
                        className="shrink-0 text-faint"
                        aria-label="demande un compte"
                      />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

        <div className="border-t border-line/60 pt-3">
          <AccountButton variant="menu" />
        </div>
      </nav>
    </div>
  )
}

function BottomBar({
  pathname,
  menuOpen,
  onToggleMenu,
}: {
  pathname: string
  menuOpen: boolean
  onToggleMenu: () => void
}) {
  const t = useT()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-[var(--bg)]/88 backdrop-blur-xl safe-bottom md:hidden"
      aria-label="Navigation rapide"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around px-1 pt-1.5">
        {RACCOURCIS_MOBILES.map((entree) => {
          const Icone = entree.icon
          const active = pathname.startsWith(entree.href)
          return (
            <Link
              key={entree.href}
              href={entree.href}
              aria-current={active ? 'page' : undefined}
              className={clsx(
                'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[var(--radius-sm)] px-1 py-1.5 transition-colors',
                active ? 'text-accent' : 'text-faint',
              )}
            >
              <Icone size={19} strokeWidth={active ? 2.4 : 1.9} aria-hidden />
              <span className="truncate text-[10px] font-medium leading-none">
                {t(entree.labelKey)}
              </span>
            </Link>
          )
        })}

        {/* Cinquième place : le reste de l'application.
            Sans ce bouton, la barre inférieure laissait croire qu'elle était
            toute la navigation mobile — le reste ne s'atteignait que par
            l'icône hamburger de l'en-tête, que personne ne va chercher quand
            une barre d'onglets est déjà sous le pouce. */}
        <button
          type="button"
          onClick={onToggleMenu}
          aria-expanded={menuOpen}
          className={clsx(
            'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[var(--radius-sm)] px-1 py-1.5 transition-colors',
            menuOpen ? 'text-accent' : 'text-faint',
          )}
        >
          {menuOpen ? (
            <X size={19} strokeWidth={2.4} aria-hidden />
          ) : (
            <MenuIcon size={19} strokeWidth={1.9} aria-hidden />
          )}
          <span className="truncate text-[10px] font-medium leading-none">{t('nav.menu')}</span>
        </button>
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
