/**
 * Adversaires artificiels : 15 niveaux, sept personnalités.
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
  CleDeTexte,
} from './types.ts'

// ─────────────────────────────────────────────────────────────────────────────
//  Personnalités
// ─────────────────────────────────────────────────────────────────────────────

export interface BotPersonality {
  id: BotPersonalityId
  name: CleDeTexte
  blurb: CleDeTexte
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
  /**
   * Ce qu'il dirait s'il parlait. Une ligne, dans sa voix.
   */
  devise: CleDeTexte
  /**
   * D'où il vient, en deux paragraphes.
   *
   * ── Pourquoi une fiction, et pourquoi celle-là ──────────────────────────
   *
   * Les sept adversaires portaient un nom, une phrase et un portrait, et rien
   * derrière : on ne pouvait pas cliquer dessus, donc il n'y avait rien à
   * savoir. Or ce sont eux qu'on affronte pendant des heures, et un adversaire
   * dont on ne sait rien reste un curseur de difficulté déguisé.
   *
   * Le lore ne s'invente pas librement pour autant. Il part de deux choses
   * vraies : la **matière** de la sculpture, décidée dans
   * `scripts/build-cavale.mjs` d'après les biais ci-dessous, et **les biais
   * eux-mêmes**. Rempart est en granit parce qu'il a `sacrifice: -80` ; son
   * histoire raconte le granit, et son granit raconte le refus du risque. La
   * page d'un adversaire affiche d'ailleurs ses biais chiffrés à côté du
   * texte : si l'un contredisait l'autre, cela se verrait.
   *
   * En français seulement, contrairement à `name` et `blurb`. Ces deux-là sont
   * courts et traduits depuis toujours ; un texte littéraire traduit à
   * l'estime serait moins bon que pas de traduction du tout, et l'interface
   * n'affiche de toute façon que le français pour les adversaires.
   */
  lore: string[]
  /**
   * Comment le battre.
   *
   * Le seul champ qui doit rester du conseil d'échecs et non de la
   * littérature : c'est ce qui empêche la fiche de n'être qu'une décoration.
   * Chaque conseil vise le biais, pas le personnage.
   */
  contre: string
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
    name: 'bots.novice.name',
    blurb: 'bots.novice.blurb',
    portrait: '/brand/adversaires/novice.webp',
    emoji: '🐣',
    devise: 'bots.novice.devise',
    lore: ['bots.novice.lore1', 'bots.novice.lore2'],
    contre: 'bots.novice.contre',
    bias: { ...NEUTRAL, capture: 90, check: 40, development: -30 },
  },
  prudent: {
    id: 'prudent',
    name: 'bots.prudent.name',
    blurb: 'bots.prudent.blurb',
    portrait: '/brand/adversaires/prudent.webp',
    emoji: '🛡️',
    devise: 'bots.prudent.devise',
    lore: ['bots.prudent.lore1', 'bots.prudent.lore2'],
    contre: 'bots.prudent.contre',
    bias: { ...NEUTRAL, quiet: 35, development: 40, sacrifice: -80, capture: -10 },
  },
  fonceur: {
    id: 'fonceur',
    name: 'bots.fonceur.name',
    blurb: 'bots.fonceur.blurb',
    portrait: '/brand/adversaires/fonceur.webp',
    emoji: '🔥',
    devise: 'bots.fonceur.devise',
    lore: ['bots.fonceur.lore1', 'bots.fonceur.lore2'],
    contre: 'bots.fonceur.contre',
    bias: { ...NEUTRAL, check: 70, pawnPush: 50, sacrifice: 45, quiet: -40 },
  },
  tacticien: {
    id: 'tacticien',
    name: 'bots.tacticien.name',
    blurb: 'bots.tacticien.blurb',
    portrait: '/brand/adversaires/tacticien.webp',
    emoji: '⚡',
    devise: 'bots.tacticien.devise',
    lore: ['bots.tacticien.lore1', 'bots.tacticien.lore2'],
    contre: 'bots.tacticien.contre',
    bias: { ...NEUTRAL, capture: 25, check: 35, sacrifice: 25 },
  },
  positionnel: {
    id: 'positionnel',
    name: 'bots.positionnel.name',
    blurb: 'bots.positionnel.blurb',
    portrait: '/brand/adversaires/positionnel.webp',
    emoji: '🧭',
    devise: 'bots.positionnel.devise',
    lore: ['bots.positionnel.lore1', 'bots.positionnel.lore2'],
    contre: 'bots.positionnel.contre',
    bias: { ...NEUTRAL, quiet: 45, development: 30, capture: -20, pawnPush: -15 },
  },
  gambiteur: {
    id: 'gambiteur',
    name: 'bots.gambiteur.name',
    blurb: 'bots.gambiteur.blurb',
    portrait: '/brand/adversaires/gambiteur.webp',
    emoji: '🎭',
    devise: 'bots.gambiteur.devise',
    lore: ['bots.gambiteur.lore1', 'bots.gambiteur.lore2'],
    contre: 'bots.gambiteur.contre',
    bias: { ...NEUTRAL, sacrifice: 90, pawnPush: 30, development: 35, quiet: -25 },
  },
  machine: {
    id: 'machine',
    name: 'bots.machine.name',
    blurb: 'bots.machine.blurb',
    portrait: '/brand/adversaires/machine.webp',
    emoji: '🜛',
    devise: 'bots.machine.devise',
    lore: ['bots.machine.lore1', 'bots.machine.lore2'],
    contre: 'bots.machine.contre',
    bias: NEUTRAL,
  },
}

