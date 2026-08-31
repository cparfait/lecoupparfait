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
import { Board2D } from '@/components/board/Board2D.tsx'
import { CavalePortrait } from '@/components/brand/CavalePortrait.tsx'
import { DefiDuJour } from '@/components/daily/DefiDuJour.tsx'
import { ButtonLink, Card, Chip } from '@/components/ui/index.tsx'
import { AccueilConnecte } from '@/components/accueil/AccueilConnecte.tsx'
import { useIdentite } from '@/lib/auth/useIdentite.ts'
import { renderEmphasis, useI18n } from '@/lib/i18n/index.tsx'
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
  'e4', 'e5', 'f4', 'exf4', 'Bc4', 'Qh4+', 'Kf1', 'b5', 'Bxb5', 'Nf6',
  'Nf3', 'Qh6', 'd3', 'Nh5', 'Nh4', 'Qg5', 'Nf5', 'c6', 'g4', 'Nf6',
  'Rg1', 'cxb5', 'h4', 'Qg6', 'h5', 'Qg5', 'Qf3', 'Ng8', 'Bxf4', 'Qf6',
  'Nc3', 'Bc5', 'Nd5', 'Qxb2', 'Bd6', 'Bxg1', 'e5', 'Qxa1+', 'Ke2', 'Na6',
  'Nxg7+', 'Kd8', 'Qf6+', 'Nxf6', 'Be7#',
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
  club: 'noyer',
  clair: 'marbre',
  // `contraste` n'a pas d'équivalent jaune, et il n'en faut pas : ce thème
  // existe pour la lisibilité, donc on prend l'ardoise, le damier le plus
  // franchement contrasté de la série.
  contraste: 'ardoise',
}

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

/** Les trois destinations que l'accueil doit pouvoir atteindre sans le menu. */
const PORTES = [
  { href: '/apprendre', label: 'Apprendre les échecs de zéro' },
  { href: '/analyse', label: 'Analyser une partie' },
  { href: '/jouer/ordinateur', label: 'Jouer contre l’ordinateur' },
] as const

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

  if (identite === undefined) return <div className="min-h-[60vh]" aria-hidden />
  if (identite) return <AccueilConnecte pseudo={identite.username} />

  return (
    <>
      <Hero />
      <Essentiel />
    </>
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
            Aucune inscription nécessaire pour jouer ou apprendre.
            <br />
            Un compte —{' '}
            <Link href="/connexion" className="font-semibold text-muted hover:text-ink hover:underline">
              gratuit, un pseudo et un mot de passe
            </Link>{' '}
            — ajoute le défi du jour, ta série, ton classement par cadence et l’historique de
            tes parties.
          </p>
        </div>

        {/* ── Démonstration ─────────────────────────────────────────── */}
        <div className="animate-slide-up [animation-delay:120ms]">
          <div className="relative">
            {/* L'échiquier passe devant le portrait : il lui faut une ombre
                portée, pas un halo. Un halo derrière une photo se lit comme une
                auréole ; une ombre creuse la profondeur qu'on cherche. */}
            <div
              className={
                'mx-auto w-full max-w-[440px] overflow-hidden rounded-[var(--radius)] ' +
                'border border-line-strong shadow-[0_40px_90px_-20px_rgb(0_0_0/.65)]'
              }
            >
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
          <Card className="glass-lisible mx-auto mt-4 flex w-full max-w-[520px] items-start gap-3 p-3.5 backdrop-blur-md">
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
    { value: '25', label: 'niveaux d’adversaires, de 100 à 3200 Elo' },
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

        <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-4">
          {stats.map(({ value, label }) => (
            <div key={label}>
              <p className="font-display text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">
                {value}
              </p>
              <p className="mt-1.5 text-xs leading-snug text-muted">{label}</p>
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
        aria-label="Aller plus loin"
        className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line/60 pt-5 text-sm"
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
          Aller plus loin
        </span>
        {PORTES.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-1.5 font-medium text-muted transition-colors hover:text-ink"
          >
            {label}
            <ArrowRight
              size={14}
              aria-hidden
              className="text-faint transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        ))}
      </nav>
    </section>
  )
}
