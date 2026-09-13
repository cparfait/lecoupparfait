/**
 * Boîte aux lettres de développement.
 *
 *   GET    /api/dev/courriels   → les messages capturés
 *   DELETE /api/dev/courriels   → vide la boîte
 *
 * Elle n'existe **qu'en développement**. Exposer en production la liste des
 * courriels envoyés reviendrait à publier les adresses des inscrits, et à
 * livrer d'avance tout jeton qu'un message finirait par contenir.
 */

import { NextResponse } from 'next/server'
import { clearMailbox, readMailbox } from '@/lib/server/mailer.ts'
import { tDeLaRequete } from '@/lib/i18n/serveur.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Le verrou.
 *
 * Vérifié à chaque requête plutôt qu'au chargement du module : une
 * construction faite avec `NODE_ENV` mal posé ne doit pas figer une route
 * ouverte dans l'image livrée.
 */
function forbidden(t: ReturnType<typeof tDeLaRequete>): NextResponse | null {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: t('api.unavailable') }, { status: 404 })
  }
  return null
}

export async function GET(request: Request) {
  const refus = forbidden(tDeLaRequete(request))
  if (refus) return refus
  return NextResponse.json({ mails: await readMailbox() })
}

export async function DELETE(request: Request) {
  const refus = forbidden(tDeLaRequete(request))
  if (refus) return refus
  await clearMailbox()
  return NextResponse.json({ ok: true })
}
