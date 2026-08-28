'use client'

/**
 * Fin de partie.
 *
 * On annonce le résultat, on rappelle *comment* la partie s'est terminée — un
 * débutant ne sait pas toujours pourquoi la partie s'est arrêtée — et on
 * propose immédiatement les deux gestes suivants : rejouer, ou analyser.
 *
 * Le bouton d'analyse est mis en avant volontairement : c'est le moment où l'on
 * apprend le plus, juste après avoir joué, quand on se souvient encore de ce
 * qu'on avait en tête.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Gauge, RotateCcw, Swords, X } from 'lucide-react'
import type { Color } from 'chess.js'
import type { GameResult, GameStatus } from '@coupparfait/core'
import { formatPgnDate, toPgn } from '@coupparfait/core'
import { Button } from '@/components/ui/index.tsx'
import type { PlayedMove } from '@/lib/game/useChessGame.ts'

const REASONS: Record<GameStatus, string> = {
  waiting: '',
  playing: '',
  checkmate: 'par échec et mat',
  stalemate: 'par pat — le roi n’est pas en échec mais aucun coup n’est possible',
  resign: 'par abandon',
  timeout: 'au temps',
  draw: 'par accord mutuel',
  insufficientMaterial: 'matériel insuffisant pour mater',
  threefold: 'par répétition de la position',
  fiftyMoves: 'par la règle des cinquante coups',
  aborted: 'partie annulée',
  abandoned: 'partie abandonnée',
}

export function GameOverDialog({
  status,
  result,
  playerColor,
  opponentName,
  moves,
  ratingDelta,
  onRematch,
  onNewGame,
}: {
  status: GameStatus
  result: GameResult
  /** Couleur du joueur humain, ou `null` en partie locale. */
  playerColor: Color | null
  opponentName: string
  moves: PlayedMove[]
  /** Variation de classement, si la partie était classée. */
  ratingDelta?: number | null
  onRematch?: () => void
  onNewGame?: () => void
}) {
  const [dismissed, setDismissed] = useState(false)

  /**
   * Délai avant d'annoncer le résultat.
   *
   * Le coup qui met fin à la partie est le plus instructif de tous — c'est le
   * mat qu'on voulait voir, ou celui qu'on n'a pas vu venir. Une boîte de
   * dialogue qui recouvre l'échiquier à l'instant même où il tombe supprime
   * précisément ce qu'on avait à regarder.
   */
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 1800)
    return () => clearTimeout(timer)
  }, [])

  // Échap referme, comme n'importe quelle boîte de dialogue.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDismissed(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  if (dismissed || !revealed) return null

  const won = playerColor !== null && result === (playerColor === 'w' ? '1-0' : '0-1')
  const drawn = result === '1/2-1/2'
  const title = playerColor === null
    ? drawn
      ? 'Partie nulle'
      : result === '1-0'
        ? 'Les Blancs gagnent'
        : 'Les Noirs gagnent'
    : drawn
      ? 'Partie nulle'
      : won
        ? 'Victoire !'
        : 'Défaite'

  const tone = drawn ? 'var(--q-forced)' : won ? 'var(--q-best)' : 'var(--q-blunder)'

  /** Prépare le PGN pour l'analyse : on le passe par le stockage de session. */
  const handOffForAnalysis = () => {
    const pgn = toPgn(
      moves.map((move, index) => ({
        ply: index,
        moveNumber: Math.floor(index / 2) + 1,
        color: move.color,
        san: move.san,
        uci: move.uci,
        fenBefore: move.before,
        fenAfter: move.after,
        scoreBefore: { type: 'cp', value: 0 },
        scoreAfter: { type: 'cp', value: 0 },
        winBefore: 50,
        winAfter: 50,
        winLoss: 0,
        centipawnLoss: 0,
        accuracy: 100,
        quality: 'good',
        motifs: [],
      })),
      {
        headers: {
          Event: 'Partie Le Coup Parfait',
          Date: formatPgnDate(new Date()),
          White: playerColor === 'w' ? 'Toi' : opponentName,
          Black: playerColor === 'b' ? 'Toi' : opponentName,
          Result: result,
        },
      },
    )
    try {
      sessionStorage.setItem('coupparfait.pendingAnalysis', pgn)
      // Analyser sa partie vue d'en face demande un effort de retournement
      // permanent : on ouvre du côté où l'on jouait. En partie locale il n'y a
      // pas de « son » camp, et l'analyse garde alors la vue des Blancs.
      if (playerColor) sessionStorage.setItem('coupparfait.pendingAnalysisSide', playerColor)
    } catch {
      // Mode navigation privée très restrictif : l'analyse partira à vide, on
      // pourra toujours coller le PGN à la main.
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-over-title"
    >
      {/* Voile léger et **sans flou** : la position finale doit rester lisible
          derrière l'annonce. Un clic à côté referme, pour revenir à
          l'échiquier sans avoir à choisir une action. */}
      <div
        className="absolute inset-0 bg-black/35"
        onClick={() => setDismissed(true)}
        aria-hidden
      />

      {/* Opaque, comme toute surface qui se superpose au contenu : à travers
          le verre, l'échiquier passait au milieu du texte et « Victoire ! » se
          lisait par-dessus un damier. */}
      <div className="popover animate-slide-up relative w-full max-w-sm overflow-hidden p-6 text-center shadow-[var(--shadow-lg)]">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="absolute right-3 top-3 rounded p-1 text-faint transition-colors hover:text-ink"
          aria-label="Fermer"
        >
          <X size={16} aria-hidden />
        </button>

        <div
          className="mx-auto mb-4 h-1.5 w-16 rounded-full"
          style={{ background: tone }}
          aria-hidden
        />

        <h2 id="game-over-title" className="font-display text-2xl font-bold tracking-tight">
          {title}
        </h2>
        <p className="mt-1.5 text-sm text-muted">{REASONS[status] || result}</p>

        {ratingDelta != null && (
          <p
            className="mt-3 text-lg font-bold tabular-nums"
            style={{ color: ratingDelta >= 0 ? 'var(--q-best)' : 'var(--q-blunder)' }}
          >
            {ratingDelta >= 0 ? '+' : ''}
            {ratingDelta} Elo
          </p>
        )}

        <p className="mt-4 text-xs text-faint">
          {moves.length} demi-coups joués
        </p>

        <div className="mt-6 space-y-2">
          {/* Sans coup joué, l'analyse n'a rien à dire : proposer le bouton
              n'aboutirait qu'à un « format non reconnu » sur l'autre écran. */}
          {moves.length > 0 && (
            <Link href="/analyse" onClick={handOffForAnalysis} className="block">
              <Button variant="primary" size="lg" fullWidth icon={<Gauge size={16} />}>
                Analyser la partie
              </Button>
            </Link>
          )}

          <div className="flex gap-2">
            {onRematch && (
              <Button
                variant="secondary"
                fullWidth
                icon={<RotateCcw size={15} />}
                onClick={() => {
                  setDismissed(true)
                  onRematch()
                }}
              >
                Revanche
              </Button>
            )}
            {onNewGame && (
              <Button
                variant="ghost"
                fullWidth
                icon={<Swords size={15} />}
                onClick={() => {
                  setDismissed(true)
                  onNewGame()
                }}
              >
                Nouvelle partie
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
