/**
 * Enregistrement des parties terminées.
 *
 * Deux garde-fous importants :
 *
 *  - **L'échec d'enregistrement ne casse jamais la partie.** Si la base est
 *    indisponible, les joueurs ont quand même joué, vu le résultat et peuvent
 *    exporter le PGN. On journalise et on continue.
 *  - **Le classement n'est mis à jour que pour les parties classées entre deux
 *    comptes.** Une partie contre un invité ou contre l'ordinateur ne compte
 *    pas : sinon il suffirait de battre un bot de niveau 1 en boucle.
 */

import { Chess } from 'chess.js'
import { eq, games, getDb, openings } from '@coupparfait/db'
import { applyGameToBothPlayers, type RatingCategory } from '@coupparfait/db/ratings'
import type { GameRoom } from './realtime/gameRoom.ts'

/** Enregistre une partie terminée et met à jour les classements. */
export async function persistFinishedGame(room: GameRoom): Promise<void> {
  const record = room.toRecord()

  // Une partie sans coup n'a aucun intérêt : ni à conserver, ni à classer.
  if (!record.moves.trim()) return

  try {
    const database = getDb()
    const identified = await identifyOpening(record.moves.split(' '))

    const inserted = await database
      .insert(games)
      .values({
        slug: record.slug,
        mode: 'friend',
        speed: record.speed,
        rated: record.rated,
        whiteId: record.whiteId,
        blackId: record.blackId,
        whiteName: record.whiteName,
        blackName: record.blackName,
        whiteRating: record.whiteRating,
        blackRating: record.blackRating,
        initialTime: record.initialTime,
        increment: record.increment,
        moves: record.moves,
        pgn: record.pgn,
        status: record.status,
        result: record.result,
        winner: record.winner,
        eco: identified?.eco ?? null,
        opening: identified?.name ?? null,
        startedAt: record.startedAt,
        endedAt: record.endedAt,
      })
      .onConflictDoUpdate({
        target: games.slug,
        set: {
          moves: record.moves,
          pgn: record.pgn,
          status: record.status,
          result: record.result,
          winner: record.winner,
          endedAt: record.endedAt,
        },
      })
      .returning({ id: games.id })

    const gameId = inserted[0]?.id

    // ── Classement ────────────────────────────────────────────────────────
    const rateable =
      record.rated &&
      record.whiteId !== null &&
      record.blackId !== null &&
      record.result !== '*' &&
      // Une partie abandonnée au troisième coup ne dit rien du niveau.
      record.moves.split(' ').length >= 6

    if (rateable) {
      const deltas = await applyGameToBothPlayers({
        whiteId: record.whiteId,
        blackId: record.blackId,
        category: record.speed as RatingCategory,
        result: record.result as '1-0' | '0-1' | '1/2-1/2',
        gameId,
      })

      if (gameId) {
        await database
          .update(games)
          .set({
            whiteRatingDelta: deltas.white?.delta ?? null,
            blackRatingDelta: deltas.black?.delta ?? null,
          })
          .where(eq(games.id, gameId))
      }
    }
  } catch (error) {
    console.error('[persistance] la partie n’a pas pu être enregistrée :', error)
  }
}

/**
 * Identifie l'ouverture d'une partie à partir de la table `openings`.
 *
 * On remonte les positions de la plus profonde à la plus superficielle et on
 * garde la première trouvée : c'est le nom le plus précis. Une seule requête
 * suffirait avec un `IN`, mais la boucle s'arrête généralement au premier essai
 * pour les parties longues, où la théorie est dépassée depuis longtemps.
 */
async function identifyOpening(sanMoves: string[]): Promise<{ eco: string; name: string } | null> {
  try {
    const database = getDb()
    const board = new Chess()
    const epds: string[] = []

    // Le livre ne dépasse jamais 36 demi-coups.
    for (const san of sanMoves.slice(0, 36)) {
      try {
        board.move(san)
      } catch {
        break
      }
      epds.push(board.fen().split(' ').slice(0, 4).join(' '))
    }
    if (epds.length === 0) return null

    for (let i = epds.length - 1; i >= 0; i--) {
      const rows = await database
        .select({ eco: openings.eco, name: openings.nameFr })
        .from(openings)
        .where(eq(openings.epd, epds[i]!))
        .limit(1)
      const row = rows[0]
      if (row) return { eco: row.eco, name: row.name }
    }
    return null
  } catch {
    return null
  }
}
