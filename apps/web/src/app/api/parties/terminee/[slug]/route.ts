/**
 * Efface une partie de son historique.
 *
 *   DELETE /api/parties/terminee/[slug]
 *
 * On ne supprime que les parties où l'on figure, et **seulement celles qui ne
 * sont pas classées**. La distinction n'est pas administrative : une partie
 * classée a modifié le classement de quelqu'un d'autre, et l'effacer d'un côté
 * laisserait de l'autre un écart de points sans partie pour l'expliquer. Les
 * parties contre l'ordinateur, elles, n'engagent personne.
 *
 * La suppression emporte l'analyse liée — `game_analyses` est en cascade.
 * L'analyse conservée séparément dans `saved_analyses` survit, elle : c'est un
 * autre objet, avec sa propre corbeille, et quelqu'un peut vouloir garder
 * l'étude d'une partie dont il ne veut plus la trace.
 */

import { NextResponse } from 'next/server'
import { and, eq, games, getDb, sql } from '@coupparfait/db'
import { getCurrentUser } from '@/lib/server/session.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  const { slug } = await context.params

  try {
    const supprimees = await getDb()
      .delete(games)
      .where(
        and(
          eq(games.slug, slug),
          eq(games.rated, false),
          sql`(${games.whiteId} = ${user.userId} or ${games.blackId} = ${user.userId})`,
        ),
      )
      .returning({ slug: games.slug })

    if (supprimees.length === 0) {
      // Trois cas indiscernables — partie absente, partie d'un autre, partie
      // classée — et c'est voulu : distinguer « elle n'existe pas » de « elle
      // ne t'appartient pas » renseignerait sur ce que jouent les autres.
      return NextResponse.json({ ok: false, raison: 'introuvable' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[parties/terminee]', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
