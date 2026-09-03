/**
 * Modération des contenus, et ménage.
 *
 *   GET    /api/admin/contenus            dernières parties et analyses
 *   DELETE /api/admin/contenus            supprime une partie ou une analyse
 *   POST   /api/admin/contenus            purges d'entretien
 *
 * **La suppression d'une partie n'est pas symétrique de l'anonymisation d'un
 * compte.** Un compte anonymisé garde ses parties, parce qu'elles appartiennent
 * aussi à l'adversaire. Une partie supprimée ici disparaît pour les deux, ce
 * qui est le but : on ne supprime une partie que si son contenu pose problème,
 * et le laisser à l'un parce qu'il n'a rien fait de mal reviendrait à ne pas
 * l'avoir supprimé.
 *
 * En revanche on refuse de toucher aux parties **classées**, comme le fait déjà
 * la suppression par le joueur lui-même : elles ont bougé un classement, et les
 * effacer laisserait des points sans partie pour les expliquer.
 */

import { NextResponse } from 'next/server'
import {
  and,
  desc,
  eq,
  games,
  getDb,
  lt,
  positionEvals,
  savedAnalyses,
  sql,
  users,
} from '@coupparfait/db'
import { pruneSessions } from '@coupparfait/db/auth'
import { getAdmin } from '@/lib/server/admin.ts'
import { journaliser } from '@/lib/server/audit.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAR_PAGE = 40

