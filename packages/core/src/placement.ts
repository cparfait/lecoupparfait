/**
 * Lire un test de niveau.
 *
 * Le test d'entrée sert douze positions cotées, monte après une réussite,
 * descend après un échec, et doit finir par un nombre. Ce fichier ne décide pas
 * quelles positions servir — c'est l'écran qui tient l'escalier — il décide ce
 * que le relevé veut dire une fois qu'il est complet.
 *
 * ── Pourquoi pas la moyenne des dernières positions ──────────────────────────
 *
 * C'était la lecture précédente : la moyenne des cotes servies sur la seconde
 * moitié du test. Elle n'est pas absurde — la moyenne des dernières marches
 * d'un escalier adaptatif vise le point où l'on réussit une fois sur deux,
 * c'est-à-dire la définition même d'une cote — mais elle jette la moitié du
 * relevé, et la douzième réponse n'entrait dans aucun calcul : elle ne servait
 * qu'à déplacer une visée qu'on ne lisait plus.
 *
 * Simulé sur vingt mille tests par force (le modèle de réponse étant la formule
 * d'Elo elle-même, celle qui a servi à coter les positions) :
 *
 * | force réelle | moyenne des six dernières | ajustement ci-dessous |
 * |--------------|---------------------------|-----------------------|
 * | 900          | +7, σ 123                 | +16, σ **94**         |
 * | 1300         | −13, σ 126                | −42, σ **100**        |
 * | 2100         | −158, σ 110               | **−107**, σ 132       |
 * | 2400         | −331, σ 78                | **−157**, σ 143       |
 *
 * L'ajustement resserre la dispersion au centre et divise par deux l'erreur en
 * haut. Le biais résiduel du haut ne vient plus de la lecture mais du parcours :
 * douze pas dont la somme vaut 1 340 ne permettent pas d'atteindre 2 400 en
 * partant de 1 000. Aucun estimateur ne rattrape une position jamais servie.
 *
 * ── Ce que fait l'ajustement ────────────────────────────────────────────────
 *
 * Le maximum de vraisemblance du modèle d'Elo : on cherche la force `A` qui
 * rend le relevé le plus probable, sachant qu'un joueur de force `A` résout une
 * position cotée `R` avec la probabilité `1 / (1 + 10^((R − A) / 400))`.
 *
 * Deux pseudo-observations — une réussite et un échec à la cote de départ —
 * sont ajoutées au relevé. Sans elles, un sans-faute n'a pas de maximum fini :
 * plus on suppose le joueur fort, plus le relevé devient probable, et
 * l'estimation part à l'infini. Elles coûtent un léger tassement vers le centre
 * — visible dans la colonne de droite du tableau — et c'est un tassement
 * honnête : un joueur qui n'a jamais raté n'a pas montré sa limite.
 */

