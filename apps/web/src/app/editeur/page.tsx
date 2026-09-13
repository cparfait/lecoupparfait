'use client'

/**
 * Éditeur de position.
 *
 * Il manquait le geste le plus banal : reproduire une position vue dans un
 * livre, sur une feuille, ou au club — pour la comprendre, l'analyser, ou la
 * jouer contre l'ordinateur. Sans lui, la seule façon d'atteindre une position
 * était d'y arriver en jouant.
 *
 * On choisit une pièce, on clique une case, elle s'y pose. Cliquer une case
 * occupée par la pièce choisie l'enlève : c'est le geste inverse, et il évite
 * un mode « gomme » à activer.
 */

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { Chess } from 'chess.js'
import type { Color, PieceSymbol, Square } from 'chess.js'
import { Eraser, Gauge, RotateCcw, Swords, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useT } from '@/lib/i18n/index.tsx'
import { ChessBoard } from '@/components/board/ChessBoard.tsx'
import { Button, Card, SectionTitle } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'

const EMPTY = '8/8/8/8/8/8/8/8 w - - 0 1'
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

/**
 * Les droits de roque qu'une position dessinée peut encore avoir.
 *
 * On les déduit des pièces, et de rien d'autre : un roi sur sa case et une
 * tour dans son coin donnent le droit de ce côté. C'est l'hypothèse la plus
 * généreuse compatible avec la position, et la seule qu'on puisse tenir sans
 * connaître l'histoire de la partie.
 *
 * Ils étaient forcés à `KQkq` quoi qu'il arrive : chess.js accepte un FEN qui
 * promet un roque sans roi ni tour, mais l'analyse et la partie contre
 * l'ordinateur héritaient alors d'un droit impossible.
 */
function droitsDeRoque(fen: string): string {
  const board = new Chess(fen, { skipValidation: true })
  const est = (square: Square, type: PieceSymbol, color: Color) => {
    const piece = board.get(square)
    return piece?.type === type && piece.color === color
  }
  let droits = ''
  if (est('e1', 'k', 'w')) {
    if (est('h1', 'r', 'w')) droits += 'K'
    if (est('a1', 'r', 'w')) droits += 'Q'
  }
  if (est('e8', 'k', 'b')) {
    if (est('h8', 'r', 'b')) droits += 'k'
    if (est('a8', 'r', 'b')) droits += 'q'
  }
  return droits || '-'
}

/** Les pièces, dans l'ordre où on les pose : les plus fréquentes d'abord. */
const PIECES: Array<{ type: PieceSymbol; white: string; black: string; nom: string }> = [
  { type: 'p', white: '♙', black: '♟', nom: 'Pion' },
  { type: 'n', white: '♘', black: '♞', nom: 'Cavalier' },
  { type: 'b', white: '♗', black: '♝', nom: 'Fou' },
  { type: 'r', white: '♖', black: '♜', nom: 'Tour' },
  { type: 'q', white: '♕', black: '♛', nom: 'Dame' },
  { type: 'k', white: '♔', black: '♚', nom: 'Roi' },
]

