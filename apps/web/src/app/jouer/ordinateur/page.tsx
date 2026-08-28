'use client'

/**
 * Partie contre l'ordinateur.
 *
 * Deux écrans successifs : le choix de l'adversaire, puis la partie elle-même.
 * Le choix reste volontairement court — un curseur de niveau, une couleur, une
 * cadence — parce qu'un formulaire de douze champs est le meilleur moyen de
 * décourager quelqu'un qui voulait juste jouer.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Eye,
  Flag,
  Handshake,
  Lightbulb,
  Play,
  RefreshCw,
  Trophy,
  RotateCcw,
  Undo2,
} from 'lucide-react'
import clsx from 'clsx'
import { GameNav } from '@/components/game/GameNav.tsx'
import { useSan } from '@/lib/notation.ts'
import type { Color, PieceSymbol, Square } from 'chess.js'
import {
  BOT_LEVELS,
  BOT_PERSONALITIES,
  SPEED_LABELS,
  TIME_CONTROLS,
  applyMove,
  botLevel,
  createClock,
  flaggedColor,
  formatScore,
  sanToFrench,
  remainingAt,
  speedCategory,
  stopClock,
  suggestedLevel,
  type ClockState,
  type GameResult,
  type GameStatus,
  type TimeControl,
} from '@coupparfait/core'
import { ChessBoard } from '@/components/board/ChessBoard.tsx'
import { EvalBar } from '@/components/game/EvalBar.tsx'
import { MoveList } from '@/components/game/MoveList.tsx'
import { PlayerBar } from '@/components/game/PlayerBar.tsx'
import { TurnIndicator } from '@/components/game/TurnIndicator.tsx'
import { OpeningBanner } from '@/components/game/OpeningBanner.tsx'
import {
  CommentaryPanel,
  CommentaryToggle,
  commentaryArrows,
  commentaryLegend,
  useLiveCommentary,
  type Alternative,
} from '@/components/game/LiveCommentary.tsx'
import {
  ArrowLegend,
  LEGEND,
  legendFor,
  type LegendItem,
} from '@/components/board/ArrowLegend.tsx'
import { GameOverDialog } from '@/components/game/GameOverDialog.tsx'
import { Button, Card, Chip, SegmentedControl, SectionTitle } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import { useChessGame } from '@/lib/game/useChessGame.ts'
import { requestHint, useBotPlayer } from '@/lib/game/useBotPlayer.ts'
import { useCurrentOpening, useOpeningBook } from '@/lib/game/useOpeningBook.ts'
import { playMoveSound, playResultSound, playSound } from '@/lib/sound.ts'
import { usePreferences } from '@/lib/store/preferences.ts'
import { speak } from '@/lib/speech.ts'
import type { Arrow } from '@/components/board/boardKit.ts'

type Phase = 'setup' | 'playing'

interface Setup {
  level: number
  color: Color | 'random'
  timeControlId: string
  /** Affronter Maia — un réseau humain — plutôt que Stockfish bridé. */
  human: boolean
}