/**
 * Les six axes de style, dits en français.
 *
 * Un biais est un nombre de centipions ajouté à un coup qui présente le trait
 * en question — voir `styleBonus`. Positif, il attire ; négatif, il repousse.
 * Les deux formulations sont donc nécessaires : `capture: 90` et
 * `capture: -20` ne se racontent pas avec la même phrase.
 */
const AXES: Record<keyof StyleBias, { attire: string; repousse: string }> = {
  capture: { attire: 'axes.capture.attire', repousse: 'axes.capture.repousse' },
  check: { attire: 'axes.check.attire', repousse: 'axes.check.repousse' },
  pawnPush: { attire: 'axes.pawnPush.attire', repousse: 'axes.pawnPush.repousse' },
  development: { attire: 'axes.development.attire', repousse: 'axes.development.repousse' },
  sacrifice: { attire: 'axes.sacrifice.attire', repousse: 'axes.sacrifice.repousse' },
  quiet: { attire: 'axes.quiet.attire', repousse: 'axes.quiet.repousse' },
}

export interface Penchant {
  axe: keyof StyleBias
  /** Le trait, formulé selon le signe — une clé de dictionnaire, à résoudre. */
  libelle: CleDeTexte
  /** Le biais brut, en centipions. Négatif pour un rejet. */
  poids: number
}

/**
 * Ce qu'un adversaire cherche et ce qu'il fuit, déduit de ses biais.
 *
 * Déduit, et non écrit à côté : la fiche d'un adversaire affiche son caractère
 * *et* les nombres qui le produisent, sur la même page. Les recopier à la main
 * garantirait qu'un jour l'un dise l'inverse de l'autre — et la page de `/jouer`
 * promet précisément que « ce n'est pas qu'un habillage ».
 *
 * Trié par intensité : c'est l'ordre dans lequel on décrirait quelqu'un.
 */
export function penchants(bias: StyleBias): Penchant[] {
  return (Object.keys(AXES) as Array<keyof StyleBias>)
    .filter((axe) => bias[axe] !== 0)
    .map((axe) => ({
      axe,
      libelle: bias[axe] > 0 ? AXES[axe].attire : AXES[axe].repousse,
      poids: bias[axe],
    }))
    .sort((a, b) => Math.abs(b.poids) - Math.abs(a.poids))
}

// ─────────────────────────────────────────────────────────────────────────────
//  Barème des 15 niveaux
// ─────────────────────────────────────────────────────────────────────────────

/** Elo minimum accepté par `UCI_Elo` de Stockfish. */
const STOCKFISH_MIN_ELO = 1320
/** Elo maximum accepté par `UCI_Elo`. */
const STOCKFISH_MAX_ELO = 3190

