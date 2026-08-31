'use client'

/**
 * Client Stockfish WebAssembly.
 *
 * Le moteur tourne dans un *Web Worker* : il peut donc calculer des millions de
 * positions par seconde sans jamais bloquer l'interface. Ce module encapsule le
 * dialogue UCI derrière des promesses.
 *
 * **Choix de la variante.** Par défaut on charge la version *mono-fil*. C'est
 * un choix délibéré : la version multi-fils est plus rapide sur le papier, mais
 * les fils d'exécution d'Emscripten reposent sur des *workers imbriqués* que
 * plusieurs environnements refusent de créer — navigateurs intégrés, vues web
 * d'applications mobiles, certaines extensions — même quand l'isolation
 * d'origine croisée est correctement configurée. Un moteur qui ne démarre pas
 * est infiniment pire qu'un moteur trois fois plus lent.
 *
 * Le multi-fils reste disponible en option (`preferThreads`), avec **repli
 * automatique** sur le mono-fil en cas d'échec.
 *
 * Le moteur du navigateur ne sert qu'à l'analyse instantanée et aux adversaires
 * artificiels. L'analyse profonde d'une partie passe par le Stockfish natif du
 * serveur, incomparablement plus puissant.
 */

import type { EngineLine, PositionAnalysis, Score, UciMove } from '@coupparfait/core'
import { MultiPvCollector, goCommand, parseBestMove, positionCommand } from '@coupparfait/core'

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'searching' | 'error'

export interface EngineProgress {
  percent: number
  loaded: number
  total: number
  speedText: string
  etaText: string
}

export interface SearchOptions {
  fen: string
  /** Coups joués depuis `fen`, pour que le moteur détecte les répétitions. */
  moves?: UciMove[]
  depth?: number
  movetimeMs?: number
  nodes?: number
  multiPv?: number
  /** Rappelé à chaque approfondissement — c'est ce qui anime la barre d'éval. */
  onUpdate?: (lines: EngineLine[], depth: number) => void
  signal?: AbortSignal
}

interface PendingSearch {
  resolve: (analysis: PositionAnalysis) => void
  reject: (error: Error) => void
  collector: MultiPvCollector
  fen: string
  onUpdate?: (lines: EngineLine[], depth: number) => void
  startedAt: number
}

/** Vrai si le navigateur autorise le moteur multi-fils. */
export function isCrossOriginIsolated(): boolean {
  return typeof globalThis.crossOriginIsolated === 'boolean' && globalThis.crossOriginIsolated
}

export class EngineClient {
  private worker: Worker | null = null
  private status: EngineStatus = 'idle'
  private readyPromise: Promise<void> | null = null
  private pending: PendingSearch | null = null
  private optionsApplied = new Map<string, string>()
  private readonly listeners = new Set<(status: EngineStatus) => void>()
  private progressListener: ((progress: EngineProgress) => void) | null = null
  private lastBestMove: UciMove | null = null
  private lastPonder: UciMove | null = null
  /** File d'attente : on ne lance jamais deux recherches en parallèle. */
  private queue: Promise<unknown> = Promise.resolve()

  /** Vrai si le moteur tourne effectivement en multi-fils. */
  private threaded = false
  /** Empêche de boucler indéfiniment entre les deux variantes. */
  private fallbackUsed = false

  constructor(
    private readonly config: {
      threads?: number
      hashMb?: number
      /**
       * Tente la variante multi-fils. Repli automatique sur le mono-fil si
       * elle refuse de démarrer.
       */
      preferThreads?: boolean
    } = {},
  ) {}

  /** Indique si le moteur exploite plusieurs fils d'exécution. */
  isThreaded(): boolean {
    return this.threaded
  }

  // ── Cycle de vie ──────────────────────────────────────────────────────────

