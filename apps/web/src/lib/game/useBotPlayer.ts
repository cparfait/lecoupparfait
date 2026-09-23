'use client'

/**
 * Pilote l'adversaire artificiel.
 *
 * Quand c'est au tour de l'ordinateur, on interroge le moteur en MultiPV, puis
 * `pickBotMove` choisit parmi les lignes proposées selon le niveau et la
 * personnalité du bot. Le coup n'est joué qu'après un délai de réflexion
 * simulé : un adversaire qui répond en trois millisecondes casse complètement
 * l'illusion et empêche de suivre ce qui se passe.
 *
 * Le crochet est volontairement passif : il observe l'état de la partie et
 * appelle `onMove`. C'est la page qui reste maîtresse du déroulement.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Color, PieceSymbol, Square } from 'chess.js'
import { botLevelAvecStyle, botThinkDelayMs, pickBotMove, uciOptionsFor } from '@coupparfait/core'
import type { BotLevel, BotPersonalityId } from '@coupparfait/core'
import { getEngine, messageMoteur } from '@/lib/engine/client.ts'
import { useT } from '@/lib/i18n/index.tsx'

export interface UseBotPlayerOptions {
  /** Position courante. */
  fen: string
  /** Couleur jouée par l'ordinateur. */
  botColor: Color
  /** Niveau, de 1 à `BOT_LEVELS.length`. */
  level: number
  /**
   * Style imposé, en dépit de celui que le barème associe à ce niveau.
   *
   * Le barème attribue une personnalité à chaque niveau, ce qui convient tant
   * qu'on choisit un adversaire par sa force. Le mode carrière fait l'inverse :
   * il choisit un style parce que c'est *lui* l'exercice — on affronte Brasier
   * au chapitre « tenir face à une attaque » parce qu'il attaque — et la force
   * n'est que le réglage secondaire. Sans cette entorse, le chapitre 6 aurait
   * envoyé un adversaire prudent contre une leçon de défense.
   */
  personality?: BotPersonalityId
  /** Vrai tant que la partie est en cours. */
  active: boolean
  /** Appelé quand le bot a choisi son coup. */
  onMove: (from: Square, to: Square, promotion?: PieceSymbol) => void
  /** Trait courant, pour savoir quand intervenir. */
  turn: Color
  /** Désactive la temporisation (mode analyse, tests). */
  instant?: boolean
  /**
   * Jouer avec Maia plutôt qu'avec Stockfish bridé.
   *
   * Maia est un réseau entraîné sur des parties humaines : elle fait les
   * erreurs qu'on fait vraiment à son niveau, là où un Stockfish affaibli joue
   * parfaitement puis bâcle un coup au hasard. Elle tourne sur le serveur, pas
   * dans le navigateur.
   */
  human?: boolean
  /** Nombre de demi-coups joués, pour savoir si l'on est encore dans le livre. */
  ply?: number
}

export interface BotPlayerState {
  bot: BotLevel
  thinking: boolean
  /** Vrai pendant le chargement initial du moteur WebAssembly. */
  loading: boolean
  error: string | null
  /** Perte du dernier coup choisi, en centipions : permet d'afficher son « style ». */
  lastCost: number | null
  /**
   * Oublie la position déjà traitée, pour que l'ordinateur la rejoue.
   *
   * À appeler après une annulation de coup : la position revient à celle que
   * le bot avait déjà traitée, et sans cet oubli il la croyait jouée et ne
   * répondait plus jamais — la partie restait figée sur « réfléchit… ».
   */
  oublier: () => void
}

