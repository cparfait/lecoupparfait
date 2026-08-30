'use client'

/**
 * L'échiquier en bois branché sur la partie.
 *
 * Ce crochet est le pendant de `useBotPlayer` : une source de coups extérieure
 * à l'écran. Il tient trois choses que l'on ne peut pas confier au pilote :
 *
 *  - **l'anti-rebond** — une pièce glissée traverse des cases, et chacune
 *    produit une photo ; on n'agit que sur une image stable ;
 *  - **l'orientation** — poser la carte dans l'autre sens est un geste normal,
 *    on le détecte au lieu de l'interdire ;
 *  - **les LEDs** — elles servent à dire ce qui manque, pas à décorer : coup
 *    de l'adversaire à reproduire, ou cases en désaccord.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Chess, PieceSymbol, Square } from 'chess.js'
import {
  detectFlip,
  matchSnapshot,
  occupancyFromFen,
  type BoardMatch,
} from './matcher.ts'
import { rotateOccupancy, type BoardDriver, type Occupancy, type PhysicalBoard } from './types.ts'
import { isUserCancellation } from './webapis.ts'

export type BoardStatus =
  | 'idle'
  | 'connecting'
  /** La carte et la partie disent la même chose. */
  | 'ready'
  /** Des pièces sont levées : on attend qu'elles se posent. */
  | 'lifted'
  /** Le plateau ne correspond pas à la partie. */
  | 'mismatch'
  | 'error'

export interface UsePhysicalBoardOptions {
  /** Position **réelle** de la partie. */
  chess: Chess
  /** FEN courant : sert à réévaluer quand la partie avance sans le plateau. */
  fen: string
  /** Faux quand on navigue dans l'historique : on ne joue rien. */
  isLive: boolean
  play: (from: Square, to: Square, promotion?: PieceSymbol) => unknown
  /** Dernier coup de la partie, à montrer sur les LEDs. */
  lastMove: { from: string; to: string } | null
  /** Coupe l'écoute sans débrancher la carte. */
  enabled?: boolean
  /** Anti-rebond, en millisecondes. */
  debounceMs?: number
}

export interface PhysicalBoardState {
  board: PhysicalBoard | null
  status: BoardStatus
  /** Message prêt à afficher, ou `null` quand tout va bien. */
  message: string | null
  /** Cases en désaccord, déjà signalées sur les LEDs. */
  wrongSquares: string[]
  /** Promotion dont la carte ne peut pas deviner la pièce. */
  pendingPromotion: { from: string; to: string } | null
  flipped: boolean
  connect: (driver: BoardDriver) => Promise<void>
  disconnect: () => Promise<void>
  choosePromotion: (piece: PieceSymbol) => void
}

