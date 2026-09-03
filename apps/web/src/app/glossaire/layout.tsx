/**
 * Titre de l'onglet pour glossaire.
 *
 * Une mise en page serveur d'une ligne, et rien d'autre : la page est un
 * composant client, elle ne peut donc pas exporter `metadata` elle-même. Le
 * suffixe « · Le Coup Parfait » est posé par `title.template` de la mise en
 * page racine.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Glossaire',
  description: 'Le vocabulaire des échecs, expliqué simplement.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
