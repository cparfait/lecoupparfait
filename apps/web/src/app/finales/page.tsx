'use client'

/**
 * Entraînement aux finales.
 *
 * 3 568 positions classées, de « mater avec une dame » à « tenir la nulle avec
 * une tour de moins ». C'est le domaine où les joueurs de club perdent le plus
 * de demi-points, et paradoxalement celui qu'ils travaillent le moins.
 *
 * Le principe : on te donne une position et un objectif — **gagner** ou
 * **annuler** —, l'ordinateur défend au mieux, et on ne valide que si tu y
 * arrives réellement. Pas de solution à réciter : il faut jouer jusqu'au bout.
 *
 * Positions issues de supertorpe/chessendgametraining, sous licence GPL-3.0.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Flag,
  Handshake,
  RotateCcw,
  Target,
  Trophy,
} from 'lucide-react'
import clsx from 'clsx'
import type { Color } from 'chess.js'
import { ChessBoard } from '@/components/board/ChessBoard.tsx'
import { Button, Card, Chip, EmptyState, Spinner } from '@/components/ui/index.tsx'
import { BoutonEcouter } from '@/components/ui/BoutonEcouter.tsx'
import {
  familyProgress,
  loadEndgameProgress,
  markEndgameSolved,
  useEndgames,
  type EndgameFamily,
  type EndgameGroup,
  type EndgamePosition,
  type EndgameProgress,
} from '@/lib/game/useEndgames.ts'
import { useChessGame } from '@/lib/game/useChessGame.ts'
import { useBotPlayer } from '@/lib/game/useBotPlayer.ts'
import { BOT_LEVELS } from '@coupparfait/core'
import { playResultSound, playSound } from '@/lib/sound.ts'
import { speak } from '@/lib/speech.ts'
import { usePreferences } from '@/lib/store/preferences.ts'
import { VoiceQuickToggle } from '@/components/layout/VoiceQuickToggle.tsx'
import { avecElements, langue, useI18n, useT } from '@/lib/i18n/index.tsx'

type Screen =
  | { kind: 'families' }
  | { kind: 'groups'; family: EndgameFamily }
  | { kind: 'play'; family: EndgameFamily; group: EndgameGroup; index: number }

export default function EndgamesPage() {
  const t = useT()
  const { families, ready } = useEndgames()
  const [screen, setScreen] = useState<Screen>({ kind: 'families' })
  const [progress, setProgress] = useState<EndgameProgress>({})

  useEffect(() => setProgress(loadEndgameProgress()), [])

  if (!ready) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner size={26} className="text-accent" />
      </div>
    )
  }

  if (!families || families.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Card>
          <EmptyState
            icon={<Target size={28} />}
            title={t('endgames.missingBase')}
            description={t('endgames.missingBaseHint')}
          />
          <div className="border-t border-line/60 px-5 py-4">
            <code className="block rounded bg-surface px-2 py-1.5 font-mono text-[12px]">
              node scripts/build-endgames.mjs
            </code>
          </div>
        </Card>
      </div>
    )
  }

  if (screen.kind === 'play') {
    return (
      <EndgameTrainer
        family={screen.family}
        group={screen.group}
        index={screen.index}
        onBack={() => setScreen({ kind: 'groups', family: screen.family })}
        onSolved={() => {
          markEndgameSolved(screen.group.id, screen.index)
          setProgress(loadEndgameProgress())
        }}
        onNext={() => {
          const next = screen.index + 1
          if (next < screen.group.positions.length) {
            setScreen({ ...screen, index: next })
          } else {
            setScreen({ kind: 'groups', family: screen.family })
          }
        }}
      />
    )
  }

  if (screen.kind === 'groups') {
    return (
      <GroupList
        family={screen.family}
        progress={progress}
        onBack={() => setScreen({ kind: 'families' })}
        onPick={(group, index) => setScreen({ kind: 'play', family: screen.family, group, index })}
      />
    )
  }

  return (
    <FamilyList
      families={families}
      progress={progress}
      onPick={(family) => setScreen({ kind: 'groups', family })}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Familles
// ─────────────────────────────────────────────────────────────────────────────

function FamilyList({
  families,
  progress,
  onPick,
}: {
  families: EndgameFamily[]
  progress: EndgameProgress
  onPick: (family: EndgameFamily) => void
}) {
  const t = useT()
  const bcp47 = langue(useI18n().locale).bcp47
  const total = families.reduce(
    (sum, family) => sum + family.groups.reduce((n, g) => n + g.positions.length, 0),
    0,
  )

  return (
    <div className="page">
      <h1 className="titre-affiche text-[2.1rem] sm:text-[2.6rem] lg:text-[3rem]">
        {t('endgames.title')}
      </h1>
      <p className="mt-2 max-w-2xl text-muted max-lg:text-[14px] max-lg:leading-relaxed">
        {t('endgames.intro', { n: total.toLocaleString(bcp47) })}
      </p>

      {/* Deux colonnes, et des cartes plus basses.
          Huit familles empilées sur une seule colonne dans un conteneur large
          donnaient huit blocs de cent trente pixels : la page demandait trois
          écrans de défilement pour montrer une liste qu'on veut embrasser d'un
          coup d'œil avant de choisir. */}
      <div className="mt-8 grid gap-2.5 lg:grid-cols-2">
        {families.map((family, index) => {
          const stats = familyProgress(family, progress)
          const percent = stats.total > 0 ? Math.round((stats.solved / stats.total) * 100) : 0

          return (
            <button
              key={family.id}
              type="button"
              onClick={() => onPick(family)}
              className="animate-slide-up glass group flex w-full items-start gap-3 p-4 text-left transition-transform hover:-translate-y-0.5"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius)] text-xl"
                style={{ background: 'color-mix(in oklab, var(--accent) 14%, transparent)' }}
                aria-hidden
              >
                {family.icon}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-2">
                  <span className="font-display text-base font-semibold">{family.nameFr}</span>
                  <Chip>{t('endgames.configurations', { n: family.groups.length })}</Chip>
                  {stats.solved > 0 && (
                    <span className="text-xs tabular-nums text-accent">
                      {t('endgames.solvedOf', { n: stats.solved, total: stats.total })}
                    </span>
                  )}
                </span>
                <span className="mt-1 line-clamp-2 block text-[14px] leading-snug text-muted">
                  {family.blurb}
                </span>
                {percent > 0 && (
                  <span className="mt-2.5 block h-1 overflow-hidden rounded-full bg-surface-strong">
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{ width: `${percent}%` }}
                    />
                  </span>
                )}
              </span>

              <ChevronRight
                size={18}
                className="mt-1 shrink-0 text-faint transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </button>
          )
        })}
      </div>

      <p className="mt-8 text-center text-[12px] text-faint">
        {avecElements(t('endgames.source'), {
          depot: (
            <a
              href="https://github.com/supertorpe/chessendgametraining"
              target="_blank"
              rel="noreferrer noopener"
              className="underline hover:text-ink"
            >
              supertorpe/chessendgametraining
            </a>
          ),
        })}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Configurations
