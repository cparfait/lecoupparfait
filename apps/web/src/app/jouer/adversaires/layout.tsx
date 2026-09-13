/**
 * Titre de l'onglet de la galerie des adversaires.
 *
 * La galerie est devenue un composant client pour se traduire. Le gabarit est
 * reposé ici — voir la note d'`apprendre/layout.tsx` : ce dossier a une page
 * en dessous de lui, et un `title` en chaîne consommerait le gabarit de la
 * racine sans en reposer aucun.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Les adversaires artificiels',
    template: '%s · Le Coup Parfait',
  },
  description:
    'Sept adversaires, sept styles de jeu réellement différents — leur histoire, leurs penchants chiffrés, et comment battre chacun d’eux.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
