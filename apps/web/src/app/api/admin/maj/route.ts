/**
 * Combien d'outils ont une version plus récente publiée.
 *
 *   GET /api/admin/maj → { aMettreAJour }
 *
 * Interrogée par la pastille du compte, pour les seuls administrateurs. Elle
 * relève les versions si le dernier relevé a plus d'un jour : c'est elle qui
 * fait partir la recherche sans qu'on ait à y penser.
 */

import { NextResponse } from 'next/server'
import { getAdmin } from '@/lib/server/admin.ts'
import { compterMisesAJour } from '@/lib/server/misesAJour.ts'
import { tDeLaRequete } from '@/lib/i18n/serveur.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(requete: Request) {
  const t = tDeLaRequete(requete)
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: t('api.notFound') }, { status: 404 })
  return NextResponse.json({ aMettreAJour: await compterMisesAJour() })
}
