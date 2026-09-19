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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Eye,
  Repeat,
  RotateCcw,
  ShieldCheck,
  Volume2,
  VolumeX,
} from 'lucide-react'
import clsx from 'clsx'
import { Chess } from 'chess.js'
import type { Color, PieceSymbol, Square } from 'chess.js'
import { ChessBoard } from '@/components/board/ChessBoard.tsx'
import { ArrowLegend, LEGEND, legendFor } from '@/components/board/ArrowLegend.tsx'
import { Button, Card, Chip } from '@/components/ui/index.tsx'
import {
  findLesson,
  loadProgress,
  nextLesson,
  previousLesson,
  saveProgress,
} from '@/lib/lessons/index.ts'
import { chapitreDeLUrl, deposerGains, signaler } from '@/lib/carriere/useCarriere.ts'
import { chapitre as chapitreCarriere } from '@coupparfait/core'
import type { LessonStep } from '@/lib/lessons/index.ts'
import {
  applyReply,
  isActionStep,
  positionAtStep,
  type PlayedByStep,
} from '@/lib/lessons/playback.ts'
import { playMoveFor, playMoveSound, playSound } from '@/lib/sound.ts'
import { prefetchSpeech, speak, stopSpeaking } from '@/lib/speech.ts'
import { useSan } from '@/lib/notation.ts'
import { usePreferences } from '@/lib/store/preferences.ts'
import type { Arrow, CircleMark } from '@/components/board/boardKit.ts'
import { useLegalMoves } from '@/lib/game/useLegalMoves.ts'
import { useT } from '@/lib/i18n/index.tsx'

type Feedback = { kind: 'correct' | 'wrong' | 'revealed'; text: string } | null

/** Délai avant que l'adversaire ne joue, pour qu'on voie le coup arriver. */
const REPLY_DELAY_MS = 650

/**
 * Temps laissé sur la position après un coup juste, avant d'enchaîner.
 *
 * Cliquer sur « Continuer » quand on vient de trouver le bon coup n'apprend
 * rien et casse le rythme : on répond, on attend, on clique, on recommence.
 * L'étape suivante s'enchaîne donc d'elle-même — mais pas instantanément : il
 * faut voir le « Exact ! », et surtout voir arriver la réponse de l'adversaire
 * quand il y en a une.
 */
const ADVANCE_DELAY_MS = 950
const ADVANCE_WITH_REPLY_MS = REPLY_DELAY_MS + 1100

