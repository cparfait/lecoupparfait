/**
 * Les paliers, et ce qui fait passer au suivant.
 *
 * Le programme est rangé par chapitres — les règles, les mats, la tactique,
 * l'ouverture —, et c'est l'ordre dans lequel on *apprend*. Ce n'est pas
 * l'ordre dans lequel on *cherche* : personne n'ouvre une application d'échecs
 * en se demandant « que me reste-t-il à voir au chapitre 5 ? ». La question
 * qu'on se pose est « je suis à 900, qu'est-ce qui me coûte des points ? ».
 *
 * Ce fichier répond à celle-là. Six paliers, et pour chacun quatre ou cinq
 * **leviers** : une chose à travailler, la raison pour laquelle elle coûte cher
 * à ce niveau-là précisément, et l'écran qui la travaille. Rien de neuf côté
 * contenu — les leçons, les thèmes de puzzles et les finales existent déjà ;
 * ce qui manquait, c'était l'ordre de priorité.
 *
 * ── Deux échelles, et on dit laquelle ────────────────────────────────────────
 *
 * Le classement de puzzles et celui des parties ne mesurent pas la même chose
 * et ne coïncident pas : on résout couramment des positions à 1 800 en jouant
 * ses parties à 1 200, parce qu'un puzzle annonce qu'il y a quelque chose à
 * trouver et qu'une partie ne l'annonce jamais. Les moyenner donnerait un
 * nombre qui ne veut rien dire.
 *
 * On choisit donc une source, et on l'affiche. Par ordre de préférence :
 * le classement en partie quand il y en a un — c'est lui qui mesure le jeu —,
 * sinon le classement de puzzles ramené à l'échelle des parties, sinon le test
 * de placement, sinon rien du tout, et dans ce dernier cas la page propose le
 * test au lieu de deviner.
 */

import type { MotifId } from '@coupparfait/core'
import type { TranslationKey } from '@/lib/i18n/index.tsx'

// ─────────────────────────────────────────────────────────────────────────────
//  Leviers
// ─────────────────────────────────────────────────────────────────────────────

/** Où mène un levier. Trois natures, trois écrans. */
export type CibleLevier =
  /** Une leçon guidée, par son identifiant dans `lib/lessons`. */
  | { type: 'lecon'; id: string }
  /** Un thème de puzzles, par son identifiant Lichess. */
  | { type: 'puzzle'; theme: MotifId | 'all' }
  /** N'importe quelle autre page de l'application. */
  | { type: 'page'; href: string; label: string }

export interface Levier {
  /**
   * Identifiant stable, qui nomme la clé de dictionnaire.
   *
   * Dérivé du texte et non du rang : sans lui, insérer une entrée au milieu de
   * la liste renommerait en silence toutes les suivantes, et chaque traduction
   * se retrouverait sur la mauvaise phrase.
   */
  id: string
  /** Ce qu'il y a à savoir faire, formulé comme une compétence. */
  titre: TranslationKey
  /**
   * Pourquoi ça coûte des points **à ce palier-là**.
   *
   * C'est la seule partie qui ne se déduit d'aucune donnée, et c'est celle qui
   * décide si l'on clique : « travaille les fourchettes » ne convainc personne,
   * « à 900, une fourchette de cavalier décide une partie sur trois » si.
   */
  pourquoi: TranslationKey
  cible: CibleLevier
}

export interface Palier {
  id: string
  /** Borne basse, incluse. */
  min: number
  /** Borne haute, incluse. `Infinity` pour le dernier. */
  max: number
  /** Le nom du palier, court, qui dit l'objectif et non le niveau. */
  nom: TranslationKey
  /** Une phrase : ce qu'on sait déjà faire, et ce qui bloque maintenant. */
  promesse: TranslationKey
  /** Niveau d'ordinateur à peu près équivalent, pour les séances. */
  niveauBot: number
  leviers: Levier[]
}