export default function EditorPage() {
  const t = useT()
  const [fen, setFen] = useState(START)
  const [brush, setBrush] = useState<{ type: PieceSymbol; color: Color } | null>({
    type: 'p',
    color: 'w',
  })
  const [turn, setTurn] = useState<Color>('w')
  const [orientation, setOrientation] = useState<Color>('w')

  /**
   * Ce que vaut la position, dite en clair.
   *
   * Une position bricolée est souvent illégale — deux rois blancs, aucun roi
   * noir, un pion sur la première rangée. Le dire tout de suite évite de
   * cliquer « analyser » pour recevoir une erreur incompréhensible.
   */
  const verdict = useMemo(() => {
    const board = new Chess()
    const placed = fen.split(' ')[0] ?? ''
    const rois = { w: (placed.match(/K/g) ?? []).length, b: (placed.match(/k/g) ?? []).length }

    if (rois.w !== 1 || rois.b !== 1) {
      return {
        ok: false,
        message: rois.w === 0 || rois.b === 0 ? t('editor.needAKing') : t('editor.oneKingEach'),
      }
    }
    if (/[pP]/.test((placed.split('/')[0] ?? '') + (placed.split('/')[7] ?? ''))) {
      return {
        ok: false,
        message: t('editor.pawnOnEdge'),
      }
    }
    try {
      board.load(fen)
      return { ok: true, message: `${board.moves().length} coups légaux.` }
    } catch {
      return { ok: false, message: t('editor.impossible') }
    }
  }, [fen, t])

  /** Repose la position avec un autre trait, sans toucher aux pièces. */
  const withTurn = useCallback(
    (next: Color) => {
      setTurn(next)
      const parts = fen.split(' ')
      parts[1] = next
      // Le roque se déduit des pièces ; la prise en passant, elle, ne se
      // devine pas d'une position dessinée et reste à zéro.
      parts[2] = droitsDeRoque(fen)
      parts[3] = '-'
      setFen(parts.join(' '))
    },
    [fen],
  )

  const place = useCallback(
    (square: Square) => {
      const board = new Chess(fen, { skipValidation: true })
      const present = board.get(square)

      if (!brush) {
        board.remove(square)
      } else if (present && present.type === brush.type && present.color === brush.color) {
        // Reposer la même pièce au même endroit, c'est vouloir l'enlever.
        board.remove(square)
      } else {
        board.remove(square)
        board.put({ type: brush.type, color: brush.color }, square)
      }

      const parts = board.fen().split(' ')
      parts[1] = turn
      parts[2] = droitsDeRoque(board.fen())
      parts[3] = '-'
      setFen(parts.join(' '))
    },
    [fen, brush, turn],
  )

  const analyse = useCallback(() => {
    if (!verdict.ok) {
      toast.error(t('editor.incomplete'), verdict.message)
      return
    }
    try {
      sessionStorage.setItem('coupparfait.pendingAnalysis', fen)
    } catch {
      // Stockage refusé : on collera la position à la main.
    }
    window.location.assign('/analyse')
  }, [fen, verdict, t])

  return (
    <div className="etude mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <SectionTitle hint={t('editor.hint')}>{t('editor.title')}</SectionTitle>

      <div className="etude-corps grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="etude-plateau min-w-0">
          <div className="etude-cadre">
            <ChessBoard
              fitParentHeight
              fen={fen}
              orientation={orientation}
              playable={null}
              onSquareClick={place}
              showViewToggle={false}
              reservedHeight={14}
            />
          </div>
        </div>

        <div className="etude-aside flex min-w-0 flex-col gap-3">
          {/* ── Pièces ─────────────────────────────────────────── */}
          <Card className="p-3">
            <p className="mb-2 text-[12px] font-semibold text-faint">{t('editor.pieceToPlace')}</p>
            {(['w', 'b'] as const).map((colour) => (
              <div key={colour} className="mb-1.5 flex gap-1">
                {PIECES.map((piece) => {
                  const active = brush?.type === piece.type && brush?.color === colour
                  return (
                    <button
                      key={piece.type}
                      type="button"
                      onClick={() => setBrush({ type: piece.type, color: colour })}
                      title={`${piece.nom} ${colour === 'w' ? 'blanc' : 'noir'}`}
                      aria-pressed={active}
                      className={clsx(
                        'grid h-9 flex-1 place-items-center rounded-[var(--radius-sm)] text-2xl leading-none transition-colors',
                        active
                          ? 'bg-accent/20 ring-2 ring-inset ring-accent'
                          : 'hover:bg-surface-hover',
                      )}
                    >
                      <span aria-hidden>{colour === 'w' ? piece.white : piece.black}</span>
                    </button>
                  )
                })}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setBrush(null)}
              aria-pressed={brush === null}
              className={clsx(
                'mt-1 flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-sm)] py-1.5 text-[14px] font-medium transition-colors',
                brush === null
                  ? 'bg-accent/20 ring-2 ring-inset ring-accent'
                  : 'hover:bg-surface-hover',
              )}
            >
              <Eraser size={14} aria-hidden />
              {t('bits.remove')}
            </button>
          </Card>

          {/* ── Trait et plateau ───────────────────────────────── */}
          <Card className="p-3">
            <p className="mb-2 text-[12px] font-semibold text-faint">{t('bits.toMove')}</p>
            <div className="flex gap-1.5">
              {(['w', 'b'] as const).map((colour) => (
                <button
                  key={colour}
                  type="button"
                  onClick={() => withTurn(colour)}
                  className={clsx(
                    'flex-1 rounded-[var(--radius-sm)] border px-2 py-1.5 text-[14px] font-medium transition-colors',
                    turn === colour
                      ? 'border-accent bg-accent/15 text-ink'
                      : 'border-line text-muted hover:bg-surface-hover',
                  )}
                >
                  {t(colour === 'w' ? 'rest.whiteToMove' : 'rest.blackToMove')}
                </button>
              ))}
            </div>

            <div className="mt-2 flex gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                icon={<RotateCcw size={14} />}
                onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
                fullWidth
              >
                {t('bits.flip')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                icon={<Trash2 size={14} />}
                onClick={() => setFen(EMPTY.replace('w', turn))}
                fullWidth
              >
                {t('bits.clear')}
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="mt-1.5"
              onClick={() => {
                setFen(START)
                setTurn('w')
              }}
              fullWidth
            >
              {t('editor.startingPosition')}
            </Button>
          </Card>

          {/* ── État et sorties ────────────────────────────────── */}
          <Card className="p-3">
            <p
              className={clsx(
                'text-[14px] leading-snug',
                verdict.ok ? 'text-muted' : 'text-[var(--q-blunder)]',
              )}
            >
              {verdict.message}
            </p>

            <div className="mt-2.5 space-y-1.5">
              <Button
                variant="primary"
                icon={<Gauge size={15} />}
                onClick={analyse}
                disabled={!verdict.ok}
                fullWidth
              >
                {t('editor.analyseThis')}
              </Button>
              <Link
                href={`/jouer/ordinateur?fen=${encodeURIComponent(fen)}`}
                className={clsx('block', !verdict.ok && 'pointer-events-none opacity-50')}
              >
                <Button variant="secondary" icon={<Swords size={15} />} fullWidth>
                  {t('editor.playVsComputer')}
                </Button>
              </Link>
            </div>

            <label className="mt-3 block">
              <span className="mb-1 block text-[12px] font-semibold text-faint">FEN</span>
              <input
                value={fen}
                onChange={(event) => {
                  const value = event.target.value
                  setFen(value)
                  const side = value.split(' ')[1]
                  if (side === 'w' || side === 'b') setTurn(side)
                }}
                spellCheck={false}
                aria-label={t('editor.fenAria')}
                className="w-full rounded-[var(--radius-sm)] border border-line bg-surface px-2 py-1.5 font-mono text-[12px] focus:border-accent focus:outline-none"
              />
            </label>
          </Card>
        </div>
      </div>
    </div>
  )
}
