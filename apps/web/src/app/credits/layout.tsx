/**
 * Titre de l'onglet des crédits.
 *
 * La page est devenue un composant client pour se traduire ; elle ne peut donc
 * plus exporter `metadata` elle-même. Ce titre-là reste en français : il est
 * rendu sur le serveur, qui ne connaît pas la langue choisie — voir la note du
 * même genre dans `a-propos/layout.tsx`.
 */

import type { Metadata } from 'next'
import { metadonnees } from '@/lib/i18n/metadonnees.ts'

export async function generateMetadata(): Promise<Metadata> {
  return metadonnees('meta.credits', { description: 'meta.creditsDesc' })
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
