/**
 * Titre de l'onglet de la page « Appli Android ».
 *
 * La page est un composant client — elle lit le dictionnaire et l'état de
 * l'appli — et ne peut donc pas exporter `metadata` elle-même. Voir la note de
 * `a-propos/layout.tsx` sur la langue de ce titre.
 */

import type { Metadata } from 'next'
import { metadonnees } from '@/lib/i18n/metadonnees.ts'

export async function generateMetadata(): Promise<Metadata> {
  return metadonnees('meta.androidApp', { description: 'meta.androidAppDesc' })
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