/**
 * Les six paliers.
 *
 * Les bornes viennent de ce qu'on observe dans les parties, pas d'une règle :
 * sous 650 on perd des pièces sans que l'adversaire ait rien fait pour, vers
 * 1 000 on ne les donne plus mais on ne voit pas ce que l'autre prépare, vers
 * 1 300 on voit les coups mais on ne sait pas quoi faire quand il n'y a rien à
 * prendre, et ainsi de suite. Chaque palier nomme ce qui *vient d'être acquis*
 * avant de dire ce qui manque : on ne progresse pas en se faisant énumérer ses
 * lacunes.
 */
export const PALIERS: Palier[] = [
  {
    id: 'regles',
    min: 0,
    max: 649,
    nom: 'paliers.regles.nom',
    promesse: 'paliers.regles.promesse',
    niveauBot: 3,
    leviers: [
      {
        id: 'les-trois-regles',
        titre: 'paliers.regles.leviers.les-trois-regles.titre',
        pourquoi: 'paliers.regles.leviers.les-trois-regles.pourquoi',
        cible: { type: 'lecon', id: 'regles-speciales' },
      },
      {
        id: 'mater-avec-roi',
        titre: 'paliers.regles.leviers.mater-avec-roi.titre',
        pourquoi: 'paliers.regles.leviers.mater-avec-roi.pourquoi',
        cible: { type: 'lecon', id: 'mat-tour-roi' },
      },
      {
        id: 'mater-avec-la',
        titre: 'paliers.regles.leviers.mater-avec-la.titre',
        pourquoi: 'paliers.regles.leviers.mater-avec-la.pourquoi',
        cible: { type: 'lecon', id: 'mat-dame-roi' },
      },
      {
        id: 'combien-vaut-chaque',
        titre: 'paliers.regles.leviers.combien-vaut-chaque.titre',
        pourquoi: 'paliers.regles.leviers.combien-vaut-chaque.pourquoi',
        cible: { type: 'lecon', id: 'valeurs' },
      },
      {
        id: 'reconnaitre-un-mat',
        titre: 'paliers.regles.leviers.reconnaitre-un-mat.titre',
        pourquoi: 'paliers.regles.leviers.reconnaitre-un-mat.pourquoi',
        cible: { type: 'puzzle', theme: 'mateIn1' },
      },
    ],
  },
  {
    id: 'pieces-en-prise',
    min: 650,
    max: 999,
    nom: 'paliers.pieces-en-prise.nom',
    promesse: 'paliers.pieces-en-prise.promesse',
    niveauBot: 5,
    leviers: [
      {
        id: 'voir-ce-qui',
        titre: 'paliers.pieces-en-prise.leviers.voir-ce-qui.titre',
        pourquoi: 'paliers.pieces-en-prise.leviers.voir-ce-qui.pourquoi',
        cible: { type: 'puzzle', theme: 'hangingPiece' },
      },
      {
        id: 'la-fourchette-de',
        titre: 'paliers.pieces-en-prise.leviers.la-fourchette-de.titre',
        pourquoi: 'paliers.pieces-en-prise.leviers.la-fourchette-de.pourquoi',
        cible: { type: 'lecon', id: 'fourchette' },
      },
      {
        id: 'les-quatre-mats',
        titre: 'paliers.pieces-en-prise.leviers.les-quatre-mats.titre',
        pourquoi: 'paliers.pieces-en-prise.leviers.les-quatre-mats.pourquoi',
        cible: {
          type: 'page',
          href: '/apprendre#mats-ouverture',
          label: 'Les mats de l’ouverture',
        },
      },
      {
        id: 'le-mat-du',
        titre: 'paliers.pieces-en-prise.leviers.le-mat-du.titre',
        pourquoi: 'paliers.pieces-en-prise.leviers.le-mat-du.pourquoi',
        cible: { type: 'lecon', id: 'mat-couloir' },
      },
      {
        id: 'les-trois-principes',
        titre: 'paliers.pieces-en-prise.leviers.les-trois-principes.titre',
        pourquoi: 'paliers.pieces-en-prise.leviers.les-trois-principes.pourquoi',
        cible: { type: 'lecon', id: 'principes-ouverture' },
      },
    ],
  },
  {
    id: 'voir-ladversaire',
    min: 1000,
    max: 1299,
    nom: 'paliers.voir-ladversaire.nom',
    promesse: 'paliers.voir-ladversaire.promesse',
    niveauBot: 6,
    leviers: [
      {
        id: 'le-clouage',
        titre: 'paliers.voir-ladversaire.leviers.le-clouage.titre',
        pourquoi: 'paliers.voir-ladversaire.leviers.le-clouage.pourquoi',
        cible: { type: 'lecon', id: 'clouage' },
      },
      {
        id: 'l-attaque-a',
        titre: 'paliers.voir-ladversaire.leviers.l-attaque-a.titre',
        pourquoi: 'paliers.voir-ladversaire.leviers.l-attaque-a.pourquoi',
        cible: { type: 'lecon', id: 'decouverte' },
      },
      {
        id: 'le-memo-avant',
        titre: 'paliers.voir-ladversaire.leviers.le-memo-avant.titre',
        pourquoi: 'paliers.voir-ladversaire.leviers.le-memo-avant.pourquoi',
        cible: { type: 'page', href: '/apprendre/principes', label: 'Les principes et le mémo' },
      },
      {
        id: 'le-mat-en',
        titre: 'paliers.voir-ladversaire.leviers.le-mat-en.titre',
        pourquoi: 'paliers.voir-ladversaire.leviers.le-mat-en.pourquoi',
        cible: { type: 'puzzle', theme: 'mateIn2' },
      },
      {
        id: 'les-quatre-erreurs',
        titre: 'paliers.voir-ladversaire.leviers.les-quatre-erreurs.titre',
        pourquoi: 'paliers.voir-ladversaire.leviers.les-quatre-erreurs.pourquoi',
        cible: { type: 'lecon', id: 'erreurs-ouverture' },
      },
    ],
  },
  {
    id: 'un-plan',
    min: 1300,
    max: 1599,
    nom: 'paliers.un-plan.nom',
    promesse: 'paliers.un-plan.promesse',
    niveauBot: 9,
    leviers: [
      {
        id: 'les-colonnes-ouvertes',
        titre: 'paliers.un-plan.leviers.les-colonnes-ouvertes.titre',
        pourquoi: 'paliers.un-plan.leviers.les-colonnes-ouvertes.pourquoi',
        cible: { type: 'lecon', id: 'colonnes-ouvertes' },
      },
      {
        id: 'l-avant-poste',
        titre: 'paliers.un-plan.leviers.l-avant-poste.titre',
        pourquoi: 'paliers.un-plan.leviers.l-avant-poste.pourquoi',
        cible: { type: 'lecon', id: 'avant-poste' },
      },
      {
        id: 'les-enjeux-de',
        titre: 'paliers.un-plan.leviers.les-enjeux-de.titre',
        pourquoi: 'paliers.un-plan.leviers.les-enjeux-de.pourquoi',
        cible: { type: 'page', href: '/ouvertures/enjeux', label: 'Les enjeux des ouvertures' },
      },
      {
        id: 'eliminer-le-defenseur',
        titre: 'paliers.un-plan.leviers.eliminer-le-defenseur.titre',
        pourquoi: 'paliers.un-plan.leviers.eliminer-le-defenseur.pourquoi',
        cible: { type: 'lecon', id: 'elimination-defenseur' },
      },
      {
        id: 'la-securite-du',
        titre: 'paliers.un-plan.leviers.la-securite-du.titre',
        pourquoi: 'paliers.un-plan.leviers.la-securite-du.pourquoi',
        cible: { type: 'lecon', id: 'securite-roi' },
      },
    ],
  },
  {
    id: 'technique',
    min: 1600,
    max: 1899,
    nom: 'paliers.technique.nom',
    promesse: 'paliers.technique.promesse',
    niveauBot: 11,
    leviers: [
      {
        id: 'l-opposition',
        titre: 'paliers.technique.leviers.l-opposition.titre',
        pourquoi: 'paliers.technique.leviers.l-opposition.pourquoi',
        cible: { type: 'lecon', id: 'opposition' },
      },
      {
        id: 'la-regle-du',
        titre: 'paliers.technique.leviers.la-regle-du.titre',
        pourquoi: 'paliers.technique.leviers.la-regle-du.pourquoi',
        cible: { type: 'lecon', id: 'regle-du-carre' },
      },
      {
        id: 'les-finales-objectif',
        titre: 'paliers.technique.leviers.les-finales-objectif.titre',
        pourquoi: 'paliers.technique.leviers.les-finales-objectif.pourquoi',
        cible: { type: 'page', href: '/finales', label: 'Les finales' },
      },
      {
        id: 'le-sacrifice-qui',
        titre: 'paliers.technique.leviers.le-sacrifice-qui.titre',
        pourquoi: 'paliers.technique.leviers.le-sacrifice-qui.pourquoi',
        cible: { type: 'lecon', id: 'sacrifice' },
      },
      {
        id: 'le-roi-devient',
        titre: 'paliers.technique.leviers.le-roi-devient.titre',
        pourquoi: 'paliers.technique.leviers.le-roi-devient.pourquoi',
        cible: { type: 'lecon', id: 'roi-actif' },
      },
    ],
  },
  {
    id: 'prophylaxie',
    min: 1900,
    max: Number.POSITIVE_INFINITY,
    nom: 'paliers.prophylaxie.nom',
    promesse: 'paliers.prophylaxie.promesse',
    niveauBot: 12,
    leviers: [
      {
        id: 'les-enfilades-et',
        titre: 'paliers.prophylaxie.leviers.les-enfilades-et.titre',
        pourquoi: 'paliers.prophylaxie.leviers.les-enfilades-et.pourquoi',
        cible: { type: 'lecon', id: 'enfilade' },
      },
      {
        id: 'le-zugzwang',
        titre: 'paliers.prophylaxie.leviers.le-zugzwang.titre',
        pourquoi: 'paliers.prophylaxie.leviers.le-zugzwang.pourquoi',
        cible: { type: 'puzzle', theme: 'zugzwang' },
      },
      {
        id: 'relire-ses-propres',
        titre: 'paliers.prophylaxie.leviers.relire-ses-propres.titre',
        pourquoi: 'paliers.prophylaxie.leviers.relire-ses-propres.pourquoi',
        cible: { type: 'page', href: '/analyse', label: 'Analyser une partie' },
      },
      {
        id: 'les-positions-ou',
        titre: 'paliers.prophylaxie.leviers.les-positions-ou.titre',
        pourquoi: 'paliers.prophylaxie.leviers.les-positions-ou.pourquoi',
        cible: { type: 'lecon', id: 'sacrifice' },
      },
    ],
  },
]

