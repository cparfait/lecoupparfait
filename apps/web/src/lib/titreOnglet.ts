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
 * ── Et pour toutes les autres pages ─────────────────────────────────────────
 *
 * `TitreTraduit`, plus bas, nomme l'onglet de toutes les pages qui n'ont rien de
 * particulier à dire. Les métadonnées de `layout.tsx` s'en chargeaient déjà, mais
 * en français seulement : elles sont produites sur le serveur, et le faire
 * dépendre de la langue du visiteur obligerait à rendre dynamiquement
 * quarante-cinq routes aujourd'hui statiques — pour un texte que les moteurs de
 * recherche ont raison de recevoir dans la langue de référence du projet. Le nom
 * de l'onglet, lui, se voit, et il n'a aucune raison de rester en français quand
 * l'écran ne l'est pas.
 *
 * Les deux cohabitent par l'ordre des effets de React, qui vont de l'enfant vers
 * le parent : la page revendique son titre avant que la coque ne pose le sien, et
 * la revendication est consultée avant d'écrire. Une page qui trouve son titre
 * plus tard — une étude dont le nom arrive de la base — gagne aussi, puisque son
 * effet se rejoue après.
 */

'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { cleDuTitre } from './navigation.ts'
import { useT } from './i18n/index.tsx'

/** Le même suffixe que `title.template` de la mise en page racine. */
const SUFFIXE = ' · Le Coup Parfait'

/** Le titre qu'une page a revendiqué, et pour quel chemin. */
let revendication: { chemin: string; titre: string } | null = null

export function useTitreDeLOnglet(titre: string | null | undefined): void {
  const chemin = usePathname()
  useEffect(() => {
    if (!titre) return
    const precedent = document.title
    revendication = { chemin, titre }
    document.title = `${titre}${SUFFIXE}`
    return () => {
      if (revendication?.chemin === chemin) revendication = null
      document.title = precedent
    }
  }, [titre, chemin])
}

/**
 * Le titre des pages ordinaires, traduit.
 *
 * Rien à l'écran : monté une fois dans la coque, il se contente de nommer
 * l'onglet à chaque changement de page. Sans clé pour le chemin courant — une
 * page hors navigation, un profil, un écran de connexion — il ne touche à rien
 * et laisse la métadonnée du serveur en place.
 */
export function TitreTraduit(): null {
  const t = useT()
  const chemin = usePathname()

  useEffect(() => {
    const cle = cleDuTitre(chemin)
    if (!cle) return
    const voulu = `${t(cle)}${SUFFIXE}`

    const poser = () => {
      // La page a mieux à dire : on ne lui passe pas devant.
      if (revendication?.chemin === chemin) return
      if (document.title !== voulu) document.title = voulu
    }
    poser()

    /*
      Et on le repose si Next le réécrit.

      Les métadonnées de la route arrivent en flux, donc après le rendu : sur une
      navigation interne, Next remplace le `<title>` une fraction de seconde
      après que notre effet a posé le sien, et l'onglet repassait au français
      sans qu'on voie pourquoi. La surveillance s'arrête d'elle-même — reposer un
      titre déjà juste ne déclenche aucune mutation.
    */
    const observateur = new MutationObserver(poser)
    observateur.observe(document.head, { childList: true, subtree: true, characterData: true })
    return () => observateur.disconnect()
  }, [chemin, t])

  return null
}
