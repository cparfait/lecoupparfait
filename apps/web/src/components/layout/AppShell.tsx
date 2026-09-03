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
import {
  ChevronDown,
  ChevronRight,
  Info,
  Lock,
  Menu as MenuIcon,
  Scale,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { AccountButton } from '@/components/layout/AccountButton.tsx'
import { ChallengeWatcher } from '@/components/social/ChallengeWatcher.tsx'
import { PastilleSerie } from '@/components/daily/PastilleSerie.tsx'
import { MiseEnRoute } from '@/components/layout/MiseEnRoute.tsx'
import { RepriseEnLigne } from '@/components/social/RepriseEnLigne.tsx'
import { Menu } from '@/components/ui/Menu.tsx'
import { PorteDuCompte } from '@/components/compte/PorteDuCompte.tsx'
import type { ReactNode } from 'react'
import { useT } from '@/lib/i18n/index.tsx'
import { useEstAdmin, useIdentite } from '@/lib/auth/useIdentite.ts'
import { avantagePour, type AvantageCompte } from '@/lib/compte/avantages.ts'
import { RACCOURCIS_MOBILES, SECTIONS, sectionActive } from '@/lib/navigation.ts'

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
  const estAdmin = useEstAdmin()
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
  // Seulement celles où l'on joue : le choix d'une cadence et la liste des
  // parties à regarder sont des écrans de navigation, qui la perdaient aussi.
  const immersive = /^\/(jouer\/(ordinateur|local|partie)|puzzles\/rush|apprendre\/[^/]+)/.test(
    pathname,
  )

  return (
    <div className="flex min-h-dvh flex-col">
      {/* ── Barre supérieure ─────────────────────────────────────────── */}
      {/* Zone sûre en haut : `viewport-fit=cover` fait passer la page sous la
          barre d'état et l'encoche en mode installé, et l'en-tête collant
          commençait là-dessous. Le rembourrage vaut zéro partout ailleurs. */}
      <header className="sticky top-0 z-50 border-b border-line/70 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
        <div className="absolute inset-0 -z-10 bg-[var(--bg)]/72" aria-hidden />
        {/* Le resserrement sous 360 px n'est pas cosmétique.
            Cinq commandes à droite — série, thème, préférences, compte,
            menu — tiennent à 375 px, et débordaient à 320 du temps où la voix
            en faisait partie :
            l'en-tête gagnait une barre de défilement horizontale sur un iPhone
            SE. On récupère la place sur les marges et les écarts, qui ne se
            voient pas, plutôt qu'en retirant une commande, qui se verrait. */}
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-2 px-3 [@media(max-width:359px)]:px-1.5 sm:px-5">
          {/* Le nom seul, sans vignette.

              La marque a été une couronne, puis un cavalier sur champ violet,
              puis le même sur champ noir cerné d'accent. Aucune de ces
              vignettes ne tenait à trente-deux pixels dans une barre déjà
              chargée : une sculpture photographique réduite à la taille d'une
              favicon perd sa matière, qui est précisément ce qui la rendait
              belle, et il ne reste qu'une tache sombre à côté d'un mot.

              Le nom, lui, se lit. Il est écrit dans la police d'affichage du
              site, et suffit à identifier la page comme à ramener à l'accueil.
              Le cavalier reste où il vaut quelque chose : sur l'icône de
              l'application, où il est seul et grand. */}
          <Link
            href="/"
            className="group flex shrink-0 items-center rounded-[var(--radius-sm)] px-1.5 py-1"
            aria-label="Le Coup Parfait — accueil"
          >
            <span className="font-display text-[15px] font-semibold tracking-tight transition-colors group-hover:text-accent sm:text-[17px]">
              Le Coup Parfait
            </span>
          </Link>

          {/* La navigation à plat n'apparaît qu'à partir de `lg`, pas de `md` :
              cinq rubriques, le nom du site et cinq commandes à droite font
              plus de 800 px, et entre 768 et 900 px — tablette en portrait,
              téléphone en paysage — l'en-tête débordait de l'écran, seule
              source de défilement horizontal de tout le site. En dessous, la
              barre du bas et le menu font le travail, et ils sont faits pour
              le doigt. */}
          <nav
            className="ml-2 hidden items-center gap-0.5 lg:flex"
            aria-label="Navigation principale"
          >
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
            {/* La voix du coach n'est plus ici.

                Un haut-parleur dans la barre de navigation ne dit pas ce
                qu'il coupe : il pouvait aussi bien désigner les bruits de
                pièces, les sons de fin de partie ou une musique. Il est
                désormais posé dans chaque écran qui parle — puzzles, leçons,
                finales, panneau du coach, analyse —, à côté de ce qu'il fait
                taire. Le réglage durable reste dans les préférences. */}
            {/* Le sélecteur de thème non plus.

                Même raison, et un an plus tard le même constat : une palette
                dans la barre est une commande de plus à côté de l'engrenage
                qui mène à la page où le même réglage se trouve, en plus grand
                et nommé. Deux chemins pour un choix qu'on fait une fois — et
                celui-ci occupait une des cinq places de la barre sur
                téléphone, là où elles se disputent la largeur. */}
            {/* La porte de l'administration.

                Elle n'apparaît que pour qui l'ouvre : `useEstAdmin` vaut `false`
                tant qu'on ne sait pas, si bien qu'elle ne clignote jamais chez
                un visiteur ordinaire. C'est la même règle que la page elle-même,
                qui répond « cette page n'existe pas » plutôt que « tu n'as pas
                le droit » — montrer une porte fermée apprend qu'il y en a une.

                Elle ne donne aucun droit : chaque route revérifie, et forcer le
                booléen depuis la console ferait apparaître un lien vers une page
                introuvable. */}
            {estAdmin && (
              <Link
                href="/admin"
                // Sur téléphone aussi, et non plus à partir de 640 px : elle y
                // était masquée au motif que le menu du bas portait la même
                // entrée. Mais l'administration se surveille depuis le
                // téléphone au moins autant que depuis le bureau, et l'ouvrir
                // demandait alors deux gestes au lieu d'un. Les quatre
                // commandes tiennent : le sélecteur de thème et la voix ont
                // libéré la place, et l'écart se resserre déjà sous 360 px.
                className="grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] text-muted transition-colors hover:bg-surface-hover hover:text-ink cible-doigt"
                aria-label="Administration"
                title="Administration"
              >
                <ShieldCheck size={17} aria-hidden />
              </Link>
            )}
            <Link
              href="/preferences"
              className="grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] text-muted transition-colors hover:bg-surface-hover hover:text-ink cible-doigt"
              aria-label={t('nav.settings')}
            >
              <Settings size={17} aria-hidden />
            </Link>
            <AccountButton />
            {/* Le hamburger n'est plus dans la barre du haut.

                Il ouvrait exactement le même panneau que « Menu », en bas à
                droite : deux boutons pour une seule chose, l'un sous le pouce,
                l'autre à l'opposé de l'écran, en haut à droite — le coin le
                plus difficile à atteindre d'une main. Sur un téléphone, la
                navigation se tient en bas.

                Il ne survit qu'en paysage, où la barre du bas s'efface pour
                rendre sa hauteur à l'échiquier : sans lui, il n'y aurait plus
                aucune porte de sortie. */}
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="hidden h-9 w-9 place-items-center rounded-[var(--radius-sm)] text-muted transition-colors hover:bg-surface-hover hover:text-ink cible-doigt max-lg:paysage:grid"
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
      {/* Les encoches latérales en paysage, et la barre de gestes en bas des
          écrans immersifs, qui n'ont pas la barre de navigation pour les en
          protéger. */}
      <main
        className={clsx(
          'flex-1 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]',
          immersive
            ? 'pb-[env(safe-area-inset-bottom)]'
            : 'pb-20 lg:pb-0 paysage:pb-[env(safe-area-inset-bottom)]',
        )}
      >
        {children}
      </main>

      {/* Un ami peut proposer une partie pendant qu'on lit une leçon : le
          guetteur vit donc dans la coque, pas dans une page. */}
      <ChallengeWatcher />

      {/* Le retour vers une partie en direct qu'on a quittée. Il vaut sur tous
          les écrans, y compris pendant une autre partie : la place n'est gardée
          qu'une minute, et le bandeau s'efface de lui-même sur celui de la
          partie en question. */}
      <RepriseEnLigne />

      {/* Notifications et installation, proposées une fois — mais proposées.
          Jamais sur un écran de partie : voir `MiseEnRoute`. */}
      {!immersive && <MiseEnRoute />}

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
              <Lock size={12} className="mt-1 shrink-0 text-faint" aria-label="demande un compte" />
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
 * Menu mobile : les rubriques, pas leur contenu.
 *
 * Il dépliait les trente entrées de la navigation, et c'était trois fois la
 * même liste : la barre du bas conduit déjà aux quatre rubriques principales,
 * et chaque page de rubrique montre ce qu'elle contient — « Jouer » aligne ses
 * six façons de jouer en grand, sous le pouce. Un panneau qui répète tout cela
 * en petit oblige à choisir deux fois, et il fallait le faire défiler pour
 * atteindre « Communauté », tout en bas.
 *
 * Il ne garde donc que ce qu'on ne trouve pas ailleurs, et la barre du bas
 * en offre déjà quatre : « Jouer », « Apprendre », « Puzzles », « Analyse ».
 * Les répéter ici mettait deux fois les mêmes destinations sur le même écran,
 * à trois centimètres d'écart. Restent donc :
 *
 *  - **Communauté**, la seule rubrique sans page à elle ;
 *  - **l'application elle-même** — préférences, à propos, crédits —, jusqu'ici
 *    reléguée dans un pied de page qui ne s'affiche qu'à partir de `lg` :
 *    trois écrans qu'un téléphone ne pouvait pas atteindre ;
 *  - **les quatre rubriques de la barre du bas, en paysage seulement**, où
 *    cette barre s'efface pour rendre sa hauteur à l'échiquier.
 *
 * Le reste est allé dans les pages, où il y a la place de le nommer et de
 * l'expliquer : voir `AutresDeLaSection`.
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
  const estAdmin = useEstAdmin()

  return (
    <div className="animate-slide-up max-h-[70dvh] overflow-y-auto border-t border-line bg-[var(--bg-elev)] lg:hidden">
      <nav className="space-y-2 p-3" aria-label="Navigation">
        {SECTIONS.map((section) => {
          const Icone = section.icon
          const active = sectionActive(section, pathname)

          /*
            Une rubrique qui a une page y conduit ; les autres se déplient.

            « Communauté » est la seule sans page-sommaire : classement, amis,
            correspondance et statistiques ne se rejoignent nulle part
            ailleurs, et les cacher derrière un titre inerte les rendrait
            introuvables. Elle garde donc ses entrées, en petit, sous son nom.
          */
          if (!section.sommaire) {
            return (
              <div key={section.id} className="rounded-[var(--radius-sm)] bg-surface/70 p-2.5">
                <p
                  className="mb-1.5 flex items-center gap-2 px-0.5 text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: section.teinte }}
                >
                  <Icone size={12} aria-hidden />
                  {t(section.labelKey)}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {section.entrees.map((entree) => {
                    const IconeEntree = entree.icon
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
                        className="flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] bg-bg-elev px-2.5 text-sm font-medium text-ink"
                      >
                        <IconeEntree
                          size={15}
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
            )
          }

          /*
            Cette rubrique est déjà dans la barre du bas — sauf en paysage, où
            la barre n'existe pas. On ne l'affiche donc que là.
          */
          return (
            <Link
              key={section.id}
              href={section.sommaire}
              className={clsx(
                'hidden min-h-14 items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 transition-colors paysage:flex',
                active
                  ? 'bg-surface-strong ring-1 ring-inset ring-accent/50'
                  : 'bg-surface/70 hover:bg-surface-hover',
              )}
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-sm)]"
                style={{ background: `color-mix(in oklab, ${section.teinte} 18%, transparent)` }}
                aria-hidden
              >
                <Icone size={17} style={{ color: section.teinte }} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{t(section.labelKey)}</span>
                <span className="block truncate text-[11px] text-faint">
                  {section.entrees
                    .slice(0, 3)
                    .map((entree) => t(entree.labelKey))
                    .join(' · ')}
                </span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-faint" aria-hidden />
            </Link>
          )
        })}

        {/* ── L'application ────────────────────────────────────────────────
            Ces trois pages n'étaient nulle part sur un téléphone : le pied de
            page qui les portait ne s'affiche qu'à partir de `lg`. On les
            atteignait donc uniquement en écrivant l'adresse. */}
        <div className="rounded-[var(--radius-sm)] bg-surface/70 p-2.5">
          <p className="mb-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
            L’application
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { href: '/preferences', label: t('nav.settings'), icon: Settings },
              // Sur téléphone, l'en-tête n'a pas la place d'une commande de
              // plus : sans cette entrée, l'administration ne s'atteindrait
              // qu'en écrivant l'adresse. Elle n'apparaît que pour qui l'ouvre.
              ...(estAdmin ? [{ href: '/admin', label: 'Administration', icon: ShieldCheck }] : []),
              { href: '/a-propos', label: 'À propos', icon: Info },
              { href: '/credits', label: 'Crédits', icon: Scale },
            ].map((page) => {
              const Icone = page.icon
              return (
                <Link
                  key={page.href}
                  href={page.href}
                  className="flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] bg-bg-elev px-2.5 text-sm font-medium text-ink"
                >
                  <Icone size={15} className="shrink-0 text-faint" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{page.label}</span>
                </Link>
              )
            })}
          </div>
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
      // En paysage sur téléphone, soixante-sept pixels sur trois cent
      // quatre-vingt-dix : la barre prenait un sixième de la hauteur, et
      // recouvrait le bas de l'échiquier. C'est le seul cas où le hamburger
      // de l'en-tête reparaît, et la seule raison qui le fait vivre encore.
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-[var(--bg)]/88 backdrop-blur-xl safe-bottom lg:hidden paysage:hidden"
      aria-label="Navigation rapide"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around px-1 pt-1.5">
        {RACCOURCIS_MOBILES.map((entree) => {
          const Icone = entree.icon
          const active = pathname.startsWith(entree.href)
          return (
            /* ── La barre du bas, enfin visible ─────────────────────────
               Elle était en `text-faint` — la couleur des mentions
               secondaires — sur un fond translucide : cinq pictogrammes gris
               pâle qu'on ne distinguait ni du fond ni les uns des autres, et
               dont on ne savait pas lequel était actif sans les comparer.
               C'est pourtant la navigation principale sur téléphone.

               L'entrée courante porte maintenant une pastille d'accent sous
               son icône, un libellé en gras et l'icône en trait épais ; les
               autres passent en `text-muted`, lisible sans crier. La pastille
               fait aussi office de cible : elle épaissit la zone touchable. */
            <Link
              key={entree.href}
              href={entree.href}
              aria-current={active ? 'page' : undefined}
              className={clsx(
                'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[var(--radius-sm)] px-1 pb-1.5 pt-1 transition-colors',
                active ? 'text-accent' : 'text-muted',
              )}
            >
              <span
                className={clsx(
                  'grid h-7 w-12 place-items-center rounded-full transition-all',
                  active && 'bg-accent/20 shadow-[0_0_16px_-4px_var(--accent)]',
                )}
              >
                <Icone size={20} strokeWidth={active ? 2.5 : 2} aria-hidden />
              </span>
              <span
                className={clsx(
                  'truncate text-[10px] leading-none',
                  active ? 'font-bold' : 'font-medium',
                )}
              >
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
            'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[var(--radius-sm)] px-1 pb-1.5 pt-1 transition-colors',
            menuOpen ? 'text-accent' : 'text-muted',
          )}
        >
          {/* Même traitement que les quatre autres : le menu ouvert est un
              état, il doit se voir comme tel. */}
          <span
            className={clsx(
              'grid h-7 w-12 place-items-center rounded-full transition-all',
              menuOpen && 'bg-accent/20 shadow-[0_0_16px_-4px_var(--accent)]',
            )}
          >
            {menuOpen ? (
              <X size={20} strokeWidth={2.5} aria-hidden />
            ) : (
              <MenuIcon size={20} strokeWidth={2} aria-hidden />
            )}
          </span>
          <span
            className={clsx(
              'truncate text-[10px] leading-none',
              menuOpen ? 'font-bold' : 'font-medium',
            )}
          >
            {t('nav.menu')}
          </span>
        </button>
      </div>
    </nav>
  )
}

function SiteFooter() {
  return (
    <footer className="browser-only mt-auto hidden border-t border-line/60 py-6 lg:block">
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
