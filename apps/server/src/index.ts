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
import type { Square, PieceSymbol } from 'chess.js'
import { parseTimeControl, type TimeControl } from '@coupparfait/core'
import { getPool, disposePool } from './engine/pool.ts'
import { analyseGamePositions, analysePosition } from './engine/analysis.ts'
import { isTablebaseEnabled } from './engine/tablebase.ts'
import { disposeVoices, isPiperAvailable, listPiperVoices, synthesise } from './tts/piper.ts'
import { GameRoom } from './realtime/gameRoom.ts'
import { persistFinishedGame } from './persistence.ts'
import { verifySessionToken } from './auth.ts'

const PORT = Number(process.env.SERVER_PORT ?? 3001)
const ORIGINS = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const pool = getPool()

/** Message unique, pour que le client reconnaisse la situation sans deviner. */
const ENGINE_UNAVAILABLE = 'Moteur d’analyse indisponible sur le serveur.'

// ─────────────────────────────────────────────────────────────────────────────
//  Salons de partie
// ─────────────────────────────────────────────────────────────────────────────

const rooms = new Map<string, GameRoom>()

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
      if (room.isEmpty && room.isFinished) {
        room.dispose()
        rooms.delete(slug)
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
          averageMs:
            pool.stats.searches > 0
              ? Math.round(pool.stats.totalMs / pool.stats.searches)
              : 0,
        },
        rooms: rooms.size,
        engineUsable: pool.usable,
        tablebase: isTablebaseEnabled(),
        uptimeSeconds: Math.round(process.uptime()),
      })
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

    // ── Analyse d'une position ─────────────────────────────────────────────
    if (url.pathname === '/analyse' && request.method === 'POST') {
      const body = await readJson<{
        fen?: string
        depth?: number
        multiPv?: number
        fresh?: boolean
      }>(request)

      if (!body.fen) return json(response, 400, { error: 'Le champ « fen » est requis.' })
      if (!pool.usable) return json(response, 503, { error: ENGINE_UNAVAILABLE })

      const analysis = await analysePosition({
        fen: body.fen,
        depth: body.depth,
        multiPv: body.multiPv,
        fresh: body.fresh,
        priority: 'interactive',
      })
      return json(response, 200, analysis)
    }

    // ── Analyse d'une partie complète, en flux ─────────────────────────────
    if (url.pathname === '/analyse/partie' && request.method === 'POST') {
      const body = await readJson<{
        moves?: string[]
        startFen?: string
        depth?: number
        multiPv?: number
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

      const analyses = await analyseGamePositions({
        moves: body.moves,
        startFen: body.startFen,
        depth: body.depth,
        multiPv: body.multiPv ?? 2,
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
    console.error('[http]', error)
    return json(response, 500, {
      error: error instanceof Error ? error.message : 'Erreur interne.',
    })
  }
})

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
      })

      socket.emit('joined', { color, snapshot: room.snapshot() })

      // Un seul abonnement par salon : on diffuse à la pièce entière.
      if (!subscribed.has(slug)) {
        subscribed.add(slug)
        room.subscribe((event) => {
          io.to(slug).emit(event.type, event)
          if (event.type === 'end') {
            void persistFinishedGame(room).catch((error: unknown) => {
              console.error('[persistance] enregistrement impossible :', error)
            })
          }
        })
      }
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

const subscribed = new Set<string>()

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

  httpServer.listen(PORT, () => {
    console.log(`✓ Serveur Le Coup Parfait à l’écoute sur le port ${PORT}`)
    console.log(`  origines autorisées : ${ORIGINS.join(', ')}`)
    console.log(`  moteur d’analyse : ${engineReady ? 'prêt' : 'indisponible'}`)
    console.log(`  tables de finales : ${isTablebaseEnabled() ? 'activées' : 'désactivées'}`)
  })
}

/** Arrêt propre : on prévient les joueurs avant de couper. */
async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal} reçu — arrêt en cours…`)
  for (const room of rooms.values()) {
    if (!room.isFinished) room.abort('Le serveur redémarre. La partie est mise en pause.')
    room.dispose()
  }
  io.close()
  httpServer.close()
  await disposePool()
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

process.on('unhandledRejection', (reason) => {
  console.error('[promesse non gérée]', reason)
})

void main().catch((error: unknown) => {
  console.error('Démarrage impossible :', error)
  process.exit(1)
})
