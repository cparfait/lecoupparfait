'use client'

import { useEffect, useState } from 'react'
import type { Color } from 'chess.js'
import type { TimeControl } from '@coupparfait/core'
import { toast } from '@/components/ui/Toast.tsx'
import { annoncerPartieClassee } from '@/lib/game/partieEnCours.ts'
import { useT } from '@/lib/i18n/index.tsx'

/**
 * Annonce la partie classée au serveur, et dit si l'annonce a manqué.
 *
 * Rend `true` quand l'annonce n'est pas passée : la partie ne comptera pas, et
 * la boîte de fin doit pouvoir le rappeler.
 */
export function useAnnonceClassee({
  classee,
  level,
  playerColor,
  timeControl,
}: {
  classee: boolean
  level: number
  playerColor: Color
  timeControl: TimeControl
}): boolean {
  const t = useT()
  /** L'annonce de partie classée n'est pas passée : la partie ne comptera pas. */
  const [annonceManquee, setAnnonceManquee] = useState(false)

  /*
    L'annonce de la partie classée, faite au moment où l'écran de jeu s'ouvre.

    C'est le seul instant où elle a un sens : le résultat est encore inconnu de
    tout le monde, y compris de celui qui va jouer. Le serveur y fige le niveau,
    la cadence et le camp, et refusera de classer une partie qui reviendrait
    avec d'autres — voir `POST /api/parties/classee`.

    Une seule fois, sans dépendances : ni le niveau ni la cadence ne changent en
    cours de partie, et une partie reprise n'est jamais classée.
  */
  useEffect(() => {
    if (!classee) return
    void annoncerPartieClassee({
      botLevel: level,
      playerColor,
      initialTime: timeControl.initial,
      increment: timeControl.increment,
    }).then((faite) => {
      if (faite) return
      /*
        L'annonce n'est pas passée : cette partie ne sera pas classée, et il
        faut le dire **maintenant**. Découvrir à la fin qu'une partie de vingt
        minutes ne compte pas, sans avoir rien fait de mal, est le genre de
        silence qui passe pour une panne — et c'en est une.
      */
      setAnnonceManquee(true)
      toast.error(t('computer.ratedAnnounceFailed'), t('computer.ratedAnnounceFailedHint'))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return annonceManquee
}
