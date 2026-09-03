/**
 * Le journal des actes d'administration.
 *
 *   GET /api/admin/journal?action=&auteur=&avant=
 *
 * **Lecture seule, sans exception.** Il n'y a ici ni `DELETE` ni `POST` : un
 * journal qu'on peut effacer depuis l'écran qu'il surveille ne prouve rien.
 * Purger d'anciennes lignes reste possible en SQL, avec la trace que laisse un
 * accès à la base — c'est-à-dire à un tout autre niveau de délibération qu'un
 * bouton.
 *
 * La pagination se fait par **curseur** et non par numéro de page : le journal
 * grossit par le haut, et une page 2 numérotée décalerait d'une ligne à chaque
 * nouvel acte, montrant deux fois la même et jamais la suivante.
 */

import { NextResponse } from 'next/server'
import { adminAudit, and, desc, eq, getDb, lt, sql } from '@coupparfait/db'
import { getAdmin } from '@/lib/server/admin.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAR_PAGE = 40

export async function GET(request: Request) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const parametres = new URL(request.url).searchParams
  const action = parametres.get('action')?.trim()
  const auteur = parametres.get('auteur')?.trim()
  const avant = parametres.get('avant')?.trim()

  try {
    const base = getDb()

    const filtres = [
      action ? eq(adminAudit.action, action) : undefined,
      auteur ? eq(adminAudit.actorName, auteur) : undefined,
      // Le curseur est l'horodatage de la dernière ligne déjà reçue.
      avant && !Number.isNaN(Date.parse(avant))
        ? lt(adminAudit.createdAt, new Date(avant))
        : undefined,
    ].filter((filtre) => filtre !== undefined)

    const lignes = await base
      .select()
      .from(adminAudit)
      .where(filtres.length > 0 ? and(...filtres) : sql`true`)
      .orderBy(desc(adminAudit.createdAt))
      .limit(PAR_PAGE + 1)

    // On demande une ligne de plus que la page pour savoir s'il y a une suite,
    // sans avoir à compter le journal entier à chaque défilement.
    const suite = lignes.length > PAR_PAGE
    const page = suite ? lignes.slice(0, PAR_PAGE) : lignes

    // Les valeurs proposées aux filtres viennent du journal lui-même : lister
    // les actions possibles en dur les ferait mentir dès qu'on en ajoute une.
    const [actions, auteurs] = await Promise.all([
      base
        .selectDistinct({ valeur: adminAudit.action })
        .from(adminAudit)
        .orderBy(adminAudit.action),
      base
        .selectDistinct({ valeur: adminAudit.actorName })
        .from(adminAudit)
        .orderBy(adminAudit.actorName),
    ])

    return NextResponse.json({
      lignes: page.map((ligne) => ({
        id: ligne.id,
        auteur: ligne.actorName,
        action: ligne.action,
        cible: ligne.targetKind,
        cibleNom: ligne.targetLabel,
        detail: ligne.detail,
        quand: ligne.createdAt.toISOString(),
      })),
      curseur: suite ? (page.at(-1)?.createdAt.toISOString() ?? null) : null,
      actions: actions.map((ligne) => ligne.valeur),
      auteurs: auteurs.map((ligne) => ligne.valeur),
    })
  } catch (error) {
    console.error('[admin/journal]', error)
    return NextResponse.json({ error: 'Lecture impossible.' }, { status: 503 })
  }
}
