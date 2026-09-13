/**
 * Les parties de mes amis contre l'ordinateur.
 *
 *   GET /api/amis/parties → ce que chacun est en train de jouer, s'il joue
 *
 * ── Pourquoi une route à part ───────────────────────────────────────────────
 *
 * L'écran « Regarder » listait les salons du serveur temps réel, c'est-à-dire
 * les parties entre deux personnes. Une partie contre l'ordinateur ne passe pas
 * par là : elle se joue entièrement dans le navigateur, et le serveur temps réel
 * n'en sait rien. Un ami qui lance une partie contre la machine n'apparaissait
 * donc nulle part, et l'on concluait que la fonctionnalité était cassée.
 *
 * Elle existe pourtant côté serveur, pour une tout autre raison : la table
 * `active_games` garde la partie solo en cours de chaque compte, pour pouvoir la
 * reprendre d'un autre appareil. Elle est réécrite **à chaque coup**. Il n'y a
 * donc rien à construire — seulement à regarder ce qui est déjà là.
 *
 * ── Ce qui est exposé, et à qui ─────────────────────────────────────────────
 *
 * Uniquement aux **amis**, dans les deux sens : la relation doit être acceptée.
 * Un carnet d'adresses n'est pas un annuaire, et personne n'a accepté qu'un
 * inconnu regarde sa partie par-dessus son épaule.
 *
 * Uniquement les parties **fraîches**. Une ligne d'`active_games` survit à
 * l'abandon — c'est son rôle, elle sert à reprendre — et sans cette borne on
 * annoncerait « Laeti joue en ce moment » pour une partie laissée en plan il y a
 * trois semaines.
 *
 * Et rien d'autre que ce qu'il faut pour la montrer : les coups, le niveau de
 * l'adversaire, le camp. Aucun identifiant de compte, aucune pendule absolue.
 */

import { NextResponse } from 'next/server'
import { activeGames, getDb, inArray } from '@coupparfait/db'
import { listFriends } from '@coupparfait/db/friends'
import { botLevel } from '@coupparfait/core'
import { getCurrentUser } from '@/lib/server/session.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Au-delà, la partie n'est plus « en cours », elle est en plan.
 *
 * Vingt minutes : assez pour une partie lente où l'on réfléchit longtemps sur
 * un coup, trop peu pour une partie oubliée hier soir. On affiche de toute
 * façon l'instant du dernier coup, pour que le lecteur juge lui-même.
 */
const FRAICHEUR_MINUTES = 20

/** Une partie sans coup n'est pas une partie : c'est un écran qu'on a ouvert. */
const MINIMUM_COUPS = 1

export async function GET() {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ parties: [] })

  try {
    const amis = await listFriends(me.userId)
    if (amis.length === 0) return NextResponse.json({ parties: [] })

    const db = getDb()
    const lignes = await db
      .select()
      .from(activeGames)
      .where(
        inArray(
          activeGames.userId,
          amis.map((ami) => ami.id),
        ),
      )

    const parNom = new Map(amis.map((ami) => [ami.id, ami]))
    const limite = Date.now() - FRAICHEUR_MINUTES * 60_000

    const parties = lignes
      .map((ligne) => {
        const ami = parNom.get(ligne.userId)
        const coups = ligne.moves.split(' ').filter(Boolean)
        const etat = ligne.state as {
          level?: number
          playerColor?: 'w' | 'b'
          timeControlId?: string
          human?: boolean
        }
        return { ami, coups, etat, quand: ligne.updatedAt }
      })
      .filter(
        (entree) =>
          entree.ami != null &&
          entree.coups.length >= MINIMUM_COUPS &&
          entree.quand.getTime() >= limite,
      )
      .map((entree) => {
        const niveau = typeof entree.etat.level === 'number' ? botLevel(entree.etat.level) : null
        return {
          pseudo: entree.ami!.username,
          avatar: entree.ami!.avatar,
          coups: entree.coups,
          /** Camp de l'ami, pour orienter l'échiquier de son côté. */
          camp: entree.etat.playerColor === 'b' ? 'b' : 'w',
          adversaire: niveau
            ? { nomKey: niveau.nomKey, elo: niveau.elo, niveau: niveau.level }
            : null,
          cadence: entree.etat.timeControlId ?? null,
          /** Instant du dernier coup enregistré, en ISO. */
          dernierCoupLe: entree.quand.toISOString(),
        }
      })
      // Le coup le plus récent d'abord : c'est la partie la plus vivante.
      .sort((a, b) => b.dernierCoupLe.localeCompare(a.dernierCoupLe))

    return NextResponse.json({ parties })
  } catch (error) {
    console.error('[amis/parties]', error)
    // Une panne ici ne doit pas vider l'écran « Regarder » de ses parties en
    // direct, qui viennent d'une tout autre source.
    return NextResponse.json({ parties: [], erreur: true }, { status: 503 })
  }
}
