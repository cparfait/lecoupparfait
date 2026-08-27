/**
 * Détection des motifs tactiques et stratégiques.
 *
 * Un moteur d'échecs dit *quel* coup jouer mais jamais *pourquoi*. Ce module
 * comble ce trou : il reconnaît sur l'échiquier les figures que les joueurs
 * humains ont nommées — fourchette, clouage, enfilade, pion passé, avant-poste,
 * mat du couloir — pour que l'application puisse rédiger une explication en
 * français plutôt que d'afficher « −1.34 ».
 *
 * Tout est purement géométrique : aucun appel moteur, donc instantané. Le
 * moteur sert ensuite à confirmer *l'importance* du motif détecté.
 */

import { Chess } from 'chess.js'
import type { Color, PieceSymbol, Square } from 'chess.js'
import {
  PIECE_VALUES,
  analyseKingSafety,
  analysePawns,
  fileIndex,
  findHangingPieces,
  kingDistance,
  kingSquare,
  listPieces,
  opposite,
  rankIndex,
  relativeRank,
  slidingDirections,
  squareFrom,
  squareShade,
  squaresBetween,
  staticExchange,
  undevelopedPieces,
  hasOppositeCastling,
  centreControl,
} from './board.ts'
import type { DetectedMotif, MotifId } from './types.ts'

// ─────────────────────────────────────────────────────────────────────────────
//  Outils internes
// ─────────────────────────────────────────────────────────────────────────────

function motif(
  id: MotifId,
  side: Color,
  squares: Square[],
  weight: number,
  detail?: DetectedMotif['detail'],
): DetectedMotif {
  return { id, side, squares, weight: Math.max(0, Math.min(1, weight)), detail }
}

/**
 * Parcourt une ligne depuis une case dans une direction et retourne les deux
 * premières pièces rencontrées. C'est la primitive des clouages et enfilades.
 */
function firstTwoOnRay(
  chess: Chess,
  from: Square,
  df: number,
  dr: number,
): Array<{ square: Square; type: PieceSymbol; color: Color }> {
  const found: Array<{ square: Square; type: PieceSymbol; color: Color }> = []
  let f = fileIndex(from) + df
  let r = rankIndex(from) + dr
  while (f >= 0 && f < 8 && r >= 0 && r < 8 && found.length < 2) {
    const sq = squareFrom(f, r)
    if (!sq) break
    const piece = chess.get(sq)
    if (piece) found.push({ square: sq, type: piece.type, color: piece.color })
    f += df
    r += dr
  }
  return found
}

