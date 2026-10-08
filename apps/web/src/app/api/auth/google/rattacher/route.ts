/**
 * Rejoindre avec Google le compte qui a déjà son adresse.
 *
 *   POST /api/auth/google/rattacher   { motDePasse }
 *
 * Le retour de Google a trouvé un compte à cette adresse, sans pouvoir le lier
 * d'office : l'adresse n'y a pas été confirmée, ou Google n'en est pas
 * l'autorité. Il l'a gardé en attente avec l'identité Google ; le mot de passe
 * du compte prouve qu'il est bien à celui qui revient de Google. Le navigateur
 * ne désigne jamais le compte, il n'apporte que le mot de passe.
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { lierCompteGoogle } from '@coupparfait/db/google'
import { verifierMotDePasse } from '@coupparfait/db/suppression'
import { tDeLaRequete } from '@/lib/i18n/serveur.ts'
import {
  TEMOIN_NOUVEAU,
  lireAttente,
  lireRattachement,
  oublierAttente,
} from '@/lib/server/google.ts'
import { startSession } from '@/lib/server/session.ts'
import { creerLimiteur } from '@/lib/server/limiteur.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Cinq essais par quart d'heure et par compte : de quoi se tromper, pas de
 * quoi deviner — quel que soit le nombre d'identités Google qu'on y essaie.
 */
const tentatives = creerLimiteur(15 * 60_000, 5)

export async function POST(request: Request) {
  const t = tDeLaRequete(request)
  const magasin = await cookies()
  const cle = magasin.get(TEMOIN_NOUVEAU)?.value
  const identite = lireAttente(cle)
  const compte = lireRattachement(cle)
  if (!cle || !identite || !compte) {
    return NextResponse.json({ error: t('auth.google.expired') }, { status: 410 })
  }

  const essai = `rattacher:${compte.id}`
  if (tentatives.depasse(essai)) {
    return NextResponse.json(
      { error: t('api.tooManyAttempts') },
      { status: 429, headers: { 'Retry-After': String(tentatives.attente(essai)) } },
    )
  }

  let body: { motDePasse?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: t('api.unreadable') }, { status: 400 })
  }
  if (
    typeof body.motDePasse !== 'string' ||
    !(await verifierMotDePasse(compte.id, body.motDePasse))
  ) {
    return NextResponse.json({ error: t('auth.google.mergeWrongPassword') }, { status: 403 })
  }
  tentatives.oublie(essai)

  oublierAttente(cle)
  magasin.delete(TEMOIN_NOUVEAU)
  if ((await lierCompteGoogle(compte.id, identite.sub)) === 'dejaAilleurs') {
    return NextResponse.json({ error: t('auth.google.alreadyUsed') }, { status: 409 })
  }
  await startSession(compte.id)
  return NextResponse.json({ pseudo: compte.pseudo })
}