export function usePhysicalBoard(options: UsePhysicalBoardOptions): PhysicalBoardState {
  const { chess, fen, isLive, play, lastMove, enabled = true, debounceMs = 250 } = options

  const [board, setBoard] = useState<PhysicalBoard | null>(null)
  const [status, setStatus] = useState<BoardStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [wrongSquares, setWrongSquares] = useState<string[]>([])
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null)
  const [flipped, setFlipped] = useState(false)

  // Les événements de la carte arrivent hors du cycle de rendu : tout ce que
  // la boucle d'évaluation consulte doit vivre dans une ref.
  const snapshotRef = useRef<Occupancy | null>(null)
  const flippedRef = useRef(false)
  const flipKnownRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const boardRef = useRef<PhysicalBoard | null>(null)
  const lightsRef = useRef<string>('')

  const playRef = useRef(play)
  playRef.current = play
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const liveRef = useRef(isLive)
  liveRef.current = isLive
  const lastMoveRef = useRef(lastMove)
  lastMoveRef.current = lastMove

  /** N'écrit sur les LEDs que si l'allumage change vraiment. */
  const showLights = useCallback((squares: string[]) => {
    const key = squares.join(',')
    if (key === lightsRef.current) return
    lightsRef.current = key
    boardRef.current?.setLights(squares)
  }, [])

  const evaluate = useCallback(() => {
    const current = boardRef.current
    const snapshot = snapshotRef.current
    if (!current || !snapshot || !enabledRef.current) return

    const expected = occupancyFromFen(chess.fen())

    // Orientation : on ne la fige qu'une fois, sur une photo qui tranche.
    if (!flipKnownRef.current) {
      const flip = detectFlip(expected, snapshot)
      if (flip !== null) {
        flipKnownRef.current = true
        flippedRef.current = flip
        setFlipped(flip)
      }
    }

    const oriented: Occupancy = flippedRef.current ? rotateOccupancy(snapshot) : snapshot
    const match: BoardMatch = matchSnapshot(chess, oriented)

    switch (match.kind) {
      case 'ready': {
        setStatus('ready')
        setMessage(null)
        setWrongSquares([])
        // Le joueur a repris son pion : la question de la promotion tombe.
        setPendingPromotion(null)
        // Rien à corriger : on montre le dernier coup, ce qui sert à
        // reproduire celui de l'adversaire sur le plateau.
        showLights(lastMoveRef.current ? [lastMoveRef.current.from, lastMoveRef.current.to] : [])
        return
      }
      case 'lifted': {
        setStatus('lifted')
        setMessage(null)
        setWrongSquares([])
        setPendingPromotion(null)
        showLights(match.squares)
        return
      }
      case 'mismatch': {
        setStatus('mismatch')
        setWrongSquares(match.squares)
        setMessage(
          match.squares.length > 6
            ? "Le plateau ne correspond pas à la partie. Remettez les pièces en place."
            : `À corriger sur le plateau : ${match.squares.join(', ')}.`,
        )
        showLights(match.squares)
        return
      }
      case 'move': {
        if (!liveRef.current) return
        if (match.askPromotion) {
          setStatus('ready')
          setMessage(null)
          setPendingPromotion({ from: match.from, to: match.to })
          showLights([match.from, match.to])
          return
        }
        setStatus('ready')
        setMessage(null)
        setWrongSquares([])
        playRef.current(match.from as Square, match.to as Square, match.promotion)
        return
      }
    }
  }, [chess, showLights])

  const evaluateRef = useRef(evaluate)
  evaluateRef.current = evaluate

  /**
   * Réévalue quand la partie avance sans le plateau — coup du moteur, coup de
   * l'adversaire en ligne, retour arrière. La photo n'a pas changé, ce qu'elle
   * signifie, si.
   */
  useEffect(() => {
    if (!board) return
    evaluateRef.current()
  }, [board, fen, isLive, enabled])

  const attach = useCallback(
    (connected: PhysicalBoard) => {
      boardRef.current = connected
      snapshotRef.current = null
      flipKnownRef.current = false
      flippedRef.current = false
      lightsRef.current = ''
      setFlipped(false)

      connected.onSnapshot((occupancy) => {
        snapshotRef.current = occupancy
        if (timerRef.current) clearTimeout(timerRef.current)
        // Une pièce glissée sur trois cases produit trois photos : on attend
        // que le plateau se taise avant de conclure.
        timerRef.current = setTimeout(() => evaluateRef.current(), debounceMs)
      })

      connected.onClose((reason) => {
        boardRef.current = null
        setBoard(null)
        setStatus('idle')
        setWrongSquares([])
        setMessage(reason ? `Carte déconnectée — ${reason}` : 'Carte déconnectée.')
      })

      setBoard(connected)
      setStatus('ready')
      setMessage(null)
    },
    [debounceMs],
  )

  const connect = useCallback(
    async (driver: BoardDriver) => {
      if (boardRef.current) await boardRef.current.close().catch(() => {})
      setStatus('connecting')
      setMessage(null)
      try {
        attach(await driver.connect())
      } catch (error) {
        setStatus('idle')
        if (isUserCancellation(error)) {
          setMessage(null)
          return
        }
        setStatus('error')
        setMessage(error instanceof Error ? error.message : 'Connexion impossible.')
      }
    },
    [attach],
  )

  const disconnect = useCallback(async () => {
    const current = boardRef.current
    boardRef.current = null
    setBoard(null)
    setStatus('idle')
    setMessage(null)
    setWrongSquares([])
    setPendingPromotion(null)
    if (current) await current.close().catch(() => {})
  }, [])

  const choosePromotion = useCallback((piece: PieceSymbol) => {
    setPendingPromotion((pending) => {
      if (pending && liveRef.current) {
        playRef.current(pending.from as Square, pending.to as Square, piece)
      }
      return null
    })
  }, [])

  // Débrancher proprement quand la page se ferme : une carte laissée ouverte
  // reste inaccessible aux autres onglets.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      void boardRef.current?.close().catch(() => {})
      boardRef.current = null
    }
  }, [])

  return useMemo(
    () => ({
      board,
      status,
      message,
      wrongSquares,
      pendingPromotion,
      flipped,
      connect,
      disconnect,
      choosePromotion,
    }),
    [board, status, message, wrongSquares, pendingPromotion, flipped, connect, disconnect, choosePromotion],
  )
}
