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
  resultatAuDrapeau,
  speedCategory,
  stopClock,
  type ClockState,
  type GameResult,
  type GameStatus,
  type TimeControl,
} from '@coupparfait/core'

/**
 * Pourquoi un coup est refusé, en code et non en phrase.
 *
 * Le serveur ne connaît pas la langue de chaque joueur : il écrivait ses refus
 * en français, et le client les affichait tels quels, dans toutes les langues.
 * Le client traduit désormais le code — voir `CLES_D_ERREUR` dans
 * `apps/web/src/lib/game/useLiveGame.ts`, qui doit en connaître chaque valeur.
 */
export type RefusDeCoup = 'notAPlayer' | 'notPlaying' | 'notYourTurn' | 'flagged' | 'illegal'

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

/**
 * Ce que le salon annonce de lui-même dans le tchat.
 *
 * Ces messages étaient des phrases françaises, envoyées telles quelles à des
 * joueurs qui lisaient l'interface en japonais : le serveur ne sait pas quelle
 * langue lit chacun. Il envoie désormais un **code** et le nom concerné, que
 * le client traduit (`texteDuMessage` dans `apps/web/src/lib/game/useLiveGame.ts`,
 * section `systeme` des dictionnaires) — comme ses refus, voir `RefusDeCoup`.
 */
export type EvenementDuSalon =
  | 'joined'
  | 'disconnected'
  | 'declined'
  | 'left'
  | 'drawDeclined'
  | 'takeback'
  | 'hint'
  | 'noShow'
  | 'notReconnected'
  | 'idleAborted'
  | 'aborted'
  | 'restarting'

/**
 * Le texte français de chaque annonce, gardé dans `text`.
 *
 * Il ne sert plus à l'interface à jour, qui lit `code`. Il reste pour ce qui
 * ne connaît pas encore les codes : une page chargée avant le déploiement, et
 * les instantanés relus en base, dont les messages n'ont que `text`.
 */
const ANNONCES_FR: Record<EvenementDuSalon, (nom: string) => string> = {
  joined: (nom) => `${nom} rejoint la partie.`,
  disconnected: (nom) => `${nom} s’est déconnecté.`,
  declined: (nom) => `${nom} ne jouera pas. La partie est annulée.`,
  left: (nom) => `${nom} a quitté la partie.`,
  drawDeclined: () => 'Nulle refusée.',
  takeback: () => 'Coup repris.',
  hint: (nom) => `${nom || 'Un joueur'} a demandé un indice au moteur.`,
  noShow: (nom) => `${nom} n’est pas resté. La partie est annulée.`,
  notReconnected: (nom) => `${nom} ne s’est pas reconnecté.`,
  idleAborted: () => 'Personne n’a joué : la partie est annulée.',
  aborted: () => 'Partie annulée.',
  restarting: () => 'Le serveur redémarre, la partie reprend dans un instant.',
}

