/**
 * Titre de l'onglet du test de niveau.
 *
 * Une mise en page serveur d'une ligne : la page est un composant client, elle
 * ne peut pas exporter ses propres métadonnées. Le suffixe
 * « · Le Coup Parfait » vient du gabarit posé par `/apprendre`.
 */

import type { Metadata } from 'next'
import { metadonnees } from '@/lib/i18n/metadonnees.ts'

export async function generateMetadata(): Promise<Metadata> {
  return metadonnees('meta.levelTest', { description: 'meta.levelTestDesc' })
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
