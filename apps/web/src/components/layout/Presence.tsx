'use client'

/**
 * Dire au serveur qu'on est là — et cesser de le dire dès qu'on ne l'est plus.
 *
 * Ce composant ne rend rien. Il envoie un battement à `/api/presence` tant que
 * l'onglet est **visible**, et se tait sinon. C'est toute la correction : la
 * présence se mesurait jusqu'ici à l'existence d'une session, qui dure trente
 * jours et que personne ne ferme — surtout pas depuis une application installée
 * sur l'écran d'accueil, où le bouton « se déconnecter » n'est jamais atteint.
 * Tout le monde était donc affiché connecté, tout le temps.
 *
 * **Visible, pas seulement ouvert.** Une application installée reste chargée
 * quand on la met en arrière-plan pour répondre au téléphone ; son minuteur
 * continue même de battre, ralenti. Se fier à « la page tourne » recréerait
 * exactement le défaut qu'on corrige. `visibilityState` est la seule chose dont
 * le navigateur puisse témoigner : elle passe à `hidden` quand on change
 * d'onglet, quand on verrouille l'écran, quand on renvoie l'application au
 * fond. Le battement s'arrête alors, la fenêtre de cinq minutes s'écoule, et la
 * pastille s'éteint d'elle-même.
 *
 * **Un battement par minute**, pour une fenêtre de cinq : quatre battements
 * peuvent se perdre — un tunnel, un réseau qui change de main — sans que la
 * pastille clignote. Côté serveur, l'écriture est de toute façon limitée à une
 * par minute et par compte, ce qui borne aussi le coût des onglets multiples.
 *
 * Rien n'est envoyé pour un visiteur sans compte : il n'y a pas de présence à
 * enregistrer, et l'on ne réveille pas le serveur pour rien.
 */

import { useEffect } from 'react'
import { useIdentite } from '@/lib/auth/useIdentite.ts'

/** Rythme du battement. Cinq fois plus court que la fenêtre de présence. */
const BATTEMENT_MS = 60_000

export function Presence() {
  const identite = useIdentite()
  const connecte = identite != null

  useEffect(() => {
    if (!connecte) return

    let vivant = true
    const battre = () => {
      if (!vivant || document.visibilityState !== 'visible') return
      // `keepalive` : le battement part même si la page se ferme dans la
      // seconde, et ne retient rien au déchargement.
      void fetch('/api/presence', { method: 'POST', keepalive: true }).catch(() => {
        // Hors ligne, serveur muet : le prochain tour réessaiera.
      })
    }

    battre()
    const minuteur = setInterval(battre, BATTEMENT_MS)
    // Au retour au premier plan, on ne fait pas attendre une minute : la
    // pastille est peut-être déjà éteinte, et c'est justement l'instant où
    // quelqu'un revient jouer.
    document.addEventListener('visibilitychange', battre)

    return () => {
      vivant = false
      clearInterval(minuteur)
      document.removeEventListener('visibilitychange', battre)
    }
  }, [connecte])

  return null
}
