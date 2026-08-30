/**
 * Le tournoi contre l'ordinateur.
 *
 * Un humain, plusieurs adversaires artificiels, un toutes rondes : on affronte
 * chacun une fois, et le classement se fait aux points.
 *
 * **Pourquoi ce format et pas l'arène.** L'arène existante est entièrement
 * pilotée par le serveur : ses participants sont des lignes de `users`, ses
 * appariements passent par le serveur temps réel, et un adversaire artificiel
 * n'a ni compte ni connexion. Y greffer des bots demanderait un client robot
 * dans le serveur temps réel — beaucoup de mécanique pour un besoin qui n'en
 * réclame aucune. Le toutes rondes, lui, tient entièrement dans le navigateur,
 * fonctionne sans compte, et se reprend là où on l'a laissé.
 *
 * **Les parties entre robots ne sont pas jouées, elles sont tirées.** Les faire
 * jouer pour de vrai coûterait plusieurs minutes de calcul par ronde, pendant
 * lesquelles l'écran ne servirait à rien. On tire donc leur résultat selon
 * l'écart de classement, avec la formule d'Elo — c'est ce que ferait un
 * organisateur qui simule un tournoi, c'est statistiquement juste sur la durée,
 * et l'interface le dit au lieu de le cacher.
 */

import { botLevel, BOT_LEVELS, BOT_PERSONALITIES } from './bots.ts'
import type { BotPersonalityId } from './types.ts'

// ─────────────────────────────────────────────────────────────────────────────
//  Le plateau de participants
// ─────────────────────────────────────────────────────────────────────────────

export interface Concurrent {
  /** `humain` pour le joueur, sinon l'indice du bot dans la grille. */
  id: string
  nom: string
  /** Niveau du barème, 1 à 25. `null` pour l'humain. */
  niveau: number | null
  elo: number
  personnalite: BotPersonalityId | null
  emoji: string
}

export interface Duel {
  /** Ronde, à partir de 1. */
  ronde: number
  blancs: string
  noirs: string
  /** `1-0`, `0-1`, `1/2-1/2`, ou `*` tant qu'il n'est pas joué. */
  resultat: string
  /** Vrai si le résultat a été tiré au sort plutôt que joué. */
  simule: boolean
}

export interface TournoiSolo {
  /** Cadence, en secondes, telle que l'écran de jeu l'attend. */
  cadence: string
  concurrents: Concurrent[]
  duels: Duel[]
  /** Ronde en cours, à partir de 1. */
  ronde: number
  commenceLe: string
}

/** L'identifiant du joueur humain, partout. */
export const HUMAIN = 'humain'

/**
 * Choix possibles pour la force du plateau.
 *
 * `aleatoire` tire chaque adversaire indépendamment dans une fourchette autour
 * du niveau demandé. C'est ce qui rend un tournoi intéressant : affronter cinq
 * fois la même force revient à jouer cinq fois la même partie, et l'on
 * n'apprend pas où se situe sa limite.
 */
export type ChoixDeForce = { type: 'fixe'; niveau: number } | { type: 'aleatoire'; niveau: number }

/** Écart de niveau appliqué de part et d'autre en mode aléatoire. */
export const AMPLITUDE_ALEATOIRE = 4

/**
 * Les caractères, dans l'ordre où on les distribue au plateau.
 *
 * Du plus lisible au plus abstrait : on commence par des styles qu'un débutant
 * reconnaît en une partie — celui qui prend tout, celui qui n'ose rien, celui
 * qui fonce — et l'on garde Oracle, qui n'a pas de style, pour la fin.
 */
const CARACTERES: BotPersonalityId[] = [
  'prudent',
  'fonceur',
  'tacticien',
  'positionnel',
  'gambiteur',
  'novice',
  'machine',
]

/**
 * Compose le plateau.
 *
 * `tirage` est injecté plutôt qu'appelé directement : c'est ce qui rend la
 * composition reproductible dans les contrôles, et c'est aussi ce qui permet
 * de rejouer exactement le même tournoi depuis sa sauvegarde.
 */
