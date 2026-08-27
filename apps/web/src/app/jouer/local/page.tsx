'use client'

/**
 * Partie sur le même écran.
 *
 * Deux personnes, un seul appareil. C'est le mode le plus simple — aucun
 * réseau, aucun compte, aucun moteur — et c'est souvent celui par lequel on
 * apprend à quelqu'un à jouer.
 *
 * Le seul réglage qui compte : la **rotation automatique**. Sur un téléphone
 * posé entre deux joueurs, retourner l'échiquier à chaque coup change tout ;
 * sur un grand écran où l'on est côte à côte, c'est insupportable.
 */

import { useCallback, useMemo, useState } from 'react'
import { Flag, RefreshCw, RotateCcw, Undo2 } from 'lucide-react'
import type { Color, PieceSymbol, Square } from 'chess.js'
import { ChessBoard } from '@/components/board/ChessBoard.tsx'
import { ArrowLegend } from '@/components/board/ArrowLegend.tsx'
import {
  CommentaryPanel,
  CommentaryToggle,
  commentaryArrows,
  commentaryLegend,
  useLiveCommentary,
  type Alternative,
} from '@/components/game/LiveCommentary.tsx'
import { MoveList } from '@/components/game/MoveList.tsx'
import { PlayerBar } from '@/components/game/PlayerBar.tsx'
import { GameOverDialog } from '@/components/game/GameOverDialog.tsx'
import { Button, Card, Chip, Toggle } from '@/components/ui/index.tsx'
import { useChessGame } from '@/lib/game/useChessGame.ts'
import { useCurrentOpening, useOpeningBook } from '@/lib/game/useOpeningBook.ts'
import { playMoveSound, playResultSound } from '@/lib/sound.ts'
import { usePreferences } from '@/lib/store/preferences.ts'

