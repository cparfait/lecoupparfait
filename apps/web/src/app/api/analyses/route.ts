/**
 * Les analyses conservées dans un compte.
 *
 *   GET  → la liste, de la plus récente à la plus ancienne, sans les chiffres
 *   POST → enregistre une analyse qui vient d'aboutir
 *
 * Réservé aux comptes connectés : sans compte il n'y a nulle part où ranger
 * l'analyse. Un visiteur anonyme reçoit une liste vide, ce qui n'est pas une
 * erreur mais le cas nominal — l'écran d'import ne doit rien signaler.
 *
 * La liste ne renvoie **jamais** la colonne `positions` : c'est le gros du
 * poids, et personne n'en a besoin pour choisir une ligne. On ne la charge
 * qu'à l'ouverture, par `/api/analyses/[id]`.
 */

import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { and, desc, eq, getDb, savedAnalyses, sql } from '@coupparfait/db'
import { getCurrentUser } from '@/lib/server/session.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Une partie d'échecs dépasse rarement 300 demi-coups ; au-delà, on refuse. */
const MAX_COUPS = 400

/**
 * Rien n'est effacé d'office.
 *
 * Un premier jet oubliait les plus anciennes au-delà de cent, au motif que
 * personne ne remonte si loin. C'est peut-être vrai en moyenne et sans intérêt
 * dans le cas particulier : la partie qu'on veut revoir dix mois plus tard est
 * précisément celle qui comptait. Une réserve qui se vide toute seule est une
 * réserve à laquelle on ne confie rien.
 *
 * Le poids reste modeste — quelques dizaines de kilo-octets par partie, puisque
 * l'on ne conserve que les évaluations — et la suppression est offerte,
 * explicite, dans la liste. Cette constante ne borne donc plus que ce qu'on
 * *affiche* d'un coup.
 */
const PAGE = 200

const SOURCES = new Set(['local', 'chesscom', 'lichess', 'pgn'])

/**
 * Identifie la partie, pas l'analyse.
 *
 * La profondeur n'entre volontairement pas dans l'empreinte : réanalyser la
 * même partie plus profond doit **remplacer** l'entrée, pas en créer une
 * seconde qui ne serait qu'une version périmée de la première.
 */
