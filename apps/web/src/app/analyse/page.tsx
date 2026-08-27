'use client'

/**
 * Analyse de partie.
 *
 * L'écran clé de la plateforme. Deux moments :
 *
 *  1. **Import.** On colle un PGN, une FEN ou une liste de coups. Une partie
 *     qui vient de se terminer arrive automatiquement ici.
 *  2. **Relecture.** On navigue coup par coup ; à chaque position, le verdict,
 *     l'explication rédigée, le meilleur coup fléché sur l'échiquier, et la
 *     lecture à voix haute.
 *
 * Le parti pris est de ne jamais afficher un nombre sans le traduire : à côté
 * de « −2.4 » il y a toujours une phrase qui dit ce que ça signifie.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ClipboardPaste,
  Download,
  Gauge,
  Loader2,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react'
import clsx from 'clsx'
import { Chess } from 'chess.js'
import type { Color, Square } from 'chess.js'
import {
  QUALITY_STYLES,
  formatPgnDate,
  formatScore,
  toPgn,
  type MoveQuality,
} from '@coupparfait/core'
import { ChessBoard } from '@/components/board/ChessBoard.tsx'
import { ArrowLegend, LEGEND, legendFor } from '@/components/board/ArrowLegend.tsx'
import { EvalBar, EvalGraph } from '@/components/game/EvalBar.tsx'
import { MoveList } from '@/components/game/MoveList.tsx'
import { Button, Card, Chip, SectionTitle, Spinner } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import {
  parseAnalysisInput,
  runAnalysis,
  type AnalysisOutcome,
  type AnalysisProgress,
} from '@/lib/analysis/runner.ts'
import { useOpeningBook } from '@/lib/game/useOpeningBook.ts'
import { usePreferences } from '@/lib/store/preferences.ts'
import { useSan } from '@/lib/notation.ts'
import { speak, stopSpeaking } from '@/lib/speech.ts'
import type { Arrow } from '@/components/board/boardKit.ts'
import type { PlayedMove } from '@/lib/game/useChessGame.ts'

export default function AnalysisPage() {
  const [outcome, setOutcome] = useState<AnalysisOutcome | null>(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<AnalysisProgress | null>(null)

  if (!outcome) {
    return (
      <ImportScreen
        running={running}
        progress={progress}
        onStart={() => setRunning(true)}
        onProgress={setProgress}
        onDone={(result) => {
          setOutcome(result)
          setRunning(false)
          setProgress(null)
        }}
        onError={() => {
          setRunning(false)
          setProgress(null)
        }}
      />
    )
  }

  return <ReviewScreen outcome={outcome} onReset={() => setOutcome(null)} />
}

// ─────────────────────────────────────────────────────────────────────────────
//  Import
// ─────────────────────────────────────────────────────────────────────────────

function ImportScreen({
  running,
  progress,
  onStart,
  onProgress,
  onDone,
  onError,
}: {
  running: boolean
  progress: AnalysisProgress | null
  onStart: () => void
  onProgress: (progress: AnalysisProgress) => void
  onDone: (outcome: AnalysisOutcome) => void
  onError: () => void
}) {
  const [input, setInput] = useState('')
  // Vingt-deux : le moteur natif l'atteint sans peine, et c'est la profondeur
  // à partir de laquelle l'analyse départage deux bons coups au lieu de se
  // contenter de repérer les fautes visibles.
  const [depth, setDepth] = useState(22)
  const { book } = useOpeningBook()
  const locale = usePreferences((state) => state.locale)

  // Une partie qui vient de se terminer est déposée ici par la boîte de fin de
  // partie : on la reprend automatiquement, sans copier-coller.
  const [handedOver, setHandedOver] = useState(false)
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem('coupparfait.pendingAnalysis')
      if (pending) {
        setInput(pending)
        setHandedOver(true)
        sessionStorage.removeItem('coupparfait.pendingAnalysis')
      }
    } catch {
      // Stockage de session indisponible : sans conséquence.
    }
  }, [])

  const parsed = useMemo(() => (input.trim() ? parseAnalysisInput(input) : null), [input])

  const start = useCallback(async () => {
    if (!parsed || parsed.moves.length === 0) {
      toast.error('Aucun coup reconnu.', 'Colle un PGN, une FEN ou une liste de coups.')
      return
    }

    onStart()
    try {
      const result = await runAnalysis({
        moves: parsed.moves,
        startFen: parsed.startFen,
        depth,
        book,
        locale,
        onProgress,
      })
      onDone(result)
      toast.success(
        `Analyse terminée (${result.source === 'server' ? 'moteur serveur' : 'moteur navigateur'}).`,
      )
    } catch (error) {
      console.error(error)
      toast.error(
        'L’analyse a échoué.',
        error instanceof Error ? error.message : 'Réessaie dans un instant.',
      )
      onError()
    }
  }, [parsed, depth, book, locale, onStart, onProgress, onDone, onError])

  // Une partie arrivée depuis la fin d'une partie n'a pas à être relancée à la
  // main : on vient de la jouer, on veut la voir analysée, pas contempler un
  // champ de texte. On ne le fait qu'une fois, d'où le drapeau.
  const autoStarted = useRef(false)
  useEffect(() => {
    if (!handedOver || autoStarted.current || running) return
    if (!parsed || parsed.moves.length === 0) {
      // Rien d'exploitable : on laisse l'écran d'import visible avec le texte,
      // plutôt que de lancer une analyse vide.
      if (parsed !== null || input.trim()) {
        autoStarted.current = true
        toast.warning(
          'La partie transmise ne contenait aucun coup.',
          'Colle le PGN à la main, ou rejoue une partie.',
        )
      }
      return
    }
    autoStarted.current = true
    void start()
  }, [handedOver, parsed, running, input, start])

  const paste = useCallback(async () => {
    try {
      setInput(await navigator.clipboard.readText())
    } catch {
      toast.warning('Le presse-papiers est inaccessible.', 'Colle le texte à la main.')
    }
  }, [])

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-14">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Analyse expliquée
      </h1>
      <p className="mt-2 max-w-2xl text-muted">
        Colle une partie et découvre, coup par coup, ce qui a basculé — avec le meilleur coup
        montré sur l’échiquier et la raison écrite en toutes lettres.
      </p>

      <Card glow className="mt-7 overflow-hidden">
        <div className="p-5">
          <label htmlFor="pgn" className="mb-2 block text-sm font-medium">
            Partie à analyser
          </label>
          <textarea
            id="pgn"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={8}
            spellCheck={false}
            placeholder={
              '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6…\n\nou un PGN complet, ou une position FEN.'
            }
            className="w-full resize-y rounded-[var(--radius-sm)] border border-line bg-surface p-3 font-mono text-[13px] leading-relaxed placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_30%,transparent)]"
          />

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="ghost" icon={<ClipboardPaste size={14} />} onClick={paste}>
              Coller
            </Button>
            {parsed && (
              <Chip tone="success">
                {parsed.moves.length} demi-coups reconnus
                {parsed.headers.White && parsed.headers.Black
                  ? ` · ${parsed.headers.White} – ${parsed.headers.Black}`
                  : ''}
              </Chip>
            )}
            {input.trim() && !parsed && (
              <Chip tone="danger">Format non reconnu</Chip>
            )}
          </div>
        </div>

        <div className="border-t border-line/60 px-5 py-4">
          <label htmlFor="depth" className="mb-2 flex items-baseline justify-between text-sm">
            <span className="font-medium">Profondeur d’analyse</span>
            <span className="tabular-nums text-muted">{depth} demi-coups</span>
          </label>
          <input
            id="depth"
            type="range"
            min={10}
            max={26}
            value={depth}
            onChange={(event) => setDepth(Number(event.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full"
            style={{
              background: `linear-gradient(to right, var(--accent) ${((depth - 10) / 16) * 100}%, var(--surface-strong) ${((depth - 10) / 16) * 100}%)`,
            }}
          />
          <p className="mt-1.5 text-xs text-faint">
            Plus profond = plus fiable, mais plus long. 18 suffit pour repérer toutes les
            fautes d’un joueur de club ; 24 pour départager deux bons coups.
          </p>
        </div>

        <div className="border-t border-line/60 p-5">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={running}
            disabled={!parsed || running}
            onClick={start}
            icon={running ? undefined : <Gauge size={17} />}
          >
            {running ? 'Analyse en cours…' : 'Lancer l’analyse'}
          </Button>

          {running && progress && (
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs text-muted">
                <span>
                  {progress.phase === 'positions'
                    ? `Évaluation des positions (${progress.source === 'server' ? 'moteur serveur' : 'moteur navigateur'})`
                    : 'Rédaction des explications'}
                </span>
                <span className="tabular-nums">
                  {progress.done} / {progress.total}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-strong">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-300"
                  style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      <p className="mt-4 text-center text-xs text-faint">
        L’analyse tourne d’abord sur le Stockfish natif du serveur. S’il est indisponible,
        elle se poursuit dans ton navigateur, un peu moins profondément.
      </p>
    </div>
  )
}

/** Une étape de la démonstration : la position et le coup qui vient d'être joué. */
interface DemoFrame {
  fen: string
  from: Square
  to: Square
  san: string
}