/** Une position servie, et ce que le joueur en a fait. */
export interface ObservationDeTest {
  /** Cote de la position **réellement servie**, pas celle qui était visée. */
  cote: number
  reussie: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
//  L'escalier
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Le pas de l'escalier, position après position.
 *
 * Douze valeurs décroissantes : on corrige largement au début — il s'agit de
 * trouver la bonne région de l'échelle, pas de la raffiner — puis de moins en
 * moins. À pas constant, le test oscillerait indéfiniment autour de la réponse ;
 * à pas trop vite resserré, une réussite chanceuse au premier essai plafonnerait
 * l'estimation.
 *
 * La somme vaut **1 340**, ce qui borne ce que le test peut atteindre : parti de
 * 1 000, il monte au plus à 2 340 et descend au plus au plancher du catalogue.
 * C'est la limite dont aucune lecture du relevé ne peut s'affranchir.
 *
 * Ces constantes vivent ici et non dans l'écran parce que le serveur en a besoin
 * lui aussi : il rejoue l'escalier pour vérifier qu'un relevé qu'on lui envoie
 * ressemble à un test réellement passé.
 */
export const PAS_DU_TEST = [220, 190, 160, 140, 120, 105, 90, 80, 70, 60, 55, 50] as const

/** Cote de la première position : le milieu de la population des puzzles. */
export const COTE_DE_DEPART = 1000

/** Plancher et plafond du catalogue : en dehors, on ne trouve plus rien. */
export const PLANCHER_DU_TEST = 500
export const PLAFOND_DU_TEST = 2600

/** La cote à demander après cette marche-ci. */
export function viseeSuivante(visee: number, marche: number, reussie: boolean): number {
  const pas = PAS_DU_TEST[marche] ?? PAS_DU_TEST[PAS_DU_TEST.length - 1]!
  return Math.max(PLANCHER_DU_TEST, Math.min(PLAFOND_DU_TEST, visee + (reussie ? pas : -pas)))
}

/**
 * Ce relevé ressemble-t-il à un test réellement passé ?
 *
 * On rejoue l'escalier depuis le départ et l'on vérifie que chaque position
 * servie était bien dans les parages de ce qui était demandé. Ce n'est pas une
 * preuve — le relevé vient du navigateur, qui peut prétendre avoir réussi ce
 * qu'il a raté — mais ça **borne le mensonge** : douze positions cotées 2 600
 * annoncées résolues ne forment pas un escalier, et sont refusées. Le meilleur
 * relevé fabriqué acceptable est alors un sans-faute, qui plafonne là où
 * plafonne le test lui-même.
 *
 * `tolerance` est plus large que la fenêtre de tirage du catalogue (±120) :
 * quand la fenêtre est vide, le service élargit et rend ce qu'il trouve. On
 * accepte donc `ecarts` positions hors des parages — celles-là mêmes — avant de
 * refuser le relevé.
 */
export function releveCoherent(
  observations: ObservationDeTest[],
  { tolerance = 200, ecarts = 2 }: { tolerance?: number; ecarts?: number } = {},
): boolean {
  if (observations.length === 0 || observations.length > PAS_DU_TEST.length) return false

  let visee = COTE_DE_DEPART
  let horsParages = 0
  for (const [marche, observation] of observations.entries()) {
    if (!Number.isFinite(observation.cote)) return false
    if (Math.abs(observation.cote - visee) > tolerance) horsParages++
    visee = viseeSuivante(visee, marche, observation.reussie)
  }
  return horsParages <= ecarts
}

export interface NiveauMesure {
  /** La force estimée, sur l'échelle des positions servies. */
  cote: number
  /**
   * L'écart-type de cette estimation, sur la même échelle.
   *
   * Tiré de l'information de Fisher du modèle, donc du relevé lui-même : un
   * test qui a hésité autour d'une cote la mesure mieux qu'un test qui a filé
   * tout droit vers le plafond, et le nombre le dit.
   */
  sigma: number
}

/** Pente de la courbe logistique d'Elo, en unités naturelles. */
const PENTE = Math.LN10 / 400

/** Bornes de recherche : hors de là, aucune position n'existe pour le vérifier. */
const MIN = 0
const MAX = 3500

function probabilite(cote: number, force: number): number {
  return 1 / (1 + Math.pow(10, (cote - force) / 400))
}

/**
 * La force qui explique le mieux ce relevé.
 *
 * La dérivée de la log-vraisemblance est strictement décroissante en `force` —
 * somme de termes `réussi − p(force)`, chacun décroissant —, donc elle s'annule
 * une fois et une seule : une bissection suffit, et elle converge toujours.
 * Pas de gradient, pas de pas d'apprentissage, pas de cas qui diverge.
 *
 * `depart` est la cote des deux pseudo-observations. C'est le milieu du
 * catalogue, celui d'où part l'escalier : on ne tasse pas vers une valeur
 * choisie après coup.
 */
export function mesurerNiveau(
  observations: ObservationDeTest[],
  depart: number,
): NiveauMesure | null {
  if (observations.length === 0) return null

  const derivee = (force: number): number => {
    let somme = 0
    for (const observation of observations) {
      somme += (observation.reussie ? 1 : 0) - probabilite(observation.cote, force)
    }
    // Les deux pseudo-observations, qui s'annulent mutuellement au départ et
    // retiennent l'estimation quand le relevé ne la borne pas.
    somme += 1 - probabilite(depart, force)
    somme += 0 - probabilite(depart, force)
    return somme
  }

  let bas = MIN
  let haut = MAX
  // Cinquante coupes ramènent l'intervalle sous le millième de point : bien
  // au-delà de ce qu'un classement affiche, et instantané pour douze termes.
  for (let i = 0; i < 50; i++) {
    const milieu = (bas + haut) / 2
    if (derivee(milieu) > 0) bas = milieu
    else haut = milieu
  }
  const force = (bas + haut) / 2

  /*
    L'incertitude, par l'information de Fisher.

    Chaque observation informe d'autant plus que son issue était incertaine :
    `p(1 − p)` vaut un quart quand la position était à la mesure du joueur, et
    tombe à zéro quand elle était hors de portée dans un sens ou dans l'autre.
    C'est la formulation exacte de « servir une position à 2 500 à un débutant
    n'apprend rien sur lui ».
  */
  let information = 0
  for (const observation of observations) {
    const p = probabilite(observation.cote, force)
    information += p * (1 - p)
  }
  const p0 = probabilite(depart, force)
  information += 2 * p0 * (1 - p0)
  information *= PENTE * PENTE

  return {
    cote: Math.round(force),
    // Une information nulle — relevé dégénéré — donnerait une division par
    // zéro : on rend alors l'écart-type le plus large que l'échelle admette,
    // ce qui est exactement ce que « on n'en sait rien » veut dire.
    sigma: information > 0 ? Math.round(1 / Math.sqrt(information)) : MAX - MIN,
  }
}

/**
 * L'incertitude de départ d'un classement amorcé par le test.
 *
 * **Pourquoi 200 et non l'écart-type rendu ci-dessus.** Celui-ci ne décrit que
 * le tirage des positions ; il ignore les deux erreurs qui le dominent — la
 * conversion entre l'échelle des positions et celle des parties, qui est une
 * droite approchée, et le fait qu'un test de tactique ne mesure pas tout à fait
 * ce qu'une partie mesure. Mesurée en simulation, l'erreur réelle du test sur
 * l'échelle des parties va de 75 points au centre à 250 aux extrémités.
 *
 * Deux cents est donc un choix délibérément large : assez bas pour que la cote
 * de départ veuille dire quelque chose — contre 350, qui dit « on n'en sait
 * rien » —, assez haut pour que les premières parties classées corrigent vite
 * un test qui se serait trompé.
 */
export const RD_APRES_TEST = 200