/** Le palier d'un niveau donné. Jamais `null` : les bornes couvrent tout. */
export function palierPour(elo: number): Palier {
  return (
    PALIERS.find((palier) => elo >= palier.min && elo <= palier.max) ?? PALIERS[PALIERS.length - 1]!
  )
}

/** Le palier suivant, ou `null` quand on est au dernier. */
export function palierSuivant(palier: Palier): Palier | null {
  const index = PALIERS.findIndex((entree) => entree.id === palier.id)
  return index >= 0 ? (PALIERS[index + 1] ?? null) : null
}

// ─────────────────────────────────────────────────────────────────────────────
//  Le niveau estimé, conservé dans le navigateur
// ─────────────────────────────────────────────────────────────────────────────

const CLE_NIVEAU = 'coupparfait.niveauEstime'

/** D'où vient le nombre qu'on affiche. On ne l'écrit jamais sans le dire. */
export type SourceNiveau = 'test' | 'partie' | 'puzzle' | 'declare'

export interface NiveauEstime {
  elo: number
  source: SourceNiveau
  /** Date de la mesure, en ISO court — `2026-09-12`. */
  le: string
  /** Nombre de positions du test, quand la source est le test. */
  positions?: number
}

/**
 * Le dernier niveau estimé par le test, s'il y en a un.
 *
 * Dans le navigateur et non en base, et c'est volontaire : le test de placement
 * doit fonctionner sans compte, parce que c'est exactement le moment où l'on
 * n'en a pas encore. Quand on est connecté, le classement du compte prend de
 * toute façon le dessus — voir `niveauRetenu`.
 */
