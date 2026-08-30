/**
 * Une partie en direct.
 *
 * Règle fondamentale : **le serveur fait autorité**. Le navigateur propose un
 * coup, le serveur le valide avec chess.js, met à jour l'horloge à partir de
 * son propre horodatage, puis diffuse le nouvel état. Aucune confiance n'est
 * accordée au client — ni sur la légalité du coup, ni sur le temps écoulé, ni
 * sur le tour de jeu.
 *
 * Les pendules ne sont jamais décomptées par une minuterie : on stocke des
 * horodatages absolus et on calcule à la demande. Un serveur momentanément
 * ralenti ne fait donc perdre personne au temps.
 */

import { Chess } from 'chess.js'
import type { Color, Square, PieceSymbol } from 'chess.js'
import {
  applyMove,
  createClock,
  flaggedColor,
  remainingAt,
  speedCategory,
  stopClock,
  type ClockState,
  type GameResult,
  type GameStatus,
  type TimeControl,
} from '@coupparfait/core'

export interface Participant {
  /** Identifiant de compte, ou `null` pour un invité. */
  userId: string | null
  /**
   * Identifiant du navigateur, pour les invités.
   *
   * Le pseudo ne peut pas servir de clé : deux invités s'appellent tous les
   * deux « Invité » par défaut, et le second serait pris pour une reconnexion
   * du premier. Chaque navigateur engendre donc un identifiant aléatoire qu'il
   * conserve — ce qui permet aussi de retrouver sa place après un
   * rafraîchissement de page.
   */
  clientId: string | null
  name: string
  rating: number | null
  /** Identifiants de connexion : un joueur peut avoir plusieurs onglets. */
  sockets: Set<string>
  /** Vrai tant qu'au moins une connexion est ouverte. */
  connected: boolean
  /** Depuis quand le joueur est déconnecté, pour l'abandon automatique. */
  disconnectedAt: number | null
}

export interface ChatMessage {
  from: string
  text: string
  at: number
  system?: boolean
}

export interface GameSnapshot {
  slug: string
  fen: string
  moves: string[]
  lastMove: { from: Square; to: Square } | null
  turn: Color
  status: GameStatus
  result: GameResult
  players: {
    w: { name: string; rating: number | null; connected: boolean } | null
    b: { name: string; rating: number | null; connected: boolean } | null
  }
  clock: { w: number; b: number; running: Color | null } | null
  timeControl: TimeControl
  rated: boolean
  drawOfferFrom: Color | null
  takebackFrom: Color | null
  chat: ChatMessage[]
  startedAt: number | null
  /** Nombre de personnes qui regardent sans jouer. */
  spectators: number
  /**
   * Instant où la partie s'annulera si personne n'a encore joué.
   *
   * `null` dès le premier coup. Sert au décompte affiché : celui qui attend
   * doit savoir combien de temps il attend encore.
   */
  abandonAt: number | null
}

export type RoomEvent =
  | { type: 'state'; snapshot: GameSnapshot }
  | { type: 'move'; san: string; uci: string; snapshot: GameSnapshot }
  | { type: 'end'; status: GameStatus; result: GameResult; snapshot: GameSnapshot }
  | { type: 'chat'; message: ChatMessage }
  | { type: 'drawOffer'; from: Color }
  | { type: 'takebackRequest'; from: Color }
  | { type: 'error'; message: string }

/** Délai après lequel un joueur déconnecté perd la partie. */
const ABANDON_DELAY_MS = 60_000

/**
 * Délai au bout duquel une partie où personne n'a joué s'annule.
 *
 * Une adresse de partie s'envoie et s'oublie : sans cela, chaque lien créé et
 * jamais ouvert laisserait un salon vivant sur le serveur, et celui qui a
 * proposé resterait devant un échiquier qui n'a jamais commencé sans savoir
 * s'il doit attendre. Cinq minutes suffisent à ce que l'autre arrive.
 *
 * Réglable par `GAME_IDLE_ABORT_MS` : un cercle qui joue en correspondance
 * voudra plus long, et c'est aussi ce qui permet d'éprouver le mécanisme sans
 * attendre cinq minutes.
 */
const IDLE_ABORT_MS = Number(process.env.GAME_IDLE_ABORT_MS ?? 5 * 60 * 1000)

