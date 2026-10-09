/**
 * Titre de l'onglet de la page « Installer sur l'ordinateur ».
 *
 * La page est un composant client — elle suit la proposition d'installation
 * du navigateur — et ne peut donc pas exporter `metadata` elle-même. Voir la
 * note de `a-propos/layout.tsx` sur la langue de ce titre.
 */

import type { Metadata } from 'next'
import { metadonnees } from '@/lib/i18n/metadonnees.ts'

export async function generateMetadata(): Promise<Metadata> {
  return metadonnees('meta.installDesktop', { description: 'meta.installDesktopDesc' })
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
