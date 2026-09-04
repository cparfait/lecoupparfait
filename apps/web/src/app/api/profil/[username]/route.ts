/**
 * Profil public d'un joueur.
 *
 *   GET /api/profil/<pseudo>
 *
 * Ne renvoie **que** ce qui est public : pseudo, classements, statistiques,
 * parties récentes. Jamais l'adresse e-mail, jamais les sessions, jamais la
 * date de dernière connexion à la minute près — un profil de plateforme de jeu
 * n'a pas à révéler les habitudes de quelqu'un.
 */

import { NextResponse } from 'next/server'
import {
  desc,
  eq,
  gameAnalyses,
  games,
  getDb,
  ratingHistory,
  ratings,
  sql,
  users,
} from '@coupparfait/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ username: string }> }) {
  const { username } = await context.params

  try {
    const database = getDb()

    const rows = await database
      .select({
        id: users.id,
        username: users.username,
        avatar: users.avatar,
        bio: users.bio,
        countryCode: users.countryCode,
        createdAt: users.createdAt,
        disabled: users.disabled,
      })
      .from(users)
      .where(eq(users.usernameLower, username.toLowerCase()))
      .limit(1)

    const user = rows[0]
    if (!user || user.disabled) {
      return NextResponse.json({ error: 'Joueur introuvable.' }, { status: 404 })
    }

    const [allRatings, recentGames, history] = await Promise.all([
      database.select().from(ratings).where(eq(ratings.userId, user.id)),

      database
        .select({
          slug: games.slug,
          speed: games.speed,
          rated: games.rated,
          whiteName: games.whiteName,
          blackName: games.blackName,
          whiteId: games.whiteId,
          blackId: games.blackId,
          result: games.result,
          status: games.status,
          eco: games.eco,
          opening: games.opening,
          moves: games.moves,
          // Deux colonnes seulement de la table d'analyse : le rapport complet
          // pèse plusieurs centaines de kilo-octets par partie, et on n'en a
          // besoin que dans l'écran d'analyse.
          accuracyWhite: gameAnalyses.accuracyWhite,
          accuracyBlack: gameAnalyses.accuracyBlack,
          whiteRatingDelta: games.whiteRatingDelta,
          blackRatingDelta: games.blackRatingDelta,
          createdAt: games.createdAt,
        })
        .from(games)
        // Jointure externe : une partie non analysée reste dans la liste, sans
        // précision. C'est le cas de la plupart d'entre elles.
        .leftJoin(gameAnalyses, eq(gameAnalyses.gameId, games.id))
        .where(sql`${games.whiteId} = ${user.id} or ${games.blackId} = ${user.id}`)
        .orderBy(desc(games.createdAt))
        // Vingt suffisaient tant que rien n'était enregistré. Maintenant que
        // les parties contre l'ordinateur y figurent, vingt, c'est une soirée :
        // l'historique se serait vidé plus vite qu'il ne se remplit. La borne
        // ne protège plus que la taille de la réponse.
        .limit(500),

      database
        .select({
          category: ratingHistory.category,
          rating: ratingHistory.rating,
          createdAt: ratingHistory.createdAt,
        })
        .from(ratingHistory)
        .where(eq(ratingHistory.userId, user.id))
        .orderBy(desc(ratingHistory.createdAt))
        .limit(120),
    ])

    return NextResponse.json({
      user: {
        username: user.username,
        avatar: user.avatar,
        bio: user.bio,
        countryCode: user.countryCode,
        // Seul le mois d'inscription est exposé : la date exacte n'apporte rien.
        memberSince: user.createdAt.toISOString().slice(0, 7),
      },
      ratings: allRatings
        .filter((rating) => rating.games > 0)
        .map((rating) => ({
          category: rating.category,
          rating: rating.rating,
          deviation: rating.deviation,
          provisional: rating.deviation > 110,
          elo: rating.elo,
          games: rating.games,
          wins: rating.wins,
          losses: rating.losses,
          draws: rating.draws,
          peak: rating.peak,
        })),
      games: recentGames.map((game) => {
        const playedWhite = game.whiteId === user.id
        const outcome =
          game.result === '1/2-1/2'
            ? 'draw'
            : (game.result === '1-0') === playedWhite
              ? 'win'
              : 'loss'
        return {
          slug: game.slug,
          speed: game.speed,
          rated: game.rated,
          colour: playedWhite ? 'w' : 'b',
          opponent: playedWhite ? game.blackName : game.whiteName,
          /*
            L'adversaire a-t-il un compte ?

            Le nom seul ne le dit pas : « Cavale » est une personnalité de
            l'ordinateur, « cparfait » un joueur. La liste des parties rend
            maintenant le nom cliquable vers son profil, et il fallait donc
            savoir lesquels mènent quelque part — un lien vers le profil d'un
            robot n'aurait annoncé qu'un « joueur introuvable ».
          */
          opponentIsMember: (playedWhite ? game.blackId : game.whiteId) !== null,
          outcome,
          status: game.status,
          eco: game.eco,
          opening: game.opening,
          moveCount: game.moves ? game.moves.split(' ').length : 0,
          ratingDelta: playedWhite ? game.whiteRatingDelta : game.blackRatingDelta,
          // Précision du joueur consulté, si la partie a été analysée. La
          // colonne existait depuis le début sans jamais être lue : le chiffre
          // le plus parlant d'une partie ne se voyait que dans l'écran
          // d'analyse, jamais dans la liste où l'on cherche sa progression.
          accuracy: playedWhite ? game.accuracyWhite : game.accuracyBlack,
          playedAt: game.createdAt.toISOString(),
        }
      }),
      // Renvoyée du plus ancien au plus récent : c'est le sens de lecture d'une
      // courbe de progression.
      history: history.reverse().map((entry) => ({
        category: entry.category,
        rating: entry.rating,
        at: entry.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('[profil]', error)
    return NextResponse.json({ error: 'Le service de profils est indisponible.' }, { status: 503 })
  }
}
