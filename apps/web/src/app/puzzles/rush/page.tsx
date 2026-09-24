'use client'

/**
 * Manche chronométrée.
 *
 * Les puzzles ordinaires apprennent à *trouver* ; celui-ci apprend à
 * *reconnaître*. C'est une autre compétence, et celle qui manque le plus en
 * partie rapide : voir la fourchette en une seconde, pas en trente.
 *
 * Trois erreurs et la manche s'arrête. Ce n'est pas une punition mais une
 * borne : sans elle on s'acharne sur un puzzle trop dur et la manche perd son
 * sens, qui est d'enchaîner.
 *
 * Le meilleur score reste dans le navigateur. Le mettre en base supposerait
 * une table et un classement, donc une compétition — or on cherche ici à se
 * comparer à soi-même.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Chess } from 'chess.js'
import type { Color, Square } from 'chess.js'
import { Check, Flame, RotateCcw, Timer, X } from 'lucide-react'
import clsx from 'clsx'
import { useT, type TranslationKey } from '@/lib/i18n/index.tsx'
import { ChessBoard } from '@/components/board/ChessBoard.tsx'
import { Button, Card, SectionTitle, Spinner } from '@/components/ui/index.tsx'
import { playMoveFor, playSound } from '@/lib/sound.ts'

interface Puzzle {
  id: string
  fen: string
  moves: string[]
  rating: number
}

type Mode = '3min' | '5min' | 'survie'

const MODES: Array<{
  id: Mode
  labelKey: TranslationKey
  seconds: number | null
  hintKey: TranslationKey
}> = [
  {
    id: '3min',
    labelKey: 'rush.threeMinutes',
    seconds: 180,
    hintKey: 'rush.threeMinutesHint',
  },
  {
    id: '5min',
    labelKey: 'rush.fiveMinutes',
    seconds: 300,
    hintKey: 'rush.fiveMinutesHint',
  },
  {
    id: 'survie',
    labelKey: 'rush.survival',
    seconds: null,
    hintKey: 'rush.survivalHint',
  },
]

/** Nombre d'erreurs qui arrête la manche. */
const MAX_ERRORS = 3

/** Longueur de la série demandée : assez pour ne jamais en manquer. */
const SERIES = 40

const BEST_KEY = 'coupparfait.rushBest'