function empreinte(startFen: string | null, moves: string): string {
  return createHash('sha256').update(`${startFen ?? ''}|${moves}`).digest('hex').slice(0, 64)
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ analyses: [] })

  try {
    const database = getDb()
    const lignes = await database
      .select({
        id: savedAnalyses.id,
        source: savedAnalyses.source,
        whiteName: savedAnalyses.whiteName,
        blackName: savedAnalyses.blackName,
        result: savedAnalyses.result,
        playedAt: savedAnalyses.playedAt,
        eco: savedAnalyses.eco,
        opening: savedAnalyses.opening,
        lecteur: savedAnalyses.lecteur,
        depth: savedAnalyses.depth,
        accuracyWhite: savedAnalyses.accuracyWhite,
        accuracyBlack: savedAnalyses.accuracyBlack,
        updatedAt: savedAnalyses.updatedAt,
        partage: savedAnalyses.partage,
        // Le nombre de coups sans rapatrier les coups eux-mêmes.
        coups: sql<number>`array_length(string_to_array(${savedAnalyses.moves}, ' '), 1)`,
      })
      .from(savedAnalyses)
      .where(eq(savedAnalyses.userId, user.userId))
      .orderBy(desc(savedAnalyses.updatedAt))
      .limit(PAGE)

    return NextResponse.json({ analyses: lignes })
  } catch (error) {
    console.error('[analyses]', error)
    // Une panne de base ne doit pas empêcher d'analyser : sans liste, on colle
    // son PGN comme avant.
    return NextResponse.json({ analyses: [] })
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  // Silencieux, et volontairement : l'enregistrement est déclenché par la page
  // à la fin de chaque analyse, sans que l'utilisateur l'ait demandé. Un
  // visiteur anonyme n'a pas à recevoir d'erreur pour une chose qu'il n'a pas
  // faite.
  if (!user) return NextResponse.json({ ok: false, raison: 'anonyme' })

  let body: {
    moves?: string[]
    startFen?: string | null
    positions?: unknown[]
    depth?: number
    lecteur?: string | null
    source?: string
    gameId?: string | null
    headers?: Record<string, string>
    eco?: string | null
    opening?: string | null
    accuracyWhite?: number | null
    accuracyBlack?: number | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, raison: 'corps illisible' }, { status: 400 })
  }

  const moves = Array.isArray(body.moves) ? body.moves.filter((m) => typeof m === 'string') : []
  const positions = Array.isArray(body.positions) ? body.positions : []
  if (moves.length === 0 || moves.length > MAX_COUPS) {
    return NextResponse.json({ ok: false, raison: 'coups invalides' }, { status: 400 })
  }
  // Une position de plus que de coups : celle de départ. Un décalage signale un
  // corps fabriqué à la main, et surtout une analyse inexploitable au rejeu.
  if (positions.length !== moves.length + 1) {
    return NextResponse.json({ ok: false, raison: 'analyse incomplète' }, { status: 400 })
  }

  const startFen = typeof body.startFen === 'string' && body.startFen ? body.startFen : null
  const texteDesCoups = moves.join(' ')
  const depth = Math.max(1, Math.min(60, Number(body.depth) || 1))
  const entetes = body.headers ?? {}
  const source = SOURCES.has(String(body.source)) ? String(body.source) : 'pgn'
  const lecteur = body.lecteur === 'w' || body.lecteur === 'b' ? body.lecteur : null

  const tronque = (valeur: unknown, taille: number): string | null => {
    const texte = typeof valeur === 'string' ? valeur.trim() : ''
    return texte ? texte.slice(0, taille) : null
  }

  try {
    const database = getDb()
    const maintenant = new Date()

    const [ligne] = await database
      .insert(savedAnalyses)
      .values({
        userId: user.userId,
        fingerprint: empreinte(startFen, texteDesCoups),
        gameId: body.gameId ?? null,
        source,
        whiteName: tronque(entetes.White, 60),
        blackName: tronque(entetes.Black, 60),
        result: tronque(entetes.Result, 8) ?? '*',
        playedAt: tronque(entetes.Date ?? entetes.UTCDate, 24),
        eco: tronque(body.eco ?? entetes.ECO, 3),
        opening: tronque(body.opening ?? entetes.Opening, 120),
        lecteur,
        depth,
        startFen,
        moves: texteDesCoups,
        positions,
        accuracyWhite: body.accuracyWhite ?? null,
        accuracyBlack: body.accuracyBlack ?? null,
        updatedAt: maintenant,
      })
      .onConflictDoUpdate({
        target: [savedAnalyses.userId, savedAnalyses.fingerprint],
        // Une analyse moins profonde que celle déjà en réserve n'apporte rien :
        // on garde la meilleure. Sans cette condition, rouvrir une vieille
        // partie et la relancer à 14 écraserait une analyse à 24.
        setWhere: sql`${savedAnalyses.depth} <= ${depth}`,
        set: {
          depth,
          lecteur,
          positions,
          source,
          accuracyWhite: body.accuracyWhite ?? null,
          accuracyBlack: body.accuracyBlack ?? null,
          eco: tronque(body.eco ?? entetes.ECO, 3),
          opening: tronque(body.opening ?? entetes.Opening, 120),
          updatedAt: maintenant,
        },
      })
      .returning({ id: savedAnalyses.id })

    return NextResponse.json({ ok: true, id: ligne?.id ?? null })
  } catch (error) {
    console.error('[analyses]', error)
    // L'analyse est déjà à l'écran : ne pas savoir la ranger ne doit pas la
    // faire disparaître.
    return NextResponse.json({ ok: false, raison: 'enregistrement impossible' })
  }
}
