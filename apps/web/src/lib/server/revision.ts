/**
 * Les erreurs à revoir, côté serveur : relever les fautes d'une analyse et
 * les ranger dans `mistake_reviews`.
 *
 * Deux portes y mènent, et elles appellent la même fonction :
 *
 *  - l'enregistrement d'une analyse (`POST /api/analyses`), au moment où les
 *    évaluations arrivent ;
 *  - le rattrapage (`GET /api/revoir`), pour les analyses rangées avant que
 *    cette fonction existe, ou dont le relevé a échoué.
 *
 * Le relevé lui-même est dans le cœur (`releverLesErreurs`) : ici, on ne fait
 * que lire et écrire.
 */

import { and, eq, mistakeReviews, savedAnalyses, type Database } from '@coupparfait/db'
import {
  ajouterJours,
  premiereEcheance,
  releverLesErreurs,
  type Jour,
  type PositionAnalysis,
} from '@coupparfait/core'

/**
 * Le jour du serveur, en UTC.
 *
 * Seul repli quand le navigateur n'a pas dit le sien : le calendrier se tient
 * dans le jour du joueur, que seul son navigateur connaît.
 */
export function jourDuServeur(): Jour {
  return new Date().toISOString().slice(0, 10)
}

export interface AnalyseARelever {
  id: string
  /** Coups en SAN, séparés par des espaces — la forme de la colonne. */
  moves: string
  startFen: string | null
  positions: unknown
  lecteur: string | null
}

/**
 * Relève les fautes d'une analyse, les range, et marque l'analyse comme lue.
 *
 * Une position déjà connue — la même faute dans une autre partie, ou la même
 * partie réanalysée plus profond — n'est pas réécrite : elle garde sa boîte.
 * Réanalyser ne doit pas remettre à zéro ce qu'on a déjà appris.
 *
 * Rend le nombre de fautes relevées.
 */
export async function releverEtRanger(
  database: Database,
  userId: string,
  analyse: AnalyseARelever,
): Promise<number> {
  const releve = await releverLesErreurs({
    moves: analyse.moves.split(' ').filter(Boolean),
    startFen: analyse.startFen,
    positions: (Array.isArray(analyse.positions) ? analyse.positions : []) as PositionAnalysis[],
    lecteur: analyse.lecteur === 'w' || analyse.lecteur === 'b' ? analyse.lecteur : null,
  })

  if (releve.length > 0) {
    // La veille du jour du serveur, et non le jour même : le joueur est
    // peut-être encore la veille chez lui, à l'ouest de Greenwich. Une
    // position due « aujourd'hui en UTC » ne lui serait proposée que demain.
    const { boite, echeance } = premiereEcheance(ajouterJours(jourDuServeur(), -1))
    await database
      .insert(mistakeReviews)
      .values(
        releve.map((faute) => ({
          userId,
          analysisId: analyse.id,
          ply: faute.ply,
          fen: faute.fen,
          playedSan: faute.joueSan,
          playedUci: faute.joueUci,
          bestSan: faute.meilleurSan,
          bestUci: faute.meilleurUci,
          accepted: faute.acceptes,
          quality: faute.quality,
          explanation: faute.explication,
          box: boite,
          dueOn: echeance,
        })),
      )
      .onConflictDoNothing()
  }

  await database
    .update(savedAnalyses)
    .set({ revisionsExtraites: true })
    .where(and(eq(savedAnalyses.id, analyse.id), eq(savedAnalyses.userId, userId)))

  return releve.length
}

/**
 * Combien d'analyses en retard relever à chaque affichage.
 *
 * Le relevé d'une partie prend de quelques dizaines de millisecondes à une
 * seconde ou deux pour une longue partie pleine de fautes. Tout rattraper d'un
 * coup ferait attendre la première page un temps proportionnel à l'historique ;
 * trois par passage bornent l'attente, et la page redemande tant qu'il en
 * reste.
 */
export const RATTRAPAGE_PAR_PASSAGE = 3

/**
 * Relève les analyses du joueur qui ne l'ont pas encore été.
 *
 * Rend `true` s'il en reste après ce passage. Une analyse dont le relevé lève
 * est marquée lue quand même : la reprendre à chaque visite ferait échouer
 * chaque visite.
 */
export async function rattraper(database: Database, userId: string): Promise<boolean> {
  const enRetard = await database
    .select({
      id: savedAnalyses.id,
      moves: savedAnalyses.moves,
      startFen: savedAnalyses.startFen,
      positions: savedAnalyses.positions,
      lecteur: savedAnalyses.lecteur,
    })
    .from(savedAnalyses)
    .where(and(eq(savedAnalyses.userId, userId), eq(savedAnalyses.revisionsExtraites, false)))
    .limit(RATTRAPAGE_PAR_PASSAGE + 1)

  for (const analyse of enRetard.slice(0, RATTRAPAGE_PAR_PASSAGE)) {
    try {
      await releverEtRanger(database, userId, analyse)
    } catch (error) {
      console.error('[revoir] relevé impossible', analyse.id, error)
      await database
        .update(savedAnalyses)
        .set({ revisionsExtraites: true })
        .where(and(eq(savedAnalyses.id, analyse.id), eq(savedAnalyses.userId, userId)))
    }
  }

  return enRetard.length > RATTRAPAGE_PAR_PASSAGE
}
