'use client'

import { useEffect } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { Chess, Color } from 'chess.js'
import {
  flaggedColor,
  remainingAt,
  resultatAuDrapeau,
  stopClock,
  type ClockState,
  type GameResult,
  type GameStatus,
} from '@coupparfait/core'
import type { useQuotidien } from '@/lib/daily/useQuotidien.ts'
import { oublierPartieEnCours } from '@/lib/game/partieEnCours.ts'
import { playResultSound } from '@/lib/sound.ts'
import { recordBotGame } from './progression.ts'
import type { AideDuMoteur } from './useAideUtilisee.ts'

/** L'issue d'une partie que le moteur de jeu ignore : abandon, drapeau. */
export type Issue = { status: GameStatus; result: GameResult } | null

/**
 * La fin au temps de la partie contre l'ordinateur.
 *
 * Tout ce que l'écran de jeu fait quand un drapeau tombe : arrêter la
 * pendule, poser l'issue, sonner, compter la partie. Les valeurs sont celles
 * de l'écran, passées telles quelles.
 */
export function useChuteDuDrapeau({
  clock,
  setClock,
  timed,
  isGameOver,
  outcome,
  setOutcome,
  playerColor,
  level,
  startFen,
  chess,
  marquer,
  aideRef,
}: {
  clock: ClockState
  setClock: Dispatch<SetStateAction<ClockState>>
  /** La cadence a-t-elle une pendule ? */
  timed: boolean
  /** Fin reconnue par le moteur de jeu : mat, pat, nulle. */
  isGameOver: boolean
  outcome: Issue
  setOutcome: Dispatch<SetStateAction<Issue>>
  playerColor: Color
  level: number
  /** Position composée dans l'éditeur, `null` pour une partie ordinaire. */
  startFen: string | null
  chess: Chess
  marquer: ReturnType<typeof useQuotidien>['marquer']
  aideRef: MutableRefObject<AideDuMoteur | null>
}): void {
  /*
    ── Chute du drapeau ─────────────────────────────────────────────────────

    Un rendez-vous, pas un sondage.

    Cet effet partageait un `setInterval` à 100 ms avec l'affichage de la
    pendule : dix fois par seconde, tout l'écran se re-rendait pour poser une
    question dont la réponse est « non » pendant plusieurs minutes d'affilée.
    L'affichage vit désormais dans `PenduleVive`, et il ne reste ici que la
    chute — qui a une **date connue d'avance**, puisque la pendule est tenue en
    horodatages absolus.

    On arme donc un unique `setTimeout` sur cette date. Il se réarme au coup,
    parce que `clock` change au coup. Une centaine de réveils par minute
    remplacée par un par coup.
  */
  useEffect(() => {
    if (!timed || isGameOver || outcome) return
    if (clock.running === null) return

    const echeance = remainingAt(clock, Date.now())[clock.running]

    const tomber = () => {
      const now = Date.now()
      const flagged = flaggedColor(clock, now)
      // Le garde n'est pas superflu : un onglet mis en veille rend la main en
      // retard, et un navigateur peut réveiller un minuteur un cheveu trop tôt.
      if (!flagged) return
      setClock((current) => stopClock(current, now))
      // Article 6.9 : celui dont le drapeau tombe perd, sauf si l'adversaire
      // ne pouvait plus mater — c'est alors nulle. Le cœur tranche, comme
      // pour le serveur et la partie locale.
      const result = resultatAuDrapeau(chess, flagged)
      setOutcome({ status: 'timeout', result })
      const nulle = result === '1/2-1/2'
      playResultSound(nulle ? 'draw' : flagged === playerColor ? 'loss' : 'win')
      // Gagner au temps compte comme une victoire : c'est une partie gagnée.
      // Sauf depuis une position composée — même raison que dans le
      // `onGameOver` de l'écran de jeu.
      if (!startFen) recordBotGame(level, !nulle && flagged !== playerColor)
      // Une partie jouée jusqu'à la chute du drapeau est une partie menée au
      // bout, comme un mat : elle compte pour la quête du jour. L'abandon,
      // lui, ne compte pas — c'est justement une partie qu'on n'a pas finie.
      // Et une partie jouée avec une aide du moteur ne compte pas non plus.
      if (aideRef.current === null) {
        marquer('partie')
        if (!nulle && flagged !== playerColor) marquer('victoire')
      }
      // La partie est finie : sans cet oubli, l'écran de départ proposait de
      // la reprendre, pendule à zéro.
      oublierPartieEnCours()
    }

    // `+50` : on se réveille juste après l'échéance, jamais juste avant, sans
    // quoi `flaggedColor` répondrait « personne » et la partie continuerait
    // sans que plus rien ne la surveille.
    const minuteur = setTimeout(tomber, Math.max(0, echeance) + 50)
    return () => clearTimeout(minuteur)
  }, [
    clock,
    timed,
    isGameOver,
    outcome,
    playerColor,
    level,
    startFen,
    chess,
    marquer,
    aideRef,
    setClock,
    setOutcome,
  ])
}
