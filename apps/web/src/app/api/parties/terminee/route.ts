/**
 * Enregistre une partie jouée dans le navigateur.
 *
 *   POST /api/parties/terminee
 *
 * Les parties entre amis passent par le serveur temps réel, qui les écrit
 * lui-même (`apps/server/src/persistence.ts`). Celles contre l'ordinateur, non :
 * elles se déroulent entièrement chez le joueur, et n'existaient donc nulle
 * part une fois terminées — « Parties récentes » restait vide pour quelqu'un
 * qui avait joué toute la soirée. La table `games` prévoyait pourtant `mode` et
 * `botLevel` depuis le début.
 *
 * **Jamais classé.** `rated` est forcé à faux et aucun classement n'est
 * touché : sinon il suffirait de battre le bot le plus faible en boucle. C'est
 * la même règle que côté serveur, appliquée ici parce que c'est ici qu'on écrit.
 *
 * On fait confiance au client sur les coups, et il n'y a pas de moyen de faire
 * autrement — la partie s'est jouée chez lui. Le risque se limite à un
 * historique fantaisiste dans son propre profil, puisque rien de tout cela
 * n'alimente le classement.
 */

import { NextResponse } from 'next/server'
import { Chess } from 'chess.js'
import { games, getDb } from '@coupparfait/db'
import { getCurrentUser } from '@/lib/server/session.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_COUPS = 400
const ALPHABET = 'abcdefghijkmnopqrstuvwxyz23456789'
const MODES = new Set(['computer', 'local'])
const RESULTATS = new Set(['1-0', '0-1', '1/2-1/2'])

function slug(): string {
  const octets = crypto.getRandomValues(new Uint8Array(8))
  return [...octets].map((octet) => ALPHABET[octet % ALPHABET.length]).join('')
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  // Silencieux : la plateforme s'utilise sans compte, et l'appel part à chaque
  // fin de partie sans que le joueur l'ait demandé.
  if (!user) return NextResponse.json({ ok: false, raison: 'anonyme' })

  let body: {
    mode?: string
    moves?: string[]
    pgn?: string
    result?: string
    status?: string
    playerColor?: string
    opponentName?: string
    botLevel?: number
    initialTime?: number
    increment?: number
    startFen?: string | null
    eco?: string | null
    opening?: string | null
    startedAt?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, raison: 'corps illisible' }, { status: 400 })
  }

  const moves = Array.isArray(body.moves) ? body.moves.filter((m) => typeof m === 'string') : []
  if (moves.length === 0 || moves.length > MAX_COUPS) {
    return NextResponse.json({ ok: false, raison: 'coups invalides' }, { status: 400 })
  }
  if (!MODES.has(String(body.mode))) {
    return NextResponse.json({ ok: false, raison: 'mode inconnu' }, { status: 400 })
  }
  const result = RESULTATS.has(String(body.result)) ? String(body.result) : null
  if (!result) {
    // Une partie abandonnée en cours de route se reprend, elle ne s'archive pas :
    // c'est le rôle d'`active_games`.
    return NextResponse.json({ ok: false, raison: 'partie non terminée' }, { status: 400 })
  }

  // Les coups doivent former une partie légale. Ce n'est pas de la défiance
  // envers le joueur mais envers le code : une liste tronquée ou décalée
  // produirait un PGN qui ne se rejoue pas, et l'on ne s'en apercevrait qu'en
  // essayant de l'analyser, des semaines plus tard.
  const echiquier = new Chess(body.startFen || undefined)
  for (const san of moves) {
    try {
      echiquier.move(san)
    } catch {
      return NextResponse.json({ ok: false, raison: 'coups illégaux' }, { status: 400 })
    }
  }

  const camp = body.playerColor === 'b' ? 'b' : 'w'
  const adversaire = (body.opponentName ?? 'Ordinateur').slice(0, 40)
  const debut = body.startedAt ? new Date(body.startedAt) : new Date()

  try {
    await getDb()
      .insert(games)
      .values({
        slug: slug(),
        mode: String(body.mode),
        speed: cadence(body.initialTime ?? 0),
        // Jamais, sous aucune condition : voir l'en-tête du fichier.
        rated: false,
        whiteId: camp === 'w' ? user.userId : null,
        blackId: camp === 'b' ? user.userId : null,
        whiteName: camp === 'w' ? user.username : adversaire,
        blackName: camp === 'b' ? user.username : adversaire,
        botLevel: typeof body.botLevel === 'number' ? Math.round(body.botLevel) : null,
        initialTime: Math.max(0, Math.round(body.initialTime ?? 0)),
        increment: Math.max(0, Math.round(body.increment ?? 0)),
        startFen: body.startFen || null,
        moves: moves.join(' '),
        pgn: typeof body.pgn === 'string' ? body.pgn : null,
        status: (body.status ?? 'finished').slice(0, 24),
        result,
        winner: result === '1-0' ? 'w' : result === '0-1' ? 'b' : null,
        eco: body.eco?.slice(0, 3) ?? null,
        opening: body.opening?.slice(0, 120) ?? null,
        startedAt: Number.isNaN(debut.getTime()) ? new Date() : debut,
        endedAt: new Date(),
      })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[parties/terminee]', error)
    // La partie a été jouée et son résultat affiché : ne pas savoir la ranger
    // ne doit pas ressembler à un incident.
    return NextResponse.json({ ok: false, raison: 'enregistrement impossible' })
  }
}

/**
 * Catégorie de cadence, pour la colonne `speed`.
 *
 * Mêmes seuils que le serveur temps réel. Elle ne sert ici qu'à l'affichage,
 * puisque rien de ce qu'on écrit n'est classé.
 */
function cadence(initialTime: number): string {
  if (initialTime === 0) return 'correspondence'
  if (initialTime < 180) return 'bullet'
  if (initialTime < 600) return 'blitz'
  if (initialTime < 1800) return 'rapid'
  return 'classical'
}
