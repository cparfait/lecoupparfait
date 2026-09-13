/**
 * Titre de l'onglet pour le calculateur Elo.
 *
 * La page est un composant client et ne peut pas exporter `metadata` ;
 * cette mise en page d'une ligne le fait pour elle.
 */

import type { Metadata } from 'next'
import { metadonnees } from '@/lib/i18n/metadonnees.ts'

export async function generateMetadata(): Promise<Metadata> {
  return metadonnees('meta.elo', { description: 'meta.eloDesc' })
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
