'use client'

/**
 * État d'une partie côté navigateur.
 *
 * Encapsule chess.js et expose ce dont l'interface a besoin : position
 * courante, coups légaux indexés, historique navigable, statut de fin de
 * partie. La navigation dans l'historique est séparée de la position réelle —
 * on peut revenir dix coups en arrière pour regarder sans perdre la partie en
 * cours.
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import type { Color, Move, PieceSymbol, Square } from 'chess.js'
import { START_FEN, capturedPieces, SIMPLE_VALUES } from '@coupparfait/core'
import type { GameResult, GameStatus } from '@coupparfait/core'
import { useLegalMoves } from '@/lib/game/useLegalMoves.ts'

export interface PlayedMove {
  san: string
  uci: string
  from: Square
  to: Square
  piece: PieceSymbol
  captured?: PieceSymbol
  promotion?: PieceSymbol
  color: Color
  /** Position avant le coup. */
  before: string
  /** Position après le coup. */
  after: string
  /** Horodatage du coup, pour mesurer le temps de réflexion. */
  at: number
  isCheck: boolean
  isCheckmate: boolean
  isCapture: boolean
  isCastle: boolean
  /**
   * Redondant avec `promotion`, et c'est le but : les cinq drapeaux réunis
   * forment exactement le `MoveSoundContext` du bruitage, si bien qu'un coup
   * joué se passe tel quel à `playMoveSound`. Sans lui, chaque écran de jeu
   * recopiait un adaptateur de six lignes pour ce seul champ.
   */
  isPromotion: boolean
}

export interface GameState {
  /** Position affichée — peut être une position passée si on navigue. */
  fen: string
  /** Position réelle de la partie. */
  currentFen: string
  turn: Color
  moves: PlayedMove[]
  /** Index affiché : `-1` = position initiale, `moves.length - 1` = à jour. */
  cursor: number
  isLive: boolean
  legalMoves: Map<Square, Square[]>
  lastMove: { from: Square; to: Square } | null
  checkSquare: Square | null
  status: GameStatus
  result: GameResult
  isGameOver: boolean
  /** Matériel capturé et différence, pour l'affichage sous les avatars. */
  material: { w: PieceSymbol[]; b: PieceSymbol[]; balance: number }
}

export interface UseChessGameOptions {
  startFen?: string
  /** Coups initiaux, pour reprendre une partie. */
  initialMoves?: string[]
  onMove?: (move: PlayedMove, state: GameState) => void
  onGameOver?: (status: GameStatus, result: GameResult) => void
}

