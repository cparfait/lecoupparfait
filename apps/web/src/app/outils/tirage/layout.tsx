/**
 * Titre de l'onglet pour le tirage au sort.
 *
 * La page est un composant client et ne peut pas exporter `metadata` ;
 * cette mise en page d'une ligne le fait pour elle.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tirage au sort',
  description:
    'Les couleurs d’une partie, les paires d’une ronde, l’ordre de passage : un tirage que tout le monde voit.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
