/**
 * Ménage périodique de la base.
 *
 * Ce qui grossit sans jamais rétrécir : les sessions expirées et le cache
 * d'évaluations. `pruneSessions` existait mais n'était appelée que depuis un
 * bouton de l'écran d'administration — c'est-à-dire seulement si quelqu'un y
 * pensait, sur une plateforme dont l'intérêt est précisément qu'on n'ait pas à
 * y penser. Le cache d'évaluations, lui, n'était purgé nulle part : l'écran de
 * santé se contentait de le mesurer grossir.
 *
 * Le serveur temps réel appelle ces fonctions une fois par jour : c'est le seul
 * processus toujours vivant, et il a déjà une boucle.
 */

import { lt } from 'drizzle-orm'
import { getDb } from './index.ts'
import { evaluations } from './schema.ts'

/**
 * Efface les évaluations plus vieilles que `joursDeConservation`.
 *
 * **Ce qu'on accepte de perdre.** La table n'a qu'un `created_at`, pas de date
 * de dernière lecture : une position consultée chaque semaine depuis six mois
 * sera effacée comme les autres, et recalculée une fois. C'est un choix — la
 * seule alternative serait d'écrire dans la table **à chaque lecture**, ce qui
 * transformerait un cache en source d'écritures et coûterait bien plus cher
 * que le recalcul trimestriel qu'on évite.
 *
 * `position_evals` n'est pas touchée, et ne doit pas l'être : c'est un import
 * statique du jeu de données de Lichess, pas un cache. La purger reviendrait à
 * jeter des données qu'aucun calcul local ne saurait reproduire.
 */
export async function pruneEvaluations(joursDeConservation = 90): Promise<number> {
  const limite = new Date(Date.now() - joursDeConservation * 24 * 60 * 60 * 1000)
  const supprimees = await getDb()
    .delete(evaluations)
    .where(lt(evaluations.createdAt, limite))
    // La table n'a pas de colonne `id` : sa clé est (epd, profondeur).
    .returning({ epd: evaluations.epd })
  return supprimees.length
}
