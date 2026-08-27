'use client'

/**
 * Entraînement tactique.
 *
 * Le format classique, éprouvé : une position, un coup à trouver, une solution
 * de plusieurs coups. Le premier coup de la séquence est joué automatiquement
 * — c'est celui de l'adversaire, celui qui crée le motif — puis le joueur
 * enchaîne.
 *
 * Deux choix pédagogiques :
 *  - **on ne dit jamais quel est le thème avant.** Savoir qu'il s'agit d'une
 *    fourchette rend le puzzle trivial ; le thème s'affiche après coup, comme
 *    une explication ;
 *  - **une erreur ne termine pas le puzzle.** On peut réessayer. Le classement
 *    en tient compte, mais l'apprentissage prime sur le score.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  Check,
  Eye,
  Flame,
  Loader2,
  RotateCcw,
  Target,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { Chess } from 'chess.js'
import type { Color, PieceSymbol, Square } from 'chess.js'
import { motifCopy, sanToFrench, type MotifId } from '@coupparfait/core'
import { ChessBoard } from '@/components/board/ChessBoard.tsx'
import { Button, Card, Chip, EmptyState, Spinner } from '@/components/ui/index.tsx'
import { playMoveSound, playSound } from '@/lib/sound.ts'
import { speak } from '@/lib/speech.ts'
import { usePreferences } from '@/lib/store/preferences.ts'
import { useSan } from '@/lib/notation.ts'

interface Puzzle {
  id: string
  fen: string
  moves: string[]
  rating: number
  ratingDeviation: number
  themes: string[]
  gameUrl: string | null
}

type Status = 'loading' | 'playing' | 'solved' | 'failed' | 'error'

/** Thèmes proposés en filtre, avec leur libellé français. */
const THEMES: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'Tous' },
  { id: 'fork', label: 'Fourchette' },
  { id: 'pin', label: 'Clouage' },
  { id: 'skewer', label: 'Enfilade' },
  { id: 'discoveredAttack', label: 'Découverte' },
  { id: 'hangingPiece', label: 'Pièce en prise' },
  { id: 'mateIn1', label: 'Mat en 1' },
  { id: 'mateIn2', label: 'Mat en 2' },
  { id: 'backRankMate', label: 'Mat du couloir' },
  { id: 'sacrifice', label: 'Sacrifice' },
  { id: 'promotion', label: 'Promotion' },
  { id: 'zugzwang', label: 'Zugzwang' },
]

