'use client'

/**
 * Explorateur d'ouvertures.
 *
 * Trois façons d'y entrer, parce que trois questions différentes amènent ici :
 *
 *  - **« Comment ça s'appelle, ce que je joue ? »** → on joue les coups sur
 *    l'échiquier et le nom apparaît à mesure.
 *  - **« C'est quoi la sicilienne ? »** → recherche par nom.
 *  - **« Qu'est-ce qui existe ? »** → parcours par volume ECO.
 *
 * Le jeu de données compte 3 810 ouvertures nommées, sous licence CC0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, RotateCcw, Search, Undo2 } from 'lucide-react'
import clsx from 'clsx'
import { Chess } from 'chess.js'
import type { PieceSymbol, Square } from 'chess.js'
import { ECO_VOLUMES, type OpeningMatch } from '@coupparfait/core'
import { ChessBoard } from '@/components/board/ChessBoard.tsx'
import { Button, Card, Chip, EmptyState, Spinner } from '@/components/ui/index.tsx'
import { useOpeningBook } from '@/lib/game/useOpeningBook.ts'
import { playMoveSound } from '@/lib/sound.ts'
import { usePreferences } from '@/lib/store/preferences.ts'
import { useSan } from '@/lib/notation.ts'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export default function OpeningsPage() {
  const { book, ready } = useOpeningBook()
  const locale = usePreferences((state) => state.locale)

  const format = useSan()
  const [fen, setFen] = useState(START)
  const [history, setHistory] = useState<string[]>([])
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null)
  const [query, setQuery] = useState('')
  const [volume, setVolume] = useState<string | null>(null)

  // ── Ouverture de la position courante ───────────────────────────────────
  const current = useMemo(() => book?.lookup(fen, locale) ?? null, [book, fen, locale])


  const deepest = useMemo(() => {
    if (!book || history.length === 0) return null
    return book.identify(history, locale)
  }, [book, history, locale])

  const results = useMemo(() => {
    if (!book) return []
    if (query.trim().length >= 2) return book.search(query, 40, locale)
    if (volume) return book.byVolume(volume, locale).slice(0, 60)
    return []
  }, [book, query, volume, locale])

  const legalMoves = useMemo(() => {
    const map = new Map<Square, Square[]>()
    const board = new Chess(fen, { skipValidation: true })
    for (const move of board.moves({ verbose: true })) {
      const list = map.get(move.from) ?? []
      if (!list.includes(move.to)) list.push(move.to)
      map.set(move.from, list)
    }
    return map
  }, [fen])

  /**
   * Continuations théoriques depuis la position courante.
   *
   * Le calcul vit dans le livre plutôt qu'ici : il s'arrête de lui-même au-delà
   * de la profondeur répertoriée, là où essayer les trente coups légaux ne peut
   * plus rien trouver. On classe du coup le plus tôt nommé au plus tardif —
   * l'ordre dans lequel on descend naturellement l'arbre.
   */
  const continuations = useMemo(() => {
    if (!book) return []
    return book
      .continuations(fen, locale)
      .map(({ san, match }) => ({ san, opening: match }))
      .sort((a, b) => a.opening.ply - b.opening.ply || a.san.localeCompare(b.san))
      .slice(0, 14)
  }, [book, fen, locale])

  // ── Actions ─────────────────────────────────────────────────────────────
  const play = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      const board = new Chess(fen, { skipValidation: true })
      try {
        const move = board.move({ from, to, promotion: promotion ?? 'q' })
        setFen(board.fen())
        setHistory((current) => [...current, move.san])
        setLastMove({ from: move.from, to: move.to })
        playMoveSound({
          isCapture: move.isCapture(),
          isCheck: board.inCheck(),
          isCheckmate: board.isCheckmate(),
          isCastle: move.isKingsideCastle() || move.isQueensideCastle(),
          isPromotion: !!move.promotion,
        })
      } catch {
        // Coup illégal : l'échiquier ne le proposait pas, rien à faire.
      }
    },
    [fen],
  )

  const playSan = useCallback(
    (san: string) => {
      const board = new Chess(fen, { skipValidation: true })
      try {
        const move = board.move(san)
        setFen(board.fen())
        setHistory((current) => [...current, move.san])
        setLastMove({ from: move.from, to: move.to })
        playMoveSound({
          isCapture: move.isCapture(),
          isCheck: board.inCheck(),
          isCheckmate: false,
          isCastle: move.isKingsideCastle() || move.isQueensideCastle(),
          isPromotion: !!move.promotion,
        })
      } catch {
        // Ligne obsolète : on ignore plutôt que de casser l'exploration.
      }
    },
    [fen],
  )

  /**
   * Charge une ouverture complète sur l'échiquier.
   *
   * Le format compact stocke la suite en UCI plutôt qu'en PGN : c'est plus
   * court et sans ambiguïté à rejouer.
   */
  const loadLine = useCallback((uci: string) => {
    const board = new Chess()
    const played: string[] = []
    for (const token of uci.split(' ').filter(Boolean)) {
      try {
        played.push(
          board.move({
            from: token.slice(0, 2) as Square,
            to: token.slice(2, 4) as Square,
            promotion: (token[4] as PieceSymbol) ?? undefined,
          }).san,
        )
      } catch {
        break
      }
    }
    setFen(board.fen())
    setHistory(played)
    const verbose = board.history({ verbose: true })
    const last = verbose[verbose.length - 1]
    setLastMove(last ? { from: last.from, to: last.to } : null)
  }, [])

  const undo = useCallback(() => {
    if (history.length === 0) return
    const board = new Chess()
    const kept = history.slice(0, -1)
    for (const san of kept) {
      try {
        board.move(san)
      } catch {
        break
      }
    }
    setFen(board.fen())
    setHistory(kept)
    const verbose = board.history({ verbose: true })
    const last = verbose[verbose.length - 1]
    setLastMove(last ? { from: last.from, to: last.to } : null)
  }, [history])

  const reset = useCallback(() => {
    setFen(START)
    setHistory([])
    setLastMove(null)
  }, [])

  if (!ready) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner size={26} className="text-accent" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-3 py-5 sm:px-5 lg:py-8">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Explorateur d’ouvertures
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          {book?.size.toLocaleString('fr-FR')} ouvertures répertoriées. Joue des coups sur
          l’échiquier : le nom s’affiche à mesure, y compris par transposition.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* ── Échiquier ────────────────────────────────────────────── */}
        <div className="min-w-0">
          <ChessBoard fen={fen} playable="both" legalMoves={legalMoves} onMove={play} lastMove={lastMove} />

          <div className="mt-2 flex gap-1.5">
            <Button size="sm" variant="ghost" icon={<Undo2 size={14} />} onClick={undo} disabled={history.length === 0}>
              Reculer
            </Button>
            <Button size="sm" variant="ghost" icon={<RotateCcw size={14} />} onClick={reset} disabled={history.length === 0}>
              Position initiale
            </Button>
          </div>

          {history.length > 0 && (
            <Card className="mt-2 p-3">
              <p className="font-mono text-[13px] leading-relaxed">
                {history
                  .map((san, index) =>
                    index % 2 === 0
                      ? `${index / 2 + 1}. ${format(san)}`
                      : locale === 'fr'
                        ? format(san)
                        : format(san),
                  )
                  .join(' ')}
              </p>
            </Card>
          )}

          {/* Ouverture reconnue */}
          <Card glow className="mt-2 p-4">
            {current || deepest ? (
              <>
                <div className="flex items-center gap-2">
                  <Chip tone="accent">{(current ?? deepest)!.eco}</Chip>
                  <p className="min-w-0 flex-1 text-sm font-semibold">
                    {(current ?? deepest)!.label}
                  </p>
                </div>
                <p className="mt-1.5 text-xs text-faint">
                  {current
                    ? 'Position exactement répertoriée.'
                    : `Dernière position connue au coup ${Math.ceil((deepest?.atPly ?? 0) / 2)}. Tu es sorti de la théorie.`}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Nom anglais : {(current ?? deepest)!.name}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted">
                Cette position n’est pas répertoriée. Joue un coup connu, ou choisis une
                ouverture dans la liste.
              </p>
            )}
          </Card>
        </div>

        {/* ── Panneau de droite ────────────────────────────────────── */}
        <div className="flex min-w-0 flex-col gap-3">
          {/* Continuations */}
          {continuations.length > 0 && (
            <Card className="overflow-hidden">
              <p className="border-b border-line/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
                Continuations théoriques
              </p>
              <ul className="max-h-64 overflow-y-auto">
                {continuations.map(({ san, opening }) => (
                  <li key={san}>
                    <button
                      type="button"
                      onClick={() => playSan(san)}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-surface-hover"
                    >
                      <span className="w-14 shrink-0 font-mono text-sm font-semibold">
                        {format(san)}
                      </span>
                      <span className="w-9 shrink-0 text-[11px] text-faint">{opening.eco}</span>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-muted">
                        {opening.label}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Recherche */}
          <Card className="p-4">
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
                aria-hidden
              />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setVolume(null)
                }}
                placeholder="Chercher une ouverture ou un code ECO…"
                aria-label="Rechercher une ouverture"
                className="h-10 w-full rounded-[var(--radius-sm)] border border-line bg-surface pl-9 pr-3 text-sm placeholder:text-faint focus:border-accent focus:outline-none"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {ECO_VOLUMES.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    setVolume(volume === entry.id ? null : entry.id)
                    setQuery('')
                  }}
                  title={entry.description.fr}
                  className={clsx(
                    'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                    volume === entry.id
                      ? 'border-accent bg-accent/15 text-ink'
                      : 'border-line text-muted hover:bg-surface-hover',
                  )}
                >
                  {entry.id} · {entry.name.fr}
                </button>
              ))}
            </div>

            {volume && (
              <p className="mt-2.5 text-xs leading-relaxed text-muted">
                {ECO_VOLUMES.find((entry) => entry.id === volume)?.description.fr}
              </p>
            )}
          </Card>

          {/* Résultats */}
          <Card className="min-h-[200px] flex-1 overflow-hidden">
            {results.length === 0 ? (
              <EmptyState
                icon={<BookOpen size={26} />}
                title="Cherche une ouverture"
                description="Tape un nom — sicilienne, française, gambit dame — ou choisis un volume ECO ci-dessus."
              />
            ) : (
              <ul className="max-h-[520px] overflow-y-auto">
                {results.map((match) => (
                  <li key={match.epd}>
                    <button
                      type="button"
                      onClick={() => loadLine(match.uci)}
                      className="flex w-full items-baseline gap-2.5 border-b border-line/40 px-4 py-2.5 text-left transition-colors last:border-0 hover:bg-surface-hover"
                    >
                      <span className="w-9 shrink-0 font-mono text-[11px] font-semibold text-accent">
                        {match.eco}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">
                          {match.label}
                        </span>
                        <span className="block truncate text-[11px] text-faint">
                          {match.name}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] tabular-nums text-faint">
                        {Math.ceil(match.ply / 2)} coups
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <p className="mt-6 text-center text-[11px] text-faint">
        Jeu de données <span className="font-mono">lichess-org/chess-openings</span>, domaine
        public (CC0).
      </p>
    </div>
  )
}
