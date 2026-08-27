/**
 * Inscription, connexion, déconnexion.
 *
 * Une seule route pour les trois actions : elles partagent la même validation,
 * la même gestion de cookie et le même format de réponse. Trois fichiers
 * auraient surtout multiplié les occasions de diverger.
 *
 *   POST /api/auth  { action: 'signup' | 'signin' | 'signout', … }
 *   GET  /api/auth  → identité courante
 */

import { NextResponse } from 'next/server'
import { authenticate, createUser, type ValidationError } from '@coupparfait/db/auth'
import { endSession, getCurrentUser, startSession } from '@/lib/server/session.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Limitation du rythme des tentatives.
 *
 * En mémoire, donc remise à zéro à chaque redémarrage : c'est volontaire.
 * L'objectif est de ralentir une attaque par force brute, pas de tenir un
 * registre. Une plateforme auto-hébergée pour un cercle d'amis n'a pas besoin
 * de Redis pour ça.
 */
const attempts = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 12

function rateLimited(key: string): boolean {
  const now = Date.now()
  const entry = attempts.get(key)

  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > MAX_ATTEMPTS
}

/** Purge périodique, pour que la table ne grossisse pas indéfiniment. */
setInterval(
  () => {
    const now = Date.now()
    for (const [key, entry] of attempts) {
      if (entry.resetAt < now) attempts.delete(key)
    }
  },
  WINDOW_MS,
).unref?.()

const ERROR_MESSAGES: Record<ValidationError, string> = {
  invalidUsername: 'Pseudo invalide : 3 à 20 caractères alphanumériques.',
  usernameTaken: 'Ce pseudo est déjà pris.',
  weakPassword: 'Mot de passe trop court (8 caractères minimum).',
  emailTaken: 'Cette adresse est déjà utilisée.',
  invalidCredentials: 'Pseudo ou mot de passe incorrect.',
}

export async function GET() {
  const user = await getCurrentUser()
  return NextResponse.json({ user })
}

export async function POST(request: Request) {
  let body: {
    action?: string
    username?: string
    password?: string
    email?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 })
  }

  if (body.action === 'signout') {
    await endSession()
    return NextResponse.json({ ok: true })
  }

  const username = String(body.username ?? '').trim()
  const password = String(body.password ?? '')

  if (!username || !password) {
    return NextResponse.json(
      { error: 'Pseudo et mot de passe sont requis.' },
      { status: 400 },
    )
  }

  // La clé de limitation mêle l'adresse et le pseudo : bloquer sur la seule
  // adresse pénaliserait tout un foyer derrière la même connexion.
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'inconnu'

  if (rateLimited(`${ip}:${username.toLowerCase()}`)) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessaie dans quelques minutes.' },
      { status: 429 },
    )
  }

  try {
    if (body.action === 'signup') {
      const result = await createUser({
        username,
        password,
        email: body.email?.trim() || null,
      })
      if (!result.ok) {
        return NextResponse.json({ error: ERROR_MESSAGES[result.error] }, { status: 400 })
      }
      await startSession(result.user.id)
      return NextResponse.json({
        user: {
          userId: result.user.id,
          username: result.user.username,
          avatar: result.user.avatar,
          role: result.user.role,
        },
      })
    }

    if (body.action === 'signin') {
      const result = await authenticate(username, password)
      if (!result.ok) {
        return NextResponse.json({ error: ERROR_MESSAGES[result.error] }, { status: 401 })
      }
      await startSession(result.user.id)
      // Une connexion réussie remet le compteur à zéro.
      attempts.delete(`${ip}:${username.toLowerCase()}`)
      return NextResponse.json({
        user: {
          userId: result.user.id,
          username: result.user.username,
          avatar: result.user.avatar,
          role: result.user.role,
        },
      })
    }

    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
  } catch (error) {
    console.error('[auth]', error)
    return NextResponse.json(
      {
        error:
          'Le service de comptes est indisponible. Tu peux continuer à jouer sans compte.',
      },
      { status: 503 },
    )
  }
}