/**
 * Ce que Maia sait faire, et ce qu'elle ne sait pas faire.
 *
 * Les réseaux publiés vont de 1100 à 1900, de cent en cent — voir
 * `apps/server/src/engine/maia.ts`. En dehors de cette plage il n'y a rien :
 * le serveur choisit alors le palier *le plus proche*, ce qui est la bonne
 * réponse à une demande de 1150 et une réponse trompeuse à une demande de 250.
 *
 * Le niveau demandé était pourtant transmis tel quel. Résultat : les niveaux 1
 * à 6 affrontaient tous le même réseau de 1100, les niveaux 14 à 25 le même de
 * 1900, et le curseur ne changeait rien à ce qu'on avait en face — on
 * choisissait « débutant complet, 250 Elo » pour se faire battre par un joueur
 * de club. C'est ici qu'on le dit, pour que l'écran de choix puisse le dire à
 * son tour.
 */
export const MAIA_MIN_ELO = 1100
export const MAIA_MAX_ELO = 1900

/** Maia peut-elle honnêtement incarner cette force ? */
export function maiaCouvre(elo: number): boolean {
  return elo >= MAIA_MIN_ELO && elo <= MAIA_MAX_ELO
}

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
 * Le bas de l'échelle s'arrête à 100 Elo, plancher retenu par les plateformes
 * en ligne — Chess.com ne descend pas plus bas, et la FIDE, qui ne publie rien
 * sous 1 000, ne dit rien de ce qui se joue en dessous. C'est le niveau de
 * quelqu'un qui connaît le déplacement des pièces et rien d'autre, et il faut
 * bien que ce joueur-là ait un adversaire.
 *
 * Sous 1150 Elo, `UCI_Elo` n'existe pas : on brise volontairement le moteur
 * avec un `Skill Level` bas, une profondeur d'une poignée de coups et une forte
 * température. Au-dessus, on laisse Stockfish faire son travail de simulation.
 * Les cinq derniers niveaux retirent tout bridage et augmentent la profondeur.
 */
