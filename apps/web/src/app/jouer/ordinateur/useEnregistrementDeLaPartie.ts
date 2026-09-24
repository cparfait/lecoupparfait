'use client'

/**
 * Ce que la partie contre l'ordinateur écrit ailleurs qu'à l'écran : la
 * partie en cours après chaque coup, puis la partie finie — historique,
 * carrière, tournoi, classement.
 */

import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { Color } from 'chess.js'
import {
  remainingAt,
  type BotPersonality,
  type Chapitre,
  type ClockState,
  type TimeControl,
} from '@coupparfait/core'
import { deposerGains, signaler as signalerCarriere } from '@/lib/carriere/useCarriere.ts'
import { archiverPartie, enregistrerPartieEnCours } from '@/lib/game/partieEnCours.ts'
import { deposerResultat } from '@/lib/game/tournoiSolo.ts'
import type { GameState } from '@/lib/game/useChessGame.ts'
import { useT } from '@/lib/i18n/index.tsx'
import { tCoeur } from '@/lib/i18n/resoudre.ts'
import type { AideDuMoteur } from './useAideUtilisee.ts'
import type { Issue } from './useChuteDuDrapeau.ts'

/**
 * Sauvegarde de la partie en cours, après chaque coup.
 *
 * Déclenchée sur le nombre de demi-coups et non sur le tableau lui-même :
 * `state.moves` est une nouvelle référence à chaque rendu, et l'effet
 * partirait à chaque battement de pendule.
 *
 * Sans compte, l'appel n'écrit rien et ne dit rien — c'est voulu, la
 * plateforme s'utilise sans s'inscrire.
 */
export function useSauvegardeEnCours({
  gameOver,
  moves,
  level,
  playerColor,
  timeControlId,
  human,
  timed,
  clock,
}: {
  gameOver: boolean
  moves: GameState['moves']
  level: number
  playerColor: Color
  timeControlId: string
  human: boolean
  timed: boolean
  clock: ClockState
}): void {
  const nombreDeCoups = moves.length
  useEffect(() => {
    if (gameOver || nombreDeCoups === 0) return
    enregistrerPartieEnCours(
      moves.map((coup) => coup.san),
      {
        level,
        playerColor,
        timeControlId,
        human,
        clock: timed ? remainingAt(clock, Date.now()) : null,
      },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombreDeCoups, gameOver])
}

/**
 * Archivage de la partie finie.
 *
 * Un effet plutôt que le rappel `onGameOver` : celui-ci se déclenche au fond
 * du moteur de jeu, avant que l'ouverture identifiée et la pendule n'aient
 * été recalculées pour ce rendu. Ici, tout est à jour.
 *
 * Le garde n'est pas décoratif. Le mode strict de React rejoue les effets
 * après les avoir défaits, et l'écran de fin peut se rendre plusieurs fois :
 * sans lui, la même partie serait écrite deux ou trois fois dans
 * l'historique — avec un identifiant différent à chaque fois, donc sans
 * moyen de s'en apercevoir.
 *
 * Rend ce que le serveur a répondu, pour la boîte de fin.
 */
export function useArchivageDeFin({
  gameOver,
  outcome,
  state,
  duel,
  tournoi,
  classee,
  aideUtilisee,
  aideRef,
  playerColor,
  personality,
  level,
  timeControl,
  opening,
}: {
  gameOver: boolean
  outcome: Issue
  state: Pick<GameState, 'moves' | 'result' | 'status'>
  duel: Chapitre | null
  tournoi: boolean
  classee: boolean
  aideUtilisee: AideDuMoteur | null
  aideRef: RefObject<AideDuMoteur | null>
  playerColor: Color
  personality: BotPersonality
  level: number
  timeControl: TimeControl
  opening: { eco: string; name: string } | null
}): { variationClassement: number | null; refusClassement: string | null } {
  const t = useT()
  /** Variation de classement d'une partie classée, une fois le serveur consulté. */
  const [variationClassement, setVariationClassement] = useState<number | null>(null)
  /** Pourquoi le serveur n'a pas classé la partie, une fois qu'elle est finie. */
  const [refusClassement, setRefusClassement] = useState<string | null>(null)

  const archivee = useRef(false)
  useEffect(() => {
    if (!gameOver || archivee.current) return
    const issue = outcome?.result ?? state.result
    if (issue !== '1-0' && issue !== '0-1' && issue !== '1/2-1/2') return
    if (state.moves.length === 0) return
    archivee.current = true

    /*
      Le duel de carrière annonce son issue.
      Gagnée ou perdue : une défaite alimente la série qui déclenche le coup de
      main, et c'est précisément ce qu'il ne faut pas perdre. On dépose ensuite
      les gains pour que la carte les fête au retour.
    */
    if (duel && aideRef.current === null) {
      void signalerCarriere({
        type: 'partie',
        gagnee: issue === (playerColor === 'w' ? '1-0' : '0-1'),
        coups: state.moves.length,
      }).then((gains) => deposerGains(gains, duel.titre))
    }

    /*
      Le tournoi attend son résultat : on le dépose, le tableau le déroulera
      au retour. Le sens est celui des Blancs, comme partout ailleurs.

      Sauf si le moteur a aidé. Le tournoi masque déjà ses boutons — voir
      `sansAide` —, ce garde-fou couvre donc un cas qui ne devrait pas se
      produire ; c'est exactement pourquoi il est écrit ici plutôt que laissé à
      une condition d'affichage. Ne rien déposer laisse la ronde à jouer, ce
      que `deposerResultat` documente déjà comme sa panne bénigne.
    */
    if (tournoi && aideRef.current === null) deposerResultat(issue)

    void archiverPartie({
      mode: 'computer',
      /*
        Une aide du moteur retire la partie du classement.

        C'est la règle, et elle est ici plutôt que dans une condition
        d'affichage : celui qui a vu le meilleur coup, ou rejoué un coup en
        sachant ce qu'il donnait, n'a pas joué la même partie que son
        classement prétend mesurer. Ni pour gagner des points, ni pour en faire
        perdre à l'adversaire.
      */
      classee: classee && aideUtilisee === null,
      moves: state.moves.map((coup) => coup.san),
      result: issue,
      status: outcome?.status ?? state.status,
      playerColor,
      opponentName: tCoeur(t, personality.name),
      botLevel: level,
      initialTime: timeControl.initial,
      increment: timeControl.increment,
      eco: opening?.eco ?? null,
      opening: opening?.name ?? null,
    }).then(({ classement, raison }) => {
      // Rien à annoncer sur une partie d'entraînement : le serveur ne renvoie
      // de variation que pour une partie classée, et de raison que si l'on en
      // attendait une.
      if (classement) setVariationClassement(classement.variation)
      if (raison) setRefusClassement(raison)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver])

  return { variationClassement, refusClassement }
}
