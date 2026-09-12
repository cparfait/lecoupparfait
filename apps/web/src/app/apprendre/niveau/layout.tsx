/**
 * Titre de l'onglet du test de niveau.
 *
 * Une mise en page serveur d'une ligne : la page est un composant client, elle
 * ne peut pas exporter ses propres métadonnées. Le suffixe
 * « · Le Coup Parfait » vient du gabarit posé par `/apprendre`.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Test de niveau',
  description:
    'Douze positions pour situer ton niveau, et la liste de ce qui te fait gagner des points ensuite.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