/*
  Les niveaux faibles regardent **plus** de coups, pas moins.

  C'est contre-intuitif et c'est pourtant la seule façon de jouer faiblement :
  le moteur ne rend que ses `multiPv` meilleurs coups, et ses six meilleurs
  sont tous raisonnables. Avec une liste de six, un bot de 250 Elo tirait au
  sort parmi six bons coups — d'où un joueur de club, quelle que soit la
  température. Élargir la liste est ce qui met de vraies fautes à sa portée ;
  la fenêtre de tolérance, elle, continue d'écarter les catastrophes.

  Le calcul reste gratuit : à ces niveaux la recherche s'arrête à un ou deux
  demi-coups. Vingt lignes est le plafond du client de moteur, relevé pour
  l'occasion — dix ne suffisaient pas à contenir une vraie faute de débutant.
*/
/*
  ── Quinze échelons, et pourquoi l'échelle ne commence plus à 100 ───────────

  Elle en portait vingt-sept, de 320 à 3200. Deux mesures ont défait ce
  découpage, et la seconde est la plus dérangeante.

  **Le haut était du décor.** Dix-huit échelons entre 1320 et 3200, espacés de
  cent dix points : personne ne distingue un adversaire à 2400 d'un à 2510.

  **Le bas n'était pas étiquetable.** Les écarts entre échelons voisins ont été
  mesurés en parties — `scripts/etalonner-bots.mjs` —, et l'intervalle entre le
  premier échelon et le brideur `UCI_Elo` vaut mille sept cent soixante points,
  non les mille deux cent vingt que l'échelle annonçait. Ancrées sur 1320, seul
  point calibré de l'extérieur, les étiquettes honnêtes des quatre premiers
  échelons tombent à −444, −150 et 47. Un bot qui tire presque au hasard parmi
  vingt coups ne se décrit pas en Elo : il est sous le plancher de l'échelle.

  On a donc retiré ce qu'on ne savait pas nommer. Le premier échelon vaut
  maintenant 320, et les étiquettes en dessous de 1320 sont les écarts mesurés
  reportés depuis l'ancre — non plus une suite régulière décidée à l'avance.
  Au-dessus, l'étiquette **est** la valeur passée à `UCI_Elo` : c'est Stockfish
  qui la tient, elle ne se discute pas. C'est là qu'on a remis de la finesse,
  puisque c'est là qu'elle veut dire quelque chose.

  ── Ce que ça coûte, et qui doit le savoir ──────────────────────────────────

  Le débutant absolu perd sa rampe. Son adversaire le plus faible jouait
  au-dessous de tout classement ; il vaut désormais 320, et un vrai débutant
  perdra contre lui. C'est le prix d'une étiquette qui ne ment pas, et c'est un
  arbitrage de produit, pas une conséquence technique : rien n'empêche de
  rajouter un ou deux échelons d'entraînement sous 320, à condition de ne pas
  leur coller un nombre qui ressemble à un Elo.

  Les réglages moteur des survivants n'ont pas bougé : ce sont ceux que la
  mesure a trouvés monotones.
*/
const LEVEL_TABLE: LevelSpec[] = [
  {
    elo: 320,
    personality: 'prudent',
    skill: 2,
    depth: 3,
    movetimeMs: 260,
    temperature: 0.64,
    multiPv: 10,
    nodes: 7000,
  },
  {
    elo: 630,
    personality: 'novice',
    skill: 3,
    depth: 4,
    movetimeMs: 300,
    temperature: 0.55,
    multiPv: 8,
    nodes: 14000,
  },
  {
    elo: 980,
    personality: 'fonceur',
    skill: 4,
    depth: 5,
    movetimeMs: 360,
    temperature: 0.44,
    multiPv: 6,
    nodes: 40000,
  },
  {
    elo: 1120,
    personality: 'prudent',
    skill: 5,
    depth: 6,
    movetimeMs: 380,
    temperature: 0.41,
    multiPv: 5,
    nodes: 60000,
  },
  {
    elo: 1320,
    personality: 'prudent',
    skill: 5,
    depth: 6,
    movetimeMs: 400,
    temperature: 0.38,
    multiPv: 4,
  },
  {
    elo: 1450,
    personality: 'tacticien',
    skill: 6,
    depth: 7,
    movetimeMs: 450,
    temperature: 0.32,
    multiPv: 4,
  },
  {
    elo: 1650,
    personality: 'gambiteur',
    skill: 8,
    depth: 8,
    movetimeMs: 550,
    temperature: 0.25,
    multiPv: 3,
  },
  {
    elo: 1850,
    personality: 'prudent',
    skill: 10,
    depth: 10,
    movetimeMs: 650,
    temperature: 0.2,
    multiPv: 3,
  },
  {
    elo: 2050,
    personality: 'positionnel',
    skill: 12,
    depth: 12,
    movetimeMs: 800,
    temperature: 0.16,
    multiPv: 3,
  },
  {
    elo: 2250,
    personality: 'gambiteur',
    skill: 14,
    depth: 14,
    movetimeMs: 1000,
    temperature: 0.12,
    multiPv: 3,
  },
  {
    elo: 2400,
    personality: 'positionnel',
    skill: 16,
    depth: 16,
    movetimeMs: 1200,
    temperature: 0.1,
    multiPv: 2,
  },
  {
    elo: 2700,
    personality: 'prudent',
    skill: 18,
    depth: 20,
    movetimeMs: 1600,
    temperature: 0.06,
    multiPv: 2,
  },
  {
    elo: 2850,
    personality: 'machine',
    skill: 20,
    depth: 14,
    movetimeMs: 1200,
    temperature: 0.04,
    multiPv: 2,
  },
  {
    elo: 3050,
    personality: 'machine',
    skill: 20,
    depth: 22,
    movetimeMs: 2500,
    temperature: 0,
    multiPv: 1,
  },
  {
    elo: 3200,
    personality: 'machine',
    skill: 20,
    depth: 30,
    movetimeMs: 6000,
    temperature: 0,
    multiPv: 1,
  },
]

