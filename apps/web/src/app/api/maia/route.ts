/**
 * Un coup joué comme un humain.
 *
 *   POST /api/maia  { fen, elo, ply }  →  { uci, source }
 *
 * Deux sources, et c'est le nombre de coups joués qui départage.
 *
 * **En ouverture, la bibliothèque.** Maia est déterministe : même position,
 * même coup, toujours. Sans rien faire, toutes les parties contre elle
 * commenceraient identiquement — ce qui est insupportable au bout de trois
 * parties. On pioche donc au hasard, dans les premiers coups, parmi les suites
 * de la table des ouvertures. C'est ce que fait Lichess pour ses bots Maia.
 *
 * **Ensuite, Maia.** Une fois sorti du livre, la position n'a plus aucune
 * chance de se répéter, et le déterminisme cesse d'être un problème.
 */

import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Chess } from 'chess.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SERVER_URL =
  (process.env.NODE_ENV === 'production' ? process.env.INTERNAL_SERVER_URL : undefined) ??
  process.env.NEXT_PUBLIC_SERVER_URL ??
  'http://localhost:3001'

/**
 * Nombre de demi-coups pendant lesquels on pioche dans le livre.
 *
 * Huit, soit quatre coups chacun : assez pour que deux parties ne se
 * ressemblent pas, assez peu pour qu'on affronte vraiment Maia dès que la
 * position devient intéressante.
 */
const BOOK_PLIES = 8

/** Une suite jouée moins de cinquante fois sur un million de parties est une bizarrerie. */
const MIN_OCCURRENCES = 50

interface Band {
  id: string
  label: string
  /** `{ index: [epd, [[san, total, …], …]] }` */
  positions: Record<string, [string, Array<[string, number, number, number]>]>
}

/**
 * Le livre, chargé une fois.
 *
 * Quatre mégaoctets qu'on ne relit pas à chaque coup. Le processus Next les
 * garde en mémoire pour toute sa durée de vie ; c'est le prix d'une ouverture
 * qui ne se répète pas.
 */
let book: Map<string, Map<string, Array<[string, number]>>> | null = null

async function loadBook(): Promise<typeof book> {
  if (book) return book
  const path = join(process.cwd(), 'public', 'data', 'opening-stats.json')
  const raw = JSON.parse(await readFile(path, 'utf8')) as { bands: Band[] }

  book = new Map()
  for (const band of raw.bands) {
    const byPosition = new Map<string, Array<[string, number]>>()
    for (const [epd, moves] of Object.values(band.positions)) {
      const kept = moves
        .filter(([, total]) => total >= MIN_OCCURRENCES)
        .map(([san, total]) => [san, total] as [string, number])
      if (kept.length > 0) byPosition.set(epd, kept)
    }
    book.set(band.id, byPosition)
  }
  return book
}

/**
 * La bande qui correspond au niveau demandé.
 *
 * Un adversaire de 1100 doit jouer les ouvertures qu'on rencontre à 1100 —
 * pas celles des joueurs de club. C'est la même idée que Maia elle-même,
 * appliquée aux premiers coups.
 */
function bandFor(elo: number): string {
  if (elo < 1500) return 'debutant'
  if (elo < 1900) return 'club'
  return 'fort'
}

/**
 * Un coup d'ouverture, tiré au sort **en proportion de sa fréquence réelle**.
 *
 * Le catalogue ECO ne conviendrait pas : il contient toutes les ouvertures
 * répertoriées, y compris 1.a4 et 1.Ch3, que personne ne joue. Un adversaire
 * censé imiter un humain les jouerait une fois sur dix. Les statistiques,
 * elles, viennent d'un million de vraies parties : e4 y sort 91 242 fois
 * contre 1 398 pour d3, et le tirage respecte cet écart.
 */
async function bookMove(fen: string, elo: number): Promise<string | null> {
  const loaded = await loadBook()
  if (!loaded) return null

  const epd = fen.split(' ').slice(0, 4).join(' ')
  const moves = loaded.get(bandFor(elo))?.get(epd)
  if (!moves || moves.length === 0) return null

  const total = moves.reduce((sum, [, count]) => sum + count, 0)
  let ticket = Math.random() * total
  let chosen = moves[0]![0]
  for (const [san, count] of moves) {
    ticket -= count
    if (ticket <= 0) {
      chosen = san
      break
    }
  }

  // Le livre parle en notation algébrique, le moteur en notation UCI.
  try {
    const board = new Chess(fen)
    const move = board.move(chosen)
    return `${move.from}${move.to}${move.promotion ?? ''}`
  } catch {
    // Coup du livre illégal ici : la position ne correspond pas, on laisse
    // Maia jouer plutôt que d'insister.
    return null
  }
}

export async function POST(request: Request) {
  let body: { fen?: string; elo?: number; ply?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 })
  }

  const fen = String(body.fen ?? '')
  if (!fen) return NextResponse.json({ error: 'Position manquante.' }, { status: 400 })

  if (Number(body.ply ?? 99) < BOOK_PLIES) {
    try {
      const uci = await bookMove(fen, Number(body.elo ?? 1500))
      if (uci) return NextResponse.json({ uci, source: 'livre' })
    } catch {
      // Livre indisponible : Maia jouera, ce qui reste correct — seulement
      // plus répétitif.
    }
  }

  try {
    const upstream = await fetch(`${SERVER_URL}/maia`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fen, elo: body.elo ?? 1500 }),
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
    })
    const data = await upstream.json()
    if (!upstream.ok) {
      return NextResponse.json(data, { status: upstream.status })
    }
    return NextResponse.json({ ...data, source: 'maia' })
  } catch {
    return NextResponse.json(
      { error: 'Le serveur de jeu est injoignable.' },
      { status: 503 },
    )
  }
}
