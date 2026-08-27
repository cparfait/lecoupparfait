'use client'

/**
 * Mode partie commentée.
 *
 * Après chaque coup, le moteur analyse la position **d'avant** en MultiPV et
 * répond à la question que se pose vraiment un débutant : *qu'est-ce que
 * j'aurais dû jouer, et pourquoi ?*
 *
 * Trois principes de conception :
 *
 *  1. **On analyse la position d'avant, pas celle d'après.** L'intérêt n'est pas
 *     de savoir où on en est, mais de voir les options qu'on avait et qu'on n'a
 *     pas vues.
 *  2. **On montre plusieurs coups.** Un seul « meilleur coup » laisse croire
 *     qu'il n'y avait qu'une solution. Voir les trois premiers choix, avec leur
 *     évaluation, apprend à comparer.
 *  3. **Le commentaire ne bloque jamais la partie.** Il s'affiche à côté, la
 *     partie continue. Un mode « pause » existe pour ceux qui veulent lire
 *     avant de poursuivre.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronRight,
  Eye,
  EyeOff,
  Lightbulb,
  Loader2,
  MessageSquareText,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react'
import clsx from 'clsx'
import { Chess } from 'chess.js'
import type { Color, Square } from 'chess.js'
import {
  QUALITY_STYLES,
  classifyMove,
  detectPositionMotifs,
  explainMove,
  formatScore,
  motifCopy,
  sanToFrench,
  uciLineToSan,
  winPercentFor,
  type EngineLine,
  type MotifId,
  type MoveQuality,
  type OpeningBook,
  type Score,
} from '@coupparfait/core'
import { Card, Chip } from '@/components/ui/index.tsx'
import { getEngine } from '@/lib/engine/client.ts'
import { speak, stopSpeaking } from '@/lib/speech.ts'
import { usePreferences } from '@/lib/store/preferences.ts'
import type { PlayedMove } from '@/lib/game/useChessGame.ts'
import type { Arrow } from '@/components/board/boardKit.ts'
import { LEGEND, legendFor, type LegendItem } from '@/components/board/ArrowLegend.tsx'

/** Une option qu'on avait, avec ce qu'elle valait. */
export interface Alternative {
  rank: number
  uci: string
  san: string
  score: Score
  /** Chances de victoire pour le camp qui jouait, 0–100. */
  win: number
  /** Suite prévue, en SAN. */
  line: string[]
  /** Vrai si c'est le coup effectivement joué. */
  played: boolean
  /** Ce que ce coup crée sur l'échiquier, en une phrase. */
  reason: string | null
}

export interface Commentary {
  /** Demi-coup commenté. */
  ply: number
  san: string
  color: Color
  /**
   * Position obtenue après le coup commenté.
   *
   * Sert à savoir si le commentaire parle encore de ce qui est à l'écran : dès
   * qu'un coup de plus est joué, les flèches deviennent fausses même si le
   * texte, lui, reste intéressant à relire.
   */
  fenAfter: string
  quality: MoveQuality
  headline: string
  body: string[]
  speech: string
  alternatives: Alternative[]
  highlights: Square[]
  scoreBefore: Score
  scoreAfter: Score
  winLoss: number
}

// ─────────────────────────────────────────────────────────────────────────────
//  Analyse
// ─────────────────────────────────────────────────────────────────────────────

export interface UseLiveCommentaryOptions {
  /** Coup à commenter — généralement le dernier joué. */
  move: PlayedMove | null
  enabled: boolean
  /** Ne commenter que les coups de ce camp. `null` = les deux. */
  onlyColor?: Color | null
  depth?: number
  /** Nombre d'alternatives à présenter. */
  alternatives?: number
  book?: OpeningBook | null
}

/**
 * Produit le commentaire d'un coup.
 *
 * L'analyse tourne dans le navigateur : rien ne part sur le réseau, et le
 * verdict arrive en une fraction de seconde. La profondeur reste modérée —
 * l'objectif est de repérer les fautes visibles, pas de départager deux
 * excellents coups, ce qui est le travail de la page d'analyse.
 */
