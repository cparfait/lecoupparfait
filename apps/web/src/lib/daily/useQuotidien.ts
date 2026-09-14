'use client'

/**
 * Accès à la journée depuis l'interface.
 *
 * Deux usages, et c'est tout : afficher où l'on en est, et signaler qu'on
 * vient de faire quelque chose. Les pages qui marquent une quête n'ont pas à
 * savoir comment la série se calcule ni où l'état est rangé.
 *
 * L'état est **partagé** entre tous les appelants (voir `quotidien.ts`) :
 * résoudre le défi du jour met à jour la carte de l'accueil et la pastille de
 * série de l'en-tête dans le même rendu.
 *
 * Les félicitations passent par un bandeau, **jamais par une fenêtre**. Une
 * modale par-dessus l'échiquier pour annoncer « première partie jouée » coupe
 * exactement ce qu'elle prétend récompenser.
 */

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { toast } from '@/components/ui/Toast.tsx'
import { useIdentite } from '@/lib/auth/useIdentite.ts'
import { useT } from '@/lib/i18n/index.tsx'
import {
  avancerQuete,
  definirCompte,
  etatDuJour,
  instantane,
  reprendreDepuisLeServeur,
  souscrire,
  xpDuJour,
  type EtatQuotidien,
  type QueteId,
} from './quotidien.ts'

export interface JourneeCourante {
  etat: EtatQuotidien | null
  xp: number
  /** Enregistre une action. Sans effet si la quête est déjà terminée. */
  marquer: (id: QueteId, pas?: number) => void
}

/** Le rendu serveur ne connaît pas le stockage local : rien à afficher. */
const instantaneServeur = () => null

export function useQuotidien(): JourneeCourante {
  const etat = useSyncExternalStore(souscrire, instantane, instantaneServeur)
  const identite = useIdentite()
  const t = useT()
  /*
    Le pseudo, et non l'objet.

    `useIdentite` reconstruit son objet à chaque navigation — c'est ainsi
    qu'il détecte une connexion. S'en servir comme dépendance rejouerait tout
    l'effet à chaque page, donc une requête `/api/quotidien` par page visitée,
    pour une réponse qui ne change pas. On ne réagit qu'à ce qui compte ici :
    qui est connecté.
  */
  const pseudo = identite === undefined ? undefined : (identite?.username ?? null)

  useEffect(() => {
    // Première lecture après l'hydratation : la faire pendant le rendu ferait
    // diverger l'HTML envoyé par le serveur et celui que React reconstruit.
    etatDuJour()
  }, [])

  useEffect(() => {
    // `undefined` : on ne sait pas encore qui est là. Trancher maintenant
    // afficherait la série d'un anonyme à quelqu'un de connecté, le temps
    // d'une requête — exactement le clignotement que `useIdentite` existe pour
    // éviter. On garde donc ce qui est déjà à l'écran.
    if (pseudo === undefined) return

    // La journée appartient à un compte, et pas au navigateur : changer de
    // compte change de journée, série comprise.
    definirCompte(pseudo)

    // Puis on complète avec ce que le serveur sait, s'il sait quelque chose :
    // la série peut venir d'un autre appareil.
    void reprendreDepuisLeServeur()
  }, [pseudo])

  const marquer = useCallback(
    (id: QueteId, pas = 1) => {
      const resultat = avancerQuete(id, pas)

      if (resultat.queteTerminee) {
        toast.success(
          `${t(resultat.queteTerminee.label)} ✓`,
          resultat.serieAugmentee
            ? `+${resultat.queteTerminee.xp} points · série de ${resultat.etat.serie} jour${resultat.etat.serie > 1 ? 's' : ''}`
            : `+${resultat.queteTerminee.xp} points`,
        )
      }
    },
    [t],
  )

  return { etat, xp: etat ? xpDuJour(etat) : 0, marquer }
}
