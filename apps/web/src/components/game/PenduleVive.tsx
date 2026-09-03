'use client'

/**
 * Une pendule qui bat toute seule.
 *
 * **Ce qu'elle remplace.** L'écran de jeu tenait le temps affiché dans son
 * propre état et le rafraîchissait par un `setInterval` à 100 ms. Dix fois par
 * seconde, `GameScreen` se rendait donc en entier — l'échiquier, la liste des
 * coups, les barres de joueur, le panneau du coach —, alors que seuls deux
 * nombres avaient changé. Et comme l'effet dépendait de `clock`, il était
 * détruit et recréé à chaque coup.
 *
 * Ici, le minuteur vit **dans** le composant qui affiche l'heure. Ce qui se
 * re-rend dix fois par seconde, c'est une `div` de dix caractères.
 *
 * **Le rythme suit ce qui se voit.** `formatClock` n'affiche les dixièmes que
 * sous dix secondes : au-dessus, rafraîchir plus d'une fois par seconde ne
 * change rien à l'écran. On bat donc à la seconde, puis à 100 ms sous le seuil.
 *
 * La pendule reçue est **figée** : un `ClockState` porte des horodatages
 * absolus, pas un compte à rebours. Elle ne change qu'au coup, et c'est
 * exactement ce qu'on veut pour une dépendance d'effet.
 */

import { useEffect, useRef, useState } from 'react'
import type { Color } from 'chess.js'
import { formatClock, remainingAt, type ClockState } from '@coupparfait/core'

/** Sous ce seuil, `formatClock` affiche les dixièmes : il faut battre plus vite. */
const SEUIL_DIXIEMES_MS = 10_000

export interface PenduleViveProps {
  /** État figé de la pendule. Ne change qu'au coup. */
  clock: ClockState
  /** Camp dont on affiche le temps. */
  color: Color
  /** Rendu de la valeur. La mise en forme reste à l'appelant. */
  children: (ms: number, texte: string) => React.ReactNode
}

export function PenduleVive({ clock, color, children }: PenduleViveProps) {
  const [ms, setMs] = useState(() => remainingAt(clock, Date.now())[color])

  // Le rendu ne lit jamais l'heure : il lit `ms`. Sans cette référence, le
  // minuteur devrait dépendre de `ms` et se reprogrammer à chaque battement.
  const msRef = useRef(ms)
  msRef.current = ms

  useEffect(() => {
    // Remise à l'heure immédiate : un coup vient d'être joué, ou l'on remonte
    // dans la liste. Attendre le prochain battement afficherait une seconde le
    // temps d'avant.
    setMs(remainingAt(clock, Date.now())[color])

    // La pendule à l'arrêt n'a rien à décompter : pas de minuteur du tout.
    // C'est le cas du camp qui n'a pas le trait, et de toute partie finie.
    if (clock.running !== color) return

    let minuteur: ReturnType<typeof setTimeout>

    const battre = () => {
      const restant = remainingAt(clock, Date.now())[color]
      setMs(restant)
      // Le rythme se choisit à chaque battement, pas une fois pour toutes :
      // c'est ainsi qu'on passe de la seconde au dixième en franchissant le
      // seuil, sans avoir à surveiller quoi que ce soit.
      minuteur = setTimeout(battre, restant > SEUIL_DIXIEMES_MS ? 1000 : 100)
    }

    minuteur = setTimeout(battre, msRef.current > SEUIL_DIXIEMES_MS ? 1000 : 100)
    return () => clearTimeout(minuteur)
  }, [clock, color])

  return children(ms, formatClock(ms))
}
