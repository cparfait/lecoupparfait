'use client'

/**
 * Page d'accueil.
 *
 * Deux temps pour un visiteur. D'abord une question — « par où commencer ? » —
 * et ses deux réponses : c'est tout le premier écran. Ensuite seulement, la
 * preuve : l'échiquier rejoue en boucle une combinaison célèbre — l'Immortelle
 * d'Anderssen — pendant que le commentaire s'écrit à côté. C'est exactement ce
 * que fait le produit, en démonstration, sans avoir à cliquer.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronRight, GraduationCap, Target, Volume2 } from 'lucide-react'
import { Chess } from 'chess.js'
import { BOT_LEVELS, PAS_DU_TEST } from '@coupparfait/core'
import { Board2D } from '@/components/board/Board2D.tsx'
import { CavalePortrait } from '@/components/brand/CavalePortrait.tsx'
import { DefiDuJour } from '@/components/daily/DefiDuJour.tsx'
import { Card, Skeleton } from '@/components/ui/index.tsx'
import { AccueilConnecte } from '@/components/accueil/AccueilConnecte.tsx'
import { useIdentite } from '@/lib/auth/useIdentite.ts'
import { basicsChapter } from '@/lib/lessons/basics.ts'
import { renderEmphasis, useI18n } from '@/lib/i18n/index.tsx'
import type { TranslationKey } from '@/lib/i18n/index.tsx'
import { usePreferences } from '@/lib/store/preferences.ts'
import type { BoardStyleId, ThemeId } from '@/lib/store/preferences.ts'

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
  'e4',
  'e5',
  'f4',
  'exf4',
  'Bc4',
  'Qh4+',
  'Kf1',
  'b5',
  'Bxb5',
  'Nf6',
  'Nf3',
  'Qh6',
  'd3',
  'Nh5',
  'Nh4',
  'Qg5',
  'Nf5',
  'c6',
  'g4',
  'Nf6',
  'Rg1',
  'cxb5',
  'h4',
  'Qg6',
  'h5',
  'Qg5',
  'Qf3',
  'Ng8',
  'Bxf4',
  'Qf6',
  'Nc3',
  'Bc5',
  'Nd5',
  'Qxb2',
  'Bd6',
  'Bxg1',
  'e5',
  'Qxa1+',
  'Ke2',
  'Na6',
  'Nxg7+',
  'Kd8',
  'Qf6+',
  'Nxf6',
  'Be7#',
]

/**
 * Le damier de la démonstration suit le thème, pas la préférence du joueur.
 *
 * Ailleurs dans l'application c'est l'inverse : le damier obéit au réglage
 * choisi, et c'est bien ainsi. Mais la bannière est une vitrine — un damier
 * violet sur un habillage doré donne l'impression que la page a été assemblée
 * par deux personnes qui ne se sont pas parlé.
 */
const DAMIER_PAR_THEME: Record<ThemeId, BoardStyleId> = {
  aurora: 'aurore',
  clair: 'marbre',
}

/*
  Commentaires affichés aux moments charnières de la démonstration.

  Par clé de dictionnaire : c'est une constante de module, donc sans `t()`, et les
  sept phrases restaient en français sur la page que voit en premier quelqu'un qui
  arrive — autrement dit la dernière place où l'on voudrait une langue qu'on ne
  lit pas.
*/
const COMMENTARY: Record<number, TranslationKey> = {
  0: 'rest.immortal0',
  9: 'rest.immortal1',
  21: 'rest.immortal2',
  35: 'rest.immortal3',
  40: 'rest.immortal4',
  42: 'rest.immortal5',
  44: 'rest.immortal6',
}

/** Les trois destinations que l'accueil doit pouvoir atteindre sans le menu. */
const PORTES = [
  { href: '/apprendre', labelKey: 'rest.doorLearn' },
  { href: '/analyse', labelKey: 'rest.doorAnalyse' },
  { href: '/jouer/ordinateur', labelKey: 'rest.doorComputer' },
] as const satisfies ReadonlyArray<{ href: string; labelKey: TranslationKey }>

/** La première leçon du programme : celle qu'on propose à qui n'a jamais joué. */
const PREMIERE_LECON = basicsChapter.lessons[0]!

