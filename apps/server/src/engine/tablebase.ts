/**
 * Tables de finales Syzygy.
 *
 * À sept pièces ou moins, les échecs sont **résolus** : on sait avec certitude
 * si la position est gagnée, nulle ou perdue, et en combien de coups. Aucun
 * moteur n'égale cette certitude — Stockfish à profondeur 40 peut se tromper
 * dans une finale de tour où la table donne la réponse exacte.
 *
 * Les tables complètes pèsent plusieurs téraoctets ; on interroge donc le
 * service public de Lichess. Le résultat est mis en cache localement, et
 * l'indisponibilité du service n'est jamais bloquante : on retombe simplement
 * sur le moteur.
 */

import { Chess } from 'chess.js'
import type { PositionAnalysis, Score } from '@coupparfait/core'

const BASE_URL = process.env.LICHESS_TABLEBASE_URL ?? 'https://tablebase.lichess.ovh'

/** Cache mémoire : une finale revient sans arrêt pendant l'analyse d'une partie. */
const cache = new Map<string, PositionAnalysis | null>()
const MAX_CACHE = 5000

/** Vrai si le service est configuré. */
export function isTablebaseEnabled(): boolean {
  return BASE_URL.length > 0
}

interface TablebaseMove {
  uci: string
  san: string
  dtz: number | null
  dtm: number | null
  category: string
  checkmate: boolean
  stalemate: boolean
}

interface TablebaseResponse {
  category: string
  dtz: number | null
  dtm: number | null
  checkmate: boolean
  stalemate: boolean
  insufficient_material: boolean
  moves: TablebaseMove[]
}

/**
 * Interroge les tables pour une position.
 * Retourne `null` si la position dépasse sept pièces ou si le service est
 * injoignable — l'appelant se rabat alors sur le moteur.
 */
export async function probeTablebase(fen: string): Promise<PositionAnalysis | null> {
  if (!isTablebaseEnabled()) return null

  const cached = cache.get(fen)
  if (cached !== undefined) return cached

  try {
    const controller = new AbortController()
    // Trois secondes : au-delà, le moteur aura répondu plus vite.
    const timeout = setTimeout(() => controller.abort(), 3000)

    const response = await fetch(
      `${BASE_URL}/standard?fen=${encodeURIComponent(fen)}`,
      {
        signal: controller.signal,
        headers: { 'User-Agent': 'Le Coup Parfait (plateforme d’échecs libre)' },
      },
    )
    clearTimeout(timeout)

    if (!response.ok) {
      remember(fen, null)
      return null
    }

    const data = (await response.json()) as TablebaseResponse
    const analysis = toAnalysis(fen, data)
    remember(fen, analysis)
    return analysis
  } catch {
    // Réseau coupé, service en panne, délai dépassé : ce n'est pas une erreur
    // fatale, l'analyse continuera avec le moteur.
    remember(fen, null)
    return null
  }
}

function remember(fen: string, value: PositionAnalysis | null): void {
  if (cache.size >= MAX_CACHE) {
    // Éviction naïve : on vide le quart le plus ancien. Suffisant ici, et bien
    // plus simple qu'un vrai LRU pour un gain identique.
    const keys = [...cache.keys()].slice(0, Math.floor(MAX_CACHE / 4))
    for (const key of keys) cache.delete(key)
  }
  cache.set(fen, value)
}

/**
 * Convertit la réponse des tables en analyse.
 *
 * Le `dtz` compte les coups jusqu'à la remise à zéro du compteur des cinquante
 * coups ; le `dtm` compte les coups jusqu'au mat. C'est `dtm` qui intéresse un
 * joueur, mais il n'est pas toujours fourni — on se rabat alors sur `dtz`.
 */
function toAnalysis(fen: string, data: TablebaseResponse): PositionAnalysis | null {
  if (!data.moves) return null

  const board = new Chess(fen, { skipValidation: true })
  const turn = board.turn()

  // Les coups sont triés par qualité décroissante par le service.
  const best = data.moves[0]
  if (!best) {
    // Position terminale : mat, pat, ou matériel insuffisant.
    const score: Score = data.checkmate
      ? { type: 'mate', value: turn === 'w' ? -1 : 1 }
      : { type: 'cp', value: 0 }
    return {
      fen,
      depth: 99,
      lines: [{ multipv: 1, score, depth: 99, pv: [] }],
      bestMove: null,
      source: 'tablebase',
    }
  }

  const lines = data.moves.slice(0, 5).map((move, index) => ({
    multipv: index + 1,
    score: moveToScore(move, turn),
    depth: 99,
    pv: [move.uci],
    san: [move.san],
  }))

  return {
    fen,
    depth: 99,
    lines,
    bestMove: best.uci,
    source: 'tablebase',
  }
}

/**
 * Traduit le verdict d'un coup en score, normalisé côté Blancs.
 *
 * Attention au point de vue : la catégorie renvoyée par le service décrit la
 * position **après** le coup, donc du point de vue de l'adversaire. Un coup
 * marqué « loss » est donc excellent pour celui qui le joue.
 */
function moveToScore(move: TablebaseMove, turn: 'w' | 'b'): Score {
  const sign = turn === 'w' ? 1 : -1

  if (move.checkmate) return { type: 'mate', value: sign * 1 }

  switch (move.category) {
    case 'loss': {
      // L'adversaire perd : on gagne. `dtm` est négatif du point de vue adverse.
      const plies = move.dtm !== null ? Math.abs(move.dtm) : Math.abs(move.dtz ?? 1)
      return { type: 'mate', value: sign * Math.max(1, Math.ceil(plies / 2)) }
    }
    case 'win': {
      // L'adversaire gagne : on perd.
      const plies = move.dtm !== null ? Math.abs(move.dtm) : Math.abs(move.dtz ?? 1)
      return { type: 'mate', value: -sign * Math.max(1, Math.ceil(plies / 2)) }
    }
    case 'cursed-win':
      // Gain théorique annulé par la règle des cinquante coups : c'est nulle.
      return { type: 'cp', value: sign * 60 }
    case 'blessed-loss':
      return { type: 'cp', value: -sign * 60 }
    case 'draw':
    default:
      return { type: 'cp', value: 0 }
  }
}

/** Description lisible du verdict, pour l'affichage. */
export function describeTablebaseCategory(
  category: string,
  locale: 'fr' | 'en' = 'fr',
): string {
  const table: Record<string, { fr: string; en: string }> = {
    win: { fr: 'Gain forcé', en: 'Forced win' },
    loss: { fr: 'Perte forcée', en: 'Forced loss' },
    draw: { fr: 'Nulle théorique', en: 'Theoretical draw' },
    'cursed-win': {
      fr: 'Gain annulé par la règle des cinquante coups',
      en: 'Win nullified by the fifty-move rule',
    },
    'blessed-loss': {
      fr: 'Perte sauvée par la règle des cinquante coups',
      en: 'Loss saved by the fifty-move rule',
    },
    unknown: { fr: 'Position inconnue des tables', en: 'Not in tablebase' },
  }
  return (table[category] ?? table.unknown!)[locale]
}
