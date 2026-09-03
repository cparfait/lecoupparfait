/**
 * Titre de l'onglet pour classement.
 *
 * Une mise en page serveur d'une ligne, et rien d'autre : la page est un
 * composant client, elle ne peut donc pas exporter `metadata` elle-même. Le
 * suffixe « · Le Coup Parfait » est posé par `title.template` de la mise en
 * page racine.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Classement',
  description: 'Les meilleurs joueurs de cette instance.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
