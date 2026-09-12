/**
 * Titre de l'onglet des enjeux d'ouverture.
 *
 * Une mise en page serveur d'une ligne : la page est un composant client et ne
 * peut pas exporter ses propres métadonnées.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Les enjeux des ouvertures',
  description:
    'Vingt-cinq ouvertures expliquées par leur idée, leur structure de pions, le plan de chaque camp et le piège des dix premiers coups.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
