/**
 * Titre de l'onglet pour le sommaire de la communauté.
 *
 * Une mise en page serveur d'une ligne, et rien d'autre : la page est un
 * composant client, elle ne peut donc pas exporter `metadata` elle-même.
 */

import type { Metadata } from 'next'
import { metadonnees } from '@/lib/i18n/metadonnees.ts'

export async function generateMetadata(): Promise<Metadata> {
  return metadonnees('meta.community', { description: 'meta.communityDesc' })
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
