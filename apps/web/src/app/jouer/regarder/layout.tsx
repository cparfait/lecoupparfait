/**
 * Titre de l'onglet pour regarder.
 *
 * Une mise en page serveur d'une ligne, et rien d'autre : la page est un
 * composant client, elle ne peut donc pas exporter `metadata` elle-même. Le
 * suffixe « · Le Coup Parfait » est posé par `title.template` de la mise en
 * page racine.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  /*
    Un objet et non une chaîne : ce dossier a maintenant une page en dessous de
    lui — la partie d'un ami, suivie en lecture seule. Un `title` en chaîne
    consomme le gabarit de la mise en page racine sans en reposer aucun, et
    l'onglet de la page fille perdrait le suffixe « · Le Coup Parfait ».
  */
  title: {
    default: 'Regarder une partie',
    template: '%s · Le Coup Parfait',
  },
  description: 'Les parties en cours sur cette instance.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
