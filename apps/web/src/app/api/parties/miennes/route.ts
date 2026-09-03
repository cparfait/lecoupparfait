/**
 * Les parties en direct où l'on est assis.
 *
 *   GET  /api/parties/miennes         → celles qui m'attendent
 *   POST /api/parties/miennes  { slug } → quitter celle-là
 *
 * Même relais que `/api/parties`, à une différence près : il faut savoir qui
 * demande. Le jeton de session est lu ici, côté serveur, à partir du cookie —
 * il ne passe jamais par le navigateur, qui ne pourrait de toute façon pas le
 * lire.
 *
 * Une partie en cours ne vit qu'en mémoire du serveur temps réel : elle n'est
 * écrite en base qu'une fois finie. C'est donc lui, et lui seul, qui sait
 * qu'un salon nous attend quelque part.
 */

import { NextResponse } from 'next/server'
import { getSessionToken } from '@/lib/server/session.ts'

const SERVER_URL =
  (process.env.NODE_ENV === 'production' ? process.env.INTERNAL_SERVER_URL : undefined) ??
  process.env.NEXT_PUBLIC_SERVER_URL ??
  'http://localhost:3001'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Le serveur temps réel répond en mémoire : au-delà, c'est qu'il ne va pas bien. */
const TIMEOUT_MS = 2500

export async function GET() {
  const token = await getSessionToken()
  // Sans compte, aucune partie ne peut nous être rattachée : ce n'est pas une
  // erreur, c'est le cas ordinaire d'un visiteur.
  if (!token) return NextResponse.json({ games: [] })

  try {
    const response = await fetch(`${SERVER_URL}/parties/miennes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(String(response.status))
    return NextResponse.json(await response.json())
  } catch {
    // Serveur temps réel éteint : il n'y a alors aucune partie en cours, et
    // l'accueil n'a rien à annoncer. On ne crie pas pour autant — le reste de
    // la plateforme fonctionne sans lui.
    return NextResponse.json({ games: [] })
  }
}

export async function POST(request: Request) {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })
  }

  let body: { slug?: string }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 })
  }

  const slug = String(body.slug ?? '').slice(0, 12)
  if (!slug) return NextResponse.json({ error: 'Partie manquante.' }, { status: 400 })

  try {
    const response = await fetch(`${SERVER_URL}/parties/quitter`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, slug }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    })
    return NextResponse.json(await response.json(), { status: response.status })
  } catch {
    return NextResponse.json({ error: 'Le serveur de parties est injoignable.' }, { status: 503 })
  }
}