export class GameRoom {
  readonly slug: string
  readonly timeControl: TimeControl
  readonly rated: boolean

  private readonly chess: Chess
  private clock: ClockState
  private status: GameStatus = 'waiting'
  private result: GameResult = '*'
  private players: Record<Color, Participant | null> = { w: null, b: null }
  private chat: ChatMessage[] = []
  private drawOfferFrom: Color | null = null
  private takebackFrom: Color | null = null
  private startedAt: number | null = null
  private lastMove: { from: Square; to: Square } | null = null

  /**
   * Ceux qui regardent sans jouer.
   *
   * Le salon acceptait déjà un troisième arrivant — `seat` renvoie `null`
   * quand les deux places sont prises — mais personne ne le savait : ni les
   * joueurs, ni lui-même. On les compte pour pouvoir le dire.
   */
  private readonly spectators = new Set<string>()

  private readonly listeners = new Set<(event: RoomEvent) => void>()
  private flagTimer: ReturnType<typeof setInterval> | null = null
  /** Compte à rebours d'annulation, armé tant qu'aucun coup n'a été joué. */
  private idleTimer: ReturnType<typeof setTimeout> | null = null
  private readonly abandonAt: number

  constructor(options: { slug: string; timeControl: TimeControl; rated: boolean; startFen?: string }) {
    this.slug = options.slug
    this.timeControl = options.timeControl
    this.rated = options.rated
    this.chess = new Chess(options.startFen, { skipValidation: true })
    this.clock = createClock(options.timeControl, Date.now())

    // Le décompte part de la création, pas de l'arrivée des joueurs : c'est le
    // salon créé pour rien qu'il s'agit de ramasser.
    this.abandonAt = Date.now() + IDLE_ABORT_MS
    this.idleTimer = setTimeout(() => {
      this.idleTimer = null
      if (this.isFinished || this.chess.history().length > 0) return
      this.abort('Personne n’a joué : la partie est annulée.')
    }, IDLE_ABORT_MS)
    this.idleTimer.unref?.()
  }

  /** Désarme le compte à rebours : la partie a commencé, ou elle est finie. */
  private clearIdleTimer(): void {
    if (!this.idleTimer) return
    clearTimeout(this.idleTimer)
    this.idleTimer = null
  }

  // ── Abonnements ───────────────────────────────────────────────────────────