export function lireNiveauEstime(): NiveauEstime | null {
  if (typeof window === 'undefined') return null
  try {
    const brut = window.localStorage.getItem(CLE_NIVEAU)
    if (!brut) return null
    const valeur = JSON.parse(brut) as NiveauEstime
    return Number.isFinite(valeur?.elo) ? valeur : null
  } catch {
    return null
  }
}

/**
 * Le relevé du dernier test, gardé en attendant qu'il y ait un compte.
 *
 * ── Pourquoi il faut le garder ───────────────────────────────────────────────
 *
 * Le test se passe très bien sans compte, et l'inscription y envoie
 * explicitement ceux qui ne savent pas quel niveau déclarer. Mais la mesure
 * n'amorce le classement que pour un compte connecté : quelqu'un qui se mesurait
 * à 1 400 *puis* s'inscrivait repartait de 100, et sa mesure ne vivait plus que
 * dans son navigateur. L'ordre recommandé par l'application était celui qui
 * perdait le résultat.
 *
 * On garde donc le **relevé** — les positions vues et ce qu'on en a fait — et
 * non la mesure : c'est le serveur qui mesure, à partir des cotes réelles du
 * catalogue, et lui envoyer un nombre rouvrirait la porte du « je déclare 2 400 ».
 * Voir `POST /api/niveau`.
 *
 * Il s'efface dès qu'il a été repris, ou après quinze jours : au-delà, le
 * relevé décrit quelqu'un d'autre.
 */
