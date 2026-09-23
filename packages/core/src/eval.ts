/**
 * Conversion des évaluations moteur en grandeurs lisibles par un humain.
 *
 * Un moteur parle en centipions (« +1.34 »), ce qui ne dit rien à un débutant
 * et écrase les nuances : passer de +8 à +7 n'a aucune importance, passer de
 * 0.0 à −1.0 en a énormément. On convertit donc tout en **chances de victoire**
 * (0–100 %), une échelle où une même variation représente toujours la même
 * gravité. Les classifications et la précision sont bâties là-dessus.
 *
 * La courbe centipions → chances de victoire est celle calibrée par Lichess sur
 * des dizaines de millions de parties réelles.
 */

import type { Color, MoveQuality, Score } from './types.ts'

/** Constante de la sigmoïde Lichess (ajustée sur la base de parties réelles). */
const WIN_CURVE_K = 0.00368208

/** Au-delà, un avantage matériel supplémentaire ne change plus rien. */
export const CP_CLAMP = 1000

/** Valeur en centipions attribuée à un mat, pour les graphiques. */
const MATE_CP = 12800

// ─────────────────────────────────────────────────────────────────────────────
//  Score ↔ centipions
// ─────────────────────────────────────────────────────────────────────────────

/** Normalise un `Score` en centipions signés (positif = les Blancs sont mieux). */
export function scoreToCp(score: Score): number {
  if (score.type === 'mate') {
    // Un mat plus court vaut « mieux » qu'un mat long, d'où la décroissance.
    const magnitude = MATE_CP - Math.min(Math.abs(score.value), 60) * 100
    return score.value >= 0 ? magnitude : -magnitude
  }
  return score.value
}

/** Centipions bornés à ±{@link CP_CLAMP}, pour les courbes et l'ACPL. */
export function clampCp(cp: number): number {
  return Math.max(-CP_CLAMP, Math.min(CP_CLAMP, cp))
}

/** Vrai si le score annonce un mat forcé. */
export function isMate(score: Score): boolean {
  return score.type === 'mate'
}

/**
 * Retourne le score du point de vue du camp indiqué.
 * Les scores circulent toujours normalisés côté Blancs dans l'application.
 */
