/**
 * Titre de l'onglet pour ouvertures.
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
    lui — les fiches d'enjeux. Un `title` en chaîne consomme le gabarit de la
    mise en page racine et n'en repose aucun, si bien que la page fille se
    retrouverait sans le suffixe « · Le Coup Parfait », son onglet s'appelant
    simplement « Les enjeux des ouvertures ». Même correctif que dans
    `/apprendre`, pour la même raison.
  */
  title: {
    default: 'Ouvertures',
    template: '%s · Le Coup Parfait',
  },
  description: 'L’explorateur : 3 970 ouvertures répertoriées.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
