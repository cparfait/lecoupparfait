/**
 * Titre de l'onglet des principes.
 *
 * Une mise en page serveur d'une ligne : la page est un composant client et ne
 * peut pas exporter ses propres métadonnées.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Principes et mémo',
  description:
    'Quatre questions à se poser avant chaque coup, et les principes de conduite des trois phases — chacun avec son exception.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
