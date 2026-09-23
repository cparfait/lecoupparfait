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
import { dailyProgress, desc, eq, getDb } from '@coupparfait/db'
import { getCurrentUser } from '@/lib/server/session.ts'
import { borner, fusionnerJournee, SERIE_MAX } from '@/lib/server/journee.ts'
import { tDeLaRequete } from '@/lib/i18n/serveur.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const JOUR_VALIDE = /^\d{4}-\d{2}-\d{2}$/

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
  const meilleureSerie = borner(corps.meilleureSerie, SERIE_MAX)
  try {
    await fusionnerJournee({ userId: user.userId, jour, avancement, serie, meilleureSerie })
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
