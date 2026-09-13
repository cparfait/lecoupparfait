/**
 * Annonce une partie classée contre l'ordinateur, avant de la jouer.
 *
 *   POST /api/parties/classee
 *
 * **Pourquoi une annonce.** Tout se décidait à l'arrivée : le navigateur
 * envoyait ses coups avec son niveau d'adversaire, sa cadence et son camp, et
 * `POST /api/parties/terminee` n'avait rien à quoi les comparer. On pouvait
 * donc choisir après coup la catégorie où l'on gagnait des points, le niveau
 * qu'on prétendait avoir battu, et envoyer deux fois la même partie.
 *
 * Le classement ne se prouve toujours pas — la partie se joue chez le joueur,
 * et nous n'en verrons jamais que le récit. Mais ce récit doit maintenant
 * coller à ce qui a été annoncé **avant** que le résultat ne soit connu, et
 * c'est une contrainte qu'aucune vérification de fin de partie ne pouvait
 * donner.
 *
 * **Une seule annonce à la fois.** La ligne est remplacée : commencer une
 * deuxième partie classée abandonne la première, qui ne comptera pour rien.
 * C'est le choix le plus doux — une coupure de réseau ou un onglet fermé ne
 * doivent pas valoir une défaite —, et il laisse ouverte la seule échappatoire
 * qui reste : jouer une partie classée, la perdre, et ne rien envoyer. Aucune
 * cote n'est gagnée ainsi, seule une défaite est évitée.
 */

import { NextResponse } from 'next/server'
import { botLevel } from '@coupparfait/core'
import { getDb, ratedIntents } from '@coupparfait/db'
import { getCurrentUser } from '@/lib/server/session.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Trois heures de réflexion par camp : au-delà, la valeur est fantaisiste. */
const TEMPS_MAX = 3 * 60 * 60

export async function POST(request: Request) {
  const user = await getCurrentUser()
  // Silencieux comme l'archivage : une partie classée demandée sans compte est
  // une case cochée avant de se connecter, pas un incident.
  if (!user) return NextResponse.json({ ok: false, raison: 'anonyme' })

  let corps: {
    botLevel?: number
    playerColor?: string
    initialTime?: number
    increment?: number
  }
  try {
    corps = await request.json()
  } catch {
    return NextResponse.json({ ok: false, raison: 'corps illisible' }, { status: 400 })
  }

  const niveau = typeof corps.botLevel === 'number' ? Math.round(corps.botLevel) : null
  if (niveau === null || niveau < 1) {
    return NextResponse.json({ ok: false, raison: 'adversaire sans classement' }, { status: 400 })
  }

  const borne = (valeur: unknown) =>
    typeof valeur === 'number' && Number.isFinite(valeur)
      ? Math.min(TEMPS_MAX, Math.max(0, Math.round(valeur)))
      : 0

  try {
    const valeurs = {
      userId: user.userId,
      // Le niveau du barème, comme dans `games` : l'annonce et la partie
      // doivent se comparer sur la même échelle, sans quoi un client qui
      // annonce 900 et termine à 900 se retrouverait cohérent avec lui-même.
      botLevel: botLevel(niveau).level,
      initialTime: borne(corps.initialTime),
      increment: borne(corps.increment),
      playerColor: corps.playerColor === 'b' ? 'b' : 'w',
      openedAt: new Date(),
    }

    await getDb()
      .insert(ratedIntents)
      .values(valeurs)
      .onConflictDoUpdate({ target: ratedIntents.userId, set: valeurs })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[parties/classee]', error)
    // Sans annonce, la partie se jouera et s'archivera — elle ne sera
    // simplement pas classée. Le dire ici ne servirait qu'à inquiéter avant le
    // premier coup ; `terminee` le dira à la fin, avec sa raison.
    return NextResponse.json({ ok: false, raison: 'annonce impossible' })
  }
}