export function useBotPlayer(options: UseBotPlayerOptions): BotPlayerState {
  const t = useT()
  const { fen, botColor, level, active, onMove, turn, instant, human, ply } = options

  /**
   * Le barème, éventuellement repeint aux couleurs d'un style imposé.
   *
   * Mémoïsé, et ce n'est pas de l'optimisation : `bot` figure dans les
   * dépendances de l'effet qui fait jouer l'ordinateur. Reconstruit à chaque
   * rendu — ce que faisait l'étalement quand une personnalité était fournie —
   * il relançait l'effet en boucle, chaque relance annulant la réflexion
   * précédente avant qu'elle n'aboutisse. L'adversaire ne jouait donc jamais,
   * et seulement là où un style est imposé : carrière et tournoi.
   */
  const personality = options.personality
  // `botLevelAvecStyle` et non un simple `{ ...bareme, personality }` : le
  // biais que lit `pickBotMove` vient de la personnalité, et le remplacer à
  // moitié laissait jouer le style du niveau sous le nom du style imposé.
  const bot = useMemo(() => botLevelAvecStyle(level, personality), [level, personality])
  const [thinking, setThinking] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCost, setLastCost] = useState<number | null>(null)

  // Empêche de jouer deux fois pour la même position, ce qui arriverait au
  // moindre re-rendu pendant la réflexion.
  const handledFen = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!active || turn !== botColor) return
    if (handledFen.current === fen) return
    handledFen.current = fen

    let cancelled = false
    let played = false
    const controller = new AbortController()

    void (async () => {
      try {
        setThinking(true)
        setError(null)

        // ── Maia ───────────────────────────────────────────────────────────
        //
        // Un aller-retour réseau au lieu d'un calcul local. En cas d'échec on
        // ne bascule pas silencieusement sur Stockfish : l'adversaire annoncé
        // ne serait plus celui qu'on affronte, et ses erreurs cesseraient
        // d'être humaines sans qu'on sache pourquoi.
        if (human) {
          const response = await fetch('/api/maia', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ fen, elo: bot.elo, ply: ply ?? 99 }),
            signal: controller.signal,
          })
          const data = await response.json().catch(() => ({}))
          if (cancelled) return

          if (!response.ok || !data.uci) {
            setError(data.error ?? t('rest.maiaDown'))
            setThinking(false)
            return
          }

          const uci: string = data.uci
          const wait = instant ? 0 : botThinkDelayMs(bot.level, 30)
          timerRef.current = setTimeout(() => {
            if (cancelled) return
            played = true
            setThinking(false)
            onMove(
              uci.slice(0, 2) as Square,
              uci.slice(2, 4) as Square,
              uci.length > 4 ? (uci[4] as PieceSymbol) : undefined,
            )
          }, wait)
          return
        }

        const engine = getEngine()
        if (engine.getStatus() === 'idle') setLoading(true)
        await engine.start()
        setLoading(false)
        if (cancelled) return

        engine.setOptions(uciOptionsFor(bot.engine))

        const startedAt = Date.now()
        const analysis = await engine.analyse({
          fen,
          depth: bot.engine.depth,
          nodes: bot.engine.nodes,
          movetimeMs: bot.engine.movetimeMs,
          multiPv: bot.engine.multiPv,
          signal: controller.signal,
        })
        if (cancelled) return

        const choice = pickBotMove(fen, analysis.lines, bot.engine)
        if (!choice) {
          setThinking(false)
          return
        }
        setLastCost(choice.cost)

        // Réflexion simulée, dont on retranche le temps de calcul réel : un bot
        // du haut de l'échelle réfléchit déjà longtemps, inutile d'en rajouter.
        const legalCount = analysis.lines.length * 6
        const wanted = instant ? 0 : botThinkDelayMs(bot.level, legalCount)
        const elapsed = Date.now() - startedAt
        const wait = Math.max(0, wanted - elapsed)

        timerRef.current = setTimeout(() => {
          if (cancelled) return
          played = true
          setThinking(false)
          onMove(
            choice.uci.slice(0, 2) as Square,
            choice.uci.slice(2, 4) as Square,
            (choice.uci.length > 4 ? choice.uci[4] : undefined) as PieceSymbol | undefined,
          )
        }, wait)
      } catch (caught) {
        if (cancelled) return
        setLoading(false)
        setThinking(false)
        // Une annulation n'est pas une erreur : elle vient d'un changement de page.
        if (caught instanceof DOMException && caught.name === 'AbortError') return
        setError(messageMoteur(caught, t) ?? t('rest.engineCouldntPlay'))
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
      if (timerRef.current) clearTimeout(timerRef.current)

      // Une réflexion interrompue ne « réfléchit » plus : sans cette remise à
      // zéro, l'étiquette « réfléchit… » restait affichée après une
      // annulation ou une fin de partie survenue pendant le calcul, puisque
      // la branche qui l'éteignait — le minuteur — venait d'être annulée.
      setThinking(false)
      setLoading(false)

      // Une réflexion abandonnée doit pouvoir reprendre.
      //
      // `handledFen` empêche de rejouer deux fois la même position. Mais quand
      // c'est `active` qui retombe — le coach prend la parole, la partie se met
      // en pause d'étude — la position reste marquée « traitée » alors qu'aucun
      // coup n'a été joué. L'ordinateur ne repartait alors jamais : la partie
      // se figeait dès que le coach parlait. On rend donc la position à
      // traiter, puisqu'elle ne l'a pas été.
      if (!played) handledFen.current = null
    }
    // `onMove` est volontairement hors des dépendances : la page la recrée à
    // chaque rendu, ce qui relancerait la réflexion en boucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, turn, botColor, active, bot, instant])

  // Une nouvelle partie doit repartir d'un moteur vierge : sinon la table de
  // hachage garde des positions de la partie précédente.
  useEffect(() => {
    handledFen.current = null
  }, [botColor, level])

  const oublier = useCallback(() => {
    handledFen.current = null
  }, [])

  return { bot, thinking, loading, error, lastCost, oublier }
}

/**
 * Demande un indice au moteur : le meilleur coup dans la position courante.
 * Utilisé par le bouton « Indice » et par les leçons.
 */
export async function requestHint(
  fen: string,
  depth = 16,
): Promise<{ uci: string; from: Square; to: Square } | null> {
  const engine = getEngine()
  await engine.start()
  // Un indice doit être bon : on retire tout bridage éventuel laissé par un bot.
  engine.setOptions([
    ['UCI_LimitStrength', false],
    ['Skill Level', 20],
    ['MultiPV', 1],
  ])
  const analysis = await engine.analyse({ fen, depth, multiPv: 1 })
  const uci = analysis.bestMove
  if (!uci) return null
  return {
    uci,
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
  }
}