export function useLiveCommentary({
  move,
  enabled,
  onlyColor = null,
  depth,
  alternatives = 3,
  book,
}: UseLiveCommentaryOptions) {
  const prefs = usePreferences()
  const [commentary, setCommentary] = useState<Commentary | null>(null)
  // Commentaires déjà produits, indexés par la position obtenue après le coup.
  // Cette clé-là, contrairement à un numéro de demi-coup, survit à une reprise :
  // si l'on revient en arrière et qu'on joue autre chose, l'ancien commentaire
  // ne réapparaît pas sur une position à laquelle il ne correspond plus.
  const [history, setHistory] = useState<Record<string, Commentary>>({})
  const [loading, setLoading] = useState(false)
  const requestId = useRef(0)

  useEffect(() => {
    if (!enabled || !move) return
    if (onlyColor !== null && move.color !== onlyColor) return

    const id = ++requestId.current
    const controller = new AbortController()
    setLoading(true)

    void (async () => {
      try {
        const engine = getEngine()
        await engine.start()
        // Le mode commenté doit juger, pas jouer : on retire tout bridage
        // qu'un adversaire artificiel aurait pu laisser.
        engine.setOptions([
          ['UCI_LimitStrength', false],
          ['Skill Level', 20],
        ])

        const searchDepth = depth ?? prefs.clientDepth
        const wanted = Math.max(2, Math.min(5, alternatives + 1))

        // Position **avant** le coup, en MultiPV : c'est là que sont les
        // options qu'on avait.
        const before = await engine.analyse({
          fen: move.before,
          depth: searchDepth,
          multiPv: wanted,
          signal: controller.signal,
        })
        if (id !== requestId.current) return

        const after = await engine.analyse({
          fen: move.after,
          depth: searchDepth,
          multiPv: 1,
          signal: controller.signal,
        })
        if (id !== requestId.current) return

        const scoreBefore = before.lines[0]?.score ?? { type: 'cp' as const, value: 0 }
        const scoreAfter = after.lines[0]?.score ?? { type: 'cp' as const, value: 0 }

        const classification = classifyMove({
          fenBefore: move.before,
          uci: move.uci,
          san: move.san,
          before: { score: scoreBefore, lines: before.lines },
          after: { score: scoreAfter },
          inBook: book?.isInBook(move.after) ?? false,
        })

        const topLine = before.lines.find((line) => line.multipv === 1) ?? before.lines[0]
        const bestUci = topLine?.pv[0] ?? null
        const bestSan = bestUci ? (uciLineToSan(move.before, [bestUci])[0] ?? null) : null
        const bestLine = topLine ? uciLineToSan(move.before, topLine.pv.slice(0, 6)) : []
        const opening = book?.lookup(move.after, prefs.locale) ?? null

        const explanation = explainMove({
          locale: prefs.locale,
          san: move.san,
          fenAfter: move.after,
          quality: classification.quality,
          scoreBefore,
          scoreAfter,
          winLoss: classification.winLoss,
          mover: move.color,
          motifs: classification.motifs,
          bestSan,
          bestLine,
          openingName: opening?.label ?? null,
        })

        const built: Commentary = {
          ply: 0,
          san: move.san,
          color: move.color,
          fenAfter: move.after,
          quality: classification.quality,
          headline: explanation.headline,
          body: explanation.body,
          speech: explanation.speech,
          alternatives: buildAlternatives(
            move.before,
            move.uci,
            move.color,
            before.lines,
            alternatives,
            prefs.locale,
          ),
          highlights: explanation.highlights,
          scoreBefore,
          scoreAfter,
          winLoss: classification.winLoss,
        }

        setCommentary(built)
        setHistory((current) => ({ ...current, [move.after]: built }))
      } catch {
        if (id === requestId.current) setCommentary(null)
      } finally {
        if (id === requestId.current) setLoading(false)
      }
    })()

    return () => controller.abort()
  }, [move, enabled, onlyColor, depth, alternatives, book, prefs.clientDepth, prefs.locale])

  return { commentary, loading, history }
}

/**
 * Transforme les lignes du moteur en alternatives commentées.
 *
 * Pour chacune, on rejoue le coup et on détecte ce qu'il crée : une fourchette,
 * un clouage, une pièce gagnée. C'est cette phrase-là qui apprend quelque
 * chose — « +1.2 » n'apprend rien.
 */
