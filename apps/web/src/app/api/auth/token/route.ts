/**
 * Jeton de session pour le serveur temps réel.
 *
 * Le cookie de session est `HttpOnly` : le JavaScript de la page ne peut pas le
 * lire, ce qui est exactement le but. Mais le serveur Socket.IO, potentiellement
 * sur un autre sous-domaine, a besoin de savoir qui se connecte.
 *
 * Cette route sert d'intermédiaire : elle est appelée par la page elle-même
 * (donc avec le cookie), et renvoie le jeton pour qu'il soit transmis à la
 * poignée de main WebSocket. Le jeton ne quitte jamais l'origine de
 * l'application.
 */

import { NextResponse } from 'next/server'
import { getSessionToken } from '@/lib/server/session.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const token = await getSessionToken()
  return NextResponse.json(
    { token },
    {
      headers: {
        // Ce jeton ne doit jamais être mis en cache, ni par le navigateur ni
        // par un mandataire intermédiaire.
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      },
    },
  )
}