/**
 * Deux accueils, selon qu'on a un compte ou non.
 *
 * Ce qui suit — la bannière, la partie immortelle qui se déroule toute seule,
 * les chiffres du catalogue — s'adresse à quelqu'un qui découvre : ça vend le
 * produit. Quelqu'un de connecté a déjà acheté, et le lui redire à chaque clic
 * sur le logo l'oblige à traverser une brochure pour retrouver ses parties.
 *
 * Trois états d'identité, et les trois comptent :
 *   `undefined`  on ne sait pas encore — on ne montre rien plutôt que de faire
 *                clignoter la brochure une demi-seconde chez quelqu'un de
 *                connecté ;
 *   `null`       personne — la page publique ;
 *   sinon        son tableau de bord.
 */
export default function HomePage() {
  const identite = useIdentite()

  // Un squelette plutôt qu'un vide : la demi-seconde où l'on ne sait pas
  // encore qui est là se voyait comme une page blanche, puis un saut. Trois
  // formes grises qui miroitent disent « ça arrive », et la page qui suit
  // les recouvre sans à-coup.
  if (identite === undefined) return <SqueletteAccueil />
  if (identite) return <AccueilConnecte pseudo={identite.username} />

  return (
    <>
      <PremierEcran />
      <Demonstration />
    </>
  )
}

/** La silhouette de la page, le temps de savoir laquelle afficher. */
function SqueletteAccueil() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-6 lg:pt-20" aria-hidden>
      <div className="grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
        <div>
          <Skeleton className="h-6 w-56 rounded-full" />
          <Skeleton className="mt-6 h-12 w-3/4" />
          <Skeleton className="mt-3 h-12 w-1/2" />
          <Skeleton className="mt-6 h-5 w-full max-w-xl" />
          <Skeleton className="mt-8 h-[76px] w-full max-w-xl rounded-[var(--radius)]" />
          <Skeleton className="mt-2.5 h-[76px] w-full max-w-xl rounded-[var(--radius)]" />
        </div>
        <Skeleton className="mx-auto h-72 w-full max-w-[440px] rounded-[var(--radius)]" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Premier écran
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Une question, deux réponses, une seule action violette.
 *
 * Le premier écran proposait « Jouer maintenant » et « Commencer à apprendre »
 * côte à côte, puis, plus bas, la carte du défi en fond violet avec son propre
 * « Jouer → » : trois portes de même poids, et aucune ne disait à qui elle
 * s'adressait. Or la première question de quelqu'un qui arrive n'est pas
 * « jouer ou apprendre ? », c'est « est-ce pour moi, à mon niveau ? ».
 *
 * On la pose donc telle quelle — « Par où commencer ? » — et l'on y répond par
 * ce que le visiteur sait de lui-même :
 *
 *  - il découvre : la première leçon, et c'est le seul bouton plein de
 *    l'écran, parce que c'est le seul chemin qui ne demande rien ;
 *  - il sait déjà jouer : le test de niveau, en carte secondaire — il le
 *    placera sur l'échelle des paliers avant de lui proposer quoi que ce soit ;
 *  - il veut juste jouer : un lien, pas un bouton. C'est toujours possible,
 *    mais ce n'est plus ce que la page pousse en premier.
 *
 * La durée de la leçon et le nombre de positions du test sont lus dans les
 * données, jamais recopiés : ils changeront.
 */
