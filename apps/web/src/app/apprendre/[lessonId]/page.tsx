'use client'

/**
 * Lecteur de leçon.
 *
 * Le principe pédagogique tient en une phrase : **on ne lit pas, on fait**.
 * Chaque étape place une position, le coach parle, et dès que possible
 * l'apprenant doit agir. Une leçon où l'on ne fait que cliquer sur « suivant »
 * ne laisse aucune trace.
 *
 * La position n'est jamais modifiée pas à pas : elle est **recalculée depuis le
 * début** à chaque changement d'étape (voir `playback.ts`). Naviguer en avant,
 * en arrière ou recharger la page donne donc toujours la même chose.
 *
 * Trois détails qui comptent :
 *  - la voix se déclenche automatiquement, mais se coupe d'un clic ;
 *  - une erreur ne bloque jamais : on réessaie autant qu'on veut, et on peut
 *    demander à voir la solution ;
 *  - la progression est enregistrée à chaque étape, pas seulement à la fin.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react'
import clsx from 'clsx'
import { Chess } from 'chess.js'
import type { Color, PieceSymbol, Square } from 'chess.js'
import { sanToFrench } from '@coupparfait/core'
import { ChessBoard } from '@/components/board/ChessBoard.tsx'
import { ArrowLegend, LEGEND, legendFor } from '@/components/board/ArrowLegend.tsx'
import { Button, Card, Chip } from '@/components/ui/index.tsx'
import { findLesson, nextLesson, previousLesson, saveProgress } from '@/lib/lessons/index.ts'
import type { LessonStep } from '@/lib/lessons/index.ts'
import {
  applyReply,
  isActionStep,
  positionAtStep,
  type PlayedByStep,
} from '@/lib/lessons/playback.ts'
import { playMoveSound, playSound } from '@/lib/sound.ts'
import { prefetchSpeech, speak, stopSpeaking } from '@/lib/speech.ts'
import { usePreferences } from '@/lib/store/preferences.ts'
import type { Arrow, CircleMark } from '@/components/board/boardKit.ts'

type Feedback = { kind: 'correct' | 'wrong' | 'revealed'; text: string } | null

/** Délai avant que l'adversaire ne joue, pour qu'on voie le coup arriver. */
const REPLY_DELAY_MS = 650