// ─────────────────────────────────────────────────────────────────────────────

function GroupList({
  family,
  progress,
  onBack,
  onPick,
}: {
  family: EndgameFamily
  progress: EndgameProgress
  onBack: () => void
  onPick: (group: EndgameGroup, index: number) => void
}) {
  const t = useT()
  return (
    <div className="page">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} aria-hidden />
        {t('endgames.allFamilies')}
      </button>

      <h1 className="flex items-center gap-2.5 font-display text-2xl font-bold tracking-tight">
        <span aria-hidden>{family.icon}</span>
        {family.nameFr}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{family.blurb}</p>

      <div className="mt-6 space-y-2">
        {family.groups.map((group) => {
          const solved = new Set(progress[group.id] ?? [])
          return (
            <Card key={group.id} className="overflow-hidden">
              <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold first-letter:uppercase">
                    {group.nameFr}
                  </span>
                  <span className="block truncate text-[12px] text-faint">{group.name}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted">
                  {solved.size} / {group.positions.length}
                </span>
              </div>

              <div className="flex flex-wrap gap-1 border-t border-line/50 p-2.5">
                {group.positions.map((position, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => onPick(group, index)}
                    title={describePosition(position, t)}
                    className={clsx(
                      'grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] text-[12px] font-semibold transition-colors',
                      solved.has(index)
                        ? 'bg-[color-mix(in_oklab,var(--q-best)_22%,transparent)] text-[var(--q-best)]'
                        : 'bg-surface text-muted hover:bg-surface-hover hover:text-ink',
                    )}
                  >
                    {solved.has(index) ? <Check size={13} aria-hidden /> : index + 1}
                  </button>
                ))}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Ce que le coach annonce en arrivant sur une position.
 *
 * Le camp d'abord : c'est ce qui manque le plus vite quand on ne regarde pas
 * encore l'échiquier. Le mat annoncé ensuite, quand il est connu — savoir
 * qu'on cherche un mat en cinq n'est pas un indice, c'est la différence entre
 * chercher et tâtonner.
 */
function consigneParlee(
  position: EndgamePosition,
  camp: Color,
  t: ReturnType<typeof useT>,
): string {
  const couleur = t(camp === 'w' ? 'settings.white' : 'settings.black')
  if (position.target === 'draw') return t('endgames.spokenDraw', { couleur })
  const mat = position.mateIn ? t('endgames.spokenMate', { n: position.mateIn }) : ''
  return t('endgames.playAndWin', { couleur, mat })
}

function describePosition(position: EndgamePosition, t: ReturnType<typeof useT>): string {
  const objectif = t(position.target === 'checkmate' ? 'endgames.win' : 'endgames.holdDraw')
  const mat = position.mateIn ? t('endgames.mateIn', { n: position.mateIn }) : ''
  return `${objectif}${mat} · ${t('endgames.difficultyOf', { n: position.difficulty })}`
}

// ─────────────────────────────────────────────────────────────────────────────
//  Entraîneur
// ─────────────────────────────────────────────────────────────────────────────

type Outcome = 'playing' | 'won' | 'lost' | 'drawn'

function EndgameTrainer({
  family,
  group,
  index,
  onBack,
  onSolved,
  onNext,
}: {
  family: EndgameFamily
  group: EndgameGroup
  index: number
  onBack: () => void
  onSolved: () => void
  onNext: () => void
}) {
  const t = useT()
  const position = group.positions[index]!
  const voiceEnabled = usePreferences((state) => state.voiceEnabled)

  const [outcome, setOutcome] = useState<Outcome>('playing')
  const [attempt, setAttempt] = useState(0)

  // La couleur du joueur est celle au trait dans la position de départ.
  const playerColor = useMemo<Color>(
    () => (position.fen.split(' ')[1] === 'b' ? 'b' : 'w'),
    [position.fen],
  )
  const botColor: Color = playerColor === 'w' ? 'b' : 'w'

  const game = useChessGame({
    startFen: position.fen,
    onMove: (move) => {
      playSound(move.isCapture ? 'capture' : move.isCheck ? 'check' : 'move')
    },
    onGameOver: (status, result) => {
      const won = result === (playerColor === 'w' ? '1-0' : '0-1')
      const drawn = result === '1/2-1/2'

      // L'objectif décide de ce qui compte comme réussite.
      const success = position.target === 'checkmate' ? won : drawn
      setOutcome(success ? (position.target === 'draw' ? 'drawn' : 'won') : 'lost')

      if (success) {
        onSolved()
        playResultSound('win')
        if (voiceEnabled) {
          speak(
            t(position.target === 'checkmate' ? 'endgames.wonMessage' : 'endgames.drawnMessage'),
          )
        }
      } else {
        playResultSound('loss')
      }
    },
  })

  const { state, play, reset, undo } = game

  // Remise à zéro quand on change de position.
  useEffect(() => {
    reset(position.fen)
    setOutcome('playing')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position.fen, attempt])

  /**
   * La consigne, à voix haute, en arrivant sur la position.
   *
   * L'écran portait déjà le bouton qui coupe la voix, à côté de l'objectif —
   * et ne disait pourtant rien avant la fin de l'exercice. On coupait donc une
   * voix qu'on n'avait jamais entendue, et la seule phrase qu'elle réservait
   * — « Gagné » — arrivait quand la technique était trouvée, c'est-à-dire
   * quand on n'en avait plus besoin. La consigne, elle, est ce qu'il faut
   * savoir avant de jouer : de quel camp on est, et ce qu'on doit obtenir.
   *
   * Comme ailleurs, `speak` respecte lui-même le réglage de voix, et diffère
   * la phrase au premier geste si le navigateur refuse de parler avant qu'on
   * ait touché la page. Elle ne repart pas à chaque tentative : on relance une
   * position qu'on vient d'entendre.
   */
  useEffect(() => {
    speak(consigneParlee(position, playerColor, t))
  }, [position, playerColor, t])

  // L'adversaire défend au maximum de ses moyens : une finale ne s'apprend pas
  // contre un adversaire complaisant.
  useBotPlayer({
    fen: state.currentFen,
    botColor,
    level: BOT_LEVELS.length,
    turn: state.turn,
    active: outcome === 'playing' && !state.isGameOver,
    onMove: (from, to, promotion) => play(from, to, promotion),
  })

  const objective =
    position.target === 'checkmate'
      ? position.mateIn
        ? t('endgames.winWithMate', { n: position.mateIn })
        : t('endgames.win')
      : t('endgames.holdDraw')

  const voix = consigneParlee(position, playerColor, t)

  return (
    <div className="etude mx-auto w-full max-w-[1200px] px-3 py-4 sm:px-5 lg:py-8">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft size={15} aria-hidden />
          {family.nameFr}
        </button>
        <span className="text-faint" aria-hidden>
          /
        </span>
        <span className="text-sm font-medium first-letter:uppercase">{group.nameFr}</span>
        <Chip className="ml-auto">
          {index + 1} / {group.positions.length}
        </Chip>
        {/* La consigne de l'exercice est lue à voix haute : le bouton qui la
            coupe se tient ici, à côté d'elle. */}
        <VoiceQuickToggle />
      </div>

      <div className="etude-corps grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="etude-plateau min-w-0">
          <div className="etude-cadre">
            <ChessBoard
              fitParentHeight
              fen={state.fen}
              orientation={playerColor}
              playable={outcome === 'playing' && !state.isGameOver ? playerColor : null}
              legalMoves={state.legalMoves}
              onMove={play}
              lastMove={state.lastMove}
              checkSquare={state.checkSquare}
              checkmate={state.status === 'checkmate'}
            />
          </div>
        </div>

        <div className="etude-aside flex flex-col gap-3">
          {/* ── Objectif ─────────────────────────────────────────── */}
          <Card glow className="p-4">
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 text-[12px] font-semibold text-faint">
                {t('endgames.yourObjective')}
              </p>
              {/* Réentendre la consigne : elle est dite une fois, à l'arrivée,
                  et on arrive parfois avant d'écouter. */}
              <BoutonEcouter
                quoi={t('endgames.thisExercise')}
                annonce={t('endgames.listenInstruction')}
                texte={voix}
                className="-mr-1 -mt-1.5"
              />
            </div>
            <p className="mt-1.5 flex items-center gap-2 text-lg font-semibold">
              {position.target === 'checkmate' ? (
                <Trophy size={18} className="text-accent" aria-hidden />
              ) : (
                <Handshake size={18} className="text-accent" aria-hidden />
              )}
              {objective}
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">
              {t('endgames.youPlay', {
                couleur: t(playerColor === 'w' ? 'settings.white' : 'settings.black'),
              })}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Chip
                tone={
                  position.difficulty >= 4
                    ? 'danger'
                    : position.difficulty >= 3
                      ? 'warning'
                      : 'success'
                }
              >
                {'★'.repeat(position.difficulty)}
                {'☆'.repeat(5 - position.difficulty)}
              </Chip>
              <Chip>{t('endgames.piecesCount', { n: position.pieces })}</Chip>
              {position.tablebase && <Chip tone="accent">{t('endgames.solved')}</Chip>}
            </div>
          </Card>

          {/* ── Résultat ─────────────────────────────────────────── */}
          {outcome !== 'playing' && (
            <Card className="p-4">
              <div className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full"
                  style={{
                    background:
                      outcome === 'lost'
                        ? 'color-mix(in oklab, var(--q-blunder) 20%, transparent)'
                        : 'color-mix(in oklab, var(--q-best) 20%, transparent)',
                  }}
                  aria-hidden
                >
                  {outcome === 'lost' ? (
                    <Flag size={14} className="text-[var(--q-blunder)]" />
                  ) : (
                    <Check size={14} className="text-[var(--q-best)]" />
                  )}
                </span>
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{
                      color: outcome === 'lost' ? 'var(--q-blunder)' : 'var(--q-best)',
                    }}
                  >
                    {outcome === 'won'
                      ? t('endgames.won')
                      : outcome === 'drawn'
                        ? t('endgames.drawHeld')
                        : t(position.target === 'checkmate' ? 'endgames.missed' : 'endgames.lost')}
                  </p>
                  <p className="mt-1 text-[14px] leading-relaxed text-muted">
                    {outcome === 'lost'
                      ? t(
                          position.target === 'checkmate'
                            ? 'endgames.retryWin'
                            : 'endgames.retryDraw',
                        )
                      : t('endgames.acquired')}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* ── Actions ──────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2">
            {outcome === 'playing' ? (
              <>
                <Button
                  variant="ghost"
                  icon={<RotateCcw size={14} />}
                  onClick={() => setAttempt((n) => n + 1)}
                >
                  {t('puzzles.restart')}
                </Button>
                <Button variant="ghost" onClick={() => undo(2)} disabled={state.moves.length < 2}>
                  {t('bits.undo')}
                </Button>
              </>
            ) : (
              <>
                <Button variant="primary" fullWidth onClick={onNext}>
                  {t('level.nextPosition')}
                </Button>
                <Button
                  variant="ghost"
                  icon={<RotateCcw size={14} />}
                  onClick={() => setAttempt((n) => n + 1)}
                >
                  {t('rush.playAgain')}
                </Button>
              </>
            )}
          </div>

          <p className="text-[12px] leading-relaxed text-faint">{t('endgames.fiftyMoves')}</p>
        </div>
      </div>
    </div>
  )
}
