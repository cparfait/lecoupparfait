/**
 * Titre de l'onglet pour le sommaire de l'entraînement.
 *
 * Une mise en page serveur d'une ligne, et rien d'autre : la page est un
 * composant client, elle ne peut donc pas exporter `metadata` elle-même. Le
 * suffixe « · Le Coup Parfait » est posé par `title.template` de la mise en
 * page racine.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'S’entraîner',
  description: 'Puzzles à ton niveau, manche chronométrée et défi du jour.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
