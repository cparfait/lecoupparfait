/**
 * Mise à jour des classements après une partie.
 *
 * Le classement officiel est le **Glicko-2** : il est plus juste qu'un Elo
 * simple parce qu'il tient compte de l'incertitude. Un nouveau joueur qui bat
 * un joueur établi gagne beaucoup ; un joueur établi qui bat un inconnu au
 * classement flou gagne peu.
 *
 * L'Elo classique est calculé en parallèle et affiché à côté. Ce n'est pas de
 * la redondance : c'est le seul système qu'un débutant peut recalculer à la
 * main, et comprendre d'où vient son score fait partie de l'apprentissage.
 */

import { and, eq } from 'drizzle-orm'
import {
  CLASSEMENT_DEPART,
  CLASSEMENT_PLANCHER,
  decayGlicko,
  updateElo,
  updateGlicko,
  type GameScore,
  type GlickoRating,
} from '@coupparfait/core'
import { getDb } from './index.ts'
import { ratingHistory, ratings, type Rating } from './schema.ts'

export type RatingCategory =
  | 'bullet'
  | 'blitz'
  | 'rapid'
  | 'classical'
  | 'correspondence'
  | 'puzzle'

/** Lit un classement, en le créant au besoin. */
export async function getRating(userId: string, category: RatingCategory): Promise<Rating> {
  const database = getDb()
  const rows = await database
    .select()
    .from(ratings)
    .where(and(eq(ratings.userId, userId), eq(ratings.category, category)))
    .limit(1)

  const existing = rows[0]
  if (existing) return existing

  // Les trois classements sont écrits en clair plutôt que laissés au défaut de
  // la colonne : une base créée avant le changement de valeur de départ
  // continuerait sinon d'inscrire les nouveaux venus à 1500.
  const inserted = await database
    .insert(ratings)
    .values({
      userId,
      category,
      rating: CLASSEMENT_DEPART,
      elo: CLASSEMENT_DEPART,
      peak: CLASSEMENT_DEPART,
    })
    .onConflictDoNothing()
    .returning()

  return (
    inserted[0] ?? {
      userId,
      category,
      rating: CLASSEMENT_DEPART,
      deviation: 350,
      volatility: 0.09,
      elo: CLASSEMENT_DEPART,
      games: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      peak: CLASSEMENT_DEPART,
      peakAt: null,
      updatedAt: new Date(),
    }
  )
}

export interface RatingUpdateResult {
  before: number
  after: number
  delta: number
  deviation: number
  eloBefore: number
  eloAfter: number
  eloDelta: number
}

/**
 * Applique le résultat d'une partie au classement d'un joueur.
 *
 * L'inactivité est traitée avant la partie : un joueur absent depuis des mois
 * voit son incertitude remonter, donc son classement bouger davantage. Sans
 * cela, quelqu'un qui revient après avoir beaucoup progressé mettrait des
 * dizaines de parties à rattraper son vrai niveau.
 */
