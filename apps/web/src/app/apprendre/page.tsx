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
import Link from 'next/link'
import { AutresDeLaSection } from '@/components/layout/AutresDeLaSection.tsx'
import { Check, ChevronDown, Clock, Play } from 'lucide-react'
import clsx from 'clsx'
import {
  CHAPTERS,
  CURRICULUM_STATS,
  loadProgress,
  overallProgress,
  type LessonProgress,
} from '@/lib/lessons/index.ts'
import { Card, Chip } from '@/components/ui/index.tsx'

const LEVEL_LABELS = {
  beginner: { label: 'Débutant', tone: 'success' as const },
  intermediate: { label: 'Intermédiaire', tone: 'warning' as const },
  advanced: { label: 'Confirmé', tone: 'danger' as const },
}

/** Chapitres repliés, conservés d'une visite à l'autre. */
const COLLAPSED_KEY = 'coupparfait.chaptersCollapsed'

export default function LearnPage() {
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
  const termineesEnTout = CHAPTERS.reduce(
    (total, chapitre) =>
      total + chapitre.lessons.filter((lecon) => progress[lecon.id]?.completed).length,
    0,
  )

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-14">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Apprendre les échecs
      </h1>
      {/* La consigne, en petit.

          Elle occupait trois lignes en corps courant, juste sous un titre de
          trente-six pixels : deux blocs de texte avant la moindre leçon, et la
          progression repoussée d'autant. Elle se lit une fois, à la première
          visite ; ensuite on vient reprendre un cours. */}
      <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted">
        {CURRICULUM_STATS.lessons} leçons guidées, {CURRICULUM_STATS.steps} étapes, une voix qui
        explique chaque coup. Tu peux commencer sans rien connaître — la première leçon part de
        l’échiquier vide.
      </p>

      {/* ── Progression globale ────────────────────────────────────────
          Affichée même à zéro, et les cours se déplient dessous : c'est la
          première chose qu'on vient voir, et une barre vide dit « tu n'as pas
          commencé » bien mieux qu'une absence, qui ne dit rien du tout. */}
      <Card className="mt-5 p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm font-medium">Ta progression</span>
          <span className="text-sm tabular-nums text-muted">
            {overall} %{' '}
            <span className="text-faint">
              · {termineesEnTout} / {CURRICULUM_STATS.lessons} leçons
            </span>
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-strong">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${overall}%`,
              background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
            }}
          />
        </div>
      </Card>

      {/* ── Chapitres ────────────────────────────────────────────────── */}
      <div className="mt-8 flex items-baseline justify-between gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
          {CHAPTERS.length} chapitres
        </p>
        <button
          type="button"
          onClick={toggleAll}
          className="text-[13px] font-medium text-accent transition-colors hover:underline"
        >
          {allCollapsed ? 'Tout déplier' : 'Tout replier'}
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
               à lire — un chapitre contient des leçons, et cela se dessine. */
            <section
              key={chapter.id}
              className="animate-slide-up overflow-hidden rounded-[var(--radius)] border border-line/70 bg-surface/40 p-3 sm:p-4"
              style={{ animationDelay: `${chapterIndex * 60}ms` }}
            >
              <header className={clsx(replie ? 'mb-0' : 'mb-4')}>
                <button
                  type="button"
                  onClick={() => toggle(chapter.id)}
                  aria-expanded={!replie}
                  aria-controls={`chapitre-${chapter.id}`}
                  className="flex w-full items-center gap-3.5 rounded-[var(--radius)] text-left transition-colors hover:bg-surface-hover"
                >
                  <span
                    className="grid h-13 w-13 shrink-0 place-items-center rounded-[var(--radius)] text-2xl"
                    style={{
                      height: '3.25rem',
                      width: '3.25rem',
                      background: 'color-mix(in oklab, var(--accent) 16%, transparent)',
                      boxShadow:
                        'inset 0 0 0 1px color-mix(in oklab, var(--accent) 30%, transparent)',
                    }}
                    aria-hidden
                  >
                    {chapter.icon}
                  </span>

                  <div className="min-w-0 flex-1">
                    {/* Le numéro de chapitre situe la progression dans le
                        programme, et fait respirer le titre au-dessus. */}
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                      Chapitre {chapterIndex + 1}
                      {done > 0 && (
                        <span className="ml-2 font-normal normal-case tracking-normal text-faint">
                          {done} / {chapter.lessons.length} terminées
                        </span>
                      )}
                    </p>
                    <h2 className="mt-0.5 font-display text-[clamp(1.5rem,3.4vw,2rem)] font-bold leading-tight tracking-tight text-ink">
                      {chapter.title}
                    </h2>
                  </div>

                  <Chip tone={LEVEL_LABELS[chapter.level].tone} className="shrink-0 self-start">
                    {LEVEL_LABELS[chapter.level].label}
                  </Chip>

                  <ChevronDown
                    size={20}
                    aria-hidden
                    className={clsx(
                      'shrink-0 self-start text-faint transition-transform duration-200',
                      replie && '-rotate-90',
                    )}
                  />
                </button>

                {/* La description reste visible replié : elle dit ce que le
                    chapitre apprend, et c'est sur elle qu'on choisit d'ouvrir. */}
                <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-muted">
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
                        <p className="mt-2 flex items-center gap-2 text-[11px] text-faint">
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
