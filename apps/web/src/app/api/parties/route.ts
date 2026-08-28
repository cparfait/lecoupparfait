/**
 * Parties en cours.
 *
 *   GET /api/parties → celles qu'on peut regarder
 *
 * La liste vit dans le serveur temps réel, seul à savoir quels salons sont
 * ouverts : elle n'est nulle part en base, une partie n'y étant écrite qu'une
 * fois terminée. On relaie donc, plutôt que de dupliquer un état qui changerait
 * à chaque coup.
 */

import { NextResponse } from 'next/server'
/**
 * Adresse du serveur temps réel.
 *
 * Même résolution que pour l'analyse : le nom de service Docker n'existe qu'en
 * production, et l'imposer en développement casserait tout appel local.
 */
const SERVER_URL =
  (process.env.NODE_ENV === 'production' ? process.env.INTERNAL_SERVER_URL : undefined) ??
  process.env.NEXT_PUBLIC_SERVER_URL ??
  'http://localhost:3001'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Au-delà, c'est que le serveur temps réel a un problème : mieux vaut le dire. */
const TIMEOUT_MS = 2500

export async function GET() {
  try {
    const response = await fetch(`${SERVER_URL}/parties`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(String(response.status))
    return NextResponse.json(await response.json())
  } catch {
    // Une liste vide et un serveur injoignable ne se ressemblent pas : sans
    // cette distinction, on croirait que personne ne joue.
    return NextResponse.json(
      { error: 'Le serveur de parties est injoignable.', games: [] },
      { status: 503 },
    )
  }
}
