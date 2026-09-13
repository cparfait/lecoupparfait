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
import { avatarAuHasard, isKnownAvatar } from '@/lib/avatars.ts'
import { courrielDisponible, resetMail, sendMail, verificationMail } from '@/lib/server/mailer.ts'
import { estAdministrateur } from '@/lib/server/admin.ts'
import { creerLimiteur } from '@/lib/server/limiteur.ts'
import { endSession, getCurrentUser, startSession } from '@/lib/server/session.ts'
import { tDeLaRequete } from '@/lib/i18n/serveur.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Limitation du rythme des tentatives : douze par dix minutes.
 *
 * Le mécanisme lui-même vit dans `lib/server/limiteur.ts`, avec ses raisons.
 */
const tentatives = creerLimiteur(10 * 60 * 1000, 12)

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

  // `courriel` accompagne la réponse même sans session, et c'est le cas qui
  // compte : l'écran de connexion est anonyme par nature, et c'est lui qui
  // porte le lien « Mot de passe oublié ? ». Sans acheminement, ce lien mène à
  // un formulaire qui promet un message qui ne partira pas — on le masque.
  //
  // Ce n'est pas un renseignement sensible : que le serveur sache ou non
  // envoyer un courriel se déduit de toute façon en essayant.
  const courriel = courrielDisponible()

  if (!user) return NextResponse.json({ user: null, courriel })

  // L'état de l'adresse n'accompagne que sa propre identité : la fiche
  // publique d'un joueur ne doit jamais laisser voir son adresse, ni même
  // qu'il en a une.
  const email = await emailStatus(user.userId)

  // `admin` sert à décider si l'en-tête montre la porte de l'administration.
  // Il ne dit rien à personne d'autre : la réponse ne concerne que soi, et un
  // visiteur ordinaire reçoit `false` — jamais la liste de ceux qui l'ont.
  //
  // Ce drapeau n'autorise rien. Chaque route d'administration revérifie de son
  // côté et répond 404 : un champ JSON se retouche depuis la console du
  // navigateur, et l'on ferait apparaître un menu, pas un droit.
  return NextResponse.json({ user, email, courriel, admin: estAdministrateur(user) })
}

export async function POST(request: Request) {
  const t = tDeLaRequete(request)
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
    return NextResponse.json({ error: t('api.unreadable') }, { status: 400 })
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
    return NextResponse.json({
      ok: true,
      username: result.username,
      alreadyDone: result.alreadyDone,
    })
  }

  // Demande de réinitialisation. La réponse est **toujours la même**, que
  // l'adresse existe, qu'elle soit inconnue ou non confirmée : autrement, ce
  // formulaire devient un moyen de savoir qui est inscrit.
  if (body.action === 'forgotPassword') {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'inconnu'
    if (tentatives.depasse(`oubli:${ip}`)) {
      return NextResponse.json({ error: t('api.tooManyRequests') }, { status: 429 })
    }

    const demande = await startPasswordReset(String(body.email ?? ''))
    if (demande) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin
      await sendMail({
        ...resetMail(demande.username, appUrl, demande.token, t),
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
    if (!me) return NextResponse.json({ error: t('api.signInRequired') }, { status: 401 })

    const status = await emailStatus(me.userId)
    if (!status.email) {
      return NextResponse.json({ error: t('api.noAddressOnFile') }, { status: 400 })
    }
    if (status.verified) return NextResponse.json({ ok: true, alreadyDone: true })

    // Sans acheminement, le lien ne partirait pas et l'interface annoncerait
    // « Envoyé ». On refuse plutôt que de mentir — même règle que pour la
    // récupération de mot de passe.
    if (!courrielDisponible()) {
      return NextResponse.json({ error: t('api.noMailYet') }, { status: 503 })
    }

    // Même limitation que les tentatives de connexion : un bouton « renvoyer »
    // sans garde-fou est une machine à expédier du courrier chez autrui.
    const address =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'inconnu'
    if (tentatives.depasse(`renvoi:${address}:${me.username.toLowerCase()}`)) {
      return NextResponse.json({ error: t('api.tooManyResends') }, { status: 429 })
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
    if (!me) return NextResponse.json({ error: t('api.signInRequired') }, { status: 401 })
    if (!isKnownAvatar(body.avatar)) {
      return NextResponse.json({ error: t('api.unknownAvatar') }, { status: 400 })
    }
    await getDb().update(users).set({ avatar: body.avatar }).where(eq(users.id, me.userId))
    return NextResponse.json({ ok: true, avatar: body.avatar })
  }

  const username = String(body.username ?? '').trim()
  const password = String(body.password ?? '')

  if (!username || !password) {
    return NextResponse.json({ error: t('api.nameAndPasswordRequired') }, { status: 400 })
  }

  // La clé de limitation mêle l'adresse et le pseudo : bloquer sur la seule
  // adresse pénaliserait tout un foyer derrière la même connexion.
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'inconnu'

  if (tentatives.depasse(`${ip}:${username.toLowerCase()}`)) {
    return NextResponse.json({ error: t('api.tooManyAttempts') }, { status: 429 })
  }

  try {
    if (body.action === 'signup') {
      const result = await createUser({
        username,
        password,
        email: body.email?.trim() || null,
        // Un avatar tiré au sort plutôt que le pion de tout le monde : voir
        // `avatarAuHasard`. Il reste changeable d'un clic depuis le profil.
        avatar: avatarAuHasard(),
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

      /*
        Aucun courriel de confirmation à l'inscription.

        Il partait automatiquement dès qu'une adresse était saisie. Le principe
        était juste — l'inscription n'attendait pas le courriel, la session
        s'ouvrait quand même — mais il supposait une messagerie qui fonctionne.
        Sans acheminement, on promettait un message qui ne partait pas, à
        quelqu'un qui venait de s'inscrire et qui n'avait rien demandé.

        La confirmation devient donc **volontaire** : l'adresse est enregistrée,
        et le profil propose de la confirmer quand on le souhaite — bouton déjà
        présent, action `resendVerification`. C'est aussi plus honnête sur ce
        qu'elle sert : rien, tant qu'on n'a pas perdu son mot de passe.

        Rien à rétablir le jour où la messagerie marchera : le même bouton
        enverra le même lien, simplement il arrivera.
      */

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
      tentatives.oublie(`${ip}:${username.toLowerCase()}`)
      return NextResponse.json({
        user: {
          userId: result.user.id,
          username: result.user.username,
          avatar: result.user.avatar,
          role: result.user.role,
        },
      })
    }

    return NextResponse.json({ error: t('api.unknownAction') }, { status: 400 })
  } catch (error) {
    console.error('[auth]', error)
    return NextResponse.json(
      {
        error: t('api.accountsDown'),
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
  await sendMail({
    ...verificationMail(username, appUrl, token, tDeLaRequete(request)),
    to: address,
  })
}
