'use client'

/**
 * Page d'accueil.
 *
 * Deux temps pour un visiteur, et rien de plus. Le premier écran tient en une
 * vue : la question — « par où commencer ? » — et ses trois réponses, en face
 * de Cavale, la sculpture du logo, seule. Ensuite, ce qui change chaque jour
 * et le catalogue, puis une ligne sur ce qu'un compte ajoute.
 *
 * Épurée à dessein. La page a porté une partie célèbre rejouée et commentée,
 * des chiffres en grand, le défi du jour et la sculpture, tout à la fois et
 * l'un sur l'autre : l'œil ne savait pas où se poser, et sur téléphone la
 * sculpture finissait coupée en deux par l'échiquier. Ce qui reste est ce
 * qu'un visiteur doit voir : la marque, et par où entrer.
 */

import Link from 'next/link'
import { ArrowRight, GraduationCap, Swords, Target } from 'lucide-react'
import { BOT_LEVELS, PAS_DU_TEST } from '@coupparfait/core'
import { CavalePortrait } from '@/components/brand/CavalePortrait.tsx'
import { DefiDuJour } from '@/components/daily/DefiDuJour.tsx'
import { Skeleton } from '@/components/ui/index.tsx'
import { AccueilConnecte } from '@/components/accueil/AccueilConnecte.tsx'
import { useIdentite } from '@/lib/auth/useIdentite.ts'
import { basicsChapter } from '@/lib/lessons/basics.ts'
import { renderEmphasis, useI18n } from '@/lib/i18n/index.tsx'
import type { TranslationKey } from '@/lib/i18n/index.tsx'

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
 * Ce qui suit s'adresse à quelqu'un qui découvre. Quelqu'un de connecté a déjà
 * choisi, et le lui redire à chaque clic sur le logo l'obligerait à traverser
 * une vitrine pour retrouver ses parties.
 *
 * Trois états d'identité, et les trois comptent :
 *   `undefined`  on ne sait pas encore — on ne montre rien plutôt que de faire
 *                clignoter la vitrine une demi-seconde chez quelqu'un de
 *                connecté ;
 *   `null`       personne — la page publique ;
 *   sinon        son tableau de bord.
 */
export default function HomePage() {
  const identite = useIdentite()

  // Un squelette plutôt qu'un vide : la demi-seconde où l'on ne sait pas
  // encore qui est là se voyait comme une page blanche, puis un saut.
  if (identite === undefined) return <SqueletteAccueil />
  if (identite) return <AccueilConnecte pseudo={identite.username} />

  return (
    <>
      <PremierEcran />
      <LeJour />
    </>
  )
}

/** La silhouette de la page, le temps de savoir laquelle afficher. */
function SqueletteAccueil() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-6 lg:pt-20" aria-hidden>
      <div className="grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
        <div>
          <Skeleton className="mt-6 h-12 w-3/4" />
          <Skeleton className="mt-3 h-12 w-1/2" />
          <Skeleton className="mt-6 h-5 w-full max-w-xl" />
          <Skeleton className="mt-8 h-[76px] w-full max-w-xl rounded-[var(--radius)]" />
          <Skeleton className="mt-2.5 h-[76px] w-full max-w-xl rounded-[var(--radius)]" />
          <Skeleton className="mt-2.5 h-[76px] w-full max-w-xl rounded-[var(--radius)]" />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Premier écran
// ─────────────────────────────────────────────────────────────────────────────

