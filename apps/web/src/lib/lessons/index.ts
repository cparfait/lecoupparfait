/**
 * Le programme complet.
 *
 * L'ordre des chapitres est celui dans lequel on apprend réellement : les
 * règles, puis savoir conclure, puis les quatre mats qu'on prend dans la
 * figure pendant ses premières parties, puis la tactique — qui est ce qui fait
 * gagner des parties — et seulement ensuite l'ouverture et la stratégie.
 * Beaucoup de débutants font l'inverse et passent des heures sur des variantes
 * d'ouverture avant de savoir mater avec une tour.
 */

import { basicsChapter } from './basics.ts'
import { matesChapter, openingMatesChapter } from './mats.ts'
import { tacticsChapter } from './tactics.ts'
import { endgameChapter, middlegameChapter, openingChapter } from './strategy.ts'
import { repertoireChapter } from './repertoire.ts'
import type { Chapter, Lesson } from './types.ts'

export * from './types.ts'

export const CHAPTERS: Chapter[] = [
  basicsChapter,
  matesChapter,
  // Les mats de l'ouverture juste après : ce sont les seuls qu'on subit
  // vraiment dans ses dix premières parties, et on les subit avant d'avoir
  // appris quoi que ce soit d'autre.
  openingMatesChapter,
  tacticsChapter,
  openingChapter,
  repertoireChapter,
  middlegameChapter,
  endgameChapter,
]

/** Index plat de toutes les leçons, pour la navigation directe. */
export const ALL_LESSONS: Array<Lesson & { chapterId: string; chapterTitle: string }> =
  CHAPTERS.flatMap((chapter) =>
    chapter.lessons.map((lesson) => ({
      ...lesson,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
    })),
  )

export function findLesson(id: string) {
  return ALL_LESSONS.find((lesson) => lesson.id === id) ?? null
}

/** Leçon suivante dans l'ordre du programme, ou `null` à la fin. */
export function nextLesson(id: string) {
  const index = ALL_LESSONS.findIndex((lesson) => lesson.id === id)
  return index >= 0 ? (ALL_LESSONS[index + 1] ?? null) : null
}

export function previousLesson(id: string) {
  const index = ALL_LESSONS.findIndex((lesson) => lesson.id === id)
  return index > 0 ? (ALL_LESSONS[index - 1] ?? null) : null
}

/** Statistiques affichées sur la page d'accueil du programme. */
export const CURRICULUM_STATS = {
  chapters: CHAPTERS.length,
  lessons: ALL_LESSONS.length,
  minutes: ALL_LESSONS.reduce((total, lesson) => total + lesson.minutes, 0),
  steps: ALL_LESSONS.reduce((total, lesson) => total + lesson.steps.length, 0),
}

// ─────────────────────────────────────────────────────────────────────────────
//  Progression
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'coupparfait.lessonProgress'

export interface LessonProgress {
  /** Étapes terminées par leçon. */
  [lessonId: string]: { steps: number; completed: boolean }
}

/**
 * Progression conservée dans le navigateur.
 *
 * Un compte la synchronise ensuite côté serveur, mais elle fonctionne sans :
 * il n'est pas question d'exiger une inscription pour apprendre à jouer.
 */
export function loadProgress(): LessonProgress {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as LessonProgress
  } catch {
    return {}
  }
}

export function saveProgress(lessonId: string, steps: number, completed: boolean): void {
  if (typeof window === 'undefined') return
  try {
    const current = loadProgress()
    const existing = current[lessonId]
    current[lessonId] = {
      // On ne redescend jamais : revoir une leçon ne doit pas effacer le progrès.
      steps: Math.max(existing?.steps ?? 0, steps),
      completed: existing?.completed || completed,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // Stockage plein ou refusé : la leçon reste jouable, elle ne sera pas retenue.
  }
}

/** Pourcentage global d'avancement dans le programme. */
export function overallProgress(progress: LessonProgress): number {
  const completed = ALL_LESSONS.filter((lesson) => progress[lesson.id]?.completed).length
  return Math.round((completed / ALL_LESSONS.length) * 100)
}