export async function applyGameResult(options: {
  userId: string
  category: RatingCategory
  opponentRating: number
  opponentDeviation: number
  score: GameScore
  gameId?: string
}): Promise<RatingUpdateResult> {
  const database = getDb()
  const current = await getRating(options.userId, options.category)

  // Inactivité depuis la dernière partie.
  const daysIdle = Math.max(
    0,
    (Date.now() - current.updatedAt.getTime()) / (24 * 60 * 60 * 1000),
  )
  const decayed: GlickoRating = decayGlicko(
    {
      rating: current.rating,
      rd: current.deviation,
      volatility: current.volatility,
    },
    daysIdle,
  )

  const next = updateGlicko(decayed, [
    {
      rating: options.opponentRating,
      rd: options.opponentDeviation,
      score: options.score,
    },
  ])

  const elo = updateElo(current.elo, options.opponentRating, options.score, current.games)

  /*
    Les deux classements sont bornés par le bas.

    Ni Glicko-2 ni l'Elo n'ont de plancher : une série de défaites depuis la
    valeur de départ descend à zéro, puis en négatif. On borne donc la valeur
    enregistrée — le calcul de la partie suivante repartira de là, et un joueur
    posé sur le plancher remonte dès sa première victoire, son écart-type étant
    resté grand.
  */
  const classement = Math.max(CLASSEMENT_PLANCHER, next.rating)
  const eloBorne = Math.max(CLASSEMENT_PLANCHER, elo.rating)

  const wins = current.wins + (options.score === 1 ? 1 : 0)
  const losses = current.losses + (options.score === 0 ? 1 : 0)
  const draws = current.draws + (options.score === 0.5 ? 1 : 0)
  const games = current.games + 1

  const isPeak = classement > current.peak
  const now = new Date()

  await database
    .update(ratings)
    .set({
      rating: classement,
      deviation: next.rd,
      volatility: next.volatility,
      elo: eloBorne,
      games,
      wins,
      losses,
      draws,
      peak: isPeak ? classement : current.peak,
      peakAt: isPeak ? now : current.peakAt,
      updatedAt: now,
    })
    .where(and(eq(ratings.userId, options.userId), eq(ratings.category, options.category)))

  await database.insert(ratingHistory).values({
    userId: options.userId,
    category: options.category,
    rating: classement,
    deviation: next.rd,
    delta: classement - current.rating,
    gameId: options.gameId ?? null,
  })

  return {
    before: current.rating,
    after: classement,
    delta: classement - current.rating,
    deviation: next.rd,
    eloBefore: current.elo,
    // La valeur rendue est celle qu'on a écrite : annoncer « −20 » après avoir
    // enregistré un classement inchangé au plancher serait mentir à l'écran.
    eloAfter: eloBorne,
    eloDelta: eloBorne - current.elo,
  }
}

/**
 * Met à jour les deux joueurs d'une partie.
 *
 * Point important : les deux calculs partent des classements **d'avant la
 * partie**. Mettre à jour le premier joueur puis calculer le second à partir de
 * la nouvelle valeur introduirait un biais en faveur de celui traité en second.
 */
export async function applyGameToBothPlayers(options: {
  whiteId: string | null
  blackId: string | null
  category: RatingCategory
  /** Résultat du point de vue des Blancs. */
  result: '1-0' | '0-1' | '1/2-1/2'
  gameId?: string
}): Promise<{ white: RatingUpdateResult | null; black: RatingUpdateResult | null }> {
  const { whiteId, blackId, category, result, gameId } = options

  const whiteBefore = whiteId ? await getRating(whiteId, category) : null
  const blackBefore = blackId ? await getRating(blackId, category) : null

  const whiteScore: GameScore = result === '1-0' ? 1 : result === '0-1' ? 0 : 0.5
  const blackScore: GameScore = result === '0-1' ? 1 : result === '1-0' ? 0 : 0.5

  const white =
    whiteId && blackBefore
      ? await applyGameResult({
          userId: whiteId,
          category,
          opponentRating: blackBefore.rating,
          opponentDeviation: blackBefore.deviation,
          score: whiteScore,
          gameId,
        })
      : null

  const black =
    blackId && whiteBefore
      ? await applyGameResult({
          userId: blackId,
          category,
          opponentRating: whiteBefore.rating,
          opponentDeviation: whiteBefore.deviation,
          score: blackScore,
          gameId,
        })
      : null

  return { white, black }
}

/**
 * Met à jour le classement puzzles.
 *
 * Un puzzle est traité comme un adversaire dont le classement est celui du
 * puzzle : le résoudre, c'est le battre. Son écart-type est faible — un puzzle
 * a un niveau bien établi, contrairement à un joueur humain.
 */
export async function applyPuzzleResult(options: {
  userId: string
  puzzleRating: number
  puzzleDeviation: number
  solved: boolean
}): Promise<RatingUpdateResult> {
  return applyGameResult({
    userId: options.userId,
    category: 'puzzle',
    opponentRating: options.puzzleRating,
    opponentDeviation: Math.min(options.puzzleDeviation, 80),
    score: options.solved ? 1 : 0,
  })
}