function buildAlternatives(
  fenBefore: string,
  playedUci: string,
  mover: Color,
  lines: EngineLine[],
  limit: number,
  locale: 'fr' | 'en',
): Alternative[] {
  const out: Alternative[] = []

  for (const line of lines.slice(0, limit)) {
    const uci = line.pv[0]
    if (!uci) continue

    const san = uciLineToSan(fenBefore, [uci])[0]
    if (!san) continue

    // Ce que ce coup produit : on regarde la position qui en résulte.
    let reason: string | null = null
    try {
      const probe = new Chess(fenBefore, { skipValidation: true })
      probe.move({
        from: uci.slice(0, 2) as Square,
        to: uci.slice(2, 4) as Square,
        promotion: uci.length > 4 ? (uci[4] as never) : undefined,
      })
      const motifs = detectPositionMotifs(probe, { tacticsOnly: true, limit: 4 })
      const mine = motifs.find((motif) => motif.side === mover && motif.weight >= 0.4)
      if (mine) {
        const copy = motifCopy(mine.id as MotifId, locale)
        reason = copy ? copy.name : null
      }
      if (!reason && probe.isCheckmate()) reason = locale === 'fr' ? 'Mat' : 'Mate'
      else if (!reason && probe.inCheck()) reason = locale === 'fr' ? 'Échec' : 'Check'
    } catch {
      // Ligne moteur incohérente : on l'affiche sans justification plutôt que
      // d'inventer une raison.
    }

    out.push({
      rank: line.multipv,
      uci,
      san,
      score: line.score,
      win: Math.round(winPercentFor(line.score, mover)),
      line: uciLineToSan(fenBefore, line.pv.slice(0, 5)),
      played: uci === playedUci,
      reason,
    })
  }

  // Le coup joué doit toujours figurer, même s'il n'est pas dans les meilleurs.
  if (!out.some((entry) => entry.played)) {
    const san = uciLineToSan(fenBefore, [playedUci])[0]
    if (san) {
      out.push({
        rank: 99,
        uci: playedUci,
        san,
        score: { type: 'cp', value: 0 },
        win: 0,
        line: [],
        played: true,
        reason: null,
      })
    }
  }

  return out
}

// ─────────────────────────────────────────────────────────────────────────────
//  Affichage
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Temps au bout duquel on cesse de croire que le coach parle encore.
 *
 * Un commentaire dépasse rarement huit secondes, même lu lentement par la voix
 * neuronale. Ce plafond n'est pas une durée d'attente : c'est le filet sous la
 * promesse « l'adversaire attend la fin de la phrase », pour qu'une phrase qui
 * ne se termine jamais ne bloque pas la partie.
 */
const SPEECH_GUARD_MS = 15_000

