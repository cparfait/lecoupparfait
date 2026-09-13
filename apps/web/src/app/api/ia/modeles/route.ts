/**
 * Relais de la liste des modèles d'un fournisseur d'IA.
 *
 * Même rôle et mêmes garde-fous que `../chat/route.ts`, en lecture seule : le
 * navigateur ne peut pas interroger ces endpoints directement, on recopie donc
 * l'appel. La clé transite ici aussi — **rien de ce corps ne doit être
 * journalisé.**
 */

import { NextResponse } from 'next/server'
import { nettoyerEntetes, verifierCible } from '@/lib/ia/relais.ts'
import { tDeLaRequete } from '@/lib/i18n/serveur.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Lister des modèles est court : au-delà, quelque chose ne va pas. */
const DELAI_MS = 20_000

export async function POST(request: Request) {
  const t = tDeLaRequete(request)
  let charge: { providerId?: unknown; url?: unknown; headers?: unknown }
  try {
    charge = (await request.json()) as typeof charge
  } catch {
    return NextResponse.json({ error: t('api.unreadable') }, { status: 400 })
  }

  const refus = await verifierCible(charge.providerId, charge.url)
  if (refus) {
    return NextResponse.json({ error: refus.message }, { status: refus.status })
  }

  const controleur = new AbortController()
  const minuterie = setTimeout(() => controleur.abort(), DELAI_MS)

  try {
    const amont = await fetch(charge.url as string, {
      method: 'GET',
      headers: Object.fromEntries(nettoyerEntetes(charge.headers)),
      signal: controleur.signal,
    })
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
