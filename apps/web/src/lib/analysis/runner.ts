'use client'

/**
 * Orchestration de l'analyse d'une partie.
 *
 * Deux moteurs, une seule interface :
 *
 *  - **Le serveur d'abord.** Stockfish natif, plusieurs fils, grande table de
 *    hachage, profondeur 20+. C'est lui qui donne des verdicts fiables.
 *  - **Le navigateur en secours.** Si le serveur est absent — installation
 *    partielle, réseau coupé, hébergement minimal — on bascule sur le moteur
 *    WebAssembly. C'est plus lent et moins profond, mais l'analyse aboutit.
 *
 * Dans les deux cas, la classification, la détection de motifs et la rédaction
 * des explications se font **dans le navigateur**, à partir des évaluations
 * brutes. Le serveur ne fait que calculer.
 */

import { Chess } from 'chess.js'
import {
  OpeningBook,
  analyseGame,
  summariseForCoach,
  type FullGameReport,
  type PositionAnalysis,
} from '@coupparfait/core'
import { getEngine } from '@/lib/engine/client.ts'

export type AnalysisSource = 'server' | 'client'

export interface AnalysisProgress {
  done: number
  total: number
  source: AnalysisSource
  phase: 'positions' | 'explaining'
}

export interface RunAnalysisOptions {
  moves: string[]
  startFen?: string
  depth?: number
  book?: OpeningBook | null
  locale?: 'fr' | 'en'
  /** Camp du lecteur, pour que les explications s'adressent à la bonne personne. */
  lecteur?: 'w' | 'b' | null
  /**
   * En-têtes du PGN, quand il y en a.
   *
   * Ils étaient lus par `parseAnalysisInput`, affichés une fois sur l'écran
   * d'import — « 7 demi-coups reconnus · Alice – Bob » — puis abandonnés. La
   * relecture ne parlait plus que de « Blancs » et « Noirs », alors qu'on
   * venait d'importer la partie de quelqu'un qui a un nom.
   */
  headers?: Record<string, string>
  onProgress?: (progress: AnalysisProgress) => void
  signal?: AbortSignal
  /** Force l'analyse locale, sans passer par le serveur. */
  forceClient?: boolean
}

export interface AnalysisOutcome {
  report: FullGameReport
  /** En-têtes du PGN d'origine, pour nommer les joueurs à la relecture. */
  headers?: Record<string, string>
  /**
   * Sortie brute du moteur, position par position.
   *
   * C'est la seule partie coûteuse de l'analyse, et la seule qu'il vaille la
   * peine de conserver : le rapport se reconstruit à partir d'elle en quelques
   * millisecondes. Voir `savedAnalyses` dans le schéma.
   */
  positions: PositionAnalysis[]
  source: AnalysisSource
  /** Résumé pédagogique pour chaque camp. */
  coach: {
    w: ReturnType<typeof summariseForCoach>
    b: ReturnType<typeof summariseForCoach>
  }
}

export async function runAnalysis(options: RunAnalysisOptions): Promise<AnalysisOutcome> {
  const {
    moves,
    startFen,
    depth = 18,
    book,
    locale = 'fr',
    lecteur = null,
    headers,
    onProgress,
    signal,
    forceClient = false,
  } = options

  let source: AnalysisSource = 'client'
  let precomputed: PositionAnalysis[] | null = null

  if (!forceClient) {
    precomputed = await analyseOnServer({ moves, startFen, depth, onProgress, signal })
    if (precomputed) source = 'server'
  }

  // L'analyseur reçoit soit les résultats du serveur (lecture dans un tableau),
  // soit un appel direct au moteur du navigateur.
  //
  // Dans le second cas les évaluations n'existaient nulle part une fois le
  // rapport rédigé : elles étaient produites, consommées, oubliées. On les
  // retient au passage, sans quoi une analyse faite dans le navigateur serait
  // la seule qu'on ne saurait pas enregistrer — alors que c'est la plus lente,
  // donc celle qu'on tient le plus à ne pas refaire.
  const recoltees: PositionAnalysis[] = []
  const analyser = precomputed
    ? makeArrayAnalyser(precomputed)
    : recolter(
        makeClientAnalyser(
          clientDepthFor(depth, moves.length + 1),
          onProgress,
          moves.length + 1,
          signal,
        ),
        recoltees,
      )

  const report = await analyseGame({
    lecteur,
    moves,
    startFen,
    analyser,
    book: book ?? undefined,
    locale,
    // Trois lignes et non plus deux : la deuxième suffisait à classer le coup
    // joué, il en faut une de plus pour montrer au lecteur ce qu'il avait
    // d'autre sous la main. Le surcoût est réel mais modéré — le moteur
    // explore le même arbre, il en rapporte seulement davantage.
    multiPv: 3,
    signal,
    onProgress: (done, total) => {
      onProgress?.({ done, total, source, phase: 'explaining' })
    },
  })

  return {
    report,
    headers,
    positions: precomputed ?? recoltees,
    source,
    coach: {
      w: summariseForCoach(report, 'w', locale),
      b: summariseForCoach(report, 'b', locale),
    },
  }
}

