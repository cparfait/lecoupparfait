/**
 * Titre de l'onglet pour le calculateur Elo.
 *
 * La page est un composant client et ne peut pas exporter `metadata` ;
 * cette mise en page d'une ligne le fait pour elle.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Calculateur Elo',
  description:
    'Ce qu’un tournoi te rapporte ou te coûte, partie par partie, et ta performance — au barème de la FIDE.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
