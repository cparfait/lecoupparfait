'use client'

/**
 * Sommaire du programme d'apprentissage.
 *
 * Les chapitres sont présentés dans l'ordre où l'on apprend réellement, pas
 * dans l'ordre où on les imagine : les règles, savoir mater, la tactique — et
 * seulement ensuite les ouvertures. Un débutant qui apprend dix variantes
 * d'ouverture avant de savoir mater avec une tour perd toutes ses parties
 * quand même.
 *
 * Rien n'est verrouillé : on peut sauter directement à ce qui intéresse. Une
 * barrière de progression n'apprend rien à personne, elle décourage.
 */

import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import { AutresDeLaSection } from '@/components/layout/AutresDeLaSection.tsx'
import {
  Check,
  ChevronDown,
  Clock,
  Headphones,
  ListChecks,
  Play,
  Target,
  TrendingUp,
} from 'lucide-react'
import clsx from 'clsx'
import {
  CHAPTERS,
  CURRICULUM_STATS,
  loadProgress,
  overallProgress,
  type LessonProgress,
} from '@/lib/lessons/index.ts'
import { ButtonLink, Card, Chip } from '@/components/ui/index.tsx'
import { CarteDestination } from '@/components/ui/CarteDestination.tsx'
import { EnTeteDeCarte } from '@/components/ui/EnTeteDeCarte.tsx'
import { useT } from '@/lib/i18n/index.tsx'

/** La teinte de la rubrique, posée une fois pour les cartes de destination. */
const TEINTE_APPRENDRE = 'var(--rub-apprendre)'

/**
 * Le niveau donne son étiquette au chapitre : la pastille à droite, en vert,
 * ambre ou rouge. Les en-têtes, eux, portent tous la teinte de la rubrique :
 * trois couleurs de bandeau sur une page qui en avait déjà deux, c'était la
 * page qui payait. Le niveau se lit sur la pastille, qui est faite pour ça.
 */
const LEVEL_LABELS = {
  beginner: { labelKey: 'rest.levelBeginner', tone: 'success' },
  intermediate: { labelKey: 'rest.levelIntermediate', tone: 'warning' },
  advanced: { labelKey: 'rest.levelAdvanced', tone: 'danger' },
} as const

/** Chapitres repliés, conservés d'une visite à l'autre. */
const COLLAPSED_KEY = 'coupparfait.chaptersCollapsed'