export default function LessonPage() {
  const params = useParams<{ lessonId: string }>()
  const router = useRouter()
  const lesson = findLesson(params.lessonId)

  const voiceEnabled = usePreferences((state) => state.voiceEnabled)
  const setPreference = usePreferences((state) => state.set)
  const locale = usePreferences((state) => state.locale)

  const [stepIndex, setStepIndex] = useState(0)
  /** Coups réellement choisis par l'apprenant, pour rejouer fidèlement. */
  const [played, setPlayed] = useState<PlayedByStep>({})

  const [fen, setFen] = useState('')
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [solved, setSolved] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [revealArrow, setRevealArrow] = useState<Arrow | null>(null)

  const step: LessonStep | null = lesson?.steps[stepIndex] ?? null
  const isLast = lesson ? stepIndex >= lesson.steps.length - 1 : false
  const needsAction = step ? isActionStep(step.kind) : false

  // ── Mise en place d'une étape ─────────────────────────────────────────────
  useEffect(() => {
    if (!lesson || !step) return

    const start = positionAtStep(lesson, stepIndex, played)
    setFen(start.fen)
    setLastMove(start.lastMove)
    setFeedback(null)
    setSolved(!isActionStep(step.kind))
    setAttempts(0)
    setRevealArrow(null)

    saveProgress(lesson.id, stepIndex + 1, false)

    // Étape d'observation portant une réponse adverse : elle doit être jouée
    // automatiquement, sinon le coach commente une position qui n'est pas à
    // l'écran. C'était précisément le bug : « le cavalier attaque le pion e5 »
    // alors que les Noirs n'avaient pas encore joué e5.
    if (!isActionStep(step.kind) && step.reply) {
      const timer = setTimeout(() => {
        const result = applyReply(start.fen, step.reply)
        if (!result) return
        setFen(result.fen)
        setLastMove({ from: result.from, to: result.to })
        playMoveSound({
          isCapture: result.capture,
          isCheck: result.check,
          isCheckmate: result.mate,
          isCastle: false,
          isPromotion: false,
        })
      }, REPLY_DELAY_MS)
      return () => clearTimeout(timer)
    }
    // `played` est volontairement hors des dépendances : il ne change que
    // pendant une étape, et la relecture doit se faire au changement d'étape.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, lesson?.id])

  // ── Lecture à voix haute ──────────────────────────────────────────────────
  //
  // Un seul effet, dont le nettoyage coupe la voix. Il y avait auparavant un
  // garde-fou par `useRef` qui mémorisait la dernière étape lue : en mode strict
  // React monte, démonte et remonte le composant, si bien que la première phrase
  // était prononcée, aussitôt coupée par le démontage, puis considérée comme
  // « déjà lue » au remontage. Résultat : le message d'introduction restait muet
  // alors que les suivants passaient.
  const spoken = step?.say ?? ''
  useEffect(() => {
    if (!spoken || !voiceEnabled) return
    speak(spoken)
    return () => stopSpeaking()
  }, [spoken, voiceEnabled])

  // La voix neuronale demande une seconde ou deux de calcul. On prépare donc
  // l'étape suivante pendant qu'on écoute celle-ci : au moment de cliquer sur
  // « Continuer », la phrase est déjà prête et part sans attente.
  const upcomingSay = lesson?.steps[stepIndex + 1]?.say ?? ''
  useEffect(() => {
    if (!upcomingSay || !voiceEnabled) return
    prefetchSpeech(upcomingSay)
  }, [upcomingSay, voiceEnabled])

  // ── Coups légaux ──────────────────────────────────────────────────────────
  const legalMoves = useMemo(() => {
    const map = new Map<Square, Square[]>()
    if (!step || !needsAction || solved || !fen) return map
    try {
      const board = new Chess(fen, { skipValidation: true })
      for (const move of board.moves({ verbose: true })) {
        const list = map.get(move.from) ?? []
        if (!list.includes(move.to)) list.push(move.to)
        map.set(move.from, list)
      }
    } catch {
      // Position illustrative sans roi : aucun coup proposé, c'est normal.
    }
    return map
  }, [fen, step, needsAction, solved])

  // ── Coup de l'apprenant ───────────────────────────────────────────────────
  const handleMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (!step || !lesson || solved) return

      const board = new Chess(fen, { skipValidation: true })
      let move
      try {
        move = board.move({ from, to, promotion: promotion ?? 'q' })
      } catch {
        return
      }

      // On compare sans les symboles d'échec : « Cf3 » et « Cf3+ » désignent le
      // même coup, et le contenu ne doit pas dépendre de ce détail.
      const normalise = (san: string) => san.replace(/[+#]/g, '')
      const accepted = (step.answers ?? []).some(
        (answer) => normalise(answer) === normalise(move.san),
      )

      if (!accepted) {
        setAttempts((count) => count + 1)
        playSound('error')
        setFeedback({
          kind: 'wrong',
          text: step.hint ?? 'Ce n’est pas le coup attendu. Réessaie.',
        })
        return
      }

      playMoveSound({
        isCapture: move.isCapture(),
        isCheck: board.inCheck(),
        isCheckmate: board.isCheckmate(),
        isCastle: move.isKingsideCastle() || move.isQueensideCastle(),
        isPromotion: !!move.promotion,
      })

      setPlayed((current) => ({ ...current, [stepIndex]: move.san }))
      setFen(board.fen())
      setLastMove({ from: move.from, to: move.to })
      setSolved(true)
      setFeedback({ kind: 'correct', text: 'Exact !' })

      // Réponse de l'adversaire, après une pause pour qu'on la voie arriver.
      if (step.reply) {
        const positionAfterMove = board.fen()
        setTimeout(() => {
          const result = applyReply(positionAfterMove, step.reply)
          if (!result) return
          setFen(result.fen)
          setLastMove({ from: result.from, to: result.to })
          playMoveSound({
            isCapture: result.capture,
            isCheck: result.check,
            isCheckmate: result.mate,
            isCastle: false,
            isPromotion: false,
          })
        }, REPLY_DELAY_MS)
      }
    },
    [step, lesson, solved, fen, stepIndex],
  )

  // ── Montrer la solution ───────────────────────────────────────────────────
  const reveal = useCallback(() => {
    if (!step?.answers?.length || !fen) return
    const board = new Chess(fen, { skipValidation: true })
    try {
      const move = board.move(step.answers[0]!)
      setRevealArrow({ from: move.from, to: move.to, color: 'blue', weight: 'bold' })
      setFeedback({
        kind: 'revealed',
        text: `Le coup était ${locale === 'fr' ? sanToFrench(move.san) : move.san}. Joue-le pour continuer.`,
      })
    } catch {
      setFeedback({ kind: 'revealed', text: 'Impossible de montrer le coup ici.' })
    }
  }, [step, fen, locale])

  // ── Navigation ────────────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    if (!lesson) return
    if (isLast) {
      saveProgress(lesson.id, lesson.steps.length, true)
      playSound('victory')
      const next = nextLesson(lesson.id)
      router.push(next ? `/apprendre/${next.id}` : '/apprendre')
      return
    }
    setStepIndex(stepIndex + 1)
  }, [lesson, isLast, stepIndex, router])

  const goPrevious = useCallback(() => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1)
  }, [stepIndex])

  const restartStep = useCallback(() => {
    // Réinitialise l'étape en retirant le coup mémorisé, puis force la relecture.
    setPlayed((current) => {
      const next = { ...current }
      delete next[stepIndex]
      return next
    })
    const target = stepIndex
    setStepIndex(-1)
    setTimeout(() => setStepIndex(target), 0)
  }, [stepIndex])

  if (!lesson) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Leçon introuvable</h1>
        <p className="mt-2 text-muted">Cette leçon n’existe pas ou a été renommée.</p>
        <Link
          href="/apprendre"
          className="mt-6 inline-flex items-center gap-1.5 text-accent hover:underline"
        >
          <ArrowLeft size={15} aria-hidden />
          Retour au programme
        </Link>
      </div>
    )
  }

  if (!step) return null

  const arrows: Arrow[] = [
    ...((step.arrows ?? []).map((arrow) => ({
      from: arrow.from,
      to: arrow.to,
      color: arrow.color ?? ('green' as const),
    })) as Arrow[]),
    ...(revealArrow ? [revealArrow] : []),
  ]

  const circles: CircleMark[] = (step.circles ?? []).map((circle) => ({
    square: circle.square,
    color: circle.color ?? 'green',
  }))

  const orientation: Color = (step.orientation as Color) ?? 'w'
  const previous = previousLesson(lesson.id)
  const upcoming = nextLesson(lesson.id)

  return (
    <div className="mx-auto w-full max-w-[1200px] px-3 py-4 sm:px-5 lg:py-8">
      {/* ── En-tête ────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link
          href="/apprendre"
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft size={15} aria-hidden />
          Programme
        </Link>
        <span className="text-faint" aria-hidden>
          /
        </span>
        <span className="text-sm font-medium">
          {lesson.icon} {lesson.title}
        </span>
        <Chip className="ml-auto">
          Étape {stepIndex + 1} / {lesson.steps.length}
        </Chip>
        <button
          type="button"
          onClick={() => {
            if (voiceEnabled) stopSpeaking()
            setPreference('voiceEnabled', !voiceEnabled)
          }}
          className={clsx(
            'grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] transition-colors',
            voiceEnabled ? 'text-accent hover:bg-surface-hover' : 'text-faint hover:bg-surface-hover',
          )}
          aria-label={voiceEnabled ? 'Couper la voix' : 'Activer la voix'}
        >
          {voiceEnabled ? <Volume2 size={15} aria-hidden /> : <VolumeX size={15} aria-hidden />}
        </button>
      </div>

      <div className="mb-4 h-1 overflow-hidden rounded-full bg-surface-strong">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-400"
          style={{ width: `${((stepIndex + 1) / lesson.steps.length) * 100}%` }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* ── Échiquier ────────────────────────────────────────────── */}
        <div className="min-w-0">
          <ChessBoard
            fen={fen}
            orientation={orientation}
            playable={needsAction && !solved ? orientation : null}
            legalMoves={legalMoves}
            onMove={handleMove}
            lastMove={lastMove}
            highlights={step.highlight ?? []}
            arrows={arrows}
            circles={circles}
            spotlight={step.spotlight}
            allowAnnotations={false}
          />

          <ArrowLegend
            items={legendFor(arrows, [
              LEGEND.look,
              LEGEND.danger,
              { ...LEGEND.solution, weight: 'bold' as const },
            ])}
            className="mt-2"
          />

          {needsAction && (
            <div
              className={clsx(
                'mt-2 flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm',
                solved
                  ? 'bg-[color-mix(in_oklab,var(--q-best)_14%,transparent)] text-[var(--q-best)]'
                  : feedback?.kind === 'wrong'
                    ? 'bg-[color-mix(in_oklab,var(--q-blunder)_12%,transparent)] text-[var(--q-blunder)]'
                    : 'bg-surface text-muted',
              )}
              role="status"
            >
              {solved ? <Check size={15} aria-hidden /> : null}
              <span className="min-w-0 flex-1">
                {feedback?.text ?? step.instruction ?? 'À toi de jouer.'}
              </span>
              {!solved && attempts >= 1 && (
                <Button size="sm" variant="ghost" icon={<Eye size={13} />} onClick={reveal}>
                  Montre-moi
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ── Panneau du coach ─────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <Card glow className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <span
                className="grid h-8 w-8 place-items-center rounded-full"
                style={{ background: 'color-mix(in oklab, var(--accent) 18%, transparent)' }}
                aria-hidden
              >
                <Volume2 size={14} className="text-accent" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-faint">
                Le coach
              </span>
              <button
                type="button"
                onClick={() => speak(step.say)}
                className="ml-auto rounded p-1 text-faint transition-colors hover:text-ink"
                aria-label="Réécouter"
                title="Réécouter"
              >
                <RotateCcw size={13} aria-hidden />
              </button>
            </div>

            <p className="text-[15px] leading-relaxed">{renderBold(step.say)}</p>
          </Card>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={goPrevious}
              disabled={stepIndex === 0}
              icon={<ArrowLeft size={15} />}
            >
              Précédent
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={goNext}
              disabled={needsAction && !solved}
              icon={<ArrowRight size={15} />}
            >
              {isLast ? (upcoming ? 'Leçon suivante' : 'Terminer') : 'Continuer'}
            </Button>
          </div>

          {needsAction && solved && (
            <Button size="sm" variant="ghost" icon={<RotateCcw size={13} />} onClick={restartStep}>
              Rejouer cette étape
            </Button>
          )}

          <div className="mt-2 grid gap-2 text-xs">
            {previous && (
              <Link
                href={`/apprendre/${previous.id}`}
                className="flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-ink"
              >
                <ArrowLeft size={12} aria-hidden />
                <span className="truncate">
                  {previous.icon} {previous.title}
                </span>
              </Link>
            )}
            {upcoming && (
              <Link
                href={`/apprendre/${upcoming.id}`}
                className="flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-ink"
              >
                <ArrowRight size={12} aria-hidden />
                <span className="truncate">
                  {upcoming.icon} {upcoming.title}
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Rend le gras `**mot**` des textes de leçon. */
function renderBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((chunk, index) =>
    chunk.startsWith('**') && chunk.endsWith('**') ? (
      <strong key={index} className="font-semibold text-accent-soft">
        {chunk.slice(2, -2)}
      </strong>
    ) : (
      <span key={index}>{chunk}</span>
    ),
  )
}
