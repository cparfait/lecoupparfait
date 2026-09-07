/**
 * Le calcul Elo, tel que la FIDE le pratique.
 *
 * Rien ici ne touche à React : on passe des cotes et des résultats, on reçoit
 * des variations. C'est ce qui rend le calcul relisible, et vérifiable par
 * `scripts/check-outils-elo.mjs` sans monter d'écran.
 *
 * ── Ce que dit le règlement de classement FIDE ─────────────────────────────
 *
 *  - Le **score attendu** contre un adversaire dépend de l'écart de cote. La
 *    FIDE le lit dans une table ; la formule logistique `1 / (1 + 10^(d/400))`
 *    en est l'origine et s'en écarte de quelques millièmes au plus. Elle a
 *    une règle en plus : un écart de plus de 400 points **compte pour 400**,
 *    ce qui garantit qu'une partie contre un joueur beaucoup plus faible
 *    rapporte encore quelque chose et qu'une défaite contre lui coûte cher.
 *  - La **variation** après une partie vaut `K × (résultat − attendu)`, et
 *    les variations d'un tournoi s'additionnent avant d'être arrondies.
 *  - Le **coefficient K** : 40 tant qu'on n'a pas trente parties classées,
 *    ou avant dix-huit ans tant qu'on reste sous 2300 ; 20 en dessous de
 *    2400 ; 10 une fois 2400 atteint, pour toujours.
 *  - La **performance** est la cote qu'il aurait fallu avoir pour que le
 *    score obtenu soit exactement le score attendu : la moyenne des
 *    adversaires, plus un écart lu dans la table de la FIDE. Cette table-là
 *    est reproduite, parce qu'elle est bornée à ±800 et que c'est ce que
 *    tout le monde lit sur les grilles de tournoi.
 */

export type Resultat = 1 | 0.5 | 0

/** Écart de cote au-delà duquel la FIDE ne compte plus la différence. */
export const PLAFOND_ECART = 400

/** Score attendu d'un joueur coté `moi` contre un joueur coté `adversaire`. */
export function scoreAttendu(moi: number, adversaire: number): number {
  const ecart = Math.max(-PLAFOND_ECART, Math.min(PLAFOND_ECART, adversaire - moi))
  return 1 / (1 + 10 ** (ecart / 400))
}

/** Variation après une partie, non arrondie. */
export function variation(k: number, resultat: Resultat, attendu: number): number {
  return k * (resultat - attendu)
}

/**
 * Le coefficient K qu'applique la FIDE.
 *
 * `parties` : nombre de parties classées déjà jouées ; `age` en années ;
 * `cote` : la cote actuelle ; `aAtteint2400` : a-t-on un jour été publié à
 * 2400 ou plus ? Ce dernier point ne se déduit pas de la cote du jour, d'où
 * la question posée à part.
 */
export function coefficientK({
  parties,
  age,
  cote,
  aAtteint2400,
}: {
  parties: number
  age: number | null
  cote: number
  aAtteint2400: boolean
}): 40 | 20 | 10 {
  if (aAtteint2400 || cote >= 2400) return 10
  if (parties < 30) return 40
  if (age != null && age < 18 && cote < 2300) return 40
  return 20
}

/**
 * Table de conversion FIDE : pourcentage → écart de performance.
 *
 * Indexée de 0 à 100 ; la moitié inférieure est le miroir de la supérieure.
 * Une performance à 100 % vaut +800, et c'est là que la table s'arrête : au
 * delà, la formule logistique file vers l'infini, et une grille de tournoi
 * ne dit jamais « performance : 4000 ».
 */
const ECARTS_PERFORMANCE = [
  0, 7, 14, 21, 29, 36, 43, 50, 57, 65, 72, 80, 87, 95, 102, 110, 117, 125, 133, 141, 149, 158, 166,
  175, 184, 193, 202, 211, 220, 230, 240, 251, 262, 273, 284, 296, 309, 322, 336, 351, 366, 383,
  401, 422, 444, 470, 501, 538, 589, 677, 800,
]

/** Écart de performance pour un pourcentage de points `p` entre 0 et 1. */
export function ecartPerformance(p: number): number {
  const centieme = Math.round(Math.max(0, Math.min(1, p)) * 100)
  return centieme >= 50 ? ECARTS_PERFORMANCE[centieme - 50]! : -ECARTS_PERFORMANCE[50 - centieme]!
}

export interface Partie {
  adversaire: number
  resultat: Resultat
}

export interface Bilan {
  /** Variation totale, non arrondie. */
  variation: number
  /** Nouvelle cote, arrondie à l'entier comme sur la liste publiée. */
  nouvelleCote: number
  /** Points marqués sur le nombre de parties. */
  points: number
  /** Somme des scores attendus. */
  attendu: number
  /** Cote moyenne des adversaires, ou `null` sans partie. */
  moyenneAdversaires: number | null
  /** Performance, ou `null` sans partie. */
  performance: number | null
  /** Le détail par partie, dans l'ordre donné. */
  parties: Array<Partie & { attendu: number; variation: number }>
}

/** Le bilan d'une série de parties, comme sur la fiche d'un tournoi. */
export function bilan(cote: number, k: number, parties: Partie[]): Bilan {
  const detail = parties.map((partie) => {
    const attendu = scoreAttendu(cote, partie.adversaire)
    return { ...partie, attendu, variation: variation(k, partie.resultat, attendu) }
  })
  const total = detail.reduce((somme, partie) => somme + partie.variation, 0)
  const points = detail.reduce((somme, partie) => somme + partie.resultat, 0)
  const attendu = detail.reduce((somme, partie) => somme + partie.attendu, 0)
  const moyenne =
    parties.length > 0
      ? parties.reduce((somme, partie) => somme + partie.adversaire, 0) / parties.length
      : null
  return {
    variation: total,
    nouvelleCote: Math.round(cote + total),
    points,
    attendu,
    moyenneAdversaires: moyenne,
    performance:
      moyenne == null ? null : Math.round(moyenne + ecartPerformance(points / parties.length)),
    parties: detail,
  }
}