export function CommentaryPanel({
  commentary,
  loading,
  paused,
  onTogglePause,
  onSpeakingChange,
  onHoverAlternative,
  showBestMove,
  onToggleBestMove,
  className,
}: {
  commentary: Commentary | null
  loading: boolean
  paused?: boolean
  onTogglePause?: () => void
  /**
   * Signale que le coach a la parole.
   *
   * La page s'en sert pour retenir l'adversaire artificiel : entendre
   * l'explication d'un coup pendant que la position a déjà changé ne sert à
   * rien, et c'est précisément ce qui arrivait — le moteur répondait en une
   * seconde là où la phrase en demande cinq.
   */
  onSpeakingChange?: (speaking: boolean) => void
  /** Survol d'une alternative : sert à la dessiner sur l'échiquier. */
  onHoverAlternative?: (alternative: Alternative | null) => void
  /** Le coup proposé est-il fléché en permanence sur l'échiquier ? */
  showBestMove?: boolean
  onToggleBestMove?: () => void
  className?: string
}) {
  const locale = usePreferences((state) => state.locale)
  const voiceEnabled = usePreferences((state) => state.voiceEnabled)
  const setPreference = usePreferences((state) => state.set)
  const spokenRef = useRef<string | null>(null)
  const [speaking, setSpeaking] = useState(false)

  // La page recrée `onSpeakingChange` à chaque rendu ; on la garde dans une
  // référence pour que les effets ci-dessous restent stables.
  const notifyRef = useRef(onSpeakingChange)
  notifyRef.current = onSpeakingChange

  const guardRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /**
   * Note qui a la parole, et arme un garde-fou.
   *
   * `speak` ne promet pas d'appeler `onEnd` : une phrase refusée tant que la
   * page n'a pas été touchée, ou remplacée par une autre en cours de route, se
   * termine sans prévenir personne. Comme l'adversaire attend ce signal pour
   * jouer, une fin manquante figerait la partie. Passé le délai, on considère
   * donc que le coach s'est tu.
   */
  const markSpeaking = useCallback((value: boolean) => {
    if (guardRef.current) clearTimeout(guardRef.current)
    guardRef.current = value
      ? setTimeout(() => {
          guardRef.current = null
          setSpeaking(false)
          notifyRef.current?.(false)
        }, SPEECH_GUARD_MS)
      : null

    setSpeaking(value)
    notifyRef.current?.(value)
  }, [])

  useEffect(() => {
    if (!commentary || !voiceEnabled) return
    if (spokenRef.current === commentary.speech) return
    spokenRef.current = commentary.speech
    markSpeaking(true)
    speak(commentary.speech, { onEnd: () => markSpeaking(false) })
  }, [commentary, voiceEnabled, markSpeaking])

  // Au démontage — changement de page, sortie du mode commenté — on rend la
  // parole : sans cela l'adversaire resterait bloqué sur un coach disparu.
  useEffect(
    () => () => {
      if (guardRef.current) clearTimeout(guardRef.current)
      notifyRef.current?.(false)
      stopSpeaking()
    },
    [],
  )

  /**
   * Réécoute du commentaire.
   *
   * Indispensable en pratique : la voix se déclenche pendant qu'on regarde
   * encore l'échiquier, et on rate la moitié de la phrase. Le bouton relit
   * **l'explication complète**, pas seulement le résumé prononcé la première
   * fois.
   */
  const replay = useCallback(() => {
    if (!commentary) return
    stopSpeaking()
    markSpeaking(true)
    const full = [commentary.speech, ...commentary.body.slice(0, 2)]
      .map((part) => part.replace(/\*\*/g, ''))
      .join(' ')
    speak(full, { onEnd: () => markSpeaking(false) })
  }, [commentary, markSpeaking])

  if (!commentary && !loading) {
    return (
      <Card className={clsx('p-4', className)}>
        <div className="flex items-start gap-2.5 text-sm text-faint">
          <MessageSquareText size={16} className="mt-0.5 shrink-0" aria-hidden />
          <p className="leading-relaxed">
            Mode commenté actif. Après chaque coup, tu verras ce que tu aurais pu jouer, avec
            les trois meilleures options et la raison de chacune.
          </p>
        </div>
      </Card>
    )
  }

  const style = commentary ? QUALITY_STYLES[commentary.quality] : null

  return (
    <Card className={clsx('overflow-hidden', className)}>
      {style && (
        <div className="h-1" style={{ background: `var(--q-${style.token})` }} aria-hidden />
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold"
            style={{
              background: style
                ? `color-mix(in oklab, var(--q-${style.token}) 20%, transparent)`
                : 'var(--surface-strong)',
              color: style ? `var(--q-${style.token})` : 'var(--text-muted)',
            }}
            aria-hidden
          >
            {loading && !commentary ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              (style?.glyph ?? '?')
            )}
          </span>

          <div className="min-w-0 flex-1">
            {loading && !commentary ? (
              <p className="text-sm text-muted">Analyse du coup…</p>
            ) : (
              commentary && (
                <>
                  <p className="text-sm font-semibold leading-snug">{commentary.headline}</p>
                  <p className="mt-0.5 text-[11px] tabular-nums text-faint">
                    {formatScore(commentary.scoreBefore)} → {formatScore(commentary.scoreAfter)}
                    {commentary.winLoss >= 1 &&
                      ` · −${commentary.winLoss.toFixed(0)} pts de chances de victoire`}
                  </p>
                </>
              )
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-0.5">
            <button
              type="button"
              onClick={() => {
                if (voiceEnabled) stopSpeaking()
                setPreference('voiceEnabled', !voiceEnabled)
              }}
              title={voiceEnabled ? 'Couper la voix' : 'Activer la voix'}
              aria-label={voiceEnabled ? 'Couper la voix' : 'Activer la voix'}
              className={clsx(
                'grid h-7 w-7 place-items-center rounded-[var(--radius-sm)] transition-colors',
                voiceEnabled ? 'text-accent hover:bg-surface-hover' : 'text-faint hover:bg-surface-hover',
              )}
            >
              {voiceEnabled ? <Volume2 size={14} aria-hidden /> : <VolumeX size={14} aria-hidden />}
            </button>

            {commentary && voiceEnabled && (
              <button
                type="button"
                onClick={replay}
                title="Réécouter l’explication complète"
                aria-label="Réécouter l’explication"
                className={clsx(
                  'grid h-7 w-7 place-items-center rounded-[var(--radius-sm)] transition-colors hover:bg-surface-hover',
                  speaking ? 'text-accent' : 'text-faint hover:text-ink',
                )}
              >
                <span className="text-sm font-bold leading-none" aria-hidden>
                  ↻
                </span>
              </button>
            )}

            {onToggleBestMove && (
              <button
                type="button"
                onClick={onToggleBestMove}
                aria-pressed={showBestMove}
                title={
                  showBestMove
                    ? 'Masquer le coup proposé sur l’échiquier'
                    : 'Montrer le coup proposé sur l’échiquier'
                }
                aria-label="Afficher le coup proposé"
                className={clsx(
                  'grid h-7 w-7 place-items-center rounded-[var(--radius-sm)] transition-colors hover:bg-surface-hover',
                  showBestMove ? 'text-accent' : 'text-faint hover:text-ink',
                )}
              >
                {showBestMove ? <Eye size={14} aria-hidden /> : <EyeOff size={14} aria-hidden />}
              </button>
            )}

            {onTogglePause && (
              <button
                type="button"
                onClick={onTogglePause}
                title={paused ? 'Reprendre la partie' : 'Mettre en pause pour lire'}
                aria-label={paused ? 'Reprendre' : 'Pause'}
                className={clsx(
                  'grid h-7 w-7 place-items-center rounded-[var(--radius-sm)] transition-colors hover:bg-surface-hover',
                  paused ? 'text-accent' : 'text-faint hover:text-ink',
                )}
              >
                {paused ? <Play size={14} aria-hidden /> : <Pause size={14} aria-hidden />}
              </button>
            )}
          </div>
        </div>

        {commentary && commentary.body.length > 0 && (
          <div className="mt-2.5 space-y-1.5">
            {commentary.body.slice(0, 2).map((paragraph, index) => (
              <p key={index} className="text-[13px] leading-relaxed text-muted">
                {paragraph}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* ── Les options qu'on avait ─────────────────────────────────────── */}
      {commentary && commentary.alternatives.length > 0 && (
        <div className="border-t border-line/60">
          <p className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-faint">
            Ce que tu pouvais jouer
          </p>
          <ul onMouseLeave={() => onHoverAlternative?.(null)}>
            {commentary.alternatives.map((alternative) => (
              <li key={alternative.uci}>
                <button
                  type="button"
                  onMouseEnter={() => onHoverAlternative?.(alternative)}
                  onFocus={() => onHoverAlternative?.(alternative)}
                  className={clsx(
                    'flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-surface-hover',
                    alternative.played && 'bg-surface',
                  )}
                >
                  <span
                    className={clsx(
                      'grid h-5 w-5 shrink-0 place-items-center rounded text-[10px] font-bold',
                      alternative.rank === 1
                        ? 'bg-[color-mix(in_oklab,var(--q-best)_25%,transparent)] text-[var(--q-best)]'
                        : 'bg-surface-strong text-faint',
                    )}
                    aria-hidden
                  >
                    {alternative.rank === 99 ? '·' : alternative.rank}
                  </span>

                  <span className="w-16 shrink-0 font-mono text-sm font-semibold">
                    {locale === 'fr' ? sanToFrench(alternative.san) : alternative.san}
                  </span>

                  <span className="w-12 shrink-0 text-xs tabular-nums text-muted">
                    {alternative.rank === 99 ? '—' : formatScore(alternative.score)}
                  </span>

                  <span className="min-w-0 flex-1 truncate text-[12px] text-faint">
                    {alternative.reason ??
                      (alternative.line.length > 1
                        ? alternative.line
                            .slice(1, 4)
                            .map((san) => (locale === 'fr' ? sanToFrench(san) : san))
                            .join(' ')
                        : '')}
                  </span>

                  {alternative.played && (
                    <Chip tone="neutral" className="shrink-0">
                      joué
                    </Chip>
                  )}
                  {!alternative.played && alternative.rank === 1 && (
                    <ChevronRight size={13} className="shrink-0 text-faint" aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

/**
 * Flèches à dessiner pour le commentaire.
 *
 * Le coup joué en vert s'il était bon, en rouge s'il a coûté cher ; le meilleur
 * coup en bleu s'il diffère. Une alternative survolée passe devant.
 */
export function commentaryArrows(
  commentary: Commentary | null,
  hovered: Alternative | null,
  /** Montre le coup proposé même quand le coup joué était bon. */
  alwaysShowBest = true,
): Arrow[] {
  if (!commentary) return []

  if (hovered) {
    return [
      {
        from: hovered.uci.slice(0, 2) as Square,
        to: hovered.uci.slice(2, 4) as Square,
        color: hovered.played ? 'green' : 'blue',
        weight: 'bold',
      },
    ]
  }

  const arrows: Arrow[] = []
  const best = commentary.alternatives.find((alternative) => alternative.rank === 1)
  const played = commentary.alternatives.find((alternative) => alternative.played)

  if (played) {
    arrows.push({
      from: played.uci.slice(0, 2) as Square,
      to: played.uci.slice(2, 4) as Square,
      color:
        commentary.quality === 'blunder' ||
        commentary.quality === 'mistake' ||
        commentary.quality === 'miss'
          ? 'red'
          : 'green',
      weight: 'bold',
    })
  }

  // Le coup proposé est fléché dès qu'il diffère de celui joué. On le montre
  // même quand le coup joué était correct : voir l'alternative que le moteur
  // préférait est instructif, pas seulement voir ses erreurs.
  if (best && !best.played && (alwaysShowBest || commentary.winLoss >= 2)) {
    arrows.push({
      from: best.uci.slice(0, 2) as Square,
      to: best.uci.slice(2, 4) as Square,
      color: 'blue',
      weight: 'normal',
    })
  }

  return arrows
}

/**
 * Légende correspondant exactement aux flèches de `commentaryArrows`.
 *
 * Deux traits de couleur sur un échiquier ne veulent rien dire sans clé de
 * lecture : c'est elle qui transforme « un trait vert et un trait bleu » en
 * « voici ton coup, voici celui que le moteur préférait ».
 */
export function commentaryLegend(
  commentary: Commentary | null,
  hovered: Alternative | null,
  alwaysShowBest = true,
): LegendItem[] {
  const arrows = commentaryArrows(commentary, hovered, alwaysShowBest)
  if (arrows.length === 0) return []

  if (hovered) {
    return [
      hovered.played
        ? { ...LEGEND.played, label: `${hovered.san} — ton coup` }
        : { ...LEGEND.best, label: `${hovered.san} — coup conseillé`, weight: 'bold' as const },
    ]
  }

  return legendFor(arrows, [LEGEND.played, LEGEND.playedBad, LEGEND.best])
}

/** Interrupteur du mode commenté, à poser dans la barre d'actions. */
export function CommentaryToggle({
  active,
  onChange,
  className,
}: {
  active: boolean
  onChange: (value: boolean) => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      aria-pressed={active}
      title="Commenter chaque coup en direct"
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[13px] font-medium transition-colors',
        active
          ? 'bg-accent text-[var(--accent-contrast)]'
          : 'text-muted hover:bg-surface-hover hover:text-ink',
        className,
      )}
    >
      <Lightbulb size={14} aria-hidden />
      Mode commenté
    </button>
  )
}
