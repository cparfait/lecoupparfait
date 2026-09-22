import type { BotPersonalityId } from '@coupparfait/core'

/**
 * La teinte de chaque adversaire, prise sur la matière de sa sculpture.
 *
 * Ivoire pour le bois pâle de Pion, feu pour le bronze fendu de Brasier,
 * ardoise pour le granit de Rempart, glace pour le cristal d'Éclair, laiton
 * pour Boussole, eau pour le verre de Mirage, nuit pour l'obsidienne
 * d'Oracle. Des valeurs littérales, et c'est voulu : ces couleurs viennent
 * des portraits, qui ne changent pas avec le thème.
 *
 * Ici plutôt que dans l'écran « Contre l'ordinateur », où elle a longtemps
 * vécu : la page « Jouer » présente les mêmes sept adversaires, et recopier
 * sept valeurs hexadécimales est la façon la plus sûre d'avoir un jour deux
 * Brasier de deux oranges différents.
 */
export const TEINTES_ADVERSAIRES: Record<BotPersonalityId, string> = {
  novice: '#e9d9b6',
  fonceur: '#ff7a3c',
  prudent: '#8aa0b8',
  tacticien: '#8fd8ff',
  positionnel: '#e2b84a',
  gambiteur: '#2fd1c8',
  machine: '#7c5cff',
}

/**
 * L'habillage du cadre qui porte un portrait.
 *
 * Le même dessin que la pastille d'icône d'une carte de destination : un
 * dégradé de la teinte, franc dans le coin éclairé et presque éteint à
 * l'opposé, et un liseré interne. Écrit une fois, parce qu'il sert sur la
 * page « Jouer », dans la galerie et sur l'écran de configuration.
 */
export function cadreDuPortrait(teinte: string): React.CSSProperties {
  return {
    background: `linear-gradient(135deg, color-mix(in oklab, ${teinte} 34%, transparent), color-mix(in oklab, ${teinte} 10%, transparent))`,
    boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${teinte} 36%, transparent), inset 0 1px 0 color-mix(in oklab, white 18%, transparent)`,
  }
}
