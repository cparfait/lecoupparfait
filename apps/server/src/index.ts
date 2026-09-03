/**
 * Serveur Le Coup Parfait.
 *
 * Deux responsabilités, un seul processus :
 *
 *  - **Analyse.** Une petite API HTTP devant la réserve de processus Stockfish
 *    natifs. C'est elle qui produit les analyses profondes, hors de portée du
 *    moteur WebAssembly du navigateur.
 *  - **Temps réel.** Les parties entre amis, en Socket.IO, avec le serveur pour
 *    seule autorité sur les coups et les pendules.
 *
 * L'authentification et les données de compte restent du ressort de
 * l'application Next.js : elle a déjà les cookies de session et l'accès à la
 * base. Ce serveur ne fait que vérifier un jeton quand il en reçoit un.
 */

import { createServer } from 'node:http'
import { Server as SocketServer } from 'socket.io'
import { disposeMaia, maiaAvailable, maiaMove, nearestRating } from './engine/maia.ts'
import {
  finishExpired,
  hasRunning,
  pairWaiting,
  recordResult,
  releaseStuck,
  startDueTournaments,
} from '@coupparfait/db/tournaments'
import type { Square, PieceSymbol } from 'chess.js'
import { parseTimeControl, type TimeControl } from '@coupparfait/core'
import { FileSaturee, getPool, disposePool } from './engine/pool.ts'
import { analyseGamePositions, analysePosition } from './engine/analysis.ts'
import { isTablebaseEnabled } from './engine/tablebase.ts'
import { isPiperAvailable, listPiperVoices, synthesise } from './tts/piper.ts'
import { GameRoom } from './realtime/gameRoom.ts'
import { persistFinishedGame } from './persistence.ts'
import { pruneSessions } from '@coupparfait/db/auth'
import { pruneEvaluations } from '@coupparfait/db/menage'
import { verifySessionToken } from './auth.ts'
import { adresseDe, creerLimiteur } from './limites.ts'
import { rappelDuDefi, rappelsPossibles } from './rappels.ts'
import {
  enregistrerSalon,
  oublierSalon,
  purgerSalonsPerimes,
  salonsAReprendre,
} from '@coupparfait/db/live'

const PORT = Number(process.env.SERVER_PORT ?? 3001)
const ORIGINS = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const pool = getPool()

/** Message unique, pour que le client reconnaisse la situation sans deviner. */
const ENGINE_UNAVAILABLE = 'Moteur d’analyse indisponible sur le serveur.'

/**
 * Rythme accepté par route et par adresse.
 *
 * Les quatre chiffres sont taillés sur l'usage réel et non sur une intuition :
 * l'écran d'analyse demande une position à chaque coup parcouru, la voix une
 * phrase par commentaire, Maia un coup par tour. Trois analyses de partie
 * complètes par minute, en revanche, occupent déjà la réserve plusieurs
 * minutes — c'est la route qui coûte cher, et celle qu'on serre.
 */
const rythmes = {
  '/analyse': creerLimiteur(60_000, 30),
  '/analyse/partie': creerLimiteur(60_000, 3),
  '/voix': creerLimiteur(60_000, 60),
  '/maia': creerLimiteur(60_000, 60),
} as const

/**
 * Applique le rythme d'une route. Rend `true` si la requête a été refusée.
 *
 * `Retry-After` n'est pas une politesse : sans elle, un client qui reçoit un
 * 429 réessaie aussitôt, et c'est le refus lui-même qui devient la charge.
 */