export default function RushPage() {
  const t = useT()
  const [mode, setMode] = useState<Mode>('3min')
  const [phase, setPhase] = useState<'choix' | 'chargement' | 'jeu' | 'fin'>('choix')

  const [series, setSeries] = useState<Puzzle[]>([])
  const [index, setIndex] = useState(0)
  const [board, setBoard] = useState(() => new Chess())
  const [moveIndex, setMoveIndex] = useState(0)
  const [, force] = useState(0)

  const [solved, setSolved] = useState(0)
  const [errors, setErrors] = useState(0)
  const [left, setLeft] = useState(0)
  const [flash, setFlash] = useState<'bon' | 'faux' | null>(null)
  const [best, setBest] = useState(0)

  const deadline = useRef<number | null>(null)

  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem(BEST_KEY) ?? 0))
    } catch {
      // Stockage refusé : on jouera sans record.
    }
  }, [])

  // ── Chronomètre ─────────────────────────────────────────────────────────
  // Les dix dernières secondes s'entendent : le chiffre est en haut de l'écran,
  // et les yeux sont sur l'échiquier. Une seule fois par manche — d'où la
  // référence plutôt qu'un état, qui rejouerait le son à chaque battement.
  const alerteTemps = useRef(false)
  useEffect(() => {
    if (phase !== 'jeu') {
      alerteTemps.current = false
      return
    }
    if (deadline.current === null) return
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.round((deadline.current! - Date.now()) / 1000))
      setLeft(remaining)
      if (remaining <= 10 && remaining > 0 && !alerteTemps.current) {
        alerteTemps.current = true
        playSound('lowtime')
      }
      if (remaining === 0) setPhase('fin')
    }, 250)
    return () => clearInterval(timer)
  }, [phase])

  // ── Fin de manche ───────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'fin') return
    playSound(solved > best ? 'victory' : 'defeat')
    if (solved > best) {
      setBest(solved)
      try {
        localStorage.setItem(BEST_KEY, String(solved))
      } catch {
        // Sans stockage, le record ne survivra pas à la page.
      }
    }
  }, [phase, solved, best])

  /** Prépare le puzzle : la position part du coup adverse, comme d'habitude. */
  const load = useCallback((puzzle: Puzzle) => {
    const next = new Chess(puzzle.fen)
    const opening = puzzle.moves[0]
    if (opening) {
      const coup = next.move({
        from: opening.slice(0, 2) as Square,
        to: opening.slice(2, 4) as Square,
        promotion: opening.length > 4 ? (opening[4] as never) : undefined,
      })
      /*
        Le coup d'ouverture s'entend.

        La manche était muette : seuls l'erreur et la réussite faisaient du
        bruit, et les pièces se déplaçaient en silence — celles de l'adversaire
        comme les siennes. Or c'est ici que le son sert le plus : on enchaîne
        quarante positions les yeux sur l'échiquier, et le « clac » d'une prise
        dit ce qui vient de se passer sans qu'on ait à relire la position.
      */
      playMoveFor(coup)
    }
    setBoard(next)
    setMoveIndex(1)
    force((n) => n + 1)
  }, [])

  const start = useCallback(async () => {
    setPhase('chargement')
    try {
      const response = await fetch(`/api/puzzles?rush=${SERIES}`)
      const data: { puzzles?: Puzzle[] } = await response.json()
      if (!data.puzzles || data.puzzles.length === 0) {
        setPhase('choix')
        return
      }
      setSeries(data.puzzles)
      setIndex(0)
      setSolved(0)
      setErrors(0)
      load(data.puzzles[0]!)

      const seconds = MODES.find((entry) => entry.id === mode)!.seconds
      deadline.current = seconds ? Date.now() + seconds * 1000 : null
      setLeft(seconds ?? 0)
      // Le coup d'envoi. Il dit que le chronomètre part — et c'est le moment
      // où l'on baisse les yeux sur l'échiquier.
      playSound('start')
      setPhase('jeu')
    } catch {
      setPhase('choix')
    }
  }, [mode, load])

  const nextPuzzle = useCallback(() => {
    const next = index + 1
    if (next >= series.length) {
      setPhase('fin')
      return
    }
    setIndex(next)
    load(series[next]!)
  }, [index, series, load])

  const onMove = useCallback(
    (from: Square, to: Square, promotion?: string) => {
      const puzzle = series[index]
      if (!puzzle || phase !== 'jeu') return

      const expected = puzzle.moves[moveIndex]
      /*
        La pièce de promotion compte, quand la solution en désigne une.

        La seconde branche de la comparaison — les quatre premiers caractères —
        annulait la première : elle acceptait n'importe quelle promotion sur les
        bonnes cases, y compris sur un puzzle de sous-promotion où le choix de
        la pièce est tout l'exercice. Même correction que sur l'écran de puzzles
        ordinaire.
      */
      const promotionAttendue = expected && expected.length > 4 ? expected[4] : null
      const played = `${from}${to}${promotionAttendue ? (promotion ?? 'q') : ''}`

      // Un mat par un autre chemin reste un mat : on essaie le coup avant de
      // le refuser sur la seule comparaison de chaînes.
      const probe = new Chess(board.fen())
      let ok = played === expected
      if (!ok) {
        try {
          probe.move({ from, to, promotion: (promotion ?? 'q') as never })
          ok = probe.isCheckmate()
        } catch {
          ok = false
        }
      }

      if (!ok) {
        setFlash('faux')
        setTimeout(() => setFlash(null), 350)
        playSound('error')
        const count = errors + 1
        setErrors(count)
        if (count >= MAX_ERRORS) setPhase('fin')
        else nextPuzzle()
        return
      }

      const next = new Chess(board.fen())
      playMoveFor(next.move({ from, to, promotion: (promotion ?? 'q') as never }))
      setBoard(next)

      const after = moveIndex + 1
      if (after >= puzzle.moves.length || next.isCheckmate()) {
        setFlash('bon')
        setTimeout(() => setFlash(null), 250)
        playSound('confirm')
        setSolved((value) => value + 1)
        nextPuzzle()
        return
      }

      // Réponse adverse, puis c'est de nouveau à nous.
      const reply = puzzle.moves[after]!
      setTimeout(() => {
        const withReply = new Chess(next.fen())
        playMoveFor(
          withReply.move({
            from: reply.slice(0, 2) as Square,
            to: reply.slice(2, 4) as Square,
            promotion: reply.length > 4 ? (reply[4] as never) : undefined,
          }),
        )
        setBoard(withReply)
        setMoveIndex(after + 1)
      }, 180)
    },
    [series, index, moveIndex, board, errors, phase, nextPuzzle],
  )

  // ── Écrans ──────────────────────────────────────────────────────────────
  if (phase === 'choix' || phase === 'chargement') {
    return (
      <div className="page-etroite">
        <SectionTitle hint={t('rush.hint')}>{t('rush.title')}</SectionTitle>

        <div className="mt-4 space-y-2">
          {MODES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setMode(entry.id)}
              className={clsx(
                'w-full rounded-[var(--radius)] border p-3 text-left transition-colors',
                mode === entry.id
                  ? 'border-accent bg-accent/10'
                  : 'border-line hover:bg-surface-hover',
              )}
            >
              <span className="block text-sm font-semibold">{t(entry.labelKey)}</span>
              <span className="mt-0.5 block text-[14px] text-muted">{t(entry.hintKey)}</span>
            </button>
          ))}
        </div>

        {best > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-[14px] text-muted">
            <Flame size={14} className="text-[var(--q-inaccuracy)]" aria-hidden />
            {t('rush.recordIs')} <strong className="font-semibold text-ink">{best}</strong>{' '}
            {t('rush.puzzlesWord')}
          </p>
        )}

        <Button
          variant="primary"
          size="lg"
          fullWidth
          className="mt-4"
          onClick={() => void start()}
          disabled={phase === 'chargement'}
          icon={phase === 'chargement' ? <Spinner size={16} /> : <Timer size={16} />}
        >
          {t(phase === 'chargement' ? 'rush.preparing' : 'rush.start')}
        </Button>

        <p className="mt-4 text-center text-xs text-faint">
          {t('rush.footer')}{' '}
          <Link href="/puzzles" className="text-accent hover:underline">
            {t('rush.backToPuzzles')}
          </Link>
        </p>
      </div>
    )
  }

  if (phase === 'fin') {
    const record = solved >= best && solved > 0
    return (
      <div className="mx-auto grid min-h-[60dvh] w-full max-w-md place-items-center px-4">
        <Card glow className="w-full p-6 text-center">
          <p className="font-display text-5xl font-bold tabular-nums">{solved}</p>
          <p className="mt-1 text-sm text-muted">
            {t(solved > 1 ? 'rush.solvedCount' : 'rush.solvedOne')}
          </p>
          {record ? (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-[var(--q-best)]">
              <Flame size={15} aria-hidden />
              {t('rush.newRecord')}
            </p>
          ) : (
            <p className="mt-3 text-[14px] text-faint">{t('rush.recordStays', { n: best })}</p>
          )}
          <div className="mt-5 space-y-1.5">
            <Button
              variant="primary"
              fullWidth
              icon={<RotateCcw size={15} />}
              onClick={() => void start()}
            >
              {t('rush.playAgain')}
            </Button>
            <Button variant="ghost" fullWidth onClick={() => setPhase('choix')}>
              {t('rush.changeMode')}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const turn: Color = board.turn()
  const modeCourant = MODES.find((entry) => entry.id === mode)
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-4">
      {/* ── L'en-tête de la manche ───────────────────────────────────
          L'écran de jeu n'avait ni titre ni sortie : la barre du bas s'efface
          ici — c'est un écran immersif —, et l'on se retrouvait devant un
          échiquier, trois croix et un chronomètre, sans savoir sur quelle page
          on était ni comment en partir autrement qu'en épuisant ses trois
          erreurs. Une ligne suffit : ce qu'on fait, dans quel mode, et le
          bouton pour s'arrêter. */}
      <div className="mb-2 flex items-center gap-2">
        <h1 className="font-display text-base font-bold tracking-tight">{t('rush.title')}</h1>
        {modeCourant && (
          <span className="rounded-full bg-surface px-2 py-0.5 text-[12px] font-medium text-muted">
            {t(modeCourant.labelKey)}
          </span>
        )}
        <button
          type="button"
          onClick={() => setPhase('fin')}
          className="ml-auto rounded-[var(--radius-sm)] px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-surface-hover hover:text-ink"
        >
          {t('rush.stopRun')}
        </button>
      </div>

      {/* ── Compteurs ────────────────────────────────────────────── */}
      <div className="mb-2 flex items-center gap-3">
        <span className="font-display text-2xl font-bold tabular-nums">{solved}</span>
        <span className="text-[14px] text-muted">{t('rush.solvedWord')}</span>

        <span
          className="ml-auto flex items-center gap-1"
          aria-label={t(errors > 1 ? 'rush.errorsOf' : 'rush.errorsOfOne', {
            n: errors,
            max: MAX_ERRORS,
          })}
        >
          {Array.from({ length: MAX_ERRORS }, (_, i) => (
            <X
              key={i}
              size={16}
              className={i < errors ? 'text-[var(--q-blunder)]' : 'text-line'}
              aria-hidden
            />
          ))}
        </span>

        {deadline.current !== null && (
          <span
            className={clsx(
              'flex items-center gap-1 tabular-nums',
              left <= 15 ? 'font-bold text-[var(--q-blunder)]' : 'text-muted',
            )}
          >
            <Timer size={15} aria-hidden />
            {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
          </span>
        )}
      </div>

      <div
        className={clsx(
          'rounded-[var(--radius)] transition-shadow',
          flash === 'bon' && 'shadow-[0_0_0_3px_var(--q-best)]',
          flash === 'faux' && 'shadow-[0_0_0_3px_var(--q-blunder)]',
        )}
      >
        <ChessBoard
          fen={board.fen()}
          orientation={turn}
          playable={turn}
          legalMoves={undefined}
          onMove={onMove}
          showViewToggle={false}
          reservedHeight={12}
        />
      </div>

      <p className="mt-2 flex items-center justify-center gap-1.5 text-[14px] text-muted">
        <Check size={14} className="text-accent" aria-hidden />
        {t(turn === 'w' ? 'rush.whiteToPlay' : 'rush.blackToPlay')}
      </p>
    </div>
  )
}