export async function GET() {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  try {
    const base = getDb()
    const [parties, analyses] = await Promise.all([
      base
        .select({
          slug: games.slug,
          mode: games.mode,
          rated: games.rated,
          whiteName: games.whiteName,
          blackName: games.blackName,
          result: games.result,
          status: games.status,
          opening: games.opening,
          moves: games.moves,
          createdAt: games.createdAt,
        })
        .from(games)
        .orderBy(desc(games.createdAt))
        .limit(PAR_PAGE),

      base
        .select({
          id: savedAnalyses.id,
          whiteName: savedAnalyses.whiteName,
          blackName: savedAnalyses.blackName,
          opening: savedAnalyses.opening,
          createdAt: savedAnalyses.createdAt,
          proprietaire: users.username,
        })
        .from(savedAnalyses)
        .leftJoin(users, eq(users.id, savedAnalyses.userId))
        .orderBy(desc(savedAnalyses.createdAt))
        .limit(PAR_PAGE),
    ])

    return NextResponse.json({
      parties: parties.map((partie) => ({
        slug: partie.slug,
        mode: partie.mode,
        rated: partie.rated,
        blancs: partie.whiteName,
        noirs: partie.blackName,
        result: partie.result,
        status: partie.status,
        opening: partie.opening,
        coups: partie.moves ? partie.moves.split(' ').filter(Boolean).length : 0,
        jouee: partie.createdAt.toISOString(),
      })),
      analyses: analyses.map((analyse) => ({
        id: analyse.id,
        blancs: analyse.whiteName,
        noirs: analyse.blackName,
        opening: analyse.opening,
        proprietaire: analyse.proprietaire,
        creee: analyse.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('[admin/contenus]', error)
    return NextResponse.json({ error: 'Lecture impossible.' }, { status: 503 })
  }
}

export async function DELETE(request: Request) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const parametres = new URL(request.url).searchParams
  const partie = parametres.get('partie')
  const analyse = parametres.get('analyse')

  try {
    if (partie) {
      const effacees = await getDb()
        .delete(games)
        // Jamais une partie classée : voir l'en-tête du fichier.
        .where(and(eq(games.slug, partie), eq(games.rated, false)))
        .returning({ slug: games.slug })
      if (effacees.length === 0) {
        return NextResponse.json(
          { error: 'Partie introuvable, ou classée — une partie classée ne s’efface pas.' },
          { status: 400 },
        )
      }
      await journaliser(admin, {
        action: 'supprimerPartie',
        cible: 'partie',
        cibleId: partie,
        cibleNom: partie,
      })
      return NextResponse.json({ ok: true })
    }

    if (analyse) {
      await getDb().delete(savedAnalyses).where(eq(savedAnalyses.id, analyse))
      await journaliser(admin, {
        action: 'supprimerAnalyse',
        cible: 'analyse',
        cibleId: analyse,
        cibleNom: analyse,
      })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Rien à supprimer.' }, { status: 400 })
  } catch (error) {
    console.error('[admin/contenus]', error)
    return NextResponse.json({ error: 'Suppression impossible.' }, { status: 500 })
  }
}

/**
 * Les purges d'entretien.
 *
 * Chacune est *sûre* au sens où elle ne retire que ce qui est déjà périmé ou
 * reconstructible. Aucune ne touche à une partie, à un compte ou à une analyse
 * conservée : ce sont des données que personne ne peut refabriquer, et une
 * commande de ménage n'a pas à pouvoir les atteindre.
 */
export async function POST(request: Request) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  let corps: { action?: string }
  try {
    corps = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 })
  }

  try {
    if (corps.action === 'sessions') {
      // Les sessions expirées ne servent plus à rien et personne ne les relit.
      const retirees = await pruneSessions()
      await journaliser(admin, {
        action: 'purge',
        cible: 'systeme',
        cibleNom: 'sessions expirées',
        detail: { retirees },
      })
      return NextResponse.json({ ok: true, retirees, quoi: 'sessions expirées' })
    }

    if (corps.action === 'evaluations') {
      // Le cache d'évaluations est entièrement reconstructible : le moteur
      // recalculera ce qu'on lui redemandera. C'est ce qui rend cette purge
      // sûre — au pire, une analyse redevient lente une fois.
      //
      // Le critère est la **profondeur seule**, et non l'âge : `position_evals`
      // ne porte aucun horodatage. Une entrée sous quatorze demi-coups ne sert
      // de toute façon plus, l'analyse en demandant dix-huit par défaut : on
      // la relit, on la juge insuffisante, et on relance le moteur. Elle occupe
      // de la place sans jamais éviter un calcul.
      const retirees = await getDb()
        .delete(positionEvals)
        .where(lt(positionEvals.depth, 14))
        .returning({ epd: positionEvals.epd })
      await journaliser(admin, {
        action: 'purge',
        cible: 'systeme',
        cibleNom: 'évaluations peu profondes',
        detail: { retirees: retirees.length },
      })
      return NextResponse.json({
        ok: true,
        retirees: retirees.length,
        quoi: 'évaluations sous 14 demi-coups, trop peu profondes pour resservir',
      })
    }

    if (corps.action === 'vide') {
      // Les comptes créés puis jamais utilisés : aucune partie, aucune analyse,
      // pas revus depuis six mois. Ce sont des inscriptions abandonnées, pas
      // des joueurs discrets — la condition « aucune partie » fait la
      // différence, et elle est stricte.
      // La date part en texte ISO avec son transtypage explicite, et non comme
      // objet `Date` : dans un fragment `sql` brut, drizzle n'a plus le type de
      // colonne pour guider la liaison, et postgres.js refuse net une `Date` —
      // « The "string" argument must be of type string ». La requête est
      // pourtant valide et l'erreur ne survient qu'à l'exécution.
      const limite = new Date(Date.now() - 182 * 24 * 3600 * 1000).toISOString()
      const retires = await getDb()
        .delete(users)
        .where(
          sql`${users.lastSeenAt} < ${limite}::timestamptz
              and ${users.role} <> 'admin'
              and not exists (
                select 1 from ${games}
                 where ${games.whiteId} = ${users.id} or ${games.blackId} = ${users.id})
              and not exists (
                select 1 from ${savedAnalyses} where ${savedAnalyses.userId} = ${users.id})`,
        )
        .returning({ id: users.id })
      await journaliser(admin, {
        action: 'purge',
        cible: 'systeme',
        cibleNom: 'comptes vides et inactifs',
        detail: { retirees: retires.length },
      })
      return NextResponse.json({
        ok: true,
        retirees: retires.length,
        quoi: 'comptes sans aucune partie ni analyse, inactifs depuis six mois',
      })
    }

    return NextResponse.json({ error: 'Purge inconnue.' }, { status: 400 })
  } catch (error) {
    console.error('[admin/contenus]', error)
    return NextResponse.json({ error: 'Purge impossible.' }, { status: 500 })
  }
}
