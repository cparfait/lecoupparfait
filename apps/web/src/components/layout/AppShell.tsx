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
  House,
  Info,
  Lock,
  Scale,
  Settings,
  ShieldCheck,
} from 'lucide-react'
import clsx from 'clsx'
import { AccountButton } from '@/components/layout/AccountButton.tsx'
import { ChallengeWatcher } from '@/components/social/ChallengeWatcher.tsx'
import { PastilleSerie } from '@/components/daily/PastilleSerie.tsx'
import { MiseEnRoute } from '@/components/layout/MiseEnRoute.tsx'
import { Presence } from '@/components/layout/Presence.tsx'
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
  const identite = useIdentite()
  const estAdmin = useEstAdmin()
  const [porte, setPorte] = useState<{ avantage: AvantageCompte; href: string } | null>(null)

  const intercepter = useCallback<Intercepteur>(
    (href) => (identite === null ? avantagePour(href) : null),
    [identite],
  )

  const ouvrirPorte = useCallback((demande: { avantage: AvantageCompte; href: string }) => {
    setPorte(demande)
  }, [])

  // Toute navigation referme la boîte : « Voir quand même » navigue, et elle
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
          {/* Et le nom ouvre désormais le menu de l'application.

              Il ne menait qu'à l'accueil, ce que rien n'annonçait — et la
              maison, à droite, le fait maintenant en le disant. Le nom du site
              est en revanche l'endroit où l'on cherche ce qui concerne le site
              lui-même : préférences, à propos, crédits, administration. Ces
              pages vivaient dans un pied de page invisible sous `lg` et dans un
              bloc au fond du menu mobile, c'est-à-dire à deux endroits dont
              aucun n'était le bon. L'accueil ouvre la liste, pour qui avait
              l'habitude de cliquer là. */}
          <MenuApplication />

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
            {/* Le retour à l'accueil, nommé.

                Le nom du site, à gauche, y menait déjà — mais rien ne le dit :
                c'est un mot, pas un bouton, et il faut avoir l'habitude du web
                pour deviner qu'un titre est cliquable. Sur un écran de partie
                c'était même la seule sortie, la barre du bas s'effaçant pour
                rendre sa hauteur à l'échiquier.

                Une maison, à côté de l'engrenage et du compte, ne demande
                aucune habitude. Elle vaut sur les deux tailles d'écran :
                l'accueil ne figure ni dans les cinq rubriques du haut, ni dans
                les quatre raccourcis du bas. */}
            <Link
              href="/"
              className="grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] text-muted transition-colors hover:bg-surface-hover hover:text-ink cible-doigt"
              aria-label={t('nav.home')}
              title={t('nav.home')}
            >
              <House size={17} aria-hidden />
            </Link>
            <Link
              href="/preferences"
              className="grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] text-muted transition-colors hover:bg-surface-hover hover:text-ink cible-doigt"
              aria-label={t('nav.settings')}
              title={t('nav.settings')}
            >
              <Settings size={17} aria-hidden />
            </Link>
            <AccountButton />
            {/* ── En paysage, les rubriques à la place du hamburger ─────
                La barre du bas s'efface en paysage pour rendre sa hauteur à
                l'échiquier, et c'est ce qui faisait vivre le bouton hamburger :
                sans lui, il n'y avait plus de sortie. Mais un bouton nommé
                « Menu » n'annonce rien de ce qu'il contient — on le déplie pour
                *voir*, ce qui est exactement le geste qu'une navigation doit
                éviter de demander.

                Les cinq rubriques tiennent en icônes, à même la barre. Elles
                sont nommées pour les lecteurs d'écran et par leur infobulle,
                et l'on voit d'un coup d'œil laquelle est ouverte. Rien n'est
                plus replié nulle part. */}
            <nav className="hidden items-center gap-0.5 max-lg:paysage:flex" aria-label="Rubriques">
              {SECTIONS.map((section) => {
                if (!section.sommaire) return null
                const Icone = section.icon
                const active = sectionActive(section, pathname)
                return (
                  <Link
                    key={section.id}
                    href={section.sommaire}
                    aria-current={active ? 'page' : undefined}
                    aria-label={t(section.labelKey)}
                    title={t(section.labelKey)}
                    className={clsx(
                      'grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] transition-colors cible-doigt',
                      active ? 'bg-accent/20 text-accent' : 'text-muted hover:bg-surface-hover',
                    )}
                  >
                    <Icone size={17} aria-hidden />
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
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

      {/* Le battement de présence, dans la coque pour la même raison que le
          guetteur : il vaut sur tous les écrans. Il ne rend rien. */}
      <Presence />

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
      {!immersive && <BottomBar pathname={pathname} />}

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
//  Le nom du site, et ce qu'il ouvre
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Les pages de l'application, sous son nom.
 *
 * Une seule liste pour les deux tailles d'écran, et le même geste : on clique
 * le nom du site pour ce qui concerne le site. L'administration n'y figure que
 * pour qui l'ouvre — `useEstAdmin` vaut `false` tant qu'on ne sait pas, si bien
 * qu'elle ne clignote jamais chez un visiteur ordinaire — et elle ne donne
 * aucun droit : chaque route revérifie.
 */
function MenuApplication() {
  const t = useT()
  const estAdmin = useEstAdmin()

  const pages = [
    { href: '/', label: t('nav.home'), icon: House },
    { href: '/preferences', label: t('nav.settings'), icon: Settings },
    ...(estAdmin ? [{ href: '/admin', label: 'Administration', icon: ShieldCheck }] : []),
    { href: '/a-propos', label: 'À propos', icon: Info },
    { href: '/credits', label: 'Crédits & licences', icon: Scale },
  ]

  return (
    <Menu
      className="shrink-0"
      largeur="w-60"
      label="Le Coup Parfait"
      declencheur={(ouvert) => (
        <>
          <span className="font-display text-[15px] font-semibold tracking-tight text-ink sm:text-[17px]">
            Le Coup Parfait
          </span>
          <ChevronDown
            size={14}
            aria-hidden
            className={clsx('transition-transform duration-200', ouvert && 'rotate-180')}
          />
        </>
      )}
    >
      {pages.map((page) => {
        const Icone = page.icon
        return (
          <Link
            key={page.href}
            href={page.href}
            role="menuitem"
            className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm font-medium transition-colors hover:bg-surface-hover"
          >
            <Icone size={16} className="shrink-0 text-accent" aria-hidden />
            {page.label}
          </Link>
        )
      })}
    </Menu>
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
      {/* ── La page de la rubrique, en première entrée ──────────────────
          Elle existait déjà, et personne ne la voyait : un titre en capitales
          de onze pixels, gris clair, avec une flèche — c'est-à-dire la forme
          exacte d'une étiquette de section, celle qu'on apprend justement à ne
          pas lire. Les pages « Jouer », « Apprendre » et « S'entraîner »
          n'étaient donc atteintes que depuis un téléphone, où la barre du bas y
          mène, alors que ce sont elles qui présentent chaque rubrique en grand,
          avec une phrase par destination.

          Elle devient une entrée comme les autres — icône, libellé, sous-titre
          — mais posée sur un fond léger et séparée du reste par un filet : la
          première chose qu'on lit en ouvrant le menu, et la seule qui ne
          demande pas de choisir tout de suite. */}
      {section.sommaire && (
        <>
          <Link
            href={section.sommaire}
            role="menuitem"
            className="flex items-center gap-2.5 rounded-[var(--radius-sm)] bg-surface/70 px-2.5 py-2 transition-colors hover:bg-surface-hover"
          >
            <section.icon size={16} className="shrink-0" style={{ color: section.teinte }} />
            <span className="min-w-0 flex-1">
              {/* « Voir la page Jouer » et non « Jouer » : le mot seul répète
                  le bouton qu'on vient d'ouvrir, et l'on croit avoir affaire à
                  un titre. Le verbe dit que c'est une destination. */}
              <span className="block text-sm font-semibold">
                Voir la page {t(section.labelKey)}
              </span>
              <span className="block text-[11px] leading-snug text-faint">
                toute la rubrique, présentée en grand
              </span>
            </span>
            <ChevronRight size={14} className="shrink-0 text-faint" aria-hidden />
          </Link>
          <span className="my-1 block h-px bg-line/60" aria-hidden />
        </>
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

/*
  Il n'y a plus de panneau à déplier.

  Le menu mobile a existé sous trois formes : les trente entrées de la
  navigation, puis les seules rubriques sans page, puis de nouveau les trente.
  Les trois avaient le même défaut, et c'est celui du bouton qui les ouvrait :
  « Menu » n'annonce rien de ce qu'il contient. On le déplie pour *voir* — donc
  pour savoir ce que l'application sait faire, il fallait d'abord faire un geste
  qui ne promettait rien.

  Les cinq rubriques tiennent dans la barre du bas, « Communauté » comprise
  depuis qu'elle a sa page. Chacune montre son contenu en grand, à taille de
  doigt, avec une phrase par destination — c'est ce que le panneau essayait de
  faire en petit. En paysage, où la barre s'efface pour rendre sa hauteur à
  l'échiquier, les cinq rubriques passent en icônes dans l'en-tête : voir plus
  haut.
*/

function BottomBar({ pathname }: { pathname: string }) {
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
          // Un onglet reste allumé sur les écrans qu'il propose : « S'entraîner »
          // mène au sommaire `/entrainer`, dont les trois portes vivent sous
          // `/puzzles`. Voir `actifSur`.
          const active = [entree.href, ...(entree.actifSur ?? [])].some((chemin) =>
            pathname.startsWith(chemin),
          )
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