const CLE_RELEVE = 'coupparfait.releveTest'
const RELEVE_PERIME_JOURS = 15

export interface ReleveEnAttente {
  positions: Array<{ id: string; reussie: boolean }>
  /** Date du test, au format ISO court. */
  le: string
}

export function enregistrerReleveEnAttente(
  positions: Array<{ id: string; reussie: boolean }>,
): void {
  if (typeof window === 'undefined') return
  try {
    const valeur: ReleveEnAttente = { positions, le: aujourdhui() }
    window.localStorage.setItem(CLE_RELEVE, JSON.stringify(valeur))
  } catch {
    // Stockage refusé : la mesure ne suivra pas l'inscription, le test reste
    // juste. Rien à réparer côté appelant.
  }
}

export function lireReleveEnAttente(): ReleveEnAttente | null {
  if (typeof window === 'undefined') return null
  try {
    const brut = window.localStorage.getItem(CLE_RELEVE)
    if (!brut) return null
    const valeur = JSON.parse(brut) as ReleveEnAttente
    if (!Array.isArray(valeur?.positions) || valeur.positions.length === 0) return null
    const jours = (Date.now() - Date.parse(valeur.le)) / 86_400_000
    if (!Number.isFinite(jours) || jours > RELEVE_PERIME_JOURS) {
      oublierReleveEnAttente()
      return null
    }
    return valeur
  } catch {
    return null
  }
}

export function oublierReleveEnAttente(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(CLE_RELEVE)
  } catch {
    // Sans conséquence : au pire le relevé sera renvoyé une fois de trop, et
    // la route se contente de réécrire la même mesure.
  }
}

