/**
 * Titre de l'onglet du mode écoute.
 *
 * Une mise en page serveur d'une ligne : la page est un composant client et ne
 * peut pas exporter ses propres métadonnées.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Écouter le programme',
  description:
    'Les leçons lues à voix haute, sans rien à toucher : le coach parle, l’échiquier suit. Pour réviser en faisant autre chose.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
