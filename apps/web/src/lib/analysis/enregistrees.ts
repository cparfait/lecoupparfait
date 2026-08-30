'use client'

/**
 * Les analyses rangées dans le compte.
 *
 * Le service est gratuit et le moteur partagé : refaire deux fois le même
 * calcul, c'est faire attendre quelqu'un d'autre pour rien. Conserver l'analyse
 * d'une partie sert donc autant à celui qui la relit qu'à la file d'attente.
 *
 * Ce qui est conservé, ce sont les **évaluations du moteur**, pas le texte du
 * coach : voir `savedAnalyses` dans le schéma. La conséquence pratique est
 * qu'une analyse rouverte est rédigée par la version actuelle du code, et non
 * par celle du jour où elle a été lancée.
 */

import type { PositionAnalysis } from '@coupparfait/core'
import type { AnalysisOutcome } from './runner.ts'

/** Provenance de la partie, pour l'icône de la liste. */
export type Provenance = 'local' | 'chesscom' | 'lichess' | 'pgn'

/** Une ligne de la liste : de quoi choisir, sans charger les évaluations. */
export interface AnalyseEnregistree {
  id: string
  source: Provenance
  whiteName: string | null
  blackName: string | null
  result: string
  playedAt: string | null
  eco: string | null
  opening: string | null
  lecteur: 'w' | 'b' | null
  depth: number
  accuracyWhite: number | null
  accuracyBlack: number | null
  updatedAt: string
  coups: number | null
}

/** Une analyse complète, telle qu'on la rejoue. */
export interface AnalyseComplete {
  id: string
  source: Provenance
  moves: string[]
  startFen: string | null
  positions: PositionAnalysis[]
  depth: number
  lecteur: 'w' | 'b' | null
  headers: Record<string, string>
}

/**
 * D'où vient la partie, d'après ses en-têtes.
 *
 * Deviner plutôt que le faire dire : `Site` est écrit par chess.com et par
 * Lichess eux-mêmes, il est donc plus fiable qu'un paramètre qu'il faudrait
 * transporter depuis l'écran d'import jusqu'ici, en traversant trois
 * composants qui n'ont rien à en faire.
 */
export function provenanceDe(
  headers: Record<string, string> | undefined,
  jouéeIci: boolean,
): Provenance {
  if (jouéeIci) return 'local'
  const site = `${headers?.Site ?? ''} ${headers?.Event ?? ''}`.toLowerCase()
  if (site.includes('chess.com')) return 'chesscom'
  if (site.includes('lichess')) return 'lichess'
  return 'pgn'
}

/** La liste, vide pour un visiteur anonyme — ce n'est pas une erreur. */
export async function listerAnalyses(): Promise<AnalyseEnregistree[]> {
  try {
    const reponse = await fetch('/api/analyses', { cache: 'no-store' })
    if (!reponse.ok) return []
    const data = (await reponse.json()) as { analyses?: AnalyseEnregistree[] }
    return data.analyses ?? []
  } catch {
    return []
  }
}

/**
 * Range une analyse qui vient d'aboutir.
 *
 * Sans effet et sans bruit pour un visiteur anonyme : l'appel part à la fin de
 * chaque analyse sans que personne l'ait demandé, il n'a donc pas à se plaindre
 * de ne pas savoir où ranger. Retourne `false` plutôt que de lever : l'analyse
 * est déjà à l'écran, ne pas savoir la conserver ne doit rien casser.
 */
export async function enregistrerAnalyse(
  outcome: AnalysisOutcome,
  contexte: {
    moves: string[]
    startFen?: string
    depth: number
    lecteur: 'w' | 'b' | null
    jouéeIci: boolean
  },
): Promise<boolean> {
  // Une analyse abandonnée en route n'a pas une évaluation par position : la
  // rejouer donnerait un rapport faux. Mieux vaut ne rien garder.
  if (outcome.positions.length !== contexte.moves.length + 1) return false

  try {
    const reponse = await fetch('/api/analyses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moves: contexte.moves,
        startFen: contexte.startFen ?? null,
        positions: outcome.positions,
        depth: contexte.depth,
        lecteur: contexte.lecteur,
        source: provenanceDe(outcome.headers, contexte.jouéeIci),
        headers: outcome.headers ?? {},
        eco: outcome.report.opening?.eco ?? null,
        opening: outcome.report.opening?.name ?? null,
        accuracyWhite: outcome.report.accuracy.w,
        accuracyBlack: outcome.report.accuracy.b,
      }),
    })
    const data = (await reponse.json()) as { ok?: boolean }
    return data.ok === true
  } catch {
    return false
  }
}

/** Rapatrie une analyse, évaluations comprises. */
export async function chargerAnalyse(id: string): Promise<AnalyseComplete | null> {
  try {
    const reponse = await fetch(`/api/analyses/${id}`, { cache: 'no-store' })
    if (!reponse.ok) return null
    const data = (await reponse.json()) as { analyse?: AnalyseComplete | null }
    return data.analyse ?? null
  } catch {
    return null
  }
}

/** Oublie une analyse. */
export async function oublierAnalyse(id: string): Promise<boolean> {
  try {
    const reponse = await fetch(`/api/analyses/${id}`, { method: 'DELETE' })
    const data = (await reponse.json()) as { ok?: boolean }
    return data.ok === true
  } catch {
    return false
  }
}
