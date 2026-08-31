/**
 * Systèmes de classement.
 *
 * Deux systèmes coexistent volontairement :
 *
 *  - **Elo** (Arpad Elo, 1960) : le classique, transparent, celui que tout le
 *    monde connaît. On l'affiche pour que le joueur comprenne d'où vient son
 *    score et puisse le recalculer à la main.
 *  - **Glicko-2** (Mark Glickman, 2001) : ce qu'utilisent réellement Lichess et
 *    la FIDE en ligne. Il ajoute un **écart-type** (RD) — l'incertitude sur le
 *    niveau réel — et une **volatilité**. Un nouveau joueur bouge vite, un
 *    joueur établi bouge lentement, et l'inactivité ré-augmente l'incertitude.
 *
 * Le classement officiel de la plateforme est le Glicko-2 ; l'Elo est affiché
 * en parallèle à titre pédagogique.
 */

// ─────────────────────────────────────────────────────────────────────────────
//  Elo classique
// ─────────────────────────────────────────────────────────────────────────────

/** Résultat d'une partie du point de vue du joueur : 1 gain, 0.5 nulle, 0 perte. */
export type GameScore = 0 | 0.5 | 1

/**
 * Espérance de gain d'un joueur face à un adversaire.
 *
 * 400 points d'écart ⇒ 10 fois plus de chances de gagner (~91 %).
 */
export function eloExpectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400))
}

/**
 * Facteur K de la FIDE : détermine l'amplitude des variations.
 *
 *  - 40 pour un joueur neuf (moins de 30 parties) — il doit trouver son niveau vite
 *  - 20 pour un joueur établi sous 2400
 *  - 10 pour les forts joueurs, dont le classement est déjà fiable
 */
export function eloKFactor(rating: number, gamesPlayed: number): number {
  if (gamesPlayed < 30) return 40
  if (rating >= 2400) return 10
  return 20
}

export interface EloUpdate {
  rating: number
  delta: number
  expected: number
  kFactor: number
}

/** Applique une partie au classement Elo d'un joueur. */
export function updateElo(
  rating: number,
  opponentRating: number,
  score: GameScore,
  gamesPlayed = 100,
  kFactor?: number,
): EloUpdate {
  const k = kFactor ?? eloKFactor(rating, gamesPlayed)
  const expected = eloExpectedScore(rating, opponentRating)
  const delta = Math.round(k * (score - expected))
  return { rating: rating + delta, delta, expected, kFactor: k }
}

/**
 * Classement de performance : le niveau qu'il aurait fallu avoir pour réaliser
 * ce score contre ces adversaires. Sert à afficher « tu as joué comme un 1650 »
 * après un tournoi ou une série.
 */
export function performanceRating(
  opponentRatings: number[],
  scoreTotal: number,
): number {
  if (opponentRatings.length === 0) return 1500
  const avg =
    opponentRatings.reduce((a, b) => a + b, 0) / opponentRatings.length
  const p = scoreTotal / opponentRatings.length
  // Table FIDE approchée par sa forme analytique, bornée pour éviter ±∞.
  const clamped = Math.max(0.005, Math.min(0.995, p))
  return Math.round(avg - 400 * Math.log10(1 / clamped - 1))
}

// ─────────────────────────────────────────────────────────────────────────────
//  Glicko-2
// ─────────────────────────────────────────────────────────────────────────────

/** Facteur de conversion entre l'échelle Elo et l'échelle interne de Glicko-2. */
const GLICKO_SCALE = 173.7178

/**
 * Centre de l'échelle.
 *
 * Ce n'est **pas** le classement d'un nouveau joueur — voir `CLASSEMENT_DEPART`
 * juste en dessous. C'est le point de référence des formules de Glicko-2 : les
 * classements y sont ramenés avant calcul, et le résultat en repart. Il ne
 * change pas, sous peine de déplacer tous les classements existants.
 */
export const GLICKO_DEFAULT_RATING = 1500

