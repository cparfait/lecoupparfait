/**
 * L'état du système, en une requête.
 *
 *   GET /api/admin/sante
 *
 * Ce que cherche quelqu'un qui ouvre cette page : est-ce que ça tourne, est-ce
 * que ça grossit, et est-ce que les sauvegardes existent. Trois questions, et
 * rien de plus — un tableau de bord qui affiche quarante métriques n'en fait
 * lire aucune.
 *
 * Toutes les mesures sont prises en parallèle et **aucune ne peut faire échouer
 * la réponse** : le moteur d'analyse vit dans un autre conteneur, et une page
 * d'administration qui refuse de s'afficher parce que le service qu'elle
 * surveille est en panne surveille mal.
 */

import { NextResponse } from 'next/server'
import {
  count,
  gt,
  getDb,
  games,
  puzzles,
  savedAnalyses,
  sessions,
  sql,
  users,
} from '@coupparfait/db'
import { getAdmin } from '@/lib/server/admin.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SERVER_URL =
  (process.env.NODE_ENV === 'production' ? process.env.INTERNAL_SERVER_URL : undefined) ??
  process.env.NEXT_PUBLIC_SERVER_URL ??
  'http://localhost:3001'

export async function GET() {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const base = getDb()
  const maintenant = new Date()
  const ilYaUnJour = new Date(maintenant.getTime() - 24 * 3600 * 1000)
  const ilYaUneSemaine = new Date(maintenant.getTime() - 7 * 24 * 3600 * 1000)

  const [compteurs, poids, moteur] = await Promise.all([
    Promise.all([
      base.select({ n: count() }).from(users),
      base.select({ n: count() }).from(games),
      base.select({ n: count() }).from(savedAnalyses),
      base.select({ n: count() }).from(puzzles),
      base.select({ n: count() }).from(sessions).where(gt(sessions.expiresAt, maintenant)),
      base.select({ n: count() }).from(users).where(gt(users.createdAt, ilYaUneSemaine)),
      base.select({ n: count() }).from(users).where(gt(users.lastSeenAt, ilYaUnJour)),
      base.select({ n: count() }).from(games).where(gt(games.createdAt, ilYaUnJour)),
    ]).catch(() => null),

    // Le poids de la base et celui de ses plus grosses tables. C'est la seule
    // mesure qui prévient d'un disque qui se remplit — la table des
    // évaluations grossit indéfiniment si on ne la purge jamais.
    base
      .execute(
        sql`select
              pg_database_size(current_database()) as base,
              (select coalesce(sum(pg_total_relation_size(c.oid)), 0)
                 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                where n.nspname = 'public' and c.relkind = 'r') as tables`,
      )
      .catch(() => null),

    // Le moteur est ailleurs : on l'interroge avec une échéance courte, et son
    // silence est une information comme une autre, pas une panne de cette page.
    fetch(`${SERVER_URL}/health`, {
      signal: AbortSignal.timeout(2500),
      cache: 'no-store',
    })
      .then((reponse) => (reponse.ok ? reponse.json() : null))
      .catch(() => null),
  ])

  const nombre = (index: number): number | null =>
    compteurs ? Number(compteurs[index]?.[0]?.n ?? 0) : null

  const tailles = (poids as Array<{ base?: unknown; tables?: unknown }> | null)?.[0]

  return NextResponse.json({
    base: {
      joignable: compteurs !== null,
      comptes: nombre(0),
      parties: nombre(1),
      analysesConservees: nombre(2),
      puzzles: nombre(3),
      sessionsActives: nombre(4),
      inscritsCetteSemaine: nombre(5),
      vus24h: nombre(6),
      parties24h: nombre(7),
      octets: tailles?.base != null ? Number(tailles.base) : null,
      octetsTables: tailles?.tables != null ? Number(tailles.tables) : null,
    },
    moteur: {
      joignable: moteur !== null,
      // Le serveur temps réel rend son propre diagnostic ; on le relaie tel
      // quel plutôt que d'en réinterpréter les champs ici, où l'on serait le
      // dernier informé d'un changement de format.
      detail: moteur,
    },
    courriel: {
      configure: Boolean(process.env.SMTP_URL),
      expediteur: process.env.MAIL_FROM ?? null,
    },
    administration: {
      parEnvironnement: admin.parEnvironnement,
      pseudosPrivilegies: (process.env.ADMIN_USERNAMES ?? '')
        .split(',')
        .map((pseudo) => pseudo.trim())
        .filter(Boolean),
    },
  })
}
