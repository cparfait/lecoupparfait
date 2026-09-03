/**
 * Réserve de processus Stockfish.
 *
 * Un processus UCI ne traite qu'une recherche à la fois. Pour servir plusieurs
 * joueurs sans les faire attendre, on en garde plusieurs chauds et on distribue
 * les requêtes. Les demandes qui arrivent quand tout est occupé sont mises en
 * file plutôt que refusées.
 *
 * La file est **prioritaire** : un coup à jouer dans une partie en cours passe
 * devant l'analyse d'une partie terminée. Sans cela, un joueur qui lance une
 * analyse de cinquante coups bloquerait tous les autres pendant une minute.
 */

import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { EngineProcess, type SearchRequest } from './process.ts'
import type { PositionAnalysis } from '@coupparfait/core'

export type Priority = 'live' | 'interactive' | 'batch'

const PRIORITY_ORDER: Record<Priority, number> = {
  live: 0, // coup à jouer dans une partie en cours
  interactive: 1, // analyse d'une position que l'utilisateur regarde
  batch: 2, // analyse complète d'une partie, en arrière-plan
}

export interface PoolOptions {
  binary: string
  /** Arguments du binaire. Voir `EngineProcessOptions.args` : c'est pour les tests. */
  args?: string[]
  size: number
  threadsPerProcess: number
  hashMb: number
  maxDepth: number
  /** Nombre maximum de requêtes en file avant de refuser. */
  maxQueue?: number
}

interface QueuedTask {
  request: SearchRequest
  priority: Priority
  /** Adresse de l'appelant, pour la part de file qui lui revient. */
  client: string
  resolve: (analysis: PositionAnalysis) => void
  reject: (error: Error) => void
  enqueuedAt: number
}

/**
 * Places en file par appelant.
 *
 * Le plafond global de seize protégeait la machine et personne d'autre : une
 * seule adresse pouvait le remplir à elle seule, et les quinze autres joueurs
 * recevaient un refus qu'ils n'avaient pas mérité. Deux places par adresse
 * suffisent — un client n'a de toute façon qu'une position en vol à la fois,
 * `analyseGamePositions` les enchaîne — et le refus reste sans gravité :
 * l'appelant a un moteur dans son navigateur.
 *
 * Sans identité d'appelant (les appels internes du serveur lui-même), la part
 * ne s'applique pas : c'est le plafond global qui décide.
 */
const FILE_PAR_CLIENT = 2

/**
 * Refus faute de place, et non panne.
 *
 * La distinction n'est pas cosmétique : ces deux refus sortaient en `500`,
 * c'est-à-dire « le serveur est cassé », alors qu'ils veulent dire « reviens
 * dans un instant ». Un client qui lit un 500 abandonne et bascule sur son
 * moteur local ; sur un 429 il sait qu'il peut réessayer.
 */
export class FileSaturee extends Error {}

export class EnginePool {
  private readonly processes: EngineProcess[] = []
  private readonly queue: QueuedTask[] = []
  private started = false
  private stopping = false

  /** Statistiques exposées par la sonde de santé. */
  readonly stats = {
    searches: 0,
    queuedPeak: 0,
    errors: 0,
    totalMs: 0,
    /**
     * Processus tués parce qu'ils ne répondaient plus.
     *
     * Le chiffre qui manquait : un moteur muet dégradait la réserve en
     * silence, et `available` baissait sans que rien ne dise pourquoi.
     * Non nul et qui monte, c'est un binaire ou une machine à regarder.
     */
    restarts: 0,
  }

  private readonly options: PoolOptions

  constructor(options: PoolOptions) {
    this.options = options
  }