/**
 * Le classement d'un joueur qui n'a encore rien joué.
 *
 * 100, et non le centre de l'échelle. Glicko-2 place traditionnellement les
 * nouveaux venus au milieu, ce qui suppose une population dont ils sont la
 * moyenne. Ici c'est faux : on s'inscrit sur cette plateforme parce qu'on
 * débute. Annoncer 1500 à quelqu'un qui apprend le déplacement du cavalier lui
 * donne un chiffre qu'il ne comprend pas, puis le fait *descendre* pendant ses
 * vingt premières parties — sa progression réelle s'affichait en chute libre.
 *
 * En partant bas, la courbe raconte enfin ce qui se passe : elle monte.
 *
 * Cent précisément, parce que c'est le plancher des plateformes en ligne et
 * celui du barème des adversaires de cette application : un seul chiffre pour
 * dire « on commence ici », le même partout.
 *
 * L'incertitude initiale, elle, ne bouge pas : `GLICKO_DEFAULT_RD` vaut
 * toujours 350, ce qui laisse le classement bondir dès les premières parties
 * si le niveau est en fait bien supérieur. Quelqu'un qui joue à 1600 rejoint
 * son niveau en une poignée de parties, sans avoir eu à le déclarer.
 */
export const CLASSEMENT_DEPART = 100

/**
 * En dessous, un classement ne descend pas.
 *
 * Un plancher n'est pas une décoration : sans lui, Glicko-2 et l'Elo classique
 * n'ont aucune borne inférieure. Quelqu'un qui commence à 100 et perd ses
 * premières parties passe à 80, puis 60, puis zéro, puis en négatif — et l'on
 * affiche à un débutant un nombre qui n'existe dans aucun classement au monde,
 * au moment précis où il a le plus besoin qu'on ne l'enfonce pas.
 *
 * C'est aussi ce qui rend la valeur de départ honnête : annoncer « on commence
 * à 100 » suppose que 100 soit un plancher, pas un point de passage. Les
 * plateformes en ligne procèdent ainsi.
 *
 * Le calcul, lui, n'est pas faussé : on borne la valeur *enregistrée*, et la
 * partie suivante repart de là. Un joueur bloqué au plancher remonte dès sa
 * première victoire, l'écart-type étant resté grand.
 */
export const CLASSEMENT_PLANCHER = 100

/** Écart-type initial : un nouveau joueur est très incertain. */
export const GLICKO_DEFAULT_RD = 350

/** Volatilité initiale, valeur recommandée par Glickman. */
export const GLICKO_DEFAULT_VOLATILITY = 0.09

/**
 * Constante système τ : limite l'amplitude des variations de volatilité.
 * Plus τ est petit, plus le système est stable. Lichess utilise 0.75.
 */
const GLICKO_TAU = 0.75

/** Plafond de RD : au-delà, le classement est considéré comme « provisoire ». */
const GLICKO_MAX_RD = 500

/** Plancher de RD : on ne prétend jamais connaître le niveau à mieux que ça. */
const GLICKO_MIN_RD = 45

export interface GlickoRating {
  /** Classement affiché, échelle Elo. */
  rating: number
  /** Écart-type (rating deviation). Un intervalle à 95 % vaut ±2·RD. */
  rd: number
  /** Volatilité σ : à quel point le niveau du joueur est erratique. */
  volatility: number
}

export interface GlickoOpponent {
  rating: number
  rd: number
  score: GameScore
}

export function defaultGlicko(): GlickoRating {
  return {
    rating: CLASSEMENT_DEPART,
    rd: GLICKO_DEFAULT_RD,
    volatility: GLICKO_DEFAULT_VOLATILITY,
  }
}

/** Facteur d'atténuation g(φ) : plus l'adversaire est incertain, moins il compte. */
function g(phi: number): number {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI))
}

/** Espérance de gain dans l'échelle interne. */
function expectation(mu: number, muJ: number, phiJ: number): number {
  return 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)))
}