export default function LocalGamePage() {
  const autoFlip = usePreferences((state) => state.autoFlip)
  const setPreference = usePreferences((state) => state.set)
  const locale = usePreferences((state) => state.locale)

  const { book } = useOpeningBook()
  const [orientation, setOrientation] = useState<Color>('w')
  const [finished, setFinished] = useState(false)
  const [gameKey, setGameKey] = useState(0)

  const game = useChessGame({
    onMove: (move) => {
      playMoveSound({
        isCapture: move.isCapture,
        isCheck: move.isCheck,
        isCheckmate: move.isCheckmate,
        isCastle: move.isCastle,
        isPromotion: !!move.promotion,
      })
      if (autoFlip) setOrientation(move.color === 'w' ? 'b' : 'w')
    },
    onGameOver: (_, result) => {
      setFinished(true)
      playResultSound(result === '1/2-1/2' ? 'draw' : 'win')
    },
  })

  const { state, play, undo, reset, goTo } = game
  const opening = useCurrentOpening(
    state.moves.map((move) => move.san),
    locale,
  )

  // ── Mode commenté ───────────────────────────────────────────────────────
  //
  // Autorisé ici, contrairement à la partie contre un ami : les deux joueurs
  // sont devant le même écran et voient la même chose. Ce n'est pas de
  // l'assistance, c'est un échiquier qui explique — exactement l'usage qu'on
  // en fait quand on apprend à deux.
  const commentaryMode = usePreferences((prefs) => prefs.commentaryMode)
  const [hoveredAlternative, setHoveredAlternative] = useState<Alternative | null>(null)
  const [showBestMove, setShowBestMove] = useState(true)

  const lastMove = state.moves[state.moves.length - 1] ?? null
  const { commentary, loading: coachLoading } = useLiveCommentary({
    move: lastMove,
    enabled: commentaryMode && state.isLive && !state.isGameOver,
    alternatives: 3,
    book,
  })

  const arrows = useMemo(() => {
    if (!commentaryMode) return []
    // Les flèches décrivent la position d'avant le dernier coup : dès qu'un
    // coup de plus tombe, elles pointeraient des cases qui ont changé.
    const current = commentary?.fenAfter === state.currentFen || hoveredAlternative
    if (!current) return []
    return commentaryArrows(commentary, hoveredAlternative, showBestMove)
  }, [commentaryMode, commentary, state.currentFen, hoveredAlternative, showBestMove])

  const arrowLegend = useMemo(
    () =>
      arrows.length === 0 ? [] : commentaryLegend(commentary, hoveredAlternative, showBestMove),
    [arrows, commentary, hoveredAlternative, showBestMove],
  )

  const handleMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (!state.isLive) return
      play(from, to, promotion)
    },
    [play, state.isLive],
  )

  const newGame = useCallback(() => {
    reset()
    setOrientation('w')
    setFinished(false)
    setGameKey((key) => key + 1)
  }, [reset])

  return (
    <div className="mx-auto w-full max-w-[1300px] px-2 py-3 sm:px-4 lg:py-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <PlayerBar
            name={orientation === 'w' ? 'Noirs' : 'Blancs'}
            color={orientation === 'w' ? 'b' : 'w'}
            avatar={orientation === 'w' ? '♚' : '♔'}
            active={state.turn !== orientation && !state.isGameOver}
            captured={state.material[orientation === 'w' ? 'b' : 'w']}
            materialLead={
              orientation === 'w'
                ? Math.max(0, -state.material.balance)
                : Math.max(0, state.material.balance)
            }
          />

          <div className="my-1.5">
            <ChessBoard
              key={gameKey}
              fen={state.fen}
              orientation={orientation}
              playable={state.isLive && !state.isGameOver ? 'both' : null}
              legalMoves={state.legalMoves}
              onMove={handleMove}
              lastMove={state.lastMove}
              checkSquare={state.checkSquare}
                  checkmate={state.status === 'checkmate'}
              arrows={arrows}
              highlights={commentaryMode ? (commentary?.highlights ?? []) : []}
            />
          </div>

          <ArrowLegend items={arrowLegend} className="mb-1.5" />

          <PlayerBar
            name={orientation === 'w' ? 'Blancs' : 'Noirs'}
            color={orientation}
            avatar={orientation === 'w' ? '♔' : '♚'}
            active={state.turn === orientation && !state.isGameOver}
            captured={state.material[orientation]}
            materialLead={
              orientation === 'w'
                ? Math.max(0, state.material.balance)
                : Math.max(0, -state.material.balance)
            }
          />

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="mr-auto flex items-center gap-2 pl-1 text-sm">
              <span
                className={
                  state.turn === 'w'
                    ? 'h-2.5 w-2.5 rounded-full bg-[var(--eval-white)]'
                    : 'h-2.5 w-2.5 rounded-full bg-[var(--eval-black)] ring-1 ring-line'
                }
                aria-hidden
              />
              {state.isGameOver
                ? 'Partie terminée'
                : `Trait aux ${state.turn === 'w' ? 'Blancs' : 'Noirs'}`}
            </span>

            <Button
              size="sm"
              variant="ghost"
              icon={<RotateCcw size={14} />}
              onClick={() => setOrientation((value) => (value === 'w' ? 'b' : 'w'))}
            >
              Retourner
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<Undo2 size={14} />}
              onClick={() => undo(1)}
              disabled={state.moves.length === 0}
            >
              Annuler
            </Button>
            <Button size="sm" variant="ghost" icon={<RefreshCw size={14} />} onClick={newGame}>
              Nouvelle partie
            </Button>
            <CommentaryToggle
              active={commentaryMode}
              onChange={(value) => setPreference('commentaryMode', value)}
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-3">
          {commentaryMode && (
            <CommentaryPanel
              commentary={commentary}
              loading={coachLoading}
              onHoverAlternative={setHoveredAlternative}
              showBestMove={showBestMove}
              onToggleBestMove={() => setShowBestMove((value) => !value)}
            />
          )}

          <Card className="p-4">
            <Toggle
              label="Rotation automatique"
              description="L’échiquier se retourne après chaque coup, pour que chaque joueur voie de son côté. Pratique sur un téléphone posé entre vous."
              checked={autoFlip}
              onChange={(value) => setPreference('autoFlip', value)}
            />
          </Card>

          {opening && (
            <Card className="flex items-center gap-2.5 px-3.5 py-2.5">
              <Chip tone="accent">{opening.eco}</Chip>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{opening.name}</span>
            </Card>
          )}

          <Card className="flex min-h-[220px] flex-1 flex-col overflow-hidden">
            <MoveList
              moves={state.moves}
              cursor={state.cursor}
              onSeek={goTo}
              className="min-h-0 flex-1"
            />
          </Card>
        </div>
      </div>

      {finished && (
        <GameOverDialog
          status={state.status}
          result={state.result}
          playerColor={null}
          opponentName="l’adversaire"
          moves={state.moves}
          onNewGame={newGame}
        />
      )}
    </div>
  )
}
