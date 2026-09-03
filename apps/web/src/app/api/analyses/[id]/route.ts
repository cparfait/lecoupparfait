/**
 * Une analyse conservée, en entier.
 *
 *   GET    → les coups et les évaluations, de quoi rejouer le rapport
 *   POST   → partage ou retire le partage
 *   DELETE → l'oublie
 *
 * C'est ici, et seulement ici, qu'on rapatrie la colonne `positions` : elle
 * pèse plusieurs dizaines de kilo-octets, et la liste s'en passe très bien.
 *
 * Les deux verbes filtrent sur le propriétaire en plus de l'identifiant. Un
 * UUID est impossible à deviner, mais s'appuyer là-dessus, c'est faire d'un
 * identifiant un secret — et un identifiant finit toujours par circuler.
 */

import { NextResponse } from 'next/server'
import { and, eq, getDb, savedAnalyses } from '@coupparfait/db'
import { getCurrentUser } from '@/lib/server/session.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ analyse: null }, { status: 401 })

  const { id } = await context.params

  try {
    const database = getDb()
    const lignes = await database
      .select()
      .from(savedAnalyses)
      .where(and(eq(savedAnalyses.id, id), eq(savedAnalyses.userId, user.userId)))
      .limit(1)

    const ligne = lignes[0]
    if (!ligne) return NextResponse.json({ analyse: null }, { status: 404 })

    return NextResponse.json({
      analyse: {
        id: ligne.id,
        source: ligne.source,
        moves: ligne.moves.split(' ').filter(Boolean),
        startFen: ligne.startFen,
        positions: ligne.positions,
        depth: ligne.depth,
        lecteur: ligne.lecteur,
        partage: ligne.partage,
        // Reconstruits au format PGN : c'est ce qu'attend la relecture pour
        // nommer les joueurs et annoncer le résultat.
        headers: {
          ...(ligne.whiteName ? { White: ligne.whiteName } : {}),
          ...(ligne.blackName ? { Black: ligne.blackName } : {}),
          ...(ligne.result ? { Result: ligne.result } : {}),
          ...(ligne.playedAt ? { Date: ligne.playedAt } : {}),
          ...(ligne.eco ? { ECO: ligne.eco } : {}),
          ...(ligne.opening ? { Opening: ligne.opening } : {}),
        },
      },
    })
  } catch (error) {
    console.error('[analyses/id]', error)
    return NextResponse.json({ analyse: null }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  const { id } = await context.params

  try {
    const database = getDb()
    await database
      .delete(savedAnalyses)
      .where(and(eq(savedAnalyses.id, id), eq(savedAnalyses.userId, user.userId)))
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[analyses/id]', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

/**
 * Partage une analyse, ou retire le partage.
 *
 *   POST { partager: true }  → engendre un identifiant public et le retourne
 *   POST { partager: false } → remet la colonne à `null`
 *
 * **Le partage est un état, pas une copie.** Retirer le partage coupe le lien
 * immédiatement : celui à qui on l'avait envoyé n'a plus rien, et l'analyse ne
 * s'est dédoublée nulle part. C'est la même mécanique que les études — on la
 * copie plutôt que d'en inventer une seconde à côté.
 *
 * L'identifiant est **ré-engendré** à chaque partage. Repartager après avoir
 * retiré ne réveille donc pas l'ancien lien, qui a pu circuler.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  const { id } = await context.params
  let body: { partager?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, raison: 'corps illisible' }, { status: 400 })
  }

  const partage = body.partager === true ? identifiantPublic() : null

  try {
    const lignes = await getDb()
      .update(savedAnalyses)
      .set({ partage })
      // Le propriétaire, en plus de l'identifiant : voir l'en-tête du fichier.
      .where(and(eq(savedAnalyses.id, id), eq(savedAnalyses.userId, user.userId)))
      .returning({ partage: savedAnalyses.partage })

    if (lignes.length === 0) return NextResponse.json({ ok: false }, { status: 404 })
    return NextResponse.json({ ok: true, partage: lignes[0]!.partage })
  } catch (error) {
    console.error('[analyses/id]', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

/**
 * Identifiant de partage : douze caractères sans voyelles.
 *
 * Même alphabet que les slugs de partie et d'étude, pour la même raison —
 * aucun mot ne se forme par accident dans une adresse qu'on envoie à
 * quelqu'un. Douze caractères sur vingt-huit possibles font assez de
 * combinaisons pour qu'un lien ne se devine pas.
 */
const ALPHABET = 'bcdfghjkmnpqrstvwxyz23456789'

function identifiantPublic(): string {
  const octets = crypto.getRandomValues(new Uint8Array(12))
  return [...octets].map((octet) => ALPHABET[octet % ALPHABET.length]).join('')
}
