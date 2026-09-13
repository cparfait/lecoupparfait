/**
 * Titre de l'onglet quand on regarde la partie de quelqu'un.
 *
 * Le pseudo y figure : deux onglets ouverts sur deux parties d'amis différentes
 * s'appelaient sinon pareil, et l'on ne savait plus laquelle on suivait.
 */

import type { Metadata } from 'next'
import { tDesMetadonnees } from '@/lib/i18n/metadonnees.ts'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pseudo: string }>
}): Promise<Metadata> {
  const { pseudo } = await params
  const nom = decodeURIComponent(pseudo)
  const t = await tDesMetadonnees()
  return {
    title: t('meta.watchSomeone', { pseudo: nom }),
    description: t('meta.watchSomeoneDesc', { pseudo: nom }),
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
