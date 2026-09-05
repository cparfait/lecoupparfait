/**
 * Titre de l'onglet d'une leçon — celui de la leçon, et non le mot « Leçon ».
 *
 * Il valait « Leçon » pour les trente-six : deux onglets ouverts côte à côte
 * disaient la même chose, un signet posé sur « Le cavalier » se relisait
 * « Leçon », et un lien partagé n'annonçait rien de ce qu'il ouvrait. Le titre
 * d'onglet est la seule chose qui reste d'une page quand elle n'est plus au
 * premier plan.
 *
 * Une mise en page serveur, comme les autres : la page est un composant client
 * et ne peut pas produire ses propres métadonnées. Le suffixe
 * « · Le Coup Parfait » est posé par `title.template` de la mise en page
 * racine.
 */

import type { Metadata } from 'next'
import { findLesson } from '@/lib/lessons/index.ts'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lessonId: string }>
}): Promise<Metadata> {
  const { lessonId } = await params
  const lecon = findLesson(lessonId)

  // Adresse inventée ou leçon renommée : la page affiche « cette leçon n'existe
  // pas », et l'onglet doit dire la même chose plutôt qu'un titre alléchant.
  if (!lecon) return { title: 'Leçon introuvable' }

  return {
    title: lecon.title,
    description: lecon.summary,
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
