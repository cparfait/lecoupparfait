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
import { eq, getDb, users } from '@coupparfait/db'
import {
  authenticate,
  createUser,
  emailStatus,
  resetPassword,
  startEmailVerification,
  startPasswordReset,
  suggestUsername,
  verifyEmail,
  type ValidationError,
} from '@coupparfait/db/auth'
import { isKnownAvatar } from '@/lib/avatars.ts'
import { resetMail, sendMail, verificationMail } from '@/lib/server/mailer.ts'
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
  usernameTooShort: 'Pseudo trop court : trois caractères au minimum.',
  usernameTooLong: 'Pseudo trop long : vingt caractères au maximum.',
  // Le pseudo sert d'adresse au profil : le dire explique la restriction au
  // lieu de la faire subir.
  usernameCharacters:
    'Un pseudo n’accepte ni espace ni accent : il sert d’adresse à ton profil. Lettres, chiffres, tiret et souligné uniquement.',
  usernameTaken: 'Ce pseudo est déjà pris.',
  weakPassword: 'Mot de passe trop court (8 caractères minimum).',
  emailTaken: 'Cette adresse est déjà utilisée.',
  invalidCredentials: 'Pseudo ou mot de passe incorrect.',
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ user: null })

  // L'état de l'adresse n'accompagne que sa propre identité : la fiche
  // publique d'un joueur ne doit jamais laisser voir son adresse, ni même
  // qu'il en a une.
  const email = await emailStatus(user.userId)
  return NextResponse.json({ user, email })
}

export async function POST(request: Request) {
  let body: {
    action?: string
    username?: string
    password?: string
    email?: string
    avatar?: string
    token?: string
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

  // La confirmation ne demande pas de session : on clique le lien depuis sa
  // messagerie, souvent sur un autre appareil que celui de l'inscription.
  if (body.action === 'verifyEmail') {
    const result = await verifyEmail(String(body.token ?? ''))
    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            result.reason === 'expired'
              ? 'Ce lien a expiré. Demande-en un nouveau depuis ton profil.'
              : 'Ce lien ne correspond à rien. Il a peut-être déjà servi.',
        },
        { status: 400 },
      )
    }
    return NextResponse.json({ ok: true, username: result.username, alreadyDone: result.alreadyDone })
  }

  // Demande de réinitialisation. La réponse est **toujours la même**, que
  // l'adresse existe, qu'elle soit inconnue ou non confirmée : autrement, ce
  // formulaire devient un moyen de savoir qui est inscrit.
  if (body.action === 'forgotPassword') {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'inconnu'
    if (rateLimited(`oubli:${ip}`)) {
      return NextResponse.json(
        { error: 'Trop de demandes. Réessaie dans quelques minutes.' },
        { status: 429 },
      )
    }

    const demande = await startPasswordReset(String(body.email ?? ''))
    if (demande) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin
      await sendMail({
        ...resetMail(demande.username, appUrl, demande.token),
        to: demande.email,
      })
    }
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'resetPassword') {
    const result = await resetPassword(String(body.token ?? ''), String(body.password ?? ''))
    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            result.reason === 'weakPassword'
              ? ERROR_MESSAGES.weakPassword
              : 'Ce lien a expiré ou ne correspond à rien. Demande-en un nouveau.',
        },
        { status: 400 },
      )
    }
    return NextResponse.json({ ok: true, username: result.username })
  }

  if (body.action === 'resendVerification') {
    const me = await getCurrentUser()
    if (!me) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })

    const status = await emailStatus(me.userId)
    if (!status.email) {
      return NextResponse.json({ error: 'Aucune adresse enregistrée.' }, { status: 400 })
    }
    if (status.verified) return NextResponse.json({ ok: true, alreadyDone: true })

    // Même limitation que les tentatives de connexion : un bouton « renvoyer »
    // sans garde-fou est une machine à expédier du courrier chez autrui.
    const address =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'inconnu'
    if (rateLimited(`renvoi:${address}:${me.username.toLowerCase()}`)) {
      return NextResponse.json(
        { error: 'Trop de renvois. Réessaie dans quelques minutes.' },
        { status: 429 },
      )
    }

    await sendVerification(me.userId, me.username, status.email, request)
    return NextResponse.json({ ok: true })
  }

  // Changer d'avatar ne demande pas de mot de passe : c'est un choix
  // d'affichage, pas une opération sensible. On vérifie en revanche que la
  // valeur fait partie du jeu proposé — la colonne accepte deux cents
  // caractères, ce qui laisserait passer bien autre chose qu'un émoji.
  if (body.action === 'avatar') {
    const me = await getCurrentUser()
    if (!me) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })
    if (!isKnownAvatar(body.avatar)) {
      return NextResponse.json({ error: 'Avatar inconnu.' }, { status: 400 })
    }
    await getDb().update(users).set({ avatar: body.avatar }).where(eq(users.id, me.userId))
    return NextResponse.json({ ok: true, avatar: body.avatar })
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
        // Refuser sans proposer oblige à retâtonner : on joint le pseudo le
        // plus proche qui serait accepté, quand il y en a un.
        return NextResponse.json(
          {
            error: ERROR_MESSAGES[result.error],
            suggestion: result.error === 'usernameCharacters' ? suggestUsername(username) : null,
          },
          { status: 400 },
        )
      }
      await startSession(result.user.id)

      // Le courriel ne conditionne pas l'inscription : elle est déjà faite, la
      // session déjà ouverte. Une messagerie en panne ne doit pas empêcher
      // quelqu'un d'entrer — l'adresse restera simplement non confirmée.
      const address = body.email?.trim()
      if (address) {
        void sendVerification(result.user.id, result.user.username, address, request).catch(
          (error: unknown) => {
            console.error('[courriel] confirmation non envoyée :', error)
          },
        )
      }

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

/**
 * Ouvre une demande de confirmation et expédie le lien.
 *
 * L'adresse publique vient de la configuration quand elle existe : derrière un
 * proxy, l'origine de la requête est celle du conteneur, et le lien reçu par
 * courriel mènerait à `http://web:3000` — injoignable depuis une boîte mail.
 */
async function sendVerification(
  userId: string,
  username: string,
  address: string,
  request: Request,
): Promise<void> {
  const token = await startEmailVerification(userId)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin
  await sendMail({ ...verificationMail(username, appUrl, token), to: address })
}
