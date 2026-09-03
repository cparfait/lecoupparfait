/**
 * Titre de l'onglet pour courriels de test.
 *
 * Une mise en page serveur d'une ligne, et rien d'autre : la page est un
 * composant client, elle ne peut donc pas exporter `metadata` elle-même. Le
 * suffixe « · Le Coup Parfait » est posé par `title.template` de la mise en
 * page racine.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Courriels de test',
  // Rien à indexer : un écran d'administration ou une porte de
  // récupération n'ont pas à apparaître dans un moteur de recherche.
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
