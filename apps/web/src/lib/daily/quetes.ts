/**
 * Catalogue des quêtes du jour.
 *
 * Volontairement séparé du magasin de `quotidien.ts` : ce fichier ne touche ni
 * au navigateur ni au stockage local, et il est donc lisible aussi bien par
 * l'interface que par la route serveur qui recalcule les points. Sans cette
 * séparation, les deux entretiendraient chacune leur barème, et ils
 * divergeraient.
 */

export type QueteId = 'defi' | 'partie' | 'victoire' | 'puzzles' | 'analyse'

export interface Quete {
  id: QueteId
  label: string
  /** Précision affichée sous le libellé, quand il ne se suffit pas. */
  detail?: string
  xp: number
  /** Nombre d'occurrences nécessaires. 1 pour la plupart. */
  objectif: number
}

/**
 * Les quêtes du jour.
 *
 * Cinq, pas douze : une liste qu'on peut finir est une liste qu'on commence.
 * Elles couvrent les trois usages de la plateforme — jouer, résoudre,
 * comprendre — pour que « faire ses quêtes » revienne à travailler les trois
 * plutôt qu'à répéter la plus facile.
 */
export const QUETES: Quete[] = [
  { id: 'defi', label: 'Résoudre le défi du jour', xp: 25, objectif: 1 },
  { id: 'partie', label: 'Jouer une partie', xp: 10, objectif: 1 },
  { id: 'victoire', label: 'Gagner une partie', xp: 15, objectif: 1 },
  {
    id: 'puzzles',
    label: 'Enchaîner 3 puzzles',
    detail: 'trois résolus dans la journée',
    xp: 20,
    objectif: 3,
  },
  { id: 'analyse', label: 'Analyser une partie', xp: 10, objectif: 1 },
]

export const XP_TOTAL = QUETES.reduce((somme, quete) => somme + quete.xp, 0)

export function quetePar(id: string): Quete | undefined {
  return QUETES.find((quete) => quete.id === id)
}

/** Points correspondant à un avancement — seules les quêtes finies comptent. */
export function xpPour(avancement: Record<string, number>): number {
  return QUETES.reduce(
    (somme, quete) => somme + ((avancement[quete.id] ?? 0) >= quete.objectif ? quete.xp : 0),
    0,
  )
}
