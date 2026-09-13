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
 *
 * ── La langue de la réponse ─────────────────────────────────────────────────
 *
 * La consigne disait « Tu es un entraîneur d'échecs qui parle français », et il
 * n'en existait que deux versions. Le coach répondait donc en français à
 * quelqu'un dont toute l'application était en japonais — le seul endroit du
 * projet où le texte lu n'était pas seulement mal traduit, mais produit dans la
 * mauvaise langue à chaque appel.
 *
 * Deux choses distinctes, qu'on sépare ici :
 *
 *  - **la langue de la consigne**, qui n'est lue que par le modèle. Elle vient du
 *    dictionnaire, donc de la langue choisie quand elle est traduite, et de
 *    l'anglais sinon. Aucune importance pour l'utilisateur ;
 *  - **la langue de la réponse**, qui est la sienne. Elle est nommée
 *    explicitement, par son nom dans sa propre langue — « 日本語 », « العربية » —
 *    ce que les modèles suivent mieux qu'un code ISO.
 *
 * La seconde ligne n'est posée que si les deux diffèrent : redire « réponds en
 * français » à une consigne déjà en français, c'est une phrase de plus à peser
 * pour rien.
 */

import type { Traducteur } from '@/lib/i18n/resoudre.ts'
import { langue } from '@/lib/i18n/langues.ts'
import type { Locale } from '@/lib/i18n/dictionary.ts'
import { localeDuContenu } from '@/lib/i18n/dictionary.ts'

/** Consigne système, et la langue dans laquelle il faut répondre. */
export function systemPrompt(locale: Locale, t: Traducteur): string {
  const corps = t('prompt.system')

  // La consigne existe en français et en anglais ; au-delà, elle est servie en
  // anglais par la chaîne de repli. C'est donc à ces deux langues-là qu'on
  // compare, et non à la langue choisie.
  if (locale === localeDuContenu(locale)) return corps

  return `${corps}\n\n${t('prompt.answerIn', { langue: langue(locale).nom })}`
}

/**
 * Rappel de brièveté joint à une question posée à la voix.
 *
 * Une réponse lue à voix haute doit être plus courte qu'une réponse lue à
 * l'écran : on ne peut pas la parcourir en diagonale, il faut l'écouter en
 * entier.
 */
export function consigneVocale(t: Traducteur): string {
  return t('prompt.spoken')
}
