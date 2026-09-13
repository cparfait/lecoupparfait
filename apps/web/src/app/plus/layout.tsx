/**
 * Titre de l'onglet pour la page « Plus ».
 *
 * Une mise en page serveur d'une ligne : la page est un composant client et ne
 * peut pas exporter `metadata` elle-même.
 */

import type { Metadata } from 'next'
import { metadonnees } from '@/lib/i18n/metadonnees.ts'

export async function generateMetadata(): Promise<Metadata> {
  return metadonnees('meta.more', { description: 'meta.moreDesc' })
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
