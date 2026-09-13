/**
 * Titre de l'onglet d'un profil — le pseudo, et non le mot « Profil ».
 *
 * Il valait « Profil » pour tout le monde : on ouvrait trois profils dans trois
 * onglets pour comparer des classements, et les trois portaient le même nom.
 *
 * Le pseudo vient de l'adresse et non de la base : ce titre se calcule à chaque
 * requête, et interroger la base pour une casse de lettres coûterait un
 * aller-retour à chaque ouverture de profil. Un pseudo qui n'existe pas donne
 * un onglet qui annonce un joueur introuvable, ce que la page dit aussi.
 *
 * Une mise en page serveur, comme les autres : la page est un composant client
 * et ne peut pas produire ses propres métadonnées.
 */

import type { Metadata } from 'next'
import { tDesMetadonnees } from '@/lib/i18n/metadonnees.ts'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const pseudo = decodeURIComponent(username)
  const t = await tDesMetadonnees()

  return {
    title: pseudo,
    description: t('meta.profileDesc', { pseudo }),
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
