/**
 * Titre de l'onglet pour le sommaire des outils.
 *
 * La page est un composant client — les cartes reçoivent des icônes, qui sont
 * des fonctions, et un composant serveur ne peut pas les transmettre — et ne
 * peut donc pas exporter `metadata` elle-même.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Outils',
  description:
    'La pendule, le calculateur Elo, le tirage au sort et l’aide-mémoire d’arbitrage : ce qui sert autour d’un vrai échiquier.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
