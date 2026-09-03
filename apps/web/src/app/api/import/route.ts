/**
 * Récupération des parties publiques d'un compte Chess.com ou Lichess.
 *
 * Côté serveur, et pas côté navigateur, pour deux raisons distinctes :
 * aucune des deux API n'autorise l'appel depuis une page web, et Chess.com
 * répond 403 aux requêtes qui ne s'identifient pas par un `User-Agent`
 * descriptif — un refus silencieux, sans message, très déroutant à déboguer.
 *
 * On ne lit que ce qui est déjà public : aucune authentification, aucun jeton,
 * et rien n'est conservé. Les parties repartent au navigateur, qui les analyse
 * avec le même moteur que les nôtres, et elles disparaissent en fermant
 * l'onglet.
 */

import { NextResponse } from 'next/server'
import type { PartieImportee } from '@/lib/import/enligne.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Identification auprès des deux services.
 *
 * Chess.com demande explicitement un contact dans le `User-Agent` pour pouvoir
 * joindre l'auteur d'un trafic anormal plutôt que de le bloquer sans préavis.
 *
 * **En ASCII strict, et c'est indispensable** : un en-tête HTTP est une chaîne
 * d'octets. Une apostrophe typographique ou un tiret cadratin y fait échouer
 * la requête avant même le départ, avec une erreur qui parle de `ByteString`
 * et ne mentionne ni l'en-tête ni le caractère fautif.
 */
const USER_AGENT = 'LeCoupParfait/0.1 (open-source chess platform; +https://github.com/cparfait)'

/** Plafond dur : au-delà, on ferait travailler les serveurs des autres pour rien. */
const MAX_PARTIES = 50

/** Nombre d'archives mensuelles remontées au maximum chez Chess.com. */
const MAX_ARCHIVES = 6

/** Un pseudo, pas un chemin : on refuse tout ce qui pourrait sortir de l'URL. */
const PSEUDO_VALIDE = /^[A-Za-z0-9_-]{1,30}$/

