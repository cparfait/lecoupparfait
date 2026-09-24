/**
 * Titre de l'onglet pour « Progresser ».
 *
 * Une mise en page serveur d'une ligne, et rien d'autre : la page est un
 * composant client, elle ne peut donc pas exporter `metadata` elle-même. Le
 * suffixe « · Le Coup Parfait » est posé par le gabarit de titre de la
 * rubrique.
 */

import type { Metadata } from 'next'
import { metadonneesDeRubrique } from '@/lib/i18n/metadonnees.ts'

export async function generateMetadata(): Promise<Metadata> {
  return metadonneesDeRubrique('progress.title', 'progress.metaDesc')
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
