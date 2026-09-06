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
  Eye,
  EyeOff,
  History,
  Lightbulb,
  LightbulbOff,
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
  explainRecommendedMove,
  formatScore,
  meriteUnMeilleurCoup,
  motifCopy,
  pourquoiCeCoup,
  uciLineToSan,
  winPercentFor,
  type EngineLine,
  type MotifId,
  type MoveQuality,
  type OpeningBook,
  type Score,
} from '@coupparfait/core'
import { ANNOTATION_COLORS } from '@/components/board/boardKit.ts'
import { Card, Chip } from '@/components/ui/index.tsx'
import { toast } from '@/components/ui/Toast.tsx'
import { analyserAvecLeNavigateur } from '@/lib/analysis/runner.ts'
import { speak, stopSpeaking } from '@/lib/speech.ts'
import { usePreferences } from '@/lib/store/preferences.ts'
import { useSan } from '@/lib/notation.ts'
import type { PlayedMove } from '@/lib/game/useChessGame.ts'
import type { Arrow } from '@/components/board/boardKit.ts'
import { ArrowLegend, LEGEND, legendFor, type LegendItem } from '@/components/board/ArrowLegend.tsx'

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
  /**
   * Le coup en notation anglaise.
   *
   * `san` est localisé pour l'affichage — « Cf3 » et non « Nf3 ». Rejouer le
   * coup demande l'original : `chess.js` ne connaît que l'anglais, et lui
   * passer la version française échoue silencieusement.
   */
  sanEn: string
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
  /**
   * Position **avant** le coup.
   *
   * Elle n'était pas conservée : le commentaire n'avait besoin que de la
   * position résultante. Elle le devient dès qu'on veut expliquer une
   * alternative à la demande — pour la rejouer, il faut repartir de là où le
   * choix se posait.
   */
  fenBefore: string
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
  /**
   * Camp à qui l'explication s'adresse.
   *
   * Indispensable dès qu'on commente les coups de l'adversaire : sans lui, le
   * texte tutoie l'auteur du coup, et l'on se retrouve à lire « ta tour » à
   * propos de celle d'en face.
   */
  lecteur?: Color | null
  /**
   * Détailler les suites de coups — voir `SEUIL_SUITE_BREVE`.
   *
   * Laissé indéfini quand aucun niveau ne permet d'en juger : `explainMove`
   * détaille alors, ce qui est le défaut prudent.
   */
  suiteDetaillee?: boolean
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
  lecteur = null,
  suiteDetaillee,
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

  /**
   * Dernière ouverture annoncée.
   *
   * Le rapport d'analyse ne la nomme qu'au moment où elle change ; le
   * commentaire en direct, lui, la répétait à chaque coup — « Nous sommes dans
   * la Partie du pion roi » cinq fois de suite. On retient donc ce qu'on a
   * déjà dit.
   */
  const announcedOpening = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled || !move) return
    if (onlyColor !== null && move.color !== onlyColor) return

    const id = ++requestId.current
    const controller = new AbortController()
    setLoading(true)

    void (async () => {
      try {
        const searchDepth = depth ?? prefs.clientDepth
        const wanted = Math.max(2, Math.min(5, alternatives + 1))

        // Position **avant** le coup, en MultiPV : c'est là que sont les
        // options qu'on avait.
        // Par le `runner` et non en pilotant le moteur ici : c'est lui qui
        // sait le démarrer et le débrider, et il le savait déjà.
        const before = await analyserAvecLeNavigateur({
          fen: move.before,
          depth: searchDepth,
          multiPv: wanted,
          signal: controller.signal,
        })
        if (id !== requestId.current) return

        const after = await analyserAvecLeNavigateur({
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
        const newOpening = opening && opening.label !== announcedOpening.current
        if (opening) announcedOpening.current = opening.label

        const explanation = explainMove({
          locale: prefs.locale,
          lecteur,
          suiteDetaillee,
          san: move.san,
          fenAfter: move.after,
          fenBefore: move.before,
          quality: classification.quality,
          scoreBefore,
          scoreAfter,
          winLoss: classification.winLoss,
          mover: move.color,
          motifs: classification.motifs,
          bestSan,
          bestLine,
          openingName: newOpening ? opening.label : null,
        })

        const built: Commentary = {
          ply: 0,
          san: move.san,
          color: move.color,
          fenAfter: move.after,
          fenBefore: move.before,
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
  }, [
    move,
    enabled,
    onlyColor,
    lecteur,
    suiteDetaillee,
    depth,
    alternatives,
    book,
    prefs.clientDepth,
    prefs.locale,
  ])

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

      if (probe.isCheckmate()) {
        reason = locale === 'fr' ? 'Mat' : 'Mate'
      } else {
        /*
          La phrase avant le mot.

          On donnait le nom du motif — « Fourchette » — et rien d'autre. C'est
          pourtant le mot qui manque le moins : on voit bien qu'il se passe
          quelque chose, ce qu'on ne voit pas c'est *quoi*. Devant un pion
          conseillé, la question qui vient est « pourquoi ne se fait-il pas
          simplement prendre ? », et la réponse — il attaque deux pièces, la
          dame le couvre — n'était écrite nulle part.

          Le nom du motif reste, en second recours : il vaut mieux que rien
          quand la relation n'est pas descriptible en une phrase.
        */
        reason = pourquoiCeCoup(fenBefore, uci, locale)

        if (!reason) {
          const motifs = detectPositionMotifs(probe, { tacticsOnly: true, limit: 4 })
          const mine = motifs.find((motif) => motif.side === mover && motif.weight >= 0.4)
          if (mine) {
            const copy = motifCopy(mine.id as MotifId, locale)
            reason = copy ? copy.name : null
          }
        }
        if (!reason && probe.inCheck()) reason = locale === 'fr' ? 'Échec' : 'Check'
      }
    } catch {
      // Ligne moteur incohérente : on l'affiche sans justification plutôt que
      // d'inventer une raison.
    }

    out.push({
      rank: line.multipv,
      uci,
      san,
      sanEn: san,
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
        sanEn: san,
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
  stale,
  onReview,
  legende = [],
  voix = true,
  onDesactiver,
  placeholder = true,
  className,
}: {
  commentary: Commentary | null
  loading: boolean
  /**
   * Sortir du mode commenté, depuis le panneau lui-même.
   *
   * L'interrupteur existait déjà, au fond du menu « … » de la barre d'actions,
   * et c'est exactement là qu'on ne le cherche pas : quand on veut couper les
   * commentaires, on regarde le pavé de commentaires. Fourni, il ajoute une
   * croix à la barre d'icônes du panneau ; absent — page d'analyse, panneau
   * « Pourquoi ? » — rien ne change.
   */
  onDesactiver?: () => void
  /**
   * Annoncer le mode commenté tant qu'aucun coup n'a été analysé.
   *
   * Faux quand le panneau ne *représente* pas le mode commenté : le panneau
   * « Pourquoi ce coup ? » emprunte le même rendu pour une explication demandée
   * à l'unité, et le carton « Mode commenté actif » y annonçait un mode qui ne
   * l'était pas — en occupant la place d'une réponse qui arrivait.
   */
  placeholder?: boolean
  /**
   * Le coach a-t-il le droit de parler ?
   *
   * Distinct de la préférence `voiceEnabled`, qui dit si l'on *veut* une voix
   * dans l'application. Ici on dit si cette partie-ci en comporte une : jouer
   * sans avoir demandé de commentaire et s'entendre commenter quand même, ce
   * n'est pas un réglage mal placé, c'est une partie qu'on n'a pas choisie.
   */
  voix?: boolean
  /**
   * Légende des flèches, à afficher en tête du panneau.
   *
   * Elle vivait sous l'échiquier, c'est-à-dire à côté des flèches qu'elle
   * décrit — ce qui semble logique et ne l'est pas : on la lit une fois pour
   * comprendre le code couleur, et ensuite elle occupe une bande sous le
   * plateau, au milieu de ce qu'on regarde vraiment. En tête du commentaire,
   * elle est là où l'œil arrive après le coup, et elle disparaît d'elle-même
   * quand il n'y a aucune flèche à expliquer.
   */
  legende?: LegendItem[]
  paused?: boolean
  onTogglePause?: () => void
  /**
   * La position affichée n'est plus celle que commente ce texte.
   *
   * L'ordinateur répond en une seconde, la phrase en demande cinq : on lit
   * « Cc3 — imprécision » devant un échiquier où les Noirs ont déjà répondu.
   * Le texte reste utile, mais tant qu'on ne dit pas de quoi il parle, il donne
   * l'impression que le commentaire s'est trompé de coup.
   */
  stale?: boolean
  /** Ramène l'échiquier sur la position commentée. */
  onReview?: () => void
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
  const voixPreferee = usePreferences((state) => state.voiceEnabled)
  const voiceEnabled = voixPreferee && voix
  const setPreference = usePreferences((state) => state.set)
  const san = useSan()
  const spokenRef = useRef<string | null>(null)
  const [speaking, setSpeaking] = useState(false)

  // La page recrée `onSpeakingChange` à chaque rendu ; on la garde dans une
  // référence pour que les effets ci-dessous restent stables.
  const notifyRef = useRef(onSpeakingChange)
  notifyRef.current = onSpeakingChange

  const guardRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /**
   * Dire pourquoi l'une des options proposées valait mieux.
   *
   * Calculée au clic, jamais d'avance : produire l'explication des trois lignes
   * à chaque coup coûterait trois fois le prix pour deux qu'on n'écoutera pas.
   *
   * C'est `explainRecommendedMove` — le même moteur de rédaction que le bouton
   * « Pourquoi ? » de la page d'analyse. Une seule façon d'expliquer un coup du
   * moteur dans toute l'application, quel que soit l'écran d'où on la demande.
   */
  const expliquerAlternative = useCallback(
    (alternative: Alternative) => {
      if (!commentary) return
      const explication = explainRecommendedMove({
        locale,
        fenBefore: commentary.fenBefore,
        bestSan: alternative.sanEn,
        mover: commentary.color,
        scoreBefore: commentary.scoreBefore,
        scoreAfter: alternative.score,
        bestLine: alternative.line,
      })
      // Le coup du moteur ne se rejoue pas sur cette position : on le dit
      // plutôt que de rester muet sur un bouton qu'on vient de presser.
      if (!explication) {
        toast.warning(
          'Ce coup ne se rejoue pas sur cette position.',
          'Impossible de l’expliquer sans risquer d’inventer.',
        )
        return
      }
      /*
        Le bouton parle, même quand la voix automatique est coupée.

        Il consultait `voiceEnabled` avant d'ouvrir la bouche : presser le
        haut-parleur d'un coup ne produisait alors strictement rien — ni son,
        ni texte, ni message. Or ce réglage gouverne ce qui se dit *tout
        seul* ; appuyer sur un haut-parleur est une demande explicite, et une
        demande explicite ne se fait pas arbitrer par une préférence d'ambiance.

        L'explication s'affiche aussi en clair. La synthèse vocale n'est pas
        garantie — navigateur sans voix installée, onglet muet, appareil en
        mode silencieux —, et un bouton qui ne rend rien de visible dans ces
        cas-là reste un bouton cassé.
      */
      stopSpeaking()
      toast.info(`${san(alternative.san)} — à jouer à la place`, explication.speech)
      speak(explication.speech)
    },
    [commentary, locale, san],
  )

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
      // Et on oublie ce qu'on venait de dire : en mode strict, React défait les
      // effets aussitôt après les avoir montés, puis les rejoue. Le garde
      // « déjà prononcé » bloquait alors la seconde passe, si bien que le tout
      // premier commentaire d'une partie restait muet en développement.
      spokenRef.current = null
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
    if (!placeholder) return null
    return (
      <Card className={clsx('p-4', className)}>
        <div className="flex items-start gap-2.5 text-sm text-faint">
          <MessageSquareText size={16} className="mt-0.5 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1 leading-relaxed">
            Mode commenté actif. Après chaque coup, tu verras ce que tu aurais pu jouer, avec les
            trois meilleures options et la raison de chacune.
          </p>
          {onDesactiver && <BoutonDesactiver onClick={onDesactiver} />}
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

      {stale && commentary && (
        <div className="flex items-center gap-2 border-b border-line bg-surface-strong px-3 py-1.5 text-[12px] text-faint">
          <History size={12} className="shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 leading-snug">
            Porte sur ton coup{' '}
            <strong className="font-semibold text-muted">{san(commentary.san)}</strong> — la
            position a changé depuis.
          </span>
          {onReview && (
            <button
              type="button"
              onClick={onReview}
              className="shrink-0 rounded-[var(--radius-sm)] px-1.5 py-0.5 font-semibold text-accent transition-colors hover:bg-surface-hover"
            >
              Revoir
            </button>
          )}
        </div>
      )}

      {legende.length > 0 && (
        <div className="border-b border-line/60 px-4 py-2">
          <ArrowLegend items={legende} className="!bg-transparent !px-0 !py-0" />
        </div>
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
            title={style ? `${style.label.fr} — ${style.description.fr}` : undefined}
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
                  {/* La perte n'est chiffrée qu'au-dessus du seuil qui la rend
                      digne d'être signalée — le même que partout ailleurs.
                      
                      Elle l'était dès un point, et produisait la contradiction
                      qu'on nous a signalée : « d4 — théorie d'ouverture » suivi
                      de « −2 pts de chances de victoire », au-dessus d'un
                      paragraphe expliquant qu'il n'y a rien à calculer ici. Le
                      chiffre était juste et le texte aussi ; c'est de les mettre
                      côte à côte que naissait le reproche. Deux points de
                      pourcentage sur un premier coup ne sont pas une faute, ce
                      sont les préférences du moteur — et on vient de décider
                      qu'on ne les présentait plus comme des corrections. */}
                  <p className="mt-0.5 text-[12px] tabular-nums text-faint">
                    {formatScore(commentary.scoreBefore)} → {formatScore(commentary.scoreAfter)}
                    {meriteUnMeilleurCoup(commentary.quality, commentary.winLoss) &&
                      ` · −${commentary.winLoss.toFixed(0)} pts de chances de victoire`}
                  </p>
                </>
              )
            )}
          </div>

          {/* Les commandes en ligne, et non en colonne.

              Elles étaient empilées verticalement contre le bord droit :
              quatre boutons de vingt-huit pixels le long d'un en-tête qui en
              fait trente-quatre. La colonne imposait sa hauteur au bloc entier,
              et ouvrait sous elle un vide de soixante-dix pixels que rien ne
              venait remplir.

              À plat, la barre fait la hauteur d'un seul bouton. Elle prend un
              peu de largeur au titre — c'est le prix, et il est moindre : un
              titre qui passe sur deux lignes reste lu, un vide ne se lit
              jamais. */}
          <div className="flex shrink-0 items-center gap-0.5">
            {/* Rien à couper dans une partie sans commentaire : le bouton
              proposerait d'activer une voix qui resterait muette. */}
            {voix && (
              <button
                type="button"
                onClick={() => {
                  if (voixPreferee) stopSpeaking()
                  setPreference('voiceEnabled', !voixPreferee)
                }}
                title={voixPreferee ? 'Couper la voix' : 'Activer la voix'}
                aria-label={voixPreferee ? 'Couper la voix' : 'Activer la voix'}
                className={clsx(
                  'grid h-7 w-7 place-items-center rounded-[var(--radius-sm)] transition-colors',
                  voixPreferee
                    ? 'text-accent hover:bg-surface-hover'
                    : 'text-faint hover:bg-surface-hover',
                )}
              >
                {voixPreferee ? (
                  <Volume2 size={14} aria-hidden />
                ) : (
                  <VolumeX size={14} aria-hidden />
                )}
              </button>
            )}

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

            {/* En dernier, et seul de sa catégorie : les trois précédents règlent
              le commentaire, celui-ci le fait disparaître. */}
            {onDesactiver && <BoutonDesactiver onClick={onDesactiver} />}
          </div>
        </div>

        {commentary && commentary.body.length > 0 && (
          <div className="mt-2.5 space-y-1.5">
            {commentary.body.slice(0, 2).map((paragraph, index) => (
              <p key={index} className="text-[14px] leading-relaxed text-muted">
                {paragraph}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* ── Les options qu'on avait ─────────────────────────────────────── */}
      {commentary && commentary.alternatives.length > 0 && (
        <div className="border-t border-line/60">
          <p className="px-4 py-2 text-[12px] font-semibold text-faint">Ce que tu pouvais jouer</p>
          <ul onMouseLeave={() => onHoverAlternative?.(null)}>
            {commentary.alternatives.map((alternative) => (
              /* La ligne et l'écoute sont **deux** boutons côte à côte, et non
                 l'un dans l'autre : un bouton ne peut pas en contenir un autre.
                 Le survol de la ligne montre la flèche, l'icône dit pourquoi. */
              <li key={alternative.uci} className="flex items-stretch">
                <button
                  type="button"
                  onMouseEnter={() => onHoverAlternative?.(alternative)}
                  onFocus={() => onHoverAlternative?.(alternative)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 border-l-2 py-2 pl-3.5 pr-1 text-left transition-colors hover:bg-surface-hover"
                  style={teinteDeLigne(alternative)}
                >
                  <span
                    className={clsx(
                      'grid h-5 w-5 shrink-0 place-items-center rounded text-[12px] font-bold',
                      !couleurDeLigne(alternative) && 'bg-surface-strong text-faint',
                    )}
                    style={teinteDeRang(alternative)}
                    aria-hidden
                  >
                    {alternative.rank === 99 ? '·' : alternative.rank}
                  </span>

                  <span className="w-16 shrink-0 font-mono text-sm font-semibold">
                    {san(alternative.san)}
                  </span>

                  <span className="w-12 shrink-0 text-xs tabular-nums text-muted">
                    {alternative.rank === 99 ? '—' : formatScore(alternative.score)}
                  </span>

                  <span className="min-w-0 flex-1 truncate text-[12px] text-faint">
                    {alternative.reason ??
                      (alternative.line.length > 1
                        ? alternative.line
                            .slice(1, 4)
                            .map((move) => san(move))
                            .join(' ')
                        : '')}
                  </span>

                  {/* Les deux lignes remarquables portent leur nom.
                  
                      « Joué » existait déjà ; le premier choix du moteur, lui,
                      n'avait qu'un chevron — un signe qui ne dit rien et qu'on
                      prend pour un bouton. La couleur seule ne suffit pas non
                      plus : elle demande d'avoir lu la légende et de s'en
                      souvenir. Une étiquette se lit sans rien savoir.
                  
                      Elle reprend la teinte de la flèche correspondante, pour
                      que l'étiquette, le liseré, la pastille du rang et la
                      flèche sur l'échiquier ne fassent qu'une seule couleur. */}
                  {alternative.played && (
                    <Chip className="shrink-0 border-transparent" style={teinteDeRang(alternative)}>
                      joué
                    </Chip>
                  )}
                  {!alternative.played && alternative.rank === 1 && (
                    <Chip className="shrink-0 border-transparent" style={teinteDeRang(alternative)}>
                      meilleur
                    </Chip>
                  )}
                </button>

                {/* L'explication d'une alternative n'existe pas d'avance : la
                    calculer pour les trois lignes à chaque coup coûterait trois
                    fois le prix pour deux qu'on n'écoutera jamais. On la produit
                    au clic, avec `explainRecommendedMove` — la même machinerie
                    que le « Pourquoi ? » de la page d'analyse. */}
                {!alternative.played && alternative.rank !== 99 && (
                  <button
                    type="button"
                    onClick={() => expliquerAlternative(alternative)}
                    title={`Écouter pourquoi ${san(alternative.san)}`}
                    aria-label={`Écouter l'explication de ${san(alternative.san)}`}
                    className={clsx(
                      'grid w-9 shrink-0 place-items-center transition-colors hover:bg-surface-hover',
                      'text-faint hover:text-accent',
                    )}
                    style={{ background: teinteDeLigne(alternative).background }}
                  >
                    <Volume2 size={13} aria-hidden />
                  </button>
                )}
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
  /**
   * Autorise la flèche du coup conseillé.
   *
   * Le paramètre ne peut plus que **retirer** la flèche, jamais l'imposer :
   * c'est le réglage du joueur qui a décidé de ne pas la voir. La décider
   * présente relève d'une seule règle, `SEUIL_MEILLEUR_COUP`, et elle ne se
   * négocie pas depuis l'appelant — sinon on retombe sur deux vérités.
   */
  montrerLeConseil = true,
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

  /*
   * Le coup proposé est fléché **exactement quand l'explication en nomme un**.
   *
   * Deux corrections successives, et la seconde annule à moitié la première.
   *
   * La flèche était tracée dès que le moteur avait une préférence — c'est-à-dire
   * presque toujours. On jouait d4 au premier coup, l'un des deux meilleurs
   * coups du jeu, et l'échiquier fléchait aussitôt e4 : deux centièmes de pion
   * d'écart, présentés comme une correction. On a d'abord écarté les coups
   * irréprochables par leur classement (`book`, `best`, `excellent`…).
   *
   * C'était traiter le symptôme. Le vrai défaut est qu'il existait **deux
   * règles** pour une seule question : le texte ne propose un meilleur coup
   * qu'au-delà de `SEUIL_MEILLEUR_COUP` points de chances de victoire, la
   * flèche n'avait aucun seuil. D'où le cas qu'on nous a signalé — « Coup
   * conseillé » écrit dans la légende, et pas une ligne dans l'explication pour
   * dire lequel ni pourquoi.
   *
   * Une seule règle, donc, et c'est celle du texte. Les alternatives restent
   * listées dans le panneau avec leur évaluation : qui veut savoir ce que le
   * moteur préférait l'y trouve. La différence est qu'il faut aller le lire, au
   * lieu de le recevoir comme un reproche.
   */
  if (
    best &&
    !best.played &&
    montrerLeConseil &&
    meriteUnMeilleurCoup(commentary.quality, commentary.winLoss)
  ) {
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
 * Légende correspondant aux flèches de `commentaryArrows` — moins la bleue.
 *
 * Deux traits de couleur sur un échiquier ne veulent rien dire sans clé de
 * lecture. Mais la flèche du coup conseillé a désormais la sienne ailleurs : la
 * ligne « meilleur » de la liste des alternatives porte le même bleu et le
 * nomme. Répéter « Coup conseillé » à trois centimètres de là n'apprend rien à
 * personne et allonge une bande qu'on lit une fois.
 *
 * La verte reste : le coup joué n'est étiqueté nulle part ailleurs — la liste
 * dit « joué » sans dire que c'est cette flèche-là.
 */
export function commentaryLegend(
  commentary: Commentary | null,
  hovered: Alternative | null,
  montrerLeConseil = true,
): LegendItem[] {
  const arrows = commentaryArrows(commentary, hovered, montrerLeConseil)
  if (arrows.length === 0) return []

  if (hovered) {
    return [
      hovered.played
        ? { ...LEGEND.played, label: `${hovered.san} — ton coup` }
        : {
            ...LEGEND.best,
            label: `${hovered.san} — à la place de ton coup`,
            weight: 'bold' as const,
          },
    ]
  }

  /*
   * La flèche verte porte le verdict, pas l'évidence.
   *
   * Elle était légendée « Ton coup ». C'était juste et sans intérêt : on sait
   * qu'on vient de jouer, on a poussé la pièce soi-même. L'information utile
   * est ailleurs — et depuis qu'on ne flèche plus le coup conseillé quand il
   * n'y a rien à conseiller, la flèche verte se retrouve **seule** sur
   * l'échiquier précisément dans le cas où le coup joué était le bon. Le seul
   * cas où elle a quelque chose à annoncer, donc, et elle n'annonçait rien.
   */
  const irreprochable =
    commentary?.quality === 'best' ||
    commentary?.quality === 'brilliant' ||
    commentary?.quality === 'great'

  const joue = irreprochable
    ? {
        ...LEGEND.played,
        label: 'Ton coup — le meilleur',
        title: 'Le moteur n’avait rien de mieux.',
      }
    : LEGEND.played

  // `LEGEND.best` n'est plus proposé : la flèche bleue existe toujours sur
  // l'échiquier, mais c'est la liste qui la nomme.
  return legendFor(arrows, [joue, LEGEND.playedBad])
}

/**
 * La couleur de flèche qui correspond à une ligne, s'il y en a une.
 *
 * Deux lignes sur trois n'ont pas de flèche sur l'échiquier et ne portent donc
 * aucune couleur : seuls le coup joué et le premier choix du moteur en ont une.
 *
 * Les teintes sont **prises dans `ANNOTATION_COLORS`**, et c'est le point. Elles
 * étaient écrites en dur ici, et pas les mêmes qu'au tableau : le rang 1
 * reprenait le vert du barème de qualité pendant que sa flèche était bleue. On
 * lisait deux verts pour deux choses différentes, et la seule flèche bleue de
 * l'écran ne renvoyait à rien. Une couleur qui a deux définitions finit
 * toujours par en avoir deux valeurs.
 */
function couleurDeLigne(alternative: Alternative): string | null {
  if (alternative.played) return ANNOTATION_COLORS.green
  if (alternative.rank === 1) return ANNOTATION_COLORS.blue
  return null
}

/** Liseré à gauche et fond très pâle, aux couleurs de la flèche. */
function teinteDeLigne(alternative: Alternative): {
  borderLeftColor: string
  background: string | undefined
} {
  const couleur = couleurDeLigne(alternative)
  if (!couleur) return { borderLeftColor: 'transparent', background: undefined }
  return {
    borderLeftColor: couleur,
    background: `color-mix(in oklab, ${couleur} 9%, transparent)`,
  }
}

/** Pastille du rang, dans la même teinte mais plus soutenue. */
function teinteDeRang(alternative: Alternative): { background: string; color: string } | undefined {
  const couleur = couleurDeLigne(alternative)
  if (!couleur) return undefined
  return { background: `color-mix(in oklab, ${couleur} 25%, transparent)`, color: couleur }
}

/**
 * La sortie du mode commenté, posée sur le commentaire lui-même.
 *
 * Même dessin que ses voisins de la barre d'icônes, mais avec un libellé écrit
 * en toutes lettres au survol : une ampoule barrée seule se lit « masquer les
 * indices », ce qui n'est pas la même chose que couper le mode.
 */
function BoutonDesactiver({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Désactiver le mode commenté"
      aria-label="Désactiver le mode commenté"
      className="grid h-7 w-7 shrink-0 place-items-center rounded-[var(--radius-sm)] text-faint transition-colors hover:bg-surface-hover hover:text-ink"
    >
      <LightbulbOff size={14} aria-hidden />
    </button>
  )
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
        'inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[14px] font-medium transition-colors',
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
