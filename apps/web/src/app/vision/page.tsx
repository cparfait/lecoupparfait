'use client'

/**
 * Vision — reconnaître une case au premier coup d'œil.
 *
 * L'exercice le plus court du programme, et l'un des plus rentables. Tant qu'on
 * cherche « f6 » pendant trois secondes, on n'a pas de temps de cerveau pour
 * calculer : on relit le coup au lieu de le comprendre, on rate les menaces
 * diagonales, on perd sa pendule à des choses qui ne sont pas des échecs.
 *
 * Trente secondes par manche, sans pénalité de temps sur l'erreur — on veut
 * installer un réflexe, pas fabriquer de l'anxiété. Le compte des erreurs
 * suffit à mesurer le progrès.
 *
 * L'échiquier se retourne à volonté : voir depuis les Noirs est un exercice
 * différent, et c'est précisément celui qui manque à la plupart des débutants.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Play, RotateCcw, Timer, Trophy } from 'lucide-react'
import clsx from 'clsx'
import type { Color, Square } from 'chess.js'
import {
  BOARD_SKINS,
  isLightSquare,
  orderedSquares,
  squarePosition,
} from '@/components/board/boardKit.ts'
import { Button, Card, Chip, Toggle } from '@/components/ui/index.tsx'
import { playSound } from '@/lib/sound.ts'
import { usePreferencesDe } from '@/lib/store/preferences.ts'
import { useT } from '@/lib/i18n/index.tsx'

/** Durée d'une manche. Assez court pour se relancer, assez long pour chauffer. */
const ROUND_SECONDS = 30

/** Meilleur score, conservé d'une visite à l'autre. */
const BEST_KEY = 'coupparfait.visionBest'

type Phase = 'attente' | 'enCours' | 'fini'

const ALL_SQUARES = orderedSquares('w')

function randomSquare(exclude: Square | null): Square {
  let square: Square
  do {
    square = ALL_SQUARES[Math.floor(Math.random() * ALL_SQUARES.length)]!
  } while (square === exclude)
  return square
}

