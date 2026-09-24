/**
 * Titre de l'onglet pour les erreurs à revoir.
 *
 * Une mise en page serveur d'une ligne : la page est un composant client, elle
 * ne peut donc pas exporter `metadata` elle-même. Pas d'indexation : la page
 * ne montre que les fautes d'un compte, rien qu'un moteur de recherche puisse
 * lire.
 */

import type { Metadata } from 'next'
import { metadonnees } from '@/lib/i18n/metadonnees.ts'

export async function generateMetadata(): Promise<Metadata> {
  return metadonnees('revoir.metaTitle', { description: 'revoir.metaDesc', sansIndexation: true })
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
