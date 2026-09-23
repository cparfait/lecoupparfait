/**
 * Relais de la liste des modèles d'un fournisseur d'IA.
 *
 * Même rôle et mêmes garde-fous que `../chat/route.ts`, en lecture seule : le
 * navigateur ne peut pas interroger ces endpoints directement, on recopie donc
 * l'appel. La clé transite ici aussi — **rien de ce corps ne doit être
 * journalisé.**
 */

import { NextResponse } from 'next/server'
import {
  CibleRefusee,
  estRedirection,
  nettoyerEntetes,
  relayer,
  verifierCible,
} from '@/lib/ia/relais.ts'
import { tDeLaRequete } from '@/lib/i18n/serveur.ts'
import { creerLimiteur } from '@/lib/server/limiteur.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Lister des modèles est court : au-delà, quelque chose ne va pas. */
const DELAI_MS = 20_000

/**
 * Trente listes par dix minutes et par adresse — on ne les demande qu'en
 * ouvrant les préférences. Par adresse pour la même raison que `../chat` :
 * l'assistant n'exige pas de compte.
 */
const appels = creerLimiteur(10 * 60_000, 30)

export async function POST(request: Request) {
  const t = tDeLaRequete(request)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'inconnu'
  if (appels.depasse(ip)) {
    return NextResponse.json(
      { error: t('api.tooManyRequests') },
      { status: 429, headers: { 'Retry-After': String(appels.attente(ip)) } },
    )
  }

  let charge: { providerId?: unknown; url?: unknown; headers?: unknown }
  try {
    charge = (await request.json()) as typeof charge
  } catch {
    return NextResponse.json({ error: t('api.unreadable') }, { status: 400 })
  }

  const refus = await verifierCible(charge.providerId, charge.url, t)
  if (refus) {
    return NextResponse.json({ error: refus.message }, { status: refus.status })
  }

  const controleur = new AbortController()
  const minuterie = setTimeout(() => controleur.abort(), DELAI_MS)

  try {
    const amont = await relayer(charge.url as string, {
      method: 'GET',
      entetes: nettoyerEntetes(charge.headers),
      signal: controleur.signal,
    })

    // Jamais suivie, jamais relayée : voir `../chat/route.ts`.
    if (estRedirection(amont.status)) {
      await amont.body?.cancel()
      return NextResponse.json({ error: t('prompt.relayRedirect') }, { status: 502 })
    }

    const texte = await amont.text()

    if (!amont.ok) {
      return new Response(texte || 'Le fournisseur a refusé la requête.', {
        status: amont.status,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    return new Response(texte, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  } catch (error) {
    if (error instanceof CibleRefusee) {
      return NextResponse.json({ error: t('prompt.relayPrivateNetwork') }, { status: 400 })
    }
    const interrompu = error instanceof Error && error.name === 'AbortError'
    return NextResponse.json(
      {
        error: interrompu
          ? 'Le fournisseur a mis trop de temps à répondre.'
          : 'Le fournisseur est injoignable.',
      },
      { status: 504 },
    )
  } finally {
    clearTimeout(minuterie)
  }
}
