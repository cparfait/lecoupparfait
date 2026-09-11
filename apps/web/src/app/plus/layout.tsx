/**
 * Titre de l'onglet pour la page « Plus ».
 *
 * Une mise en page serveur d'une ligne : la page est un composant client et ne
 * peut pas exporter `metadata` elle-même.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Plus',
  description: 'La communauté, les outils, ton compte et les réglages.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