export default function VisionPage() {
  const t = useT()
  const prefs = usePreferencesDe('boardStyle')
  const skin = BOARD_SKINS[prefs.boardStyle] ?? BOARD_SKINS.aurore

  const [phase, setPhase] = useState<Phase>('attente')
  const [orientation, setOrientation] = useState<Color>('w')
  const [target, setTarget] = useState<Square>('e4')
  const [remaining, setRemaining] = useState(ROUND_SECONDS)
  const [found, setFound] = useState(0)
  const [missed, setMissed] = useState(0)
  const [best, setBest] = useState(0)
  /** Dernière réponse, pour la retourner en vert ou en rouge un instant. */
  const [verdict, setVerdict] = useState<{ square: Square; ok: boolean } | null>(null)

  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem(BEST_KEY) ?? '0'))
    } catch {
      // Stockage indisponible : le meilleur score ne survivra pas, sans plus.
    }
  }, [])

  // ── Chronomètre ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'enCours') return
    const timer = setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          clearInterval(timer)
          setPhase('fini')
          return 0
        }
        return value - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [phase])

  // Enregistrement du record à la fin de la manche.
  const foundRef = useRef(found)
  foundRef.current = found
  useEffect(() => {
    if (phase !== 'fini') return
    playSound('victory')
    setBest((current) => {
      if (foundRef.current <= current) return current
      try {
        localStorage.setItem(BEST_KEY, String(foundRef.current))
      } catch {
        // Sans stockage, le record vaut pour la session seulement.
      }
      return foundRef.current
    })
  }, [phase])

  const start = useCallback(() => {
    setFound(0)
    setMissed(0)
    setRemaining(ROUND_SECONDS)
    setTarget(randomSquare(null))
    setVerdict(null)
    setPhase('enCours')
    playSound('start')
  }, [])

  const answer = useCallback(
    (square: Square) => {
      if (phase !== 'enCours') return

      const ok = square === target
      setVerdict({ square, ok })
      // La marque s'efface d'elle-même : elle informe sans jamais bloquer.
      setTimeout(() => setVerdict(null), ok ? 220 : 420)

      if (ok) {
        setFound((value) => value + 1)
        setTarget(randomSquare(target))
        playSound('move')
      } else {
        // Pas de temps retiré : on veut un réflexe, pas de l'appréhension.
        setMissed((value) => value + 1)
        playSound('error')
      }
    },
    [phase, target],
  )

  const squares = useMemo(() => orderedSquares(orientation), [orientation])
  const accuracy = found + missed > 0 ? Math.round((found / (found + missed)) * 100) : 100

  return (
    <div className="page">
      {/* Sur téléphone, le titre est plus petit et la consigne disparaît pendant
          la manche : chaque ligne gardée ici est prise sur l'échiquier, et la
          consigne ne s'adresse qu'à celui qui n'a pas encore commencé. */}
      <h1 className="titre-affiche text-[2.1rem] sm:text-[2.6rem] lg:text-[3rem]">
        {t('nav.vision')}
      </h1>
      <p
        className={clsx(
          'mt-2 max-w-2xl text-muted max-lg:text-[14px]',
          phase === 'enCours' && 'max-lg:hidden',
        )}
      >
        {t('vision.intro')}
      </p>

      {/* ── L'ordre des blocs, et il n'est pas le même sur les deux écrans ──
          Sur grand écran, l'échiquier à gauche et le panneau à droite : on voit
          la case demandée et l'échiquier d'un seul regard.

          Sur téléphone, la colonne s'empilait dans l'ordre du code — échiquier
          d'abord, panneau ensuite. La case à trouver s'affichait donc *sous*
          un échiquier qui prend toute la largeur, c'est-à-dire hors de l'écran :
          il fallait faire défiler pour lire « f6 », remonter pour cliquer, et
          recommencer trente fois. L'exercice était inutilisable, et c'est ce
          qu'on voyait comme un problème de dimensionnement.

          `max-lg:contents` fait disparaître le panneau de la mise en page sous
          `lg` : ses enfants deviennent des cases de la grille, et chacun prend
          alors son rang — la case demandée et les compteurs avant l'échiquier,
          les réglages après. */}
      <div className="mt-5 grid gap-3 sm:mt-7 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* ── Échiquier ────────────────────────────────────────────── */}
        <div className="order-3 min-w-0 lg:order-none">
          <div
            /* La largeur est bornée par la hauteur restante : sur un écran
               court — un téléphone en 16:9, ou n'importe quel appareil en
               paysage —, un carré large comme l'écran dépasse forcément par le
               bas, et l'on reperd la case demandée qu'on vient de remonter. */
            className="relative mx-auto aspect-square w-full max-w-[min(100%,calc(100dvh-21rem))] overflow-hidden rounded-[var(--radius)] lg:max-w-none"
            style={{ boxShadow: `0 0 0 2px ${skin.frame}` }}
          >
            {squares.map((square) => {
              const { left, top } = squarePosition(square, orientation)
              const light = isLightSquare(square)
              const marked = verdict?.square === square

              return (
                <button
                  key={square}
                  type="button"
                  onClick={() => answer(square)}
                  disabled={phase !== 'enCours'}
                  aria-label={square}
                  className={clsx(
                    'absolute transition-colors duration-150',
                    phase === 'enCours' ? 'cursor-pointer' : 'cursor-default',
                  )}
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    width: '12.5%',
                    height: '12.5%',
                    background: marked
                      ? verdict.ok
                        ? 'var(--q-best)'
                        : 'var(--q-blunder)'
                      : light
                        ? skin.light
                        : skin.dark,
                  }}
                >
                  {/* Les coordonnées sont volontairement absentes : les afficher
                      rendrait l'exercice inutile. */}
                  <span className="sr-only">{square}</span>
                </button>
              )
            })}

            {phase !== 'enCours' && (
              <div className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-[2px]">
                <div className="text-center">
                  {phase === 'fini' && (
                    <>
                      <p className="font-display text-5xl font-bold tabular-nums text-ink">
                        {found}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        cases trouvées · {accuracy} % de réussite
                      </p>
                      {found > 0 && found >= best && (
                        <p className="mt-2 text-sm font-semibold text-accent">
                          {t('bits.newRecord')}
                        </p>
                      )}
                    </>
                  )}
                  <Button
                    variant="primary"
                    size="lg"
                    className="mt-4"
                    icon={phase === 'fini' ? <RotateCcw size={16} /> : <Play size={16} />}
                    onClick={start}
                  >
                    {phase === 'fini' ? t('puzzles.restart') : t('learn.start')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Panneau ──────────────────────────────────────────────── */}
        <div className="max-lg:contents lg:flex lg:flex-col lg:gap-3">
          <Card glow className="order-1 p-4 text-center sm:p-5 lg:order-none">
            {phase === 'enCours' ? (
              <>
                <p className="text-[12px] font-semibold text-faint">{t('last.clickOn')}</p>
                <p className="mt-1 font-display text-5xl font-bold tabular-nums text-accent sm:text-6xl">
                  {target}
                </p>
              </>
            ) : (
              <p className="py-4 text-sm text-muted sm:py-6">
                {t(phase === 'fini' ? 'vision.over' : 'vision.ready')}
              </p>
            )}
          </Card>

          <div className="order-2 grid grid-cols-3 gap-2 lg:order-none">
            {[
              { label: t('vision.time'), value: `${remaining}s`, icon: Timer },
              { label: t('vision.found'), value: String(found), icon: null },
              { label: t('vision.record'), value: String(best), icon: Trophy },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label} className="p-3 text-center">
                <p className="flex items-center justify-center gap-1 text-[12px] text-faint">
                  {Icon && <Icon size={11} aria-hidden />}
                  {label}
                </p>
                <p className="mt-0.5 font-display text-xl font-bold tabular-nums">{value}</p>
              </Card>
            ))}
          </div>

          {missed > 0 && (
            <Chip tone="danger" className="order-4 self-start lg:order-none">
              {missed} erreur{missed > 1 ? 's' : ''}
            </Chip>
          )}

          <Card className="order-5 p-4 lg:order-none">
            <Toggle
              label={t('vision.fromBlack')}
              description={t('vision.fromBlackHint')}
              checked={orientation === 'b'}
              onChange={(value) => setOrientation(value ? 'b' : 'w')}
              disabled={phase === 'enCours'}
            />
          </Card>

          <p className="order-6 text-xs leading-relaxed text-faint lg:order-none">
            {t('vision.noPenalty')}
          </p>
        </div>
      </div>
    </div>
  )
}
