'use client'

/**
 * Ossature de l'application.
 *
 * Deux navigations distinctes plutôt qu'une seule adaptative :
 *  - sur **grand écran**, une barre supérieure : le nom du site qui ramène à
 *    l'accueil, six menus déroulants — un par rubrique —, et à droite une seule
 *    commande, le compte, qui porte aussi les préférences et les pages du site ;
 *  - sur **mobile**, une barre inférieure fixe à six onglets, à portée de
 *    pouce, qui reste visible pendant une partie. Le premier ramène à
 *    l'accueil — le nom du site, en haut, ne se signale pas sans survol — et
 *    le dernier, « Plus », est une page pleine qui montre ce que la barre ne
 *    porte pas.
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
import { ChevronRight, Home, Lock } from 'lucide-react'
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
import { useIdentite } from '@/lib/auth/useIdentite.ts'
import { avantagePour, type AvantageCompte } from '@/lib/compte/avantages.ts'
import {
  estActif,
  PAGES_APPLICATION,
  RACCOURCIS_MOBILES,
  SECTIONS,
  sectionActive,
} from '@/lib/navigation.ts'

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
      <header className="sticky top-0 z-50 border-b border-line-strong/70 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
        {/* La barre se peignait avec la couleur de la page à 72 % : sur trois
            thèmes sur quatre, elle avait donc exactement la teinte de ce qu'elle
            surplombe, et l'on ne voyait ni où elle commençait ni ce qui passait
            dessous en défilant. Elle prend la matière des surfaces qui flottent
            — la même que les menus qu'elle ouvre — et son filet inférieur passe
            au liseré fort. */}
        <div className="absolute inset-0 -z-10 bg-[var(--flottant)]/92" aria-hidden />
        {/* Le resserrement sous 360 px n'est pas cosmétique.
            Cinq commandes à droite — série, thème, préférences, compte,
            menu — tiennent à 375 px, et débordaient à 320 du temps où la voix
            en faisait partie :
            l'en-tête gagnait une barre de défilement horizontale sur un iPhone
            SE. On récupère la place sur les marges et les écarts, qui ne se
            voient pas, plutôt qu'en retirant une commande, qui se verrait. */}
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-2 px-3 [@media(max-width:359px)]:px-1.5 sm:px-5">
          {/* Le nom, précédé d'une maison, et il ramène à l'accueil.

              Il ouvrait un menu — accueil, préférences, à propos, crédits —
              que rien n'annonçait, et l'accueil se cachait derrière un chevron.
              Le nom d'un site est le lien vers sa première page : c'est ce
              que tout le monde essaie en premier. Ce qui concerne le site
              lui-même vit dans le menu du compte, à droite, et sur « Plus ».

              Le nom seul ne suffisait pourtant pas. Écrit sans cadre ni
              pictogramme, il ne se distingue d'un titre que par un fond au
              survol — c'est-à-dire par rien du tout sur un écran tactile, et
              par peu de chose au premier coup d'œil sur un ordinateur. On le
              cherchait sans le voir. La maison ne prend que vingt points et
              dit ce que le mot ne disait pas : ceci est un bouton, et il mène
              chez soi. Elle porte l'infobulle ; le nom reste le nom
              accessible du lien.

              Mais à partir de `lg` seulement, car la maison n'habite qu'un
              endroit à la fois : celui de la navigation qui est à l'écran.
              En dessous, une autre surface porte déjà l'accueil sous la même
              maison — la barre du bas, ou sa rangée d'icônes en paysage — et
              deux maisons dans la même vue mènent au même endroit sans que
              rien distingue l'une de l'autre. C'est le cas d'une fenêtre
              d'ordinateur rétrécie sous mille vingt-quatre points : la barre
              du bas y apparaît, et l'en-tête doit alors rendre sa maison.
              Au-delà, il n'y a plus qu'elle, et c'est là qu'elle sert. */}
          <Link
            href="/"
            title="Accueil"
            className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1.5 font-display text-[15px] font-semibold tracking-tight text-ink transition-colors hover:bg-surface-hover sm:text-[17px]"
          >
            <Home size={16} className="hidden shrink-0 text-accent lg:block" aria-hidden />
            Le Coup Parfait
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
            {/* Plus d'engrenage ni de porte d'administration ici : les deux
                vivent dans le menu du compte, avec les pages du site. Une
                seule commande à droite, et c'est soi. */}
            <AccountButton />
            {/* ── En paysage, les rubriques à la place du hamburger ─────
                La barre du bas s'efface en paysage pour rendre sa hauteur à
                l'échiquier, et c'est ce qui faisait vivre le bouton hamburger :
                sans lui, il n'y avait plus de sortie. Mais un bouton nommé
                « Menu » n'annonce rien de ce qu'il contient — on le déplie pour
                *voir*, ce qui est exactement le geste qu'une navigation doit
                éviter de demander.

                Les six onglets de la barre du bas tiennent en icônes, à même
                la barre — accueil compris, car cette rangée remplace la barre
                du bas et non l'en-tête : ce qui disparaît en bas doit
                reparaître ici, sinon l'accueil n'a plus d'onglet du tout dans
                la seule disposition où l'on joue à deux mains. Et il n'y a pas
                deux maisons pour autant : celle du nom du site ne s'allume
                qu'à partir de `lg`, c'est-à-dire jamais en même temps que
                cette rangée. Les icônes sont nommées pour les lecteurs d'écran
                et par leur infobulle, et l'on voit d'un coup d'œil laquelle
                est ouverte. Rien n'est plus replié nulle part. */}
            <nav className="hidden items-center gap-0.5 max-lg:paysage:flex" aria-label="Rubriques">
              {RACCOURCIS_MOBILES.map((entree) => {
                const Icone = entree.icon
                const active = estActif(entree, pathname)
                return (
                  <Link
                    key={entree.href}
                    href={entree.href}
                    aria-current={active ? 'page' : undefined}
                    aria-label={t(entree.labelKey)}
                    title={t(entree.labelKey)}
                    className={clsx(
                      'grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] transition-colors cible-doigt',
                      active
                        ? 'bg-accent/20 text-accent'
                        : 'text-muted hover:bg-surface-hover hover:text-ink',
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
          // Sous la barre du bas, la barre de gestes s'ajoute : la barre du
          // bas la respecte (`safe-bottom`) et grandit d'autant, le contenu
          // doit donc lui laisser cette hauteur en plus, sinon la dernière
          // carte finit dessous.
          immersive
            ? 'pb-[env(safe-area-inset-bottom)]'
            : 'pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-0 paysage:pb-[env(safe-area-inset-bottom)]',
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

/**
 * Les menus de la barre ne portent pas de cadre.
 *
 * Six boîtes alignées ne se lisent plus comme six boutons : elles font une
 * rangée d'onglets grillagée. La rubrique ouverte porte son trait, et la
 * surface apparaît au survol.
 */
const MENU_BARRE =
  'flex items-center gap-1 rounded-[var(--radius-sm)] px-3 py-1.5 text-[15px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-ink'

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
      boutonClassName={MENU_BARRE}
      declencheur={(ouvert) => (
        <>
          {/* Sans chevron : six chevrons côte à côte faisaient une dentelure
              qui n'apprenait rien — tous les boutons de la barre s'ouvrent.
              Le survol suffit à le dire, et la rubrique ouverte garde son
              trait, dans la teinte de la section : c'est le même code de
              couleur que les icônes de ses cartes. */}
          <span className={clsx((active || ouvert) && 'text-ink')}>{t(section.labelKey)}</span>
          {active && (
            <span
              className="absolute inset-x-2.5 -bottom-[11px] h-[3px] rounded-full"
              style={{ background: section.teinte }}
            />
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
            {/* La teinte de la rubrique, ici et nulle part ailleurs dans le
                panneau : les entrées restent grises, et la première ligne se
                détache d'elle-même. */}
            <section.icon size={16} className="shrink-0" style={{ color: section.teinte }} />
            <span className="min-w-0 flex-1">
              {/* « Voir la page Jouer » et non « Jouer » : le mot seul répète
                  le bouton qu'on vient d'ouvrir, et l'on croit avoir affaire à
                  un titre. Le verbe dit que c'est une destination. */}
              <span className="block text-sm font-semibold">
                Voir la page {t(section.labelKey)}
              </span>
              <span className="block text-[12px] leading-snug text-faint">
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
            <Icone size={16} className="mt-0.5 shrink-0 text-muted" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{t(entree.labelKey)}</span>
              {entree.hintKey && (
                <span className="block text-[12px] leading-snug text-faint">
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
  Six onglets, et rien à déplier.

  Ils se touchaient, autrefois, sur un téléphone étroit — mais parce que le
  libellé n'avait pas de largeur à respecter, pas parce qu'ils étaient six.
  L'accueil ouvre la rangée, les quatre rubriques qu'on ouvre le plus gardent
  leur place, et « Plus » est une page pleine — pas un panneau — qui montre la
  communauté, les outils, le compte et les réglages en grand, à taille de
  doigt. En paysage, où la barre s'efface pour rendre sa hauteur à
  l'échiquier, les six onglets passent en icônes dans l'en-tête.
*/

function BottomBar({ pathname }: { pathname: string }) {
  const t = useT()

  return (
    <nav
      // En paysage sur téléphone, soixante-sept pixels sur trois cent
      // quatre-vingt-dix : la barre prenait un sixième de la hauteur, et
      // recouvrait le bas de l'échiquier. C'est le seul cas où la rangée
      // d'icônes de l'en-tête reparaît, et la seule raison qui la fait vivre.
      // Même matière que l'en-tête et les menus : la barre du bas portait la
      // couleur de la page, et sur un écran sombre elle ne se détachait que par
      // un filet à 9 % de blanc. Une barre de navigation posée par-dessus le
      // contenu doit se voir comme posée.
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line-strong bg-[var(--flottant)]/95 backdrop-blur-xl safe-bottom lg:hidden paysage:hidden"
      aria-label="Navigation rapide"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around px-1 pt-1.5">
        {RACCOURCIS_MOBILES.map((entree) => {
          const Icone = entree.icon
          // Un onglet reste allumé sur les écrans qu'il propose : « S'entraîner »
          // mène au sommaire `/entrainer`, dont les trois portes vivent sous
          // `/puzzles`. Voir `actifSur` — et `estActif` pour le cas de
          // l'accueil, que la comparaison par préfixe allumerait partout.
          const active = estActif(entree, pathname)
          return (
            /* ── La barre du bas, enfin visible ─────────────────────────
               Elle était en `text-faint` — la couleur des mentions
               secondaires — sur un fond translucide : des pictogrammes gris
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
                'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[var(--radius-sm)] pb-1.5 pt-1 transition-colors',
                // Pas de marge intérieure horizontale : l'onglet est en
                // `flex-1`, donc ses huit points de `px-1` ne changeaient rien
                // à la cible du doigt — ils les prenaient au seul libellé.
                // Mesuré sur un écran de 375 px : le libellé disposait de
                // 53 points là où « Apprendre » en demande 55 et
                // « S'entraîner » 56. Deux onglets sur six tronqués pour une
                // marge que personne ne voit ; la rangée garde la sienne.
                active ? 'text-accent' : 'text-muted',
              )}
            >
              <span
                /* Seul l'onglet actif a une pastille. Les autres en avaient
                   une aussi, grise et cerclée : six anneaux côte à côte
                   faisaient une rangée de boutons de formulaire, et l'actif
                   ne se distinguait plus que par sa teinte. Une icône nue
                   pour ce qui attend, une pastille pour ce qui est ouvert. */
                className={clsx(
                  'grid h-7 w-12 place-items-center rounded-full transition-all',
                  active && 'bg-accent/20 shadow-[0_0_16px_-4px_var(--accent)]',
                )}
              >
                <Icone size={20} strokeWidth={active ? 2.5 : 2} aria-hidden />
              </span>
              {/* Onze pixels, pas dix : c'est du texte qu'on lit, et dix est
                  sous le seuil où l'on distingue encore « Apprendre » de
                  « Analyser » d'un coup d'œil. Sous 360 px, en revanche, les
                  six onglets ne laissent plus que cinquante-deux points chacun
                  — même sans marge intérieure — et il faut bien céder quelque
                  chose : ce sera un pixel de corps, pas un onglet. Et un cran
                  d'interlettrage avec, car à dix pixels « S'entraîner » mesure
                  encore cinquante points et demi dans une case de
                  cinquante-deux : il tient, mais il frôle son voisin — et
                  frôler est ce qu'on cherchait à corriger.

                  `w-full` n'est pas décoratif. Sans lui, le libellé se
                  dimensionne sur son contenu et déborde de l'onglet des deux
                  côtés — `truncate` ne coupe que ce qui a une largeur à
                  respecter. C'est très exactement ainsi que « Communauté » et
                  « S'entraîner » se touchaient, du temps où ils étaient six :
                  le texte ne débordait pas parce qu'il y avait six onglets,
                  mais parce que rien ne le retenait. */}
              <span
                className={clsx(
                  'w-full truncate text-center text-[11px] leading-none tracking-[-0.01em]',
                  '[@media(max-width:359px)]:text-[10px] [@media(max-width:359px)]:tracking-[-0.03em]',
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
  const t = useT()
  return (
    <footer className="browser-only mt-auto hidden border-t border-line/60 py-6 lg:block">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-5 text-xs text-faint">
        <p>
          Le Coup Parfait — logiciel libre sous licence AGPL-3.0. Aucune publicité, aucun traqueur,
          aucune donnée revendue.
        </p>
        <nav className="flex gap-4" aria-label="Liens secondaires">
          {PAGES_APPLICATION.map((page) => (
            <Link key={page.href} href={page.href} className="transition-colors hover:text-ink">
              {t(page.labelKey)}
            </Link>
          ))}
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