/** Les 15 niveaux jouables, prêts à l'emploi. */
export const BOT_LEVELS: BotLevel[] = LEVEL_TABLE.map((spec, index) => {
  const level = index + 1
  const personality = BOT_PERSONALITIES[spec.personality]
  const useUciElo = spec.elo >= STOCKFISH_MIN_ELO && spec.elo <= STOCKFISH_MAX_ELO
  return {
    level,
    elo: spec.elo,
    personality: spec.personality,
    // Le nom du niveau se compose à l'affichage : « Pion · niveau 3 » ne se
    // monte pas de la même façon dans toutes les langues, et le cœur n'a pas
    // de dictionnaire pour le dire.
    nomKey: personality.name,
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

/**
 * Les niveaux tenus par une personnalité, du plus faible au plus fort.
 *
 * Une personnalité revient à plusieurs paliers de l'échelle — Rempart en tient
 * quatre, Oracle les cinq derniers. Sa fiche l'annonce, et l'écran de réglages
 * s'en sert pour honorer « Jouer contre Mirage ».
 */
export function niveauxDe(id: BotPersonalityId): BotLevel[] {
  return BOT_LEVELS.filter((niveau) => niveau.personality === id)
}

/**
 * Le niveau de cette personnalité le plus proche d'un niveau souhaité.
 *
 * Arriver depuis la fiche d'un adversaire pose une contrainte — *lui* — et une
 * préférence — la force qu'on a l'habitude d'affronter. On garde la contrainte
 * et l'on approche la préférence, plutôt que de servir systématiquement le
 * palier le plus faible : demander Oracle ne doit pas donner le niveau 21 à
 * quelqu'un qui joue au 25, ni l'inverse.
 *
 * Rend `souhaite` inchangé si la personnalité est inconnue : l'appelant n'a
 * alors rien demandé de particulier.
 */
export function niveauProche(id: BotPersonalityId, souhaite: number): number {
  const siens = niveauxDe(id)
  if (siens.length === 0) return souhaite
  let meilleur = siens[0]!.level
  let ecart = Infinity
  for (const niveau of siens) {
    const distance = Math.abs(niveau.level - souhaite)
    if (distance < ecart) {
      ecart = distance
      meilleur = niveau.level
    }
  }
  return meilleur
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

  /*
    Ce qu'un bot s'autorise à perdre sur un coup.

    Le plafond grandit avec la température, donc avec la faiblesse du bot. Il
    grandissait trop lentement en bas de l'échelle : entre le niveau 1 et le
    niveau 3, il passait de 500 à 426 centipions — trois quarts de pion d'écart
    pour deux crans annoncés à 250 et 550 Elo. Les trois premiers niveaux
    jouaient donc la même partie, et descendre le curseur ne se voyait pas.

    Le terme cubique ne se réveille qu'aux températures élevées, c'est-à-dire
    aux tout premiers niveaux : 1 000 centipions au niveau 1, 722 au niveau 3,
    240 au niveau 8, et rien de changé au-delà. Mille centipions, c'est une
    dame en l'air — ce qui arrive à un joueur de 250 Elo, et n'arrive jamais à
    un joueur de 1 320.
  */
  const tolerance = 40 + config.temperature * 460 + config.temperature ** 3 * 500
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

  /*
    Softmax : plus la température est haute, plus les coups moyens ont leur
    chance.

    L'échelle était divisée par la température au lieu d'être multipliée, et
    cela renversait tout le barème. Une grande échelle aplatit la distribution
    — tous les coups deviennent également probables ; une petite la resserre
    sur le meilleur. En divisant, le bot de niveau 1 (température 1) recevait
    l'échelle la plus *serrée* et jouait donc presque toujours le meilleur coup
    de sa liste, pendant que le niveau 25 (température 0,02) recevait une
    échelle de 6 000 centipions et tirait au hasard parmi ses candidats.

    Mesuré avant correction, sur un éventail d'évaluations réaliste : perte
    moyenne de 50 centipions par coup au niveau 1, 41 au niveau 8, 12 au niveau
    18. Les huit premiers niveaux — 250 à 1320 Elo annoncés — jouaient tous à
    la même force, celle d'un joueur de club. Le curseur ne servait à rien, ce
    qui est exactement ce qu'on nous rapportait.

    L'échelle vaut désormais la largeur de la fenêtre de tolérance : le pire
    coup encore admis garde à peu près une chance sur trois chez un bot faible,
    et pratiquement aucune chez un bot fort — dont la fenêtre se réduit de
    toute façon à quelques dizaines de centipions.
  */
  const scale = Math.max(20, 460 * config.temperature)
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
