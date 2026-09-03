/**
 * Titre de l'onglet pour éditeur de position.
 *
 * Une mise en page serveur d'une ligne, et rien d'autre : la page est un
 * composant client, elle ne peut donc pas exporter `metadata` elle-même. Le
 * suffixe « · Le Coup Parfait » est posé par `title.template` de la mise en
 * page racine.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Éditeur de position',
  description: 'Compose une position et joue-la.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
