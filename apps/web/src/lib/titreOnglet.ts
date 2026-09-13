'use client'

/**
 * Nommer l'onglet depuis une page qui ne connaît son sujet qu'après coup.
 *
 * Les métadonnées de Next se calculent sur le serveur, avant que la page ait
 * rien affiché. C'est le bon endroit quand le titre se déduit de l'adresse —
 * une leçon, un profil. Ça ne l'est pas quand il faut d'abord aller chercher la
 * chose : le titre d'une étude vit en base, derrière une route qui vérifie qui
 * la demande, et le calculer sur le serveur reviendrait à interroger la base à
 * chaque ouverture d'onglet, pour une chaîne de caractères.
 *
 * La page, elle, a déjà les données à l'écran : elle nomme l'onglet quand elle
 * les reçoit. Un onglet qui s'appelle « Étude » pendant deux cents millisecondes
 * puis prend son vrai nom vaut mieux qu'un onglet qui s'appelle « Étude » pour
 * toujours.
 *
 * On restaure le titre précédent en partant : sans cela, quitter une étude pour
 * une page dont la mise en page ne pose pas de titre laisserait celui de
 * l'étude en place.
 *
 * Ce fichier a un temps porté un second composant, `TitreTraduit`, qui nommait
 * l'onglet de toutes les autres pages depuis la table de navigation. C'était un
 * détour : il existait parce que les métadonnées étaient écrites en français, et
 * il devenait faux dès qu'une page en dessous avait son propre titre — une leçon
 * s'appelait « Apprendre ». Les métadonnées étant désormais traduites à la
 * source, il n'a plus lieu d'être.
 */

import { useEffect } from 'react'

/** Le même suffixe que `title.template` de la mise en page racine. */
const SUFFIXE = ' · Le Coup Parfait'

export function useTitreDeLOnglet(titre: string | null | undefined): void {
  useEffect(() => {
    if (!titre) return
    const precedent = document.title
    document.title = `${titre}${SUFFIXE}`
    return () => {
      document.title = precedent
    }
  }, [titre])
}
