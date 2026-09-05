/**
 * Titre de l'onglet pour une analyse partagée.
 *
 * `robots: index false` : ces liens se transmettent de la main à la main, ils
 * n'ont pas à se retrouver dans un moteur de recherche — celui qui partage
 * n'a pas demandé à publier.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Une partie analysée',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
