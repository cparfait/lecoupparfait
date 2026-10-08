/**
 * Titre de l'onglet de la page « Supprimer ton compte ».
 *
 * La page est un composant client et ne peut pas exporter `metadata`. Voir la
 * note de `a-propos/layout.tsx` sur la langue de ce titre.
 */

import type { Metadata } from 'next'
import { metadonnees } from '@/lib/i18n/metadonnees.ts'

export async function generateMetadata(): Promise<Metadata> {
  return metadonnees('meta.deleteAccount', { description: 'meta.deleteAccountDesc' })
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