function trop(
  chemin: keyof typeof rythmes,
  adresse: string,
  response: import('node:http').ServerResponse,
): boolean {
  const limiteur = rythmes[chemin]
  if (!limiteur.depasse(adresse)) return false
  response.setHeader('Retry-After', String(Math.max(1, limiteur.attente(adresse))))
  json(response, 429, { error: 'Trop de demandes. Réessaie dans un instant.' })
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
//  Salons de partie
// ─────────────────────────────────────────────────────────────────────────────

const rooms = new Map<string, GameRoom>()

/**
 * Au-delà, une partie en cours n'attend plus personne.
 *
 * Deux heures : la pendule d'une partie chronométrée est tombée depuis
 * longtemps, et une partie sans pendule laissée deux heures ne reprendra pas.
 * C'est la même fenêtre des deux côtés — ce qu'on reprend au démarrage et ce
 * qu'on relâche en cours de route.
 */
const FENETRE_REPRISE_MS = 2 * 60 * 60 * 1000

/**
 * Branche un salon sur le fil et sur la base.
 *
 * Un seul abonnement par salon : c'est le salon lui-même qui sait s'il est
 * déjà écouté. Il était posé dans le gestionnaire `join`, ce qui suffisait
 * tant qu'un salon ne pouvait naître que de l'arrivée d'un joueur. Depuis
 * qu'un salon peut aussi renaître au démarrage, il faut pouvoir le brancher
 * sans que personne ne soit encore là — sinon une pendule tombée pendant
 * l'arrêt du serveur se constate dans le vide, et la partie ne s'écrit nulle
 * part.
 */
function brancher(room: GameRoom): void {
  if (room.hasSubscriber) return

  room.subscribe((event) => {
    io.to(room.slug).emit(event.type, event)

    if (event.type === 'end') {
      void persistFinishedGame(room).catch((error: unknown) => {
        console.error('[persistance] enregistrement impossible :', error)
      })
      // La partie vit désormais dans `games` : son instantané n'a plus lieu
      // d'être, et le laisser ferait ressusciter une partie finie au prochain
      // démarrage.
      void oublierSalon(room.slug)
      // Si ce salon appartenait à une arène, les points s'attribuent ici :
      // c'est le seul endroit qui sache qu'une partie vient de se terminer.
      // Sans effet pour les autres parties.
      void recordResult(room.slug, event.result).catch((error: unknown) => {
        console.error('[tournoi] résultat non enregistré :', error)
      })
      return
    }

    /*
      L'instantané, à chaque coup et à chaque changement d'état.

      Sans attendre l'écriture : le coup part au joueur d'abord, la base
      ensuite. Une écriture par coup, c'est quelques centaines d'octets et une
      ligne remplacée — négligeable devant ce qu'on y gagne, à savoir que la
      partie survit au processus.

      `state` compte autant que `move` : c'est lui qui porte l'arrivée du
      second joueur, donc le passage à `playing` et le démarrage des pendules.
    */
    if (event.type === 'move' || event.type === 'state') {
      void enregistrerSalon(room.slug, room.etatPersistant() as unknown as Record<string, unknown>)
    }
  })
}

function roomFor(slug: string, options?: { timeControl?: TimeControl; rated?: boolean }): GameRoom {
  const existing = rooms.get(slug)
  if (existing) return existing

  const room = new GameRoom({
    slug,
    timeControl: options?.timeControl ?? { initial: 600, increment: 5 },
    rated: options?.rated ?? false,
  })
  rooms.set(slug, room)
  return room
}

/**
 * Ménage périodique.
 *
 * Une partie terminée dont plus personne ne regarde l'écran n'a aucune raison
 * d'occuper la mémoire. On laisse dix minutes pour permettre aux joueurs de
 * revoir la partie avant de la libérer.
 */
setInterval(
  () => {
    for (const [slug, room] of rooms) {
      if (!room.isEmpty) continue

      if (room.isFinished) {
        room.dispose()
        rooms.delete(slug)
        continue
      }

      // Une partie reprise au démarrage que personne n'est venu rejoindre. Ses
      // joueurs n'ont pas d'horodatage de déconnexion — on ne fait perdre
      // personne pour un redémarrage —, donc rien ne la termine jamais. Passé
      // la fenêtre de reprise, elle n'attend plus personne : on la relâche, et
      // on efface son instantané pour qu'elle ne renaisse pas au démarrage
      // suivant.
      if (room.inactifDepuis > FENETRE_REPRISE_MS) {
        room.dispose()
        rooms.delete(slug)
        void oublierSalon(slug)
      }
    }
  },
  10 * 60 * 1000,
)

// ─────────────────────────────────────────────────────────────────────────────
//  API HTTP
// ─────────────────────────────────────────────────────────────────────────────

const httpServer = createServer(async (request, response) => {
  const origin = request.headers.origin
  if (origin && ORIGINS.includes(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Access-Control-Allow-Credentials', 'true')
  }
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (request.method === 'OPTIONS') {
    response.writeHead(204).end()
    return
  }

  const url = new URL(request.url ?? '/', `http://${request.headers.host}`)
  const adresse = adresseDe(request)

  try {
    // ── Sonde de santé ─────────────────────────────────────────────────────
    if (url.pathname === '/health') {
      return json(response, 200, {
        status: 'ok',
        engine: {
          available: pool.available,
          queued: pool.queueLength,
          searches: pool.stats.searches,
          errors: pool.stats.errors,
          // Un moteur muet ne se voyait que par une disponibilité qui baissait
          // sans raison : ce compteur nomme la raison.
          restarts: pool.stats.restarts,
          averageMs:
            pool.stats.searches > 0
              ? Math.round(pool.stats.totalMs / pool.stats.searches)
              : 0,
        },
        rooms: rooms.size,
        maia: maiaAvailable(),
        engineUsable: pool.usable,
        tablebase: isTablebaseEnabled(),
        uptimeSeconds: Math.round(process.uptime()),
      })
    }

    // ── Un coup joué comme un humain ───────────────────────────────────────
    //
    // Maia ne tourne pas dans le navigateur : c'est un réseau de neurones qui
    // demande Lc0. Le bot Stockfish, lui, reste côté client — les deux
    // coexistent, et l'appelant choisit.
    if (url.pathname === '/maia' && request.method === 'POST') {
      if (trop('/maia', adresse, response)) return
      if (!maiaAvailable()) {
        return json(response, 503, {
          error: 'Maia n’est pas installée. Lance : node scripts/install-maia.mjs',
        })
      }

      const body = await readJson<{ fen?: string; elo?: number }>(request)
      const fen = String(body.fen ?? '')
      if (!fen) return json(response, 400, { error: 'Position manquante.' })

      const rating = nearestRating(Number(body.elo ?? 1500))
      const uci = await maiaMove(fen, rating)
      if (!uci) return json(response, 503, { error: 'Maia n’a pas répondu.' })

      return json(response, 200, { uci, rating })
    }

    // ── Parties en cours, pour les regarder ────────────────────────────────
    //
    // Le salon acceptait déjà un troisième arrivant, mais rien ne permettait
    // d'en trouver un : il fallait connaître l'adresse. On liste donc les
    // parties commencées — pas celles qui attendent encore un adversaire, il
    // n'y a rien à y voir.
    if (url.pathname === '/parties') {
      const live = []
      for (const room of rooms.values()) {
        const snapshot = room.snapshot()
        if (snapshot.status !== 'playing') continue
        live.push({
          slug: snapshot.slug,
          white: snapshot.players.w?.name ?? '?',
          black: snapshot.players.b?.name ?? '?',
          whiteRating: snapshot.players.w?.rating ?? null,
          blackRating: snapshot.players.b?.rating ?? null,
          moves: snapshot.moves.length,
          timeControl: snapshot.timeControl,
          rated: snapshot.rated,
          spectators: snapshot.spectators,
        })
      }
      // La plus avancée d'abord : une partie de trente coups est plus
      // intéressante à regarder qu'une qui vient de commencer.
      live.sort((a, b) => b.moves - a.moves)
      return json(response, 200, { games: live })
    }

    // ── Mes parties en cours ───────────────────────────────────────────────
    //
    // On lance une partie contre quelqu'un, on va voir un puzzle, et on ne
    // retrouve plus l'échiquier : l'adresse du salon était dans l'historique du
    // navigateur, nulle part ailleurs. Pendant ce temps l'adversaire attend un
    // coup qui ne vient pas.
    //
    // Les salons ne vivent qu'en mémoire ici — une partie n'est écrite en base
    // qu'une fois finie —, c'est donc à ce serveur de dire dans lesquels on est
    // assis. La réponse est un POST parce qu'elle prend un jeton de session :
    // un jeton n'a rien à faire dans une adresse, qui se journalise.
    if (url.pathname === '/parties/miennes' && request.method === 'POST') {
      const body = await readJson<{ token?: string }>(request)
      const identity = await verifySessionToken(body.token)
      if (!identity) return json(response, 200, { games: [] })

      const mine = []
      for (const room of rooms.values()) {
        if (room.isFinished) continue
        const color = room.colorOfUser(identity.userId)
        if (!color) continue

        const snapshot = room.snapshot()
        const adversaire = room.playerAt(color === 'w' ? 'b' : 'w')
        mine.push({
          slug: snapshot.slug,
          color,
          status: snapshot.status,
          opponent: adversaire?.name ?? null,
          // « S'il est toujours en ligne » : c'est ce qui décide si la partie
          // vaut encore la peine d'être reprise, ou s'il faut la quitter.
          opponentConnected: adversaire?.connected ?? false,
          moves: snapshot.moves.length,
          yourTurn: snapshot.turn === color && snapshot.status === 'playing',
          timeControl: snapshot.timeControl,
          rated: snapshot.rated,
        })
      }
      return json(response, 200, { games: mine })
    }

    // ── Quitter une partie sans y retourner ────────────────────────────────
    if (url.pathname === '/parties/quitter' && request.method === 'POST') {
      const body = await readJson<{ token?: string; slug?: string }>(request)
      const identity = await verifySessionToken(body.token)
      if (!identity) return json(response, 401, { error: 'Connexion requise.' })

      const room = rooms.get(String(body.slug ?? ''))
      if (!room) return json(response, 404, { error: 'Partie introuvable.' })

      const color = room.colorOfUser(identity.userId)
      if (!color) return json(response, 403, { error: 'Tu ne joues pas cette partie.' })

      return json(response, 200, { ok: room.quitter(color) })
    }

    // ── Analyse d'une position ─────────────────────────────────────────────
    if (url.pathname === '/analyse' && request.method === 'POST') {
      if (trop('/analyse', adresse, response)) return

      const body = await readJson<{
        fen?: string
        depth?: number
        multiPv?: number
        fresh?: boolean
        token?: string
      }>(request)

      if (!body.fen) return json(response, 400, { error: 'Le champ « fen » est requis.' })
      if (!pool.usable) return json(response, 503, { error: ENGINE_UNAVAILABLE })

      const analysis = await analysePosition({
        fen: body.fen,
        depth: body.depth,
        multiPv: body.multiPv,
        fresh: body.fresh,
        priority: await priorite(body.token),
        client: adresse,
      })
      return json(response, 200, analysis)
    }

    // ── Analyse d'une partie complète, en flux ─────────────────────────────
    if (url.pathname === '/analyse/partie' && request.method === 'POST') {
      if (trop('/analyse/partie', adresse, response)) return

      const body = await readJson<{
        moves?: string[]
        startFen?: string
        depth?: number
        multiPv?: number
        token?: string
      }>(request)

      if (!Array.isArray(body.moves) || body.moves.length === 0) {
        return json(response, 400, { error: 'Le champ « moves » est requis.' })
      }
      if (body.moves.length > 400) {
        return json(response, 400, { error: 'Partie trop longue (400 demi-coups maximum).' })
      }

      // Refus immédiat plutôt qu'une file d'attente sans fin : le client a un
      // moteur dans son navigateur et n'attend qu'un « non » pour s'en servir.
      // Sans ce garde-fou, une installation sans Stockfish natif laissait
      // l'analyse tourner indéfiniment sans le moindre signe de progression.
      if (!pool.usable) return json(response, 503, { error: ENGINE_UNAVAILABLE })

      // Réponse en flux : l'utilisateur voit la progression coup par coup
      // plutôt qu'un écran figé pendant une minute.
      response.writeHead(200, {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      })

      const controller = new AbortController()
      request.on('close', () => controller.abort())

      // `batch` quelle que soit l'identité, et c'est voulu : quatre-vingts
      // positions en `interactive` feraient attendre tous ceux qui regardent
      // une seule position. La priorité selon l'identité vaut pour `/analyse`,
      // où elle départage deux demandes de même coût.
      const analyses = await analyseGamePositions({
        moves: body.moves,
        startFen: body.startFen,
        depth: body.depth,
        multiPv: body.multiPv ?? 2,
        client: adresse,
        signal: controller.signal,
        onProgress: (done, total) => {
          response.write(`${JSON.stringify({ type: 'progress', done, total })}\n`)
        },
      })

      response.write(`${JSON.stringify({ type: 'done', analyses })}\n`)
      response.end()
      return
    }

    // ── Voix neuronale ─────────────────────────────────────────────────────
    // Optionnelle : sans Piper installé, la liste est vide et l'application
    // retombe sur la synthèse du navigateur sans rien signaler à l'utilisateur.
    if (url.pathname === '/voix/liste') {
      const voices = (await isPiperAvailable()) ? await listPiperVoices() : []
      return json(response, 200, {
        available: voices.length > 0,
        voices: voices.map(({ id, label, lang, language, quality }) => ({
          id,
          label,
          lang,
          language,
          quality,
        })),
      })
    }

    if (url.pathname === '/voix' && request.method === 'POST') {
      if (trop('/voix', adresse, response)) return
      if (!(await isPiperAvailable())) {
        return json(response, 503, { error: 'Voix neuronale indisponible.' })
      }

      const body = await readJson<{
        text?: string
        voice?: string
        language?: 'fr' | 'en'
        rate?: number
      }>(request)

      if (!body.text?.trim()) {
        return json(response, 400, { error: 'Le champ « text » est requis.' })
      }

      const wav = await synthesise({
        text: body.text,
        voice: body.voice,
        language: body.language,
        rate: body.rate,
      })

      response.writeHead(200, {
        'Content-Type': 'audio/wav',
        'Content-Length': wav.length,
        // Le même texte est réécouté souvent : autant laisser le navigateur le
        // garder plutôt que de refaire tourner la synthèse.
        'Cache-Control': 'public, max-age=86400',
      })
      response.end(wav)
      return
    }

    return json(response, 404, { error: 'Route inconnue.' })
  } catch (error) {
    // Une analyse en flux a déjà écrit son en-tête : plus rien à annoncer, on
    // clôt. Sans ce garde, l'échec de la réponse d'erreur masquait l'erreur.
    if (response.headersSent) {
      response.end()
      return
    }
    // Refus faute de place : ce n'est pas une panne, et le client peut
    // réessayer. Voir `FileSaturee`.
    if (error instanceof FileSaturee) {
      response.setHeader('Retry-After', '5')
      return json(response, 429, { error: error.message })
    }
    console.error('[http]', error)
    return json(response, 500, {
      error: error instanceof Error ? error.message : 'Erreur interne.',
    })
  }
})

/**
 * La priorité d'une demande d'analyse, d'après qui la fait.
 *
 * Le mécanisme existait déjà dans la réserve mais rien ne s'en servait pour
 * départager les gens : toute analyse de position partait en `interactive`, y
 * compris celle d'un `curl` anonyme, qui passait donc devant un joueur inscrit.
 * `live` reste réservé aux coups des parties en cours, il ne se demande pas.
 */
async function priorite(token: string | undefined): Promise<'interactive' | 'batch'> {
  if (!token) return 'batch'
  return (await verifySessionToken(token)) ? 'interactive' : 'batch'
}

function json(response: import('node:http').ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  })
  response.end(payload)
}