export function useChessGame(options: UseChessGameOptions = {}) {
  const { startFen = START_FEN, initialMoves = [] } = options

  // chess.js est mutable : on le garde dans une ref et on force le rendu via un
  // compteur. C'est plus économique que de recréer l'objet à chaque coup.
  const chessRef = useRef<Chess>(null as unknown as Chess)
  if (chessRef.current === null) {
    const board = new Chess(startFen, { skipValidation: true })
    for (const san of initialMoves) {
      try {
        board.move(san)
      } catch {
        break
      }
    }
    chessRef.current = board
  }

  const [moves, setMoves] = useState<PlayedMove[]>(() =>
    buildHistory(startFen, chessRef.current.history({ verbose: true })),
  )
  const [cursor, setCursor] = useState(() => moves.length - 1)
  const [, forceRender] = useState(0)

  const chess = chessRef.current
  const currentFen = chess.fen()
  const isLive = cursor === moves.length - 1

  const displayedFen = useMemo(() => {
    if (isLive) return currentFen
    if (cursor < 0) return startFen
    return moves[cursor]?.after ?? currentFen
  }, [isLive, cursor, currentFen, moves, startFen])

  /**
   * Coups légaux de la position **réelle**, indexés par case de départ.
   *
   * Depuis la position et non depuis l'instance `chess` : le résultat est le
   * même — un mat ou un pat ne rendent aucun coup, la garde `isGameOver` était
   * redondante — et cinq autres écrans partagent désormais le même calcul.
   */
  const legalMoves = useLegalMoves(currentFen, isLive)

  const status = useMemo<GameStatus>(() => {
    if (chess.isCheckmate()) return 'checkmate'
    if (chess.isStalemate()) return 'stalemate'
    if (chess.isInsufficientMaterial()) return 'insufficientMaterial'
    if (chess.isThreefoldRepetition()) return 'threefold'
    if (chess.isDrawByFiftyMoves()) return 'fiftyMoves'
    return 'playing'
  }, [chess, currentFen])

  const result = useMemo<GameResult>(() => {
    if (status === 'checkmate') return chess.turn() === 'w' ? '0-1' : '1-0'
    if (status === 'playing') return '*'
    return '1/2-1/2'
  }, [status, chess, currentFen])

  const checkSquare = useMemo<Square | null>(() => {
    const board = isLive ? chess : new Chess(displayedFen, { skipValidation: true })
    if (!board.inCheck()) return null
    return board.findPiece({ type: 'k', color: board.turn() })[0] ?? null
  }, [chess, currentFen, isLive, displayedFen])

  const material = useMemo(() => {
    const board = new Chess(displayedFen, { skipValidation: true })
    const captured = capturedPieces(board)
    const balance =
      captured.w.reduce((sum, p) => sum + SIMPLE_VALUES[p], 0) -
      captured.b.reduce((sum, p) => sum + SIMPLE_VALUES[p], 0)
    return { w: captured.w, b: captured.b, balance }
  }, [displayedFen])

  const displayedLastMove = useMemo(() => {
    const index = isLive ? moves.length - 1 : cursor
    const move = moves[index]
    return move ? { from: move.from, to: move.to } : null
  }, [moves, cursor, isLive])

  const state: GameState = {
    fen: displayedFen,
    currentFen,
    turn: chess.turn(),
    moves,
    cursor,
    isLive,
    legalMoves,
    lastMove: displayedLastMove,
    checkSquare,
    status,
    result,
    isGameOver: status !== 'playing',
    material,
  }

  /*
    Les options et l'état sont lus au moment de jouer, pas capturés.

    `play` dépendait de `options` — un objet littéral que la page recrée à
    chaque rendu — et de `state`, reconstruit de même. La fonction changeait
    donc d'identité à chaque rendu de la page, c'est-à-dire dix fois par
    seconde quand la pendule tourne. Tout ce qui la recevait en propriété se
    re-rendait avec elle : les deux échiquiers, qui sont `memo` précisément
    pour ne pas suivre la pendule, et en 3D chaque re-rendu faisait dessiner
    une image pour rien.
  */
  const optionsRef = useRef(options)
  optionsRef.current = options
  const stateRef = useRef(state)
  stateRef.current = state

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Joue un coup. Retourne le coup joué, ou `null` s'il était illégal.
   * Jouer alors qu'on consulte l'historique ramène d'abord à la position réelle.
   */
  const play = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol): PlayedMove | null => {
      let move: Move
      try {
        move = chess.move({ from, to, promotion: promotion ?? 'q' })
      } catch {
        return null
      }

      const played = toPlayedMove(move)
      const nextMoves = [...moves, played]
      setMoves(nextMoves)
      setCursor(nextMoves.length - 1)
      forceRender((n) => n + 1)

      optionsRef.current.onMove?.(played, {
        ...stateRef.current,
        fen: played.after,
        currentFen: played.after,
        moves: nextMoves,
        cursor: nextMoves.length - 1,
      })

      if (chess.isGameOver()) {
        const finalStatus: GameStatus = chess.isCheckmate()
          ? 'checkmate'
          : chess.isStalemate()
            ? 'stalemate'
            : chess.isInsufficientMaterial()
              ? 'insufficientMaterial'
              : chess.isThreefoldRepetition()
                ? 'threefold'
                : 'fiftyMoves'
        const finalResult: GameResult =
          finalStatus === 'checkmate' ? (chess.turn() === 'w' ? '0-1' : '1-0') : '1/2-1/2'
        optionsRef.current.onGameOver?.(finalStatus, finalResult)
      }

      return played
    },
    [chess, moves],
  )

  /** Joue un coup donné en notation algébrique (utilisé par les leçons). */
  const playSan = useCallback(
    (san: string): PlayedMove | null => {
      let move: Move
      try {
        move = chess.move(san)
      } catch {
        return null
      }
      const played = toPlayedMove(move)
      const nextMoves = [...moves, played]
      setMoves(nextMoves)
      setCursor(nextMoves.length - 1)
      forceRender((n) => n + 1)
      return played
    },
    [chess, moves],
  )

  /** Annule le dernier coup. Deux fois de suite face à l'ordinateur. */
  const undo = useCallback(
    (count = 1): void => {
      for (let i = 0; i < count; i++) {
        if (chess.undo() === null) break
      }
      const nextMoves = moves.slice(0, Math.max(0, moves.length - count))
      setMoves(nextMoves)
      setCursor(nextMoves.length - 1)
      forceRender((n) => n + 1)
    },
    [chess, moves],
  )

  const reset = useCallback(
    (fen: string = startFen): void => {
      chessRef.current = new Chess(fen, { skipValidation: true })
      setMoves([])
      setCursor(-1)
      forceRender((n) => n + 1)
    },
    [startFen],
  )

  /** Charge une position ou une partie complète. */
  const load = useCallback((fen: string, sanMoves: string[] = []): void => {
    const board = new Chess(fen, { skipValidation: true })
    for (const san of sanMoves) {
      try {
        board.move(san)
      } catch {
        break
      }
    }
    chessRef.current = board
    const history = buildHistory(fen, board.history({ verbose: true }))
    setMoves(history)
    setCursor(history.length - 1)
    forceRender((n) => n + 1)
  }, [])

  // ── Navigation dans l'historique ──────────────────────────────────────────

  const goTo = useCallback(
    (index: number): void => {
      setCursor(Math.max(-1, Math.min(moves.length - 1, index)))
    },
    [moves.length],
  )

  const goFirst = useCallback(() => setCursor(-1), [])
  const goLast = useCallback(() => setCursor(moves.length - 1), [moves.length])
  const goPrevious = useCallback(() => setCursor((c) => Math.max(-1, c - 1)), [])
  const goNext = useCallback(
    () => setCursor((c) => Math.min(moves.length - 1, c + 1)),
    [moves.length],
  )

  return {
    state,
    chess,
    play,
    playSan,
    undo,
    reset,
    load,
    goTo,
    goFirst,
    goLast,
    goPrevious,
    goNext,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Aides
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convertit un coup de chess.js en coup joué.
 *
 * Exportée parce que deux écrans en avaient recopié le corps pour reconstruire
 * une liste de coups à partir d'un PGN ou d'un instantané de serveur — et l'une
 * des copies avait déjà divergé sur la détection du roque.
 */
export function toPlayedMove(move: Move): PlayedMove {
  return {
    san: move.san,
    uci: `${move.from}${move.to}${move.promotion ?? ''}`,
    from: move.from,
    to: move.to,
    piece: move.piece,
    captured: move.captured,
    promotion: move.promotion,
    color: move.color,
    before: move.before,
    after: move.after,
    at: Date.now(),
    isCheck: move.san.includes('+'),
    isCheckmate: move.san.includes('#'),
    isCapture: move.isCapture(),
    isCastle: move.isKingsideCastle() || move.isQueensideCastle(),
    isPromotion: Boolean(move.promotion),
  }
}

function buildHistory(_startFen: string, verbose: Move[]): PlayedMove[] {
  return verbose.map(toPlayedMove)
}

/**
 * Regroupe les demi-coups par numéro de coup, pour l'affichage en deux colonnes.
 */
export function groupMoves(
  moves: PlayedMove[],
  startFen: string = START_FEN,
): Array<{ number: number; white: PlayedMove | null; black: PlayedMove | null; whitePly: number; blackPly: number }> {
  const startsWithBlack = startFen.split(' ')[1] === 'b'
  const firstNumber = Number(startFen.split(' ')[5] ?? '1')
  const rows: Array<{
    number: number
    white: PlayedMove | null
    black: PlayedMove | null
    whitePly: number
    blackPly: number
  }> = []

  let index = 0
  if (startsWithBlack && moves[0]) {
    rows.push({ number: firstNumber, white: null, black: moves[0], whitePly: -1, blackPly: 0 })
    index = 1
  }

  for (; index < moves.length; index += 2) {
    const number = firstNumber + Math.floor((index + (startsWithBlack ? 1 : 0)) / 2)
    rows.push({
      number,
      white: moves[index] ?? null,
      black: moves[index + 1] ?? null,
      whitePly: index,
      blackPly: index + 1,
    })
  }
  return rows
}
