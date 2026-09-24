/**
 * Les erreurs à revoir : ses propres fautes, reposées à intervalles croissants.
 *
 * Deux moitiés, toutes deux sans entrée ni sortie :
 *
 *  - **le calendrier**, une boîte de Leitner à cinq compartiments. Une
 *    position retrouvée monte d'une boîte et revient plus tard ; une position
 *    manquée redescend dans la première et revient dès le lendemain. C'est la
 *    plus simple des répétitions espacées, et la seule qu'on puisse expliquer
 *    en une phrase à qui la pratique ;
 *  - **le relevé**, qui tire d'une analyse enregistrée les coups du joueur
 *    classés gaffe, erreur ou occasion manquée. Il appelle le classement du
 *    rapport (`classifyMove`, `scoreOf`) sur les évaluations conservées,
 *    plutôt que d'en écrire un second : une position à revoir est exactement
 *    un coup que le rapport a marqué, jamais un coup qu'un autre barème aurait
 *    jugé autrement.
 */

import { Chess } from 'chess.js'
import type { Color } from 'chess.js'
import { classifyMove } from './classify.ts'
import { QUALITY_THRESHOLDS, winPercentFor } from './eval.ts'
import { explainMove } from './explain.ts'
import type { Locale } from './explain.ts'
import { scoreOf } from './report.ts'
import { uciLineToSan } from './uci.ts'
import type { MoveQuality, PositionAnalysis, Score, UciMove } from './types.ts'

// ─────────────────────────────────────────────────────────────────────────────
//  Le calendrier
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Intervalle de chaque boîte, en jours : la boîte 1 revient le lendemain, la
 * boîte 5 seize jours plus tard.
 *
 * Doubler à chaque étage est la progression d'origine de Leitner. Au-delà de
 * seize jours, une position retrouvée cinq fois de suite est acquise ; la
 * reposer tous les mois ne coûterait rien, mais l'allonger encore la ferait
 * sortir de l'horizon de quelqu'un qui revient une fois par semaine.
 */
export const INTERVALLES_LEITNER = [1, 2, 4, 8, 16] as const

/** Nombre de boîtes. La première vaut 1, pas 0 : c'est ainsi qu'on en parle. */
export const BOITE_MAX = INTERVALLES_LEITNER.length

/** Un jour civil, `AAAA-MM-JJ`. Le fuseau est celui du joueur, pas du serveur. */
export type Jour = string

const FORMAT_JOUR = /^\d{4}-\d{2}-\d{2}$/

/** Vrai si la chaîne est un jour civil valide au format `AAAA-MM-JJ`. */
export function estUnJour(valeur: unknown): valeur is Jour {
  if (typeof valeur !== 'string' || !FORMAT_JOUR.test(valeur)) return false
  const date = new Date(`${valeur}T00:00:00Z`)
  // `2026-02-31` passe l'expression régulière et devient le 3 mars : on
  // vérifie que la date relue est bien celle qu'on a écrite.
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === valeur
}

/**
 * Le jour, `n` jours plus tard.
 *
 * Calculé en UTC à midi pile d'un jour sans heure : aucun changement d'heure
 * ne peut faire sauter ou doubler une date, ce qu'un calcul en heure locale
 * ferait deux nuits par an.
 */