async function readJson<T>(request: import('node:http').IncomingMessage): Promise<T> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    size += (chunk as Buffer).length
    // Un PGN raisonnable ne dépasse pas quelques dizaines de kilo-octets.
    if (size > 1_000_000) throw new Error('Corps de requête trop volumineux.')
    chunks.push(chunk as Buffer)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? (JSON.parse(raw) as T) : ({} as T)
}

// ─────────────────────────────────────────────────────────────────────────────
//  Temps réel
// ─────────────────────────────────────────────────────────────────────────────

const io = new SocketServer(httpServer, {
  cors: { origin: ORIGINS, credentials: true },
  // Le transport WebSocket suffit ; la scrutation longue ne sert qu'aux
  // réseaux qui bloquent les WebSockets, cas rare et mal adapté à une partie
  // d'échecs rapide de toute façon.
  transports: ['websocket', 'polling'],
  pingInterval: 20_000,
  pingTimeout: 25_000,
})

io.on('connection', (socket) => {
  let currentSlug: string | null = null

  socket.on(
    'join',
    async (payload: {
      slug: string
      name?: string
      token?: string
      clientId?: string
      /** Couleur demandée par l'hôte. Honorée si le siège est libre. */
      souhait?: 'w' | 'b'
      timeControl?: string
      rated?: boolean
    }) => {
      const slug = String(payload.slug ?? '').slice(0, 12)
      if (!slug) {
        socket.emit('error', { message: 'Identifiant de partie manquant.' })
        return
      }

      const identity = await verifySessionToken(payload.token)
      const name = identity?.username ?? sanitiseName(payload.name) ?? 'Invité'

      const timeControl = payload.timeControl
        ? (parseTimeControl(payload.timeControl) ?? { initial: 600, increment: 5 })
        : { initial: 600, increment: 5 }

      const room = roomFor(slug, { timeControl, rated: payload.rated ?? false })
      currentSlug = slug

      void socket.join(slug)

      const color = room.seat({
        userId: identity?.userId ?? null,
        clientId: sanitiseClientId(payload.clientId),
        name,
        rating: identity?.rating ?? null,
        socketId: socket.id,
        // Le souhait n'est pas une garantie : `seat` ne l'honore que si le
        // siège est libre. Un client qui demanderait une place déjà prise
        // reçoit l'autre, comme n'importe quel second arrivant.
        souhait: payload.souhait === 'w' || payload.souhait === 'b' ? payload.souhait : null,
      })

      socket.emit('joined', { color, snapshot: room.snapshot() })
      brancher(room)
    },
  )

  socket.on('move', (payload: { from: Square; to: Square; promotion?: PieceSymbol }) => {
    if (!currentSlug) return
    const room = rooms.get(currentSlug)
    if (!room) return
    const outcome = room.playMove(socket.id, payload)
    if (!outcome.ok) socket.emit('error', { message: outcome.reason })
  })

  socket.on('resign', () => withRoom(currentSlug, (room) => room.resign(socket.id)))
  socket.on('offerDraw', () => withRoom(currentSlug, (room) => room.offerDraw(socket.id)))
  socket.on('declineDraw', () => withRoom(currentSlug, (room) => room.declineDraw(socket.id)))
  socket.on('requestTakeback', () =>
    withRoom(currentSlug, (room) => room.requestTakeback(socket.id)),
  )
  socket.on('acceptTakeback', () =>
    withRoom(currentSlug, (room) => room.acceptTakeback(socket.id)),
  )
  socket.on('chat', (payload: { text?: string }) =>
    withRoom(currentSlug, (room) => room.sendChat(socket.id, String(payload?.text ?? ''))),
  )

  socket.on('disconnect', () => {
    if (!currentSlug) return
    rooms.get(currentSlug)?.disconnect(socket.id)
  })
})

