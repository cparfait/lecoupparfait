/**
 * Les séances pédagogiques.
 *
 * Une séance, c'est une partie contre l'ordinateur avec trois choses de plus,
 * et aucune n'est un moteur neuf :
 *
 *  1. **Un adversaire calibré** sur le palier — le niveau est choisi pour toi,
 *     pas réglé au curseur ;
 *  2. **un thème annoncé avant de commencer**, avec ce qu'on cherche à faire et
 *     ce qu'on regarde ;
 *  3. **un bilan qui dit où le thème est apparu**, compté sur la partie réelle.
 *
 * Le troisième point est le seul qui demande du calcul, et il n'appelle pas le
 * moteur : `detectPositionMotifs` est une fonction pure du cœur, qui lit une
 * position et rend les motifs présents. On l'exécute sur chaque position après
 * un coup du joueur, et l'on compte les occurrences de ceux du thème. C'est
 * donc une mesure sur *sa* partie, pas une statistique générale — et elle
 * fonctionne hors ligne, à la vitesse d'un parcours de plateau.
 *
 * ── Pourquoi un thème, et pas simplement « joue » ────────────────────────────
 *
 * Le mode commenté explique déjà chaque coup. Ce qu'il ne fait pas, c'est
 * donner une *intention* avant la partie : sans elle, on lit trente
 * commentaires sans rien en retenir, parce qu'ils parlent de trente choses
 * différentes. Annoncer « aujourd'hui, les colonnes ouvertes » transforme les
 * mêmes trente commentaires en trente exemples de la même idée.
 */

import { Chess } from 'chess.js'
import { detectPositionMotifs, type MotifId } from '@coupparfait/core'
import { PALIERS, palierPour, type Palier } from '@/lib/apprendre/palier.ts'
import { THEMES_SEANCE, type ThemeSeance } from './themesSeance.ts'

// Le catalogue vit à côté, dans un fichier sans alias `@/` pour rester lisible
// par le script de contrôle. On le réexporte : les appelants n'ont pas à savoir
// qu'il a été séparé.
export { THEMES_SEANCE, type ThemeSeance } from './themesSeance.ts'

/** Les thèmes qui ont un sens à ce palier-là. */
export function themesPour(palierId: string): ThemeSeance[] {
  const retenus = THEMES_SEANCE.filter((theme) => theme.paliers.includes(palierId))
  // Un palier sans thème dédié — cela n'arrive pas aujourd'hui, mais un palier
  // ajouté demain l'aurait — reçoit la liste entière plutôt qu'une page vide.
  return retenus.length > 0 ? retenus : THEMES_SEANCE
}

