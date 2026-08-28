/**
 * Ce que le serveur sait faire.
 *
 *   GET /api/sante → { maia: boolean }
 *
 * Sert à n'offrir que ce qui est réellement installé : proposer un adversaire
 * Maia sur une installation qui n'a ni Lc0 ni les poids donnerait une partie
 * bloquée au premier coup, sans que personne comprenne pourquoi.
 *
 * Distinct de `/api/health`, qui répond à « le service est-il debout ? ». Ici
 * la question est « qu'est-ce qui est disponible ? », et la réponse doit rester
 * bon marché : elle est demandée à chaque ouverture de l'écran de jeu.
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const revalidate = 60

const SERVER_URL =
  (process.env.NODE_ENV === 'production' ? process.env.INTERNAL_SERVER_URL : undefined) ??
  process.env.NEXT_PUBLIC_SERVER_URL ??
  'http://localhost:3001'

export async function GET() {
  try {
    const response = await fetch(`${SERVER_URL}/health`, {
      signal: AbortSignal.timeout(2000),
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(String(response.status))
    const data: { maia?: boolean } = await response.json()
    return NextResponse.json({ maia: data.maia === true })
  } catch {
    // Serveur injoignable : on n'offre rien plutôt que de promettre.
    return NextResponse.json({ maia: false })
  }
}