export default function LessonPage() {
  const t = useT()
  const params = useParams<{ lessonId: string }>()
  const router = useRouter()
  const lesson = findLesson(params.lessonId)

  const voiceEnabled = usePreferences((state) => state.voiceEnabled)
  const setPreference = usePreferences((state) => state.set)
  const ecrire = useSan()

  const [stepIndex, setStepIndex] = useState(0)
  /**
   * Fiche ou échiquier.
   *
   * Une leçon ordinaire s'ouvre sur l'échiquier : on ne risque rien à apprendre
   * comment bouge le fou. Un piège s'ouvre sur sa fiche, parce qu'il faut savoir
   * ce qu'il coûte **avant** de le jouer, et parce que c'est le seul endroit où
   * proposer la révision à celui qui l'a déjà vu.
   */
  const [screen, setScreen] = useState<'brief' | 'run'>(lesson?.trap ? 'brief' : 'run')
  /** Rejouer la ligne sans texte, sans flèche et sans consigne. */
  const [revision, setRevision] = useState(false)
  /** Étapes déjà faites, lues une fois au montage — `localStorage` n'existe pas au rendu serveur. */
  const [dejaFait, setDejaFait] = useState(0)
  /** À droite du fil d'Ariane, où le plateau pose sa bascule 2D / 3D / plein écran. */
  const [emplacementBascule, setEmplacementBascule] = useState<HTMLElement | null>(null)
  /** Coups réellement choisis par l'apprenant, pour rejouer fidèlement. */
  const [played, setPlayed] = useState<PlayedByStep>({})

  const [fen, setFen] = useState('')
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [solved, setSolved] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [revealArrow, setRevealArrow] = useState<Arrow | null>(null)
  /** Enchaînement en attente, annulé dès qu'on navigue à la main. */
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

    // Ouvrir la fiche d'un piège n'est pas commencer la leçon. Sans ce garde-fou
    // la fiche s'annonçait « Reprendre — tu en es à l'étape 1 » à quelqu'un qui
    // venait seulement de la regarder, et le bouton « Découvrir » n'apparaissait
    // jamais.
    if (screen === 'run') saveProgress(lesson.id, stepIndex + 1, false)

    // Un enchaînement resté en attente sauterait l'étape qu'on vient d'ouvrir.
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current)
      advanceTimer.current = null
    }

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
  }, [stepIndex, lesson?.id, screen])

  // ── Lecture à voix haute ──────────────────────────────────────────────────
  //
  // Un seul effet, dont le nettoyage coupe la voix. Il y avait auparavant un
  // garde-fou par `useRef` qui mémorisait la dernière étape lue : en mode strict
  // React monte, démonte et remonte le composant, si bien que la première phrase
  // était prononcée, aussitôt coupée par le démontage, puis considérée comme
  // « déjà lue » au remontage. Résultat : le message d'introduction restait muet
  // alors que les suivants passaient.
  const spoken = step && !revision ? t(step.say) : ''
  useEffect(() => {
    if (!spoken || !voiceEnabled) return
    speak(spoken)
    return () => stopSpeaking()
  }, [spoken, voiceEnabled])

  // Progression réelle, pour que la fiche propose « Reprendre » plutôt que
  // « Découvrir » à celui qui a déjà commencé. Lue au montage seulement : la
  // sauvegarde de l'étape courante la ferait bouger à chaque coup.
  const lessonId = lesson?.id
  useEffect(() => {
    if (!lessonId) return
    setDejaFait(loadProgress()[lessonId]?.steps ?? 0)
  }, [lessonId])

  // La voix neuronale demande une seconde ou deux de calcul. On prépare donc
  // l'étape suivante pendant qu'on écoute celle-ci : au moment de cliquer sur
  // « Continuer », la phrase est déjà prête et part sans attente.
  const suivante = lesson?.steps[stepIndex + 1]
  const upcomingSay = suivante && !revision ? t(suivante.say) : ''
  useEffect(() => {
    if (!upcomingSay || !voiceEnabled) return
    prefetchSpeech(upcomingSay)
  }, [upcomingSay, voiceEnabled])

  /**
   * Cases citées par le coach, à montrer sur l'échiquier.
   *
   * Quatre-vingts étapes nomment une case — « le cavalier en f3 attaque le
   * pion e5 » — et dix-neuf seulement la montraient. Pour les soixante autres,
   * il fallait la chercher soi-même, ce qui est précisément ce qu'un débutant
   * ne sait pas encore faire vite.
   *
   * Le surlignage explicite d'une étape reste prioritaire : quand l'auteur a
   * désigné une case précise, il a une raison de ne pas montrer les autres.
   */
  const spokenSquares = useMemo<Square[]>(() => {
    // En révision, montrer les cases citées reviendrait à souffler la réponse :
    // c'est exactement ce qu'on vient de retirer.
    if (revision) return []
    if (step?.highlight?.length) return step.highlight as Square[]
    if (!step?.say) return []
    const found = t(step.say).match(/\b[a-h][1-8]\b/g) ?? []
    return [...new Set(found)] as Square[]
  }, [step, t, revision])

  /**
   * Roi maté, s'il y en a un.
   *
   * Les leçons de mat se terminent sur la position gagnante, et rien ne la
   * distinguait de la précédente : c'est précisément le moment qu'on veut voir.
   */
  const mate = useMemo(() => {
    if (!fen) return null
    try {
      const board = new Chess(fen, { skipValidation: true })
      if (!board.isCheckmate()) return null
      return board.findPiece({ type: 'k', color: board.turn() })[0] ?? null
    } catch {
      // Position illustrative sans roi : rien à annoncer.
      return null
    }
  }, [fen])

  // ── Coups légaux ──────────────────────────────────────────────────────────
  const legalMoves = useLegalMoves(fen, Boolean(step) && needsAction && !solved)

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
          text: step.hint ?? t('lesson.wrongMove'),
        })
        return
      }

      playMoveFor(move)

      setPlayed((current) => ({ ...current, [stepIndex]: move.san }))
      setFen(board.fen())
      setLastMove({ from: move.from, to: move.to })
      setSolved(true)
      setFeedback({ kind: 'correct', text: 'Exact !' })

      // Enchaînement automatique, sauf sur la dernière étape : terminer une
      // leçon et partir vers la suivante est une décision, pas une conséquence.
      if (!isLast) {
        advanceTimer.current = setTimeout(
          () => setStepIndex((current) => current + 1),
          step.reply ? ADVANCE_WITH_REPLY_MS : ADVANCE_DELAY_MS,
        )
      }

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
    [step, lesson, solved, fen, stepIndex, isLast, t],
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
        text: t('lessonExtra.theMoveWas', { coup: ecrire(move.san) }),
      })
    } catch {
      setFeedback({ kind: 'revealed', text: t('lesson.cannotShow') })
    }
  }, [step, fen, ecrire, t])

  // ── Navigation ────────────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    if (!lesson) return
    if (isLast) {
      saveProgress(lesson.id, lesson.steps.length, true)
      playSound('victory')

      /*
        Arrivé par la carrière, on y retourne.
        Le paramètre `?carriere=3` distingue « je révise la fourchette parce que
        j'en ai envie » de « je passe le chapitre 4 ». Sans lui, revoir une
        vieille leçon validerait une étape à laquelle on n'était pas.
        On repart vers la carte plutôt que vers la leçon suivante : la carte est
        ce qui dit quoi faire ensuite, et c'est là que la récompense s'affiche.
      */
      const numero = chapitreDeLUrl(typeof window === 'undefined' ? null : window.location.search)
      const chapitre = numero === null ? null : chapitreCarriere(numero)
      if (chapitre && chapitre.lecon === lesson.id) {
        void signaler({ type: 'lecon' }).then((gains) => {
          deposerGains(gains, chapitre.titre)
          router.push('/carriere')
        })
        return
      }

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
        <h1 className="font-display text-2xl font-semibold">{t('lesson.notFound')}</h1>
        <p className="mt-2 text-muted">{t('lesson.notFoundHint')}</p>
        <Link
          href="/apprendre"
          className="mt-6 inline-flex items-center gap-1.5 text-accent hover:underline"
        >
          <ArrowLeft size={15} aria-hidden />
          {t('lesson.backToCurriculum')}
        </Link>
      </div>
    )
  }

  if (!step) return null

  // En révision, l'échiquier est nu : ni flèche d'auteur, ni cercle, ni
  // projecteur. La flèche « montre-moi » reste, elle : la demander est un
  // geste volontaire, et refuser d'aider quelqu'un qui bloque n'apprend rien.
  const arrows: Arrow[] = [
    ...(revision
      ? []
      : ((step.arrows ?? []).map((arrow) => ({
          from: arrow.from,
          to: arrow.to,
          color: arrow.color ?? ('green' as const),
        })) as Arrow[])),
    ...(revealArrow ? [revealArrow] : []),
  ]

  const circles: CircleMark[] = revision
    ? []
    : (step.circles ?? []).map((circle) => ({
        square: circle.square,
        color: circle.color ?? 'green',
      }))

  const orientation: Color = (step.orientation as Color) ?? 'w'
  const previous = previousLesson(lesson.id)
  const upcoming = nextLesson(lesson.id)

  // ── La fiche du piège ─────────────────────────────────────────────────────
  if (screen === 'brief' && lesson.trap) {
    const brief = lesson.trap
    const commence = dejaFait > 0
    const depart = lesson.steps.find((candidat) => candidat.fen)?.fen ?? ''
    const tuiles = [
      { label: t('lesson.trapOpening'), value: t(brief.opening) },
      {
        label: t('lesson.trapSide'),
        value: t(brief.color === 'w' ? 'lesson.trapSideWhite' : 'lesson.trapSideBlack'),
      },
      { label: t('lesson.trapRisk'), value: t(brief.risk) },
      { label: t('lesson.trapTheme'), value: t(brief.theme) },
    ]

    return (
      <div className="mx-auto w-full max-w-[1200px] px-3 py-4 sm:px-5 lg:py-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Link
            href="/apprendre"
            className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft size={15} aria-hidden />
            {t('bits.syllabus')}
          </Link>
          <span className="text-faint" aria-hidden>
            /
          </span>
          <span className="text-sm font-medium">
            {lesson.icon} {t(lesson.title)}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_440px]">
          {/* Le plateau de la leçon, à sa position de départ et sans interaction. */}
          <div className="min-w-0">
            <ChessBoard
              fen={depart}
              orientation={brief.color}
              playable={null}
              lastMove={null}
              allowAnnotations={false}
            />
          </div>

          <div className="flex flex-col gap-3">
            <Card className="p-5">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-accent">
                {t(brief.opening)}
              </p>
              <h1 className="mt-1 font-display text-[26px] font-semibold leading-tight">
                {t(lesson.title)}
              </h1>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{t(lesson.summary)}</p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {tuiles.map((tuile) => (
                  <div
                    key={tuile.label}
                    className="rounded-[var(--radius-sm)] bg-surface px-3 py-2"
                  >
                    <div className="text-[11px] uppercase tracking-wide text-faint">
                      {tuile.label}
                    </div>
                    <div className="mt-0.5 text-sm font-medium">{tuile.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Button
                  variant="primary"
                  fullWidth
                  icon={<BookOpen size={15} />}
                  onClick={() => {
                    setRevision(false)
                    setStepIndex(commence ? Math.min(dejaFait, lesson.steps.length) - 1 : 0)
                    setScreen('run')
                  }}
                >
                  {commence ? t('lesson.trapResume') : t('lesson.trapDiscover')}
                </Button>
                <Button
                  fullWidth
                  icon={<Repeat size={15} />}
                  onClick={() => {
                    setRevision(true)
                    setStepIndex(0)
                    setScreen('run')
                  }}
                >
                  {t('lesson.trapRevise')}
                </Button>
              </div>
              <p className="mt-2 text-xs text-faint">
                {commence
                  ? t('lesson.trapResumeHint', { n: dejaFait })
                  : t('lesson.trapDiscoverHint')}{' '}
                · {t('lesson.trapReviseHint')}
              </p>
            </Card>

            <Card className="p-5">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-faint">
                {t('lesson.trapBrief')}
              </p>
              <p className="mt-2 text-[15px] leading-relaxed">{t(brief.caution)}</p>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-faint">
                <ShieldCheck size={13} aria-hidden />
                {t('lesson.trapVerified')} ·{' '}
                {t('lesson.trapLength', { minutes: lesson.minutes, steps: lesson.steps.length })}
              </p>
            </Card>

            <div className="grid gap-2 text-xs">
              {previous && (
                <Link
                  href={`/apprendre/${previous.id}`}
                  className="flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-ink"
                >
                  <ArrowLeft size={12} aria-hidden />
                  <span className="truncate">
                    {previous.icon} {t(previous.title)}
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
                    {upcoming.icon} {t(upcoming.title)}
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="etude mx-auto w-full max-w-[1200px] px-3 py-4 sm:px-5 lg:py-8">
      <div className="etude-tete">
        {/* ── En-tête ────────────────────────────────────────────────── */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Link
            href="/apprendre"
            className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft size={15} aria-hidden />
            {t('bits.syllabus')}
          </Link>
          <span className="text-faint" aria-hidden>
            /
          </span>
          <span className="text-sm font-medium">
            {lesson.icon} {t(lesson.title)}
          </span>
          {/* Le haut-parleur n'est plus ici — il est dans le panneau du coach,
              c'est-à-dire à côté du texte qu'il fait lire. Sur téléphone,
              l'en-tête se replie : le fil d'Ariane prenait une ligne, le titre
              une deuxième, et le bouton se retrouvait tout seul sur une
              troisième, à gauche, sans rien pour dire ce qu'il coupait. Trois
              lignes d'en-tête, c'est autant de pris sur l'échiquier et sur le
              texte, qui sont toute la leçon. */}
          {lesson.trap && (
            <button
              type="button"
              onClick={() => {
                stopSpeaking()
                setScreen('brief')
              }}
              className="text-sm text-muted underline-offset-2 transition-colors hover:text-ink hover:underline"
            >
              {t('lesson.trapBackToBrief')}
            </button>
          )}
          {revision && <Chip className="text-accent">{t('lesson.revisionBadge')}</Chip>}
          <Chip className="ml-auto">
            {t('lesson.stepOf', { n: stepIndex + 1, total: lesson.steps.length })}
          </Chip>
          {/* La bascule de vue, en tête plutôt que sous le plateau, qui
              récupère sa rangée. Le plateau la dessine lui-même ici. */}
          <div ref={setEmplacementBascule} className="hidden sm:block" />
        </div>

        <div className="mb-4 h-1 overflow-hidden rounded-full bg-surface-strong">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-400"
            style={{ width: `${((stepIndex + 1) / lesson.steps.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="etude-corps grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* ── Échiquier ────────────────────────────────────────────── */}
        <div className="etude-plateau min-w-0">
          <div className="etude-cadre">
            <ChessBoard
              fitParentHeight
              emplacementBascule={emplacementBascule}
              fen={fen}
              orientation={orientation}
              playable={needsAction && !solved ? orientation : null}
              legalMoves={legalMoves}
              onMove={handleMove}
              lastMove={lastMove}
              highlights={spokenSquares}
              arrows={arrows}
              circles={circles}
              spotlight={step.spotlight}
              checkSquare={mate}
              checkmate={mate !== null}
              allowAnnotations={false}
            />
          </div>

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
                {/* La consigne nomme le coup : en révision, elle est la réponse. */}
                {feedback?.text ??
                  (step.instruction && !revision ? t(step.instruction) : t('lesson.yourTurn'))}
              </span>
              {!solved && attempts >= 1 && (
                <Button size="sm" variant="ghost" icon={<Eye size={13} />} onClick={reveal}>
                  {t('lessonExtra.showMe')}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ── Panneau du coach ─────────────────────────────────────── */}
        <div className="etude-aside flex flex-col gap-3">
          <Card glow className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <span
                className="grid h-8 w-8 place-items-center rounded-full"
                style={{ background: 'color-mix(in oklab, var(--accent) 18%, transparent)' }}
                aria-hidden
              >
                <Volume2 size={14} className="text-accent" />
              </span>
              <span className="text-[12px] font-semibold text-faint">{t('lesson.coach')}</span>
              {/* Couper la voix, à côté de ce qu'elle lit : un haut-parleur
                  posé dans une barre ne dit pas ce qu'il fait taire — les
                  pièces, la fin de partie, une musique ? Ici, il n'y a aucun
                  doute. */}
              <button
                type="button"
                onClick={() => {
                  if (voiceEnabled) stopSpeaking()
                  setPreference('voiceEnabled', !voiceEnabled)
                }}
                className={clsx(
                  'ml-auto grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] transition-colors hover:bg-surface-hover',
                  voiceEnabled ? 'text-accent' : 'text-faint',
                )}
                aria-label={t(voiceEnabled ? 'lesson.muteCoach' : 'lesson.unmuteCoach')}
                title={t(voiceEnabled ? 'lesson.muteCoach' : 'lesson.unmuteCoach')}
              >
                {voiceEnabled ? (
                  <Volume2 size={15} aria-hidden />
                ) : (
                  <VolumeX size={15} aria-hidden />
                )}
              </button>
              <button
                type="button"
                onClick={() => speak(t(step.say))}
                className="grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] text-faint transition-colors hover:bg-surface-hover hover:text-ink"
                aria-label={t('lesson.replay')}
                title={t('lesson.replay')}
              >
                <RotateCcw size={13} aria-hidden />
              </button>
            </div>

            <p className="text-[15px] leading-relaxed">
              {revision
                ? t(needsAction ? 'lesson.revisionSilent' : 'lesson.revisionWatch')
                : renderBold(t(step.say))}
            </p>
          </Card>

          {/* Collées en bas sur téléphone, comme dans les puzzles et la
              relecture guidée : « Continuer » est le geste qu'on répète à
              chaque étape, et il se trouvait sous la ligne de flottaison dès
              que la consigne dépassait trois lignes. `bottom-16` dégage la
              barre de navigation basse. */}
          <div className="sticky bottom-16 z-10 -mx-1 flex gap-2 rounded-[var(--radius)] bg-bg/85 px-1 py-2 backdrop-blur-sm lg:static lg:mx-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <Button
              variant="ghost"
              onClick={goPrevious}
              disabled={stepIndex === 0}
              icon={<ArrowLeft size={15} />}
            >
              {t('lesson.previous')}
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={goNext}
              disabled={needsAction && !solved}
              icon={<ArrowRight size={15} />}
            >
              {isLast
                ? upcoming
                  ? t('lesson.nextLesson')
                  : t('lessonExtra.finish')
                : t('lessonExtra.carryOn')}
            </Button>
          </div>

          {needsAction && solved && (
            <Button size="sm" variant="ghost" icon={<RotateCcw size={13} />} onClick={restartStep}>
              {t('lesson.replayStep')}
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
                  {previous.icon} {t(previous.title)}
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
                  {upcoming.icon} {t(upcoming.title)}
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
