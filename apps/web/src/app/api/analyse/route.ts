/**
 * Passerelle vers le serveur d'analyse.
 *
 * Le navigateur ne parle jamais directement au serveur Stockfish : il passe par
 * ici. Cela évite d'exposer le service d'analyse sur Internet, et permet de
 * fixer des limites — profondeur, longueur de partie — au même endroit pour
 * tout le monde.
 *
 * Quand le serveur d'analyse est absent, la réponse le dit explicitement :
 * l'interface bascule alors sur le moteur WebAssembly du navigateur, moins
 * puissant mais toujours disponible.
 */

import { NextResponse } from 'next/server'
import { entetesDeRelais } from '@/lib/server/passerelle.ts'
import { getSessionToken } from '@/lib/server/session.ts'
import { tDeLaRequete } from '@/lib/i18n/serveur.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Adresse du serveur d'analyse.
 *
 * `INTERNAL_SERVER_URL` désigne le service dans le réseau Docker — un nom
 * d'hôte qui n'existe qu'en production. On ne le considère donc qu'en
 * production : sinon un `.env` recopié depuis l'exemple ferait échouer en
 * silence tous les appels faits depuis le rendu serveur.
 */
const SERVER_URL =
  (process.env.NODE_ENV === 'production' ? process.env.INTERNAL_SERVER_URL : undefined) ??
  process.env.NEXT_PUBLIC_SERVER_URL ??
  'http://localhost:3001'

export async function POST(request: Request) {
  const t = tDeLaRequete(request)
  let body: {
    fen?: string
    moves?: string[]
    depth?: number
    multiPv?: number
    mode?: 'position' | 'game'
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: t('api.unreadable') }, { status: 400 })
  }

  // Plafonds appliqués côté serveur : le client ne peut pas les contourner.
  const depth = Math.max(6, Math.min(28, Number(body.depth ?? 18)))
  const multiPv = Math.max(1, Math.min(5, Number(body.multiPv ?? 1)))

  const isGame = body.mode === 'game' || Array.isArray(body.moves)

  if (isGame && (!Array.isArray(body.moves) || body.moves.length === 0)) {
    return NextResponse.json({ error: t('api.noMoveToAnalyse') }, { status: 400 })
  }
  if (isGame && body.moves!.length > 300) {
    return NextResponse.json({ error: t('api.gameTooLongAnalysis') }, { status: 400 })
  }
  if (!isGame && !body.fen) {
    return NextResponse.json({ error: t('api.fenRequired') }, { status: 400 })
  }

  try {
    const controller = new AbortController()
    // Une analyse de partie peut durer ; on laisse cinq minutes, et le flux
    // maintient la connexion vivante entre-temps.
    const timeout = setTimeout(() => controller.abort(), isGame ? 300_000 : 60_000)

    // Le jeton sert à la priorité : un joueur connecté passe devant un appel
    // anonyme. Il ne quitte pas le réseau interne, et la route est déjà
    // `force-dynamic`. Pour l'adresse, voir `entetesDeRelais`.
    const token = (await getSessionToken()) ?? undefined

    const upstream = await fetch(`${SERVER_URL}${isGame ? '/analyse/partie' : '/analyse'}`, {
      method: 'POST',
      headers: entetesDeRelais(request),
      body: JSON.stringify(
        isGame
          ? { moves: body.moves, depth, multiPv, token }
          : { fen: body.fen, depth, multiPv, token },
      ),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!upstream.ok) {
      const text = await upstream.text()
      return NextResponse.json(
        { error: text || t('api.analysisRefused') },
        { status: upstream.status },
      )
    }

    // L'analyse de partie arrive en flux : on le relaie tel quel pour que la
    // progression s'affiche coup par coup plutôt qu'en une fois à la fin.
    if (isGame && upstream.body) {
      return new Response(upstream.body, {
        headers: {
          'Content-Type': 'application/x-ndjson; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'X-Accel-Buffering': 'no',
        },
      })
    }

    return NextResponse.json(await upstream.json())
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError'
    return NextResponse.json(
      {
        error: aborted ? t('api.analysisTimeout') : t('api.analysisUnreachable'),
        fallbackToClient: true,
      },
      { status: 503 },
    )
  }
}
