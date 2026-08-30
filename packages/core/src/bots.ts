/**
 * Adversaires artificiels : 25 niveaux, sept personnalités.
 *
 * Brider un moteur est plus subtil qu'il n'y paraît. Se contenter de réduire la
 * profondeur produit un adversaire qui joue parfaitement puis s'effondre au
 * hasard — c'est frustrant et ça n'apprend rien. On combine donc quatre leviers :
 *
 *  1. `UCI_LimitStrength` + `UCI_Elo` — le bridage officiel de Stockfish, qui
 *     simule un joueur d'un niveau donné (valable de 1320 à 3190 seulement).
 *  2. `Skill Level` — pour descendre sous 1320, là où le bridage Elo s'arrête.
 *  3. **Échantillonnage à température** sur les lignes MultiPV : au lieu de
 *     toujours jouer le meilleur coup, on tire au sort parmi les bons, avec une
 *     probabilité qui décroît avec la qualité. C'est ce qui donne l'impression
 *     d'un adversaire humain, faillible mais cohérent.
 *  4. **Biais de style** — une préférence en centipions pour les captures, les
 *     échecs, les poussées de pions… qui donne à chaque bot un caractère.
 */

import { Chess } from 'chess.js'
import { PIECE_VALUES, relativeRank } from './board.ts'
import { scoreToCp } from './eval.ts'
import type {
  BotEngineConfig,
  BotLevel,
  BotPersonalityId,
  EngineLine,
  StyleBias,
  UciMove,
} from './types.ts'

// ─────────────────────────────────────────────────────────────────────────────
//  Personnalités
// ─────────────────────────────────────────────────────────────────────────────

export interface BotPersonality {
  id: BotPersonalityId
  name: { fr: string; en: string }
  blurb: { fr: string; en: string }
  /**
   * Portrait de l'adversaire : une déclinaison de Cavale, la mascotte, produite
   * par `scripts/build-cavale.mjs`. Les sept partagent la même sculpture, la
   * même lumière et le même cadrage ; seule la matière change, et elle découle
   * du `bias` ci-dessous — Rempart a `sacrifice: -80`, il est en granit ;
   * Brasier a `sacrifice: 45` et `quiet: -40`, il est en bronze surchauffé.
   */
  portrait: string
  /**
   * Repli de l'avatar, et texte de remplacement.
   *
   * On garde l'émoji après l'arrivée des portraits, pour deux usages qu'une
   * image ne couvre pas : l'affichage quand le PNG manque — voir
   * `PortraitAdversaire` — et tout endroit qui a besoin d'un caractère plutôt
   * que d'un fichier.
   */
  emoji: string
  bias: StyleBias
}

const NEUTRAL: StyleBias = {
  capture: 0,
  check: 0,
  pawnPush: 0,
  development: 0,
  sacrifice: 0,
  quiet: 0,
}