function PremierEcran() {
  const { t } = useI18n()

  return (
    <section className="relative overflow-hidden">
      {/* Halo de fond, sous tous les calques : un coin de lumière, pas un décor. */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: 'radial-gradient(80% 55% at 0% 0%, var(--aurora-1), transparent 70%)',
        }}
        aria-hidden
      />

      <div className="relative mx-auto grid w-full max-w-[1400px] gap-8 px-4 pb-8 pt-6 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-16 lg:pb-12 lg:pt-16">
        <div className="animate-slide-up">
          {/* Une mention, pas une pastille : un badge violet en haut de page
              était une deuxième tache d'accent avant même le titre. */}
          <p className="text-[12px] font-semibold text-faint">{t('home.badge')}</p>

          {/* Deux lignes, deux encres : la première en pleine encre, la
              seconde en retrait. Pas de dégradé de couleur sur le titre. */}
          <h1 className="titre-affiche mt-3 text-[clamp(2.5rem,6vw,4.6rem)]">
            {t('home.heroTitleTop')}
            <br />
            <span className="text-muted">{t('home.heroTitleBottom')}</span>
          </h1>

          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-muted lg:text-[18px]">
            {renderEmphasis(t('home.heroSubtitle'))}
          </p>

          <section aria-labelledby="par-ou-commencer" className="mt-8 max-w-xl">
            <h2
              id="par-ou-commencer"
              className="font-display text-[1.3rem] font-bold tracking-tight"
            >
              {t('home.startTitle')}
            </h2>

            <div className="mt-3 flex flex-col gap-2.5">
              <Link
                href={`/apprendre/${PREMIERE_LECON.id}`}
                className="bouton-lumineux flex min-h-[76px] items-center gap-3.5 rounded-[var(--radius)] px-4 py-3.5"
              >
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-[color-mix(in_oklab,var(--accent-contrast)_16%,transparent)]"
                  aria-hidden
                >
                  <GraduationCap size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold">{t('home.discoverTitle')}</span>
                  <span className="block text-[13px] opacity-90">
                    {t('home.discoverHint', {
                      lecon: t(PREMIERE_LECON.title),
                      minutes: PREMIERE_LECON.minutes,
                    })}
                  </span>
                </span>
                <ArrowRight size={20} className="shrink-0 rtl:-scale-x-100" aria-hidden />
              </Link>

              <Link
                href="/apprendre/niveau"
                className="glass flex min-h-[76px] items-center gap-3.5 rounded-[var(--radius)] px-4 py-3.5 transition-colors hover:bg-surface-hover"
              >
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px]"
                  style={{
                    background: 'color-mix(in oklab, var(--rub-apprendre) 16%, transparent)',
                    color: 'var(--rub-apprendre)',
                  }}
                  aria-hidden
                >
                  <Target size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold">{t('home.knowTitle')}</span>
                  <span className="block text-[13px] text-muted">
                    {t('home.knowHint', { n: PAS_DU_TEST.length })}
                  </span>
                </span>
                <ArrowRight
                  size={20}
                  className="shrink-0 text-[var(--accent-text)] rtl:-scale-x-100"
                  aria-hidden
                />
              </Link>

              <Link
                href="/jouer/ordinateur"
                className="inline-flex min-h-11 items-center gap-1.5 self-start text-[15px] font-semibold text-[var(--accent-text)] hover:underline"
              >
                {t('home.playNowLink')}
                <ChevronRight size={16} className="rtl:-scale-x-100" aria-hidden />
              </Link>
            </div>
          </section>
        </div>

        {/* Le défi du jour à côté, et non plus sous la démonstration : c'est
            la seule chose de la page qui change chaque jour. Il dit lui-même,
            avant le clic, qu'il demande un compte — voir `DefiDuJour`. */}
        <div className="w-full animate-slide-up [animation-delay:120ms] lg:max-w-[440px] lg:justify-self-end">
          <DefiDuJour />
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Démonstration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sous le premier écran : le produit en démonstration, puis les chiffres.
 *
 * L'échiquier de l'Immortelle ouvrait la page ; il la suit désormais. Il reste
 * la meilleure preuve de ce qu'on promet — un coach qui commente —, mais il
 * n'est pas une réponse à « par où commencer ? », et le premier écran ne doit
 * en poser qu'une.
 *
 * Les chiffres perdent leur carte et leurs cloisons : un nombre n'a pas besoin
 * d'un cadre pour se faire remarquer.
 */
