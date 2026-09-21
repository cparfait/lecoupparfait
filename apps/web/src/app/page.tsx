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
import { ArrowRight, Sparkles, Volume2 } from 'lucide-react'
import { Chess } from 'chess.js'
import { BOT_LEVELS } from '@coupparfait/core'
import { Board2D } from '@/components/board/Board2D.tsx'
import { CavalePortrait } from '@/components/brand/CavalePortrait.tsx'
import { DefiDuJour } from '@/components/daily/DefiDuJour.tsx'
import { ButtonLink, Card, Chip, Skeleton } from '@/components/ui/index.tsx'
import { AccueilConnecte } from '@/components/accueil/AccueilConnecte.tsx'
import { useIdentite } from '@/lib/auth/useIdentite.ts'
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
 * Le damier de la bannière suit le thème, pas la préférence du joueur.
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
      <Hero />
      <Essentiel />
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
          <Skeleton className="mt-2 h-5 w-2/3 max-w-xl" />
          <div className="mt-8 flex gap-3">
            <Skeleton className="h-12 w-44 rounded-[var(--radius)]" />
            <Skeleton className="h-12 w-52 rounded-[var(--radius)]" />
          </div>
        </div>
        <Skeleton className="mx-auto aspect-square w-full max-w-[440px] rounded-[var(--radius)]" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Bannière
// ─────────────────────────────────────────────────────────────────────────────

