/**
 * Progression contre l'ordinateur.
 *
 *   GET  /api/progression                    → où j'en suis
 *   POST /api/progression  { level, won }    → j'ai joué contre ce niveau
 *
 * Le déblocage est délibérément **généreux** : battre un niveau ouvre les deux
 * suivants, et l'on peut toujours redescendre. Une progression qui n'avance
 * que d'un cran à la fois punit deux fois — une première en perdant, une
 * seconde en n'avançant pas.
 */

import { NextResponse } from 'next/server'
import { botProgress, eq, getDb, sql } from '@coupparfait/db'
import { getCurrentUser } from '@/lib/server/session.ts'
import { tDeLaRequete } from '@/lib/i18n/serveur.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Niveaux ouverts d'avance.
 *
 * Deux : de quoi tenter plus fort que soi sans avoir à tout gagner, ce qui est
 * la seule façon de progresser. À un seul, on plafonne dès la première défaite.
 */
const LOOKAHEAD = 2

/** Le premier palier est ouvert d'emblée : il faut bien commencer quelque part. */
const FLOOR = 1

export async function GET() {
  const me = await getCurrentUser()
  // Sans compte, on ne bloque rien : la progression est un confort, pas un
  // péage. Tous les niveaux restent jouables.
  if (!me) return NextResponse.json({ defeated: 0, unlocked: 25, tracked: false })

  const [row] = await getDb()
    .select()
    .from(botProgress)
    .where(eq(botProgress.userId, me.userId))
    .limit(1)

  const defeated = row?.defeated ?? 0
  return NextResponse.json({
    defeated,
    unlocked: Math.max(FLOOR, defeated + LOOKAHEAD),
    attempts: row?.attempts ?? 0,
    wins: row?.wins ?? 0,
    tracked: true,
  })
}

export async function POST(request: Request) {
  const t = tDeLaRequete(request)
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ ok: true, tracked: false })

  let body: { level?: number; won?: boolean; action?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: t('api.unreadable') }, { status: 400 })
  }

  /*
    Le niveau déclaré à l'inscription.

    Quelqu'un qui joue depuis vingt ans n'a aucune envie d'affronter le palier
    le plus faible, et rien ne permettait de le dire : l'échelle démarrait à 100
    Elo pour tout le monde, et il fallait battre les paliers un par un — ou
    déplacer le curseur à la main avant chaque partie — pour arriver là où l'on
    joue vraiment.

    On enregistre donc la déclaration comme un point de départ, **une seule
    fois** : `greatest` empêche de faire reculer quelqu'un qui aurait déjà
    gagné plus haut, et l'absence de `attempts` marque que rien n'a été joué.
    C'est une déclaration, pas une victoire — et elle ne touche à aucun
    classement, précisément parce qu'elle n'est vérifiée par personne.
  */
  if (body.action === 'declarer') {
    const declare = Math.min(25, Math.max(1, Math.round(Number(body.level ?? 0))))
    if (!declare) return NextResponse.json({ error: t('api.levelMissing') }, { status: 400 })

    const [ligne] = await getDb()
      .insert(botProgress)
      .values({ userId: me.userId, defeated: declare, attempts: 0, wins: 0 })
      .onConflictDoUpdate({
        target: botProgress.userId,
        set: {
          defeated: sql`greatest(${botProgress.defeated}, ${declare})`,
          updatedAt: new Date(),
        },
      })
      .returning()

    const acquis = ligne?.defeated ?? declare
    return NextResponse.json({
      ok: true,
      tracked: true,
      defeated: acquis,
      unlocked: Math.max(FLOOR, acquis + LOOKAHEAD),
    })
  }

  const level = Math.min(25, Math.max(1, Math.round(Number(body.level ?? 0))))
  const won = body.won === true
  if (!level) return NextResponse.json({ error: t('api.levelMissing') }, { status: 400 })

  const db = getDb()
  const [row] = await db
    .insert(botProgress)
    .values({
      userId: me.userId,
      // On n'enregistre une victoire que si elle fait progresser : perdre
      // contre plus fort ne fait jamais reculer.
      defeated: won ? level : 0,
      attempts: 1,
      wins: won ? 1 : 0,
    })
    .onConflictDoUpdate({
      target: botProgress.userId,
      set: {
        defeated: won ? sql`greatest(${botProgress.defeated}, ${level})` : botProgress.defeated,
        attempts: sql`${botProgress.attempts} + 1`,
        wins: sql`${botProgress.wins} + ${won ? 1 : 0}`,
        updatedAt: new Date(),
      },
    })
    .returning()

  const defeated = row?.defeated ?? 0
  return NextResponse.json({
    ok: true,
    tracked: true,
    defeated,
    unlocked: Math.max(FLOOR, defeated + LOOKAHEAD),
    /** Vrai si cette partie vient d'ouvrir un palier. */
    unlockedNew: won && level === defeated,
  })
}