function Demonstration() {
  const { t } = useI18n()
  // Comme pour le portrait : avant hydratation, `layout.tsx` pose `aurora`.
  const themeChoisi = usePreferences((state) => state.theme)
  const hydrated = usePreferences((state) => state.hydrated)
  const theme = hydrated ? themeChoisi : 'aurora'
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

  const stats = [
    { value: '3 810', label: t('home.statsOpenings') },
    { value: '6 057 356', label: t('home.statsPuzzles') },
    {
      // Lu dans la table, jamais recopié : l'échelle est passée de vingt-sept à
      // quinze échelons et six endroits annonçaient encore « 25 ».
      value: String(BOT_LEVELS.length),
      label: t('home.statsLevels', {
        min: BOT_LEVELS[0]?.elo ?? 0,
        max: BOT_LEVELS.at(-1)?.elo ?? 0,
      }),
    },
    { value: '7', label: t('home.statsTablebase') },
  ]

  return (
    <section className="relative overflow-hidden border-t border-line/60">
      {/* Un damier en filigrane, qui s'efface vers les bords : la seule
          décoration de la section, et elle dit le sujet sans le dessiner. */}
      <div className="fond-damier pointer-events-none absolute inset-0 -z-10" aria-hidden />

      <CavalePortrait />

      <div className="relative mx-auto grid w-full max-w-[1400px] items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:gap-16 lg:py-16">
        <div>
          <h2 className="titre-affiche text-[clamp(1.8rem,3.6vw,2.6rem)]">{t('home.demoTitle')}</h2>
          {/* Deux colonnes, deux rangées, et jamais quatre : « 6 057 356 » ne
              tient pas dans un quart de colonne sans se casser sur deux
              lignes. Chaque nombre reste sur sa ligne (`chiffre-affiche`). */}
          <div className="mt-8 grid grid-cols-2 gap-x-10 gap-y-10 sm:gap-x-14">
            {stats.map(({ value, label }) => (
              <div key={label}>
                <p className="chiffre-affiche text-[clamp(2.2rem,4.6vw,3.6rem)]">{value}</p>
                <p className="mt-3 max-w-[22ch] text-[14px] leading-snug text-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          {/* L'échiquier a une monture : une carte de verre à marge étroite,
              comme un plateau posé dans son cadre. Ni inclinaison ni halo
              coloré — un échiquier se regarde de face. */}
          <div className="glass mx-auto w-full max-w-[460px] rounded-[var(--radius-lg)] p-2.5 shadow-[var(--shadow-lg)]">
            <div className="overflow-hidden rounded-[calc(var(--radius-lg)-10px)]">
              <Board2D
                fen={fen}
                orientation="w"
                playable={null}
                lastMove={lastMove as never}
                allowAnnotations={false}
                skinId={DAMIER_PAR_THEME[theme]}
              />
            </div>
          </div>

          {/* Le commentaire, d'aplomb sous l'échiquier et centré sur lui : décalé
              vers la gauche, il se posait sur la tête de Cavale, la sculpture
              derrière, et son fond translucide rendait le texte illisible. */}
          <Card className="glass-lisible mx-auto mt-4 flex w-full max-w-[520px] items-start gap-3 p-4 backdrop-blur-md">
            <span
              className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full"
              style={{ background: 'color-mix(in oklab, var(--accent) 20%, transparent)' }}
            >
              <Volume2 size={14} className="text-accent" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-faint">{t('home.demoCaption')}</p>
              <p className="mt-1 text-sm leading-relaxed">{t(comment)}</p>
            </div>
          </Card>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[1400px] px-4 pb-10 sm:px-6 lg:pb-16">
        {/* Ce que le compte ajoute, juste sous ce qu'il n'exige pas. Les deux
            phrases se suivent : la première dit qu'on n'a rien à donner pour
            commencer, la seconde ce qu'on gagne à revenir. */}
        <p className="text-xs leading-relaxed text-faint">
          {t('home.noSignup')}
          <br />
          {t('home.accountBefore')}{' '}
          <Link
            href="/connexion"
            className="font-semibold text-muted hover:text-ink hover:underline"
          >
            {t('home.accountLink')}
          </Link>{' '}
          {t('home.accountAfter')}
        </p>

        {/* Trois portes, en toutes lettres : sans carte, sans icône, sans
            liseré. Ce qui encombrait n'était pas l'existence de ces chemins,
            c'était le mobilier autour. */}
        <nav
          aria-label={t('home.goFurther')}
          className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line/60 pt-5 text-sm"
        >
          <span className="text-[12px] font-semibold text-faint">{t('home.goFurther')}</span>
          {PORTES.map(({ href, labelKey }) => (
            <Link
              key={href}
              href={href}
              className="group flex min-h-11 items-center gap-1.5 font-medium text-muted transition-colors hover:text-ink"
            >
              {t(labelKey)}
              <ArrowRight
                size={14}
                aria-hidden
                className="text-faint transition-transform duration-150 group-hover:translate-x-0.5 rtl:-scale-x-100"
              />
            </Link>
          ))}
        </nav>
      </div>
    </section>
  )
}
