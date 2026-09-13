/**
 * Titre de l'onglet des crédits.
 *
 * La page est devenue un composant client pour se traduire ; elle ne peut donc
 * plus exporter `metadata` elle-même. Ce titre-là reste en français : il est
 * rendu sur le serveur, qui ne connaît pas la langue choisie — voir la note du
 * même genre dans `a-propos/layout.tsx`.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Crédits & licences',
  description:
    'Les logiciels, jeux de données et ressources graphiques libres sur lesquels Le Coup Parfait est construit, avec leurs auteurs et leurs licences.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
