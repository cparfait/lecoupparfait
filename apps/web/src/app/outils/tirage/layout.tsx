/**
 * Titre de l'onglet pour le tirage au sort.
 *
 * La page est un composant client et ne peut pas exporter `metadata` ;
 * cette mise en page d'une ligne le fait pour elle.
 */

import type { Metadata } from 'next'
import { metadonnees } from '@/lib/i18n/metadonnees.ts'

export async function generateMetadata(): Promise<Metadata> {
  return metadonnees('meta.draw', { description: 'meta.drawDesc' })
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