  /** Démarre le moteur. Appels multiples sans effet. */
  async start(): Promise<void> {
    if (this.readyPromise) return this.readyPromise

    this.readyPromise = new Promise<void>((resolve, reject) => {
      try {
        const wantThreads =
          this.config.preferThreads === true && isCrossOriginIsolated() && !this.fallbackUsed
        this.threaded = wantThreads
        const script = wantThreads
          ? '/engine/stockfish-18-lite.js'
          : '/engine/stockfish-18-lite-single.js'

        this.setStatus('loading')
        const worker = new Worker(script)
        this.worker = worker

        worker.onerror = (event) => {
          // Échec de la variante multi-fils : on retente en mono-fil plutôt que
          // de laisser l'utilisateur sans moteur du tout.
          if (wantThreads && !this.fallbackUsed) {
            console.warn(
              '[moteur] la variante multi-fils a échoué, repli sur le mono-fil :',
              event.message,
            )
            this.fallbackUsed = true
            this.threaded = false
            worker.terminate()
            this.worker = null
            this.readyPromise = null
            this.uciReady = null
            this.start().then(resolve, reject)
            return
          }
          this.setStatus('error')
          reject(new Error(`Le moteur n’a pas pu démarrer : ${event.message}`))
        }

        worker.onmessage = (event: MessageEvent) => {
          this.handleLine(String(event.data))
        }

        // Le moteur sait signaler la progression du téléchargement du WASM :
        // sept mégaoctets, autant montrer une barre plutôt qu'un écran figé.
        if (typeof MessageChannel !== 'undefined') {
          const channel = new MessageChannel()
          channel.port1.onmessage = (event: MessageEvent) => {
            const data = event.data as Partial<EngineProgress> | undefined
            if (data && typeof data.percent === 'number') {
              this.progressListener?.({
                percent: data.percent,
                loaded: data.loaded ?? 0,
                total: data.total ?? 0,
                speedText: data.speedText ?? '',
                etaText: data.etaText ?? '',
              })
            }
          }
          worker.postMessage({ progressPort: channel.port2 }, [channel.port2])
        }

        // Poignée de main UCI.
        this.uciReady = resolve
        worker.postMessage('uci')

        // Garde-fou : sur une connexion très lente, on préfère un message clair
        // à une attente indéfinie.
        setTimeout(() => {
          if (this.status === 'loading') {
            this.setStatus('error')
            reject(new Error('Le moteur met trop de temps à démarrer.'))
          }
        }, 90_000)
      } catch (error) {
        this.setStatus('error')
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })

    return this.readyPromise
  }

  private uciReady: (() => void) | null = null

  /** Arrête le moteur et libère la mémoire. */
  terminate(): void {
    this.pending?.reject(new Error('Moteur arrêté'))
    this.pending = null
    try {
      this.worker?.postMessage('quit')
    } catch {
      // Le worker peut déjà être mort ; sans importance.
    }
    this.worker?.terminate()
    this.worker = null
    this.readyPromise = null
    this.optionsApplied.clear()
    this.setStatus('idle')
  }

  onStatusChange(listener: (status: EngineStatus) => void): () => void {
    this.listeners.add(listener)
    listener(this.status)
    return () => this.listeners.delete(listener)
  }

  onProgress(listener: (progress: EngineProgress) => void): void {
    this.progressListener = listener
  }

  getStatus(): EngineStatus {
    return this.status
  }

  private setStatus(status: EngineStatus): void {
    this.status = status
    for (const listener of this.listeners) listener(status)
  }

  // ── Options UCI ───────────────────────────────────────────────────────────

  /** Applique une option, en évitant de la renvoyer si elle n'a pas changé. */
  setOption(name: string, value: string | number | boolean): void {
    const serialised = String(value)
    if (this.optionsApplied.get(name) === serialised) return
    this.optionsApplied.set(name, serialised)
    this.send(`setoption name ${name} value ${serialised}`)
  }

  /** Applique une série d'options d'un coup. */
  setOptions(options: Array<[string, string | number | boolean]>): void {
    for (const [name, value] of options) this.setOption(name, value)
  }

  /** Réinitialise l'état interne du moteur — à faire entre deux parties. */
  newGame(): void {
    this.send('ucinewgame')
    this.send('isready')
  }

  private send(command: string): void {
    this.worker?.postMessage(command)
  }

  // ── Recherche ─────────────────────────────────────────────────────────────

  /**
   * Analyse une position.
   *
   * Les appels sont sérialisés : un moteur UCI ne traite qu'une recherche à la
   * fois, et rien n'est plus déroutant que deux analyses dont les résultats
   * s'entremêlent.
   */
  analyse(options: SearchOptions): Promise<PositionAnalysis> {
    const run = () => this.runSearch(options)
    const result = this.queue.then(run, run)
    // La file ne doit jamais rester bloquée sur un rejet.
    this.queue = result.catch(() => undefined)
    return result
  }

  private runSearch(options: SearchOptions): Promise<PositionAnalysis> {
    return new Promise<PositionAnalysis>((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Moteur non démarré'))
        return
      }
      if (options.signal?.aborted) {
        reject(new DOMException('Analyse annulée', 'AbortError'))
        return
      }

      // Vingt lignes, et non plus dix. Le plafond servait à borner un coût, et
      // il bornait surtout la faiblesse des premiers niveaux : un adversaire de
      // 250 Elo doit pouvoir choisir un coup que le moteur classe quinzième,
      // sans quoi il tire au sort parmi dix coups raisonnables et joue comme un
      // joueur de club. Le coût, lui, est nul là où ça compte — ces niveaux
      // cherchent à un demi-coup de profondeur.
      const multiPv = Math.max(1, Math.min(20, options.multiPv ?? 1))
      this.setOption('MultiPV', multiPv)
      // `Threads` n'a de sens que sur la variante multi-fils ; l'envoyer à la
      // version mono-fil provoque une erreur du moteur.
      if (this.threaded && this.config.threads) {
        this.setOption('Threads', this.config.threads)
      }
      if (this.config.hashMb) this.setOption('Hash', this.config.hashMb)

      const collector = new MultiPvCollector(options.fen)
      this.pending = {
        resolve,
        reject,
        collector,
        fen: options.fen,
        onUpdate: options.onUpdate,
        startedAt: performance.now(),
      }
      this.lastBestMove = null
      this.lastPonder = null

      const onAbort = () => {
        this.send('stop')
      }
      options.signal?.addEventListener('abort', onAbort, { once: true })

      this.setStatus('searching')
      this.send(positionCommand(options.fen, options.moves ?? []))
      this.send(
        goCommand({
          depth: options.depth,
          movetimeMs: options.movetimeMs,
          nodes: options.nodes,
        }),
      )
    })
  }

