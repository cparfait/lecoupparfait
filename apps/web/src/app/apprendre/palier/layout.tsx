/**
 * Titre de l'onglet de la page « Ton palier ».
 *
 * Une mise en page serveur d'une ligne : la page est un composant client et ne
 * peut pas exporter ses propres métadonnées.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ton palier',
  description:
    'Le programme rangé par ce qui coûte le plus de points à ton niveau, et les motifs que tu rates vraiment.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
