/**
 * Titre de l'onglet pour le sommaire des outils.
 *
 * La page est un composant client — les cartes reçoivent des icônes, qui sont
 * des fonctions, et un composant serveur ne peut pas les transmettre — et ne
 * peut donc pas exporter `metadata` elle-même.
 */

import type { Metadata } from 'next'
import { metadonnees } from '@/lib/i18n/metadonnees.ts'

export async function generateMetadata(): Promise<Metadata> {
  return metadonnees('meta.tools', { description: 'meta.toolsDesc' })
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