export default function PlayComputerPage() {
  const [phase, setPhase] = useState<Phase>('setup')
  const [setup, setSetup] = useState<Setup>({
    level: 6,
    color: 'w',
    timeControlId: '600+5',
    // Par défaut : un adversaire qui se trompe comme un humain. C'est ce
    // qu'on veut faire affronter à quelqu'un qui débute.
    human: true,
  })
  const [resolvedColor, setResolvedColor] = useState<Color>('w')
  const [gameKey, setGameKey] = useState(0)

  const start = useCallback((next: Setup) => {
    setSetup(next)
    setResolvedColor(
      next.color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : next.color,
    )
    setGameKey((key) => key + 1)
    setPhase('playing')
    playSound('start')
  }, [])

  if (phase === 'setup') {
    return <SetupScreen initial={setup} onStart={start} />
  }

  return (
    <GameScreen
      key={gameKey}
      level={setup.level}
      playerColor={resolvedColor}
      timeControlId={setup.timeControlId}
      human={setup.human}
      onNewGame={() => setPhase('setup')}
      onRematch={() => {
        setResolvedColor(
          setup.color === 'random'
            ? Math.random() < 0.5
              ? 'w'
              : 'b'
            : resolvedColor === 'w'
              ? 'b'
              : 'w',
        )
        setGameKey((key) => key + 1)
      }}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Écran de configuration
// ─────────────────────────────────────────────────────────────────────────────

function SetupScreen({
  initial,
  onStart,
}: {
  initial: Setup
  onStart: (setup: Setup) => void
}) {
  const [level, setLevel] = useState(initial.level)
  const [color, setColor] = useState<Color | 'random'>(initial.color)
  const [timeControlId, setTimeControlId] = useState(initial.timeControlId)
  const [human, setHuman] = useState(initial.human)

  /**
   * Maia est-elle installée sur ce serveur ?
   *
   * On ne propose pas un adversaire qu'on ne peut pas fournir : la case
   * n'apparaît que si le serveur a Lc0 et les poids.
   */
  const [maiaReady, setMaiaReady] = useState(false)
  useEffect(() => {
    void fetch('/api/sante')
      .then((response) => response.json())
      .then((data: { maia?: boolean }) => setMaiaReady(data.maia === true))
      .catch(() => setMaiaReady(false))
  }, [])

  /** Où en est le joueur dans l'échelle. `null` tant qu'on ne sait pas. */
  const [progress, setProgress] = useState<Progression | null>(null)
  useEffect(() => {
    void fetch('/api/progression')
      .then((response) => response.json())
      .then(setProgress)
      .catch(() => setProgress(null))
  }, [])

  const bot = botLevel(level)
  const personality = BOT_PERSONALITIES[bot.personality]

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-14">
      <Link
        href="/jouer"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} aria-hidden />
        Retour au choix du mode
      </Link>

      <h1 className="font-display text-3xl font-bold tracking-tight">
        Contre l’ordinateur
      </h1>
      <p className="mt-2 text-muted">
        Vingt-cinq niveaux et sept personnalités. Choisis un adversaire un peu au-dessus de
        toi : c’est là qu’on progresse le plus vite.
      </p>

      {/* ── Adversaire ─────────────────────────────────────────────── */}
      <Card glow className="mt-7 overflow-hidden">
        <div className="flex items-center gap-4 p-5">
          <span
            className="grid h-16 w-16 shrink-0 place-items-center rounded-[var(--radius)] text-3xl"
            style={{
              background: 'color-mix(in oklab, var(--accent) 15%, transparent)',
              boxShadow: 'var(--glow)',
            }}
            aria-hidden
          >
            {personality.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="font-display text-xl font-semibold">{personality.name.fr}</h2>
              <Chip tone="accent">≈ {bot.elo} Elo</Chip>
              <Chip>Niveau {bot.level}</Chip>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{personality.blurb.fr}</p>
          </div>
        </div>

        {/*
          Les vingt-cinq niveaux s'offraient tous d'emblée : un débutant
          choisissait au hasard, tombait sur trop fort, et en concluait qu'il
          était mauvais. On montre donc où il en est, et jusqu'où il peut
          monter — sans rien interdire, la barre reste entière.
        */}
        {/*
          Le choix de l'adversaire, et non une case à cocher.
          
          « Qui vais-je affronter » est une question à deux réponses, pas une
          option à activer : une case laisse croire à un réglage accessoire
          alors que c'est ce qui change tout dans la partie.
        */}
        {maiaReady && (
          <div className="border-t border-line/60 px-5 py-4">
            <p className="mb-2 text-sm font-medium">Adversaire</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {[
                {
                  id: true,
                  nom: 'Maia',
                  resume: 'Joue comme un humain',
                  detail:
                    'Réseau entraîné sur des millions de parties réelles. Il se trompe comme on se trompe vraiment à ce niveau.',
                },
                {
                  id: false,
                  nom: 'Stockfish',
                  resume: 'Le moteur classique',
                  detail:
                    'Le plus fort du monde, bridé au niveau voulu. Joue juste, puis lâche un coup faible d’un coup.',
                },
              ].map((choix) => (
                <button
                  key={choix.nom}
                  type="button"
                  onClick={() => setHuman(choix.id)}
                  aria-pressed={human === choix.id}
                  className={clsx(
                    'rounded-[var(--radius-sm)] border p-3 text-left transition-colors',
                    human === choix.id
                      ? 'border-accent bg-accent/10'
                      : 'border-line hover:bg-surface-hover',
                  )}
                >
                  <span className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold">{choix.nom}</span>
                    <span className="text-[11px] text-faint">{choix.resume}</span>
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted">
                    {choix.detail}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {progress && progress.tracked && (
          <div className="border-t border-line/60 px-5 py-3">
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <Trophy size={15} className="shrink-0 text-accent" aria-hidden />
              {progress.defeated === 0 ? (
                <span className="text-muted">
                  Aucun niveau battu pour l’instant. Commence par le premier — il apprend en
                  même temps que toi.
                </span>
              ) : (
                <span className="text-muted">
                  Plus haut niveau battu :{' '}
                  <strong className="font-semibold text-ink">{progress.defeated}</strong>{' '}
                  ({botLevel(progress.defeated).elo} Elo) · {progress.wins} victoire
                  {progress.wins > 1 ? 's' : ''} sur {progress.attempts} parties
                </span>
              )}
            </div>
            {progress.defeated < BOT_LEVELS.length && (
              <button
                type="button"
                onClick={() => setLevel(Math.min(BOT_LEVELS.length, progress.defeated + 1))}
                className="mt-1.5 text-[12px] font-semibold text-accent hover:underline"
              >
                Affronter le niveau {Math.min(BOT_LEVELS.length, progress.defeated + 1)} — le
                prochain à battre
              </button>
            )}
          </div>
        )}

        <div className="border-t border-line/60 px-5 py-4">
          <label htmlFor="level" className="mb-2 block text-sm font-medium">
            Niveau de difficulté
          </label>
          <input
            id="level"
            type="range"
            min={1}
            max={BOT_LEVELS.length}
            step={1}
            value={level}
            onChange={(event) => setLevel(Number(event.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full"
            style={{
              background: `linear-gradient(to right, var(--accent) ${((level - 1) / (BOT_LEVELS.length - 1)) * 100}%, var(--surface-strong) ${((level - 1) / (BOT_LEVELS.length - 1)) * 100}%)`,
            }}
          />
          <div className="mt-1.5 flex justify-between text-[11px] text-faint">
            <span>1 · débutant complet (250)</span>
            <span>25 · surhumain (3200)</span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {[
              { label: 'Je débute', level: 3 },
              { label: 'Occasionnel', level: 7 },
              { label: 'Club', level: 12 },
              { label: 'Fort', level: 18 },
              { label: 'Sans pitié', level: 25 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setLevel(preset.level)}
                className={clsx(
                  'rounded-[var(--radius-sm)] border px-2 py-2 text-xs font-medium transition-colors',
                  level === preset.level
                    ? 'border-accent bg-accent/15 text-ink'
                    : 'border-line text-muted hover:bg-surface-hover',
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Couleur et cadence ─────────────────────────────────────── */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <SectionTitle>Ta couleur</SectionTitle>
          <SegmentedControl
            value={color}
            onChange={setColor}
            label="Couleur"
            options={[
              { value: 'w' as const, label: '♔ Blancs' },
              { value: 'b' as const, label: '♚ Noirs' },
              { value: 'random' as const, label: '🎲 Hasard' },
            ]}
          />
          <p className="mt-3 text-xs text-faint">
            Les Blancs jouent en premier et ont un petit avantage. Pour apprendre, alterne.
          </p>
        </Card>

        <Card className="p-5">
          <SectionTitle>Cadence</SectionTitle>
          <div className="grid grid-cols-3 gap-1.5">
            {TIME_CONTROLS.filter((tc) =>
              ['180+0', '300+0', '300+3', '600+0', '600+5', '900+10', '1800+0', '0+0'].includes(
                tc.id,
              ),
            ).map((tc) => (
              <button
                key={tc.id}
                type="button"
                onClick={() => setTimeControlId(tc.id)}
                className={clsx(
                  'rounded-[var(--radius-sm)] border px-2 py-2 text-xs font-medium transition-colors',
                  timeControlId === tc.id
                    ? 'border-accent bg-accent/15 text-ink'
                    : 'border-line text-muted hover:bg-surface-hover',
                )}
              >
                <span className="block">{SPEED_LABELS[tc.category].icon}</span>
                {tc.label}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        className="mt-6"
        onClick={() => onStart({ level, color, timeControlId, human: human && maiaReady })}
      >
        Commencer la partie
      </Button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Écran de jeu
// ─────────────────────────────────────────────────────────────────────────────

function GameScreen({
  level,
  playerColor,
  timeControlId,
  human,
  onNewGame,
  onRematch,
}: {
  level: number
  playerColor: Color
  timeControlId: string
  /** Maia plutôt que Stockfish : décidé à la configuration. */
  human: boolean
  onNewGame: () => void
  onRematch: () => void
}) {
  const prefs = usePreferences()
  const { book } = useOpeningBook()
  const botColor: Color = playerColor === 'w' ? 'b' : 'w'

  const timeControl = useMemo<TimeControl>(() => {
    const found = TIME_CONTROLS.find((tc) => tc.id === timeControlId)
    return found ? { initial: found.initial, increment: found.increment } : { initial: 600, increment: 5 }
  }, [timeControlId])
  const timed = timeControl.initial > 0

  const [outcome, setOutcome] = useState<{
    status: GameStatus
    result: GameResult
  } | null>(null)
  const [hintArrow, setHintArrow] = useState<Arrow | null>(null)
  // Lue par les effets d'analyse, qui s'exécutent avant que `gameOver` ne soit
  // recalculé dans le corps du composant.
  const gameOverRef = useRef(false)

  // ── Mode commenté ───────────────────────────────────────────────────────
  // Déclaré ici, avant le pilote de l'adversaire artificiel : celui-ci consulte
  // l'état de pause pour savoir s'il doit patienter.
  const commentaryMode = prefs.commentaryMode
  const [hoveredAlternative, setHoveredAlternative] = useState<Alternative | null>(null)
  const [commentaryPaused, setCommentaryPaused] = useState(false)
  // Vrai tant que le coach prononce son commentaire. L'adversaire s'y range :
  // une explication ne vaut que si la position dont elle parle est encore à
  // l'écran quand la phrase se termine.
  const [coachSpeaking, setCoachSpeaking] = useState(false)
  // Le coup proposé reste fléché sur l'échiquier tant qu'on ne le masque pas.
  const [showBestMove, setShowBestMove] = useState(true)
  const [clock, setClock] = useState<ClockState>(() => createClock(timeControl, Date.now()))
  const [displayClock, setDisplayClock] = useState(() => remainingAt(clock, Date.now()))

  const game = useChessGame({
    onMove: (move) => {
      playMoveSound({
        isCapture: move.isCapture,
        isCheck: move.isCheck,
        isCheckmate: move.isCheckmate,
        isCastle: move.isCastle,
        isPromotion: !!move.promotion,
      })
      setHintArrow(null)
      if (timed) {
        setClock((current) =>
          applyMove(current, move.color, Date.now(), current.running === null),
        )
      }
    },
    onGameOver: (status, result) => {
      setClock((current) => stopClock(current, Date.now()))
      setOutcome({ status, result })
      const won = result === (playerColor === 'w' ? '1-0' : '0-1')
      playResultSound(result === '1/2-1/2' ? 'draw' : won ? 'win' : 'loss')
      recordBotGame(level, won)
    },
  })

  const { state, play, undo, goTo } = game

  // ── Pause d'étude du mode commenté ──────────────────────────────────────
  //
  // Sans elle, l'adversaire répond dans la seconde qui suit : le commentaire
  // s'affiche, les flèches apparaissent, et la position a déjà changé. On
  // suspend donc la partie après chaque coup du joueur, jusqu'à ce qu'il dise
  // qu'il a fini de regarder.
  //
  // C'est une valeur **calculée**, pas un état : elle se remet d'elle-même à
  // chaque nouveau coup, sans effet ni synchronisation à tenir.
  const [reviewedFen, setReviewedFen] = useState<string | null>(null)
  const lastPlayed = state.moves[state.moves.length - 1] ?? null
  // Le gestionnaire de touches est posé une fois pour toutes : il lit la
  // position courante ici plutôt que de se réabonner à chaque coup.
  const cursorRef = useRef(state.cursor)
  cursorRef.current = state.cursor
  const movesRef = useRef(state.moves.length)
  movesRef.current = state.moves.length
  const studyPause = commentaryMode && prefs.commentaryPauses
  const awaitingReview =
    studyPause &&
    state.isLive &&
    !state.isGameOver &&
    outcome === null &&
    lastPlayed?.color === playerColor &&
    reviewedFen !== state.currentFen
  const opening = useCurrentOpening(
    state.moves.map((m) => m.san),
    prefs.locale,
  )

  // ── Coach ───────────────────────────────────────────────────────────────
  //
  // Déclaré avant le pilote de l'adversaire, qui a besoin de savoir si le
  // commentaire est encore en train de se calculer.
  const lastPlayerMove = useMemo(() => {
    for (let i = state.moves.length - 1; i >= 0; i--) {
      const move = state.moves[i]!
      if (move.color === playerColor) return move
    }
    return null
  }, [state.moves, playerColor])

  // Le mode commenté analyse la position **d'avant** le coup en MultiPV : c'est
  // là que se trouvent les options qu'on avait et qu'on n'a pas vues.
  const { commentary, loading: coachLoading, history: commentaryHistory } = useLiveCommentary({
    move: lastPlayerMove,
    enabled: state.isLive && !gameOverRef.current,
    alternatives: commentaryMode ? 3 : 1,
    book,
  })

  /**
   * Le coach a-t-il encore quelque chose à dire sur la position affichée ?
   *
   * Deux temps, et il faut les deux. Retenir l'adversaire seulement pendant la
   * lecture ne servait à rien : le commentaire n'existe qu'une fois le coup
   * analysé, si bien que l'ordinateur répondait *avant* que la phrase ne
   * commence — mesuré à 0,9 s contre 1,6 s. On attend donc d'abord que le
   * commentaire soit calculé, ensuite qu'il soit prononcé.
   */
  const coachBusy = commentaryMode && (coachLoading || coachSpeaking)

  // ── Adversaire artificiel ───────────────────────────────────────────────
  const playRef = useRef(play)
  playRef.current = play

  const botPlayer = useBotPlayer({
    fen: state.currentFen,
    botColor,
    level,
    turn: state.turn,
    human,
    ply: state.moves.length,
    // En pause de lecture — ou tant que le coach a la parole — l'ordinateur
    // patiente : on veut pouvoir lire *et* entendre le commentaire avant que la
    // position ne change.
    active:
      !state.isGameOver &&
      outcome === null &&
      !commentaryPaused &&
      !coachBusy &&
      !awaitingReview &&
      // Remonter dans la liste des coups met la partie en attente. Sans cela,
      // l'ordinateur jouait pendant qu'on regardait le passé : on revenait au
      // présent devant une position changée, avec l'impression d'avoir perdu
      // ses coups.
      state.isLive,
    onMove: (from, to, promotion) => playRef.current(from, to, promotion),
  })

  // ── Pendules ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!timed || state.isGameOver || outcome) return
    const interval = setInterval(() => {
      const now = Date.now()
      setDisplayClock(remainingAt(clock, now))
      const flagged = flaggedColor(clock, now)
      if (flagged) {
        setClock((current) => stopClock(current, now))
        setOutcome({
          status: 'timeout',
          result: flagged === 'w' ? '0-1' : '1-0',
        })
        playResultSound(flagged === playerColor ? 'loss' : 'win')
        // Gagner au temps compte comme une victoire : c'est une partie gagnée.
        recordBotGame(level, flagged !== playerColor)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [clock, timed, state.isGameOver, outcome, playerColor])

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (state.turn !== playerColor || !state.isLive) return
      play(from, to, promotion)
    },
    [play, state.turn, state.isLive, playerColor],
  )

  const handleHint = useCallback(async () => {
    if (state.turn !== playerColor) return
    try {
      const hint = await requestHint(state.currentFen, 16)
      if (hint) {
        // Orange, et non bleu : le bleu est déjà celui du coup conseillé par le
        // mode commenté. Deux sens pour une même couleur, c'est une couleur
        // qui n'en a plus aucun.
        setHintArrow({ from: hint.from, to: hint.to, color: 'orange', weight: 'bold' })
        playSound('notify')
      }
    } catch {
      toast.error('Impossible de calculer un indice pour le moment.')
    }
  }, [state.currentFen, state.turn, playerColor])

  const handleUndo = useCallback(() => {
    // On annule deux demi-coups : le sien et la réponse de l'ordinateur.
    const count = state.moves.length >= 2 ? 2 : 1
    undo(count)
    setOutcome(null)
    playSound('confirm')
  }, [undo, state.moves.length])

  const handleResign = useCallback(() => {
    setClock((current) => stopClock(current, Date.now()))
    setOutcome({ status: 'resign', result: playerColor === 'w' ? '0-1' : '1-0' })
    // Un abandon compte comme une tentative, jamais comme une victoire.
    recordBotGame(level, false)
    playResultSound('loss')
  }, [playerColor])

  /**
   * Sens de lecture de l'échiquier.
   *
   * Par défaut on voit de son propre côté, comme sur un vrai échiquier. Le
   * réglage « Blancs toujours en bas » fige l'orientation : les diagrammes des
   * livres, des leçons et des puzzles sont presque tous vus des Blancs, et
   * alterner brouille les repères qu'on est en train de construire.
   */
  const orientation: Color = prefs.whiteAlwaysBottom ? 'w' : playerColor

  const bot = botPlayer.bot
  const personality = BOT_PERSONALITIES[bot.personality]
  const gameOver = state.isGameOver || outcome !== null
  gameOverRef.current = gameOver

  // ── Revue des coups joués ───────────────────────────────────────────────
  //
  // Naviguer dans la liste des coups replace la position sur l'échiquier, mais
  // une position seule ne dit pas *quel* coup y a mené : on flèche donc le coup
  // consulté, et le coup que le moteur préférait si on l'a déjà calculé.
  const reviewing = !state.isLive
  const reviewedMove = reviewing ? (state.moves[state.cursor] ?? null) : null
  const formatMove = useSan()


  // Un commentaire reste lisible longtemps après le coup qu'il décrit, mais ses
  // flèches, elles, deviennent fausses dès le coup suivant : elles pointeraient
  // des cases qui ont changé. On les efface donc quand la partie a avancé, sans
  // effacer le texte.
  // Quand les flèches disparaissent-elles ?
  //
  //  - avec la pause d'étude : au clic sur « Continuer ». Ce bouton veut dire
  //    « j'ai fini de regarder » — c'est le moment exact où elles n'ont plus
  //    lieu d'être, et les garder pendant la réponse de l'adversaire les
  //    laisserait pointer des cases qui ont changé ;
  //  - sans la pause : au coup suivant du joueur, faute de meilleur signal.
  const arrowsMatchPosition =
    commentary != null &&
    commentary.fenAfter === lastPlayerMove?.after &&
    (studyPause ? awaitingReview : true)
  const reviewedCommentary = reviewedMove
    ? (commentaryHistory[reviewedMove.after] ?? null)
    : null

  // Le commentaire porte-t-il encore sur ce qu'on a sous les yeux ? Sans la
  // pause d'étude, l'adversaire répond avant qu'on ait fini de lire, et le
  // texte se retrouve à décrire la position précédente. Plutôt que de l'effacer
  // — il reste ce qu'on avait demandé —, on dit de quel coup il parle.
  const commentaryStale =
    !reviewedMove && commentary != null && commentary.fenAfter !== state.currentFen

  const reviewCommented = useCallback(() => {
    if (!commentary) return
    const index = state.moves.findIndex((move) => move.after === commentary.fenAfter)
    if (index >= 0) goTo(index)
  }, [commentary, state.moves, goTo])

  const arrows = useMemo<Arrow[]>(() => {
    if (reviewedMove) {
      const bad =
        reviewedCommentary?.quality === 'blunder' ||
        reviewedCommentary?.quality === 'mistake' ||
        reviewedCommentary?.quality === 'miss'

      const list: Arrow[] = [
        {
          from: reviewedMove.from,
          to: reviewedMove.to,
          color: bad ? 'red' : 'green',
          weight: 'bold',
        },
      ]

      const best = reviewedCommentary?.alternatives.find(
        (alternative) => alternative.rank === 1 && !alternative.played,
      )
      if (best && showBestMove) {
        list.push({
          from: best.uci.slice(0, 2) as Square,
          to: best.uci.slice(2, 4) as Square,
          color: 'blue',
          weight: 'normal',
        })
      }
      return list
    }

    if (hintArrow) return [hintArrow]

    // Survoler une alternative dans la liste la montre même si la partie a
    // avancé : c'est un geste délibéré, pas un reliquat à l'écran.
    if (!commentaryMode) return []
    if (!arrowsMatchPosition && !hoveredAlternative) return []
    return commentaryArrows(commentary, hoveredAlternative, showBestMove)
  }, [
    reviewedMove,
    reviewedCommentary,
    hintArrow,
    commentaryMode,
    commentary,
    hoveredAlternative,
    showBestMove,
    arrowsMatchPosition,
  ])

  /**
   * Clic sur une flèche : « pourquoi ce coup ? ».
   *
   * Une flèche bleue affirme quelque chose sans le justifier. Le moteur a
   * pourtant la réponse — son évaluation, le motif tactique, la suite prévue :
   * il suffisait de la rendre atteignable au clic.
   */
  const handleArrowClick = useCallback(
    (arrow: Arrow) => {
      const source = reviewedMove ? reviewedCommentary : commentary
      const uci = `${arrow.from}${arrow.to}`
      const alternative = source?.alternatives.find((candidate) =>
        candidate.uci.startsWith(uci),
      )
      if (!alternative) return

      const san = prefs.locale === 'fr' ? sanToFrench(alternative.san) : alternative.san
      const role = alternative.played ? 'Ton coup' : `Coup conseillé (n°${alternative.rank})`

      const parts = [
        alternative.reason ?? 'Le moteur le place en tête à cette profondeur.',
        `Évaluation : ${formatScore(alternative.score, playerColor)}.`,
      ]
      if (alternative.line.length > 1) {
        parts.push(`Suite prévue : ${alternative.line.slice(0, 4).join(' ')}.`)
      }

      toast.info(`${san} — ${role}`, parts.join(' '))
      speak(`${san}. ${parts[0]}`)
    },
    [reviewedMove, reviewedCommentary, commentary, prefs.locale, playerColor],
  )

  const arrowLegend = useMemo<LegendItem[]>(() => {
    if (reviewedMove) {
      return legendFor(arrows, [
        { ...LEGEND.played, label: `${reviewedMove.san} — le coup joué` },
        { ...LEGEND.playedBad, label: `${reviewedMove.san} — erreur` },
        LEGEND.best,
      ])
    }
    if (hintArrow) return [LEGEND.hint]
    if (!commentaryMode || arrows.length === 0) return []
    return commentaryLegend(commentary, hoveredAlternative, showBestMove)
  }, [
    reviewedMove,
    arrows,
    hintArrow,
    commentaryMode,
    commentary,
    hoveredAlternative,
    showBestMove,
  ])

  return (
    <div className="mx-auto w-full max-w-[1500px] px-2 py-3 sm:px-4 lg:py-6">
      <div className="grid gap-4 lg:h-[calc(100dvh-6rem)] lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* ── Colonne échiquier ────────────────────────────────────── */}
        {/*
          Sur grand écran, la zone de jeu tient dans la fenêtre : on lui donne
          une hauteur, et chaque colonne se partage ce qui reste. Un bandeau qui
          apparaît sous l'échiquier le rétrécit alors d'autant, au lieu de
          pousser les pendules et la barre d'actions hors de l'écran. En dessous
          de `lg`, les colonnes s'empilent et la page défile — c'est ce qu'on
          attend d'un téléphone.
        */}
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="flex min-h-0 flex-1 gap-2">
            {prefs.showEvalDuringGame && (
              <EvalBar
                score={commentary?.scoreAfter ?? null}
                orientation={orientation}
                loading={coachLoading}
                className="hidden sm:block"
              />
            )}

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <PlayerBar
                name={personality.name.fr}
                rating={bot.elo}
                color={botColor}
                avatar={personality.emoji}
                timeMs={timed ? displayClock[botColor] : null}
                timeControl={timeControl}
                active={state.turn === botColor && !gameOver}
                captured={state.material[botColor]}
                materialLead={
                  botColor === 'w' ? Math.max(0, state.material.balance) : Math.max(0, -state.material.balance)
                }
                status={
                  botPlayer.loading
                    ? 'Chargement du moteur…'
                    : botPlayer.thinking
                      ? 'réfléchit…'
                      : // Le moteur reste affiché pendant toute la partie :
                        // choisi une fois à la configuration, on l'oublie
                        // aussitôt, et l'on ne sait plus qui l'on affronte.
                        `${human ? 'Maia' : 'Stockfish'} · niveau ${bot.level}`
                }
              />

              <div className="my-1.5 flex min-h-0 flex-1 items-center justify-center">
                <ChessBoard
                  // La colonne a une hauteur imposée : c'est elle qui borne
                  // le plateau. L'estimation en `dvh` ne sert plus qu'aux
                  // petits écrans, où les colonnes s'empilent et défilent.
                  fitParentHeight
                  reservedHeight={9}
                  fen={state.fen}
                  orientation={orientation}
                  playable={state.isLive && !gameOver ? playerColor : null}
                  legalMoves={state.legalMoves}
                  onMove={handleMove}
                  lastMove={state.lastMove}
                  checkSquare={state.checkSquare}
                  checkmate={state.status === 'checkmate'}
                  highlights={(commentaryMode ? commentary?.highlights : undefined) as never}
                  arrows={arrows}
                  onArrowClick={handleArrowClick}
                  // Le coup de l'adversaire arrive sans qu'on l'ait anticipé :
                  // à la vitesse d'un coup qu'on joue soi-même, on ne voit pas
                  // quelle pièce a bougé. On lui laisse le temps d'être vu.
                  animationMs={lastPlayed?.color === botColor ? 420 : undefined}
                />
              </div>

              {reviewing && (
                <div className="mb-1.5 flex items-center gap-2 rounded-[var(--radius-sm)] border border-accent/40 bg-accent/10 px-3 py-2 text-[13px]">
                  <Eye size={15} className="shrink-0 text-accent" aria-hidden />
                  <span className="min-w-0 flex-1 leading-snug text-muted">
                    Tu revois la partie{reviewedMove ? <> — coup <strong className="font-semibold text-ink">{formatMove(reviewedMove.san)}</strong></> : null}. Rien n’est effacé.
                  </span>
                  <button
                    type="button"
                    onClick={() => goTo(state.moves.length - 1)}
                    className="shrink-0 rounded-[var(--radius-sm)] bg-accent px-2.5 py-1 text-xs font-semibold text-[var(--accent-contrast)] transition-all hover:brightness-110"
                  >
                    Retour à la partie
                  </button>
                </div>
              )}

              {awaitingReview && (
                <button
                  type="button"
                  onClick={() => setReviewedFen(state.currentFen)}
                  className="mb-1.5 flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-accent px-4 py-2.5 text-sm font-semibold text-[var(--accent-contrast)] transition-all hover:brightness-110"
                >
                  <Play size={15} aria-hidden />
                  Continuer — {personality.name.fr} joue
                </button>
              )}

              <ArrowLegend items={arrowLegend} className="mb-1.5" />

              <PlayerBar
                name="Toi"
                color={playerColor}
                avatar="🙂"
                timeMs={timed ? displayClock[playerColor] : null}
                timeControl={timeControl}
                active={state.turn === playerColor && !gameOver}
                captured={state.material[playerColor]}
                materialLead={
                  playerColor === 'w'
                    ? Math.max(0, state.material.balance)
                    : Math.max(0, -state.material.balance)
                }
              />
            </div>
          </div>

          {/* Barre d'actions */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <TurnIndicator
              turn={state.turn}
              yourColor={playerColor}
              thinking={botPlayer.thinking}
              gameOver={gameOver}
              className="mr-auto pl-1"
            />

            <GameNav cursor={state.cursor} count={state.moves.length} onSeek={goTo} />

            <Button
              size="sm"
              variant="ghost"
              icon={<Lightbulb size={14} />}
              onClick={handleHint}
              disabled={gameOver || state.turn !== playerColor}
            >
              Indice
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<Undo2 size={14} />}
              onClick={handleUndo}
              disabled={state.moves.length === 0}
              // « Reprendre » est le terme du jeu, mais il se lit aussi
              // « reprendre la partie ». On dit donc ce que fait le bouton.
              title="Annule ton dernier coup et la réponse de l’ordinateur"
            >
              Annuler mon coup
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<Flag size={14} />}
              onClick={handleResign}
              disabled={gameOver}
            >
              Abandonner
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<RefreshCw size={14} />}
              onClick={onNewGame}
            >
              Nouvelle
            </Button>
            <CommentaryToggle
              active={commentaryMode}
              onChange={(value) => {
                prefs.set('commentaryMode', value)
                // Quitter le mode commenté rend la main tout de suite : ni
                // pause ni phrase en cours ne doivent retenir l'adversaire.
                if (!value) {
                  setCommentaryPaused(false)
                  setCoachSpeaking(false)
                }
              }}
            />
          </div>
        </div>

        {/* ── Colonne latérale ─────────────────────────────────────── */}
        <div className="flex min-h-0 flex-col gap-3">
          <OpeningBanner opening={opening} moveCount={state.moves.length} />

          <CommentaryPanel
            // En revue, on montre le commentaire du coup consulté plutôt que
            // celui du dernier coup joué : sinon le texte et l'échiquier
            // parlent de deux positions différentes.
            commentary={reviewedMove ? reviewedCommentary : commentary}
            loading={reviewedMove ? false : coachLoading}
            paused={commentaryPaused}
            onTogglePause={() => setCommentaryPaused((value) => !value)}
            onSpeakingChange={setCoachSpeaking}
            onHoverAlternative={setHoveredAlternative}
            showBestMove={showBestMove}
            onToggleBestMove={() => setShowBestMove((value) => !value)}
            stale={commentaryStale}
            onReview={reviewCommented}
          />

          <Card className="flex min-h-[220px] flex-1 flex-col overflow-hidden">
            <MoveList
              moves={state.moves}
              cursor={state.cursor}
              onSeek={goTo}
              className="min-h-0 flex-1"
            />
          </Card>

          {botPlayer.error && (
            <Card className="border-[var(--q-blunder)]/50 p-3 text-sm text-[var(--q-blunder)]">
              {botPlayer.error}
            </Card>
          )}
        </div>
      </div>

      {gameOver && (
        <GameOverDialog
          status={outcome?.status ?? state.status}
          result={outcome?.result ?? state.result}
          playerColor={playerColor}
          opponentName={personality.name.fr}
          moves={state.moves}
          onRematch={onRematch}
          onNewGame={onNewGame}
        />
      )}
    </div>
  )
}

/** Ce que l'API de progression renvoie. */
interface Progression {
  defeated: number
  unlocked: number
  attempts: number
  wins: number
  tracked: boolean
}

/**
 * Enregistre une partie terminée contre l'ordinateur.
 *
 * Appelé au moment où la partie s'achève, et jamais bloquant : une progression
 * qu'on n'a pas pu écrire ne doit pas empêcher de voir son résultat.
 */
export function recordBotGame(level: number, won: boolean): void {
  void fetch('/api/progression', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ level, won }),
  }).catch(() => {
    // Hors ligne ou sans compte : la partie reste jouée, simplement pas comptée.
  })
}