export function ajouterJours(jour: Jour, n: number): Jour {
  const date = new Date(`${jour}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + n)
  return date.toISOString().slice(0, 10)
}

/** Ramène un numéro de boîte quelconque dans `1..BOITE_MAX`. */
function borner(boite: number): number {
  if (!Number.isFinite(boite)) return 1
  return Math.min(BOITE_MAX, Math.max(1, Math.trunc(boite)))
}

export interface Echeance {
  boite: number
  /** Premier jour où la position est de nouveau proposée. */
  echeance: Jour
}

/**
 * Où va une position après une révision.
 *
 * Réussie, elle monte d'une boîte — la cinquième est un plafond, on y reste —
 * et revient après l'intervalle de sa **nouvelle** boîte. Manquée, elle
 * retombe dans la première, quelle que soit la hauteur d'où elle part : c'est
 * la règle de Leitner, et c'est elle qui fait qu'une position oubliée revient
 * vite au lieu d'attendre seize jours de plus.
 */
export function apresRevision(boite: number, reussie: boolean, jour: Jour): Echeance {
  const suivante = reussie ? Math.min(BOITE_MAX, borner(boite) + 1) : 1
  return { boite: suivante, echeance: ajouterJours(jour, INTERVALLES_LEITNER[suivante - 1]!) }
}

/**
 * Une position à peine relevée : première boîte, due le jour même.
 *
 * Le jour même et non le lendemain : on vient de relire sa partie, c'est le
 * moment où l'erreur a encore un contexte.
 */
export function premiereEcheance(jour: Jour): Echeance {
  return { boite: 1, echeance: jour }
}

/** Vrai si une position d'échéance `echeance` est à revoir le jour `jour`. */
export function estDue(echeance: Jour, jour: Jour): boolean {
  // Deux chaînes `AAAA-MM-JJ` se comparent dans l'ordre des dates.
  return echeance <= jour
}

// ─────────────────────────────────────────────────────────────────────────────
//  Le relevé
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Les qualités qui font une position à revoir.
 *
 * Gaffe et erreur, et l'occasion manquée avec elles : c'est une gaffe à
 * l'envers — un mat ou un gain décisif laissé filer —, et « trouve mieux » y
 * a exactement le même sens. L'imprécision n'en fait pas partie : la meilleure
 * réponse y est souvent affaire de goût, et un exercice dont la solution se
 * discute n'apprend rien.
 */
export const QUALITES_A_REVOIR: readonly MoveQuality[] = ['blunder', 'mistake', 'miss']

/** Une explication, telle qu'on la conserve : sans cases ni synthèse vocale. */
export interface ExplicationConservee {
  headline: string
  body: string[]
  betterMove: string | null
}

export interface PositionARevoir {
  /** Demi-coup de la partie (0 = premier coup des Blancs). */
  ply: number
  /** Position avant le coup fautif. */
  fen: string
  /** Coup joué, en SAN anglais et en UCI. */
  joueSan: string
  joueUci: UciMove
  /** Premier choix du moteur. */
  meilleurSan: string
  meilleurUci: UciMove
  /**
   * Les coups acceptés comme réponse : le meilleur, et ceux que le moteur
   * jugeait équivalents.
   */
  acceptes: UciMove[]
  quality: MoveQuality
  /** L'explication du coup fautif, dans les deux langues du contenu. */
  explication: Record<Locale, ExplicationConservee>
}

export interface EntreeDuReleve {
  moves: string[]
  startFen?: string | null
  positions: PositionAnalysis[]
  /** Le camp du joueur. Sans lui, on ne sait pas quelles fautes sont les siennes. */
  lecteur: Color | null
}

/**
 * Tire d'une analyse enregistrée les positions à revoir.
 *
 * Ne lève jamais : les évaluations viennent d'un navigateur, et une analyse
 * mal formée ne doit coûter que ses propres positions. Rend une liste vide
 * sans camp de joueur — un PGN collé n'a pas de « toi », et lui proposer les
 * fautes de ses deux camps serait lui faire réviser celles de son adversaire.
 */
export async function releverLesErreurs(entree: EntreeDuReleve): Promise<PositionARevoir[]> {
  const lecteur = entree.lecteur
  if (lecteur !== 'w' && lecteur !== 'b') return []
  if (!positionsLisibles(entree.positions)) return []
  // Une évaluation par position, celle de départ comprise : sans quoi on
  // lirait le score d'un coup dans la position d'un autre.
  if (entree.positions.length !== entree.moves.length + 1) return []

  const releve: PositionARevoir[] = []
  try {
    const echiquier = new Chess(entree.startFen ?? undefined, { skipValidation: true })
    for (let ply = 0; ply < entree.moves.length; ply++) {
      const fenBefore = echiquier.fen()
      const legaux = echiquier.moves().length
      const coup = echiquier.move(entree.moves[ply]!)
      const fenAfter = echiquier.fen()
      if (coup.color !== lecteur) continue

      const avant = entree.positions[ply]!
      const apres = entree.positions[ply + 1]!
      const scoreAvant = scoreOf(avant)
      const scoreApres = scoreOf(apres)

      // Le tri grossier d'abord. Le classement complet cherche des mats et des
      // motifs à chaque coup : sur une partie de cent demi-coups, une dizaine
      // de secondes, ce qu'une route qui range une analyse ne peut pas se
      // permettre. Or une faute se voit déjà à la perte de chances : sous le
      // seuil de l'erreur, et sans gain ni mat laissé filer, le coup ne peut
      // être ni gaffe, ni erreur, ni occasion manquée — `decideQuality` ne
      // descend jamais plus bas que ce que dit la perte.
      if (!peutEtreUneFaute(scoreAvant, scoreApres, lecteur)) continue

      const uci = `${coup.from}${coup.to}${coup.promotion ?? ''}`
      const classement = classifyMove({
        fenBefore,
        uci,
        san: coup.san,
        before: { score: scoreAvant, lines: avant.lines },
        after: { score: scoreApres },
        legalMoveCount: legaux,
      })
      if (!QUALITES_A_REVOIR.includes(classement.quality)) continue

      // Le meilleur coup et les options, lus comme le rapport les lit.
      const lignes = [...avant.lines].sort((a, b) => a.multipv - b.multipv)
      const premiere = lignes[0]
      const meilleurUci = premiere?.pv[0] ?? avant.bestMove ?? null
      if (!premiere || !meilleurUci || meilleurUci === uci) continue
      const meilleurSan = uciLineToSan(fenBefore, [meilleurUci])[0]
      if (!meilleurSan) continue

      const seuil = winPercentFor(premiere.score, lecteur) - QUALITY_THRESHOLDS.excellent
      const equivalents = lignes
        .slice(0, 3)
        .filter((ligne) => ligne.pv[0] && winPercentFor(ligne.score, lecteur) >= seuil)
        .map((ligne) => ligne.pv[0]!)
      const acceptes = [...new Set([meilleurUci, ...equivalents])].filter((c) => c !== uci)

      const bestLine = uciLineToSan(fenBefore, premiere.pv.slice(0, 6))
      const expliquer = (locale: Locale): ExplicationConservee =>
        conserver(
          explainMove({
            locale,
            lecteur,
            san: coup.san,
            fenBefore,
            fenAfter,
            quality: classement.quality,
            scoreBefore: scoreAvant,
            scoreAfter: scoreApres,
            winLoss: classement.winLoss,
            mover: lecteur,
            motifs: classement.motifs,
            bestSan: meilleurSan,
            bestLine,
          }),
        )

      releve.push({
        ply,
        fen: fenBefore,
        joueSan: coup.san,
        joueUci: uci,
        meilleurSan,
        meilleurUci,
        acceptes,
        quality: classement.quality,
        explication: { fr: expliquer('fr'), en: expliquer('en') },
      })
    }
  } catch {
    // Un coup illisible ou une position qui ne se rejoue pas : on garde ce
    // qui a été relevé avant, comme le rapport analyse ce qui est valide.
  }
  return releve
}

/**
 * Vrai si la perte de chances laisse la place à une gaffe, une erreur ou une
 * occasion manquée. Reprend les seuils de `decideQuality`, sans les motifs.
 */
function peutEtreUneFaute(avant: Score, apres: Score, camp: Color): boolean {
  const gainAvant = winPercentFor(avant, camp)
  const gainApres = winPercentFor(apres, camp)
  if (gainAvant - gainApres >= QUALITY_THRESHOLDS.inaccuracy) return true
  if (gainAvant >= 85 && gainApres < 60) return true
  const signe = camp === 'w' ? 1 : -1
  const matAvant = avant.type === 'mate' && avant.value * signe > 0
  const matApres = apres.type === 'mate' && apres.value * signe > 0
  return matAvant && !matApres
}

function conserver(explication: ExplicationConservee): ExplicationConservee {
  return {
    headline: explication.headline,
    body: explication.body,
    betterMove: explication.betterMove,
  }
}

/**
 * Vérifie la forme des évaluations avant de les confier au classement.
 *
 * Le classement suppose des lignes avec un score et une suite ; une entrée
 * fabriquée à la main qui n'en aurait pas le ferait lever au milieu d'une
 * boucle, ou pire, classer sur un score absent.
 */
function positionsLisibles(positions: unknown): positions is PositionAnalysis[] {
  if (!Array.isArray(positions)) return false
  return positions.every((position) => {
    if (!position || typeof position !== 'object') return false
    const { fen, lines } = position as { fen?: unknown; lines?: unknown }
    if (typeof fen !== 'string' || !Array.isArray(lines)) return false
    return lines.every((ligne) => {
      const { score, pv } = (ligne ?? {}) as {
        score?: { type?: unknown; value?: unknown }
        pv?: unknown
      }
      return (
        !!score &&
        (score.type === 'cp' || score.type === 'mate') &&
        typeof score.value === 'number' &&
        Array.isArray(pv)
      )
    })
  })
}

/**
 * Vrai si `uci`, joué dans `fen`, répond à la position.
 *
 * Un des coups acceptés, ou n'importe quel mat : comme pour les puzzles, il
 * existe souvent plusieurs façons de mater, et refuser la sienne serait
 * incompréhensible.
 */
export function reponseJuste(fen: string, uci: UciMove, acceptes: readonly UciMove[]): boolean {
  if (acceptes.includes(uci)) return true
  // Une promotion donnée sans pièce vaut une dame, comme sur l'échiquier.
  if (uci.length === 4 && acceptes.includes(`${uci}q`)) return true
  try {
    const echiquier = new Chess(fen, { skipValidation: true })
    echiquier.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] ?? 'q' })
    return echiquier.isCheckmate()
  } catch {
    return false
  }
}