  async start(): Promise<void> {
    if (this.started) return

    for (let i = 0; i < this.options.size; i++) {
      const engine = new EngineProcess({
        binary: this.options.binary,
        args: this.options.args,
        threads: this.options.threadsPerProcess,
        hashMb: this.options.hashMb,
      })

      engine.on('stderr', (message: string) => {
        // Les avertissements NNUE sont fréquents et sans gravité ; le reste
        // mérite d'apparaître dans les journaux du conteneur.
        if (!/NNUE evaluation using/i.test(message)) {
          console.warn(`[moteur ${i}] ${message}`)
        }
      })

      // Sans écouteur « error », Node transforme l'événement en exception fatale.
      engine.on('error', () => {})

      engine.on('relance', () => {
        this.stats.restarts++
        console.error(`[moteur ${i}] sans réponse au-delà du délai de garde : relancé.`)
      })

      engine.on('exit', () => {
        if (this.stopping || !this.started) return
        console.error(`[moteur ${i}] processus terminé, redémarrage dans 2 s…`)
        // Temporisation : si le binaire a disparu, on ne veut pas d'une boucle
        // de redémarrage qui sature le processeur.
        setTimeout(() => {
          if (this.stopping) return
          void engine.start().catch((error: unknown) => {
            console.error(`[moteur ${i}] redémarrage impossible :`, error)
          })
        }, 2000).unref?.()
      })

      engine.on('free', () => this.drain())

      await engine.start()
      this.processes.push(engine)
    }

    // Le drapeau n'est levé qu'une fois au moins un processus opérationnel :
    // sinon `analyse()` accepterait des requêtes que personne ne peut traiter.
    this.started = true

    console.log(
      `✓ Réserve moteur prête : ${this.options.size} processus × ${this.options.threadsPerProcess} fils, ${this.options.hashMb} Mo de hachage`,
    )
  }

  /** Nombre de processus disponibles immédiatement. */
  get available(): number {
    return this.processes.filter((engine) => !engine.isBusy).length
  }

  /**
   * Vrai si la réserve peut traiter une demande, même en attendant son tour.
   *
   * À distinguer de `available`, qui ne compte que les processus libres à
   * l'instant présent. Sans cette distinction, on ne peut pas répondre « je ne
   * saurai jamais faire » : une réserve vide accepterait les demandes et les
   * laisserait en file pour toujours, alors que l'appelant a un moteur de
   * secours dans son navigateur et n'attend qu'un refus pour l'utiliser.
   */
  get usable(): boolean {
    return this.started && this.processes.length > 0
  }

  get queueLength(): number {
    return this.queue.length
  }

  /**
   * Analyse une position.
   * La profondeur est plafonnée : une requête malveillante ne doit pas pouvoir
   * mobiliser un cœur pendant une heure.
   */
  analyse(
    request: SearchRequest,
    priority: Priority = 'interactive',
    client = '',
  ): Promise<PositionAnalysis> {
    if (!this.started) {
      return Promise.reject(new Error('La réserve moteur n’est pas démarrée.'))
    }

    if (client && this.queue.filter((task) => task.client === client).length >= FILE_PAR_CLIENT) {
      return Promise.reject(
        new FileSaturee('Trop d’analyses en attente pour cette adresse. Réessaie dans un instant.'),
      )
    }

    /**
     * Profondeur de file tolérée.
     *
     * Elle valait 200, ce qui paraissait prudent et ne l'était pas — non par
     * risque de panne (une tâche en attente ne coûte qu'une promesse et une
     * FEN, deux cents tiennent dans deux cents kilo-octets), mais par le temps
     * qu'on promettait sans le dire.
     *
     * Le calcul qui compte : chaque client n'a **qu'une** position en vol à la
     * fois — `analyseGamePositions` les enchaîne. Une file de deux cents, c'est
     * donc deux cents personnes qui analysent en même temps, et chacune remet
     * sa position suivante au bout de la file quatre-vingts fois de suite. Avec
     * deux processus à ~0,4 s la position, la deux-centième attendait quarante
     * secondes par coup, soit plus d'une heure pour une partie de quarante
     * coups — sans que rien à l'écran ne l'annonce.
     *
     * Refuser vaut mieux qu'attendre, parce que le refus n'est pas une panne :
     * `analyseOnServer` renvoie `null`, et l'analyse repart sur le moteur du
     * navigateur, qui est libre, local, et déjà là. Seize places gardent la
     * dernière sous les quatre secondes par position ; au-delà, la machine de
     * l'utilisateur fait mieux que notre file.
     */
    const maxQueue = this.options.maxQueue ?? Number(process.env.ENGINE_MAX_QUEUE ?? 16)
    if (this.queue.length >= maxQueue) {
      return Promise.reject(
        new FileSaturee('Le serveur d’analyse est saturé. Réessaie dans quelques secondes.'),
      )
    }

    const bounded: SearchRequest = {
      ...request,
      depth: request.depth ? Math.min(request.depth, this.options.maxDepth) : undefined,
      movetimeMs: request.movetimeMs ? Math.min(request.movetimeMs, 30_000) : undefined,
      nodes: request.nodes ? Math.min(request.nodes, 200_000_000) : undefined,
    }
    // Sans aucune limite, `go` chercherait indéfiniment.
    if (!bounded.depth && !bounded.movetimeMs && !bounded.nodes) {
      bounded.depth = Math.min(20, this.options.maxDepth)
    }

    return new Promise<PositionAnalysis>((resolve, reject) => {
      const task: QueuedTask = {
        request: bounded,
        priority,
        client,
        resolve,
        reject,
        enqueuedAt: Date.now(),
      }

      /**
       * Une demande abandonnée sort de la file.
       *
       * Le signal était transmis au moteur, qui sait interrompre une recherche
       * en cours — mais rien ne surveillait la période d'attente. Une tâche
       * dont l'auteur avait fermé l'onglet gardait donc sa place, puis
       * mobilisait un processus pour un résultat que personne n'attendait
       * plus. C'est précisément ce qu'il ne faut pas faire quand la file est
       * courte : chaque place refusée à quelqu'un doit servir à quelqu'un.
       */
      const { signal } = bounded
      if (signal) {
        if (signal.aborted) {
          reject(new Error('Analyse abandonnée.'))
          return
        }
        signal.addEventListener(
          'abort',
          () => {
            const rang = this.queue.indexOf(task)
            // Déjà partie au moteur : c'est lui qui gère l'abandon.
            if (rang === -1) return
            this.queue.splice(rang, 1)
            reject(new Error('Analyse abandonnée.'))
          },
          { once: true },
        )
      }

      this.queue.push(task)
      this.stats.queuedPeak = Math.max(this.stats.queuedPeak, this.queue.length)
      this.drain()
    })
  }

