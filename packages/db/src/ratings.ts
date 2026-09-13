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
import { getDb, type Database } from './index.ts'
import { ratingHistory, ratings, type Rating } from './schema.ts'

export type RatingCategory =
  'bullet' | 'blitz' | 'rapid' | 'classical' | 'correspondence' | 'puzzle'

/**
 * Ce sur quoi on exécute une requête : la base, ou la transaction en cours.
 *
 * Les deux ont la même surface pour ce qu'on en fait ici. Le type de la
 * transaction est dérivé de `Database.transaction` plutôt qu'importé : c'est
 * le seul qui soit garanti d'être le bon quelle que soit la version de Drizzle.
 */
type Executeur = Database | Parameters<Parameters<Database['transaction']>[0]>[0]

/**
 * Lit un classement, en le créant au besoin.
 *
 * `verrouiller` pose un `FOR UPDATE` sur la ligne — à n'employer que dans une
 * transaction, et c'est ce que font les mises à jour ci-dessous. Sans lui,
 * deux parties du même joueur qui finissent à la même seconde lisaient toutes
 * deux le classement d'avant, et la seconde écriture effaçait la première :
 * une partie ne comptait pas, sans que rien ne le dise.
 */
export async function getRating(
  userId: string,
  category: RatingCategory,
  executeur: Executeur = getDb(),
  verrouiller = false,
): Promise<Rating> {
  const lire = () => {
    const requete = executeur
      .select()
      .from(ratings)
      .where(and(eq(ratings.userId, userId), eq(ratings.category, category)))
      .limit(1)
    return verrouiller ? requete.for('update') : requete
  }

  const existing = (await lire())[0]
  if (existing) return existing

  // Les trois classements sont écrits en clair plutôt que laissés au défaut de
  // la colonne : une base créée avant le changement de valeur de départ
  // continuerait sinon d'inscrire les nouveaux venus à 1500.
  const inserted = await executeur
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
  if (inserted[0]) return inserted[0]

  // Quelqu'un l'a créée entre notre lecture et notre écriture : on la relit,
  // verrou compris, plutôt que de raisonner sur une valeur de départ fictive.
  const relu = (await lire())[0]
  return (
    relu ?? {
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

interface ResultatAAppliquer {
  userId: string
  category: RatingCategory
  opponentRating: number
  opponentDeviation: number
  score: GameScore
  gameId?: string
}

/**
 * Applique le résultat d'une partie au classement d'un joueur.
 *
 * L'inactivité est traitée avant la partie : un joueur absent depuis des mois
 * voit son incertitude remonter, donc son classement bouger davantage. Sans
 * cela, quelqu'un qui revient après avoir beaucoup progressé mettrait des
 * dizaines de parties à rattraper son vrai niveau.
 *
 * Lecture et écriture vont dans une même transaction, la ligne verrouillée :
 * voir `getRating`.
 */
export async function applyGameResult(options: ResultatAAppliquer): Promise<RatingUpdateResult> {
  return getDb().transaction(async (tx) => {
    const current = await getRating(options.userId, options.category, tx, true)
    return appliquer(tx, current, options)
  })
}

/** Le calcul et l'écriture, à partir d'une ligne déjà lue — et verrouillée. */
async function appliquer(
  tx: Executeur,
  current: Rating,
  options: ResultatAAppliquer,
): Promise<RatingUpdateResult> {
  // Inactivité depuis la dernière partie.
  const daysIdle = Math.max(0, (Date.now() - current.updatedAt.getTime()) / (24 * 60 * 60 * 1000))
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

  await tx
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

  await tx.insert(ratingHistory).values({
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

  const whiteScore: GameScore = result === '1-0' ? 1 : result === '0-1' ? 0 : 0.5
  const blackScore: GameScore = result === '0-1' ? 1 : result === '1-0' ? 0 : 0.5

  return getDb().transaction(async (tx) => {
    // Les deux lignes verrouillées **dans un ordre fixe**. Deux parties entre
    // les mêmes joueurs qui finissent ensemble prendraient sinon les verrous
    // en croix, et PostgreSQL en tuerait une.
    const lignes = new Map<string, Rating>()
    for (const id of [whiteId, blackId].filter((x): x is string => x !== null).sort()) {
      if (!lignes.has(id)) lignes.set(id, await getRating(id, category, tx, true))
    }
    const whiteBefore = whiteId ? (lignes.get(whiteId) ?? null) : null
    const blackBefore = blackId ? (lignes.get(blackId) ?? null) : null

    const white =
      whiteId && whiteBefore && blackBefore
        ? await appliquer(tx, whiteBefore, {
            userId: whiteId,
            category,
            opponentRating: blackBefore.rating,
            opponentDeviation: blackBefore.deviation,
            score: whiteScore,
            gameId,
          })
        : null

    const black =
      blackId && blackBefore && whiteBefore
        ? await appliquer(tx, blackBefore, {
            userId: blackId,
            category,
            opponentRating: whiteBefore.rating,
            opponentDeviation: whiteBefore.deviation,
            score: blackScore,
            gameId,
          })
        : null

    return { white, black }
  })
}

/**
 * Les catégories qui se jouent, par opposition aux puzzles.
 *
 * Ce sont celles qu'un test de niveau peut amorcer : il mesure la force *en
 * partie*, sur une échelle que les puzzles n'ont pas — voir `puzzleVersPartie`
 * côté web. Le classement de puzzles, lui, se construit en résolvant des
 * puzzles, et le test refuse délibérément d'y toucher : une mesure qui déplace
 * ce qu'elle mesure n'est plus une mesure.
 */
export const CATEGORIES_DE_PARTIE: RatingCategory[] = [
  'bullet',
  'blitz',
  'rapid',
  'classical',
  'correspondence',
]

/**
 * Amorce les classements d'un joueur à partir de sa mesure d'entrée.
 *
 * **Ce que ça répare.** `CLASSEMENT_DEPART` vaut 100 pour tout le monde, avec
 * une incertitude de 350. C'est un bon choix pour qui débute vraiment, et un
 * mauvais pour qui arrive en sachant jouer : simulé sur le vrai Glicko, un
 * joueur de force 1 800 qui enchaîne ses deux premières parties classées est
 * classé **345** — il lui faut une douzaine de parties pour rejoindre son
 * niveau, et il les joue contre des adversaires qui ne lui apprennent rien.
 * Avec l'amorce, il commence à sa mesure et les mêmes deux parties l'en
 * rapprochent au lieu de l'en éloigner.
 *
 * **On n'amorce que ce qui n'a jamais servi.** La condition est `games = 0`, et
 * non l'absence de ligne : lire un classement le crée — c'est `getRating` qui
 * insère —, si bien qu'ouvrir le tableau des classements suffisait à se donner
 * une ligne à 100. Une catégorie où une seule partie a été jouée garde ce
 * qu'elle a mesuré : une partie vaut mieux qu'un test, c'est toute la hiérarchie
 * de `niveauRetenu`.
 *
 * **Aucune ligne d'historique.** `rating_history` raconte des parties ; une
 * amorce n'en est pas une, et l'y inscrire ferait apparaître une variation que
 * personne n'a jouée.
 *
 * Rend les catégories effectivement amorcées, pour que l'appelant puisse le
 * dire à l'écran plutôt que de l'affirmer.
 */
export async function amorcerClassements(
  userId: string,
  cote: number,
  rd: number,
): Promise<RatingCategory[]> {
  const depart = Math.max(CLASSEMENT_PLANCHER, Math.round(cote))
  const incertitude = Math.round(rd)

  return getDb().transaction(async (tx) => {
    const amorcees: RatingCategory[] = []
    for (const category of CATEGORIES_DE_PARTIE) {
      const actuel = await getRating(userId, category, tx, true)
      // Une seule partie jouée suffit à rendre la ligne plus crédible que le
      // test : on passe sans rien écrire.
      if (actuel.games > 0) continue

      await tx
        .update(ratings)
        .set({
          rating: depart,
          deviation: incertitude,
          elo: depart,
          // Le sommet part de la mesure lui aussi : sans quoi la page des
          // records afficherait « meilleur classement : 100 » à quelqu'un qui
          // n'est jamais descendu si bas.
          peak: depart,
          updatedAt: new Date(),
        })
        .where(and(eq(ratings.userId, userId), eq(ratings.category, category)))
      amorcees.push(category)
    }
    return amorcees
  })
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