function withRoom(slug: string | null, action: (room: GameRoom) => void): void {
  if (!slug) return
  const room = rooms.get(slug)
  if (room) action(room)
}

/** Ne garde qu'un identifiant de navigateur plausible. */
function sanitiseClientId(clientId: string | undefined): string | null {
  if (!clientId) return null
  const cleaned = clientId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40)
  return cleaned.length >= 8 ? cleaned : null
}

/** Nettoie un pseudo d'invité : pas de balises, pas de longueur déraisonnable. */
function sanitiseName(name: string | undefined): string | null {
  if (!name) return null
  const cleaned = name.replace(/[<>&"'`]/g, '').trim().slice(0, 20)
  return cleaned.length >= 2 ? cleaned : null
}

// ─────────────────────────────────────────────────────────────────────────────
//  Démarrage et arrêt
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Le moteur et le temps réel sont indépendants. Si Stockfish est absent —
  // installation partielle, binaire introuvable, machine sans compilateur —
  // les parties entre amis doivent quand même fonctionner. On démarre donc le
  // serveur dans tous les cas et on signale simplement le service manquant.
  let engineReady = false
  try {
    await pool.start()
    engineReady = true
  } catch (error) {
    console.warn('\n⚠  Le moteur d’analyse n’a pas démarré.')
    console.warn(`   ${error instanceof Error ? error.message : String(error)}`)
    console.warn('   Les parties en temps réel restent pleinement fonctionnelles.')
    console.warn('   L’analyse basculera automatiquement sur le moteur du navigateur.\n')
  }

  // Sans écouteur, une erreur de mise en écoute fait tomber le processus avec
  // une trace illisible. Le cas le plus fréquent est de loin le port occupé par
  // une instance précédente mal arrêtée : autant le dire clairement.
  httpServer.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`
✗ Le port ${PORT} est déjà utilisé.`)
      console.error('  Une autre instance du serveur tourne probablement déjà.')
      console.error(`  Sous Linux/macOS :  lsof -ti:${PORT} | xargs kill`)
      console.error(`  Sous Windows     :  netstat -ano | findstr :${PORT}
`)
    } else {
      console.error('✗ Erreur de mise en écoute :', error)
    }
    process.exit(1)
  })

  await reprendreLesSalons()

  httpServer.listen(PORT, () => {
    console.log(`✓ Serveur Le Coup Parfait à l’écoute sur le port ${PORT}`)
    console.log(`  origines autorisées : ${ORIGINS.join(', ')}`)
    console.log(`  moteur d’analyse : ${engineReady ? 'prêt' : 'indisponible'}`)
    console.log(`  tables de finales : ${isTablebaseEnabled() ? 'activées' : 'désactivées'}`)
    console.log(
      `  rappel du défi du jour : ${rappelsPossibles() ? `à ${process.env.DEFI_RAPPEL_HEURE ?? 18} h locales` : 'désactivé'}`,
    )
  })
}

