'use client'

/**
 * Une requête média, lue en JavaScript.
 *
 * À réserver aux cas où le CSS ne suffit pas : quand un composant doit être
 * rendu **une seule fois** à deux endroits possibles de la page. Les flèches
 * de navigation d'une partie écoutent le clavier ; rendues deux fois — une
 * copie masquée par `lg:hidden`, l'autre par `max-lg:hidden` —, elles
 * avanceraient de deux coups par pression.
 *
 * Vaut `false` avant montage : le serveur ne connaît pas l'écran, et un rendu
 * qui en dépend doit choisir la disposition la plus sûre — celle qui empile.
 */

import { useEffect, useState } from 'react'

export function useMediaQuery(requete: string): boolean {
  const [correspond, setCorrespond] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(requete)
    const sync = () => setCorrespond(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [requete])

  return correspond
}

/**
 * Le seuil `lg` de Tailwind, celui où les écrans de partie passent en deux
 * colonnes — plateau à gauche, coups et actions à droite.
 */
export function useGrandEcran(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}