export const BOT_PERSONALITIES: Record<BotPersonalityId, BotPersonality> = {
  novice: {
    id: 'novice',
    name: { fr: 'Pion', en: 'Pip' },
    blurb: {
      fr: "Apprend en même temps que toi. Il adore prendre des pièces, même quand il ne devrait pas.",
      en: 'Learning alongside you. Loves grabbing pieces, even when it should not.',
    },
    portrait: '/brand/adversaires/novice.png',
    emoji: '🐣',
    bias: { ...NEUTRAL, capture: 90, check: 40, development: -30 },
  },
  prudent: {
    id: 'prudent',
    name: { fr: 'Rempart', en: 'Bulwark' },
    blurb: {
      fr: 'Solide et patient. Il roque tôt, échange volontiers et ne prend aucun risque.',
      en: 'Solid and patient. Castles early, trades happily, takes no risks.',
    },
    portrait: '/brand/adversaires/prudent.png',
    emoji: '🛡️',
    bias: { ...NEUTRAL, quiet: 35, development: 40, sacrifice: -80, capture: -10 },
  },
  fonceur: {
    id: 'fonceur',
    name: { fr: 'Brasier', en: 'Blaze' },
    blurb: {
      fr: "Attaque d'abord, réfléchit ensuite. Il pousse ses pions vers ton roi sans se retourner.",
      en: 'Attacks first, thinks later. Storms pawns at your king and never looks back.',
    },
    portrait: '/brand/adversaires/fonceur.png',
    emoji: '🔥',
    bias: { ...NEUTRAL, check: 70, pawnPush: 50, sacrifice: 45, quiet: -40 },
  },
  tacticien: {
    id: 'tacticien',
    name: { fr: 'Éclair', en: 'Spark' },
    blurb: {
      fr: 'Voit les combinaisons partout. Laisse une pièce en prise et tu le regretteras.',
      en: 'Sees combinations everywhere. Hang a piece and you will regret it.',
    },
    portrait: '/brand/adversaires/tacticien.png',
    emoji: '⚡',
    bias: { ...NEUTRAL, capture: 25, check: 35, sacrifice: 25 },
  },
  positionnel: {
    id: 'positionnel',
    name: { fr: 'Boussole', en: 'Compass' },
    blurb: {
      fr: "Joue lentement, améliore ses pièces une à une, et t'étouffe sans que tu t'en aperçoives.",
      en: 'Plays slowly, improves piece by piece, and squeezes you without you noticing.',
    },
    portrait: '/brand/adversaires/positionnel.png',
    emoji: '🧭',
    bias: { ...NEUTRAL, quiet: 45, development: 30, capture: -20, pawnPush: -15 },
  },
  gambiteur: {
    id: 'gambiteur',
    name: { fr: 'Mirage', en: 'Mirage' },
    blurb: {
      fr: "Offre du matériel dès l'ouverture pour ouvrir des lignes. Accepte à tes risques.",
      en: 'Offers material from move one to open lines. Accept at your own risk.',
    },
    portrait: '/brand/adversaires/gambiteur.png',
    emoji: '🎭',
    bias: { ...NEUTRAL, sacrifice: 90, pawnPush: 30, development: 35, quiet: -25 },
  },
  machine: {
    id: 'machine',
    name: { fr: 'Oracle', en: 'Oracle' },
    blurb: {
      fr: "Aucun style, aucune pitié. Le meilleur coup, à chaque fois. Bonne chance.",
      en: 'No style, no mercy. The best move, every time. Good luck.',
    },
    portrait: '/brand/adversaires/machine.png',
    emoji: '🜛',
    bias: NEUTRAL,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
//  Barème des 25 niveaux
// ─────────────────────────────────────────────────────────────────────────────

/** Elo minimum accepté par `UCI_Elo` de Stockfish. */
const STOCKFISH_MIN_ELO = 1320
/** Elo maximum accepté par `UCI_Elo`. */
const STOCKFISH_MAX_ELO = 3190

interface LevelSpec {
  elo: number
  personality: BotPersonalityId
  skill: number
  depth: number
  movetimeMs: number
  temperature: number
  multiPv: number
  nodes?: number
}

/**
 * Table des niveaux.
 *
 * Sous 1150 Elo, `UCI_Elo` n'existe pas : on brise volontairement le moteur
 * avec un `Skill Level` bas, une profondeur d'une poignée de coups et une forte
 * température. Au-dessus, on laisse Stockfish faire son travail de simulation.
 * Les cinq derniers niveaux retirent tout bridage et augmentent la profondeur.
 */
const LEVEL_TABLE: LevelSpec[] = [
  { elo: 250, personality: 'novice', skill: 0, depth: 1, movetimeMs: 120, temperature: 1.0, multiPv: 6, nodes: 500 },
  { elo: 400, personality: 'novice', skill: 0, depth: 1, movetimeMs: 150, temperature: 0.92, multiPv: 6, nodes: 900 },
  { elo: 550, personality: 'novice', skill: 1, depth: 2, movetimeMs: 180, temperature: 0.84, multiPv: 5, nodes: 1800 },
  { elo: 700, personality: 'fonceur', skill: 1, depth: 2, movetimeMs: 220, temperature: 0.74, multiPv: 5, nodes: 3500 },
  { elo: 850, personality: 'prudent', skill: 2, depth: 3, movetimeMs: 260, temperature: 0.64, multiPv: 5, nodes: 7000 },
  { elo: 1000, personality: 'novice', skill: 3, depth: 4, movetimeMs: 300, temperature: 0.55, multiPv: 4, nodes: 14000 },
  { elo: 1150, personality: 'fonceur', skill: 4, depth: 5, movetimeMs: 350, temperature: 0.46, multiPv: 4, nodes: 28000 },
  { elo: 1320, personality: 'prudent', skill: 5, depth: 6, movetimeMs: 400, temperature: 0.38, multiPv: 4 },
  { elo: 1450, personality: 'tacticien', skill: 6, depth: 7, movetimeMs: 450, temperature: 0.32, multiPv: 4 },
  { elo: 1550, personality: 'positionnel', skill: 7, depth: 8, movetimeMs: 500, temperature: 0.28, multiPv: 3 },
  { elo: 1650, personality: 'gambiteur', skill: 8, depth: 8, movetimeMs: 550, temperature: 0.25, multiPv: 3 },
  { elo: 1750, personality: 'tacticien', skill: 9, depth: 9, movetimeMs: 600, temperature: 0.22, multiPv: 3 },
  { elo: 1850, personality: 'prudent', skill: 10, depth: 10, movetimeMs: 650, temperature: 0.2, multiPv: 3 },
  { elo: 1950, personality: 'fonceur', skill: 11, depth: 11, movetimeMs: 700, temperature: 0.18, multiPv: 3 },
  { elo: 2050, personality: 'positionnel', skill: 12, depth: 12, movetimeMs: 800, temperature: 0.16, multiPv: 3 },
  { elo: 2150, personality: 'tacticien', skill: 13, depth: 13, movetimeMs: 900, temperature: 0.14, multiPv: 3 },
  { elo: 2250, personality: 'gambiteur', skill: 14, depth: 14, movetimeMs: 1000, temperature: 0.12, multiPv: 3 },
  { elo: 2400, personality: 'positionnel', skill: 16, depth: 16, movetimeMs: 1200, temperature: 0.1, multiPv: 2 },
  { elo: 2550, personality: 'tacticien', skill: 17, depth: 18, movetimeMs: 1400, temperature: 0.08, multiPv: 2 },
  { elo: 2700, personality: 'prudent', skill: 18, depth: 20, movetimeMs: 1600, temperature: 0.06, multiPv: 2 },
  { elo: 2850, personality: 'machine', skill: 20, depth: 14, movetimeMs: 1200, temperature: 0.04, multiPv: 2 },
  { elo: 2950, personality: 'machine', skill: 20, depth: 18, movetimeMs: 1800, temperature: 0.02, multiPv: 1 },
  { elo: 3050, personality: 'machine', skill: 20, depth: 22, movetimeMs: 2500, temperature: 0, multiPv: 1 },
  { elo: 3150, personality: 'machine', skill: 20, depth: 26, movetimeMs: 4000, temperature: 0, multiPv: 1 },
  { elo: 3200, personality: 'machine', skill: 20, depth: 30, movetimeMs: 6000, temperature: 0, multiPv: 1 },
]

/** Les 25 niveaux jouables, prêts à l'emploi. */
export const BOT_LEVELS: BotLevel[] = LEVEL_TABLE.map((spec, index) => {
  const level = index + 1
  const personality = BOT_PERSONALITIES[spec.personality]
  const useUciElo = spec.elo >= STOCKFISH_MIN_ELO && spec.elo <= STOCKFISH_MAX_ELO
  return {
    level,
    elo: spec.elo,
    personality: spec.personality,
    name: {
      fr: `${personality.name.fr} · niveau ${level}`,
      en: `${personality.name.en} · level ${level}`,
    },
    blurb: personality.blurb,
    engine: {
      uciElo: useUciElo ? spec.elo : undefined,
      skill: spec.skill,
      depth: spec.depth,
      nodes: spec.nodes,
      movetimeMs: spec.movetimeMs,
      temperature: spec.temperature,
      multiPv: spec.multiPv,
      bias: personality.bias,
    },
  }
})

export function botLevel(level: number): BotLevel {
  const clamped = Math.max(1, Math.min(BOT_LEVELS.length, Math.round(level)))
  return BOT_LEVELS[clamped - 1]!
}

/** Niveau conseillé face à un joueur d'un classement donné. */
export function suggestedLevel(playerRating: number): number {
  // On vise un adversaire légèrement en dessous : gagner de temps en temps est
  // ce qui fait progresser, se faire écraser ne fait progresser personne.
  const target = playerRating - 100
  let best = 1
  let bestGap = Infinity
  for (const level of BOT_LEVELS) {
    const gap = Math.abs(level.elo - target)
    if (gap < bestGap) {
      bestGap = gap
      best = level.level
    }
  }
  return best
}

/** Options UCI à envoyer au moteur pour incarner ce bot. */
export function uciOptionsFor(config: BotEngineConfig): Array<[string, string | number | boolean]> {
  const options: Array<[string, string | number | boolean]> = [
    ['Skill Level', config.skill],
    ['MultiPV', config.multiPv],
  ]
  if (config.uciElo !== undefined) {
    options.push(['UCI_LimitStrength', true])
    options.push(['UCI_Elo', Math.round(config.uciElo)])
  } else {
    options.push(['UCI_LimitStrength', false])
  }
  return options
}

// ─────────────────────────────────────────────────────────────────────────────
//  Choix du coup
// ─────────────────────────────────────────────────────────────────────────────

export interface BotMoveChoice {
  uci: UciMove
  /** Rang de la ligne choisie (1 = meilleure). */
  rank: number
  /** Perte en centipions par rapport au meilleur coup. */
  cost: number
  /** Vrai si le choix a été altéré par le style ou la température. */
  flavoured: boolean
}

/**
 * Choisit le coup que joue le bot parmi les lignes proposées par le moteur.
 *
 * Trois étapes :
 *  1. chaque ligne reçoit un score = évaluation + biais de style ;
 *  2. les lignes trop mauvaises sont écartées (un bot faible joue mal, pas
 *     n'importe comment : perdre sa dame gratuitement n'amuse personne) ;
 *  3. tirage pondéré par un softmax dont la température vient du niveau.
 *
 * @param random source d'aléa injectable, pour rendre les tests déterministes
 */
export function pickBotMove(
  fen: string,
  lines: EngineLine[],
  config: BotEngineConfig,
  random: () => number = Math.random,
): BotMoveChoice | null {
  const usable = lines.filter((l) => l.pv.length > 0)
  if (usable.length === 0) return null

  const board = new Chess(fen, { skipValidation: true })
  const turn = board.turn()
  const sign = turn === 'w' ? 1 : -1

  // Évaluation de chaque ligne du point de vue du bot.
  const scored = usable.map((line) => {
    const raw = sign * scoreToCp(line.score)
    const uci = line.pv[0]!
    return {
      line,
      uci,
      raw,
      adjusted: raw + styleBonus(board, uci, config.bias),
    }
  })

  const bestRaw = Math.max(...scored.map((s) => s.raw))

  // Un bot ne joue jamais un coup catastrophique par pur hasard : le plafond de
  // perte tolérée grandit avec la température, donc avec la faiblesse du bot.
  const tolerance = 40 + config.temperature * 460
  const candidates = scored.filter((s) => bestRaw - s.raw <= tolerance)
  const pool = candidates.length > 0 ? candidates : [scored[0]!]

  // Température nulle : on prend simplement le meilleur coup après style.
  if (config.temperature <= 0.001) {
    const best = pool.reduce((a, b) => (b.adjusted > a.adjusted ? b : a))
    return {
      uci: best.uci,
      rank: best.line.multipv,
      cost: Math.round(bestRaw - best.raw),
      flavoured: best.line.multipv !== 1,
    }
  }

  // Softmax : plus la température est haute, plus les coups moyens ont leur chance.
  // L'échelle de 120 centipions correspond à peu près à « un coup un peu moins bon ».
  const scale = 120 / Math.max(0.05, config.temperature)
  const bestAdjusted = Math.max(...pool.map((s) => s.adjusted))
  const weights = pool.map((s) => Math.exp((s.adjusted - bestAdjusted) / scale))
  const total = weights.reduce((a, b) => a + b, 0)

  let ticket = random() * total
  for (let i = 0; i < pool.length; i++) {
    ticket -= weights[i]!
    if (ticket <= 0) {
      const chosen = pool[i]!
      return {
        uci: chosen.uci,
        rank: chosen.line.multipv,
        cost: Math.round(bestRaw - chosen.raw),
        flavoured: chosen.line.multipv !== 1,
      }
    }
  }

  const fallback = pool[pool.length - 1]!
  return {
    uci: fallback.uci,
    rank: fallback.line.multipv,
    cost: Math.round(bestRaw - fallback.raw),
    flavoured: fallback.line.multipv !== 1,
  }
}

/**
 * Bonus de style d'un coup, en centipions.
 *
 * Purement cosmétique du point de vue de la force : il déplace le choix entre
 * des coups de valeur comparable, ce qui suffit à créer un caractère
 * reconnaissable sans rendre le bot stupide.
 */
function styleBonus(board: Chess, uci: UciMove, bias: StyleBias): number {
  if (isNeutral(bias)) return 0

  const probe = new Chess(board.fen(), { skipValidation: true })
  let move
  try {
    move = probe.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci[4] : undefined,
    })
  } catch {
    return 0
  }

  let bonus = 0

  if (move.captured) {
    // Aimer les captures, proportionnellement à la valeur du butin.
    bonus += bias.capture * (PIECE_VALUES[move.captured] / 950)
  }
  if (probe.inCheck()) bonus += bias.check
  if (probe.isCheckmate()) bonus += 10_000 // personne ne refuse un mat

  if (move.piece === 'p') {
    const advance = relativeRank(move.to, move.color)
    bonus += bias.pawnPush * (advance / 7)
  }

  // Développement : sortir une pièce mineure de sa case de départ, ou roquer.
  const homeRank = move.color === 'w' ? '1' : '8'
  if ((move.piece === 'n' || move.piece === 'b') && move.from[1] === homeRank) {
    bonus += bias.development
  }
  if (move.isKingsideCastle() || move.isQueensideCastle()) {
    bonus += bias.development * 1.5
  }

  // Sacrifice : la pièce posée peut être reprise avec profit.
  const attackers = probe.attackers(move.to, probe.turn()).length
  const defenders = probe.attackers(move.to, move.color).length
  if (attackers > defenders && move.piece !== 'p') {
    bonus += bias.sacrifice
  }

  // Coup calme : ni capture, ni échec, ni poussée de pion.
  if (!move.captured && !probe.inCheck() && move.piece !== 'p') {
    bonus += bias.quiet
  }

  return bonus
}

function isNeutral(bias: StyleBias): boolean {
  return (
    bias.capture === 0 &&
    bias.check === 0 &&
    bias.pawnPush === 0 &&
    bias.development === 0 &&
    bias.sacrifice === 0 &&
    bias.quiet === 0
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Temps de réflexion simulé
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Délai avant que le bot ne joue, pour que la partie respire.
 *
 * Un adversaire qui répond en 3 ms est déroutant. On simule une réflexion
 * proportionnelle au niveau, avec une part d'aléa et une pause plus longue sur
 * les positions compliquées.
 */
export function botThinkDelayMs(
  level: number,
  legalMoveCount: number,
  random: () => number = Math.random,
): number {
  const base = 280 + level * 55
  const complexity = Math.min(1, legalMoveCount / 40) * 500
  const jitter = (random() - 0.5) * 400
  return Math.max(220, Math.round(base + complexity + jitter))
}