export default function LearnPage() {
  const t = useT()
  const [progress, setProgress] = useState<LessonProgress>({})

  /**
   * Chapitres repliés.
   *
   * Sept chapitres et trente-six leçons font une page où l'on descend
   * longtemps pour retrouver celle qu'on suivait. Le choix est conservé : on
   * replie une fois ce qu'on a fini, et on ne le revoit plus.
   */
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  // La progression vit dans le navigateur : on ne peut la lire qu'après le
  // montage, sinon le rendu serveur et le rendu client diffèrent.
  useEffect(() => {
    const suivi = loadProgress()
    setProgress(suivi)

    try {
      const enregistre = localStorage.getItem(COLLAPSED_KEY)
      if (enregistre) {
        setCollapsed(JSON.parse(enregistre) as Record<string, boolean>)
        return
      }
    } catch {
      // Stockage illisible : on retombe sur le pliage par défaut ci-dessous.
    }

    /*
      Premier passage : tout est ouvert.

      Les chapitres arrivaient repliés, sauf celui en cours — au motif que sept
      en-têtes tiennent dans un écran là où trente-six cartes en demandent
      cinq. C'était échanger un défilement contre un mystère : la page annonçait
      sept chapitres et ne montrait aucun cours, et rien ne dit qu'un titre
      cache une liste. Les cours se déplient donc sous la progression, tous, et
      celui qui veut refermer un chapitre fini le referme — son choix est
      conservé, et prime sur celui-ci.
    */
    setCollapsed({})
  }, [])

  const toggle = useCallback((id: string) => {
    setCollapsed((current) => {
      const next = { ...current, [id]: !current[id] }
      try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next))
      } catch {
        // Sans stockage, le pliage vaut pour la visite en cours.
      }
      return next
    })
  }, [])

  const allCollapsed = CHAPTERS.every((chapter) => collapsed[chapter.id])
  const toggleAll = useCallback(() => {
    setCollapsed(() => {
      const next = Object.fromEntries(CHAPTERS.map((chapter) => [chapter.id, !allCollapsed]))
      try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next))
      } catch {
        // Idem.
      }
      return next
    })
  }, [allCollapsed])

  const overall = overallProgress(progress)

  /**
   * La leçon à proposer en grand : la première entamée sans être finie, et
   * sinon la première qui reste à faire. `null` quand tout est terminé.
   */
  const prochaine = (() => {
    const toutes = CHAPTERS.flatMap((chapitre, index) =>
      chapitre.lessons.map((lecon) => ({ lecon, chapitre: index + 1 })),
    )
    const entamee = toutes.find(({ lecon }) => {
      const etat = progress[lecon.id]
      return etat && etat.steps > 0 && !etat.completed
    })
    if (entamee) {
      return { ...entamee, entamee: true, etapes: progress[entamee.lecon.id]?.steps ?? 0 }
    }
    const restante = toutes.find(({ lecon }) => !progress[lecon.id]?.completed)
    return restante ? { ...restante, entamee: false, etapes: 0 } : null
  })()
  const termineesEnTout = CHAPTERS.reduce(
    (total, chapitre) =>
      total + chapitre.lessons.filter((lecon) => progress[lecon.id]?.completed).length,
    0,
  )

  return (
    <div className="page">
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
        {t('learn.pageTitle')}
      </h1>
      {/* La consigne, en petit.

          Elle occupait trois lignes en corps courant, juste sous un titre de
          trente-six pixels : deux blocs de texte avant la moindre leçon, et la
          progression repoussée d'autant. Elle se lit une fois, à la première
          visite ; ensuite on vient reprendre un cours. */}
      <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-muted">
        {t('learn.intro', { lecons: CURRICULUM_STATS.lessons, etapes: CURRICULUM_STATS.steps })}
      </p>

      {/* ── Progression globale ────────────────────────────────────────
          Affichée même à zéro, et les cours se déplient dessous : c'est la
          première chose qu'on vient voir, et une barre vide dit « tu n'as pas
          commencé » bien mieux qu'une absence, qui ne dit rien du tout. */}
      <Card className="mt-5 overflow-hidden">
        <EnTeteDeCarte
          titre={t('learn.yourProgress')}
          icone={<TrendingUp size={14} aria-hidden />}
          fin={
            <>
              {overall} %{' '}
              <span className="text-faint">
                ·{' '}
                {t('learn.lessonsOf', {
                  faites: termineesEnTout,
                  total: CURRICULUM_STATS.lessons,
                })}
              </span>
            </>
          }
        />
        {/* La glissière est en `bg-line` et non en `bg-surface-strong` : sur le
            thème clair, cette dernière vaut du blanc franc, et une barre à 0 %
            était une barre invisible sur une carte blanche. */}
        <div className="m-4 h-2 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${overall}%`,
              background: 'var(--accent)',
            }}
          />
        </div>
      </Card>

      {/* ── La leçon à reprendre, en grand ─────────────────────────────
          Trente-six cartes de la même taille : celle qu'on était en train de
          suivre pesait autant que les trente-cinq autres, et il fallait la
          retrouver dans les chapitres. Elle est ici, seule, avec son bouton.
          À défaut d'une leçon entamée, c'est la première qui reste à faire ;
          quand tout est fait, il n'y a rien à reprendre et la carte s'efface. */}
      {prochaine && (
        <Card glow className="mt-4 overflow-hidden">
          <EnTeteDeCarte
            titre={`${prochaine.entamee ? t('learn.resumeWhere') : t('learn.whereToStart')} · ${t('learn.chapterN', { n: prochaine.chapitre })}`}
            icone={<Play size={14} aria-hidden />}
          />
          <div className="flex flex-wrap items-center gap-4 p-5">
            <span
              className="grid h-14 w-14 shrink-0 place-items-center rounded-[var(--radius)] text-3xl"
              style={{ background: 'color-mix(in oklab, var(--rub-apprendre) 16%, transparent)' }}
              aria-hidden
            >
              {prochaine.lecon.icon}
            </span>
            <div className="min-w-[14rem] flex-1">
              <h2 className="font-display text-lg font-semibold tracking-tight">
                {prochaine.lecon.title}
              </h2>
              <p className="mt-1 text-[14px] leading-relaxed text-muted">
                {prochaine.lecon.summary}
              </p>
              <p className="mt-1.5 flex items-center gap-2 text-[12px] text-faint">
                <Clock size={11} aria-hidden />
                {prochaine.lecon.minutes} min
                <span aria-hidden>·</span>
                {prochaine.entamee
                  ? t('learn.stepOf', {
                      n: prochaine.etapes + 1,
                      total: prochaine.lecon.steps.length,
                    })
                  : t('learn.stepsCount', { n: prochaine.lecon.steps.length })}
              </p>
            </div>
            <ButtonLink
              href={`/apprendre/${prochaine.lecon.id}`}
              variant="primary"
              size="lg"
              icon={<Play size={16} />}
              className="w-full sm:w-auto"
            >
              {prochaine.entamee ? t('learn.resume') : t('learn.start')}
            </ButtonLink>
          </div>
        </Card>
      )}

      {/* ── Trois autres façons d'entrer dans le programme ──────────────
          Le sommaire répond à « qu'est-ce qu'il y a à apprendre ? ». Ce n'est
          pas la question qu'on se pose en arrivant — on se demande « qu'est-ce
          qui me coûte des points ? », « qu'est-ce que je dois me dire avant de
          jouer ? », et parfois « je n'ai pas les mains libres ». Trois portes,
          sur le même contenu, rangé autrement. */}
      <div className="mt-6 grille-cartes">
        <CarteDestination
          href="/apprendre/palier"
          icon={Target}
          teinte={TEINTE_APPRENDRE}
          titre={t('learn.palierTitle')}
          phrase={t('learn.palierBlurb')}
          detail={t('learn.palierDetail')}
          compacte
        />
        <CarteDestination
          href="/apprendre/principes"
          icon={ListChecks}
          teinte={TEINTE_APPRENDRE}
          titre={t('learn.principesTitle')}
          phrase={t('learn.principesBlurb')}
          detail={t('learn.principesDetail')}
          compacte
        />
        <CarteDestination
          href="/apprendre/ecoute"
          icon={Headphones}
          teinte={TEINTE_APPRENDRE}
          titre={t('learn.ecouteTitle')}
          phrase={t('learn.ecouteBlurb')}
          detail={t('learn.ecouteDetail', { etapes: CURRICULUM_STATS.steps })}
          compacte
        />
        <CarteDestination
          href="/jouer/pedagogique"
          icon={Play}
          teinte="var(--rub-jouer)"
          titre={t('learn.seanceTitle')}
          phrase={t('learn.seanceBlurb')}
          detail={t('learn.seanceDetail')}
          compacte
        />
      </div>

      {/* ── Chapitres ────────────────────────────────────────────────── */}
      <div className="mt-8 flex items-baseline justify-between gap-4">
        <p className="text-[12px] font-semibold text-faint">
          {t('learn.chaptersCount', { n: CHAPTERS.length })}
        </p>
        <button
          type="button"
          onClick={toggleAll}
          className="text-[14px] font-medium text-accent transition-colors hover:underline"
        >
          {allCollapsed ? t('learn.expandAll') : t('learn.collapseAll')}
        </button>
      </div>

      {/* Trois points entre deux panneaux, et non plus trente-deux : chaque
          chapitre porte désormais son propre cadre, qui fait le travail que
          l'écart faisait mal. */}
      <div className="mt-4 space-y-3">
        {CHAPTERS.map((chapter, chapterIndex) => {
          const done = chapter.lessons.filter((lesson) => progress[lesson.id]?.completed).length
          const replie = Boolean(collapsed[chapter.id])

          return (
            /* ── Un chapitre, un bloc ──────────────────────────────────
               Les chapitres étaient séparés du suivant par un filet dégradé, et
               c'était tout : une fois les leçons dépliées, l'en-tête du
               chapitre 2 arrivait juste sous les cartes du chapitre 1, à la même
               largeur et sur le même fond. On ne voyait plus où l'un finissait
               et où l'autre commençait — six titres et trente-six cartes dans
               une seule colonne indifférenciée.

               Chaque chapitre est maintenant un panneau : un cadre, un fond
               légèrement en retrait, et ses leçons posées **dedans**, sur des
               cartes plus claires que lui. La hiérarchie se voit sans qu'on ait
               à lire — un chapitre contient des leçons, et cela se dessine.

               Encore fallait-il que le panneau se voie. Il était peint en
               `bg-surface/40` sur un liseré `line/70`, c'est-à-dire, en thème
               sombre, quarante pour cent d'un blanc déjà à 4,5 % — moins de deux
               points de blanc sur un fond presque noir, et un cadre à six. Rien
               ne se détachait : le panneau était là dans le code, invisible à
               l'écran, et les chapitres retombaient dans la colonne
               indifférenciée que ce bloc devait justement casser.

               `bg-bg-deep` est un fond *creusé*, plus sombre que la page en
               thème sombre et plus gris qu'elle en thème clair — dans les deux
               cas un vrai cran, et dans les deux cas les cartes de leçons
               remontent au-dessus. Le liseré passe au fort. */
            <section
              key={chapter.id}
              className="animate-slide-up overflow-hidden rounded-[var(--radius)] border border-line-strong bg-bg-deep p-3 sm:p-4"
              style={{ animationDelay: `${chapterIndex * 60}ms` }}
            >
              <header>
                {/* L'en-tête reprend `.bandeau` : un fond gris, une pastille
                    d'icône dans la teinte de la rubrique, et le titre en
                    pleine encre. Il portait la couleur du niveau sur tout son
                    fond, titre compris — sept bandeaux, trois couleurs, et un
                    titre vert sur du vert. Le niveau se lit sur sa pastille à
                    droite, qui est faite pour ça. Il déborde le rembourrage du
                    panneau par des marges négatives : un bandeau qui s'arrête
                    avant le bord n'est qu'un rectangle de plus. */}
                <button
                  type="button"
                  onClick={() => toggle(chapter.id)}
                  aria-expanded={!replie}
                  aria-controls={`chapitre-${chapter.id}`}
                  style={{ '--teinte': 'var(--rub-apprendre)' } as CSSProperties}
                  className="bandeau -mx-3 -mt-3 flex w-[calc(100%+1.5rem)] items-center gap-3 border-b-2 px-3 py-3 text-left transition-colors hover:bg-surface-hover sm:-mx-4 sm:-mt-4 sm:w-[calc(100%+2rem)] sm:px-4"
                >
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-sm)] text-xl"
                    style={{
                      background: 'color-mix(in oklab, var(--bandeau-teinte) 18%, transparent)',
                      boxShadow:
                        'inset 0 0 0 1px color-mix(in oklab, var(--bandeau-teinte) 34%, transparent)',
                    }}
                    aria-hidden
                  >
                    {chapter.icon}
                  </span>

                  <div className="min-w-0 flex-1">
                    {/* Le numéro de chapitre situe la progression dans le
                        programme, et fait respirer le titre au-dessus. */}
                    <p className="text-[12px] font-semibold text-muted">
                      Chapitre {chapterIndex + 1}
                      {done > 0 && (
                        <span className="ml-2 font-normal normal-case tracking-normal text-muted">
                          {done} / {chapter.lessons.length} terminées
                        </span>
                      )}
                    </p>
                    {/* Le titre tenait dans deux rem — trente-deux pixels, la
                        taille du titre de la page — pour nommer l'un des sept
                        chapitres qu'elle contient. Il passe sous celui-ci, et
                        au-dessus des titres de leçons : c'est sa place dans la
                        hiérarchie, il l'occupe enfin. */}
                    <h2 className="font-display text-[clamp(1.0625rem,2vw,1.25rem)] font-bold leading-tight tracking-tight text-ink">
                      {chapter.title}
                    </h2>
                  </div>

                  <Chip tone={LEVEL_LABELS[chapter.level].tone} className="shrink-0">
                    {t(LEVEL_LABELS[chapter.level].labelKey)}
                  </Chip>

                  <ChevronDown
                    size={18}
                    aria-hidden
                    className={clsx(
                      'shrink-0 text-faint transition-transform duration-150',
                      replie && '-rotate-90',
                    )}
                  />
                </button>

                {/* La description reste visible replié : elle dit ce que le
                    chapitre apprend, et c'est sur elle qu'on choisit d'ouvrir. */}
                <p
                  className={clsx(
                    'max-w-2xl pt-3 text-[13px] leading-relaxed text-muted',
                    !replie && 'pb-3',
                  )}
                >
                  {chapter.description}
                </p>
              </header>

              <div
                id={`chapitre-${chapter.id}`}
                hidden={replie}
                className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
              >
                {chapter.lessons.map((lesson) => {
                  const state = progress[lesson.id]
                  const started = (state?.steps ?? 0) > 0
                  const completed = state?.completed ?? false

                  return (
                    <Link
                      key={lesson.id}
                      href={`/apprendre/${lesson.id}`}
                      className={clsx(
                        'group relative flex gap-3 rounded-[var(--radius)] border p-3.5 transition-all',
                        'hover:-translate-y-0.5 hover:bg-surface-hover',
                        completed
                          ? 'border-[color-mix(in_oklab,var(--q-best)_35%,transparent)] bg-[color-mix(in_oklab,var(--q-best)_10%,transparent)]'
                          : 'border-line bg-bg-elev',
                      )}
                    >
                      <span className="mt-0.5 text-xl" aria-hidden>
                        {lesson.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-snug">{lesson.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted">{lesson.summary}</p>
                        <p className="mt-2 flex items-center gap-2 text-[12px] text-faint">
                          <Clock size={11} aria-hidden />
                          {lesson.minutes} min
                          <span aria-hidden>·</span>
                          {lesson.steps.length} étapes
                          {started && !completed && (
                            <>
                              <span aria-hidden>·</span>
                              <span className="text-accent">reprise possible</span>
                            </>
                          )}
                        </p>
                      </div>

                      <span
                        className={clsx(
                          'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full transition-colors',
                          completed
                            ? 'bg-[var(--q-best)] text-white'
                            : 'bg-surface-strong text-faint group-hover:bg-accent group-hover:text-[var(--accent-contrast)]',
                        )}
                        aria-hidden
                      >
                        {completed ? <Check size={13} /> : <Play size={11} />}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      <p className="mt-10 text-center text-xs text-faint">
        Environ {Math.round(CURRICULUM_STATS.minutes / 60)} heures de contenu au total. Aucune leçon
        n’est verrouillée : va où tu veux, dans l’ordre que tu veux.
      </p>

      <AutresDeLaSection section="apprendre" />
    </div>
  )
}
