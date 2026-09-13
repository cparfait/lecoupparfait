/**
 * Progression quotidienne d'un joueur connecté.
 *
 *   GET  /api/quotidien   → l'état le plus récent connu du serveur
 *   POST /api/quotidien   → fusionne l'état du navigateur avec celui du serveur
 *
 * Le navigateur reste la source de vérité : la plateforme s'utilise sans
 * compte, et tout doit continuer à fonctionner hors ligne. Cette route ne sert
 * qu'à retrouver sa série et ses quêtes en changeant d'appareil.
 *
 * D'où le choix de **fusionner plutôt qu'écraser**. Écraser dans un sens ferait
 * perdre la journée à qui a joué hors ligne avant de se connecter ; dans
 * l'autre, à qui a joué sur son téléphone. On garde donc le plus avancé des
 * deux, quête par quête.
 *
 * Un visiteur non connecté reçoit `null` sans que ce soit une erreur : c'est le
 * cas nominal, pas un incident.
 */

import { NextResponse } from 'next/server'
import { and, dailyProgress, desc, eq, getDb } from '@coupparfait/db'
import { getCurrentUser } from '@/lib/server/session.ts'
import { xpPour } from '@/lib/daily/quetes.ts'
import { tDeLaRequete } from '@/lib/i18n/serveur.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const JOUR_VALIDE = /^\d{4}-\d{2}-\d{2}$/

/** Plafonds de bon sens : cette route accepte des chiffres venus du client. */
const XP_MAX = 1000
const SERIE_MAX = 100_000

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ etat: null })

  try {
    const database = getDb()
    const rangees = await database
      .select()
      .from(dailyProgress)
      .where(eq(dailyProgress.userId, user.userId))
      .orderBy(desc(dailyProgress.day))
      .limit(1)

    const ligne = rangees[0]
    if (!ligne) return NextResponse.json({ etat: null })

    return NextResponse.json({
      etat: {
        jour: ligne.day,
        avancement: ligne.quests,
        serie: ligne.streak,
        meilleureSerie: ligne.bestStreak,
      },
    })
  } catch (error) {
    console.error('[quotidien]', error)
    // Une panne de base ne doit pas casser la journée du joueur : le
    // navigateur a déjà tout ce qu'il faut pour continuer seul.
    return NextResponse.json({ etat: null })
  }
}

export async function POST(request: Request) {
  const t = tDeLaRequete(request)
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ ok: false })

  let corps: {
    jour?: unknown
    avancement?: unknown
    serie?: unknown
    meilleureSerie?: unknown
  }
  try {
    corps = (await request.json()) as typeof corps
  } catch {
    return NextResponse.json({ error: t('api.unreadable') }, { status: 400 })
  }

  const jour = String(corps.jour ?? '')
  if (!JOUR_VALIDE.test(jour)) {
    return NextResponse.json({ error: t('api.invalidDay') }, { status: 400 })
  }

  const avancement = nettoyerAvancement(corps.avancement)
  const serie = borner(corps.serie, SERIE_MAX)
  const meilleureSerie = Math.max(serie, borner(corps.meilleureSerie, SERIE_MAX))
  try {
    const database = getDb()
    const existantes = await database
      .select()
      .from(dailyProgress)
      .where(and(eq(dailyProgress.userId, user.userId), eq(dailyProgress.day, jour)))
      .limit(1)

    const existant = existantes[0]
    const quests = existant ? fusionner(existant.quests, avancement) : avancement

    // Les points sont **recalculés** à partir du barème commun et de
    // l'avancement fusionné, jamais repris du client — sans quoi une journée
    // faite sur deux appareils compterait deux fois, ou pas du tout.
    const xp = borner(xpPour(quests), XP_MAX)

    if (existant) {
      await database
        .update(dailyProgress)
        .set({
          quests,
          xp,
          streak: Math.max(existant.streak, serie),
          bestStreak: Math.max(existant.bestStreak, meilleureSerie),
          updatedAt: new Date(),
        })
        .where(and(eq(dailyProgress.userId, user.userId), eq(dailyProgress.day, jour)))
    } else {
      await database.insert(dailyProgress).values({
        userId: user.userId,
        day: jour,
        quests,
        xp,
        streak: serie,
        bestStreak: meilleureSerie,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[quotidien]', error)
    return NextResponse.json({ ok: false })
  }
}

/** Ne garde que des compteurs entiers positifs et raisonnables. */
function nettoyerAvancement(brut: unknown): Record<string, number> {
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return {}
  const propre: Record<string, number> = {}
  for (const [cle, valeur] of Object.entries(brut as Record<string, unknown>)) {
    if (!/^[a-z]{1,20}$/.test(cle)) continue
    const nombre = Number(valeur)
    if (!Number.isFinite(nombre) || nombre <= 0) continue
    propre[cle] = Math.min(999, Math.floor(nombre))
  }
  return propre
}

function fusionner(
  serveur: Record<string, number>,
  client: Record<string, number>,
): Record<string, number> {
  const resultat = { ...serveur }
  for (const [cle, valeur] of Object.entries(client)) {
    resultat[cle] = Math.max(resultat[cle] ?? 0, valeur)
  }
  return resultat
}

function borner(valeur: unknown, plafond: number): number {
  const nombre = Number(valeur)
  if (!Number.isFinite(nombre) || nombre < 0) return 0
  return Math.min(plafond, Math.floor(nombre))
}