/**
 * Les parties en cours, reprises là où le processus précédent les a laissées.
 *
 * **Le temps de l'arrêt est décompté**, et c'est un choix. Les pendules sont
 * tenues en horodatages absolus : la relecture calcule le temps restant à
 * l'instant présent, donc l'arrêt a coûté du temps à celui qui avait le trait.
 * C'est la règle des tournois en salle — la pendule d'un incident technique ne
 * se rend pas —, et c'est aussi la seule qui ne demande à personne de croire
 * le serveur sur la durée de sa propre panne. Un salon dont le drapeau est
 * tombé pendant l'arrêt se termine au temps dès la première seconde de la
 * surveillance, sans attendre que quiconque se reconnecte.
 *
 * Deux heures de fenêtre : au-delà, personne ne revient. Le reste est purgé,
 * sans quoi ces lignes-là ne disparaîtraient jamais — elles ne s'effacent
 * qu'à la fin d'une partie qui, elle, ne finira plus.
 */
async function reprendreLesSalons(): Promise<void> {
  const perimes = await purgerSalonsPerimes(FENETRE_REPRISE_MS)
  if (perimes > 0) console.log(`  salons périmés effacés : ${perimes}`)

  let repris = 0
  let illisibles = 0
  for (const ligne of await salonsAReprendre(FENETRE_REPRISE_MS)) {
    const room = GameRoom.restaurer(ligne.salon)
    if (!room) {
      illisibles++
      void oublierSalon(ligne.slug)
      continue
    }
    if (room.isFinished) {
      void oublierSalon(ligne.slug)
      continue
    }
    rooms.set(room.slug, room)
    brancher(room)
    repris++
  }

  if (repris > 0) console.log(`  parties en cours reprises : ${repris}`)
  if (illisibles > 0) console.warn(`  instantanés illisibles écartés : ${illisibles}`)
}