/** Enveloppe un analyseur pour garder une copie de ce qu'il produit. */
function recolter(
  analyser: (fen: string, multiPv: number) => Promise<PositionAnalysis>,
  panier: PositionAnalysis[],
) {
  return async (fen: string, multiPv: number): Promise<PositionAnalysis> => {
    const analysis = await analyser(fen, multiPv)
    panier.push(analysis)
    return analysis
  }
}

/**
 * Reconstruit une analyse à partir d'évaluations déjà connues.
 *
 * Aucun moteur n'est sollicité : ni le serveur, ni le navigateur. On rejoue la
 * classification, la détection de motifs et la rédaction sur des chiffres déjà
 * calculés, ce qui prend le temps d'un battement de cils au lieu d'une minute.
 *
 * C'est ce qui rend l'enregistrement utile, et c'est aussi pourquoi on stocke
 * les évaluations plutôt que le texte : la prose est refabriquée ici, donc par
 * la version actuelle du code.
 */
export async function rejouerAnalyse(options: {
  moves: string[]
  positions: PositionAnalysis[]
  startFen?: string
  headers?: Record<string, string>
  book?: OpeningBook | null
  locale?: 'fr' | 'en'
  lecteur?: 'w' | 'b' | null
}): Promise<AnalysisOutcome> {
  const { moves, positions, startFen, headers, book, locale = 'fr', lecteur = null } = options

  const report = await analyseGame({
    lecteur,
    moves,
    startFen,
    analyser: makeArrayAnalyser(positions),
    book: book ?? undefined,
    locale,
    multiPv: 3,
  })

  return {
    report,
    headers,
    positions,
    source: 'server',
    coach: {
      w: summariseForCoach(report, 'w', locale),
      b: summariseForCoach(report, 'b', locale),
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Analyse serveur
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Demande l'analyse au serveur et lit la réponse en flux.
 * Retourne `null` si le serveur n'est pas disponible — l'appelant bascule alors
 * sur le moteur local sans que l'utilisateur ait à s'en occuper.
 */
async function analyseOnServer(options: {
  moves: string[]
  startFen?: string
  depth: number
  onProgress?: (progress: AnalysisProgress) => void
  signal?: AbortSignal
}): Promise<PositionAnalysis[] | null> {
  // Le serveur envoie une ligne de progression par position. S'il ne dit rien
  // du tout pendant ce délai, c'est qu'il ne dira jamais rien : on renonce et
  // l'analyse repart dans le navigateur. Sans cette limite, une installation
  // sans Stockfish natif laissait tourner un « analyse en cours… » éternel.
  const FIRST_WORD_MS = 8000

  const guard = new AbortController()
  const abandon = () => guard.abort()
  options.signal?.addEventListener('abort', abandon, { once: true })
  let silence: ReturnType<typeof setTimeout> | null = setTimeout(abandon, FIRST_WORD_MS)
  const heard = () => {
    if (!silence) return
    clearTimeout(silence)
    silence = null
  }

  try {
    const response = await fetch('/api/analyse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'game',
        moves: options.moves,
        startFen: options.startFen,
        depth: options.depth,
        // Trois lignes et non plus deux : la deuxième suffisait à classer le coup
    // joué, il en faut une de plus pour montrer au lecteur ce qu'il avait
    // d'autre sous la main. Le surcoût est réel mais modéré — le moteur
    // explore le même arbre, il en rapporte seulement davantage.
    multiPv: 3,
      }),
      signal: guard.signal,
    })

    if (!response.ok || !response.body) return null

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let analyses: PositionAnalysis[] | null = null

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      // La dernière ligne peut être incomplète : on la garde pour le tour suivant.
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const message = JSON.parse(line) as
            | { type: 'progress'; done: number; total: number }
            | { type: 'done'; analyses: PositionAnalysis[] }

          if (message.type === 'progress') {
            // Le serveur a donné signe de vie : il a le droit de prendre son
            // temps pour la suite.
            heard()
            options.onProgress?.({
              done: message.done,
              total: message.total,
              source: 'server',
              phase: 'positions',
            })
          } else if (message.type === 'done') {
            analyses = message.analyses
          }
        } catch {
          // Ligne tronquée ou corrompue : on l'ignore, le flux continue.
        }
      }
    }

    return analyses
  } catch {
    return null
  } finally {
    heard()
    options.signal?.removeEventListener('abort', abandon)
  }
}

