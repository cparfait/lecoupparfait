'use client'

/**
 * Garder l'écran allumé pendant une partie.
 *
 * Un téléphone s'éteint au bout de trente secondes sans être touché. Aux
 * échecs, trente secondes sans toucher l'écran est la situation *normale* :
 * c'est le tour de l'adversaire, on réfléchit, on regarde le plateau. L'écran
 * s'éteignait donc au milieu de la partie, et il fallait le réveiller — parfois
 * le déverrouiller — pour voir le coup qui venait d'être joué, ou pour jouer le
 * sien pendant que la pendule tournait.
 *
 * L'API Screen Wake Lock répond exactement à ce besoin. Deux précautions :
 *
 *  - **elle n'existe pas partout** — Firefox sur Android, les vieux Safari :
 *    on ne fait rien plutôt que d'échouer bruyamment, la partie se joue très
 *    bien avec un écran qui s'éteint ;
 *  - **le verrou est perdu dès que l'onglet passe en arrière-plan**, et le
 *    système ne le rend pas au retour. Sans le reprendre à la main, il ne
 *    tenait que jusqu'au premier changement d'application — c'est-à-dire
 *    jusqu'au premier message reçu.
 *
 * Le verrou est relâché dès que `actif` retombe : une partie finie n'a aucune
 * raison de tenir l'écran allumé, et une batterie vidée après la partie est un
 * bug comme un autre.
 */

import { useEffect } from 'react'

/**
 * L'API, telle qu'elle est vraiment : facultative.
 *
 * Les types du DOM la déclarent obligatoire sur `Navigator` — elle ne l'est
 * pas. Firefox sur Android et les Safari d'avant 16.4 ne l'exposent pas du
 * tout, et lire `navigator.wakeLock.request` y lèverait une exception au
 * premier coup joué.
 */
type VerrouEcran = WakeLockSentinel

/**
 * Empêche l'écran de s'éteindre tant que `actif` est vrai.
 *
 * @param actif vrai pendant une partie en cours, faux dès qu'elle est finie
 */
export function useEcranAllume(actif: boolean): void {
  useEffect(() => {
    if (!actif) return
    if (typeof navigator === 'undefined') return

    const api = navigator.wakeLock as WakeLock | undefined
    if (!api) return

    let verrou: VerrouEcran | null = null
    let abandonne = false

    const demander = async () => {
      // Le système refuse le verrou pour un onglet caché : inutile d'insister,
      // le retour à l'écran repassera par ici.
      if (abandonne || document.visibilityState !== 'visible') return
      try {
        verrou = await api.request('screen')
        if (abandonne) {
          void verrou.release().catch(() => undefined)
          verrou = null
        }
      } catch {
        // Batterie faible, économiseur d'énergie, permission refusée : on
        // laisse l'écran se comporter comme d'habitude, sans rien dire.
      }
    }

    // Reprise du verrou au retour dans l'onglet — voir l'en-tête du fichier.
    const surVisibilite = () => {
      if (document.visibilityState === 'visible' && (verrou === null || verrou.released)) {
        void demander()
      }
    }

    void demander()
    document.addEventListener('visibilitychange', surVisibilite)

    return () => {
      abandonne = true
      document.removeEventListener('visibilitychange', surVisibilite)
      void verrou?.release().catch(() => undefined)
      verrou = null
    }
  }, [actif])
}