export default function PuzzlesPage() {
  const locale = usePreferences((state) => state.locale)
  const format = useSan()
  const voiceEnabled = usePreferences((state) => state.voiceEnabled)

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [theme, setTheme] = useState('all')

  const [fen, setFen] = useState('')
  const [orientation, setOrientation] = useState<Color>('w')
  const [moveIndex, setMoveIndex] = useState(0)
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [revealed, setRevealed] = useState(false)

  const [playerRating, setPlayerRating] = useState<number | null>(null)
  const [ratingDelta, setRatingDelta] = useState<number | null>(null)
  const [streak, setStreak] = useState(0)

  const startedAt = useRef(Date.now())

  // ── Chargement ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setStatus('loading')
    setErrorMessage(null)
    setRatingDelta(null)
    setRevealed(false)
    setWrongAttempts(0)

    try {
      const response = await fetch(
        `/api/puzzles?theme=${encodeURIComponent(theme)}`,
        { cache: 'no-store' },
      )
      const data = await response.json()

      if (!response.ok) {
        setErrorMessage(data.error ?? 'Impossible de charger un puzzle.')
        setStatus('error')
        return
      }

      const loaded = data.puzzle as Puzzle
      setPlayerRating(data.playerRating ?? null)

      // Le premier coup est celui de l'adversaire : il crée la position du
      // puzzle. On le joue tout de suite, avec une pause pour qu'on le voie.
      const board = new Chess(loaded.fen, { skipValidation: true })
      const opening = loaded.moves[0]
      if (opening) {
        try {
          const move = board.move({
            from: opening.slice(0, 2) as Square,
            to: opening.slice(2, 4) as Square,
            promotion: (opening[4] as PieceSymbol) ?? undefined,
          })
          setLastMove({ from: move.from, to: move.to })
        } catch {
          // Coup d'ouverture illisible : on part de la position brute.
        }
      }

      setPuzzle(loaded)
      setFen(board.fen())
      setOrientation(board.turn())
      setMoveIndex(1)
      setStatus('playing')
      startedAt.current = Date.now()

      if (voiceEnabled) {
        speak(
          board.turn() === 'w'
            ? 'Les Blancs jouent. Trouve le meilleur coup.'
            : 'Les Noirs jouent. Trouve le meilleur coup.',
        )
      }
    } catch {
      setErrorMessage('Le service de puzzles est injoignable.')
      setStatus('error')
    }
  }, [theme, voiceEnabled])

  useEffect(() => {
    void load()
  }, [load])

  // ── Enregistrement du résultat ──────────────────────────────────────────
  const report = useCallback(
    async (solved: boolean) => {
      if (!puzzle) return
      try {
        const response = await fetch('/api/puzzles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            puzzleId: puzzle.id,
            solved,
            correctMoves: Math.floor((moveIndex - 1) / 2),
            timeMs: Date.now() - startedAt.current,
          }),
        })
        const data = await response.json()
        if (typeof data.rating === 'number') {
          setPlayerRating(data.rating)
          setRatingDelta(data.delta ?? null)
        }
      } catch {
        // Sans compte ou hors ligne : le puzzle reste jouable, rien n'est perdu.
      }
    },
    [puzzle, moveIndex],
  )

  // ── Coup du joueur ──────────────────────────────────────────────────────
  const handleMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (!puzzle || status !== 'playing') return

      const expected = puzzle.moves[moveIndex]
      if (!expected) return

      const played = `${from}${to}${promotion ?? ''}`
      const expectedFrom = expected.slice(0, 2)
      const expectedTo = expected.slice(2, 4)

      const board = new Chess(fen, { skipValidation: true })

      // Tolérance : si le coup joué mate, on l'accepte même s'il diffère de la
      // solution. Il existe souvent plusieurs mats, et refuser le sien serait
      // incompréhensible.
      let matesAnyway = false
      try {
        const probe = new Chess(fen, { skipValidation: true })
        probe.move({ from, to, promotion: promotion ?? 'q' })
        matesAnyway = probe.isCheckmate()
      } catch {
        return
      }

      const isCorrect =
        (from === expectedFrom && to === expectedTo) || matesAnyway

      if (!isCorrect) {
        setWrongAttempts((count) => count + 1)
        playSound('error')
        if (wrongAttempts >= 1) {
          setStatus('failed')
          void report(false)
          setStreak(0)
        }
        return
      }

      // Coup juste : on l'applique.
      const move = board.move({ from, to, promotion: promotion ?? 'q' })
      setLastMove({ from: move.from, to: move.to })
      playMoveSound({
        isCapture: move.isCapture(),
        isCheck: board.inCheck(),
        isCheckmate: board.isCheckmate(),
        isCastle: move.isKingsideCastle() || move.isQueensideCastle(),
        isPromotion: !!move.promotion,
      })

      const nextIndex = moveIndex + 1

      // Puzzle terminé ?
      if (nextIndex >= puzzle.moves.length || board.isCheckmate()) {
        setFen(board.fen())
        setMoveIndex(nextIndex)
        setStatus('solved')
        setStreak((value) => value + 1)
        playSound('victory')
        void report(wrongAttempts === 0 && !revealed)
        return
      }

      // Réponse de l'adversaire, après une courte pause pour qu'on la voie.
      const reply = puzzle.moves[nextIndex]!
      setFen(board.fen())
      setMoveIndex(nextIndex)

      setTimeout(() => {
        const after = new Chess(board.fen(), { skipValidation: true })
        try {
          const replyMove = after.move({
            from: reply.slice(0, 2) as Square,
            to: reply.slice(2, 4) as Square,
            promotion: (reply[4] as PieceSymbol) ?? undefined,
          })
          setLastMove({ from: replyMove.from, to: replyMove.to })
          playMoveSound({
            isCapture: replyMove.isCapture(),
            isCheck: after.inCheck(),
            isCheckmate: after.isCheckmate(),
            isCastle: replyMove.isKingsideCastle() || replyMove.isQueensideCastle(),
            isPromotion: !!replyMove.promotion,
          })
          setFen(after.fen())
          setMoveIndex(nextIndex + 1)
        } catch {
          setStatus('solved')
        }
      }, 420)
    },
    [puzzle, status, moveIndex, fen, wrongAttempts, revealed, report],
  )

  const reveal = useCallback(() => {
    if (!puzzle) return
    setRevealed(true)
    const expected = puzzle.moves[moveIndex]
    if (!expected) return
    const board = new Chess(fen, { skipValidation: true })
    try {
      const move = board.move({
        from: expected.slice(0, 2) as Square,
        to: expected.slice(2, 4) as Square,
        promotion: (expected[4] as PieceSymbol) ?? undefined,
      })
      speak(`La solution est ${sanToSpeechSafe(move.san, locale)}`)
    } catch {
      // Position inattendue : on ne montre rien plutôt que d'afficher un coup faux.
    }
  }, [puzzle, moveIndex, fen, locale])

  const legalMoves = useLegalMoves(fen, status === 'playing')

  // ── Rendu ───────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Card>
          <EmptyState
            icon={<Target size={30} />}
            title="Aucun puzzle disponible"
            description={
              errorMessage ??
              'La base de puzzles est vide. Lance l’import depuis le serveur pour récupérer les six millions de positions de Lichess.'
            }
            action={
              <Button variant="secondary" onClick={() => void load()}>
                Réessayer
              </Button>
            }
          />
          <div className="border-t border-line/60 px-5 py-4">
            <p className="text-xs text-faint">Commande d’import :</p>
            <code className="mt-1 block rounded bg-surface px-2 py-1.5 font-mono text-[12px]">
              node scripts/import-puzzles.mjs
            </code>
          </div>
        </Card>
      </div>
    )
  }

  const revealedSan = revealed && puzzle ? sanOf(fen, puzzle.moves[moveIndex]) : null

  return (
    <div className="mx-auto w-full max-w-[1100px] px-3 py-4 sm:px-5 lg:py-8">
      {/* ── Filtres et score ───────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="font-display text-xl font-bold tracking-tight">Puzzles</h1>
        {playerRating !== null && (
          <Chip tone="accent">
            <Target size={11} aria-hidden />
            {playerRating}
            {ratingDelta !== null && (
              <span className={ratingDelta >= 0 ? 'text-[var(--q-best)]' : 'text-[var(--q-blunder)]'}>
                {ratingDelta >= 0 ? ' +' : ' '}
                {ratingDelta}
              </span>
            )}
          </Chip>
        )}
        {streak > 1 && (
          <Chip tone="warning">
            <Flame size={11} aria-hidden />
            série de {streak}
          </Chip>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {THEMES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setTheme(entry.id)}
            className={clsx(
              'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              theme === entry.id
                ? 'border-accent bg-accent/15 text-ink'
                : 'border-line text-muted hover:bg-surface-hover',
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ── Échiquier ──────────────────────────────────────────── */}
        <div className="min-w-0">
          {status === 'loading' ? (
            <div className="grid aspect-square w-full place-items-center rounded-[var(--radius)] glass">
              <Spinner size={26} />
            </div>
          ) : (
            <ChessBoard
              fen={fen}
              orientation={orientation}
              playable={status === 'playing' ? orientation : null}
              legalMoves={legalMoves}
              onMove={handleMove}
              lastMove={lastMove}
              allowAnnotations
            />
          )}
        </div>

        {/* ── Panneau ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <Card className="p-4">
            {status === 'playing' && (
              <>
                <p className="text-sm font-semibold">
                  {orientation === 'w' ? 'Les Blancs jouent' : 'Les Noirs jouent'}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">
                  Trouve le meilleur coup. Il y en a un seul.
                </p>
                {wrongAttempts > 0 && (
                  <p className="mt-2 flex items-center gap-1.5 text-[13px] text-[var(--q-blunder)]">
                    <X size={13} aria-hidden />
                    Ce n’est pas ça. Encore un essai.
                  </p>
                )}
                {revealedSan && (
                  <p className="mt-2 rounded-[var(--radius-sm)] bg-surface px-2.5 py-2 text-[13px]">
                    Solution :{' '}
                    <strong className="text-accent">
                      {format(revealedSan)}
                    </strong>
                  </p>
                )}
              </>
            )}

            {status === 'solved' && (
              <div className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--q-best)_20%,transparent)]"
                  aria-hidden
                >
                  <Check size={14} className="text-[var(--q-best)]" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--q-best)]">Résolu !</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">
                    {wrongAttempts === 0 && !revealed
                      ? 'Trouvé du premier coup. C’est exactement ce qu’il fallait voir.'
                      : 'Bien joué. Refais-en un du même thème pour ancrer le motif.'}
                  </p>
                </div>
              </div>
            )}

            {status === 'failed' && (
              <div className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--q-blunder)_20%,transparent)]"
                  aria-hidden
                >
                  <X size={14} className="text-[var(--q-blunder)]" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--q-blunder)]">Raté</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">
                    Regarde la solution, puis rejoue la position mentalement. C’est en
                    revoyant le motif qu’on finit par le reconnaître d’instinct.
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Thèmes : révélés seulement après coup */}
          {(status === 'solved' || status === 'failed') && puzzle && (
            <Card className="p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-faint">
                Ce qu’il fallait voir
              </p>
              <div className="flex flex-wrap gap-1.5">
                {puzzle.themes.slice(0, 6).map((themeId) => {
                  const copy = motifCopy(themeId as MotifId, locale)
                  return (
                    <Chip key={themeId} tone="accent" title={copy?.definition}>
                      {copy?.name ?? themeId}
                    </Chip>
                  )
                })}
              </div>
              {puzzle.themes[0] && (
                <p className="mt-2.5 text-[12px] leading-relaxed text-muted">
                  {motifCopy(puzzle.themes[0] as MotifId, locale)?.definition}
                </p>
              )}
              <p className="mt-3 text-[11px] text-faint">
                Niveau du puzzle : {puzzle.rating}
              </p>
            </Card>
          )}

          <div className="flex gap-2">
            {status === 'playing' && !revealed && (
              <Button variant="ghost" icon={<Eye size={14} />} onClick={reveal} fullWidth>
                Solution
              </Button>
            )}
            {(status === 'solved' || status === 'failed') && (
              <Button
                variant="primary"
                icon={<ArrowRight size={15} />}
                onClick={() => void load()}
                fullWidth
              >
                Puzzle suivant
              </Button>
            )}
            {status === 'failed' && (
              <Button variant="ghost" icon={<RotateCcw size={14} />} onClick={() => void load()}>
                Autre
              </Button>
            )}
          </div>

          {playerRating === null && status !== 'loading' && (
            <p className="text-center text-[11px] leading-relaxed text-faint">
              Crée un compte pour suivre ton classement puzzles et éviter de revoir les mêmes
              positions.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Aides
// ─────────────────────────────────────────────────────────────────────────────

function useLegalMoves(fen: string, active: boolean) {
  const [map, setMap] = useState<Map<Square, Square[]>>(new Map())

  useEffect(() => {
    if (!active || !fen) {
      setMap(new Map())
      return
    }
    const next = new Map<Square, Square[]>()
    try {
      const board = new Chess(fen, { skipValidation: true })
      for (const move of board.moves({ verbose: true })) {
        const list = next.get(move.from) ?? []
        if (!list.includes(move.to)) list.push(move.to)
        next.set(move.from, list)
      }
    } catch {
      // Position inattendue : on n'autorise aucun coup plutôt que de planter.
    }
    setMap(next)
  }, [fen, active])

  return map
}

/** Notation algébrique d'un coup UCI dans une position, ou `null`. */
function sanOf(fen: string, uci: string | undefined): string | null {
  if (!uci) return null
  try {
    const board = new Chess(fen, { skipValidation: true })
    return board.move({
      from: uci.slice(0, 2) as Square,
      to: uci.slice(2, 4) as Square,
      promotion: (uci[4] as PieceSymbol) ?? undefined,
    }).san
  } catch {
    return null
  }
}

function sanToSpeechSafe(san: string, locale: 'fr' | 'en'): string {
  return locale === 'fr' ? sanToFrench(san) : san
}