export function composerPlateau(
  options: { adversaires: number; force: ChoixDeForce; nomDuJoueur?: string },
  tirage: () => number = Math.random,
): Concurrent[] {
  const { adversaires, force } = options

  const joueur: Concurrent = {
    id: HUMAIN,
    nom: options.nomDuJoueur?.trim() || 'Toi',
    niveau: null,
    // Le classement du joueur n'entre dans aucun calcul : ses parties sont
    // jouées, pas tirées. On affiche celui de la fourchette pour situer.
    elo: botLevel(force.niveau).elo,
    personnalite: null,
    emoji: '🙂',
  }

  const utilises = new Set<number>()
  const bots: Concurrent[] = []
  for (let i = 0; i < adversaires; i++) {
    let niveau = force.niveau
    if (force.type === 'aleatoire') {
      const ecart = Math.round((tirage() * 2 - 1) * AMPLITUDE_ALEATOIRE)
      niveau = Math.max(1, Math.min(BOT_LEVELS.length, force.niveau + ecart))
    }
    // Deux adversaires du même niveau porteraient le même nom et la même force :
    // on décale d'un cran plutôt que d'afficher deux fois « Pion · 1000 ».
    while (utilises.has(niveau) && utilises.size < BOT_LEVELS.length) {
      niveau = niveau < BOT_LEVELS.length ? niveau + 1 : niveau - 1
    }
    utilises.add(niveau)

    const palier = botLevel(niveau)
    /*
      Le style est distribué, pas déduit du niveau.

      Le barème associe une personnalité à chaque palier de force, ce qui va
      très bien quand on choisit un adversaire — mais produit un plateau où
      deux concurrents portent le même nom et le même visage, « Pion 550 » et
      « Pion 1000 ». On tourne donc sur les sept caractères, ce qui donne un
      plateau lisible d'un coup d'œil et, accessoirement, sept façons de jouer
      différentes à affronter dans le même tournoi.

      `useBotPlayer` sait recevoir un style imposé — la même entorse que le mode
      carrière, pour la même raison : la force et le caractère sont deux
      réglages distincts.
    */
    const personnalite = CARACTERES[i % CARACTERES.length]!
    bots.push({
      id: `bot-${niveau}`,
      nom: BOT_PERSONALITIES[personnalite].name.fr,
      niveau,
      elo: palier.elo,
      personnalite,
      emoji: BOT_PERSONALITIES[personnalite].emoji,
    })
  }

  bots.sort((a, b) => a.elo - b.elo)
  return [joueur, ...bots]
}

// ─────────────────────────────────────────────────────────────────────────────
//  Le calendrier
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construit le toutes rondes, méthode du cercle.
 *
 * Un concurrent reste fixe, les autres tournent : chacun rencontre chacun
 * exactement une fois, en `n-1` rondes pour un nombre pair de participants.
 * Quand ils sont en nombre impair, un s'assoit à chaque ronde — c'est le
 * « bye », et il ne rapporte aucun point ici, contrairement à l'usage des
 * tournois officiels : on ne récompense pas de ne pas avoir joué.
 */
export function composerCalendrier(concurrents: Concurrent[]): Duel[] {
  const ids = concurrents.map((c) => c.id)
  // Un fantôme pour équilibrer : ses rencontres sont des repos.
  const pair = ids.length % 2 === 0 ? [...ids] : [...ids, '']
  const rondes = pair.length - 1
  const moitie = pair.length / 2

  const duels: Duel[] = []
  let roue = [...pair]

  for (let ronde = 1; ronde <= rondes; ronde++) {
    for (let i = 0; i < moitie; i++) {
      const a = roue[i]!
      const b = roue[roue.length - 1 - i]!
      if (!a || !b) continue
      // Les couleurs alternent d'une ronde à l'autre pour la première table,
      // ce qui répartit correctement sur l'ensemble du tournoi.
      const aBlancs = (ronde + i) % 2 === 0
      duels.push({
        ronde,
        blancs: aBlancs ? a : b,
        noirs: aBlancs ? b : a,
        resultat: '*',
        simule: a !== HUMAIN && b !== HUMAIN,
      })
    }
    // Le premier reste, les autres tournent d'un cran.
    roue = [roue[0]!, roue[roue.length - 1]!, ...roue.slice(1, roue.length - 1)]
  }

  return duels
}

// ─────────────────────────────────────────────────────────────────────────────
//  Résultats
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tire le résultat d'une partie entre deux robots.
 *
 * Formule d'Elo : l'espérance de score des Blancs vaut
 * `1 / (1 + 10^((elo_noirs − elo_blancs) / 400))`. Une nulle comptant un demi,
 * la probabilité de victoire doit valoir **espérance moins la moitié des
 * nulles** — et non l'espérance appliquée à ce qui reste une fois les nulles
 * retirées.
 *
 * La nuance n'est pas théorique. Le premier jet tirait d'abord la nulle, puis
 * répartissait le reste selon l'espérance : mesuré sur vingt mille tirages, un
 * 1600 contre un 1200 marquait 0,853 au lieu de 0,909. Sur un tournoi entier,
 * c'est un avantage systématique offert au plus faible — exactement le genre de
 * biais qu'on ne voit pas en regardant une partie et qui fausse tout un
 * classement. `scripts/check-tournoi.mjs` le vérifie désormais.
 *
 * La part de nulles est plafonnée à un tiers : entre deux moteurs bridés de
 * même force, l'issue reste très ouverte. Elle est en outre bornée par ce que
 * l'espérance autorise, sinon un écart écrasant produirait une probabilité de
 * victoire négative.
 */
