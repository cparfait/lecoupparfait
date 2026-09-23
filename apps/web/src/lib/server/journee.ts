/**
 * L'écriture de la journée d'un joueur connecté, en un seul endroit.
 *
 * Deux routes y écrivent : `/api/quotidien`, qui reçoit l'état complet du
 * navigateur, et `/api/puzzles`, qui note le défi du jour au moment même où la
 * position est jouée. La seconde existe parce que la première ne suffisait
 * pas : son appel partait « au passage », sans être attendu, et un téléphone
 * qu'on verrouille ou une application qu'on ferme juste après la dernière case
 * l'annulait. Le serveur croyait alors le défi à faire, et le rappel de dix-huit
 * heures partait vers quelqu'un qui l'avait déjà résolu.
 *
 * On **fusionne** toujours, quête par quête, en gardant le plus avancé : les
 * deux routes peuvent arriver dans n'importe quel ordre.
 */

import 'server-only'
import { and, dailyProgress, eq, getDb } from '@coupparfait/db'
import { xpPour } from '@/lib/daily/quetes.ts'

/** Plafonds de bon sens : ces chiffres viennent du client. */
const XP_MAX = 1000
export const SERIE_MAX = 100_000

export function fusionnerAvancement(
  serveur: Record<string, number>,
  client: Record<string, number>,
): Record<string, number> {
  const resultat = { ...serveur }
  for (const [cle, valeur] of Object.entries(client)) {
    resultat[cle] = Math.max(resultat[cle] ?? 0, valeur)
  }
  return resultat
}

export function borner(valeur: unknown, plafond: number): number {
  const nombre = Number(valeur)
  if (!Number.isFinite(nombre) || nombre < 0) return 0
  return Math.min(plafond, Math.floor(nombre))
}

/**
 * Fusionne un avancement dans la journée enregistrée, en la créant au besoin.
 *
 * Les points sont **recalculés** à partir du barème commun et de l'avancement
 * fusionné, jamais repris du client — sans quoi une journée faite sur deux
 * appareils compterait deux fois, ou pas du tout.
 */
export async function fusionnerJournee(options: {
  userId: string
  jour: string
  avancement: Record<string, number>
  serie?: number
  meilleureSerie?: number
}): Promise<void> {
  const { userId, jour, avancement } = options
  const serie = options.serie ?? 0
  const meilleureSerie = Math.max(serie, options.meilleureSerie ?? 0)

  const database = getDb()
  const existantes = await database
    .select()
    .from(dailyProgress)
    .where(and(eq(dailyProgress.userId, userId), eq(dailyProgress.day, jour)))
    .limit(1)

  const existant = existantes[0]
  const quests = existant ? fusionnerAvancement(existant.quests, avancement) : avancement
  const xp = borner(xpPour(quests), XP_MAX)

  if (existant) {
    await database
      .update(dailyProgress)
      .set({
        quests,
        xp,
        streak: Math.max(existant.streak, serie),
        bestStreak: Math.max(existant.bestStreak, meilleureSerie),
        updatedAt: new Date(),
      })
      .where(and(eq(dailyProgress.userId, userId), eq(dailyProgress.day, jour)))
  } else {
    await database.insert(dailyProgress).values({
      userId,
      day: jour,
      quests,
      xp,
      streak: serie,
      bestStreak: meilleureSerie,
    })
  }
}