/**
 * Met à jour un classement Glicko-2 après une période de parties.
 *
 * Le système est conçu pour traiter un lot de parties d'un coup. En jeu en
 * ligne on l'applique partie par partie (lot de taille 1), ce que fait aussi
 * Lichess : c'est légèrement moins précis mais permet un classement en direct.
 */
export function updateGlicko(
  player: GlickoRating,
  opponents: GlickoOpponent[],
): GlickoRating {
  // Aucune partie : seule l'incertitude augmente (le joueur « rouille »).
  if (opponents.length === 0) {
    return {
      rating: player.rating,
      rd: Math.min(
        GLICKO_MAX_RD,
        Math.sqrt(player.rd ** 2 + (player.volatility * GLICKO_SCALE) ** 2),
      ),
      volatility: player.volatility,
    }
  }

  // 1. Passage à l'échelle interne.
  const mu = (player.rating - GLICKO_DEFAULT_RATING) / GLICKO_SCALE
  const phi = player.rd / GLICKO_SCALE
  const sigma = player.volatility

  // 2. Variance de l'estimation, à partir des seules parties jouées.
  let vInv = 0
  let deltaSum = 0
  for (const opp of opponents) {
    const muJ = (opp.rating - GLICKO_DEFAULT_RATING) / GLICKO_SCALE
    const phiJ = opp.rd / GLICKO_SCALE
    const e = expectation(mu, muJ, phiJ)
    const gJ = g(phiJ)
    vInv += gJ * gJ * e * (1 - e)
    deltaSum += gJ * (opp.score - e)
  }
  if (vInv <= 0) return player
  const v = 1 / vInv

  // 3. Écart entre performance observée et performance attendue.
  const delta = v * deltaSum

  // 4. Nouvelle volatilité, par la méthode d'Illinois (régula falsi améliorée).
  const sigmaPrime = solveVolatility(sigma, phi, v, delta)

  // 5. Pré-période : l'incertitude grandit du fait de la volatilité.
  const phiStar = Math.sqrt(phi * phi + sigmaPrime * sigmaPrime)

  // 6. Nouvelles valeurs.
  const phiPrime = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v)
  const muPrime = mu + phiPrime * phiPrime * deltaSum

  // 7. Retour à l'échelle Elo, avec bornes de sécurité.
  return {
    rating: Math.round(GLICKO_DEFAULT_RATING + GLICKO_SCALE * muPrime),
    rd: Math.round(
      Math.max(GLICKO_MIN_RD, Math.min(GLICKO_MAX_RD, GLICKO_SCALE * phiPrime)),
    ),
    volatility: Number(sigmaPrime.toFixed(6)),
  }
}

/**
 * Résout l'équation en σ′ de Glickman par l'algorithme d'Illinois.
 * Converge en une poignée d'itérations ; le garde-fou à 100 tours n'est là que
 * pour rendre la fonction totale.
 */
function solveVolatility(
  sigma: number,
  phi: number,
  v: number,
  delta: number,
): number {
  const a = Math.log(sigma * sigma)
  const epsilon = 0.000001
  const tauSq = GLICKO_TAU * GLICKO_TAU

  const f = (x: number): number => {
    const ex = Math.exp(x)
    const num = ex * (delta * delta - phi * phi - v - ex)
    const den = 2 * (phi * phi + v + ex) ** 2
    return num / den - (x - a) / tauSq
  }

  let A = a
  let B: number
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v)
  } else {
    let k = 1
    while (f(a - k * GLICKO_TAU) < 0 && k < 100) k++
    B = a - k * GLICKO_TAU
  }

  let fA = f(A)
  let fB = f(B)
  let iterations = 0
  while (Math.abs(B - A) > epsilon && iterations < 100) {
    const C = A + ((A - B) * fA) / (fB - fA)
    const fC = f(C)
    if (fC * fB <= 0) {
      A = B
      fA = fB
    } else {
      fA = fA / 2
    }
    B = C
    fB = fC
    iterations++
  }
  return Math.exp(A / 2)
}