  subscribe(listener: (event: RoomEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(event: RoomEvent): void {
    for (const listener of this.listeners) listener(event)
  }

  // ── Joueurs ───────────────────────────────────────────────────────────────

  /**
   * Assoit un joueur. Retourne la couleur attribuée, ou `null` s'il ne peut
   * que regarder — une partie n'accueille que deux joueurs.
   */
  seat(participant: {
    /**
     * Couleur souhaitée par l'hôte, s'il en a choisi une.
     *
     * Honorée uniquement si le siège est libre : le souhait du premier arrivé
     * ne peut pas déloger quelqu'un, et le second joueur prend forcément ce qui
     * reste. `null` — ou « hasard » — laisse le tirage décider.
     */
    souhait?: Color | null
    userId: string | null
    clientId: string | null
    name: string
    rating: number | null
    socketId: string
  }): Color | null {
    // Reconnexion : on retrouve sa place plutôt que d'en prendre une nouvelle.
    for (const color of ['w', 'b'] as const) {
      const seated = this.players[color]
      if (!seated) continue
      const sameUser = participant.userId !== null && seated.userId === participant.userId
      const sameGuest =
        participant.userId === null &&
        seated.userId === null &&
        participant.clientId !== null &&
        seated.clientId === participant.clientId
      if (sameUser || sameGuest) {
        seated.sockets.add(participant.socketId)
        seated.connected = true
        seated.disconnectedAt = null
        this.broadcastState()
        return color
      }
    }

    const libres = (['w', 'b'] as const).filter((color) => this.players[color] === null)
    if (libres.length === 0) {
      // Les deux places sont prises : la personne regarde.
      this.spectators.add(participant.socketId)
      this.broadcastState()
      return null
    }

    /*
     * Le premier arrivant tire sa couleur au sort.
     *
     * Les sièges étaient attribués dans l'ordre `w` puis `b`, et l'ordre
     * d'arrivée n'a rien d'anodin : celui qui crée le lien est toujours le
     * premier à s'asseoir. Il jouait donc les Blancs à chaque partie, et son
     * invité les Noirs — avec le demi-avantage du trait d'un côté et jamais de
     * l'autre. Personne ne l'a choisi ; c'est une conséquence de l'ordre du
     * tableau, ce qui est la pire raison d'avoir un avantage.
     *
     * Quand il ne reste qu'un siège, il n'y a rien à tirer : le second joueur
     * prend ce qui est libre.
     *
     * Le tirage n'est plus qu'un défaut : l'hôte peut désormais demander une
     * couleur depuis l'écran de création. Le hasard le corrigeait sans le lui
     * rendre — c'était supprimer un privilège au lieu d'ouvrir un choix.
     */
    const souhaite = participant.souhait
    const free =
      souhaite && libres.includes(souhaite)
        ? souhaite
        : libres.length === 2
          ? Math.random() < 0.5
            ? 'w'
            : 'b'
          : libres[0]!

    this.players[free] = {
      userId: participant.userId,
      clientId: participant.clientId,
      name: participant.name,
      rating: participant.rating,
      sockets: new Set([participant.socketId]),
      connected: true,
      disconnectedAt: null,
    }

    this.system(`${participant.name} rejoint la partie.`)

    // Les deux sièges occupés : la partie commence.
    if (this.players.w && this.players.b && this.status === 'waiting') {
      this.status = 'playing'
      this.startedAt = Date.now()
      this.startFlagWatcher()
    }

    this.broadcastState()
    return free
  }

  /** Retire une connexion. Le joueur n'est perdu que s'il n'en a plus aucune. */
  disconnect(socketId: string): void {
    // Un spectateur qui s'en va ne déclenche rien d'autre qu'un décompte.
    if (this.spectators.delete(socketId)) {
      this.broadcastState()
      return
    }

    for (const color of ['w', 'b'] as const) {
      const player = this.players[color]
      if (!player?.sockets.has(socketId)) continue
      player.sockets.delete(socketId)
      if (player.sockets.size === 0) {
        player.connected = false
        player.disconnectedAt = Date.now()
        this.system(`${player.name} s’est déconnecté.`)
      }
      this.broadcastState()
    }
  }

  colorOf(socketId: string): Color | null {
    for (const color of ['w', 'b'] as const) {
      if (this.players[color]?.sockets.has(socketId)) return color
    }
    return null
  }

  get isEmpty(): boolean {
    return (
      (this.players.w?.sockets.size ?? 0) === 0 && (this.players.b?.sockets.size ?? 0) === 0
    )
  }

  get isFinished(): boolean {
    return this.status !== 'waiting' && this.status !== 'playing'
  }

  // ── Coups ─────────────────────────────────────────────────────────────────

  /**
   * Tente de jouer un coup au nom d'un joueur.
   * Toute la validation est ici : c'est le seul endroit qui a le droit de
   * modifier la position.
   */
  playMove(
    socketId: string,
    move: { from: Square; to: Square; promotion?: PieceSymbol },
  ): { ok: true } | { ok: false; reason: string } {
    const color = this.colorOf(socketId)
    if (!color) return { ok: false, reason: 'Tu n’es pas joueur dans cette partie.' }
    if (this.status !== 'playing') return { ok: false, reason: 'La partie n’est pas en cours.' }
    if (this.chess.turn() !== color) return { ok: false, reason: 'Ce n’est pas ton tour.' }

    // Le temps a-t-il expiré avant même ce coup ?
    const now = Date.now()
    const flagged = flaggedColor(this.clock, now)
    if (flagged) {
      this.finish('timeout', flagged === 'w' ? '0-1' : '1-0')
      return { ok: false, reason: 'Le temps est écoulé.' }
    }

    let played
    try {
      played = this.chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion ?? 'q',
      })
    } catch {
      return { ok: false, reason: 'Coup illégal.' }
    }

    this.lastMove = { from: played.from, to: played.to }
    // Une proposition de nulle ne survit pas au coup suivant.
    this.drawOfferFrom = null
    this.takebackFrom = null

    const firstMove = this.chess.history().length === 1
    // La partie a commencé : le compte à rebours d'annulation n'a plus lieu.
    if (firstMove) this.clearIdleTimer()
    this.clock = applyMove(this.clock, color, now, firstMove)

    this.emit({
      type: 'move',
      san: played.san,
      uci: `${played.from}${played.to}${played.promotion ?? ''}`,
      snapshot: this.snapshot(),
    })

    this.checkGameEnd()
    return { ok: true }
  }

