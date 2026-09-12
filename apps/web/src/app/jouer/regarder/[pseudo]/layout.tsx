/**
 * Titre de l'onglet quand on regarde la partie de quelqu'un.
 *
 * Le pseudo y figure : deux onglets ouverts sur deux parties d'amis différentes
 * s'appelaient sinon pareil, et l'on ne savait plus laquelle on suivait.
 */

import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pseudo: string }>
}): Promise<Metadata> {
  const { pseudo } = await params
  const nom = decodeURIComponent(pseudo)
  return {
    title: `La partie de ${nom}`,
    description: `Suis la partie de ${nom} contre l’ordinateur, coup par coup.`,
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