export function enregistrerNiveauEstime(valeur: NiveauEstime): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CLE_NIVEAU, JSON.stringify(valeur))
  } catch {
    // Stockage refusé : le résultat s'affiche quand même, il ne sera pas
    // retrouvé à la visite suivante. Rien à réparer côté appelant.
  }
}

/**
 * Le classement de puzzles, ramené à l'échelle des parties.
 *
 * Les deux échelles ne coïncident pas : un joueur qui résout à 1 800 joue ses
 * parties autour de 1 300. L'écart n'est pas une anomalie — un puzzle annonce
 * qu'il y a quelque chose à trouver, une partie ne l'annonce jamais — mais il
 * est assez régulier pour être corrigé plutôt qu'ignoré.
 *
 * La correction est affine et grossière : `300 + 0,6 c`, soit 1 000 en puzzles
 * ≈ 900 en parties et 2 000 ≈ 1 500. On ne prétend pas mieux, et c'est pour
 * cela que la page dit toujours d'où vient le nombre.
 *
 * **Le commentaire annonçait 1 000 → 800**, ce que la formule n'a jamais fait :
 * les deux points énoncés donneraient `100 + 0,7 c`. Cent points d'écart en bas
 * d'échelle, sur chaque résultat de test. La formule est conservée telle quelle
 * parce que la changer déplacerait tout le monde d'un coup, et que rien ici ne
 * dit laquelle des deux droites est la bonne : ces ancrages sont des ordres de
 * grandeur de la littérature, pas une mesure faite sur cette population. La
 * trancher demande de corréler, sur les comptes existants, le classement de
 * puzzles et le classement en partie — c'est ce que `level_tests` conserve
 * désormais les deux échelles pour permettre.
 */
export function puzzleVersPartie(cote: number): number {
  return Math.round(300 + 0.6 * cote)
}

/**
 * Un test plus vieux que cela mérite d'être refait.
 *
 * Trois mois : c'est le temps au bout duquel quelqu'un qui travaille a
 * changé de palier, et celui au bout duquel quelqu'un qui n'a pas joué a
 * perdu la main. Dans les deux cas, le programme proposé porte sur un joueur
 * qui n'existe plus.
 */
export const PEREMPTION_JOURS = 90

/** Depuis combien de jours la mesure date-t-elle ? `null` si la date est illisible. */
export function ancienneteEnJours(niveau: NiveauEstime): number | null {
  const quand = Date.parse(niveau.le)
  if (!Number.isFinite(quand)) return null
  return Math.max(0, Math.floor((Date.now() - quand) / 86_400_000))
}

/**
 * Le niveau qu'on retient, et pourquoi celui-là.
 *
 * L'ordre n'est pas négociable : une mesure faite sur de vraies parties vaut
 * mieux qu'une mesure faite sur des puzzles, qui vaut mieux qu'un test de
 * douze positions — qui vaut lui-même mieux que rien, c'est-à-dire mieux que
 * la déclaration faite à l'inscription, que personne ne vérifie. On rend donc
 * la meilleure disponible, et sa source, pour que l'affichage puisse la
 * nommer.
 */
export function niveauRetenu(sources: {
  /** Classement en partie le plus représentatif — le plus joué, pas le plus haut. */
  partie?: number | null
  /** Classement de puzzles, à l'échelle des puzzles. */
  puzzle?: number | null
  test?: NiveauEstime | null
}): NiveauEstime | null {
  if (sources.partie != null) {
    return { elo: sources.partie, source: 'partie', le: aujourdhui() }
  }
  if (sources.puzzle != null) {
    return { elo: puzzleVersPartie(sources.puzzle), source: 'puzzle', le: aujourdhui() }
  }
  return sources.test ?? null
}

export function aujourdhui(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Comment on nomme la source à l'écran. */
export const LIBELLE_SOURCE: Record<SourceNiveau, string> = {
  partie: 'd’après ton classement en partie',
  puzzle: 'estimé d’après ton classement de puzzles',
  test: 'd’après ton test de niveau',
  declare: 'd’après ce que tu as déclaré à l’inscription',
}