/**
 * La question, ses trois réponses, et la marque.
 *
 * La première question de quelqu'un qui arrive n'est pas « jouer ou
 * apprendre ? », c'est « est-ce pour moi, à mon niveau ? ». On la pose telle
 * quelle — « Par où commencer ? » — et l'on y répond par ce que le visiteur
 * sait de lui-même :
 *
 *  - il découvre : la première leçon, et c'est le seul bouton plein de
 *    l'écran, parce que c'est le seul chemin qui ne demande rien ;
 *  - il sait déjà jouer : le test de niveau, qui le placera sur l'échelle ;
 *  - il veut juste jouer : l'ordinateur, sans compte.
 *
 * Les deux dernières sont des cartes de même facture, chacune à la teinte de
 * sa rubrique. La troisième n'était qu'un lien souligné sous les deux autres,
 * et se lisait comme une note de bas de page plutôt que comme une réponse.
 *
 * En face, Cavale, seule : ni échiquier ni commentaire par-dessus. Sur
 * téléphone elle n'a pas la place d'exister à côté du texte, et la marque
 * tient dans le logo de l'en-tête.
 *
 * La durée de la leçon, le nombre de positions du test et celui des niveaux
 * sont lus dans les données, jamais recopiés : ils changeront.
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

      <div className="relative mx-auto grid w-full max-w-[1400px] gap-8 px-4 pb-10 pt-8 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-16 lg:pb-16 lg:pt-16">
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

              <Porte
                href="/apprendre/niveau"
                teinte="var(--rub-apprendre)"
                icone={<Target size={22} />}
                titre={t('home.knowTitle')}
                detail={t('home.knowHint', { n: PAS_DU_TEST.length })}
              />
              <Porte
                href="/jouer/ordinateur"
                teinte="var(--rub-jouer)"
                icone={<Swords size={22} />}
                titre={t('home.playTitle')}
                detail={t('home.playHint', { n: BOT_LEVELS.length })}
              />
            </div>
          </section>
        </div>

        {/* La hauteur commande la taille : la pièce, plus haute que large, est
            contenue dans son cadre sans être rognée. */}
        <CavalePortrait className="relative hidden h-[clamp(440px,44vw,620px)] w-full max-w-[440px] animate-slide-up [animation-delay:120ms] lg:block lg:justify-self-center" />
      </div>
    </section>
  )
}

/** Une réponse secondaire à « Par où commencer ? » : une carte de verre, l'icône à la teinte de sa rubrique. */
function Porte({
  href,
  teinte,
  icone,
  titre,
  detail,
}: {
  href: string
  teinte: string
  icone: React.ReactNode
  titre: string
  detail: string
}) {
  return (
    <Link
      href={href}
      className="glass flex min-h-[76px] items-center gap-3.5 rounded-[var(--radius)] px-4 py-3.5 transition-colors hover:bg-surface-hover"
    >
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px]"
        style={{ background: `color-mix(in oklab, ${teinte} 16%, transparent)`, color: teinte }}
        aria-hidden
      >
        {icone}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold">{titre}</span>
        <span className="block text-[13px] text-muted">{detail}</span>
      </span>
      <ArrowRight
        size={20}
        className="shrink-0 text-[var(--accent-text)] rtl:-scale-x-100"
        aria-hidden
      />
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Le jour, et ce qu'un compte y ajoute
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sous le premier écran : ce qui se renouvelle chaque jour, et le catalogue.
 *
 * Le défi du jour est la seule chose de la page qui change d'une visite à
 * l'autre ; il dit lui-même, avant le clic, qu'il demande un compte pour tenir
 * la série — voir `DefiDuJour`. À côté, les chiffres du catalogue. Puis, en une
 * ligne, ce qu'un compte ajoute, et les portes vers le reste.
 *
 * Les chiffres n'ont ni carte ni cloison : un nombre n'a pas besoin d'un cadre
 * pour se faire remarquer.
 */
function LeJour() {
  const { t } = useI18n()

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
    <section className="border-t border-line/60">
      <div className="mx-auto grid w-full max-w-[1400px] items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:gap-16 lg:py-16">
        <div>
          <h2 className="titre-affiche text-[clamp(1.8rem,3.6vw,2.6rem)]">
            {t('home.catalogTitle')}
          </h2>
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

        <div className="w-full lg:max-w-[440px] lg:justify-self-end">
          <DefiDuJour />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1400px] px-4 pb-10 sm:px-6 lg:pb-16">
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
