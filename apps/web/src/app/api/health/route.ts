/**
 * Sonde de santé.
 *
 * Utilisée par Docker et par Nginx Proxy Manager. Elle distingue trois états :
 *
 *  - `ok`       tout fonctionne ;
 *  - `degraded` la base ou le moteur manquent, mais l'application reste
 *               utilisable — on peut jouer contre l'ordinateur et apprendre
 *               sans base de données ;
 *  - `error`    l'application elle-même est cassée.
 *
 * Le mode dégradé renvoie volontairement un code 200 : un conteneur qui répond
 * partiellement ne doit pas être redémarré en boucle par l'orchestrateur.
 */

import { NextResponse } from 'next/server'
import { isDatabaseReachable } from '@coupparfait/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: Record<string, 'ok' | 'ko'> = {}

  checks.database = (await isDatabaseReachable()) ? 'ok' : 'ko'
  checks.engine = (await pingEngineServer()) ? 'ok' : 'ko'

  const allOk = Object.values(checks).every((value) => value === 'ok')

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      checks,
      version: process.env.npm_package_version ?? '0.1.0',
      uptimeSeconds: Math.round(process.uptime()),
    },
    { status: 200 },
  )
}

async function pingEngineServer(): Promise<boolean> {
  const url = process.env.INTERNAL_SERVER_URL ?? process.env.NEXT_PUBLIC_SERVER_URL
  if (!url) return false
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2500)
    const response = await fetch(`${url}/health`, { signal: controller.signal })
    clearTimeout(timeout)
    return response.ok
  } catch {
    return false
  }
}
