/**
 * Un processus Stockfish natif.
 *
 * Contrairement à la version WebAssembly du navigateur, celui-ci tourne à
 * pleine vitesse : plusieurs fils d'exécution, une grande table de hachage, et
 * le réseau de neurones NNUE complet. C'est lui qui produit les analyses
 * profondes de fin de partie.
 *
 * Le dialogue UCI est un protocole texte ligne à ligne. Le point délicat est la
 * **synchronisation** : après avoir envoyé une commande, il faut savoir quand
 * le moteur a fini. On utilise pour cela `isready` / `readyok`, la seule
 * poignée de main fiable du protocole.
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createInterface, type Interface } from 'node:readline'
import { EventEmitter } from 'node:events'
import {
  MultiPvCollector,
  goCommand,
  parseBestMove,
  positionCommand,
  type EngineLine,
  type PositionAnalysis,
  type UciMove,
} from '@coupparfait/core'

/**
 * Marge accordée à une recherche en profondeur, qui n'annonce aucune échéance.
 * Trente secondes : au-delà, la réserve plafonne de toute façon à `maxDepth`, et
 * aucune analyse honnête ne met ce temps sur le matériel visé.
 */
const GARDE_PROFONDEUR_MS = 30_000

/** Marge accordée en plus du `movetime` demandé. */
const GARDE_MOVETIME_MS = 5_000

/** Temps laissé au moteur pour obéir à `stop` avant qu'on le tue. */
const INSISTANCE_MS = 2_000

export interface EngineProcessOptions {
  /** Chemin du binaire Stockfish. */
  binary: string
  /**
   * Arguments passés au binaire. Vide pour Stockfish, qui n'en prend pas.
   *
   * Ils existent pour les tests : un faux moteur écrit en JavaScript se lance
   * par `binary: process.execPath, args: [chemin]`, ce qui marche sur les trois
   * systèmes — un script à shebang ne se lance pas sous Windows, et Node refuse
   * depuis la version 20 de lancer un `.cmd` sans passer par un interpréteur.
   */
  args?: string[]
  /** Fils d'exécution alloués à ce processus. */
  threads: number
  /** Table de hachage, en mégaoctets. */
  hashMb: number
  /** Nombre de lignes analysées simultanément. */
  multiPv?: number
}

export interface SearchRequest {
  fen: string
  moves?: UciMove[]
  depth?: number
  movetimeMs?: number
  nodes?: number
  multiPv?: number
  /** Rappelé à chaque approfondissement. */
  onUpdate?: (lines: EngineLine[], depth: number) => void
  signal?: AbortSignal
}

/**
 * Un processus moteur, occupé ou disponible.
 * Ne traite qu'une recherche à la fois : c'est la contrainte du protocole UCI.
 */
export class EngineProcess extends EventEmitter {
  private child: ChildProcessWithoutNullStreams | null = null
  private reader: Interface | null = null
  private ready = false
  private busy = false
  private readonly options: Required<EngineProcessOptions>

  /** File des résolutions de `isready`. */
  private readyWaiters: Array<() => void> = []
  /** Recherche en cours. */
  private current: {
    collector: MultiPvCollector
    fen: string
    resolve: (analysis: PositionAnalysis) => void
    reject: (error: Error) => void
    onUpdate?: (lines: EngineLine[], depth: number) => void
    startedAt: number
    bestMove: UciMove | null
    ponder: UciMove | null
  } | null = null

  /** Options UCI déjà appliquées, pour ne pas les réémettre inutilement. */
  private applied = new Map<string, string>()

  /** Délai de garde de la recherche en cours. Voir `armerLaGarde()`. */
  private garde: ReturnType<typeof setTimeout> | null = null

  constructor(options: EngineProcessOptions) {
    super()
    this.options = { multiPv: 1, args: [], ...options }
  }

  get isReady(): boolean {
    return this.ready
  }

  get isBusy(): boolean {
    return this.busy
  }

  // ── Démarrage ─────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    if (this.child) return