export function tirerResultat(eloBlancs: number, eloNoirs: number, tirage: () => number): string {
  const esperance = 1 / (1 + 10 ** ((eloNoirs - eloBlancs) / 400))
  const ecart = Math.abs(eloBlancs - eloNoirs)

  // Deux bornes : l'espérance du plus faible ne peut pas être dépassée par la
  // moitié des nulles, dans un sens comme dans l'autre.
  const souhaitee = Math.max(0.05, 0.33 - ecart / 2000)
  const nulle = Math.min(souhaitee, 2 * esperance, 2 * (1 - esperance))

  const victoire = esperance - nulle / 2

  const de = tirage()
  if (de < nulle) return '1/2-1/2'
  return de < nulle + victoire ? '1-0' : '0-1'
}

/** Points marqués par un concurrent, à raison d'un point la victoire. */
export function points(duels: Duel[], id: string): number {
  let total = 0
  for (const duel of duels) {
    if (duel.resultat === '*') continue
    if (duel.blancs === id) total += duel.resultat === '1-0' ? 1 : duel.resultat === '1/2-1/2' ? 0.5 : 0
    else if (duel.noirs === id) total += duel.resultat === '0-1' ? 1 : duel.resultat === '1/2-1/2' ? 0.5 : 0
  }
  return total
}

export interface Ligne {
  concurrent: Concurrent
  points: number
  joues: number
  rang: number
}

/**
 * Le classement.
 *
 * Départage aux points, puis au nombre de parties jouées — celui qui a le même
 * score en moins de parties est devant — puis au classement, le plus faible
 * d'abord : à points égaux, avoir tenu contre plus fort vaut mieux.
 */
export function classement(tournoi: TournoiSolo): Ligne[] {
  const lignes = tournoi.concurrents.map((concurrent) => ({
    concurrent,
    points: points(tournoi.duels, concurrent.id),
    joues: tournoi.duels.filter(
      (d) => d.resultat !== '*' && (d.blancs === concurrent.id || d.noirs === concurrent.id),
    ).length,
    rang: 0,
  }))

  lignes.sort(
    (a, b) => b.points - a.points || a.joues - b.joues || a.concurrent.elo - b.concurrent.elo,
  )
  lignes.forEach((ligne, index) => {
    ligne.rang = index + 1
  })
  return lignes
}

/** Le prochain duel du joueur, `null` quand le tournoi est fini. */
export function prochainDuel(tournoi: TournoiSolo): Duel | null {
  return (
    tournoi.duels.find(
      (d) => d.resultat === '*' && (d.blancs === HUMAIN || d.noirs === HUMAIN),
    ) ?? null
  )
}

/** Nombre total de rondes. */
export function nombreDeRondes(tournoi: TournoiSolo): number {
  return tournoi.duels.reduce((max, d) => Math.max(max, d.ronde), 0)
}

export function estTermine(tournoi: TournoiSolo): boolean {
  return tournoi.duels.every((d) => d.resultat !== '*')
}

export function concurrent(tournoi: TournoiSolo, id: string): Concurrent | null {
  return tournoi.concurrents.find((c) => c.id === id) ?? null
}

/**
 * Enregistre le résultat du duel du joueur, et déroule tout ce qui précède.
 *
 * Les parties entre robots des rondes déjà entamées sont tirées au passage :
 * on ne les résout pas d'avance, pour que le classement affiché ne dévoile
 * jamais une ronde que le joueur n'a pas encore disputée.
 */
export function enregistrer(
  tournoi: TournoiSolo,
  resultat: string,
  tirage: () => number = Math.random,
): TournoiSolo {
  const duels = tournoi.duels.map((d) => ({ ...d }))
  const mien = duels.find(
    (d) => d.resultat === '*' && (d.blancs === HUMAIN || d.noirs === HUMAIN),
  )
  if (!mien) return tournoi

  mien.resultat = resultat
  const ronde = mien.ronde

  for (const duel of duels) {
    if (duel.ronde > ronde || duel.resultat !== '*') continue
    const blancs = tournoi.concurrents.find((c) => c.id === duel.blancs)
    const noirs = tournoi.concurrents.find((c) => c.id === duel.noirs)
    if (!blancs || !noirs) continue
    duel.resultat = tirerResultat(blancs.elo, noirs.elo, tirage)
  }

  return { ...tournoi, duels, ronde: Math.min(ronde + 1, nombreDeRondes(tournoi)) }
}