export interface ChatMessage {
  from: string
  text: string
  at: number
  system?: boolean
  /** Pour un message système : ce qu'il annonce. Absent des anciens messages. */
  code?: EvenementDuSalon
  /** Le joueur concerné par l'annonce, quand il y en a un. */
  name?: string
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
    w: { name: string; rating: number | null; connected: boolean; inscrit: boolean } | null
    b: { name: string; rating: number | null; connected: boolean; inscrit: boolean } | null
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

/**
 * L'instantané qu'on range en base pour survivre à un redémarrage.
 *
 * Volontairement distinct de `GameSnapshot`, qui est le format **du fil** : ce
 * dernier porte des durées restantes calculées pour l'instant présent, et une
 * durée restante ne se relit pas trois minutes plus tard. Ici la pendule est
 * gardée telle quelle, en horodatages absolus.
 *
 * `version` n'est pas de la cérémonie : ces lignes-là traversent un
 * déploiement par définition, donc un changement de code. Un instantané d'une
 * version qu'on ne sait plus lire est ignoré, et la partie perdue — ce qui est
 * exactement ce qui se passait avant, donc jamais une régression.
 */
export interface EtatPersistant {
  version: 1
  slug: string
  startFen: string | null
  moves: string[]
  lastMove: { from: Square; to: Square } | null
  status: GameStatus
  result: GameResult
  clock: ClockState
  /**
   * Les pendules d'avant chaque coup, pour la reprise de coup. Facultative :
   * un instantané écrit avant qu'elle existe se relit sans elle, et la reprise
   * retombe alors sur la pendule courante.
   */
  clockHistory?: ClockState[]
  timeControl: TimeControl
  rated: boolean
  startedAt: number | null
  chat: ChatMessage[]
  players: Record<Color, PersonneRangee | null>
}

/** Un joueur, sans ce qui appartient au processus : ses connexions. */
export type PersonneRangee = Pick<Participant, 'userId' | 'clientId' | 'name' | 'rating'>

function personneRangee(joueur: Participant | null): PersonneRangee | null {
  if (!joueur) return null
  const { userId, clientId, name, rating } = joueur
  return { userId, clientId, name, rating }
}

export type RoomEvent =
  | { type: 'state'; snapshot: GameSnapshot }
  | { type: 'move'; san: string; uci: string; snapshot: GameSnapshot }
  | { type: 'end'; status: GameStatus; result: GameResult; snapshot: GameSnapshot }
  | { type: 'chat'; message: ChatMessage }
  | { type: 'drawOffer'; from: Color }
  | { type: 'takebackRequest'; from: Color }
  | { type: 'error'; message: string }

/**
 * Délai après lequel un joueur déconnecté perd la partie.
 *
 * Soixante secondes, et **seulement pendant que l'adversaire attend** : voir
 * `delaiAbandon` et le veilleur plus bas. Ce plancher vaut pour le blitz, où
 * une minute d'absence est déjà une éternité pour celui qui est resté devant
 * l'échiquier.
 */
const ABANDON_DELAY_MS = 60_000

/**
 * Le même délai, mais proportionné à la cadence.
 *
 * Une minute est juste en blitz et absurde ailleurs : sur une partie de trente
 * minutes, on va chercher un café et l'on revient à une défaite par abandon.
 * Sur une partie sans limite — celle qu'on joue justement en plusieurs fois —
 * c'était pire encore : fermer l'onglet, c'était perdre.
 *
 * La règle : la moitié du temps initial, entre une minute et un quart d'heure.
 * Une cadence sans limite prend le plafond.
 */
function delaiAbandon(tc: TimeControl): number {
  const PLAFOND = 15 * 60_000
  if (tc.initial <= 0) return PLAFOND
  return Math.min(PLAFOND, Math.max(ABANDON_DELAY_MS, (tc.initial * 1000) / 2))
}

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
  /** Position de départ, `null` si c'est la position initiale. Voir `restaurer`. */
  readonly startFen: string | null

  private readonly chess: Chess
  private clock: ClockState
  /**
   * La pendule telle qu'elle était **avant** chaque coup joué, dans l'ordre.
   *
   * C'est ce qui rend la reprise de coup juste. Reculer la position de deux
   * demi-coups sans reculer la pendule laissait tourner la pendule de celui
   * qui venait de jouer, et ne rendait à personne le temps consommé pendant
   * que la demande attendait. Dépiler deux fois remet exactement la pendule
   * d'il y a deux demi-coups ; il ne reste qu'à la réancrer sur l'instant
   * présent.
   */
  private clockHistory: ClockState[] = []
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

  /**
   * L'horloge du salon.
   *
   * `Date.now()` par défaut, et c'est tout ce que le serveur en fait. Elle
   * s'injecte pour les tests : une pendule qui tombe se vérifie en avançant une
   * horloge factice, pas en attendant trois minutes.
   */
  private readonly now: () => number