  private checkGameEnd(): void {
    if (!this.chess.isGameOver()) return

    if (this.chess.isCheckmate()) {
      this.finish('checkmate', this.chess.turn() === 'w' ? '0-1' : '1-0')
    } else if (this.chess.isStalemate()) {
      this.finish('stalemate', '1/2-1/2')
    } else if (this.chess.isInsufficientMaterial()) {
      this.finish('insufficientMaterial', '1/2-1/2')
    } else if (this.chess.isThreefoldRepetition()) {
      this.finish('threefold', '1/2-1/2')
    } else {
      this.finish('fiftyMoves', '1/2-1/2')
    }
  }

  // ── Actions hors coups ────────────────────────────────────────────────────

  resign(socketId: string): void {
    const color = this.colorOf(socketId)
    if (!color || this.status !== 'playing') return
    this.finish('resign', color === 'w' ? '0-1' : '1-0')
  }

  offerDraw(socketId: string): void {
    const color = this.colorOf(socketId)
    if (!color || this.status !== 'playing') return

    // L'adversaire avait déjà proposé : les deux sont d'accord.
    if (this.drawOfferFrom && this.drawOfferFrom !== color) {
      this.finish('draw', '1/2-1/2')
      return
    }
    this.drawOfferFrom = color
    this.emit({ type: 'drawOffer', from: color })
    this.broadcastState()
  }

  declineDraw(socketId: string): void {
    const color = this.colorOf(socketId)
    if (!color || this.drawOfferFrom === color) return
    this.drawOfferFrom = null
    this.system('Nulle refusée.')
    this.broadcastState()
  }

  /**
   * Demande de reprise de coup.
   *
   * Accordée uniquement si l'adversaire l'accepte : sinon n'importe qui
   * pourrait annuler sa gaffe. On annule deux demi-coups pour rendre le trait
   * à celui qui a demandé.
   */
  requestTakeback(socketId: string): void {
    const color = this.colorOf(socketId)
    if (!color || this.status !== 'playing') return
    if (this.chess.history().length < 2) return

    if (this.takebackFrom && this.takebackFrom !== color) {
      this.applyTakeback()
      return
    }
    this.takebackFrom = color
    this.emit({ type: 'takebackRequest', from: color })
    this.broadcastState()
  }

  acceptTakeback(socketId: string): void {
    const color = this.colorOf(socketId)
    if (!color || !this.takebackFrom || this.takebackFrom === color) return
    this.applyTakeback()
  }

  private applyTakeback(): void {
    this.chess.undo()
    this.chess.undo()
    this.takebackFrom = null
    const history = this.chess.history({ verbose: true })
    const last = history[history.length - 1]
    this.lastMove = last ? { from: last.from, to: last.to } : null
    this.system('Coup repris.')
    this.broadcastState()
  }

  sendChat(socketId: string, text: string): void {
    const color = this.colorOf(socketId)
    const player = color ? this.players[color] : null
    const trimmed = text.trim().slice(0, 300)
    if (!trimmed) return

    const message: ChatMessage = {
      from: player?.name ?? 'Spectateur',
      text: trimmed,
      at: Date.now(),
    }
    this.chat.push(message)
    if (this.chat.length > 200) this.chat.shift()
    this.emit({ type: 'chat', message })
  }

  private system(text: string): void {
    const message: ChatMessage = { from: 'Le Coup Parfait', text, at: Date.now(), system: true }
    this.chat.push(message)
    if (this.chat.length > 200) this.chat.shift()
    this.emit({ type: 'chat', message })
  }

  // ── Pendules et fin de partie ─────────────────────────────────────────────