/**
 * Applique l'inactivité : le RD remonte avec le temps écoulé depuis la dernière
 * partie. Sans cela, un joueur absent six mois reviendrait avec un classement
 * faussement certain.
 *
 * @param days jours écoulés depuis la dernière partie
 */
export function decayGlicko(rating: GlickoRating, days: number): GlickoRating {
  if (days <= 0) return rating
  // Une « période de classement » ≈ une semaine de jeu régulier.
  const periods = days / 7
  const phi = rating.rd / GLICKO_SCALE
  const phiDecayed = Math.sqrt(phi * phi + periods * rating.volatility ** 2)
  return {
    ...rating,
    rd: Math.round(
      Math.max(GLICKO_MIN_RD, Math.min(GLICKO_MAX_RD, GLICKO_SCALE * phiDecayed)),
    ),
  }
}

/** Vrai tant que le classement n'est pas fiable (affiché avec un `?`). */
export function isProvisional(rating: GlickoRating): boolean {
  return rating.rd > 110
}

/**
 * Intervalle de confiance à 95 % du niveau réel.
 * C'est ce qu'on montre au joueur : « ton niveau est entre 1420 et 1680 ».
 */
export function ratingInterval(rating: GlickoRating): [number, number] {
  return [
    Math.round(rating.rating - 2 * rating.rd),
    Math.round(rating.rating + 2 * rating.rd),
  ]
}

/**
 * Classement « conservateur » utilisé pour les classements généraux : on retire
 * deux écarts-types pour qu'un joueur ne puisse pas squatter le haut du tableau
 * avec trois parties gagnées par chance.
 */
export function leaderboardRating(rating: GlickoRating): number {
  return Math.round(rating.rating - 2 * rating.rd + 2 * GLICKO_MIN_RD)
}

// ─────────────────────────────────────────────────────────────────────────────
//  Aides d'affichage
// ─────────────────────────────────────────────────────────────────────────────

/** Titre honorifique associé à une tranche de classement. */
export function ratingTitle(rating: number): { fr: string; en: string; tier: number } {
  const tiers: Array<{ min: number; fr: string; en: string }> = [
    { min: 2500, fr: 'Grand Maître', en: 'Grandmaster' },
    { min: 2300, fr: 'Maître International', en: 'International Master' },
    { min: 2100, fr: 'Maître', en: 'Master' },
    { min: 1900, fr: 'Expert', en: 'Expert' },
    { min: 1700, fr: 'Confirmé', en: 'Advanced' },
    { min: 1500, fr: 'Intermédiaire', en: 'Intermediate' },
    { min: 1300, fr: 'Amateur', en: 'Casual' },
    { min: 1100, fr: 'Apprenti', en: 'Apprentice' },
    { min: 0, fr: 'Débutant', en: 'Beginner' },
  ]
  const index = tiers.findIndex((t) => rating >= t.min)
  const tier = tiers[index] ?? tiers[tiers.length - 1]!
  return { fr: tier.fr, en: tier.en, tier: tiers.length - index }
}

/**
 * Prédit le résultat d'une confrontation, en pourcentages.
 * Sert à afficher les cotes avant une partie entre amis.
 */
export function matchOdds(
  a: number,
  b: number,
): { win: number; draw: number; loss: number } {
  const expected = eloExpectedScore(a, b)
  // Probabilité de nulle décroissante avec l'écart de niveau.
  const draw = 0.34 * Math.exp(-(((a - b) / 500) ** 2))
  const win = expected - draw / 2
  return {
    win: Math.round(Math.max(0, win) * 1000) / 10,
    draw: Math.round(draw * 1000) / 10,
    loss: Math.round(Math.max(0, 1 - win - draw) * 1000) / 10,
  }
}
