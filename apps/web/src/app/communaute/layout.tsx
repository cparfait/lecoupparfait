/**
 * Titre de l'onglet pour le sommaire de la communauté.
 *
 * Une mise en page serveur d'une ligne, et rien d'autre : la page est un
 * composant client, elle ne peut donc pas exporter `metadata` elle-même.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Communauté',
  description: 'Le classement, tes amis, tes parties par correspondance et tes statistiques.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