export async function POST(request: Request) {
  let corps: { source?: unknown; pseudo?: unknown; max?: unknown }
  try {
    corps = (await request.json()) as typeof corps
  } catch {
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 })
  }

  const source = corps.source
  if (source !== 'chesscom' && source !== 'lichess') {
    return NextResponse.json({ error: 'Source inconnue.' }, { status: 400 })
  }

  const pseudo = String(corps.pseudo ?? '').trim()
  if (!PSEUDO_VALIDE.test(pseudo)) {
    return NextResponse.json(
      { error: 'Pseudo invalide : lettres, chiffres, tirets et soulignés seulement.' },
      { status: 400 },
    )
  }

  const max = Math.max(1, Math.min(MAX_PARTIES, Number(corps.max) || 30))

  try {
    const parties =
      source === 'chesscom'
        ? await chargerChessCom(pseudo, max)
        : await chargerLichess(pseudo, max)
    return NextResponse.json({ parties })
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : 'Récupération impossible.'
    // 404 est le seul cas où l'utilisateur peut agir : c'est presque toujours
    // une faute de frappe dans le pseudo.
    const introuvable = message.includes('introuvable')
    return NextResponse.json({ error: message }, { status: introuvable ? 404 : 502 })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Chess.com
// ─────────────────────────────────────────────────────────────────────────────

interface ChessComJoueur {
  username?: string
  result?: string
}
interface ChessComPartie {
  url?: string
  pgn?: string
  time_class?: string
  end_time?: number
  rules?: string
  white?: ChessComJoueur
  black?: ChessComJoueur
}

/**
 * Chess.com sert les parties par archives mensuelles, de la plus ancienne à la
 * plus récente. On remonte donc le temps mois par mois jusqu'à avoir le compte
 * demandé — la plupart des joueurs le remplissent avec le mois en cours, mais
 * un joueur occasionnel peut avoir besoin qu'on aille chercher plus loin.
 */
async function chargerChessCom(pseudo: string, max: number): Promise<PartieImportee[]> {
  const listeArchives = await recuperer(
    `https://api.chess.com/pub/player/${encodeURIComponent(pseudo.toLowerCase())}/games/archives`,
  )
  const archives = ((listeArchives as { archives?: string[] }).archives ?? []).slice(-MAX_ARCHIVES)

  const parties: PartieImportee[] = []
  for (const url of [...archives].reverse()) {
    if (parties.length >= max) break

    const mois = (await recuperer(url)) as { games?: ChessComPartie[] }
    // Chess.com donne les parties du plus ancien au plus récent : on inverse
    // pour que la liste affichée commence par la dernière partie jouée.
    const dumois = [...(mois.games ?? [])].reverse()

    for (const partie of dumois) {
      if (parties.length >= max) break
      // On écarte les variantes : notre moteur et nos explications parlent des
      // échecs orthodoxes, une partie de Chess960 donnerait une analyse fausse.
      if (partie.rules && partie.rules !== 'chess') continue
      if (!partie.pgn) continue

      const blanc = partie.white?.username ?? '?'
      const noir = partie.black?.username ?? '?'
      const monCamp = blanc.toLowerCase() === pseudo.toLowerCase() ? 'w' : 'b'

      parties.push({
        source: 'chesscom',
        id: partie.url ?? `${blanc}-${noir}-${partie.end_time ?? 0}`,
        url: partie.url ?? '',
        date: (partie.end_time ?? 0) * 1000,
        blanc,
        noir,
        resultat: resultatChessCom(partie),
        cadence: partie.time_class ?? 'inconnue',
        pgn: partie.pgn,
        monCamp,
      })
    }
  }

  return parties
}

/**
 * Chess.com n'envoie pas le score de la partie, mais le sort de chaque joueur
 * (`win`, `checkmated`, `agreed`, `timeout`…). On le reconstitue.
 */
function resultatChessCom(partie: ChessComPartie): string {
  if (partie.white?.result === 'win') return '1-0'
  if (partie.black?.result === 'win') return '0-1'
  const nulles = new Set([
    'agreed',
    'repetition',
    'stalemate',
    'insufficient',
    'timevsinsufficient',
    '50move',
  ])
  if (partie.white?.result && nulles.has(partie.white.result)) return '1/2-1/2'
  return '*'
}

// ─────────────────────────────────────────────────────────────────────────────
//  Lichess
// ─────────────────────────────────────────────────────────────────────────────

interface LichessPartie {
  id?: string
  createdAt?: number
  lastMoveAt?: number
  speed?: string
  variant?: string
  status?: string
  winner?: 'white' | 'black'
  pgn?: string
  players?: {
    white?: { user?: { name?: string } }
    black?: { user?: { name?: string } }
  }
}

/** États dans lesquels la partie n'a pas vraiment eu lieu. */
const INACHEVEES = new Set(['created', 'started', 'aborted', 'noStart'])

/**
 * Résultat d'une partie Lichess.
 *
 * L'absence de vainqueur ne signifie pas « nulle » : elle couvre aussi les
 * fins irrégulières. Conclure à la nulle afficherait « nulle » sous des
 * parties qui n'en sont pas — d'où le passage par le statut.
 */
function resultatLichess(partie: LichessPartie): string {
  if (partie.winner === 'white') return '1-0'
  if (partie.winner === 'black') return '0-1'
  const nulles = new Set(['draw', 'stalemate'])
  return partie.status && nulles.has(partie.status) ? '1/2-1/2' : '*'
}

/**
 * Lichess répond en NDJSON — un objet JSON complet par ligne, envoyé au fil de
 * l'eau. C'est plus économe qu'un tableau géant, mais il faut découper soi-même.
 */
async function chargerLichess(pseudo: string, max: number): Promise<PartieImportee[]> {
  const url = new URL(`https://lichess.org/api/games/user/${encodeURIComponent(pseudo)}`)
  url.searchParams.set('max', String(max))
  url.searchParams.set('pgnInJson', 'true')
  // Ni horloges ni évaluations : on ne s'en sert pas, et les demander alourdit
  // la réponse d'un facteur trois.
  url.searchParams.set('clocks', 'false')
  url.searchParams.set('evals', 'false')

  const texte = await recuperer(url.toString(), 'application/x-ndjson')
  if (typeof texte !== 'string') return []

  const parties: PartieImportee[] = []
  for (const ligne of texte.split('\n')) {
    if (!ligne.trim()) continue
    let brut: LichessPartie
    try {
      brut = JSON.parse(ligne) as LichessPartie
    } catch {
      continue
    }
    if (!brut.pgn) continue
    if (brut.variant && brut.variant !== 'standard') continue
    // Une partie abandonnée avant le premier coup, ou encore en cours, n'a
    // rien à faire dans une liste de parties à analyser.
    if (brut.status && INACHEVEES.has(brut.status)) continue

    const blanc = brut.players?.white?.user?.name ?? 'Anonyme'
    const noir = brut.players?.black?.user?.name ?? 'Anonyme'

    parties.push({
      source: 'lichess',
      id: brut.id ?? `${blanc}-${noir}-${brut.createdAt ?? 0}`,
      url: brut.id ? `https://lichess.org/${brut.id}` : '',
      date: brut.lastMoveAt ?? brut.createdAt ?? 0,
      blanc,
      noir,
      resultat: resultatLichess(brut),
      cadence: brut.speed ?? 'inconnue',
      pgn: brut.pgn,
      monCamp: blanc.toLowerCase() === pseudo.toLowerCase() ? 'w' : 'b',
    })
  }

  return parties
}

// ─────────────────────────────────────────────────────────────────────────────
//  Appel commun
// ─────────────────────────────────────────────────────────────────────────────

/** Un appel sortant, avec identification, délai et messages d'erreur parlants. */
async function recuperer(url: string, accept = 'application/json'): Promise<unknown> {
  const controleur = new AbortController()
  const minuterie = setTimeout(() => controleur.abort(), 20_000)

  try {
    const reponse = await fetch(url, {
      headers: { Accept: accept, 'User-Agent': USER_AGENT },
      signal: controleur.signal,
    })

    if (reponse.status === 404) {
      throw new Error('Pseudo introuvable chez ce service.')
    }
    if (reponse.status === 429) {
      throw new Error('Le service limite les demandes. Réessaie dans une minute.')
    }
    if (!reponse.ok) {
      throw new Error(`Le service a répondu ${reponse.status}.`)
    }

    return accept.includes('ndjson') ? await reponse.text() : await reponse.json()
  } catch (erreur) {
    if (erreur instanceof Error && erreur.name === 'AbortError') {
      throw new Error('Le service a mis trop de temps à répondre.')
    }
    throw erreur
  } finally {
    clearTimeout(minuterie)
  }
}