  /**
   * Surveille la chute du drapeau et les abandons.
   *
   * Un intervalle d'une seconde suffit : le temps réel est calculé à partir
   * d'horodatages, cette boucle ne fait que *constater* la fin.
   */
  private startFlagWatcher(): void {
    if (this.flagTimer) return
    this.flagTimer = setInterval(() => {
      if (this.status !== 'playing') return
      const now = Date.now()

      const flagged = flaggedColor(this.clock, now)
      if (flagged) {
        this.finish('timeout', flagged === 'w' ? '0-1' : '1-0')
        return
      }

      // Abandon pour déconnexion prolongée.
      for (const color of ['w', 'b'] as const) {
        const player = this.players[color]
        if (!player || player.connected || player.disconnectedAt === null) continue
        if (now - player.disconnectedAt > ABANDON_DELAY_MS) {
          // Une partie sans le moindre coup ne se gagne pas : elle s'annule.
          // Autrement, quelqu'un qui ouvre un lien puis referme son onglet
          // offrait une « Victoire ! » sur zéro demi-coup — et, en partie
          // classée, des points de classement pour rien.
          if (this.chess.history().length === 0) {
            this.system(`${player.name} n’est pas resté. La partie est annulée.`)
            this.finish('aborted', '*')
            return
          }
          this.system(`${player.name} ne s’est pas reconnecté.`)
          this.finish('abandoned', color === 'w' ? '0-1' : '1-0')
          return
        }
      }
    }, 1000)
  }

  private finish(status: GameStatus, result: GameResult): void {
    if (this.isFinished) return
    this.clearIdleTimer()
    this.status = status
    this.result = result
    this.clock = stopClock(this.clock, Date.now())
    if (this.flagTimer) {
      clearInterval(this.flagTimer)
      this.flagTimer = null
    }
    this.emit({ type: 'end', status, result, snapshot: this.snapshot() })
  }

  /** Termine la partie de l'extérieur (arrêt du serveur, annulation). */
  abort(reason = 'Partie annulée.'): void {
    this.system(reason)
    this.finish('aborted', '*')
  }

  dispose(): void {
    if (this.flagTimer) {
      clearInterval(this.flagTimer)
      this.flagTimer = null
    }
    this.clearIdleTimer()
    this.listeners.clear()
  }

  // ── État ──────────────────────────────────────────────────────────────────

  snapshot(): GameSnapshot {
    const now = Date.now()
    const remaining = remainingAt(this.clock, now)
    const timed = this.timeControl.initial > 0

    return {
      slug: this.slug,
      fen: this.chess.fen(),
      moves: this.chess.history(),
      lastMove: this.lastMove,
      turn: this.chess.turn(),
      status: this.status,
      result: this.result,
      players: {
        w: this.players.w
          ? {
              name: this.players.w.name,
              rating: this.players.w.rating,
              connected: this.players.w.connected,
            }
          : null,
        b: this.players.b
          ? {
              name: this.players.b.name,
              rating: this.players.b.rating,
              connected: this.players.b.connected,
            }
          : null,
      },
      clock: timed ? { w: remaining.w, b: remaining.b, running: this.clock.running } : null,
      timeControl: this.timeControl,
      rated: this.rated,
      drawOfferFrom: this.drawOfferFrom,
      takebackFrom: this.takebackFrom,
      chat: this.chat.slice(-50),
      startedAt: this.startedAt,
      spectators: this.spectators.size,
      // Le compte à rebours ne concerne que la partie qui n'a pas commencé.
      abandonAt: this.idleTimer ? this.abandonAt : null,
    }
  }

  broadcastState(): void {
    this.emit({ type: 'state', snapshot: this.snapshot() })
  }

  /** Données nécessaires à l'enregistrement en base à la fin de la partie. */
  toRecord() {
    return {
      slug: this.slug,
      moves: this.chess.history().join(' '),
      pgn: this.chess.pgn(),
      status: this.status,
      result: this.result,
      winner: this.result === '1-0' ? 'w' : this.result === '0-1' ? 'b' : null,
      whiteName: this.players.w?.name ?? 'Blancs',
      blackName: this.players.b?.name ?? 'Noirs',
      whiteId: this.players.w?.userId ?? null,
      blackId: this.players.b?.userId ?? null,
      whiteRating: this.players.w?.rating ?? null,
      blackRating: this.players.b?.rating ?? null,
      speed: speedCategory(this.timeControl),
      rated: this.rated,
      initialTime: this.timeControl.initial,
      increment: this.timeControl.increment,
      startedAt: this.startedAt ? new Date(this.startedAt) : null,
      endedAt: new Date(),
    }
  }
}
