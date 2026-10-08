/**
 * La suppression d'un compte par son titulaire.
 *
 * Le Play Store l'exige de toute appli où l'on crée un compte, et c'est de
 * toute façon un droit : chacun doit pouvoir partir en emportant ce qui est à
 * lui. Mais une partie appartient à **deux** joueurs. Effacer la ligne
 * `users` emporterait en cascade les classements, et laisserait les parties
 * jouées contre d'autres sans adversaire — des points gagnés contre personne.
 *
 * On fait donc en deux temps, dans une seule transaction :
 *
 *  1. **Anonymiser ce qui doit rester**, comme le fait l'administration
 *     (`api/admin/comptes`) : le pseudo devient `joueur-xxxxxxxx`, l'adresse,
 *     le mot de passe, l'avatar, la présentation et les préférences partent,
 *     le compte est désactivé. Les parties gardent leurs coups, sous le
 *     nouveau pseudo — y compris dans les en-têtes du PGN, qui le recopiaient.
 *  2. **Effacer tout le reste**, qui n'appartient qu'à lui : progression,
 *     analyses, études, amis, défis, notifications, sessions, classement et
 *     son historique.
 *
 * Restent, sous le pseudo de remplacement : les parties et la place dans
 * les tournois déjà joués, et les notes du journal d'administration s'il en a
 * fait l'objet. La politique de confidentialité le dit.
 */

import { eq, or, sql } from 'drizzle-orm'
import { verifyPassword } from './auth.ts'
import { getDb } from './index.ts'
import {
  activeGames,
  announcementReads,
  announcements,
  botProgress,
  careerProgress,
  challenges,
  dailyProgress,
  friendships,
  games,
  lessonProgress,
  levelTests,
  mistakeReviews,
  pushSubscriptions,
  puzzleAttempts,
  ratedIntents,
  ratingHistory,
  ratings,
  savedAnalyses,
  sessions,
  studies,
  tournamentPlayers,
  users,
} from './schema.ts'

/** Remplace un nom dans un en-tête PGN (`[White "…"]`), en échappant ce que le PGN échappe. */
function enTete(couleur: 'White' | 'Black', pseudo: string) {
  return sql`regexp_replace(${games.pgn}, ${`\\[${couleur} "[^"]*"\\]`}, ${`[${couleur} "${pseudo}"]`})`
}

/**
 * Le mot de passe saisi est-il bien celui du compte ?
 *
 * Supprimer un compte se confirme par son mot de passe, même avec une session
 * ouverte : un téléphone prêté ou un ordinateur partagé ne doit pas suffire à
 * effacer des années de parties.
 */
export async function verifierMotDePasse(userId: string, motDePasse: string): Promise<boolean> {
  const lignes = await getDb()
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  const empreinte = lignes[0]?.passwordHash
  return empreinte ? verifyPassword(motDePasse, empreinte) : false
}

/**
 * Anonymise le compte et efface ce qui lui appartient. Rend le pseudo de
 * remplacement, pour le journal.
 */
export async function supprimerCompte(userId: string): Promise<string> {
  const pseudo = `joueur-${crypto.randomUUID().slice(0, 8)}`

  await getDb().transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        username: pseudo,
        usernameLower: pseudo,
        email: null,
        emailVerifiedAt: null,
        emailTokenHash: null,
        emailTokenExpiresAt: null,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        // Une empreinte qui ne correspond à aucun mot de passe : la ligne
        // existe encore pour les parties, personne ne peut plus y entrer.
        passwordHash: `supprime:${crypto.randomUUID()}`,
        avatar: '♟️',
        bio: null,
        countryCode: null,
        preferences: {},
        role: 'player',
        disabled: true,
      })
      .where(eq(users.id, userId))

    await tx
      .update(games)
      .set({ whiteName: pseudo, pgn: enTete('White', pseudo) })
      .where(eq(games.whiteId, userId))
    await tx
      .update(games)
      .set({ blackName: pseudo, pgn: enTete('Black', pseudo) })
      .where(eq(games.blackId, userId))
    // Les classements de tournoi recopient le pseudo, eux aussi.
    await tx
      .update(tournamentPlayers)
      .set({ username: pseudo })
      .where(eq(tournamentPlayers.userId, userId))

    // Les révisions d'abord : elles pointent aussi vers les analyses.
    await tx.delete(mistakeReviews).where(eq(mistakeReviews.userId, userId))
    await tx.delete(savedAnalyses).where(eq(savedAnalyses.userId, userId))
    await tx.delete(studies).where(eq(studies.ownerId, userId))
    await tx
      .delete(friendships)
      .where(or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId)))
    await tx
      .delete(challenges)
      .where(or(eq(challenges.creatorId, userId), eq(challenges.targetId, userId)))
    await tx.delete(announcements).where(eq(announcements.targetId, userId))
    await tx.delete(announcementReads).where(eq(announcementReads.userId, userId))
    await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId))
    await tx.delete(ratings).where(eq(ratings.userId, userId))
    await tx.delete(ratingHistory).where(eq(ratingHistory.userId, userId))
    await tx.delete(puzzleAttempts).where(eq(puzzleAttempts.userId, userId))
    await tx.delete(lessonProgress).where(eq(lessonProgress.userId, userId))
    await tx.delete(botProgress).where(eq(botProgress.userId, userId))
    await tx.delete(careerProgress).where(eq(careerProgress.userId, userId))
    await tx.delete(dailyProgress).where(eq(dailyProgress.userId, userId))
    await tx.delete(levelTests).where(eq(levelTests.userId, userId))
    await tx.delete(activeGames).where(eq(activeGames.userId, userId))
    await tx.delete(ratedIntents).where(eq(ratedIntents.userId, userId))
    // En dernier : jusque-là, la session prouvait encore qui demandait.
    await tx.delete(sessions).where(eq(sessions.userId, userId))
  })

  return pseudo
}
