/**
 * Titre de l'onglet de la galerie des adversaires.
 *
 * La galerie est devenue un composant client pour se traduire. Le gabarit est
 * reposé ici — voir la note d'`apprendre/layout.tsx` : ce dossier a une page
 * en dessous de lui, et un `title` en chaîne consommerait le gabarit de la
 * racine sans en reposer aucun.
 */

import type { Metadata } from 'next'
import { metadonneesDeRubrique } from '@/lib/i18n/metadonnees.ts'

export async function generateMetadata(): Promise<Metadata> {
  return metadonneesDeRubrique('meta.opponents', 'meta.opponentsDesc')
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
