/**
 * Ce que veulent dire les mots des statistiques.
 *
 * Un tableau de statistiques est une liste de noms propres : « Ouverture
 * hongroise », « Rapide », « Pat ». Ils sont posés là comme si tout le monde
 * les connaissait — or c'est exactement l'inverse : on lit ses statistiques
 * pour apprendre quelque chose de son jeu, et le débutant qui découvre qu'il
 * marque 83 % à l'ouverture hongroise n'a aucun moyen de savoir de quoi il
 * s'agit, ni s'il l'a jouée exprès.
 *
 * Les définitions ne sont pas réécrites ici : le glossaire les tient déjà, et
 * deux textes pour un même mot divergent toujours. On y puise, et l'on
 * n'ajoute que ce qui manquait — les fins de partie et les cadences, que le
 * glossaire ne détaille pas une par une.
 *
 * Les ouvertures, elles, ne peuvent pas être écrites à l'avance : il y en a
 * 3 810. Leur explication se construit au moment du clic, à partir du livre
 * d'ouvertures — voir `BoiteExplication`.
 */

import type { TranslationKey } from '@/lib/i18n/index.tsx'

export interface TexteExplication {
  titre: TranslationKey
  /** Le corps, en un ou deux paragraphes. Le gras `**mot**` y est admis. */
  texte: TranslationKey
  /** Renvoi vers le glossaire, quand le mot y a sa propre entrée. */
  terme?: TranslationKey
}

/**
 * Les fins de partie.
 *
 * Ce sont les mots de la colonne « Comment tes parties finissent », et deux
 * d'entre eux se lisent de travers tant qu'on ne les explique pas :
 * « Adversaire parti » ressemble à une victoire par forfait alors que la
 * partie peut avoir été gagnée ou perdue, et « Pat » passe pour une variante
 * du mat alors qu'il en est l'inverse exact.
 */
export const FINS: Record<string, TexteExplication> = {
  checkmate: {
    titre: 'explications.checkmate.titre',
    texte: 'explications.checkmate.texte',
    terme: 'explications.checkmate.terme',
  },
  stalemate: {
    titre: 'explications.stalemate.titre',
    texte: 'explications.stalemate.texte',
    terme: 'explications.stalemate.terme',
  },
  resigned: {
    titre: 'explications.resigned.titre',
    texte: 'explications.resigned.texte',
  },
  timeout: {
    titre: 'explications.timeout.titre',
    texte: 'explications.timeout.texte',
    terme: 'explications.timeout.terme',
  },
  draw: {
    titre: 'explications.draw.titre',
    texte: 'explications.draw.texte',
    terme: 'explications.draw.terme',
  },
  abandoned: {
    titre: 'explications.abandoned.titre',
    texte: 'explications.abandoned.texte',
  },
  aborted: {
    titre: 'explications.aborted.titre',
    texte: 'explications.aborted.texte',
  },
}

/**
 * Les cadences.
 *
 * Elles portent des noms de catégories — bullet, blitz, rapide — dont les
 * bornes ne sont écrites nulle part sur cet écran. Or c'est précisément ce
 * qu'on veut savoir en lisant « tu marques 74 % en rapide » : rapide à partir
 * de combien ?
 */
export const CADENCES: Record<string, TexteExplication> = {
  ultraBullet: {
    titre: 'explications.ultraBullet.titre',
    texte: 'explications.ultraBullet.texte',
    terme: 'explications.ultraBullet.terme',
  },
  bullet: {
    titre: 'explications.bullet.titre',
    texte: 'explications.bullet.texte',
    terme: 'explications.bullet.terme',
  },
  blitz: {
    titre: 'explications.blitz.titre',
    texte: 'explications.blitz.texte',
    terme: 'explications.blitz.terme',
  },
  rapid: {
    titre: 'explications.rapid.titre',
    texte: 'explications.rapid.texte',
    terme: 'explications.rapid.terme',
  },
  classical: {
    titre: 'explications.classical.titre',
    texte: 'explications.classical.texte',
    terme: 'explications.classical.terme',
  },
  correspondence: {
    titre: 'explications.correspondence.titre',
    texte: 'explications.correspondence.texte',
    terme: 'explications.correspondence.terme',
  },
}
