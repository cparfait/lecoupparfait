/**
 * Salons de partie en direct, entre deux vies du serveur.
 *
 * Le serveur temps réel gardait ses salons dans une `Map` et n'écrivait une
 * partie qu'une fois **finie**. Tout ce qui interrompait le processus —
 * redéploiement, plantage, `docker compose up -d --build` — emportait donc
 * toutes les parties en cours, et les joueurs retrouvaient un salon vide.
 *
 * Trois fonctions suffisent : écrire l'instantané, relire ceux qui valent la
 * peine d'être repris, oublier celui qui vient de se terminer. Aucune ne
 * lève : une base indisponible dégrade la reprise, elle n'interrompt pas une
 * partie en cours.
 */

import { and, desc, gt, eq, lt, notInArray } from 'drizzle-orm'
import { getDb } from './index.ts'
import { games, liveGames } from './schema.ts'

/**
 * Écrit l'instantané d'un salon.
 *
 * Appelée après chaque coup accepté. Une écriture par coup est négligeable —
 * quelques centaines d'octets, une ligne remplacée — et l'appelant ne l'attend
 * pas : le coup part au client d'abord.
 */
export async function enregistrerSalon(
  slug: string,
  salon: Record<string, unknown>,
): Promise<void> {
  try {
    await getDb()
      .insert(liveGames)
      .values({ slug, salon, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: liveGames.slug,
        set: { salon, updatedAt: new Date() },
      })
  } catch (error) {
    console.warn('[salons] instantané non écrit :', error)
  }
}

/**
 * Les salons qui méritent d'être repris au démarrage.
 *
 * Deux heures par défaut. Au-delà, personne ne revient : la pendule d'une
 * partie chronométrée est de toute façon tombée, et une partie sans pendule
 * abandonnée depuis deux heures n'attend plus personne. Ce sont ces lignes-là
 * que la purge de la reprise efface.
 */
export async function salonsAReprendre(
  ageMaxMs = 2 * 60 * 60 * 1000,
): Promise<Array<{ slug: string; salon: Record<string, unknown>; updatedAt: Date }>> {
  try {
    return await getDb()
      .select()
      .from(liveGames)
      .where(gt(liveGames.updatedAt, new Date(Date.now() - ageMaxMs)))
      .orderBy(desc(liveGames.updatedAt))
  } catch (error) {
    console.warn('[salons] reprise impossible :', error)
    return []
  }
}

/** Oublie un salon : la partie est finie, elle vit dans `games` désormais. */
export async function oublierSalon(slug: string): Promise<void> {
  try {
    await getDb().delete(liveGames).where(eq(liveGames.slug, slug))
  } catch (error) {
    console.warn('[salons] ligne non supprimée :', error)
  }
}

/**
 * Ce lien a-t-il déjà servi à une partie terminée ?
 *
 * Un identifiant de salon est un lien qu'on s'envoie, et rien n'empêchait de
 * le rouvrir une fois la partie finie : le serveur créait un salon neuf sous
 * le même nom, et la seconde partie venait écraser la première en base. Le
 * serveur demande donc ici avant d'ouvrir un salon qu'il n'a pas en mémoire.
 *
 * Une partie **en cours** en base ne bloque pas : c'est le cas d'une
 * correspondance, qui ne passe pas par le temps réel, et de rien d'autre.
 * Une base muette répond « non » : on préfère jouer et rater ce garde-fou
 * plutôt que refuser tout le monde.
 */
export async function slugDejaServi(slug: string): Promise<boolean> {
  try {
    const lignes = await getDb()
      .select({ id: games.id })
      .from(games)
      .where(and(eq(games.slug, slug), notInArray(games.status, ['waiting', 'playing'])))
      .limit(1)
    return lignes.length > 0
  } catch (error) {
    console.warn('[salons] vérification du lien impossible :', error)
    return false
  }
}

/**
 * Efface les salons trop vieux pour être repris.
 *
 * Sans elle, un salon qu'aucun démarrage ne reprend plus resterait pour
 * toujours : la ligne n'est supprimée qu'à la fin de la partie, et cette
 * partie-là ne finira jamais.
 */
export async function purgerSalonsPerimes(ageMaxMs = 2 * 60 * 60 * 1000): Promise<number> {
  try {
    const supprimes = await getDb()
      .delete(liveGames)
      // `lt()` et non un fragment `sql` brut : le fragment liait la date sans
      // en dire le type, et le pilote la refusait à l'exécution — invisible au
      // typage, visible seulement contre une vraie base.
      .where(lt(liveGames.updatedAt, new Date(Date.now() - ageMaxMs)))
      .returning({ slug: liveGames.slug })
    return supprimes.length
  } catch (error) {
    console.warn('[salons] purge impossible :', error)
    return 0
  }
}
