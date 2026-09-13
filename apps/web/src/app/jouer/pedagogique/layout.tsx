/**
 * Titre de l'onglet de la séance pédagogique.
 *
 * Une mise en page serveur d'une ligne : la page est un composant client et ne
 * peut pas exporter ses propres métadonnées.
 */

import type { Metadata } from 'next'
import { metadonnees } from '@/lib/i18n/metadonnees.ts'

export async function generateMetadata(): Promise<Metadata> {
  return metadonnees('meta.lesson', { description: 'meta.lessonDesc' })
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
