'use client'

/**
 * Une requête JSON qui ne survit pas au composant.
 *
 * **Ce qu'elle répare.** Deux fichiers seulement portaient un `AbortController`,
 * un seul gardait un drapeau `cancelled` ; partout ailleurs, un effet lançait
 * un `fetch` et posait le résultat dans l'état sans se demander si le
 * composant existait encore. Deux conséquences, dont la seconde est la pire :
 *
 *  - poser un état sur un composant démonté, ce que React signale en console ;
 *  - **afficher une réponse arrivée après une plus récente.** Quand l'adresse
 *    change vite — on parcourt trois profils de suite —, la réponse la plus
 *    lente écrase la plus fraîche, et l'écran montre les données de quelqu'un
 *    d'autre. Rien n'échoue, rien ne s'affiche en rouge : c'est simplement
 *    faux.
 *
 * **Pas de bibliothèque.** Ce que fait le projet tient en quarante lignes : une
 * requête, trois états, un abandon. SWR ou TanStack Query apporteraient un
 * cache, une revalidation et une fenêtre de configuration dont rien ici n'a
 * besoin, plus une dépendance de plus à suivre.
 */

import { useCallback, useEffect, useState } from 'react'

export interface EtatFetch<T> {
  data: T | null
  erreur: string | null
  chargement: boolean
  /** Relance la requête. Utile après une action qui change ce qu'on lit. */
  relire: () => void
}

/**
 * @param url      Adresse à lire. `null` n'interroge rien — c'est ainsi qu'on
 *                 attend de savoir quoi demander, sans hook conditionnel.
 * @param options  Passées à `fetch`. **À garder stables** : un objet neuf à
 *                 chaque rendu relancerait la requête en boucle. Le plus simple
 *                 est de le définir hors du composant.
 */
export function useFetchJson<T>(url: string | null, options?: RequestInit): EtatFetch<T> {
  const [data, setData] = useState<T | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [chargement, setChargement] = useState(url !== null)
  const [tour, setTour] = useState(0)

  const relire = useCallback(() => setTour((n) => n + 1), [])

  useEffect(() => {
    if (!url) {
      setData(null)
      setErreur(null)
      setChargement(false)
      return
    }

    const controleur = new AbortController()
    setChargement(true)
    setErreur(null)

    void fetch(url, { ...options, signal: controleur.signal })
      .then(async (reponse) => {
        if (!reponse.ok) throw new Error(String(reponse.status))
        return (await reponse.json()) as T
      })
      .then((recu) => {
        setData(recu)
        setChargement(false)
      })
      .catch((cause: unknown) => {
        // L'abandon n'est pas une erreur : il vient de nous, et le composant
        // qui l'aurait affichée n'est de toute façon plus là.
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setErreur(cause instanceof Error ? cause.message : 'indisponible')
        setChargement(false)
      })

    // Au démontage **et** au changement d'adresse : c'est la seconde partie
    // qui règle le problème des réponses qui se doublent.
    return () => controleur.abort()
    // `options` est volontairement hors des dépendances : un littéral d'objet
    // y relancerait la requête à chaque rendu. Voir la remarque plus haut.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, tour])

  return { data, erreur, chargement, relire }
}
