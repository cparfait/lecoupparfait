/**
 * Passerelle vers la voix neuronale.
 *
 * Même principe que la passerelle d'analyse : le navigateur ne parle jamais
 * directement au serveur. On en profite pour plafonner la longueur du texte —
 * la synthèse est le seul endroit de l'application où une requête peut coûter
 * plusieurs secondes de calcul.
 *
 * Si le serveur est absent ou dépourvu de voix installée, on répond simplement
 * « indisponible » : l'interface bascule sur la synthèse du navigateur, sans
 * message d'erreur. Une voix de secours vaut mieux qu'un silence.
 */

import { NextResponse } from 'next/server'
import { entetesDeRelais } from '@/lib/server/passerelle.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Adresse du serveur d'analyse.
 *
 * `INTERNAL_SERVER_URL` désigne le service dans le réseau Docker — un nom
 * d'hôte qui n'existe qu'en production. On ne le considère donc qu'en
 * production : sinon un `.env` recopié depuis l'exemple ferait échouer en
 * silence tous les appels faits depuis le rendu serveur.
 */
const SERVER_URL =
  (process.env.NODE_ENV === 'production' ? process.env.INTERNAL_SERVER_URL : undefined) ??
  process.env.NEXT_PUBLIC_SERVER_URL ??
  'http://localhost:3001'

/** Une phrase de coach ne dépasse jamais cela ; au-delà, c'est une erreur. */
const MAX_CHARS = 1200

/**
 * Catalogue des voix installées — ou un extrait, avec `?text=`.
 *
 * La variante `?text=` existe pour le diagnostic : elle permet d'ouvrir le son
 * **directement dans le navigateur**, avec son lecteur natif, hors de toute
 * logique de l'application. C'est la seule façon de distinguer un défaut de la
 * synthèse d'un défaut de lecture — et de le faire sans avoir à me croire.
 *
 *   http://localhost:3000/api/voix?text=Bonjour, comment allez-vous ?
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const text = (url.searchParams.get('text') ?? '').trim().slice(0, MAX_CHARS)

  if (text) {
    return synthesise(
      {
        text,
        voice: url.searchParams.get('voix') ?? undefined,
        language: (url.searchParams.get('langue') as 'fr' | 'en' | null) ?? undefined,
        rate: Number(url.searchParams.get('debit') ?? 1),
      },
      request.headers.get('range'),
      entetesDeRelais(request),
    )
  }

  try {
    const upstream = await fetch(`${SERVER_URL}/voix/liste`, {
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    })
    if (!upstream.ok) return NextResponse.json({ available: false, voices: [] })
    return NextResponse.json(await upstream.json())
  } catch {
    return NextResponse.json({ available: false, voices: [] })
  }
}

export async function POST(request: Request) {
  let body: { text?: string; voice?: string; language?: 'fr' | 'en'; rate?: number }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 })
  }

  const text = (body.text ?? '').trim().slice(0, MAX_CHARS)
  if (!text) {
    return NextResponse.json({ error: 'Le champ « text » est requis.' }, { status: 400 })
  }

  return synthesise(
    {
      text,
      voice: body.voice,
      language: body.language,
      rate: Number(body.rate ?? 1),
    },
    null,
    entetesDeRelais(request),
  )
}

/**
 * Demande l'extrait au serveur et le renvoie au navigateur.
 *
 * On **bufferise** au lieu de relayer le flux tel quel, pour pouvoir annoncer
 * `Content-Length` et honorer les requêtes `Range`. Ce n'est pas un détail de
 * conformité : ouvrir l'adresse directement dans un onglet crée un *document
 * média*, et le lecteur de Chrome demande alors des plages d'octets. Une route
 * qui ignore `Range` et renvoie le fichier entier à chaque demande fait
 * recoller au lecteur des morceaux qui se recouvrent — on entend du bruit — et
 * le fait redemander en boucle jusqu'à figer l'onglet.
 *
 * Un extrait de coach pèse quelques centaines de kilo-octets : le garder en
 * mémoire le temps de la réponse ne coûte rien.
 */
async function synthesise(
  options: {
    text: string
    voice?: string
    language?: 'fr' | 'en'
    rate?: number
  },
  range: string | null,
  entetes: Record<string, string>,
): Promise<Response> {
  const rate = Number.isFinite(options.rate) ? Math.max(0.5, Math.min(2, options.rate!)) : 1

  let audio: ArrayBuffer
  try {
    const upstream = await fetch(`${SERVER_URL}/voix`, {
      method: 'POST',
      headers: entetes,
      body: JSON.stringify({
        text: options.text,
        voice: options.voice,
        language: options.language,
        rate,
      }),
      // Une phrase longue dans une voix « high » peut demander quelques
      // secondes ; au-delà, il vaut mieux rendre la parole au navigateur.
      signal: AbortSignal.timeout(20_000),
    })

    if (!upstream.ok) {
      return NextResponse.json({ error: 'Voix neuronale indisponible.' }, { status: 503 })
    }
    audio = await upstream.arrayBuffer()
  } catch {
    return NextResponse.json({ error: 'Voix neuronale injoignable.' }, { status: 503 })
  }

  const total = audio.byteLength
  const headers: Record<string, string> = {
    'Content-Type': 'audio/wav',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=86400',
  }

  const asked = parseRange(range, total)
  if (asked) {
    const slice = audio.slice(asked.start, asked.end + 1)
    return new NextResponse(slice, {
      status: 206,
      headers: {
        ...headers,
        'Content-Range': `bytes ${asked.start}-${asked.end}/${total}`,
        'Content-Length': String(slice.byteLength),
      },
    })
  }

  return new NextResponse(audio, {
    status: 200,
    headers: { ...headers, 'Content-Length': String(total) },
  })
}

/**
 * Interprète un en-tête `Range`.
 *
 * On ne gère que la forme simple `bytes=début-fin` — la seule qu'émettent les
 * lecteurs audio. Toute autre forme est ignorée, ce qui revient à servir le
 * fichier entier : correct, simplement moins efficace.
 */
function parseRange(
  header: string | null | undefined,
  total: number,
): { start: number; end: number } | null {
  if (!header) return null

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match) return null

  const [, rawStart, rawEnd] = match
  let start: number
  let end: number

  if (rawStart === '') {
    // `bytes=-500` : les 500 derniers octets.
    const length = Number(rawEnd)
    if (!Number.isFinite(length) || length <= 0) return null
    start = Math.max(0, total - length)
    end = total - 1
  } else {
    start = Number(rawStart)
    end = rawEnd === '' ? total - 1 : Number(rawEnd)
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  if (start < 0 || start >= total || end < start) return null

  return { start, end: Math.min(end, total - 1) }
}
