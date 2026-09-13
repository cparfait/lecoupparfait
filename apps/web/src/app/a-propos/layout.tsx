/**
 * Titre de l'onglet de la page « À propos ».
 *
 * Une mise en page serveur d'une ligne, et rien d'autre : la page est devenue
 * un composant client — elle lit le dictionnaire pour s'afficher dans la
 * langue choisie — et ne peut donc plus exporter `metadata` elle-même.
 *
 * Ce titre-là reste en français, et ce n'est pas un oubli : il est rendu sur
 * le serveur, qui ne connaît pas la langue choisie — c'est une préférence de
 * navigateur. Il s'adresse donc au moteur de recherche, dans la langue de
 * référence du projet.
 */

import type { Metadata } from 'next'
import { metadonnees } from '@/lib/i18n/metadonnees.ts'

export async function generateMetadata(): Promise<Metadata> {
  return metadonnees('meta.about', { description: 'meta.aboutDesc' })
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