export function scoreForColor(score: Score, color: Color): Score {
  if (color === 'w') return score
  return score.type === 'mate'
    ? { type: 'mate', value: -score.value }
    : { type: 'cp', value: -score.value }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Chances de victoire
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Chances de victoire des **Blancs**, de 0 à 100.
 *
 * `0` = les Noirs gagnent à coup sûr, `50` = équilibre, `100` = les Blancs
 * gagnent à coup sûr. Un mat forcé sature à 0 ou 100.
 */
export function winPercent(score: Score): number {
  if (score.type === 'mate') {
    if (score.value === 0) return 50 // position déjà matée, pas de sens
    return score.value > 0 ? 100 : 0
  }
  const cp = clampCp(score.value)
  const chances = 2 / (1 + Math.exp(-WIN_CURVE_K * cp)) - 1
  return 50 + 50 * chances
}

/** Chances de victoire du camp indiqué, de 0 à 100. */
export function winPercentFor(score: Score, color: Color): number {
  const white = winPercent(score)
  return color === 'w' ? white : 100 - white
}

/**
 * Décomposition victoire / nulle / défaite pour les Blancs, en pourcentages.
 *
 * La probabilité de nulle est modélisée par une gaussienne centrée sur
 * l'égalité : plus la position est équilibrée, plus la nulle est probable, et
 * elle s'amenuise quand l'avantage grandit. Utile pour la barre d'évaluation
 * en trois segments.
 */
export function outcomeProbabilities(
  score: Score,
  phase: 'opening' | 'middlegame' | 'endgame' = 'middlegame',
): { win: number; draw: number; loss: number } {
  if (score.type === 'mate') {
    return score.value > 0 ? { win: 100, draw: 0, loss: 0 } : { win: 0, draw: 0, loss: 100 }
  }
  const cp = clampCp(score.value)
  // Les finales sont plus « nulleuses » à avantage égal, les ouvertures moins.
  const drawPeak = phase === 'endgame' ? 46 : phase === 'opening' ? 34 : 38
  const spread = phase === 'endgame' ? 160 : 130
  const draw = drawPeak * Math.exp(-((cp / spread) ** 2))
  const white = winPercent(score) / 100
  const remaining = 100 - draw
  return {
    win: remaining * white,
    draw,
    loss: remaining * (1 - white),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Précision
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Précision d'un coup, de 0 à 100, à partir de la perte de chances de victoire.
 *
 * Courbe exponentielle Lichess : perdre 0 pt = 100 %, 5 pts ≈ 80 %,
 * 10 pts ≈ 63 %, 25 pts ≈ 32 %, 50 pts ≈ 8 %.
 */
export function moveAccuracy(winBefore: number, winAfter: number): number {
  const drop = Math.max(0, winBefore - winAfter)
  if (drop === 0) return 100
  const raw = 103.1668 * Math.exp(-0.04354 * drop) - 3.1669
  return Math.max(0, Math.min(100, raw))
}

/**
 * Précision globale d'un camp sur une partie.
 *
 * On combine deux moyennes :
 *  - une **moyenne pondérée par la volatilité** — se tromper dans une position
 *    calme et stable est plus grave que dans un chaos tactique ;
 *  - une **moyenne harmonique** — qui empêche une série de coups faciles de
 *    masquer une gaffe décisive.
 *
 * @param accuracies précision de chaque coup du camp, dans l'ordre
 * @param winPercents chances de victoire après chaque demi-coup de la partie
 *                    entière (les deux camps), côté Blancs
 */
export function gameAccuracy(accuracies: number[], winPercents: number[]): number {
  if (accuracies.length === 0) return 100

  // Fenêtre glissante : entre 2 et 8 demi-coups selon la longueur de la partie.
  const windowSize = Math.max(2, Math.min(8, Math.floor(winPercents.length / 10)))
  const weights: number[] = []
  for (let i = 0; i < accuracies.length; i++) {
    const centre = Math.min(i * 2, Math.max(0, winPercents.length - 1))
    const start = Math.max(0, centre - windowSize)
    const end = Math.min(winPercents.length, centre + windowSize + 1)
    const slice = winPercents.slice(start, end)
    // L'écart-type des chances de victoire mesure la volatilité locale.
    weights.push(Math.max(0.5, Math.min(12, standardDeviation(slice))))
  }

  const weighted = weightedMean(accuracies, weights)
  const harmonic = harmonicMean(accuracies)
  return round2(Math.max(0, Math.min(100, (weighted + harmonic) / 2)))
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0.5
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function weightedMean(values: number[], weights: number[]): number {
  let num = 0
  let den = 0
  for (let i = 0; i < values.length; i++) {
    const w = weights[i] ?? 1
    num += (values[i] ?? 0) * w
    den += w
  }
  return den === 0 ? 100 : num / den
}

function harmonicMean(values: number[]): number {
  // On plancher à 1 pour éviter la division par zéro sur une précision nulle.
  const den = values.reduce((acc, v) => acc + 1 / Math.max(1, v), 0)
  return den === 0 ? 100 : values.length / den
}

// ─────────────────────────────────────────────────────────────────────────────
//  Perte en centipions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Perte en centipions d'un coup, du point de vue du joueur qui l'a joué.
 * Bornée à ±1000 pour qu'une position déjà perdue ne fasse pas exploser l'ACPL.
 */
export function centipawnLoss(before: Score, after: Score, mover: Color): number {
  const b = clampCp(scoreToCp(scoreForColor(before, mover)))
  const a = clampCp(scoreToCp(scoreForColor(after, mover)))
  return Math.max(0, b - a)
}

/** Perte moyenne en centipions (Average Centipawn Loss). */
export function averageCentipawnLoss(losses: number[]): number {
  if (losses.length === 0) return 0
  return Math.round(losses.reduce((a, b) => a + b, 0) / losses.length)
}

// ─────────────────────────────────────────────────────────────────────────────
//  Estimation de niveau
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Repères de calibration, et **contrat de la fonction**.
 *
 * Chaque entrée associe une perte moyenne, une précision typique à ce niveau
 * de jeu, et l'Elo que la performance vaut. Les couples ACPL/précision sont
 * ceux qu'on observe ensemble sur les serveurs en ligne : à 60 centipions de
 * perte moyenne on tourne autour de 72 % de précision, pas de 88 %.
 *
 * `scripts/check-elo.mjs` vérifie que la fonction les respecte. Ce n'est pas du
 * zèle : la version précédente documentait exactement ces repères et n'en
 * atteignait aucun — elle rendait 450 là où elle annonçait 1000, et une valeur
 * **négative** pour le terme ACPL d'un débutant. Personne ne l'avait vu parce
 * que le mélange et le plancher ramenaient le résultat dans le plausible.
 */
/** Le plancher de l'estimation, aligné sur le premier échelon de `BOT_LEVELS`. */
export const ELO_PLANCHER = 100

export const ELO_ANCHORS: ReadonlyArray<{ acpl: number; accuracy: number; elo: number }> = [
  { acpl: 110, accuracy: 55, elo: 1000 },
  { acpl: 60, accuracy: 72, elo: 1500 },
  { acpl: 35, accuracy: 82, elo: 1900 },
  { acpl: 20, accuracy: 90, elo: 2300 },
  { acpl: 10, accuracy: 95, elo: 2700 },
]

/**
 * Estime l'Elo correspondant à une performance sur **une** partie.
 *
 * Ce n'est pas un classement : c'est ce que vaut la qualité des coups joués ce
 * jour-là. On peut perdre lourdement en obtenant un chiffre élevé — une seule
 * gaffe suffit à perdre une partie dont les trente autres coups étaient
 * propres. Et face à un adversaire faible, qui ne pose aucun problème, la
 * mesure est flattée : les positions restent simples.
 *
 * Deux estimateurs, mélangés :
 *  - **l'ACPL**, en logarithme — un centipion perdu de plus compte beaucoup à
 *    2500 et presque rien à 900. Il pèse le plus : il est robuste sur les
 *    parties courtes.
 *  - **la précision**, linéaire, en ajustement. Elle apporte ce que l'ACPL
 *    ignore : la perte moyenne traite un coup catastrophique et dix coups
 *    tièdes de la même façon, la précision non.
 */
export function estimateElo(acpl: number, accuracy: number, moveCount: number): number {
  if (moveCount < 6) return 1200 // trop court pour conclure quoi que ce soit
  const fromAcpl = 4390 - 710 * Math.log(Math.max(4, acpl))
  const fromAccuracy = 41.1 * accuracy - 1362
  // On fait davantage confiance à l'ACPL, plus robuste sur les parties courtes.
  const blended = 0.65 * fromAcpl + 0.35 * fromAccuracy
  // Une partie de 10 coups ne prouve pas grand-chose : on ramène vers 1200.
  const confidence = Math.min(1, moveCount / 40)
  const estimate = 1200 + (blended - 1200) * confidence
  // Le plancher est celui de l'échelle des adversaires, 100 : c'est là que les
  // plateformes classent qui vient d'apprendre les déplacements. À 400, un
  // débutant qui battait le niveau 1 (100) lisait « 400 » après son analyse,
  // une performance de trois cents points au-dessus de ce qu'il venait de
  // jouer, et toutes les parties faibles se confondaient sur ce nombre.
  return Math.round(Math.max(ELO_PLANCHER, Math.min(3000, estimate)) / 25) * 25
}

// ─────────────────────────────────────────────────────────────────────────────
//  Formatage
// ─────────────────────────────────────────────────────────────────────────────

/** Rend un score lisible : `+1.34`, `−0.62`, `M5`, `−M3`. */
export function formatScore(score: Score, color: Color = 'w'): string {
  const s = scoreForColor(score, color)
  if (s.type === 'mate') {
    if (s.value === 0) return '#'
    return s.value > 0 ? `M${s.value}` : `−M${Math.abs(s.value)}`
  }
  const pawns = s.value / 100
  const sign = pawns > 0 ? '+' : pawns < 0 ? '−' : ''
  return `${sign}${Math.abs(pawns).toFixed(2)}`
}

/** Étiquette courte de l'avantage, pour les commentaires. */
export function advantageLabel(
  score: Score,
): 'blancGagne' | 'blancMieux' | 'blancLeger' | 'egal' | 'noirLeger' | 'noirMieux' | 'noirGagne' {
  if (score.type === 'mate') return score.value > 0 ? 'blancGagne' : 'noirGagne'
  const cp = score.value
  if (cp >= 500) return 'blancGagne'
  if (cp >= 150) return 'blancMieux'
  if (cp >= 50) return 'blancLeger'
  if (cp > -50) return 'egal'
  if (cp > -150) return 'noirLeger'
  if (cp > -500) return 'noirMieux'
  return 'noirGagne'
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ─────────────────────────────────────────────────────────────────────────────
//  Seuils de classification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Seuils exprimés en **points de chances de victoire perdus**.
 * Ils sont volontairement un peu plus indulgents que ceux de Lichess pour ne
 * pas décourager un débutant à qui l'on afficherait « gaffe » à chaque coup.
 */
export const QUALITY_THRESHOLDS = {
  excellent: 2,
  good: 5,
  inaccuracy: 10,
  mistake: 20,
} as const

/** Qualité déduite de la seule perte de chances de victoire. */
export function qualityFromWinLoss(winLoss: number): MoveQuality {
  if (winLoss < QUALITY_THRESHOLDS.excellent) return 'excellent'
  if (winLoss < QUALITY_THRESHOLDS.good) return 'good'
  if (winLoss < QUALITY_THRESHOLDS.inaccuracy) return 'inaccuracy'
  if (winLoss < QUALITY_THRESHOLDS.mistake) return 'mistake'
  return 'blunder'
}
