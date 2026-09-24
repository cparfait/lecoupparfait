/**
 * Le nombre de leçons du programme, pour les textes qui l'annoncent.
 *
 * Pourquoi une constante et non `ALL_LESSONS.length` : la navigation, chargée
 * sur toutes les pages, affiche ce nombre sous « Leçons ». Importer le
 * programme pour le compter y ajouterait le contenu de toutes les leçons, sur
 * chaque page, pour un seul entier.
 *
 * Une constante écrite à la main est exactement ce qui avait laissé « 48
 * leçons » à l'écran quand il y en avait 57 : celle-ci est donc vérifiée par
 * `scripts/check-lessons.mjs`, qui échoue si elle diffère du vrai compte. Le
 * contrôle indique la valeur à écrire.
 */
export const NOMBRE_DE_LECONS = 60
