/**
 * Catalogue des quêtes du jour.
 *
 * Volontairement séparé du magasin de `quotidien.ts` : ce fichier ne touche ni
 * au navigateur ni au stockage local, et il est donc lisible aussi bien par
 * l'interface que par la route serveur qui recalcule les points. Sans cette
 * séparation, les deux entretiendraient chacune leur barème, et ils
 * divergeraient.
 */

/*
  `analyse` reste dans le type sans figurer dans la liste.

  La quête « Analyser une partie » a été retirée : chaque analyse lance
  Stockfish sur une partie entière, et en faire un devoir quotidien revenait à
  programmer une pointe de charge sur le serveur tous les jours, pour la seule
  raison qu'une liste de cinq lignes est plus jolie qu'une de quatre.

  L'identifiant survit parce que l'écran d'analyse le signale toujours et que
  d'anciennes journées en portent la trace dans le stockage local : `avancerQuete`
  ignore proprement un identifiant sans quête, et rien n'est à nettoyer.
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
  /**
   * Où l'on va pour la faire.
   *
   * Une liste de choses à faire dont aucune ligne ne mène nulle part est une
   * liste de reproches. Elle s'affichait ainsi : cinq intitulés inertes sous
   * le défi du jour, et il fallait retrouver soi-même, dans les menus, l'écran
   * correspondant à « Enchaîner 3 puzzles ». Chaque quête nomme donc sa porte.
   */
  lien: string
  /**
   * Le verbe du bouton, quand la quête est mise en avant sur l'accueil.
   *
   * « Y aller » convenait à toutes et ne disait rien d'aucune ; on lit ce
   * qu'on va faire, pas où l'on va.
   */
  action: string
}

/**
 * Les quêtes du jour.
 *
 * Quatre, pas douze : une liste qu'on peut finir est une liste qu'on commence.
 * Elles couvrent les deux usages qui ne coûtent rien à personne — jouer et
 * résoudre — pour que « faire ses quêtes » revienne à travailler les deux
 * plutôt qu'à répéter la plus facile.
 */
export const QUETES: Quete[] = [
  {
    id: 'defi',
    label: 'Résoudre le défi du jour',
    xp: 25,
    objectif: 1,
    lien: '/puzzles?defi=1&quete=defi',
    action: 'Chercher le coup',
  },
  // « Jouer » et « gagner » mènent à l'ordinateur plutôt qu'au sommaire des
  // façons de jouer : la quête se compte en parties finies, et c'est le seul
  // adversaire disponible à la seconde où on clique.
  // `?quete=` n'est pas décoratif : l'écran de partie le lit, et sa boîte de
  // fin propose alors la suite qui va avec — retourner aux quêtes si celle-ci
  // vient d'être remplie, enchaîner une partie s'il s'en faut encore d'une
  // victoire. Sans ce marqueur, on gagnait sa partie et l'on se retrouvait
  // devant « Revanche » et « Analyser », sans savoir si la quête était faite.
  {
    id: 'partie',
    label: 'Jouer une partie',
    xp: 10,
    objectif: 1,
    lien: '/jouer/ordinateur?quete=partie',
    action: 'Jouer une partie',
  },
  {
    id: 'victoire',
    label: 'Gagner une partie',
    xp: 15,
    objectif: 1,
    lien: '/jouer/ordinateur?quete=victoire',
    action: 'Jouer une partie',
  },
  {
    id: 'puzzles',
    label: 'Enchaîner 3 puzzles',
    detail: 'trois résolus dans la journée',
    xp: 20,
    objectif: 3,
    lien: '/puzzles?quete=puzzles',
    action: 'Résoudre des puzzles',
  },
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
