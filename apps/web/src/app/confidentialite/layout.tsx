/**
 * Titre de l'onglet de la politique de confidentialité. Voir la note de
 * `a-propos/layout.tsx` sur la langue de ce titre.
 */

import type { Metadata } from 'next'
import { metadonnees } from '@/lib/i18n/metadonnees.ts'

export async function generateMetadata(): Promise<Metadata> {
  return metadonnees('meta.privacy', { description: 'meta.privacyDesc' })
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