/** Coups légaux d'un camp, même s'il n'a pas le trait. */
function movesForColor(chess: Chess, color: Color) {
  if (chess.turn() === color) {
    return chess.moves({ verbose: true })
  }
  if (chess.inCheck()) return [] // inverser le trait donnerait une position illégale
  const mirrored = new Chess(chess.fen(), { skipValidation: true })
  mirrored.setTurn(color)
  try {
    return mirrored.moves({ verbose: true })
  } catch {
    return []
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Clouages et enfilades
// ─────────────────────────────────────────────────────────────────────────────

export interface PinOrSkewer {
  kind: 'pin' | 'skewer'
  /** Pièce qui exerce la contrainte. */
  attacker: Square
  /** Pièce immobilisée (clouage) ou exposée en premier (enfilade). */
  front: Square
  /** Pièce protégée derrière (clouage) ou visée derrière (enfilade). */
  back: Square
  /** Vrai si la pièce arrière est le roi : le clouage est alors absolu. */
  absolute: boolean
  side: Color
}

/**
 * Tous les clouages et enfilades subis par `victim`.
 *
 * Clouage : une pièce de faible valeur est coincée devant une pièce de plus
 * grande valeur — elle ne peut pas bouger sans coûter cher (absolu si c'est le
 * roi derrière : elle ne peut légalement pas bouger du tout).
 *
 * Enfilade : le contraire — la pièce de valeur est devant, elle doit fuir, et
 * ce faisant elle abandonne celle qui est derrière.
 */
export function findPinsAndSkewers(chess: Chess, victim: Color): PinOrSkewer[] {
  const attackerColor = opposite(victim)
  const out: PinOrSkewer[] = []

  for (const slider of listPieces(chess, attackerColor)) {
    const directions = slidingDirections(slider.type)
    if (directions.length === 0) continue

    for (const [df, dr] of directions) {
      const [front, back] = firstTwoOnRay(chess, slider.square, df, dr)
      if (!front || !back) continue
      if (front.color !== victim || back.color !== victim) continue

      const frontValue = PIECE_VALUES[front.type]
      const backValue = PIECE_VALUES[back.type]
      const backIsKing = back.type === 'k'
      const frontIsKing = front.type === 'k'

      if (backIsKing || backValue > frontValue) {
        out.push({
          kind: 'pin',
          attacker: slider.square,
          front: front.square,
          back: back.square,
          absolute: backIsKing,
          side: attackerColor,
        })
      } else if (frontValue > backValue && !frontIsKing) {
        out.push({
          kind: 'skewer',
          attacker: slider.square,
          front: front.square,
          back: back.square,
          absolute: false,
          side: attackerColor,
        })
      }
    }
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
//  Fourchettes
// ─────────────────────────────────────────────────────────────────────────────

export interface Fork {
  /** Case de la pièce qui fourche. */
  from: Square
  attackerType: PieceSymbol
  /** Cibles réellement gagnables. */
  targets: Square[]
  side: Color
  /** Valeur de la cible la plus chère qui ne peut pas être sauvée. */
  bestGain: number
}

/**
 * Fourchettes exercées par `side`.
 *
 * Une vraie fourchette exige trois conditions : au moins deux cibles de valeur,
 * la pièce qui fourche doit être en sécurité (sinon on la reprend simplement),
 * et les cibles doivent être réellement gagnables (attaquer une pièce bien
 * défendue avec sa dame n'est pas une fourchette).
 */
export function findForks(chess: Chess, side: Color): Fork[] {
  const enemy = opposite(side)
  const fen = chess.fen()
  const out: Fork[] = []

  for (const piece of listPieces(chess, side)) {
    if (piece.type === 'k') continue

    // Une pièce qu'on peut simplement capturer ne fourche rien.
    if (staticExchange(fen, piece.square, enemy) > 0) continue

    const targets: Square[] = []
    let bestGain = 0
    for (const enemyPiece of listPieces(chess, enemy)) {
      if (!chess.attackers(enemyPiece.square, side).includes(piece.square)) continue

      if (enemyPiece.type === 'k') {
        targets.push(enemyPiece.square)
        bestGain = Math.max(bestGain, 400) // un échec vaut un tempo décisif
        continue
      }
      // Cible intéressante : soit plus chère que l'attaquant, soit indéfendue.
      const winnable =
        PIECE_VALUES[enemyPiece.type] > PIECE_VALUES[piece.type] ||
        staticExchange(fen, enemyPiece.square, side) > 0
      if (winnable) {
        targets.push(enemyPiece.square)
        bestGain = Math.max(bestGain, PIECE_VALUES[enemyPiece.type])
      }
    }

    if (targets.length >= 2) {
      out.push({
        from: piece.square,
        attackerType: piece.type,
        targets,
        side,
        bestGain,
      })
    }
  }
  return out.sort((a, b) => b.bestGain - a.bestGain)
}

// ─────────────────────────────────────────────────────────────────────────────
//  Attaques à la découverte
// ─────────────────────────────────────────────────────────────────────────────

export interface DiscoveredAttack {
  /** Pièce dont la ligne vient d'être dégagée. */
  slider: Square
  /** Case libérée par le coup. */
  vacated: Square
  /** Pièce visée par la ligne dégagée. */
  target: Square
  side: Color
  /** Vrai si la cible est le roi : c'est un échec à la découverte. */
  isCheck: boolean
}

/**
 * Attaques à la découverte créées par un coup.
 *
 * Le coup dégage une ligne : une pièce à longue portée restée en arrière frappe
 * soudain une cible. C'est redoutable parce que deux menaces naissent d'un seul
 * coup — celle de la pièce qui bouge et celle qui vient d'être démasquée.
 */
export function findDiscoveredAttacks(
  after: Chess,
  vacated: Square,
  movedTo: Square,
  side: Color,
): DiscoveredAttack[] {
  const enemy = opposite(side)
  const out: DiscoveredAttack[] = []

  for (const slider of listPieces(after, side)) {
    if (slider.square === movedTo) continue // la pièce qui a bougé, pas une découverte
    if (slidingDirections(slider.type).length === 0) continue

    for (const target of listPieces(after, enemy)) {
      if (!after.attackers(target.square, side).includes(slider.square)) continue
      // La ligne doit passer par la case que le coup vient de libérer.
      const between = squaresBetween(slider.square, target.square)
      if (!between || !between.includes(vacated)) continue
      // Ne retenir que les cibles qui valent la peine.
      if (
        target.type !== 'k' &&
        staticExchange(after.fen(), target.square, side) <= 0
      ) {
        continue
      }
      out.push({
        slider: slider.square,
        vacated,
        target: target.square,
        side,
        isCheck: target.type === 'k',
      })
    }
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
//  Pièces piégées et défenseurs surchargés
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pièces d'un camp qui n'ont aucune case de fuite sûre alors qu'elles sont
 * attaquées. Typiquement le fou qui s'aventure en h3 et se fait enfermer.
 */
export function findTrappedPieces(chess: Chess, color: Color): Square[] {
  const enemy = opposite(color)
  const fen = chess.fen()
  const moves = movesForColor(chess, color)
  const out: Square[] = []

  for (const piece of listPieces(chess, color)) {
    if (piece.type === 'k' || piece.type === 'p') continue
    // Ne s'intéresser qu'aux pièces réellement menacées.
    if (staticExchange(fen, piece.square, enemy) <= 0) continue

    const escapes = moves.filter((m) => m.from === piece.square)
    const safeEscape = escapes.some((m) => {
      // Une capture qui compense la perte est une fuite acceptable.
      if (m.captured && PIECE_VALUES[m.captured] >= PIECE_VALUES[piece.type]) return true
      return staticExchange(m.after, m.to, enemy) <= 0
    })
    // Une pièce suffisamment défendue sur place n'est pas « piégée ».
    if (!safeEscape) out.push(piece.square)
  }
  return out
}

export interface OverloadedPiece {
  square: Square
  /** Ce que cette pièce défend et qui tomberait si elle était détournée. */
  duties: Square[]
  side: Color
}

/**
 * Défenseurs surchargés : une pièce qui assure seule deux tâches différentes.
 * Il suffit de la détourner d'un côté pour que l'autre s'effondre — c'est la
 * base des thèmes de déviation.
 */
export function findOverloadedPieces(chess: Chess, color: Color): OverloadedPiece[] {
  const enemy = opposite(color)
  const out: OverloadedPiece[] = []

  for (const defender of listPieces(chess, color)) {
    if (defender.type === 'k') continue

    const duties: Square[] = []
    // On retire le défenseur et on regarde ce qui devient capturable.
    const probe = new Chess(chess.fen(), { skipValidation: true })
    probe.remove(defender.square)
    const probeFen = probe.fen()

    for (const friend of listPieces(chess, color)) {
      if (friend.square === defender.square) continue
      if (!chess.attackers(friend.square, color).includes(defender.square)) continue
      if (chess.attackers(friend.square, enemy).length === 0) continue

      const before = staticExchange(chess.fen(), friend.square, enemy)
      const after = staticExchange(probeFen, friend.square, enemy)
      if (after > before && after > 0) duties.push(friend.square)
    }

    if (duties.length >= 2) {
      out.push({ square: defender.square, duties, side: color })
    }
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
//  Motifs de mat
// ─────────────────────────────────────────────────────────────────────────────

/** Cherche un mat en un coup pour le camp au trait, et le renvoie en SAN. */
export function mateInOne(chess: Chess): { san: string; from: Square; to: Square } | null {
  for (const move of chess.moves({ verbose: true })) {
    const probe = new Chess(move.after, { skipValidation: true })
    if (probe.isCheckmate()) return { san: move.san, from: move.from, to: move.to }
  }
  return null
}

/**
 * Recherche exhaustive de mat forcé jusqu'à `maxPly` demi-coups.
 *
 * Volontairement limitée à un mat en 3 : au-delà, l'explosion combinatoire rend
 * la recherche plus lente qu'un appel au moteur, qui fait ça bien mieux.
 */
export function findForcedMate(chess: Chess, maxPly = 5): string[] | null {
  return searchMate(chess, maxPly, true)
}

function searchMate(chess: Chess, remaining: number, attacking: boolean): string[] | null {
  if (chess.isCheckmate()) return attacking ? null : []
  if (remaining <= 0) return null
  const moves = chess.moves({ verbose: true })
  if (moves.length === 0) return null

  if (attacking) {
    // On cherche UN coup qui mate.
    for (const move of moves) {
      const next = new Chess(move.after, { skipValidation: true })
      if (next.isCheckmate()) return [move.san]
      // Élagage : sans échec, un mat forcé court est très improbable.
      if (remaining > 1 && next.inCheck()) {
        const line = searchMate(next, remaining - 1, false)
        if (line) return [move.san, ...line]
      }
    }
    return null
  }

  // Défense : TOUS les coups doivent mener au mat.
  let longest: string[] | null = null
  for (const move of moves) {
    const next = new Chess(move.after, { skipValidation: true })
    const line = searchMate(next, remaining - 1, true)
    if (!line) return null
    if (!longest || line.length > longest.length) longest = [move.san, ...line]
  }
  return longest
}

/**
 * Mat du couloir : le roi étouffé sur sa rangée par ses propres pions.
 *
 * Deux conditions, et la seconde est indispensable. Le roi doit être privé de
 * case de fuite — mais il faut **aussi** que l'adversaire dispose d'une pièce
 * lourde capable d'atteindre cette rangée. Sans ce second test, la position de
 * départ elle-même serait signalée : les deux rois y sont enfermés derrière
 * leurs pions, alors qu'aucune tour ne peut sortir de son coin.
 */
export function detectBackRankWeakness(chess: Chess, color: Color): boolean {
  if (!analyseKingSafety(chess, color).backRankWeak) return false

  const enemy = opposite(color)
  const backRank = color === 'w' ? 1 : 8

  // Une pièce lourde adverse atteint-elle une case de cette rangée ?
  for (let file = 0; file < 8; file++) {
    const square = squareFrom(file, backRank - 1)
    if (!square) continue
    for (const attacker of chess.attackers(square, enemy)) {
      const piece = chess.get(attacker)
      if (piece && (piece.type === 'r' || piece.type === 'q')) return true
    }
  }
  return false
}

/** Mat étouffé : le roi entouré de ses propres pièces, maté par un cavalier. */
export function detectSmotheredMate(chess: Chess, color: Color): boolean {
  const king = kingSquare(chess, color)
  if (!king) return false
  const f = fileIndex(king)
  const r = rankIndex(king)
  let free = 0
  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (df === 0 && dr === 0) continue
      const sq = squareFrom(f + df, r + dr)
      if (!sq) continue
      const piece = chess.get(sq)
      if (!piece || piece.color !== color) free++
    }
  }
  if (free > 0) return false
  // Toutes les cases voisines sont occupées par ses propres pièces : un cavalier
  // adverse à portée de saut peut mater.
  return listPieces(chess, opposite(color)).some(
    (p) => p.type === 'n' && kingDistance(p.square, king) <= 2,
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Motifs positionnels
// ─────────────────────────────────────────────────────────────────────────────

/** Avant-postes : cases fortes, soutenues par un pion, inattaquables par un pion. */
export function findOutposts(chess: Chess, color: Color): Square[] {
  const enemy = opposite(color)
  const out: Square[] = []
  for (const piece of listPieces(chess, color)) {
    if (piece.type !== 'n' && piece.type !== 'b') continue
    const rank = relativeRank(piece.square, color)
    if (rank < 3) continue // trop en arrière pour être un avant-poste

    const defendedByPawn = chess
      .attackers(piece.square, color)
      .some((sq) => chess.get(sq)?.type === 'p')
    if (!defendedByPawn) continue

    // Aucun pion adverse ne peut venir la chasser.
    const f = fileIndex(piece.square)
    const canBeChased = listPieces(chess, enemy)
      .filter((p) => p.type === 'p')
      .some((p) => {
        const pf = fileIndex(p.square)
        if (Math.abs(pf - f) !== 1) return false
        return relativeRank(p.square, color) > rank
      })
    if (!canBeChased) out.push(piece.square)
  }
  return out
}

/** Tours actives : sur colonne ouverte, ou sur la 7e rangée. */
export function findActiveRooks(
  chess: Chess,
  color: Color,
): { openFile: Square[]; semiOpen: Square[]; seventh: Square[] } {
  const pawns = analysePawns(chess, color)
  const openFile: Square[] = []
  const semiOpen: Square[] = []
  const seventh: Square[] = []
  for (const piece of listPieces(chess, color)) {
    if (piece.type !== 'r' && piece.type !== 'q') continue
    const file = piece.square[0]!
    if (pawns.openFiles.includes(file)) openFile.push(piece.square)
    else if (pawns.semiOpenFiles.includes(file)) semiOpen.push(piece.square)
    if (piece.type === 'r' && relativeRank(piece.square, color) === 6) {
      seventh.push(piece.square)
    }
  }
  return { openFile, semiOpen, seventh }
}

/** Fou en fianchetto : sur la grande diagonale, derrière un pion avancé en b/g. */
export function findFianchetto(chess: Chess, color: Color): Square[] {
  const squares: Square[] = color === 'w' ? ['b2', 'g2'] : ['b7', 'g7']
  return squares.filter((sq) => {
    const piece = chess.get(sq)
    return !!piece && piece.type === 'b' && piece.color === color
  })
}

/** Paire de fous : deux fous de couleurs de cases différentes. */
export function hasBishopPair(chess: Chess, color: Color): boolean {
  const bishops = listPieces(chess, color).filter((p) => p.type === 'b')
  if (bishops.length < 2) return false
  return new Set(bishops.map((b) => squareShade(b.square))).size >= 2
}

/**
 * Mauvais fou : un fou dont les propres pions bloquent les diagonales, parce
 * qu'ils sont sur des cases de la même couleur que lui.
 */
export function findBadBishops(chess: Chess, color: Color): Square[] {
  const pawns = listPieces(chess, color).filter((p) => p.type === 'p')
  const out: Square[] = []
  for (const bishop of listPieces(chess, color).filter((p) => p.type === 'b')) {
    const shade = squareShade(bishop.square)
    const blocking = pawns.filter((p) => squareShade(p.square) === shade).length
    if (blocking >= 4) out.push(bishop.square)
  }
  return out
}

/**
 * Opposition en finale de pions : les rois se font face à distance impaire sur
 * une même ligne, colonne ou diagonale. Celui qui n'a *pas* le trait la détient.
 */
export function hasOpposition(chess: Chess, color: Color): boolean {
  const own = kingSquare(chess, color)
  const enemy = kingSquare(chess, opposite(color))
  if (!own || !enemy) return false
  const df = Math.abs(fileIndex(own) - fileIndex(enemy))
  const dr = Math.abs(rankIndex(own) - rankIndex(enemy))
  const aligned = df === 0 || dr === 0 || df === dr
  if (!aligned) return false
  const distance = Math.max(df, dr)
  // Distance impaire = cases de même couleur entre les rois = opposition.
  return distance % 2 === 1 && chess.turn() !== color
}

/** Tour placée derrière un pion passé (règle de Tarrasch). */
export function findRookBehindPasser(chess: Chess, color: Color): Square[] {
  const passers = analysePawns(chess, color).passed
  const out: Square[] = []
  for (const rook of listPieces(chess, color).filter((p) => p.type === 'r')) {
    for (const pawn of passers) {
      if (fileIndex(rook.square) !== fileIndex(pawn)) continue
      if (relativeRank(rook.square, color) < relativeRank(pawn, color)) {
        out.push(rook.square)
      }
    }
  }
  return out
}

/**
 * Mauvais fou de finale : fou de tour dont le fou ne contrôle pas la case de
 * promotion — la finale est nulle même avec un pion de plus.
 */
export function hasWrongRookBishop(chess: Chess, color: Color): boolean {
  const pieces = listPieces(chess, color)
  const bishops = pieces.filter((p) => p.type === 'b')
  if (bishops.length !== 1) return false
  const pawns = pieces.filter((p) => p.type === 'p')
  if (pawns.length === 0) return false
  // Tous les pions doivent être sur la même colonne de tour.
  const files = new Set(pawns.map((p) => fileIndex(p.square)))
  if (files.size !== 1) return false
  const file = [...files][0]!
  if (file !== 0 && file !== 7) return false
  const promotionSquare = squareFrom(file, color === 'w' ? 7 : 0)
  if (!promotionSquare) return false
  return squareShade(promotionSquare) !== squareShade(bishops[0]!.square)
}

/** Activité du roi en finale : distance au centre et aux pions adverses. */
export function kingActivityScore(chess: Chess, color: Color): number {
  const king = kingSquare(chess, color)
  if (!king) return 0
  const centreDistance = Math.max(
    Math.abs(fileIndex(king) - 3.5),
    Math.abs(rankIndex(king) - 3.5),
  )
  const enemyPawns = listPieces(chess, opposite(color)).filter((p) => p.type === 'p')
  const nearestPawn = enemyPawns.length
    ? Math.min(...enemyPawns.map((p) => kingDistance(king, p.square)))
    : 7
  return Math.round(100 - centreDistance * 14 - nearestPawn * 5)
}

// ─────────────────────────────────────────────────────────────────────────────
//  Agrégation : motifs d'une position
// ─────────────────────────────────────────────────────────────────────────────

export interface MotifOptions {
  /** Ne garder que les motifs dont le poids dépasse ce seuil. */
  minWeight?: number
  /** Limiter le nombre de motifs retournés par camp. */
  limit?: number
  /** Ignorer les motifs stratégiques (analyse rapide). */
  tacticsOnly?: boolean
}

/**
 * Tous les motifs présents dans une position, pour les deux camps.
 * Triés par poids décroissant : les plus parlants d'abord.
 */
export function detectPositionMotifs(
  chess: Chess,
  options: MotifOptions = {},
): DetectedMotif[] {
  const { minWeight = 0.15, limit = 24, tacticsOnly = false } = options
  const out: DetectedMotif[] = []

  for (const side of ['w', 'b'] as const) {
    const enemy = opposite(side)

    // ── Tactique ────────────────────────────────────────────────────────────
    for (const hanging of findHangingPieces(chess, enemy).slice(0, 3)) {
      out.push(
        motif('hangingPiece', side, [hanging.square, ...hanging.attackedFrom], hanging.gain / 950, {
          piece: hanging.type,
          gain: hanging.gain,
          undefended: hanging.undefended,
        }),
      )
    }

    for (const fork of findForks(chess, side).slice(0, 2)) {
      out.push(
        motif('fork', side, [fork.from, ...fork.targets], 0.5 + fork.bestGain / 1900, {
          piece: fork.attackerType,
          targetCount: fork.targets.length,
        }),
      )
    }

    for (const pin of findPinsAndSkewers(chess, enemy)) {
      out.push(
        motif(
          pin.kind === 'pin' ? 'pin' : 'skewer',
          side,
          [pin.attacker, pin.front, pin.back],
          pin.absolute ? 0.7 : 0.45,
          { absolute: pin.absolute },
        ),
      )
    }

    for (const trapped of findTrappedPieces(chess, enemy)) {
      out.push(motif('trappedPiece', side, [trapped], 0.6))
    }

    for (const overloaded of findOverloadedPieces(chess, enemy)) {
      out.push(
        motif('overloadedPiece', side, [overloaded.square, ...overloaded.duties], 0.55, {
          duties: overloaded.duties,
        }),
      )
    }

    if (detectBackRankWeakness(chess, enemy)) {
      const king = kingSquare(chess, enemy)
      if (king) out.push(motif('backRankMate', side, [king], 0.5))
    }

    if (detectSmotheredMate(chess, enemy)) {
      const king = kingSquare(chess, enemy)
      if (king) out.push(motif('smotheredMate', side, [king], 0.65))
    }

    if (tacticsOnly) continue

    // ── Stratégie ───────────────────────────────────────────────────────────
    const pawns = analysePawns(chess, side)
    for (const passer of pawns.passed) {
      const protectedByPawn = chess
        .attackers(passer, side)
        .some((sq) => chess.get(sq)?.type === 'p')
      const advance = relativeRank(passer, side)
      out.push(
        motif(
          protectedByPawn ? 'protectedPassedPawn' : 'passedPawn',
          side,
          [passer],
          0.25 + advance * 0.09,
          { rank: advance + 1 },
        ),
      )
    }
    for (const iso of pawns.isolated) out.push(motif('isolatedPawn', enemy, [iso], 0.25))
    for (const dbl of pawns.doubled) out.push(motif('doubledPawns', enemy, [dbl], 0.2))
    for (const back of pawns.backward) out.push(motif('backwardPawn', enemy, [back], 0.25))

    for (const outpost of findOutposts(chess, side)) {
      out.push(motif('outpost', side, [outpost], 0.4))
    }

    const rooks = findActiveRooks(chess, side)
    for (const rook of rooks.openFile) out.push(motif('openFile', side, [rook], 0.35))
    for (const rook of rooks.semiOpen) out.push(motif('semiOpenFile', side, [rook], 0.22))
    for (const rook of rooks.seventh) out.push(motif('seventhRank', side, [rook], 0.5))

    if (hasBishopPair(chess, side) && !hasBishopPair(chess, enemy)) {
      const bishops = listPieces(chess, side)
        .filter((p) => p.type === 'b')
        .map((p) => p.square)
      out.push(motif('bishopPair', side, bishops, 0.3))
    }

    for (const bad of findBadBishops(chess, side)) {
      out.push(motif('badBishop', enemy, [bad], 0.25))
    }

    for (const fianchetto of findFianchetto(chess, side)) {
      out.push(motif('fianchetto', side, [fianchetto], 0.2))
    }

    const safety = analyseKingSafety(chess, enemy)
    if (safety.square && safety.score < 35) {
      out.push(
        motif('exposedKing', side, [safety.square, ...safety.attackedSquares], 0.65, {
          score: safety.score,
        }),
      )
    } else if (safety.square && safety.score > 75) {
      out.push(motif('kingSafety', enemy, [safety.square], 0.2, { score: safety.score }))
    }

    const undeveloped = undevelopedPieces(chess, enemy)
    if (undeveloped.length >= 2 && chess.moveNumber() >= 8) {
      out.push(motif('development', side, undeveloped, 0.3 + undeveloped.length * 0.08))
    }

    const centre = centreControl(chess, side) - centreControl(chess, enemy)
    if (centre >= 6) {
      out.push(motif('centreControl', side, ['d4', 'd5', 'e4', 'e5'], 0.25 + centre / 40))
    }

    // ── Finale ──────────────────────────────────────────────────────────────
    if (hasOpposition(chess, side)) {
      const king = kingSquare(chess, side)
      if (king) out.push(motif('opposition', side, [king], 0.45))
    }
    for (const rook of findRookBehindPasser(chess, side)) {
      out.push(motif('rookBehindPasser', side, [rook], 0.35))
    }
    if (hasWrongRookBishop(chess, side)) {
      const bishop = listPieces(chess, side).find((p) => p.type === 'b')
      if (bishop) out.push(motif('wrongBishop', enemy, [bishop.square], 0.5))
    }
  }

  if (hasOppositeCastling(chess)) {
    const wk = kingSquare(chess, 'w')
    const bk = kingSquare(chess, 'b')
    if (wk && bk) out.push(motif('oppositeCastling', 'w', [wk, bk], 0.3))
  }

  return dedupe(out)
    .filter((m) => m.weight >= minWeight)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
}

// ─────────────────────────────────────────────────────────────────────────────
//  Agrégation : motifs d'un coup
// ─────────────────────────────────────────────────────────────────────────────

export interface MoveContext {
  fenBefore: string
  fenAfter: string
  from: Square
  to: Square
  piece: PieceSymbol
  captured?: PieceSymbol
  promotion?: PieceSymbol
  isEnPassant: boolean
  color: Color
}

/**
 * Ce que *ce coup précis* vient de créer sur l'échiquier.
 *
 * On compare la position avant et après pour n'attribuer au coup que les motifs
 * qu'il a réellement provoqués — un clouage qui existait déjà n'est pas son
 * mérite.
 */
export function detectMoveMotifs(context: MoveContext): DetectedMotif[] {
  const before = new Chess(context.fenBefore, { skipValidation: true })
  const after = new Chess(context.fenAfter, { skipValidation: true })
  const side = context.color
  const enemy = opposite(side)
  const out: DetectedMotif[] = []

  // ── Échecs et mats ────────────────────────────────────────────────────────
  if (after.isCheckmate()) {
    const king = kingSquare(after, enemy)
    out.push(motif('mateIn1', side, king ? [context.to, king] : [context.to], 1))
    if (detectSmotheredMate(after, enemy)) {
      out.push(motif('smotheredMate', side, king ? [king] : [], 1))
    }
    if (king && relativeRank(king, enemy) === 0) {
      out.push(motif('backRankMate', side, [king], 0.9))
    }
  } else if (after.inCheck()) {
    const king = kingSquare(after, enemy)
    if (king && after.attackers(king, side).length >= 2) {
      out.push(motif('doubleCheck', side, [king, ...after.attackers(king, side)], 0.85))
    }
  }

  // Mat forcé annoncé (au-delà du mat en un).
  if (!after.isCheckmate()) {
    const forced = findForcedMate(after, 5)
    if (forced) {
      const plies = Math.ceil(forced.length / 2)
      const id: MotifId = plies <= 1 ? 'mateIn1' : plies === 2 ? 'mateIn2' : 'mateIn3'
      out.push(motif(id, side, [context.to], 0.95, { line: forced }))
    }
  }

  // ── Coups spéciaux ────────────────────────────────────────────────────────
  if (context.promotion) {
    out.push(
      motif(
        context.promotion === 'q' ? 'promotion' : 'underPromotion',
        side,
        [context.to],
        context.promotion === 'q' ? 0.8 : 0.9,
        { to: context.promotion },
      ),
    )
  }
  if (context.isEnPassant) out.push(motif('enPassant', side, [context.from, context.to], 0.5))

  // ── Sacrifice ─────────────────────────────────────────────────────────────
  // Le coup place une pièce sur une case où l'échange est perdant : soit c'est
  // une bourde, soit c'est un sacrifice — le moteur tranchera.
  const exchange = staticExchange(context.fenAfter, context.to, enemy)
  const givenUp = exchange - (context.captured ? PIECE_VALUES[context.captured] : 0)
  if (givenUp >= 150) {
    out.push(
      motif('sacrifice', side, [context.to], Math.min(1, 0.4 + givenUp / 950), {
        material: givenUp,
      }),
    )
  }

  // ── Motifs créés par le coup ──────────────────────────────────────────────
  const forksBefore = new Set(findForks(before, side).map(forkKey))
  for (const fork of findForks(after, side)) {
    if (forksBefore.has(forkKey(fork))) continue
    out.push(
      motif('fork', side, [fork.from, ...fork.targets], Math.min(1, 0.55 + fork.bestGain / 1900), {
        piece: fork.attackerType,
        targetCount: fork.targets.length,
      }),
    )
  }

  const pinsBefore = new Set(findPinsAndSkewers(before, enemy).map(pinKey))
  for (const pin of findPinsAndSkewers(after, enemy)) {
    if (pinsBefore.has(pinKey(pin))) continue
    out.push(
      motif(
        pin.kind === 'pin' ? 'pin' : 'skewer',
        side,
        [pin.attacker, pin.front, pin.back],
        pin.absolute ? 0.75 : 0.5,
        { absolute: pin.absolute },
      ),
    )
  }

  for (const discovered of findDiscoveredAttacks(after, context.from, context.to, side)) {
    out.push(
      motif(
        'discoveredAttack',
        side,
        [discovered.slider, discovered.vacated, discovered.target],
        discovered.isCheck ? 0.9 : 0.65,
        { check: discovered.isCheck },
      ),
    )
  }

  // Élimination d'un défenseur : la capture faisait tomber un défenseur clé.
  if (context.captured) {
    const wasDefending = before
      .attackers(context.to, side)
      .length
    const defendedByCaptured = listPieces(before, enemy).filter((p) =>
      before.attackers(p.square, enemy).includes(context.to),
    )
    if (defendedByCaptured.length > 0 && wasDefending > 0) {
      const nowHanging = defendedByCaptured.filter(
        (p) => staticExchange(context.fenAfter, p.square, side) > 0,
      )
      if (nowHanging.length > 0) {
        out.push(
          motif(
            'removingTheDefender',
            side,
            [context.to, ...nowHanging.map((p) => p.square)],
            0.6,
          ),
        )
      }
    }
  }

  // Pièces nouvellement en prise chez l'adversaire (menace créée par le coup).
  const hangingBefore = new Set(findHangingPieces(before, enemy).map((h) => h.square))
  for (const hanging of findHangingPieces(after, enemy)) {
    if (hangingBefore.has(hanging.square)) continue
    out.push(
      motif('hangingPiece', side, [hanging.square, ...hanging.attackedFrom], hanging.gain / 950, {
        piece: hanging.type,
        gain: hanging.gain,
        undefended: hanging.undefended,
      }),
    )
  }

  // Pièces qu'on vient soi-même de laisser en prise (la cause des gaffes).
  const ownHangingBefore = new Set(findHangingPieces(before, side).map((h) => h.square))
  for (const hanging of findHangingPieces(after, side)) {
    if (ownHangingBefore.has(hanging.square)) continue
    if (hanging.square === context.to && givenUp >= 150) continue // déjà signalé comme sacrifice
    out.push(
      motif('hangingPiece', enemy, [hanging.square, ...hanging.attackedFrom], hanging.gain / 950, {
        piece: hanging.type,
        gain: hanging.gain,
        undefended: hanging.undefended,
        ownBlunder: true,
      }),
    )
  }

  for (const trapped of findTrappedPieces(after, enemy)) {
    out.push(motif('trappedPiece', side, [trapped], 0.6))
  }

  return dedupe(out).sort((a, b) => b.weight - a.weight)
}

function forkKey(fork: Fork): string {
  return `${fork.from}:${[...fork.targets].sort().join(',')}`
}

function pinKey(pin: PinOrSkewer): string {
  return `${pin.kind}:${pin.attacker}:${pin.front}:${pin.back}`
}

/** Fusionne les doublons en gardant le poids le plus fort. */
function dedupe(motifs: DetectedMotif[]): DetectedMotif[] {
  const map = new Map<string, DetectedMotif>()
  for (const m of motifs) {
    const key = `${m.id}:${m.side}:${[...m.squares].sort().join(',')}`
    const existing = map.get(key)
    if (!existing || m.weight > existing.weight) map.set(key, m)
  }
  return [...map.values()]
}
