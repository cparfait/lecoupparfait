/**
 * Titre de l'onglet pour études.
 *
 * Une mise en page serveur d'une ligne, et rien d'autre : la page est un
 * composant client, elle ne peut donc pas exporter `metadata` elle-même. Le
 * suffixe « · Le Coup Parfait » est posé par `title.template` de la mise en
 * page racine.
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  /*
    Un objet et non une chaîne : ce dossier a des pages en dessous de lui.

    Un `title` en chaîne consomme le gabarit de la mise en page racine et n'en
    repose aucun — les pages filles se retrouvaient alors sans le suffixe
    « · Le Coup Parfait », leur onglet s'appelant simplement « Contre
    l'ordinateur ». On redonne donc le gabarit à ce niveau.
  */
  title: {
    default: 'Études',
    template: '%s · Le Coup Parfait',
  },
  description: 'Des parcours commentés, à lire et à partager.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
