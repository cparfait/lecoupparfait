/**
 * Les erreurs à revoir.
 *
 *   GET  ?jour=AAAA-MM-JJ → les positions dues ce jour-là, et de quoi dire où
 *                           l'on en est (combien en tout, prochaine échéance)
 *   POST { id, reussie, jour } → range le résultat d'une révision
 *
 * Réservé aux comptes : une boîte de Leitner n'a de sens que si elle se
 * retrouve le lendemain. Le jour vient du navigateur, parce que c'est le jour
 * du joueur qui compte ; le serveur ne s'en sert qu'en repli.
 *
 * Le GET fait aussi le rattrapage des analyses rangées avant cette fonction,
 * quelques-unes par passage — voir `rattraper`.
 */

import { NextResponse } from 'next/server'
import {
  and,
  asc,
  count,
  eq,
  getDb,
  lte,
  mistakeReviews,
  savedAnalyses,
  sql,
} from '@coupparfait/db'
import { apresRevision, estUnJour } from '@coupparfait/core'
import { tDeLaRequete } from '@/lib/i18n/serveur.ts'
import { creerLimiteur } from '@/lib/server/limiteur.ts'
import { getCurrentUser } from '@/lib/server/session.ts'
import { jourDuServeur, rattraper } from '@/lib/server/revision.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Trente lectures par minute et par compte : la page en fait une à
 * l'ouverture, et une par passage de rattrapage. Au-delà, c'est une boucle.
 */
const lectures = creerLimiteur(60_000, 30)

/**
 * Cent vingt résultats par minute : une position toutes les demi-secondes,
 * bien plus vite que personne ne réfléchit à un coup.
 */
const resultats = creerLimiteur(60_000, 120)

/** Au plus cinquante positions par jour : au-delà, on ne révise plus, on subit. */
const PAR_JOUR = 50

function trop(t: ReturnType<typeof tDeLaRequete>, attente: number) {
  return NextResponse.json(
    { error: t('api.tooManyRequests') },
    { status: 429, headers: { 'Retry-After': String(attente) } },
  )
}

export async function GET(request: Request) {
  const t = tDeLaRequete(request)
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: t('api.signInRequired') }, { status: 401 })
  if (lectures.depasse(user.userId)) return trop(t, lectures.attente(user.userId))

  const demande = new URL(request.url).searchParams.get('jour')
  const jour = estUnJour(demande) ? demande : jourDuServeur()

  try {
    const database = getDb()

    let enRetard = false
    try {
      enRetard = await rattraper(database, user.userId)
    } catch (error) {
      // Le rattrapage est un bonus : sans lui, on révise ce qui est déjà
      // relevé, ce qui vaut mieux qu'une page d'erreur.
      console.error('[revoir] rattrapage', error)
    }

    const [dues, [bilan], [analyses]] = await Promise.all([
      database
        .select({
          id: mistakeReviews.id,
          fen: mistakeReviews.fen,
          playedSan: mistakeReviews.playedSan,
          playedUci: mistakeReviews.playedUci,
          bestSan: mistakeReviews.bestSan,
          bestUci: mistakeReviews.bestUci,
          accepted: mistakeReviews.accepted,
          quality: mistakeReviews.quality,
          explanation: mistakeReviews.explanation,
          box: mistakeReviews.box,
        })
        .from(mistakeReviews)
        .where(and(eq(mistakeReviews.userId, user.userId), lte(mistakeReviews.dueOn, jour)))
        // Les plus en retard d'abord, puis les plus fragiles.
        .orderBy(asc(mistakeReviews.dueOn), asc(mistakeReviews.box))
        .limit(PAR_JOUR),
      database
        .select({
          total: count(),
          prochaine: sql<
            string | null
          >`min(${mistakeReviews.dueOn}) filter (where ${mistakeReviews.dueOn} > ${jour})`,
        })
        .from(mistakeReviews)
        .where(eq(mistakeReviews.userId, user.userId)),
      database
        .select({ n: count() })
        .from(savedAnalyses)
        .where(eq(savedAnalyses.userId, user.userId)),
    ])

    return NextResponse.json({
      jour,
      dues,
      total: Number(bilan?.total ?? 0),
      prochaine: bilan?.prochaine ?? null,
      analyses: Number(analyses?.n ?? 0),
      enRetard,
    })
  } catch (error) {
    console.error('[revoir]', error)
    return NextResponse.json({ error: t('api.readFailed') }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const t = tDeLaRequete(request)
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: t('api.signInRequired') }, { status: 401 })
  if (resultats.depasse(user.userId)) return trop(t, resultats.attente(user.userId))

  let body: { id?: unknown; reussie?: unknown; jour?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: t('api.unreadable') }, { status: 400 })
  }

  if (typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.id)) {
    return NextResponse.json({ error: t('api.unreadable') }, { status: 400 })
  }
  if (typeof body.reussie !== 'boolean') {
    return NextResponse.json({ error: t('api.unreadable') }, { status: 400 })
  }
  const jour = estUnJour(body.jour) ? body.jour : jourDuServeur()

  try {
    const database = getDb()
    // Le propriétaire en plus de l'identifiant, comme partout : un identifiant
    // finit toujours par circuler.
    const proprietaire = and(eq(mistakeReviews.id, body.id), eq(mistakeReviews.userId, user.userId))
    const [carte] = await database
      .select({ box: mistakeReviews.box, dueOn: mistakeReviews.dueOn })
      .from(mistakeReviews)
      .where(proprietaire)
      .limit(1)
    if (!carte) return NextResponse.json({ error: t('api.notFound') }, { status: 404 })

    // Pas encore due : c'est un second envoi de la même révision (double clic,
    // réseau qui rejoue). La compter ferait monter une boîte deux fois pour
    // une seule réponse.
    if (carte.dueOn > jour) {
      return NextResponse.json({
        ok: true,
        boite: carte.box,
        echeance: carte.dueOn,
        inchangee: true,
      })
    }

    const { boite, echeance } = apresRevision(carte.box, body.reussie, jour)
    await database
      .update(mistakeReviews)
      .set({
        box: boite,
        dueOn: echeance,
        reviews: sql`${mistakeReviews.reviews} + 1`,
        successes: sql`${mistakeReviews.successes} + ${body.reussie ? 1 : 0}`,
        lastReviewedOn: jour,
      })
      .where(proprietaire)

    return NextResponse.json({ ok: true, boite, echeance })
  } catch (error) {
    console.error('[revoir]', error)
    return NextResponse.json({ error: t('api.saveFailed') }, { status: 500 })
  }
}
