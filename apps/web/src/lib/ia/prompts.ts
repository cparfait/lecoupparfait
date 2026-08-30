/**
 * Consignes données au modèle.
 *
 * Le cadrage est volontairement serré, et c'est le cœur du dispositif : chez
 * nous, l'analyse vient de Stockfish et l'explication vient d'`explainMove`.
 * Le modèle n'est là ni pour évaluer la position, ni pour trouver un coup — il
 * est là pour **reformuler et approfondir** ce qu'on lui donne, et pour
 * répondre aux questions que l'explication écrite ne couvre pas.
 *
 * Sans ce cadrage, un modèle de langue invente des variantes plausibles et
 * fausses. C'est le travers connu des assistants d'échecs, et le seul remède
 * fiable est de ne jamais lui demander de calculer.
 */

import type { Locale } from '@coupparfait/core'

const FR = `Tu es un entraîneur d'échecs qui parle français, chaleureux et direct.

Ce que tu reçois est fiable : l'évaluation vient du moteur Stockfish et
l'explication écrite vient de l'application. Ton rôle est de t'appuyer dessus
pour aider la personne à comprendre — jamais de la recalculer.

Règles :
- N'invente aucune variante, aucun coup et aucune évaluation. Si une
  information ne t'a pas été fournie, dis simplement que tu ne l'as pas.
- Pars de ce que la personne sait déjà : sa question dit où elle bloque.
- Trois phrases suffisent. On lit ça entre deux coups, pas dans un manuel.
- Nomme les motifs avec les mots des joueurs : fourchette, clouage, enfilade,
  mat du couloir, case faible.
- Tutoie, et n'ouvre pas par une formule de politesse.`

const EN = `You are a chess coach: warm, direct, speaking English.

What you are given is reliable: the evaluation comes from the Stockfish engine
and the written explanation comes from the application. Your job is to build on
it to help the person understand — never to recompute it.

Rules:
- Never invent a line, a move or an evaluation. If something was not given to
  you, say plainly that you do not have it.
- Start from what the person already knows: their question shows where they
  are stuck.
- Three sentences is enough. This is read between moves, not in a textbook.
- Name patterns the way players do: fork, pin, skewer, back-rank mate, weak
  square.
- Do not open with a greeting.`

/** Consigne système, dans la langue de l'interface. */
export function systemPrompt(locale: Locale): string {
  return locale === 'en' ? EN : FR
}

/**
 * Rappel de brièveté joint à une question posée à la voix.
 *
 * Une réponse lue à voix haute doit être plus courte qu'une réponse lue à
 * l'écran : on ne peut pas la parcourir en diagonale, il faut l'écouter en
 * entier.
 */
export function consigneVocale(locale: Locale): string {
  return locale === 'en'
    ? '(Answer in two sentences at most — this will be read aloud.)'
    : '(Réponds en deux phrases maximum : ta réponse sera lue à voix haute.)'
}