  /** Distribue les tâches en attente aux processus libres. */
  private drain(): void {
    if (this.queue.length === 0) return

    // Tri stable par priorité puis par ancienneté : personne ne meurt de faim.
    this.queue.sort((a, b) => {
      const byPriority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      return byPriority !== 0 ? byPriority : a.enqueuedAt - b.enqueuedAt
    })

    for (const engine of this.processes) {
      if (engine.isBusy || !engine.isReady) continue
      const task = this.queue.shift()
      if (!task) return

      const startedAt = Date.now()
      engine
        .search(task.request)
        .then((analysis) => {
          this.stats.searches++
          this.stats.totalMs += Date.now() - startedAt
          task.resolve(analysis)
        })
        .catch((error: unknown) => {
          this.stats.errors++
          task.reject(error instanceof Error ? error : new Error(String(error)))
        })
        .finally(() => this.drain())
    }
  }

  async dispose(): Promise<void> {
    this.stopping = true
    for (const task of this.queue) {
      task.reject(new Error('Serveur en cours d’arrêt'))
    }
    this.queue.length = 0
    await Promise.all(this.processes.map((engine) => engine.dispose()))
    this.processes.length = 0
    this.started = false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Instance partagée
// ─────────────────────────────────────────────────────────────────────────────

let pool: EnginePool | null = null

/**
 * Emplacement de Stockfish.
 *
 * L'ordre traduit une intention : ce qui est configuré l'emporte, puis ce qui a
 * été installé par `npm run engine:install`, puis ce qui traîne sur le chemin
 * système. Sans cette recherche, une machine de développement tombait sur le
 * chemin Docker `/usr/local/bin/stockfish`, qui n'existe évidemment pas — et
 * l'analyse repartait en silence sur le moteur du navigateur alors que le
 * binaire natif était installé deux dossiers plus loin.
 */
function findStockfish(): string {
  if (process.env.STOCKFISH_PATH) return process.env.STOCKFISH_PATH

  const name = process.platform === 'win32' ? 'stockfish.exe' : 'stockfish'
  const here = dirname(fileURLToPath(import.meta.url))
  // apps/server/src/engine → racine du dépôt
  const local = resolve(here, '..', '..', '..', '..', 'data', 'stockfish', name)
  if (existsSync(local)) return local

  // À défaut, on s'en remet au chemin système : c'est le cas de l'image Docker,
  // où le binaire compilé est installé dans /usr/local/bin.
  return 'stockfish'
}

export function getPool(): EnginePool {
  if (!pool) {
    pool = new EnginePool({
      binary: findStockfish(),
      size: Number(process.env.ENGINE_POOL_SIZE ?? 2),
      threadsPerProcess: Number(process.env.ENGINE_THREADS ?? 2),
      hashMb: Number(process.env.ENGINE_HASH_MB ?? 256),
      maxDepth: Number(process.env.ENGINE_MAX_DEPTH ?? 34),
    })
  }
  return pool
}

export async function disposePool(): Promise<void> {
  await pool?.dispose()
  pool = null
}
