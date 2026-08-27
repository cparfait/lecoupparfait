/**
 * Coloration des coups selon leur sûreté.
 *
 * Quand on sélectionne une pièce, chaque case d'arrivée prend une couleur qui
 * dit ce qui s'y passerait :
 *
 *  - **vert** — la pièce y est en sécurité ;
 *  - **doré** — le coup gagne du matériel ;
 *  - **rouge** — la pièce serait perdue ;
 *  - **contour bleu** — le coup donne échec.
 *
 * C'est une béquille, et c'est assumé : un débutant passe ses premières parties
 * à laisser des pièces en prise sans le voir. Voir la case devenir rouge *avant*
 * de lâcher la pièce lui apprend à se poser la question tout seul — après quoi
 * il désactive l'option.
 *
 * Le verdict repose sur l'**échange statique** : on ne regarde pas seulement si
 * la case est attaquée, mais qui gagne la série complète de captures. Une pièce
 * attaquée trois fois et défendue quatre fois n'est pas en danger.
 */

import { Chess } from 'chess.js'
import type { Color, PieceSymbol, Square } from 'chess.js'
import { PIECE_VALUES, opposite, staticExchange } from '@coupparfait/core'

export type MoveSafety = 'safe' | 'winning' | 'losing' | 'even'

export interface SafetyVerdict {
  safety: MoveSafety
  /** Gain net en centipions, du point de vue de celui qui joue. */
  net: number
  /** Le coup donne échec. */
  check: boolean
  /** Le coup fait mat : plus rien d'autre ne compte. */
  mate: boolean
  /** Le coup est une capture. */
  capture: boolean
}

/** Seuil au-delà duquel un écart de matériel est jugé significatif. */
const MATERIAL_THRESHOLD = 60

/**
 * Évalue chaque case d'arrivée d'une pièce sélectionnée.
 *
 * Coût : une simulation et un échange statique par destination, soit au pire
 * une trentaine de calculs très courts. Assez rapide pour être recalculé à
 * chaque sélection sans que cela se remarque.
 */
export function evaluateMoveSafety(
  fen: string,
  from: Square,
  targets: Square[],
): Map<Square, SafetyVerdict> {
  const verdicts = new Map<Square, SafetyVerdict>()

  let board: Chess
  try {
    board = new Chess(fen, { skipValidation: true })
  } catch {
    return verdicts
  }

  const moving = board.get(from)
  if (!moving) return verdicts
  const mover: Color = moving.color
  const enemy = opposite(mover)

  for (const to of targets) {
    const probe = new Chess(fen, { skipValidation: true })
    let played
    try {
      played = probe.move({ from, to, promotion: 'q' })
    } catch {
      continue
    }

    const mate = probe.isCheckmate()
    const check = probe.inCheck()
    const capture = played.isCapture()

    // Ce qu'on gagne en capturant, moins ce qu'on risque de reperdre sur la
    // case d'arrivée. La promotion ajoute la valeur de la pièce obtenue.
    const gained = played.captured ? PIECE_VALUES[played.captured] : 0
    const promoted = played.promotion
      ? PIECE_VALUES[played.promotion as PieceSymbol] - PIECE_VALUES.p
      : 0
    const risked = staticExchange(probe.fen(), to, enemy)
    const net = gained + promoted - risked

    let safety: MoveSafety
    if (mate) {
      safety = 'winning'
    } else if (net >= MATERIAL_THRESHOLD) {
      safety = 'winning'
    } else if (net <= -MATERIAL_THRESHOLD) {
      safety = 'losing'
    } else if (risked > 0) {
      // Échange équilibré : ni gain ni perte, mais la pièce partira.
      safety = 'even'
    } else {
      safety = 'safe'
    }

    verdicts.set(to, { safety, net, check, mate, capture })
  }

  return verdicts
}

/** Couleurs associées à chaque verdict. */
export const SAFETY_COLOURS: Record<MoveSafety, string> = {
  safe: 'var(--q-best)',
  winning: 'var(--q-brilliant)',
  even: 'var(--q-forced)',
  losing: 'var(--q-blunder)',
}

/** Libellé affiché en info-bulle sur la case. */
export function describeSafety(verdict: SafetyVerdict): string {
  if (verdict.mate) return 'Échec et mat'

  const pawns = Math.abs(verdict.net) / 100
  const rounded = pawns >= 1 ? pawns.toFixed(0) : pawns.toFixed(1)

  const base =
    verdict.safety === 'winning'
      ? `Gagne ${rounded} point${pawns >= 2 ? 's' : ''}`
      : verdict.safety === 'losing'
        ? `Perd ${rounded} point${pawns >= 2 ? 's' : ''}`
        : verdict.safety === 'even'
          ? 'Échange équilibré'
          : 'Case sûre'

  return verdict.check ? `${base} · échec` : base
}
