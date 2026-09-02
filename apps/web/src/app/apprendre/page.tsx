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
      Premier passage : tout replié sauf le chapitre en cours.

      Les sept chapitres s'ouvraient tous, et trente-six cartes de leçon
      s'empilaient à la suite. Sur un téléphone, il fallait faire défiler cinq
      écrans pour apercevoir le chapitre 2 : la page annonçait « 7 chapitres »
      et n'en montrait jamais qu'un. Or c'est la liste qu'on vient voir — on
      choisit un chapitre, puis une leçon, dans cet ordre.

      Le chapitre en cours est le premier dont toutes les leçons ne sont pas
      terminées : c'est là qu'on reprend. Tout fini, tout reste replié — il n'y
      a plus rien à reprendre, et la liste seule répond mieux à « qu'est-ce que
      j'ai fait ? ».

      Ce n'est qu'un défaut : le choix de chacun est conservé dès qu'il en fait
      un, et prime sur celui-ci.
    */
    const enCours = CHAPTERS.find((chapitre) =>
      chapitre.lessons.some((lecon) => !suivi[lecon.id]?.completed),
    )
    setCollapsed(
      Object.fromEntries(CHAPTERS.map((chapitre) => [chapitre.id, chapitre.id !== enCours?.id])),
    )
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
      const next = Object.fromEntries(
        CHAPTERS.map((chapter) => [chapter.id, !allCollapsed]),
      )
      try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next))
      } catch {
        // Idem.
      }
      return next
    })
  }, [allCollapsed])

  const overall = overallProgress(progress)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-14">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Apprendre les échecs
      </h1>
      <p className="mt-2 max-w-2xl text-muted">
        {CURRICULUM_STATS.lessons} leçons guidées, {CURRICULUM_STATS.steps} étapes, une voix
        qui explique chaque coup. Tu peux commencer sans rien connaître — la première leçon
        part de l’échiquier vide.
      </p>

      {/* ── Progression globale ──────────────────────────────────────── */}
      {overall > 0 && (
        <Card className="mt-6 p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm font-medium">Ta progression</span>
            <span className="text-sm tabular-nums text-muted">{overall} %</span>
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
      )}

      {/* ── Chapitres ────────────────────────────────────────────────── */}
      <div className="mt-10 flex items-baseline justify-between gap-4">
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

      {/* `space-y-8` et non plus 14 : l'écart était calculé pour des chapitres
          tous dépliés, où il sépare une grille de cartes de la suivante.
          Repliés, les sept en-têtes flottaient à cinquante-six pixels les uns
          des autres — une liste ne se lit pas comme ça. */}
      <div className="mt-4 space-y-8">
        {CHAPTERS.map((chapter, chapterIndex) => {
          const done = chapter.lessons.filter((lesson) => progress[lesson.id]?.completed).length
          const replie = Boolean(collapsed[chapter.id])

          return (
            <section
              key={chapter.id}
              className="animate-slide-up"
              style={{ animationDelay: `${chapterIndex * 60}ms` }}
            >
              {/* Filet de séparation : sans lui, les chapitres se confondent
                  avec les cartes de leçons du chapitre précédent. */}
              {chapterIndex > 0 && (
                <div
                  className="mb-6 h-px w-full"
                  style={{
                    background:
                      'linear-gradient(90deg, var(--border-strong), transparent 70%)',
                  }}
                  aria-hidden
                />
              )}

              <header className="mb-5">
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
                      boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--accent) 30%, transparent)',
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
                          ? 'border-[color-mix(in_oklab,var(--q-best)_35%,transparent)] bg-[color-mix(in_oklab,var(--q-best)_7%,transparent)]'
                          : 'border-line bg-surface',
                      )}
                    >
                      <span className="mt-0.5 text-xl" aria-hidden>
                        {lesson.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-snug">{lesson.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted">
                          {lesson.summary}
                        </p>
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
        Environ {Math.round(CURRICULUM_STATS.minutes / 60)} heures de contenu au total.
        Aucune leçon n’est verrouillée : va où tu veux, dans l’ordre que tu veux.
      </p>

      <AutresDeLaSection section="apprendre" />
    </div>
  )
}