  constructor(options: {
    slug: string
    timeControl: TimeControl
    rated: boolean
    startFen?: string
    now?: () => number
  }) {
    this.slug = options.slug
    this.timeControl = options.timeControl
    this.rated = options.rated
    this.startFen = options.startFen ?? null
    this.now = options.now ?? Date.now
    this.chess = new Chess(options.startFen, { skipValidation: true })
    this.clock = createClock(options.timeControl, this.now())

    // Le décompte part de la création, pas de l'arrivée des joueurs : c'est le
    // salon créé pour rien qu'il s'agit de ramasser.
    this.abandonAt = this.now() + IDLE_ABORT_MS
    this.idleTimer = setTimeout(() => {
      this.idleTimer = null
      if (this.isFinished || this.chess.history().length > 0) return
      this.abort('idleAborted')
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

  /**
   * Quelqu'un écoute-t-il déjà ce salon ?
   *
   * La couche socket n'abonne qu'une fois par salon — elle diffuse ensuite à la
   * pièce entière — et retenait ce fait dans un ensemble d'identifiants tenu à
   * côté. Cet ensemble n'était jamais purgé : un salon libéré puis recréé sous
   * le même identifiant se voyait déjà abonné, et n'abonnait donc personne.
   * Plus rien n'en sortait — ni coup, ni tchat, ni fin de partie —, chacun
   * gardant l'instantané reçu à l'arrivée, qui lui, part en direct.
   *
   * La réponse est ici parce que c'est ici qu'elle est vraie : `dispose()` vide
   * les auditeurs, un salon neuf n'en a aucun. Deux sources de vérité pour un
   * seul fait, c'était la seconde qui se périmait.
   */
  get hasSubscriber(): boolean {
    return this.listeners.size > 0
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
      /*
        Même navigateur, sans jeton valable.

        Ne s'appliquait qu'entre invités. Or le jeton présenté au serveur temps
        réel ne dure plus qu'un quart d'heure : un compte dont la connexion
        tombe à la vingtième minute revient sans identité, et ne retrouvait
        plus son siège — il regardait sa propre partie en spectateur pendant
        que sa pendule tournait. L'identifiant de navigateur est un secret
        aléatoire que seul ce navigateur connaît : c'est la même personne, au
        même échiquier, et le siège garde le compte, le nom et le classement
        d'origine. Un autre compte (`userId` différent) ne passe toujours pas.
      */
      const sameBrowser =
        participant.userId === null &&
        participant.clientId !== null &&
        seated.clientId === participant.clientId
      if (sameUser || sameBrowser) {
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

    this.system('joined', participant.name)

    // Les deux sièges occupés : la partie commence.
    if (this.players.w && this.players.b && this.status === 'waiting') {
      this.status = 'playing'
      this.startedAt = this.now()
      this.startFlagWatcher()
    }

    this.broadcastState()
    return free
  }

  /**
   * Garde un siège à quelqu'un qui n'est pas encore là.
   *
   * C'est l'appariement qui s'en sert : il choisit les deux joueurs et leurs
   * couleurs depuis la file d'attente, puis chacun ouvre la partie de son
   * côté. Sans réservation, le premier arrivé tirait sa couleur au sort et
   * celle annoncée par le serveur pouvait être fausse — ou un tiers qui
   * devinait l'identifiant prenait la place. Le siège est tenu au nom du
   * compte et du navigateur : `seat` le rend à l'arrivée comme à une
   * reconnexion.
   *
   * Le joueur réservé compte comme **déconnecté depuis maintenant** : s'il ne
   * vient jamais, l'abandon automatique de `veiller` annule la partie pour
   * celui qui, lui, est venu — sans coup joué, sans vainqueur.
   */
  reserver(
    color: Color,
    participant: {
      userId: string | null
      clientId: string | null
      name: string
      rating: number | null
    },
  ): void {
    if (this.players[color]) throw new Error(`Siège ${color} déjà occupé dans ${this.slug}.`)
    this.players[color] = {
      userId: participant.userId,
      clientId: participant.clientId,
      name: participant.name,
      rating: participant.rating,
      sockets: new Set(),
      connected: false,
      disconnectedAt: this.now(),
    }
    if (this.players.w && this.players.b && this.status === 'waiting') {
      this.status = 'playing'
      this.startedAt = this.now()
      this.startFlagWatcher()
    }
    this.broadcastState()
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
        player.disconnectedAt = this.now()
        this.system('disconnected', player.name)
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

  /**
   * Couleur occupée par un compte, connecté ou non.
   *
   * `colorOf` demande une connexion ouverte, ce qui ne convient pas à qui a
   * changé de page : sa place est gardée, mais il n'a plus de socket. C'est
   * pourtant exactement celui qu'on veut reconnaître — pour lui proposer de
   * revenir, ou pour le laisser abandonner sans avoir à rouvrir l'échiquier.
   */
  colorOfUser(userId: string): Color | null {
    for (const color of ['w', 'b'] as const) {
      if (this.players[color]?.userId === userId) return color
    }
    return null
  }

  /** Le joueur assis d'une couleur, pour ce que l'extérieur a besoin d'en dire. */
  playerAt(color: Color): { name: string; connected: boolean } | null {
    const player = this.players[color]
    return player ? { name: player.name, connected: player.connected } : null
  }

  get isEmpty(): boolean {
    return (this.players.w?.sockets.size ?? 0) === 0 && (this.players.b?.sockets.size ?? 0) === 0
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
  ): { ok: true } | { ok: false; reason: RefusDeCoup } {
    const color = this.colorOf(socketId)
    if (!color) return { ok: false, reason: 'notAPlayer' }
    if (this.status !== 'playing') return { ok: false, reason: 'notPlaying' }
    if (this.chess.turn() !== color) return { ok: false, reason: 'notYourTurn' }

    // Le temps a-t-il expiré avant même ce coup ?
    const now = this.now()
    const flagged = flaggedColor(this.clock, now)
    if (flagged) {
      this.tomberAuDrapeau(flagged)
      return { ok: false, reason: 'flagged' }
    }

    let played
    try {
      played = this.chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion ?? 'q',
      })
    } catch {
      return { ok: false, reason: 'illegal' }
    }

    this.lastMove = { from: played.from, to: played.to }
    // Une proposition de nulle ne survit pas au coup suivant.
    this.drawOfferFrom = null
    this.takebackFrom = null

    const firstMove = this.chess.history().length === 1
    // La partie a commencé : le compte à rebours d'annulation n'a plus lieu.
    if (firstMove) this.clearIdleTimer()
    // La pendule d'avant le coup, pour pouvoir le reprendre. Voir `clockHistory`.
    this.clockHistory.push(this.clock)
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

  /**
   * Quitter la partie sans être devant elle.
   *
   * On peut lancer une partie, changer d'écran, et ne plus jamais y revenir :
   * le salon reste alors ouvert, l'adversaire attend son coup, et la seule
   * façon d'en sortir était de rouvrir l'échiquier pour cliquer « Abandonner ».
   * L'accueil propose donc de le faire depuis la liste des parties en plan.
   *
   * Une partie où personne n'a joué s'**annule** au lieu de se perdre : il n'y
   * a pas de vainqueur d'une partie qui n'a pas commencé, et c'est déjà la
   * règle appliquée aux déconnexions prolongées.
   */
  quitter(color: Color): boolean {
    if (this.isFinished) return false
    const player = this.players[color]
    if (!player) return false

    if (this.chess.history().length === 0) {
      this.system('declined', player.name)
      this.finish('aborted', '*')
      return true
    }

    this.system('left', player.name)
    this.finish('resign', color === 'w' ? '0-1' : '1-0')
    return true
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
    this.system('drawDeclined')
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
    // Une partie finie ne se rejoue pas : accepter une reprise demandée juste
    // avant le mat aurait rouvert une position sur une partie déjà enregistrée.
    if (!color || this.status !== 'playing') return
    if (!this.takebackFrom || this.takebackFrom === color) return
    this.applyTakeback()
  }

  private applyTakeback(): void {
    this.chess.undo()
    this.chess.undo()
    this.takebackFrom = null
    const history = this.chess.history({ verbose: true })
    const last = history[history.length - 1]
    this.lastMove = last ? { from: last.from, to: last.to } : null

    /*
      La pendule recule avec la position.

      On dépile deux fois : la seconde valeur est la pendule d'avant le coup
      repris en premier, c'est-à-dire celle d'il y a deux demi-coups — avec le
      bon camp qui décompte, et sans le temps que l'adversaire a passé à
      réfléchir puis à répondre à la demande. Réancrée sur l'instant présent,
      elle repart de là. Faute d'historique (salon relu d'un instantané qui n'en
      avait pas), on garde les temps restants mais on redonne au moins le
      décompte au camp au trait : c'est lui qui réfléchit désormais.
    */
    const now = this.now()
    this.clockHistory.pop()
    const avant = this.clockHistory.pop()
    const running = this.chess.history().length === 0 ? null : this.chess.turn()
    this.clock = avant
      ? { ...avant, running, updatedAt: now }
      : { ...stopClock(this.clock, now), running, updatedAt: now }

    this.system('takeback')
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
      at: this.now(),
    }
    this.chat.push(message)
    if (this.chat.length > 200) this.chat.shift()
    this.emit({ type: 'chat', message })
  }

  /**
   * Annonce qu'un joueur a demandé un indice au moteur.
   *
   * L'indice n'est ni calculé ni autorisé ici : il l'est dans le navigateur de
   * celui qui le demande, et rien ne pourrait l'en empêcher — le même moteur
   * tourne dans l'onglet d'à côté. Ce que le salon peut faire, c'est le
   * **dire**, pour que l'autre l'apprenne au moment où ça se produit plutôt que
   * de le soupçonner en relisant la partie.
   *
   * Message système, comme les arrivées et les déconnexions : il n'est pas
   * attribuable à quelqu'un qui parle, il constate.
   *
   * Un seul par joueur et par partie. Répété à chaque clic, un joueur agacé
   * pourrait noyer le tchat de son adversaire — et surtout l'information est la
   * même : à partir du premier, la partie est assistée.
   */
  annoncerIndice(socketId: string): void {
    if (this.status !== 'playing') return
    const color = this.colorOf(socketId)
    if (!color) return

    if (this.indicesAnnonces.has(color)) return
    this.indicesAnnonces.add(color)

    const player = this.players[color]
    this.system('hint', player?.name)
  }

  /** Les camps dont l'indice a déjà été annoncé. Voir `annoncerIndice`. */
  private readonly indicesAnnonces = new Set<Color>()

  private system(code: EvenementDuSalon, name?: string): void {
    const message: ChatMessage = {
      from: 'Le Coup Parfait',
      text: ANNONCES_FR[code](name ?? ''),
      at: this.now(),
      system: true,
      code,
      ...(name ? { name } : {}),
    }
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
    this.flagTimer = setInterval(() => this.veiller(), 1000)
    // Un salon ne retient pas le processus : c'est le serveur HTTP qui le fait.
    this.flagTimer.unref?.()
  }

  /**
   * Le drapeau est tombé pour `flagged`.
   *
   * Article 6.9 des règles de la FIDE : la partie est perdue au temps **sauf**
   * si l'adversaire ne peut plus mater par aucune suite de coups légaux —
   * auquel cas elle est nulle. Un roi seul ne gagne pas au temps. Le statut
   * reste `timeout` dans les deux cas : c'est bien la pendule qui a fini la
   * partie, seul le résultat change.
   */
  private tomberAuDrapeau(flagged: Color): void {
    this.finish('timeout', resultatAuDrapeau(this.chess, flagged))
  }

  /**
   * Constate ce que le temps a fait : un drapeau tombé, une absence prolongée.
   *
   * C'est le corps du veilleur, qui l'appelle chaque seconde. Publique pour
   * pouvoir l'éprouver avec une horloge factice, sans attendre la seconde.
   */
  veiller(): void {
    if (this.status !== 'playing') return
    const now = this.now()

    const flagged = flaggedColor(this.clock, now)
    if (flagged) {
      this.tomberAuDrapeau(flagged)
      return
    }

    /*
        Abandon pour déconnexion prolongée — et seulement si quelqu'un attend.

        Le compte à rebours tournait dès qu'un joueur se déconnectait, quoi que
        fasse l'autre. Fermer l'application une minute suffisait donc à perdre
        une partie que personne n'était en train d'attendre : les deux joueurs
        partis, la partie se soldait quand même par un abandon, et il n'y avait
        aucun moyen d'y revenir. C'est le contraire de ce qu'un abandon
        automatique existe pour faire — il protège **celui qui reste**, il ne
        punit pas celui qui s'absente.

        Trois conditions, donc : le joueur est parti, l'adversaire est là, et
        le délai de la cadence est passé.
      */
    const limite = delaiAbandon(this.timeControl)
    for (const color of ['w', 'b'] as const) {
      const player = this.players[color]
      if (!player || player.connected || player.disconnectedAt === null) continue
      const adverse = this.players[color === 'w' ? 'b' : 'w']
      if (!adverse?.connected) continue
      if (now - player.disconnectedAt > limite) {
        // Une partie sans le moindre coup ne se gagne pas : elle s'annule.
        // Autrement, quelqu'un qui ouvre un lien puis referme son onglet
        // offrait une « Victoire ! » sur zéro demi-coup — et, en partie
        // classée, des points de classement pour rien.
        if (this.chess.history().length === 0) {
          this.system('noShow', player.name)
          this.finish('aborted', '*')
          return
        }
        this.system('notReconnected', player.name)
        this.finish('abandoned', color === 'w' ? '0-1' : '1-0')
        return
      }
    }
  }

  private finish(status: GameStatus, result: GameResult): void {
    if (this.isFinished) return
    this.clearIdleTimer()
    this.status = status
    this.result = result
    // Une proposition ou une demande en suspens n'a plus d'objet : l'écran
    // continuait sinon d'offrir « accepter » sur une partie finie.
    this.drawOfferFrom = null
    this.takebackFrom = null
    this.clock = stopClock(this.clock, this.now())
    if (this.flagTimer) {
      clearInterval(this.flagTimer)
      this.flagTimer = null
    }
    this.emit({ type: 'end', status, result, snapshot: this.snapshot() })
  }

  /**
   * Depuis combien de temps il ne s'est rien passé ici, en millisecondes.
   *
   * Sert au ménage. Un salon repris au démarrage que personne ne rejoint ne
   * finit jamais : ses joueurs sont déclarés déconnectés mais sans horodatage
   * — on ne fait pas perdre quelqu'un pour un redémarrage qu'il n'a pas
   * demandé —, donc l'abandon automatique ne se déclenche pas, et le
   * ramassage périodique ne prend que les parties **terminées**. Sans cette
   * mesure, il resterait en mémoire jusqu'au prochain arrêt.
   */
  get inactifDepuis(): number {
    return this.now() - Math.max(this.clock.updatedAt, this.startedAt ?? 0)
  }

  /** Termine la partie de l'extérieur (annulation). */
  abort(code: EvenementDuSalon = 'aborted'): void {
    this.system(code)
    this.finish('aborted', '*')
  }

  /**
   * Dit quelque chose aux joueurs sans toucher à la partie.
   *
   * C'est ce que l'arrêt du serveur appelle désormais. Il appelait `abort()`,
   * c'est-à-dire qu'un redéploiement annulait toutes les parties en cours ;
   * maintenant que le salon est écrit en base à chaque coup, il n'y a plus
   * rien à annuler — seulement à prévenir.
   */
  avertir(code: EvenementDuSalon): void {
    this.system(code)
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
    const now = this.now()
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
              /*
                Le nom vient d'un compte, ou d'un visiteur qui l'a tapé.

                Un invité choisit son nom d'affichage librement : rien ne
                l'empêche d'écrire le pseudo de quelqu'un d'autre. Tant qu'il
                s'agissait de l'afficher au-dessus de l'échiquier, c'était sans
                conséquence. Depuis que la liste des parties reconnaît les amis
                par leur pseudo, ça en a une — sans ce drapeau, n'importe qui
                pourrait faire apparaître « ton ami joue » dans ta liste. On
                expose le fait d'être inscrit, et jamais l'identifiant : il
                n'apparaît pas dans une route publique.
              */
              inscrit: this.players.w.userId !== null,
            }
          : null,
        b: this.players.b
          ? {
              name: this.players.b.name,
              rating: this.players.b.rating,
              connected: this.players.b.connected,
              inscrit: this.players.b.userId !== null,
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

  // ── Survie à un redémarrage ───────────────────────────────────────────────

  /**
   * Tout ce qu'il faut pour reconstruire ce salon dans un autre processus.
   *
   * Ce n'est pas `snapshot()`, et la différence est le cœur du mécanisme :
   * l'instantané envoyé au client porte le temps **restant**, calculé pour
   * l'instant présent, ce qui n'a plus aucun sens quinze secondes plus tard.
   * On écrit donc la pendule telle qu'elle est tenue ici — des horodatages
   * absolus —, si bien que la relecture décompte d'elle-même le temps passé
   * hors ligne.
   *
   * Les `sockets` n'y sont pas : elles appartiennent au processus qui meurt.
   * Les joueurs y reviennent déconnectés, et se reconnecteront.
   */
  etatPersistant(): EtatPersistant {
    return {
      version: 1,
      slug: this.slug,
      startFen: this.startFen,
      moves: this.chess.history(),
      lastMove: this.lastMove,
      status: this.status,
      result: this.result,
      clock: this.clock,
      clockHistory: this.clockHistory,
      timeControl: this.timeControl,
      rated: this.rated,
      startedAt: this.startedAt,
      chat: this.chat.slice(-50),
      players: {
        w: personneRangee(this.players.w),
        b: personneRangee(this.players.b),
      },
    }
  }

  /**
   * Reconstruit un salon à partir de son instantané.
   *
   * Les coups sont **rejoués**, pas restaurés : c'est la seule façon d'avoir
   * un `Chess` cohérent — historique, répétitions, roques, prise en passant.
   * Un coup illisible arrête la relecture ; le salon rendu est alors court
   * mais valide, ce qui vaut mieux qu'un salon impossible.
   *
   * Rend `null` si l'instantané n'est pas exploitable : mieux vaut une partie
   * perdue qu'un salon qui ment sur sa position.
   */
  static restaurer(brut: unknown, options: { now?: () => number } = {}): GameRoom | null {
    const etat = brut as EtatPersistant | null
    if (!etat || etat.version !== 1 || typeof etat.slug !== 'string') return null

    let salon: GameRoom
    try {
      salon = new GameRoom({
        slug: etat.slug,
        timeControl: etat.timeControl,
        rated: etat.rated,
        startFen: etat.startFen ?? undefined,
        now: options.now,
      })
      for (const san of etat.moves ?? []) salon.chess.move(san)
    } catch {
      return null
    }

    // Le compte à rebours d'annulation ne se rejoue pas : une partie reprise
    // n'est pas une partie qu'on vient de créer et que personne n'a rejointe.
    salon.clearIdleTimer()

    salon.status = etat.status
    salon.result = etat.result
    salon.clock = etat.clock
    // Un instantané d'avant l'historique des pendules n'en a pas : la reprise
    // de coup se contentera alors de la pendule courante. Voir `applyTakeback`.
    salon.clockHistory = Array.isArray(etat.clockHistory) ? etat.clockHistory : []
    salon.startedAt = etat.startedAt
    salon.lastMove = etat.lastMove
    salon.chat = Array.isArray(etat.chat) ? etat.chat : []
    for (const couleur of ['w', 'b'] as const) {
      const range = etat.players?.[couleur]
      if (!range) continue
      salon.players[couleur] = {
        ...range,
        sockets: new Set(),
        connected: false,
        // `null` et non « à l'instant » : un joueur absent depuis le
        // redémarrage n'a pas à être déclaré abandonnant une minute après,
        // alors qu'il n'a rien fait de mal. Le décompte repartira à sa
        // prochaine déconnexion, ou dès qu'on saura qu'il ne revient pas.
        disconnectedAt: null,
      }
    }

    // La surveillance du drapeau reprend : c'est elle qui constatera qu'une
    // pendule est tombée pendant l'arrêt, dès le premier tour de boucle.
    if (salon.status === 'playing') salon.startFlagWatcher()

    return salon
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
      endedAt: new Date(this.now()),
    }
  }
}