/** Sert les analyses déjà calculées, dans l'ordre des positions. */
function makeArrayAnalyser(analyses: PositionAnalysis[]) {
  let index = 0
  return async (fen: string): Promise<PositionAnalysis> => {
    const analysis = analyses[index++]
    // Filet de sécurité : si le serveur a renvoyé moins d'analyses que de
    // positions (partie tronquée), on renvoie une évaluation neutre plutôt que
    // de faire échouer tout le rapport.
    return (
      analysis ?? {
        fen,
        depth: 0,
        lines: [{ multipv: 1, score: { type: 'cp', value: 0 }, depth: 0, pv: [] }],
        bestMove: null,
        source: 'server',
      }
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Analyse locale
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Profondeur retenue quand l'analyse se replie sur le navigateur.
 *
 * Le moteur WebAssembly n'a qu'un fil d'exécution, et chaque niveau de
 * profondeur coûte à peu près le double du précédent. À 18 demi-coups, une
 * partie de soixante coups demande un quart d'heure : personne n'attend. On
 * plafonne donc, d'autant plus que la partie est longue.
 *
 * Ce n'est pas un renoncement : les fautes visibles — celles qui intéressent un
 * débutant — apparaissent très bien à cette profondeur. C'est pour départager
 * deux excellents coups qu'il faut aller plus loin, et cela demande le moteur
 * natif du serveur.
 */
function clientDepthFor(requested: number, positions: number): number {
  if (positions <= 20) return Math.min(requested, 18)
  if (positions <= 60) return Math.min(requested, 15)
  return Math.min(requested, 13)
}

function makeClientAnalyser(
  depth: number,
  onProgress: ((progress: AnalysisProgress) => void) | undefined,
  total: number,
  signal: AbortSignal | undefined,
) {
  let done = 0
  return async (fen: string, multiPv: number): Promise<PositionAnalysis> => {
    const engine = getEngine()
    await engine.start()
    // On retire tout bridage : une analyse doit être aussi juste que possible,
    // même si elle sert à commenter la partie d'un débutant.
    engine.setOptions([
      ['UCI_LimitStrength', false],
      ['Skill Level', 20],
    ])
    const analysis = await engine.analyse({ fen, depth, multiPv, signal })
    done++
    onProgress?.({ done, total, source: 'client', phase: 'positions' })
    return analysis
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Lecture d'une entrée utilisateur
// ─────────────────────────────────────────────────────────────────────────────

export interface ParsedInput {
  moves: string[]
  startFen: string
  headers: Record<string, string>
  /** Ce qu'on a reconnu, pour l'afficher à l'utilisateur. */
  kind: 'pgn' | 'fen' | 'moves'
}

/**
 * Accepte à peu près tout ce qu'un joueur peut coller : un PGN complet, une
 * FEN, ou une simple liste de coups. Deviner le format évite de demander à
 * l'utilisateur de le préciser, ce qu'il ne sait souvent pas.
 */
export function parseAnalysisInput(raw: string): ParsedInput | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  // Une FEN : six champs dont le deuxième est « w » ou « b ».
  if (/^[1-8pnbrqkPNBRQK/]+\s+[wb]\s+(-|[KQkq]+)\s+(-|[a-h][36])/.test(trimmed)) {
    try {
      const board = new Chess(trimmed)
      return { moves: [], startFen: board.fen(), headers: {}, kind: 'fen' }
    } catch {
      return null
    }
  }

  const isPgn = trimmed.includes('[') || /\d+\s*\./.test(trimmed)

  const headers: Record<string, string> = {}
  for (const match of trimmed.matchAll(/\[(\w+)\s+"([^"]*)"\]/g)) {
    headers[match[1]!] = match[2]!
  }

  const startFen = headers.FEN ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

  // Nettoyage : commentaires, variantes, annotations, numéros de coups.
  let body = trimmed.replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ')
  let previous: string
  do {
    previous = body
    body = body.replace(/\([^()]*\)/g, ' ')
  } while (body !== previous)

  const tokens = body
    .replace(/\$\d+/g, ' ')
    .replace(/\d+\.(\.\.)?/g, ' ')
    .split(/\s+/)
    .map((token) => token.replace(/[!?]+$/, '').trim())
    .filter((token) => token && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(token))

  const board = new Chess(startFen, { skipValidation: true })
  const moves: string[] = []
  for (const token of tokens) {
    try {
      moves.push(board.move(token).san)
    } catch {
      break
    }
  }

  if (moves.length === 0) return null
  return { moves, startFen, headers, kind: isPgn ? 'pgn' : 'moves' }
}