/**
 * Arrêt propre.
 *
 * `shutdown` **n'annule plus les parties**. Il les annulait, ce qui revenait à
 * dire qu'un redéploiement valait annulation pour tout le monde ; maintenant
 * que chaque salon est écrit en base à chaque coup, il suffit de prévenir et
 * de laisser partir. Le client se reconnecte déjà tout seul, il retrouvera son
 * salon reconstruit à l'identique.
 *
 * Le reste corrige un arrêt qui n'attendait rien : `io.close()` et
 * `httpServer.close()` prennent un rappel dont personne ne se souciait, et le
 * `process.exit(0)` qui suivait coupait les requêtes en vol. On les attend,
 * avec un plafond — un serveur qui refuse de s'arrêter doit finir par
 * s'arrêter quand même.
 */
let arretEnCours = false

async function shutdown(signal: string): Promise<void> {
  // Un garde-fou, pas une précaution de style : `uncaughtException` peut
  // survenir *pendant* l'arrêt, et deux `shutdown` concurrents libéreraient
  // la réserve deux fois.
  if (arretEnCours) return
  arretEnCours = true

  const debut = Date.now()
  console.log(`\n${signal} reçu — arrêt en cours…`)

  for (const room of rooms.values()) {
    if (!room.isFinished) {
      // Un message, et rien d'autre : la partie reste ouverte, son instantané
      // est déjà en base, et elle repartira d'elle-même au redémarrage.
      room.avertir('Le serveur redémarre, la partie reprend dans un instant.')
    }
    room.dispose()
  }

  disposeMaia()

  // Cinq secondes au plus. Au-delà, ce qui traîne traînera sans nous.
  await Promise.race([
    Promise.all([
      new Promise<void>((resolve) => io.close(() => resolve())),
      new Promise<void>((resolve) => httpServer.close(() => resolve())),
    ]),
    new Promise<void>((resolve) => setTimeout(resolve, 5000).unref?.()),
  ])

  await disposePool()
  console.log(`  arrêté en ${Date.now() - debut} ms`)
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

process.on('unhandledRejection', (reason) => {
  console.error('[promesse non gérée]', reason)
})

/**
 * Une exception synchrone ne doit pas emporter le serveur en silence.
 *
 * `uncaughtException` n'était pas écouté : une exception dans un rappel de
 * socket tuait le processus sans passer par `shutdown`, donc sans prévenir un
 * seul joueur et sans libérer un seul processus moteur. On journalise, puis on
 * sort par la porte — l'arrêt reste un arrêt, il n'est simplement plus muet.
 *
 * On ne continue **pas** après : l'état du processus n'est plus fiable, et le
 * superviseur (Docker, systemd) sait relancer. Ce qu'on gagne, c'est la trace
 * et le message aux joueurs.
 */
process.on('uncaughtException', (error) => {
  console.error('[exception non interceptée]', error)
  void shutdown('uncaughtException')
})

void main().catch((error: unknown) => {
  console.error('Démarrage impossible :', error)
  process.exit(1)
})

// ─────────────────────────────────────────────────────────────────────────────
//  Arènes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * La boucle des tournois.
 *
 * Tout le reste de l'application réagit à une requête ; une arène, elle, doit
 * avancer sans que personne ne la regarde — démarrer à l'heure dite, apparier,
 * clore. D'où cette boucle, qui vit ici parce que c'est le seul processus
 * informé de la fin des parties.
 *
 * **Elle suppose une seule instance du serveur.** Deux processus créeraient
 * deux fois les mêmes paires. Un verrou consultatif PostgreSQL autour de
 * l'appariement serait nécessaire avant toute mise à l'échelle.
 */
const ARENA_TICK_MS = 3000

/**
 * Au-delà, on considère qu'une partie d'arène n'existe plus.
 *
 * Un salon perdu au redémarrage laisserait sinon ses deux joueurs marqués « en
 * partie » jusqu'à la fin du tournoi. Le délai est large : une partie de trois
 * minutes plus l'incrément ne dépasse jamais dix minutes.
 */
const ARENA_STUCK_MS = 15 * 60_000

async function arenaTick(): Promise<void> {
  if (!(await hasRunning())) return

  for (const slug of await startDueTournaments()) {
    console.log(`[tournoi] ${slug} commence.`)
  }

  await releaseStuck(ARENA_STUCK_MS)

  for (const pairing of await pairWaiting()) {
    // Le salon est créé d'avance avec la bonne cadence : les deux joueurs y
    // arriveront par leur page de tournoi et s'y assoiront normalement.
    roomFor(pairing.gameSlug, {
      timeControl: { initial: pairing.initialTime, increment: pairing.increment },
      rated: false,
    })
    io.to(`arene:${pairing.tournamentSlug}`).emit('pairing', pairing)
  }

  for (const slug of await finishExpired()) {
    console.log(`[tournoi] ${slug} est terminé.`)
    io.to(`arene:${slug}`).emit('tournamentEnd', { slug })
  }
}

/**
 * Rapport d'erreur de la boucle : une fois, puis on se tait.
 *
 * La boucle bat toutes les trois secondes et sa première requête touche la base.
 * Sans base — c'est le cas ordinaire en développement, où l'on travaille sur les
 * pages sans lancer PostgreSQL — chaque tour recrachait une trace complète de
 * vingt lignes. En une minute, la sortie de `npm run dev` devenait illisible :
 * les lignes de Next, les redémarrages du serveur et les messages du moteur
 * disparaissaient sous les mêmes vingt lignes répétées.
 *
 * On garde donc l'empreinte de la dernière panne et on ne réécrit que lorsqu'elle
 * change. Une panne qui dure n'est pas une nouvelle information ; une panne
 * *différente* en est une, et celle-là s'affiche.
 *
 * Le rétablissement se dit aussi, sur une ligne : sans lui, on ne saurait pas
 * que la base est revenue, et l'on chercherait ailleurs.
 */
function signaleurDePanne(etiquette: string, aVide: string) {
  let derniere: string | null = null

  return {
    echec(error: unknown): void {
      const message = error instanceof Error ? error.message : String(error)
      // `ECONNREFUSED` arrive enveloppé dans une `DrizzleQueryError` dont le
      // message contient la requête entière. On le reconnaît pour le dire en
      // une ligne : « la base ne répond pas » est tout ce qu'on peut faire de
      // cette panne-là.
      const injoignable = /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|Connection terminated/i.test(
        message + String((error as { cause?: unknown } | null)?.cause ?? ''),
      )
      const empreinte = injoignable ? 'base-injoignable' : message

      if (empreinte === derniere) return
      derniere = empreinte

      if (injoignable) {
        console.warn(
          `[${etiquette}] base de données injoignable — ${aVide}\n` +
            '          Lance PostgreSQL, ou ignore : le reste de l’application n’en dépend pas.',
        )
        return
      }
      console.error(`[${etiquette}] en erreur :`, error)
    },

    reussite(): void {
      if (derniere === null) return
      console.log(`[${etiquette}] base de données de nouveau joignable.`)
      derniere = null
    },
  }
}

const pannesArene = signaleurDePanne('tournoi', 'la boucle des arènes tourne à vide.')

const arenaTimer = setInterval(() => {
  void arenaTick().then(pannesArene.reussite).catch(pannesArene.echec)
}, ARENA_TICK_MS)
arenaTimer.unref?.()

// ─────────────────────────────────────────────────────────────────────────────
//  Ménage quotidien
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Les purges, une fois par jour, à 4 h locales.
 *
 * `pruneSessions` existait déjà mais n'était appelée que depuis un bouton de
 * l'écran d'administration : elle ne tournait donc que si quelqu'un y pensait.
 * Le cache d'évaluations, lui, n'était purgé nulle part — l'écran de santé se
 * contentait de le regarder grossir. Deux tables qui montent sans jamais
 * redescendre, sur une plateforme dont l'intérêt est qu'on n'ait pas à s'en
 * occuper.
 *
 * Ici plutôt qu'ailleurs parce que c'est le seul processus toujours vivant, et
 * qu'il a déjà une boucle. Quatre heures du matin parce que c'est l'heure où
 * une suppression de plusieurs milliers de lignes ne gêne personne.
 *
 * `PURGE_HEURE` sert à éprouver le mécanisme sans attendre la nuit ; elle n'est
 * pas documentée dans `.env.example`, il n'y a aucune raison d'y toucher en
 * production.
 */
const PURGE_HEURE = Number(process.env.PURGE_HEURE ?? 4)

/** Jours au-delà desquels une évaluation en cache est effacée. */
const CONSERVATION_EVALUATIONS = Number(process.env.EVAL_CONSERVATION_JOURS ?? 90)

const pannesMenage = signaleurDePanne('ménage', 'les purges quotidiennes sont reportées.')

/** Dernier jour où le ménage a été fait, pour ne pas le refaire à chaque tour. */
let dernierMenage: string | null = null

async function menageQuotidien(): Promise<void> {
  const maintenant = new Date()
  if (maintenant.getHours() !== PURGE_HEURE) return

  // La date locale sert de jeton : la boucle passe soixante fois dans l'heure,
  // le ménage n'a lieu qu'une.
  const jour = maintenant.toDateString()
  if (jour === dernierMenage) return
  dernierMenage = jour

  const sessions = await pruneSessions()
  const evaluations = await pruneEvaluations(CONSERVATION_EVALUATIONS)
  const salons = await purgerSalonsPerimes(FENETRE_REPRISE_MS)

  console.log(
    `[ménage] sessions expirées : ${sessions} · évaluations de plus de ` +
      `${CONSERVATION_EVALUATIONS} jours : ${evaluations} · salons périmés : ${salons}`,
  )
}

// Une minute : assez fin pour attraper l'heure dite, assez large pour ne rien
// peser. La boucle des arènes bat vingt fois plus vite et n'a pas à porter ça.
const menageTimer = setInterval(() => {
  void menageQuotidien().then(pannesMenage.reussite).catch(pannesMenage.echec)
}, 60_000)
menageTimer.unref?.()

// ─────────────────────────────────────────────────────────────────────────────
//  Rappel du défi du jour
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Un quart d'heure entre deux passages.
 *
 * L'heure du rappel est donnée à l'heure près, pas à la minute : battre plus
 * vite ne rendrait le rappel ni plus juste ni plus utile, et la boucle
 * interroge la base à chaque tour. Un quart d'heure suffit aussi à rattraper
 * un redémarrage sans que personne ne s'en aperçoive.
 */
const RAPPEL_TICK_MS = 15 * 60_000

/** Même discrétion que la boucle des arènes : on ne répète pas la même panne. */
let dernierEchecRappel: string | null = null

if (rappelsPossibles()) {
  const rappelTimer = setInterval(() => {
    void rappelDuDefi()
      .then((envoyes) => {
        dernierEchecRappel = null
        if (envoyes > 0) console.log(`[défi] ${envoyes} rappel(s) envoyé(s).`)
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        if (message === dernierEchecRappel) return
        dernierEchecRappel = message
        console.error('[défi] rappel en erreur :', message)
      })
  }, RAPPEL_TICK_MS)
  rappelTimer.unref?.()
}
