/**
 * Déroulé d'une leçon.
 *
 * La position affichée à une étape donnée est **recalculée depuis le début**
 * plutôt que modifiée pas à pas. C'est un peu plus de travail à chaque
 * changement d'étape — une poignée de coups rejoués, quelques microsecondes —
 * mais cela supprime toute une classe de bugs : revenir en arrière, sauter une
 * étape ou recharger la page donne toujours exactement la même position.
 *
 * Les règles du déroulé, valables ici **et** dans le script de vérification
 * `scripts/check-lessons.mjs` :
 *
 *  1. Une étape qui porte une `fen` réinitialise la position.
 *  2. Sur une étape d'action, le coup joué par l'apprenant est appliqué.
 *     S'il n'a pas encore joué, on prend le premier coup accepté.
 *  3. La `reply` d'une étape est **toujours** appliquée ensuite, que l'étape
 *     demande une action ou soit une simple observation.
 *
 * C'est le point 3 qui manquait : une réponse adverse posée sur une étape
 * d'observation n'était jamais jouée, et le coach commentait une position qui
 * n'était pas à l'écran.
 */

import { Chess } from 'chess.js'
import type { Square } from 'chess.js'
import type { Lesson } from './types.ts'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export interface StepPosition {
  /** Position au **début** de l'étape, avant toute action de l'apprenant. */
  fen: string
  /** Dernier coup joué pour y arriver, à surligner. */
  lastMove: { from: Square; to: Square } | null
}

/** Coups réellement joués par l'apprenant, indexés par numéro d'étape. */
export type PlayedByStep = Record<number, string>

/**
 * Position au début d'une étape.
 *
 * On rejoue toutes les étapes précédentes, en utilisant le coup réellement
 * choisi par l'apprenant quand il y en a un — sinon la leçon changerait de
 * position sous ses yeux parce qu'il a préféré `d4` à `e4`.
 */
export function positionAtStep(
  lesson: Lesson,
  index: number,
  played: PlayedByStep = {},
): StepPosition {
  let board: Chess | null = null
  let lastMove: { from: Square; to: Square } | null = null

  for (let i = 0; i <= index; i++) {
    const step = lesson.steps[i]
    if (!step) break

    if (step.fen) {
      board = new Chess(step.fen, { skipValidation: true })
      lastMove = null
    }
    if (!board) continue

    // L'étape demandée s'arrête ici : son contenu n'est pas encore joué.
    if (i === index) break

    if (step.kind === 'play' || step.kind === 'choose') {
      const san = played[i] ?? step.answers?.[0]
      if (san) {
        try {
          const move = board.move(san)
          lastMove = { from: move.from, to: move.to }
        } catch {
          // Coup devenu illégal : la position a divergé, on continue avec ce
          // qu'on a plutôt que d'interrompre la leçon.
        }
      }
    }

    if (step.reply) {
      try {
        const move = board.move(step.reply)
        lastMove = { from: move.from, to: move.to }
      } catch {
        // Idem : une réponse impossible ne doit pas bloquer l'apprenant.
      }
    }
  }

  return { fen: board?.fen() ?? START, lastMove }
}

/**
 * Applique la réponse de l'adversaire à une position.
 * Retourne `null` si le coup est impossible, pour que l'appelant n'ait pas à
 * distinguer l'échec d'une absence de réponse.
 */
export function applyReply(
  fen: string,
  reply: string | undefined,
): {
  fen: string
  from: Square
  to: Square
  capture: boolean
  check: boolean
  mate: boolean
} | null {
  if (!reply) return null
  const board = new Chess(fen, { skipValidation: true })
  try {
    const move = board.move(reply)
    return {
      fen: board.fen(),
      from: move.from,
      to: move.to,
      capture: move.isCapture(),
      check: board.inCheck(),
      mate: board.isCheckmate(),
    }
  } catch {
    return null
  }
}

/**
 * Vrai si l'étape demande une action de l'apprenant.
 * Regroupé ici pour que l'interface et la vérification partagent la définition.
 */
export function isActionStep(kind: string): boolean {
  return kind === 'play' || kind === 'choose'
}