    const child = spawn(this.options.binary, this.options.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      // Le moteur ne doit pas empêcher le serveur de s'arrêter.
      detached: false,
    })
    this.child = child

    // Un `EventEmitter` sans écouteur « error » lève l'exception au lieu de la
    // signaler : on en pose donc un systématiquement, même si personne n'écoute.
    this.on('error', () => {})

    child.on('error', (error) => {
      this.ready = false
      this.emit('error', error)
      this.failCurrent(new Error(`Le moteur s’est arrêté : ${error.message}`))
    })

    child.on('exit', (code, signal) => {
      this.ready = false
      this.child = null
      this.emit('exit', { code, signal })
      this.failCurrent(new Error(`Le moteur s’est terminé (code ${code ?? signal}).`))
    })

    // Stockfish écrit ses avertissements sur la sortie d'erreur ; on les relaie
    // plutôt que de les perdre, ils expliquent souvent un réseau NNUE manquant.
    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim()
      if (text) this.emit('stderr', text)
    })

    this.reader = createInterface({ input: child.stdout })
    this.reader.on('line', (line) => this.handleLine(line.trim()))

    // Poignée de main UCI.
    await this.handshake()

    this.setOption('Threads', this.options.threads)
    this.setOption('Hash', this.options.hashMb)
    this.setOption('MultiPV', this.options.multiPv)
    // Sans « Ponder », le moteur ne réfléchit pas pendant le tour adverse : c'est
    // ce qu'on veut pour un service d'analyse, où chaque requête est isolée.
    this.setOption('Ponder', false)
    // Les probabilités victoire/nulle/défaite normalisées enrichissent l'analyse.
    this.setOption('UCI_ShowWDL', true)
    await this.sync()
    this.ready = true
  }

  private handshake(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(
            `Stockfish n’a pas répondu. Vérifie que le binaire existe : ${this.options.binary}`,
          ),
        )
      }, 15_000)

      const onUciOk = () => {
        clearTimeout(timeout)
        this.off('error', onError)
        resolve()
      }

      // Binaire introuvable ou non exécutable : inutile d'attendre quinze
      // secondes, l'erreur de lancement arrive immédiatement.
      const onError = (error: Error) => {
        clearTimeout(timeout)
        this.off('uciok', onUciOk)
        reject(
          new Error(
            `Stockfish est introuvable ou illisible : ${this.options.binary} (${error.message})`,
          ),
        )
      }

      this.once('uciok', onUciOk)
      this.once('error', onError)
      this.send('uci')
    })
  }

  /** Attend que le moteur ait digéré toutes les commandes envoyées. */
  sync(): Promise<void> {
    return new Promise((resolve) => {
      this.readyWaiters.push(resolve)
      this.send('isready')
    })
  }

  setOption(name: string, value: string | number | boolean): void {
    const serialised = String(value)
    if (this.applied.get(name) === serialised) return
    this.applied.set(name, serialised)
    this.send(`setoption name ${name} value ${serialised}`)
  }

  /** Réinitialise l'état interne entre deux parties sans rapport. */
  async newGame(): Promise<void> {
    this.send('ucinewgame')
    await this.sync()
  }

  private send(command: string): void {
    this.child?.stdin.write(`${command}\n`)
  }

  // ── Recherche ─────────────────────────────────────────────────────────────

  async search(request: SearchRequest): Promise<PositionAnalysis> {
    if (!this.child) await this.start()
    if (this.busy) throw new Error('Ce processus moteur est déjà occupé.')

    this.busy = true
    const multiPv = Math.max(1, Math.min(12, request.multiPv ?? 1))
    this.setOption('MultiPV', multiPv)

    return new Promise<PositionAnalysis>((resolve, reject) => {
      if (request.signal?.aborted) {
        this.busy = false
        reject(new Error('Analyse annulée'))
        return
      }

      this.current = {
        collector: new MultiPvCollector(request.fen),
        fen: request.fen,
        resolve,
        reject,
        onUpdate: request.onUpdate,
        startedAt: Date.now(),
        bestMove: null,
        ponder: null,
      }

      // On ne *coupe* pas la garde à l'abandon, on la raccourcit : après un
      // `stop`, un moteur en vie répond `bestmove` dans la seconde. S'il ne
      // répond pas non plus à ça, c'est exactement le cas qu'on cherche.
      const onAbort = () => {
        this.send('stop')
        this.armerLaGarde(INSISTANCE_MS)
      }
      request.signal?.addEventListener('abort', onAbort, { once: true })

      this.send(positionCommand(request.fen, request.moves ?? []))
      this.send(
        goCommand({
          depth: request.depth,
          movetimeMs: request.movetimeMs,
          nodes: request.nodes,
        }),
      )

      // Après le `go`, et pas avant : c'est de la réponse à celui-ci qu'on se
      // garde. Une recherche en `movetime` a une échéance annoncée, on lui
      // laisse cinq secondes de marge ; une recherche en profondeur n'en a
      // aucune, d'où les trente secondes.
      this.armerLaGarde(
        request.movetimeMs ? request.movetimeMs + GARDE_MOVETIME_MS : GARDE_PROFONDEUR_MS,
      )
    })
  }

  /**
   * Le délai de garde de la recherche en cours.
   *
   * `search()` posait `busy = true` et attendait `bestmove` sans échéance :
   * seule la poignée de main en avait une. Un Stockfish qui ne répond plus —
   * bloqué sur une lecture NNUE, tué par le gestionnaire de mémoire, ou
   * simplement suspendu — restait donc occupé **pour toujours**. La réserve
   * passait de deux processus à un, puis à zéro, sans jamais se rétablir, et
   * `/health` continuait d'annoncer une disponibilité qui décroissait sans
   * qu'on sache pourquoi.
   *
   * À l'échéance on demande poliment (`stop`), puis on tue. Le redémarrage est
   * déjà écrit : l'événement `exit` du processus enfant est écouté par la
   * réserve, qui relance après deux secondes.
   */
  private armerLaGarde(delaiMs: number): void {
    this.annulerLaGarde()
    this.garde = setTimeout(() => {
      if (!this.current) return
      this.send('stop')
      this.garde = setTimeout(() => {
        if (!this.current) return
        // L'ordre compte : on rejette avec la vraie raison avant de tuer,
        // sinon le gestionnaire `exit` rejetterait le premier, avec un message
        // qui ne dirait pas ce qui s'est passé.
        this.failCurrent(new Error('Le moteur n’a pas répondu : il a été relancé.'))
        this.emit('relance')
        this.child?.kill('SIGKILL')
      }, INSISTANCE_MS)
      this.garde.unref?.()
    }, delaiMs)
    this.garde.unref?.()
  }

  private annulerLaGarde(): void {
    if (this.garde) clearTimeout(this.garde)
    this.garde = null
  }

  stop(): void {
    this.send('stop')
  }

  // ── Réception ─────────────────────────────────────────────────────────────

  private handleLine(line: string): void {
    if (!line) return

    if (line === 'uciok') {
      this.emit('uciok')
      return
    }

    if (line === 'readyok') {
      const waiters = this.readyWaiters
      this.readyWaiters = []
      for (const waiter of waiters) waiter()
      return
    }

    if (line.startsWith('info')) {
      const current = this.current
      if (!current) return
      if (current.collector.ingest(line)) {
        current.onUpdate?.(current.collector.result(), current.collector.depth())
      }
      return
    }

    if (line.startsWith('bestmove')) {
      const parsed = parseBestMove(line)
      const current = this.current
      if (!current) return
      current.bestMove = parsed?.best ?? null
      current.ponder = parsed?.ponder ?? null
      this.finish()
      return
    }
  }

  private finish(): void {
    const current = this.current
    if (!current) return
    this.annulerLaGarde()
    this.current = null
    this.busy = false

    const lines = current.collector.result()
    current.resolve({
      fen: current.fen,
      depth: current.collector.depth(),
      lines,
      bestMove: current.bestMove ?? lines[0]?.pv[0] ?? null,
      ponder: current.ponder,
      timeMs: Date.now() - current.startedAt,
      source: 'server',
    })
    this.emit('free')
  }

  private failCurrent(error: Error): void {
    const current = this.current
    this.annulerLaGarde()
    this.current = null
    this.busy = false
    current?.reject(error)
  }

  // ── Arrêt ─────────────────────────────────────────────────────────────────

  async dispose(): Promise<void> {
    this.failCurrent(new Error('Moteur arrêté'))
    this.reader?.close()
    this.reader = null
    if (this.child) {
      this.send('quit')
      // Laisse une seconde au moteur pour sortir proprement, puis on insiste.
      const child = this.child
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          child.kill('SIGKILL')
          resolve()
        }, 1000)
        child.once('exit', () => {
          clearTimeout(timer)
          resolve()
        })
      })
      this.child = null
    }
    this.ready = false
  }
}