  /** Interrompt la recherche en cours ; le meilleur coup trouvé est conservé. */
  stop(): void {
    this.send('stop')
  }

  // ── Réception ─────────────────────────────────────────────────────────────

  private handleLine(line: string): void {
    if (!line) return

    if (line === 'uciok') {
      this.send('isready')
      return
    }

    if (line === 'readyok') {
      if (this.status === 'loading') {
        this.setStatus('ready')
        this.uciReady?.()
        this.uciReady = null
      }
      return
    }

    if (line.startsWith('info')) {
      const pending = this.pending
      if (!pending) return
      if (pending.collector.ingest(line)) {
        pending.onUpdate?.(pending.collector.result(), pending.collector.depth())
      }
      return
    }

    if (line.startsWith('bestmove')) {
      const parsed = parseBestMove(line)
      this.lastBestMove = parsed?.best ?? null
      this.lastPonder = parsed?.ponder ?? null
      this.finishSearch()
      return
    }
  }

  private finishSearch(): void {
    const pending = this.pending
    if (!pending) return
    this.pending = null
    this.setStatus('ready')

    const lines = pending.collector.result()
    pending.resolve({
      fen: pending.fen,
      depth: pending.collector.depth(),
      lines,
      bestMove: this.lastBestMove ?? lines[0]?.pv[0] ?? null,
      ponder: this.lastPonder,
      timeMs: Math.round(performance.now() - pending.startedAt),
      source: 'client',
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Instance partagée
// ─────────────────────────────────────────────────────────────────────────────

let shared: EngineClient | null = null

/**
 * Moteur unique partagé par toute l'application.
 *
 * Instancier plusieurs Stockfish reviendrait à charger plusieurs fois sept
 * mégaoctets de WebAssembly et à se disputer les cœurs du processeur.
 */
export function getEngine(options: { preferThreads?: boolean } = {}): EngineClient {
  if (!shared) {
    const cores = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency ?? 4) : 4
    shared = new EngineClient({
      // On laisse toujours au moins deux cœurs à l'interface et au rendu 3D.
      threads: Math.max(1, Math.min(4, cores - 2)),
      hashMb: 64,
      preferThreads: options.preferThreads ?? false,
    })
  }
  return shared
}

/** Détruit l'instance partagée — utile aux tests et au changement de page lourd. */
export function disposeEngine(): void {
  shared?.terminate()
  shared = null
}

/** Score neutre, utilisé tant que le moteur n'a rien renvoyé. */
export const NEUTRAL_SCORE: Score = { type: 'cp', value: 0 }