/**
 * Déroule une suite en notation algébrique à partir d'une position.
 *
 * Un coup impossible interrompt la démonstration sans la faire échouer : on
 * montre ce qui a pu être montré. Une suite tronquée reste instructive, une
 * page blanche ne l'est pas.
 */
function buildDemoFrames(fen: string, line: string[]): DemoFrame[] {
  const board = new Chess(fen, { skipValidation: true })
  const frames: DemoFrame[] = []

  for (const san of line.slice(0, 8)) {
    try {
      const played = board.move(san)
      frames.push({ fen: board.fen(), from: played.from, to: played.to, san: played.san })
    } catch {
      break
    }
  }
  return frames
}

// ─────────────────────────────────────────────────────────────────────────────
//  Relecture
// ─────────────────────────────────────────────────────────────────────────────

function ReviewScreen({
  outcome,
  onReset,
}: {
  outcome: AnalysisOutcome
  onReset: () => void
}) {
  const { report, coach, source } = outcome
  const locale = usePreferences((state) => state.locale)
  const voiceEnabled = usePreferences((state) => state.voiceEnabled)
  const setPreference = usePreferences((state) => state.set)

  const format = useSan()
  const [cursor, setCursor] = useState(0)
  const [orientation, setOrientation] = useState<Color>('w')
  const [autoplay, setAutoplay] = useState(false)

  const move = report.moves[cursor] ?? null
  const explanation = report.explanations[cursor] ?? null

  /**
   * Démonstration de la suite recommandée.
   *
   * Lire « Cf3 Cc6 d4 exd4 » demande de déplacer les pièces dans sa tête — ce
   * qu'un débutant ne sait précisément pas encore faire. On les déplace donc
   * pour lui, coup par coup, sur l'échiquier qu'il a sous les yeux.
   *
   * L'état contient toute la ligne pré-calculée : rejouer depuis le début à
   * chaque image coûterait cher et risquerait de diverger.
   */
  const [demo, setDemo] = useState<{ frames: DemoFrame[]; at: number } | null>(null)

  const showBestLine = useCallback(() => {
    if (!move?.bestLine?.length) return
    const frames = buildDemoFrames(move.fenBefore, move.bestLine)
    if (frames.length === 0) return
    stopSpeaking()
    setDemo({ frames, at: 0 })
  }, [move])

  // Avance d'une image, puis s'efface pour rendre la position réelle.
  useEffect(() => {
    if (!demo) return
    const last = demo.at >= demo.frames.length - 1
    const timer = setTimeout(
      () => setDemo((current) => (current ? (last ? null : { ...current, at: current.at + 1 }) : null)),
      last ? 1400 : 850,
    )
    return () => clearTimeout(timer)
  }, [demo])

  // Changer de coup annule la démonstration : elle ne parlerait plus de rien.
  useEffect(() => setDemo(null), [cursor])

  // Lecture automatique du commentaire quand on change de coup.
  const spokenRef = useRef<number>(-1)
  useEffect(() => {
    if (!voiceEnabled || !explanation || spokenRef.current === cursor) return
    spokenRef.current = cursor
    speak(explanation.speech)
  }, [cursor, explanation, voiceEnabled])

  useEffect(() => () => stopSpeaking(), [])

  // Défilement automatique.
  useEffect(() => {
    if (!autoplay) return
    const timer = setTimeout(() => {
      if (cursor >= report.moves.length - 1) {
        setAutoplay(false)
        return
      }
      setCursor((c) => c + 1)
    }, 2600)
    return () => clearTimeout(timer)
  }, [autoplay, cursor, report.moves.length])

  const qualities = useMemo(() => {
    const map: Record<number, MoveQuality> = {}
    for (const analysed of report.moves) map[analysed.ply] = analysed.quality
    return map
  }, [report.moves])

  const playedMoves = useMemo<PlayedMove[]>(
    () =>
      report.moves.map((analysed) => ({
        san: analysed.san,
        uci: analysed.uci,
        from: analysed.uci.slice(0, 2) as never,
        to: analysed.uci.slice(2, 4) as never,
        piece: 'p' as never,
        color: analysed.color,
        before: analysed.fenBefore,
        after: analysed.fenAfter,
        at: 0,
        isCheck: analysed.san.includes('+'),
        isCheckmate: analysed.san.includes('#'),
        isCapture: analysed.san.includes('x'),
        isCastle: analysed.san.startsWith('O-O'),
      })),
    [report.moves],
  )

  // Flèches : le coup joué en vert, le meilleur coup en bleu s'il diffère.
  const arrows = useMemo<Arrow[]>(() => {
    if (demo) {
      const frame = demo.frames[demo.at]
      return frame ? [{ from: frame.from, to: frame.to, color: 'blue', weight: 'bold' }] : []
    }
    if (!move) return []
    const list: Arrow[] = [
      {
        from: move.uci.slice(0, 2) as never,
        to: move.uci.slice(2, 4) as never,
        color: move.quality === 'blunder' || move.quality === 'mistake' ? 'red' : 'green',
        weight: 'bold',
      },
    ]
    if (move.bestMove) {
      list.push({
        from: move.bestMove.uci.slice(0, 2) as never,
        to: move.bestMove.uci.slice(2, 4) as never,
        color: 'blue',
        weight: 'normal',
      })
    }
    return list
  }, [move, demo])

  const checkSquare = useMemo(() => {
    if (!move) return null
    const board = new Chess(move.fenAfter, { skipValidation: true })
    if (!board.inCheck()) return null
    return board.findPiece({ type: 'k', color: board.turn() })[0] ?? null
  }, [move])

  const exportPgn = useCallback(() => {
    const pgn = toPgn(report.moves, {
      annotate: true,
      includeEvaluations: true,
      locale,
      headers: {
        Event: 'Analyse Le Coup Parfait',
        Date: formatPgnDate(new Date()),
        ECO: report.opening?.eco,
        Opening: report.opening?.name,
      },
      comments: Object.fromEntries(
        report.moves.map((analysed, index) => [
          analysed.ply,
          report.explanations[index]?.headline ?? '',
        ]),
      ),
    })

    const blob = new Blob([pgn], { type: 'application/x-chess-pgn' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'partie-analysee.pgn'
    link.click()
    URL.revokeObjectURL(url)
  }, [report, locale])

  const style = move ? QUALITY_STYLES[move.quality] : null

  return (
    <div className="mx-auto w-full max-w-[1600px] px-2 py-3 sm:px-4 lg:py-6">
      {/* ── En-tête ────────────────────────────────────────────────── */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Chip tone="accent">
          <Sparkles size={11} aria-hidden />
          {source === 'server' ? 'Stockfish serveur' : 'Stockfish navigateur'}
        </Chip>
        {report.opening && (
          <Chip>
            {report.opening.eco} · {report.opening.name}
          </Chip>
        )}
        <div className="ml-auto flex gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            icon={voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            onClick={() => {
              if (voiceEnabled) stopSpeaking()
              setPreference('voiceEnabled', !voiceEnabled)
            }}
          >
            {voiceEnabled ? 'Voix activée' : 'Voix coupée'}
          </Button>
          <Button size="sm" variant="ghost" icon={<Download size={14} />} onClick={exportPgn}>
            PGN
          </Button>
          <Button size="sm" variant="secondary" onClick={onReset}>
            Autre partie
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_440px]">
        {/* ── Échiquier ────────────────────────────────────────────── */}
        <div className="min-w-0">
          <div className="flex gap-2">
            <EvalBar
              score={move?.scoreAfter ?? null}
              orientation={orientation}
              className="hidden sm:block"
            />
            <div className="min-w-0 flex-1">
              <ChessBoard
                fen={
                  demo?.frames[demo.at]?.fen ??
                  move?.fenAfter ??
                  report.moves[0]?.fenBefore ??
                  ''
                }
                orientation={orientation}
                playable={null}
                lastMove={
                  demo
                    ? null
                    : move
                      ? {
                          from: move.uci.slice(0, 2) as never,
                          to: move.uci.slice(2, 4) as never,
                        }
                      : null
                }
                checkSquare={demo ? null : checkSquare}
                highlights={demo ? [] : (report.explanations[cursor]?.highlights ?? [])}
                arrows={arrows}
                // Cliquer la flèche bleue déroule la suite recommandée : c'est
                // la question qu'elle pose et à laquelle elle ne répondait pas.
                onArrowClick={(arrow) => {
                  if (arrow.color === 'blue') showBestLine()
                  else if (explanation) speak(explanation.speech)
                }}
                instant={!demo}
              />
            </div>
          </div>

          <ArrowLegend
            items={legendFor(arrows, [
              { ...LEGEND.played, label: move ? `${move.san} — le coup joué` : LEGEND.played.label },
              {
                ...LEGEND.playedBad,
                label: move ? `${move.san} — erreur` : LEGEND.playedBad.label,
              },
              {
                ...LEGEND.best,
                label: move?.bestMove
                  ? `${move.bestMove.san} — coup conseillé`
                  : LEGEND.best.label,
              },
            ])}
            className="mt-2"
          />

          <div className="mt-2 flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
            >
              Retourner
            </Button>
            <div className="min-w-0 flex-1">
              <EvalGraph
                values={report.evalCurve}
                cursor={cursor}
                turningPoints={report.turningPoints}
                onSeek={(ply) => setCursor(Math.max(0, Math.min(report.moves.length - 1, ply)))}
              />
            </div>
          </div>

          {/* ── Bilan ────────────────────────────────────────────── */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(['w', 'b'] as const).map((colour) => (
              <PlayerReport
                key={colour}
                colour={colour}
                accuracy={report.accuracy[colour]}
                acpl={report.acpl[colour]}
                counts={report.counts[colour]}
                estimatedElo={report.estimatedElo[colour]}
                coach={coach[colour]}
              />
            ))}
          </div>
        </div>

        {/* ── Panneau latéral ──────────────────────────────────────── */}
        <div className="flex min-h-0 flex-col gap-3">
          {/* Verdict du coup courant */}
          {move && style && explanation && (
            <Card glow className="overflow-hidden">
              <div
                className="h-1"
                style={{ background: `var(--q-${style.token})` }}
                aria-hidden
              />
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold"
                    style={{
                      background: `color-mix(in oklab, var(--q-${style.token}) 20%, transparent)`,
                      color: `var(--q-${style.token})`,
                    }}
                    aria-hidden
                  >
                    {style.glyph}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug">{explanation.headline}</p>
                    <p className="mt-0.5 text-xs tabular-nums text-faint">
                      Coup {move.moveNumber} · {move.color === 'w' ? 'Blancs' : 'Noirs'} ·{' '}
                      {formatScore(move.scoreBefore)} → {formatScore(move.scoreAfter)}
                      {move.winLoss >= 1 && ` · −${move.winLoss.toFixed(0)} pts de victoire`}
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  {explanation.body.map((paragraph, index) => (
                    <p key={index} className="text-[13px] leading-relaxed text-muted">
                      {paragraph}
                    </p>
                  ))}
                </div>

                {explanation.motifs.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {explanation.motifs.map((motif) => (
                      <Chip key={motif.id} tone="accent" title={motif.definition}>
                        {motif.name}
                      </Chip>
                    ))}
                  </div>
                )}

                {move.bestLine && move.bestLine.length > 0 && move.bestMove && (
                  <div className="mt-3 rounded-[var(--radius-sm)] bg-surface p-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
                        Suite recommandée
                      </p>
                      {/* Lire « Cf3 Cc6 d4 exd4 » suppose de déplacer les
                          pièces dans sa tête. On les déplace pour de vrai. */}
                      <button
                        type="button"
                        onClick={showBestLine}
                        className="shrink-0 text-[11px] font-semibold text-accent transition-colors hover:underline"
                      >
                        {demo ? `${demo.at + 1} / ${demo.frames.length}` : '▶ Montrer'}
                      </button>
                    </div>
                    <p className="mt-1 font-mono text-[13px]">
                      {move.bestLine.map((san, index) => (
                        <span
                          key={index}
                          className={clsx(
                            'mr-2 rounded px-0.5',
                            demo && index === demo.at && 'bg-accent/25 text-ink',
                          )}
                        >
                          {format(san)}
                        </span>
                      ))}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card className="flex min-h-[240px] flex-1 flex-col overflow-hidden">
            <MoveList
              moves={playedMoves}
              cursor={cursor}
              onSeek={(ply) => setCursor(Math.max(0, Math.min(report.moves.length - 1, ply)))}
              qualities={qualities}
              autoplay={autoplay}
              onToggleAutoplay={() => setAutoplay((value) => !value)}
              className="min-h-0 flex-1"
            />
          </Card>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Bilan par joueur
// ─────────────────────────────────────────────────────────────────────────────

function PlayerReport({
  colour,
  accuracy,
  acpl,
  counts,
  estimatedElo,
  coach,
}: {
  colour: Color
  accuracy: number
  acpl: number
  counts: Record<MoveQuality, number>
  estimatedElo: number
  coach: AnalysisOutcome['coach']['w']
}) {
  // On n'affiche que les catégories qui apportent une information.
  const shown: MoveQuality[] = [
    'brilliant',
    'great',
    'best',
    'book',
    'inaccuracy',
    'mistake',
    'blunder',
    'miss',
  ]

  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="flex items-center gap-2 font-semibold">
          <span
            className={clsx(
              'h-3 w-3 rounded-full',
              colour === 'w' ? 'bg-[var(--eval-white)]' : 'bg-[var(--eval-black)] ring-1 ring-line',
            )}
            aria-hidden
          />
          {colour === 'w' ? 'Blancs' : 'Noirs'}
        </h3>
        <div className="text-right">
          <span className="font-display text-2xl font-bold tabular-nums">
            {accuracy.toFixed(1)}
            <span className="text-sm text-muted"> %</span>
          </span>
        </div>
      </div>

      <p className="mt-0.5 text-xs text-faint">
        perte moyenne {acpl} centipions · niveau estimé ≈ {estimatedElo} Elo
      </p>

      <div className="mt-3 flex flex-wrap gap-1">
        {shown
          .filter((quality) => counts[quality] > 0)
          .map((quality) => {
            const style = QUALITY_STYLES[quality]
            return (
              <span
                key={quality}
                className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[11px] font-semibold"
                style={{
                  background: `color-mix(in oklab, var(--q-${style.token}) 16%, transparent)`,
                  color: `var(--q-${style.token})`,
                }}
                title={style.label.fr}
              >
                {style.glyph} {counts[quality]}
              </span>
            )
          })}
      </div>

      <div className="mt-3 border-t border-line/60 pt-3">
        <p className="text-[13px] font-medium leading-snug">{coach.headline}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">{coach.focus}</p>
      </div>
    </Card>
  )
}
