/**
 * Le pseudo d'un nouveau compte créé par Google.
 *
 *   GET  /api/auth/google/inscription   → { nom, suggestion } de l'identité en attente
 *   POST /api/auth/google/inscription     { pseudo, locale }
 *
 * L'identité vient de `api/auth/google/retour`, qui l'a gardée en mémoire et
 * n'en a confié au navigateur qu'une clé aléatoire (`coupparfait_google_nouveau`).
 * Le navigateur ne peut donc choisir que le pseudo, jamais l'identité Google.
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { suggestUsername } from '@coupparfait/db/auth'
import { creerCompteGoogle } from '@coupparfait/db/google'
import { avatarAuHasard } from '@/lib/avatars.ts'
import { CLES_DE_REFUS } from '@/lib/auth/refus.ts'
import { LOCALES } from '@/lib/i18n/dictionary.ts'
import { tDeLaRequete } from '@/lib/i18n/serveur.ts'
import { TEMOIN_NOUVEAU, lireAttente, oublierAttente } from '@/lib/server/google.ts'
import { ipClient } from '@/lib/server/ip.ts'
import { creerLimiteur } from '@/lib/server/limiteur.ts'
import { startSession } from '@/lib/server/session.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const tentatives = creerLimiteur(10 * 60_000, 20)

export async function GET() {
  const identite = lireAttente((await cookies()).get(TEMOIN_NOUVEAU)?.value)
  if (!identite) return NextResponse.json({ attente: false })
  // Un pseudo proposé d'après le nom, ou le début de l'adresse : on le
  // corrige plus volontiers qu'on ne l'invente.
  const source = identite.nom ?? identite.email?.split('@')[0] ?? ''
  return NextResponse.json({
    attente: true,
    nom: identite.nom,
    suggestion: source ? suggestUsername(source) : null,
  })
}

export async function POST(request: Request) {
  const t = tDeLaRequete(request)
  const magasin = await cookies()
  const cle = magasin.get(TEMOIN_NOUVEAU)?.value
  const identite = lireAttente(cle)
  if (!cle || !identite) {
    return NextResponse.json({ error: t('auth.google.expired') }, { status: 410 })
  }

  if (tentatives.depasse(ipClient(request))) {
    return NextResponse.json({ error: t('api.tooManyAttempts') }, { status: 429 })
  }

  let body: { pseudo?: unknown; locale?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: t('api.unreadable') }, { status: 400 })
  }
  const pseudo = typeof body.pseudo === 'string' ? body.pseudo.trim() : ''

  const resultat = await creerCompteGoogle({
    sub: identite.sub,
    username: pseudo,
    email: identite.email,
    avatar: avatarAuHasard(),
    locale: LOCALES.includes(String(body.locale)) ? String(body.locale) : null,
  })
  if (!resultat.ok) {
    if (resultat.error === 'googleTaken') {
      oublierAttente(cle)
      return NextResponse.json({ error: t('auth.google.alreadyUsed') }, { status: 409 })
    }
    return NextResponse.json(
      {
        error: t(CLES_DE_REFUS[resultat.error]),
        suggestion: resultat.error === 'usernameCharacters' ? suggestUsername(pseudo) : null,
      },
      { status: 400 },
    )
  }

  oublierAttente(cle)
  magasin.delete(TEMOIN_NOUVEAU)
  await startSession(resultat.user.id)
  return NextResponse.json({
    user: {
      userId: resultat.user.id,
      username: resultat.user.username,
      avatar: resultat.user.avatar,
    },
  })
}
