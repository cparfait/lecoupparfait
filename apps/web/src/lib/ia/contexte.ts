/**
 * Mise en forme des faits transmis au modèle.
 *
 * C'est la pièce qui décide de la qualité des réponses, bien plus que le choix
 * du modèle. Un modèle de langue à qui l'on donne une position et rien d'autre
 * invente une analyse plausible et fausse — c'est le travers classique des
 * assistants d'échecs, et aucun réglage ne le corrige.
 *
 * On lui donne donc tout ce que Stockfish et `explainMove` ont déjà établi :
 * l'évaluation, la classification, les alternatives avec leur suite, les
 * motifs détectés, l'explication écrite. Il ne lui reste plus rien à calculer,
 * seulement à reformuler et à répondre à la question posée.
 */

import { formatScore, localiseSan, QUALITY_STYLES } from '@coupparfait/core'
import type {
  AnalysedMove,
  Color,
  Locale,
  MoveExplanation,
  MoveQuality,
  Notation,
  Score,
} from '@coupparfait/core'

export interface CoupCommente {
  san: string
  color: Color
  quality: MoveQuality
  scoreBefore: Score
  scoreAfter: Score
  fenAfter: string
  headline: string
  body: string[]
  alternatives: Array<{
    san: string
    score: Score
    line: string[]
    played: boolean
    reason: string | null
  }>
}

export interface ContexteOptions {
  locale: Locale
  notation: Notation
  /** Nom de l'ouverture en cours, si on le connaît. */
  ouverture?: string | null
}

/**
 * Rédige le bloc de faits joint à la question.
 *
 * Volontairement compact et sans fioriture : chaque ligne est un fait vérifié,
 * et l'ensemble tient dans le contexte des petits modèles locaux, qui sont
 * précisément ceux qu'on veut pouvoir utiliser.
 */
export function contexteDuCoup(coup: CoupCommente, options: ContexteOptions): string {
  const { locale, notation } = options
  const fr = locale !== 'en'
  const san = (valeur: string) => localiseSan(valeur, locale, notation)
  const camp = coup.color === 'w' ? (fr ? 'les Blancs' : 'White') : fr ? 'les Noirs' : 'Black'

  const lignes: string[] = []

  // Les coups sont écrits comme le joueur les voit à l'écran, et on le dit au
  // modèle. Sans cette précision il répondrait « Nf3 » devant un échiquier qui
  // affiche « Cf3 » : deux écritures du même coup dans la même fenêtre, c'est
  // exactement le genre de détail qui fait douter d'une explication juste.
  if (notation === 'figurine') {
    lignes.push(
      fr
        ? 'Notation : symboles de pièces (♘ cavalier, ♗ fou, ♖ tour, ♕ dame, ♔ roi). Réutilise cette écriture.'
        : 'Notation: piece symbols (♘ knight, ♗ bishop, ♖ rook, ♕ queen, ♔ king). Reuse this writing.',
    )
  } else if (fr) {
    lignes.push(
      'Notation française : C cavalier, F fou, T tour, D dame, R roi. Écris les coups exactement ainsi.',
    )
  }

  lignes.push(
    fr
      ? `Coup joué : ${san(coup.san)} par ${camp}.`
      : `Move played: ${san(coup.san)} by ${camp}.`,
  )
  lignes.push(
    fr
      ? `Verdict du moteur : ${QUALITY_STYLES[coup.quality].label.fr}.`
      : `Engine verdict: ${QUALITY_STYLES[coup.quality].label.en}.`,
  )
  lignes.push(
    fr
      ? `Évaluation avant : ${formatScore(coup.scoreBefore)} · après : ${formatScore(coup.scoreAfter)} (positif = avantage blanc).`
      : `Evaluation before: ${formatScore(coup.scoreBefore)} · after: ${formatScore(coup.scoreAfter)} (positive = White is better).`,
  )

  if (options.ouverture) {
    lignes.push(fr ? `Ouverture : ${options.ouverture}.` : `Opening: ${options.ouverture}.`)
  }

  lignes.push(fr ? `Position après le coup (FEN) : ${coup.fenAfter}` : `Position after the move (FEN): ${coup.fenAfter}`)

  const options_ = coup.alternatives.filter((entry) => !entry.played).slice(0, 3)
  if (options_.length > 0) {
    lignes.push('')
    lignes.push(fr ? 'Options disponibles selon le moteur :' : 'Engine options:')
    for (const entry of options_) {
      const suite = entry.line.slice(0, 4).map(san).join(' ')
      const raison = entry.reason ? ` — ${entry.reason}` : ''
      lignes.push(
        `- ${san(entry.san)} (${formatScore(entry.score)})${suite ? `, suite : ${suite}` : ''}${raison}`,
      )
    }
  }

  lignes.push('')
  lignes.push(fr ? 'Explication déjà donnée au joueur :' : 'Explanation already shown to the player:')
  lignes.push(coup.headline)
  for (const phrase of coup.body) lignes.push(phrase)

  return lignes.join('\n')
}

/**
 * Même bloc de faits, à partir d'un rapport d'analyse complet.
 *
 * La page d'analyse ne produit pas de `Commentary` mais un `AnalysedMove` et
 * son `MoveExplanation`, calculés à plus grande profondeur. Les deux disent la
 * même chose sous deux formes ; cet adaptateur évite d'écrire deux fois la
 * mise en forme, et garantit que le modèle reçoit exactement la même structure
 * qu'on vienne d'une partie en cours ou d'une partie analysée.
 */
export function contexteDuCoupAnalyse(
  move: AnalysedMove,
  explanation: MoveExplanation,
  options: ContexteOptions,
): string {
  return contexteDuCoup(
    {
      san: move.san,
      color: move.color,
      quality: move.quality,
      scoreBefore: move.scoreBefore,
      scoreAfter: move.scoreAfter,
      fenAfter: move.fenAfter,
      headline: explanation.headline,
      body: explanation.body,
      // Le rapport ne garde qu'une alternative — le meilleur coup — mais avec
      // sa suite complète, ce qui est plus instructif que trois options nues.
      alternatives: move.bestMove
        ? [
            {
              san: move.bestMove.san,
              score: move.bestMove.score,
              line: move.bestLine ?? [],
              played: false,
              reason: null,
            },
          ]
        : [],
    },
    { ...options, ouverture: options.ouverture ?? move.opening?.name ?? null },
  )
}

/**
 * Question par défaut, celle du bouton « Approfondir ».
 *
 * On demande explicitement d'aller au-delà de l'explication déjà affichée :
 * sans cette consigne, les modèles la reformulent, et l'utilisateur a payé un
 * appel pour relire ce qu'il venait de lire.
 */
export function questionApprofondir(locale: Locale): string {
  return locale === 'en'
    ? 'Go further than the explanation above: what is the idea behind the engine’s move, and what should I look at next time to spot it myself?'
    : 'Va plus loin que l’explication ci-dessus : quelle est l’idée derrière le coup du moteur, et que devrais-je regarder la prochaine fois pour la trouver moi-même ?'
}
