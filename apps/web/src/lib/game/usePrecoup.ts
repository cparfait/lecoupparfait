'use client'

/**
 * Le pré-coup : jouer pendant le tour de l'adversaire.
 *
 * On pose son coup à l'avance, il part dès que l'adversaire a joué. C'est ce
 * qui rend le blitz jouable : sur une cadence de trois minutes, attendre de
 * voir le coup adverse pour commencer à bouger coûte une demi-seconde par coup,
 * et une partie se perd à la pendule plutôt qu'à l'échiquier.
 *
 * L'échiquier savait déjà l'enregistrer — `onPremove`, l'affichage des deux
 * cases en bleu — et la préférence « Autoriser les pré-coups » existait,
 * **cochée par défaut**. Mais aucun écran ne branchait ces prises : le réglage
 * ne faisait donc rien, nulle part. C'est pire qu'un réglage absent : on le
 * coche, rien ne change, et l'on se met à douter du reste des préférences.
 *
 * Ce crochet tient les trois temps du pré-coup :
 *
 *  1. **On l'enregistre** pendant que ce n'est pas notre tour ;
 *  2. **on le joue** dès que le trait revient — et s'il est devenu illégal
 *     entre-temps, on le jette sans rien dire : c'est le cas ordinaire, pas une
 *     erreur, l'adversaire a simplement joué autre chose que prévu ;
 *  3. **on l'annule** dès que la partie change de nature — fin de partie,
 *     retour dans l'historique, annulation d'un coup.
 *
 * Il ne connaît ni le réseau ni le moteur : il rend un coup à jouer, et c'est
 * la page qui décide comment. C'est ce qui lui permet de servir aussi bien à la
 * partie en direct qu'à celle contre l'ordinateur.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import type { Color, PieceSymbol, Square } from 'chess.js'
import { estUnePromotion } from '@/lib/game/useChessGame.ts'

export interface Precoup {
  from: Square
  to: Square
  promotion?: PieceSymbol
}

export interface UsePrecoupOptions {
  /** Position réelle de la partie. */
  fen: string
  /** Couleur du joueur. `null` quand il regarde. */
  couleur: Color | null
  /** Faux dès que la partie est finie ou qu'on consulte l'historique. */
  actif: boolean
  /** Joue le coup. Rendu à la page, qui sait s'il part au serveur ou au moteur. */
  jouer: (from: Square, to: Square, promotion?: PieceSymbol) => void
}

export interface EtatPrecoup {
  /** Le pré-coup en attente, à passer à l'échiquier pour l'afficher. */
  precoup: Precoup | null
  /** À brancher sur `onPremove` de l'échiquier. */
  enregistrer: (from: Square, to: Square, promotion?: PieceSymbol) => void
  /** Oublie le pré-coup — clic ailleurs, abandon, changement d'avis. */
  annuler: () => void
}

export function usePrecoup({ fen, couleur, actif, jouer }: UsePrecoupOptions): EtatPrecoup {
  const [precoup, setPrecoup] = useState<Precoup | null>(null)

  // La page recrée `jouer` à chaque rendu : on la garde dans une référence pour
  // que l'effet ci-dessous ne se relance pas à chaque fois.
  const jouerRef = useRef(jouer)
  jouerRef.current = jouer

  const annuler = useCallback(() => setPrecoup(null), [])

  const enregistrer = useCallback((from: Square, to: Square, promotion?: PieceSymbol) => {
    setPrecoup({ from, to, promotion })
  }, [])

  /*
    Le départ.

    Deux conditions, et il faut les deux : le trait doit être revenu au joueur,
    et le coup doit être légal *dans la position d'arrivée*. On revalide donc
    plutôt que de faire confiance à l'intention : entre l'enregistrement et
    maintenant, l'adversaire a joué, et il a très bien pu prendre la pièce
    qu'on comptait déplacer.

    Le pré-coup est retiré **avant** d'être joué. Sinon un coup refusé plus loin
    dans la chaîne — le serveur qui n'est pas d'accord, la partie qui se termine
    entre-temps — le laisserait en attente, et il repartirait au tour suivant
    sans que personne ne l'ait demandé.
  */
  useEffect(() => {
    if (!precoup || !actif || !couleur) return

    let board: Chess
    try {
      board = new Chess(fen, { skipValidation: true })
    } catch {
      setPrecoup(null)
      return
    }
    if (board.turn() !== couleur) return

    setPrecoup(null)
    // Un pion qui atteint la dernière rangée sans pièce choisie : on ne
    // promeut pas en dame à sa place. L'échiquier demande la pièce à
    // l'enregistrement, donc ce cas ne vient que d'un appelant qui l'a omise ;
    // le jeter vaut mieux qu'une dame que personne n'a demandée.
    if (estUnePromotion(board, precoup.from, precoup.to) && !precoup.promotion) return
    try {
      board.move({
        from: precoup.from,
        to: precoup.to,
        promotion: precoup.promotion,
      })
    } catch {
      // Devenu illégal : l'adversaire n'a pas joué ce qu'on imaginait. On
      // n'affiche rien — c'est le cas courant du pré-coup, pas un incident.
      return
    }
    jouerRef.current(precoup.from, precoup.to, precoup.promotion)
  }, [fen, precoup, actif, couleur])

  // La partie s'arrête, ou l'on part consulter l'historique : un pré-coup
  // n'aurait plus de tour où se poser.
  useEffect(() => {
    if (!actif) setPrecoup(null)
  }, [actif])

  return { precoup, enregistrer, annuler }
}
