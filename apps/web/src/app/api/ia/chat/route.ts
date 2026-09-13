/**
 * Relais de conversation vers le fournisseur d'IA de l'utilisateur.
 *
 * Le navigateur ne peut pas appeler ces API directement — aucune n'autorise le
 * partage de ressources entre origines sur son endpoint de conversation. Cette
 * route recopie donc la requête, et rien d'autre : elle ne connaît pas le
 * format des fournisseurs, ne lit pas les réponses, ne garde rien.
 *
 * ⚠️ **Ne journalise jamais le corps ni les en-têtes de cette route.** La clé
 * d'API de l'utilisateur y transite. Un `console.log` ajouté ici pour déboguer
 * écrirait des clés en clair dans les journaux du serveur, et personne ne s'en
 * apercevrait. En cas d'erreur, on ne remonte que le code HTTP et le texte
 * renvoyé par le fournisseur.
 *
 * Les garde-fous — origine autorisée, refus des adresses privées — sont dans
 * `lib/ia/relais.ts`, avec l'explication de ce qu'ils empêchent.
 */

import { NextResponse } from 'next/server'
import { nettoyerEntetes, verifierCible } from '@/lib/ia/relais.ts'
import { tDeLaRequete } from '@/lib/i18n/serveur.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Au-delà, la requête n'est pas une question d'échecs mais un abus. */
const TAILLE_MAX = 256 * 1024

/** Un fournisseur qui n'a pas répondu en deux minutes ne répondra pas. */
const DELAI_MS = 120_000

export async function POST(request: Request) {
  const t = tDeLaRequete(request)
  const brut = await request.text()
  if (brut.length > TAILLE_MAX) {
    return NextResponse.json({ error: t('api.requestTooLarge') }, { status: 413 })
  }

  let charge: { providerId?: unknown; url?: unknown; headers?: unknown; body?: unknown }
  try {
    charge = JSON.parse(brut) as typeof charge
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
    const amont = await fetch(charge.url as string, {
      method: 'POST',
      headers: Object.fromEntries(nettoyerEntetes(charge.headers)),
      body: JSON.stringify(charge.body ?? {}),
      signal: controleur.signal,
    })

    if (!amont.ok) {
      // On relaie le texte du fournisseur tel quel : c'est lui qui sait dire si
      // la clé est refusée, le crédit épuisé ou le modèle inconnu.
      const texte = await amont.text()
      clearTimeout(minuterie)
      return new Response(texte || 'Le fournisseur a refusé la requête.', {
        status: amont.status,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    // Réponse en flux : on recopie les octets sans les interpréter. C'est le
    // client qui sait découper le format propre à chaque fournisseur.
    //
    // La minuterie n'est volontairement pas annulée ici : sur un flux, elle
    // cesse d'être un délai d'attente pour devenir une durée maximale. Une
    // réponse qui s'écoule encore au bout de deux minutes est une réponse qui
    // ne s'arrêtera pas.
    const typeContenu = amont.headers.get('content-type') ?? ''
    const enFlux = typeContenu.includes('event-stream') || typeContenu.includes('x-ndjson')
    if (enFlux && amont.body) {
      return new Response(amont.body, {
        headers: {
          'Content-Type': typeContenu,
          'Cache-Control': 'no-cache, no-transform',
          'X-Accel-Buffering': 'no',
        },
      })
    }

    const texte = await amont.text()
    clearTimeout(minuterie)
    return new Response(texte, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  } catch (error) {
    clearTimeout(minuterie)
    const interrompu = error instanceof Error && error.name === 'AbortError'
    return NextResponse.json(
      {
        error: interrompu
          ? 'Le fournisseur a mis trop de temps à répondre.'
          : 'Le fournisseur est injoignable.',
      },
      { status: 504 },
    )
  }
}