function Hero() {
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

  return (
    <section className="relative overflow-hidden">
      {/* Halo de fond, sous tous les calques : il éclaire le coin haut-droit
          d'où vient la lumière du portrait, pour que la photo et la page
          semblent partager la même source. */}
      <div
        className="pointer-events-none absolute inset-0 -z-20"
        style={{
          background:
            'radial-gradient(70% 55% at 62% 8%, var(--aurora-1), transparent 70%),' +
            'radial-gradient(50% 50% at 20% 90%, var(--aurora-2), transparent 70%)',
        }}
        aria-hidden
      />
      {/* Un damier en filigrane, qui s'efface vers les bords : la seule
          décoration de la bannière, et elle dit le sujet sans le dessiner. */}
      <div className="fond-damier pointer-events-none absolute inset-0 -z-10" aria-hidden />

      <CavalePortrait />

      {/* Marge basse réduite de moitié, et pas par goût du serrage.
          Additionnée aux 48 px de la section suivante, elle ouvrait un vide de
          151 px sous la carte du commentaire — une bande vide plus haute que la
          carte elle-même, où il n'y avait rien à voir et rien à lire. Le haut
          garde ses 80 px : c'est ce qui pose la bannière. */}
      <div className="relative mx-auto grid w-full max-w-[1400px] items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:gap-16 lg:pb-8 lg:pt-20">
        {/* ── Texte ─────────────────────────────────────────────────── */}
        <div className="animate-slide-up">
          <Chip tone="accent" className="mb-5">
            <Sparkles size={11} aria-hidden />
            {t('home.badge')}
          </Chip>

          {/* Deux lignes, deux encres : la première en pleine encre, la
              seconde en retrait. Pas de dégradé de couleur sur le titre —
              c'est devenu la signature de toutes les pages faites à la chaîne,
              et un titre n'a pas besoin d'être coloré pour être grand. */}
          <h1 className="titre-affiche text-[clamp(2.7rem,6.6vw,5.2rem)]">
            {t('home.heroTitleTop')}
            <br />
            <span className="text-muted">{t('home.heroTitleBottom')}</span>
          </h1>

          <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-muted lg:text-[19px]">
            {renderEmphasis(t('home.heroSubtitle'))}
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/jouer" variant="primary" size="lg" icon={<ArrowRight size={17} />}>
              {t('home.ctaPlay')}
            </ButtonLink>
            <ButtonLink href="/apprendre" variant="outline" size="lg">
              {t('home.ctaLearn')}
            </ButtonLink>
          </div>

          {/* Ce que le compte ajoute, juste sous ce qu'il n'exige pas.
          
              « Aucune inscription nécessaire » est vrai et rassurant, et se
              suffisait à lui-même tant que le compte ne servait à rien de
              visible. Il sert maintenant à quatre choses qu'on refuse
              explicitement à un visiteur — le défi du jour, la série, le
              classement, l'historique — et laisser cette promesse seule
              reviendrait à faire découvrir ces refus un par un, chacun comme
              une mauvaise surprise.
          
              Les deux phrases doivent donc se suivre : la première dit qu'on
              n'a rien à donner pour commencer, la seconde ce qu'on gagne à
              revenir. Dans cet ordre, et pas l'inverse. */}
          <p className="mt-4 text-xs leading-relaxed text-faint">
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
        </div>

        {/* ── Démonstration ─────────────────────────────────────────── */}
        <div className="animate-slide-up [animation-delay:120ms]">
          <div className="relative">
            {/* L'échiquier passe devant le portrait : il lui faut une ombre
                portée, pas un halo. Un halo derrière une photo se lit comme une
                auréole ; une ombre creuse la profondeur qu'on cherche. */}
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
          </div>

          {/* Le commentaire est d'aplomb sous l'échiquier, et il a longtemps
              débordé de 96 px vers la gauche — l'idée étant que ce décalage
              rattache la voix à la sculpture posée derrière.

              Il la rattachait surtout en se posant dessus. La carte fait 708 px
              de large contre 438 au plateau : les 183 px d'écart tombaient
              pile sur la tête de Cavale, et son fond translucide laissait
              remonter le bois et la crinière derrière le texte, qui devenait
              illisible. Un débordement qui cache le sujet qu'il devait
              désigner n'est plus une composition, c'est une collision.

              Recalé sur l'échiquier, il libère la sculpture et gagne un fond
              propre.

              `mx-auto max-w-[520px]`, et non la largeur de la colonne : celle-ci
              fait 612 px contre 438 au plateau, et la carte y était décalée à
              gauche, en travers de la sculpture. Centrée sur le plateau et
              élargie de 80 px, elle déborde de 40 px de chaque côté — assez
              pour qu'on lise un bloc posé par-dessus plutôt qu'un panneau
              rapporté sous l'échiquier, et dix fois moins que les 183 px du
              premier jet, qui recouvraient la tête de Cavale. */}
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
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Fonctionnalités
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ce qui reste sous la bannière : le défi du jour, et quatre chiffres.
 *
 * Il y avait ici trois sections et cinq cartes — le défi, trois « promesses »
 * encadrées d'un liseré lumineux, puis un pavé de quatre chiffres cloisonnés.
 * La page se lisait comme un tableau de bord alors qu'elle doit se lire comme
 * une porte d'entrée.
 *
 * Ce qui a été retiré l'a été pour redite, pas pour faire court :
 *
 *  - « Un coach qui parle » et « Analyse expliquée » reformulaient le
 *    sous-titre de la bannière — « un moteur qui explique pourquoi, une voix
 *    qui t'accompagne » — deux cents pixels plus bas. Dire deux fois la même
 *    chose ne la rend pas deux fois plus vraie ; ça donne l'impression qu'on
 *    n'a pas grand-chose à dire.
 *  - « 25 niveaux, 7 caractères » redisait le « 25 » de la ligne de chiffres
 *    juste en dessous, avec un encadré de plus.
 *  - La mention de licence en bas de section est déjà dans le pied de page,
 *    avec le lien « Crédits & licences ».
 *
 * Les chiffres, eux, restent : ils disent quelque chose que rien d'autre ne
 * dit. Mais ils perdent leur carte et leurs cloisons. Un nombre n'a pas besoin
 * d'un cadre pour se faire remarquer — c'est un nombre.
 */
function Essentiel() {
  const { t } = useI18n()

  const stats = [
    { value: '3 810', label: t('home.statsOpenings') },
    { value: '6 057 356', label: t('home.statsPuzzles') },
    {
      // Lu dans la table, jamais recopié : l'échelle est passée de vingt-sept à
      // quinze échelons et six endroits annonçaient encore « 25 ».
      value: String(BOT_LEVELS.length),
      label: `niveaux d’adversaires, de ${BOT_LEVELS[0]?.elo} à ${BOT_LEVELS.at(-1)?.elo} Elo`,
    },
    { value: '7', label: 'pièces : finales résolues à la perfection' },
  ]

  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 pb-10 pt-6 sm:px-6 lg:pb-16 lg:pt-4">
      {/* Le défi garde sa carte : c'est le seul bloc de la page sur lequel on
          agit, et le seul dont le contenu change d'un jour à l'autre. Les
          chiffres l'accompagnent sans en réclamer une — c'est ce déséquilibre
          assumé qui dit lequel des deux appelle un geste. */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-center lg:gap-14">
        <DefiDuJour />

        {/* Deux colonnes, deux rangées, et jamais quatre : « 6 057 356 » ne
            tient pas dans un quart de colonne sans se casser sur deux lignes,
            et un chiffre cassé décale tous les libellés. Chaque nombre reste
            sur sa ligne (`chiffre-affiche`), les libellés s'alignent. */}
        <div className="grid grid-cols-2 gap-x-10 gap-y-10 sm:gap-x-14 lg:pl-4">
          {stats.map(({ value, label }) => (
            <div key={label}>
              <p className="chiffre-affiche text-[clamp(2.2rem,4.6vw,3.6rem)]">{value}</p>
              <p className="mt-3 max-w-[22ch] text-[14px] leading-snug text-muted">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trois portes, en toutes lettres.
          
          L'allègement avait supprimé les trois cartes qui menaient à Apprendre,
          Analyse et l'ordinateur — à raison : elles reformulaient le sous-titre
          de la bannière. Mais elles emportaient avec elles les seuls liens
          directs de la page, et il ne restait que le menu déroulant. Une page
          d'accueil qui ne mène nulle part sans passer par un menu a été
          simplifiée un cran trop loin.
          
          On garde donc les destinations et on jette l'emballage : trois liens
          sur une ligne, sans carte, sans icône, sans liseré. Ce qui encombrait
          n'était pas l'existence de ces chemins, c'était le mobilier autour. */}
      <nav
        aria-label={t('home.goFurther')}
        className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line/60 pt-5 text-sm"
      >
        <span className="text-[12px] font-semibold text-faint">{t('home.goFurther')}</span>
        {PORTES.map(({ href, labelKey }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-1.5 font-medium text-muted transition-colors hover:text-ink"
          >
            {t(labelKey)}
            <ArrowRight
              size={14}
              aria-hidden
              className="text-faint transition-transform duration-150 group-hover:translate-x-0.5"
            />
          </Link>
        ))}
      </nav>
    </section>
  )
}
