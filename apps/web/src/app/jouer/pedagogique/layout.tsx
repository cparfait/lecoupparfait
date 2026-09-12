/**
 * Titre de l'onglet de la séance pédagogique.
 *
 * Une mise en page serveur d'une ligne : la page est un composant client et ne
 * peut pas exporter ses propres métadonnées.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Séance pédagogique',
  description:
    'Une partie contre un adversaire calibré, un thème annoncé avant de commencer, et un bilan qui dit où il est apparu.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