export function themeSeance(id: string): ThemeSeance | null {
  return THEMES_SEANCE.find((theme) => theme.id === id) ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
//  Transport par l'adresse
// ─────────────────────────────────────────────────────────────────────────────

export interface Seance {
  palier: Palier
  theme: ThemeSeance
}

/**
 * Le lien qui lance une séance.
 *
 * Un seul paramètre, `palier.theme`, et non deux : la partie contre
 * l'ordinateur lit déjà six paramètres d'adresse différents — `tournoi`,
 * `chapitre`, `perso`, `fen`, `niveau`, `tc` — et chacun vient avec son effet
 * de bord sur l'écran de réglages. Un seul jeton à reconnaître, c'est un seul
 * endroit à lire et à valider.
 */
export function lienDeSeance(palierId: string, themeId: string): string {
  return `/jouer/ordinateur?seance=${encodeURIComponent(`${palierId}.${themeId}`)}`
}

/** La séance demandée par l'adresse, ou `null` si elle n'en demande aucune. */
export function seanceDeLUrl(search: string): Seance | null {
  const brut = new URLSearchParams(search).get('seance')
  if (!brut) return null

  const [palierId, themeId] = brut.split('.')
  const palier = PALIERS.find((entree) => entree.id === palierId)
  const theme = themeId ? themeSeance(themeId) : null
  if (!palier || !theme) return null

  return { palier, theme }
}

/** Le palier à proposer par défaut, d'après un niveau estimé. */
export function palierParDefaut(elo: number | null): Palier {
  // Sans mesure, on propose le palier où se trouve la majorité des gens qui
  // arrivent ici : celui où l'on ne donne plus de pièces mais où l'on ne voit
  // pas encore ce que l'autre prépare. Se tromper vers le bas est sans
  // conséquence — on règle le niveau d'un clic — alors que proposer une séance
  // à 1 900 à un débutant le renvoie de l'application.
  if (elo == null) return PALIERS[1]!
  return palierPour(elo)
}

// ─────────────────────────────────────────────────────────────────────────────
//  Le relevé du thème pendant la partie
// ─────────────────────────────────────────────────────────────────────────────

export interface ReleveDuTheme {
  /** Positions où le thème était présent pour le joueur. */
  pour: number
  /** Positions où il était présent pour l'adversaire — donc contre le joueur. */
  contre: number
  /** Numéros de coup où il est apparu, pour pouvoir y retourner. */
  coups: number[]
}

/**
 * Compte les apparitions du thème dans une partie.
 *
 * On rejoue les coups et on interroge chaque position. Deux précisions qui
 * évitent de raconter n'importe quoi dans le bilan :
 *
 *  - **On n'examine que les positions après un coup du joueur.** Un motif qui
 *    apparaît après un coup de l'ordinateur ne lui est pas imputable, et le
 *    bilan dirait « tu as créé six avant-postes » pour des cases que l'autre a
 *    concédées.
 *  - **On ne compte qu'une fois par coup.** Un clouage présent pendant dix
 *    coups est le même clouage ; le compter dix fois donnerait des nombres
 *    flatteurs et faux. La comparaison se fait donc sur la position précédente.
 *
 * Le coût est celui d'un parcours de plateau par coup — quelques millisecondes
 * pour une partie de soixante coups. Aucun appel au moteur.
 */
export function releverLeTheme(
  coups: string[],
  couleurDuJoueur: 'w' | 'b',
  motifs: MotifId[],
  departFen?: string,
): ReleveDuTheme {
  const cherches = new Set<string>(motifs)
  const releve: ReleveDuTheme = { pour: 0, contre: 0, coups: [] }

  let echiquier: Chess
  try {
    echiquier = departFen ? new Chess(departFen) : new Chess()
  } catch {
    return releve
  }

  /** Motifs du thème présents à la position précédente, par camp. */
  let precedents = { w: new Set<string>(), b: new Set<string>() }

  for (const [index, san] of coups.entries()) {
    try {
      echiquier.move(san)
    } catch {
      // Un coup illisible arrête le relevé : la suite porterait sur une
      // position qui n'a pas existé.
      break
    }

    const auJoueur = (index % 2 === 0 ? 'w' : 'b') === couleurDuJoueur
    if (!auJoueur) continue

    const presents = { w: new Set<string>(), b: new Set<string>() }
    for (const motif of detectPositionMotifs(echiquier, { minWeight: 0.25 })) {
      if (cherches.has(motif.id)) presents[motif.side].add(motif.id)
    }

    const nouveauxPour = [...presents[couleurDuJoueur]].filter(
      (id) => !precedents[couleurDuJoueur].has(id),
    )
    const adverse = couleurDuJoueur === 'w' ? 'b' : 'w'
    const nouveauxContre = [...presents[adverse]].filter((id) => !precedents[adverse].has(id))

    if (nouveauxPour.length > 0) {
      releve.pour += nouveauxPour.length
      releve.coups.push(Math.floor(index / 2) + 1)
    }
    releve.contre += nouveauxContre.length

    precedents = presents
  }

  return releve
}

// ─────────────────────────────────────────────────────────────────────────────
//  Séances déjà faites, dans le navigateur
// ─────────────────────────────────────────────────────────────────────────────

const CLE = 'coupparfait.seances'

/** Nombre de séances terminées par thème. */
export type SeancesFaites = Record<string, number>

export function lireSeances(): SeancesFaites {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(CLE) ?? '{}') as SeancesFaites
  } catch {
    return {}
  }
}

export function noterSeance(themeId: string): void {
  if (typeof window === 'undefined') return
  try {
    const faites = lireSeances()
    faites[themeId] = (faites[themeId] ?? 0) + 1
    window.localStorage.setItem(CLE, JSON.stringify(faites))
  } catch {
    // Stockage refusé : la séance a eu lieu, elle ne sera simplement pas
    // comptée. Rien à signaler au joueur, qui n'a rien demandé de ce côté.
  }
}
