/**
 * Les principes, et le mémo d'avant chaque coup.
 *
 * L'application explique très bien **un coup** : elle le classe, le nomme, dit
 * ce qu'il rate et propose trois alternatives. Ce qu'elle ne disait nulle part,
 * c'est ce qu'il faut **se dire avant de jouer**, quand il n'y a encore aucun
 * coup à expliquer. Or c'est là que se gagnent les premiers cinq cents points :
 * pas en connaissant plus de motifs, mais en vérifiant les quatre mêmes choses
 * à chaque fois.
 *
 * Deux natures de contenu ici, et il ne faut pas les mélanger :
 *
 *  - **Le mémo** : quatre questions, à se poser *pendant* la partie. Court par
 *    construction — une liste de douze points ne se coche pas en dix secondes,
 *    donc ne se coche pas. C'est elle que l'aide en partie affiche.
 *  - **Les principes** : des règles de conduite, à lire *entre* les parties.
 *    Vingt-quatre pour les trois phases, quatorze pour le jeu positionnel. On
 *    les lit une fois, on y revient, et elles finissent par se jouer toutes
 *    seules.
 *
 * Chaque principe porte son **contre-exemple**. C'est la partie qui manque
 * partout ailleurs, et c'est celle qui évite de transformer un repère en
 * superstition : « développe tes pièces » devient nuisible le jour où l'on
 * développe pendant que l'adversaire mate.
 */

/** Une question du mémo, avec ce qu'elle évite concrètement. */
export interface QuestionMemo {
  /** La question, formulée à la deuxième personne et tenant sur une ligne. */
  question: string
  /** Ce qu'on regarde pour y répondre. */
  comment: string
}

/**
 * Le mémo, dans l'ordre.
 *
 * L'ordre n'est pas décoratif : on commence par ce que l'adversaire vient de
 * faire, parce que la faute la plus fréquente à tous les niveaux faibles est de
 * jouer son propre plan sans avoir regardé le coup d'en face. Les trois
 * questions suivantes découlent de celle-là.
 */
export const MEMO_AVANT_COUP: QuestionMemo[] = [
  {
    question: 'Qu’est-ce que son dernier coup a changé ?',
    comment:
      'Une case libérée, une ligne ouverte, une pièce qui attaque maintenant ce qu’elle n’attaquait pas. Un coup sert toujours à quelque chose — même mauvais.',
  },
  {
    question: 'Qu’est-ce qu’il attaque ?',
    comment:
      'Fais le tour de tes pièces : lesquelles sont attaquées, lesquelles sont défendues, et par quoi. Une pièce attaquée deux fois et défendue une fois est perdue.',
  },
  {
    question: 'Qu’est-ce que mon coup laisse en prise ?',
    comment:
      'La pièce que tu déplaces ne défend plus ce qu’elle défendait, et la case où tu la poses peut être attaquée. C’est l’erreur qui coûte le plus de points sous 1 200.',
  },
  {
    question: 'S’il joue le coup le plus méchant, ça tient ?',
    comment:
      'Un seul coup à examiner : le plus agressif qu’il ait. Échec, prise, menace de mat. Si ça tient contre celui-là, ça tient.',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
//  Principes
// ─────────────────────────────────────────────────────────────────────────────

export type FamillePrincipe = 'Ouverture' | 'Milieu de partie' | 'Finale' | 'Jeu positionnel'

export interface Principe {
  famille: FamillePrincipe
  /** L'énoncé, à l'impératif : c'est une conduite, pas une observation. */
  regle: string
  /** Pourquoi ça marche. Une phrase, concrète. */
  pourquoi: string
  /**
   * Quand ça ne marche pas.
   *
   * Obligatoire. Un principe sans exception devient une règle, et une règle
   * qu'on applique sans regarder la position fait perdre des parties — c'est
   * exactement ce qui arrive à « développe avant d'attaquer » quand on est en
   * train d'être maté.
   */
  sauf: string
}

export const PRINCIPES: Principe[] = [
  // ── Ouverture ─────────────────────────────────────────────────────────────
  {
    famille: 'Ouverture',
    regle: 'Occupe le centre avec un pion.',
    pourquoi:
      'Un pion au centre prend de l’espace, ouvre des lignes à tes pièces et leur donne deux fois plus de cases qu’en bord d’échiquier.',
    sauf: 'Les ouvertures qui le contrôlent de loin — est-indienne, sicilienne — le rendent volontairement pour le frapper ensuite.',
  },
  {
    famille: 'Ouverture',
    regle: 'Sors les cavaliers avant les fous.',
    pourquoi:
      'Un cavalier n’a qu’une bonne case dans la plupart des ouvertures, un fou en a trois ou quatre. On joue d’abord ce qu’on sait, on garde le choix pour après.',
    sauf: 'Les systèmes où le fou sort en premier sont précisément construits pour cela — Londres, fianchetto.',
  },
  {
    famille: 'Ouverture',
    regle: 'Ne bouge pas deux fois la même pièce sans raison.',
    pourquoi:
      'Chaque coup perdu est un coup offert. Développer huit pièces en huit coups, c’est arriver au milieu de partie avec une armée entière.',
    sauf: 'Si un coup de l’adversaire attaque cette pièce et que la reculer est le moindre mal, il faut la reculer.',
  },
  {
    famille: 'Ouverture',
    regle: 'Roque tôt, et du bon côté.',
    pourquoi:
      'Le roi au centre est la cible de toutes les ouvertures de lignes. Roquer met le roi à l’abri et la tour au travail d’un seul coup.',
    sauf: 'Quand l’adversaire a déjà roqué à l’opposé et que la course aux pions est lancée, le roi peut rester au centre pour ne pas offrir de cible.',
  },
  {
    famille: 'Ouverture',
    regle: 'Ne sors pas la dame trop tôt.',
    pourquoi:
      'Elle vaut neuf points : tout ce qui l’attaque gagne un temps. Une dame sortie au troisième coup passe les dix suivants à fuir.',
    sauf: 'Quelques ouvertures la sortent immédiatement et l’assument — la scandinave, par exemple, où elle s’installe en a5 avec un plan.',
  },
  {
    famille: 'Ouverture',
    regle: 'Ne pousse pas les pions de l’aile avant d’avoir développé.',
    pourquoi:
      'Un pion qui avance ne revient pas, et il laisse derrière lui des cases que personne ne défendra plus.',
    sauf: 'Un gain de temps ou d’espace clair — h3 pour empêcher un clouage, a4 pour bloquer l’expansion adverse — vaut le coup.',
  },
  {
    famille: 'Ouverture',
    regle: 'Connecte tes tours.',
    pourquoi:
      'Quand il n’y a plus rien entre elles, le développement est fini : c’est le signal qu’on peut commencer à jouer pour gagner.',
    sauf: 'Rien, ou presque. C’est le principe le plus fiable de la liste.',
  },
  {
    famille: 'Ouverture',
    regle: 'Ne cherche pas le mat en quatre coups.',
    pourquoi:
      'Le mat du berger et ses cousins perdent contre n’importe qui les connaît, et on y laisse trois temps de développement.',
    sauf: 'Il faut les connaître pour les parer : c’est l’objet du chapitre « Les mats de l’ouverture ».',
  },

  // ── Milieu de partie ──────────────────────────────────────────────────────
  {
    famille: 'Milieu de partie',
    regle: 'Améliore ta pire pièce.',
    pourquoi:
      'Quand aucun plan ne s’impose, la question « laquelle de mes pièces travaille le moins ? » en produit un à tous les coups.',
    sauf: 'Si une tactique est disponible, elle passe devant : un plan ne rattrape pas une pièce gagnée laissée de côté.',
  },
  {
    famille: 'Milieu de partie',
    regle: 'Les tours vont sur les colonnes ouvertes.',
    pourquoi:
      'Une tour ne vaut ses cinq points que si elle voit loin. Sur une colonne fermée, elle regarde son propre pion.',
    sauf: 'Une colonne semi-ouverte où l’adversaire a un pion faible vaut mieux qu’une colonne ouverte qui ne mène nulle part.',
  },
  {
    famille: 'Milieu de partie',
    regle: 'Attaque du côté où tu as plus d’espace.',
    pourquoi:
      'L’espace se compte en pions avancés. Attaquer là où l’on est à l’étroit, c’est attaquer avec deux pièces contre quatre.',
    sauf: 'Un roi adverse exposé justifie d’attaquer n’importe où, même à un contre trois.',
  },
  {
    famille: 'Milieu de partie',
    regle: 'Avant d’attaquer sur une aile, assure le centre.',
    pourquoi:
      'Une attaque d’aile se réfute par un coup au centre : les lignes s’ouvrent là où ton roi se trouve, et l’attaque n’a plus le temps d’aboutir.',
    sauf: 'Avec les rois roqués à l’opposé, la course est lancée et compter les temps remplace le principe.',
  },
  {
    famille: 'Milieu de partie',
    regle: 'N’échange pas sans savoir ce que l’échange te laisse.',
    pourquoi:
      'Chaque échange simplifie, et la simplification favorise celui qui a l’avantage matériel. Si c’est l’autre, elle te coûte.',
    sauf: 'Échanger pour se débarrasser de la pièce qui attaque ton roi est presque toujours bon, même en étant moins bien.',
  },
  {
    famille: 'Milieu de partie',
    regle: 'Deux faiblesses valent mieux qu’une.',
    pourquoi:
      'Une position ne tombe presque jamais sur un seul point faible : on en crée un second à l’autre bout, et la défense ne peut plus couvrir les deux.',
    sauf: 'Si la première faiblesse suffit à gagner du matériel tout de suite, ne cherche pas la seconde.',
  },
  {
    famille: 'Milieu de partie',
    regle: 'Regarde le coup le plus méchant avant de jouer le tien.',
    pourquoi:
      'C’est la version courte du mémo. Un seul coup examiné — le plus agressif qu’il ait — écarte la quasi-totalité des gaffes.',
    sauf: 'Rien. Celui-là ne souffre aucune exception.',
  },
  {
    famille: 'Milieu de partie',
    regle: 'Quand tu as gagné du matériel, simplifie.',
    pourquoi:
      'Une pièce de plus sur un échiquier vide décide la partie ; la même pièce dans une position compliquée se perd en un coup.',
    sauf: 'Ne simplifie pas vers une finale nulle par nature — fou de mauvaise couleur, pion a ou h isolé.',
  },

  // ── Finale ────────────────────────────────────────────────────────────────
  {
    famille: 'Finale',
    regle: 'Active ton roi.',
    pourquoi:
      'Sans dames, le roi devient une pièce forte et gratuite. Celui qui le garde au fond joue avec une pièce de moins.',
    sauf: 'Tant qu’il reste des dames ou deux tours chacun, le roi reste une cible.',
  },
  {
    famille: 'Finale',
    regle: 'La tour se place derrière le pion passé.',
    pourquoi:
      'Derrière, elle gagne de l’espace à mesure que le pion avance — qu’il soit à toi ou à lui. Devant, elle se fait pousser.',
    sauf: 'Sur la septième rangée, une tour qui mange des pions fait souvent mieux que la règle.',
  },
  {
    famille: 'Finale',
    regle: 'Crée un pion passé du côté où tu as la majorité.',
    pourquoi:
      'Deux pions contre un produisent un pion passé par la force des choses. C’est le plan le plus mécanique de toutes les finales.',
    sauf: 'Si ta majorité est du côté du roi adverse, elle ne produira qu’un pion passé qu’il arrêtera du pied.',
  },
  {
    famille: 'Finale',
    regle: 'Prends l’opposition.',
    pourquoi:
      'Dans les finales de rois et de pions, celui qui oblige l’autre à céder le passage gagne. L’opposition est la façon de le savoir à l’avance.',
    sauf: 'Les positions à plusieurs pions se décident d’abord au calcul des temps ; l’opposition ne tranche que les cas simples.',
  },
  {
    famille: 'Finale',
    regle: 'Compte avant de courir.',
    pourquoi:
      'La règle du carré, ou deux colonnes de calcul : on sait en cinq secondes si le roi rattrape le pion. C’est plus fiable que n’importe quelle intuition.',
    sauf: 'Les pions qui se gênent entre eux cassent le carré : il faut alors calculer pour de vrai.',
  },
  {
    famille: 'Finale',
    regle: 'Ne te précipite pas.',
    pourquoi:
      'Une finale gagnante se gagne en améliorant sa position coup après coup. La hâte est la première cause de nulle dans les positions gagnées.',
    sauf: 'La règle des cinquante coups existe : si rien ne bouge, il faudra bien pousser un pion.',
  },
  {
    famille: 'Finale',
    regle: 'Cherche le pat quand tu perds.',
    pourquoi:
      'C’est la planche de salut de celui qui est derrière, et elle fonctionne d’autant mieux que l’autre se croit gagnant.',
    sauf: 'Ne joue pas pour le pat au prix d’une position encore tenable : on ne sacrifie pas une nulle probable pour une nulle miraculeuse.',
  },
  {
    famille: 'Finale',
    regle: 'Échange les pièces, pas les pions.',
    pourquoi:
      'Avec un pion de plus, chaque pièce échangée te rapproche du gain ; chaque pion échangé t’en éloigne.',
    sauf: 'Inverse exact quand tu as un pion de moins : échange les pions et garde les pièces.',
  },

  // ── Jeu positionnel ───────────────────────────────────────────────────────
  {
    famille: 'Jeu positionnel',
    regle: 'Un cavalier veut un avant-poste.',
    pourquoi:
      'Une case avancée qu’aucun pion ne peut attaquer, défendue par l’un des tiens : le cavalier qui s’y installe ne partira plus.',
    sauf: 'Un avant-poste qui ne regarde rien d’important n’est qu’une jolie case.',
  },
  {
    famille: 'Jeu positionnel',
    regle: 'Un fou veut des diagonales ouvertes.',
    pourquoi: 'Il ne coûte rien à placer et tout à débloquer : on déplace les pions, pas le fou.',
    sauf: 'Un fou peut rester derrière ses pions pour les tenir, le temps que la position s’ouvre.',
  },
  {
    famille: 'Jeu positionnel',
    regle: 'La paire de fous aime les positions ouvertes.',
    pourquoi:
      'À deux, ils couvrent les deux couleurs de cases : l’avantage vaut environ un demi-pion, et plus la position est ouverte, plus il compte.',
    sauf: 'Dans une position bloquée, un bon cavalier vaut mieux que deux fous qui ne voient rien.',
  },
  {
    famille: 'Jeu positionnel',
    regle: 'Ne crée pas de faiblesse de pion sans compensation.',
    pourquoi:
      'Un pion isolé, doublé ou arriéré est une cible permanente : il ne bouge plus et il faut le garder.',
    sauf: 'Le pion isolé donne de l’espace et des cases au milieu de partie. C’est un défaut de finale payé en activité.',
  },
  {
    famille: 'Jeu positionnel',
    regle: 'Les cases faibles se prennent, pas se regrettent.',
    pourquoi:
      'Une case que plus aucun pion adverse ne défend est à occuper avec une pièce, pas à contempler.',
    sauf: 'Occuper une case faible avec sa seule pièce active peut la rendre passive à son tour.',
  },
  {
    famille: 'Jeu positionnel',
    regle: 'Empêche avant de faire.',
    pourquoi:
      'La prophylaxie : voir ce que l’adversaire veut faire et le rendre impossible. C’est la compétence qui sépare 1 900 de 2 200.',
    sauf: 'À trop empêcher, on ne fait rien. Il faut un plan à soi en plus.',
  },
  {
    famille: 'Jeu positionnel',
    regle: 'Le pion passé protégé est un avantage durable.',
    pourquoi:
      'Il ne peut pas être pris, il doit être surveillé, et il fixe une pièce adverse pour le reste de la partie.',
    sauf: 'Il ne gagne rien tout seul : il faut une seconde faiblesse ailleurs.',
  },
  {
    famille: 'Jeu positionnel',
    regle: 'Une colonne se prend avec deux tours.',
    pourquoi:
      'La première tour occupe, la seconde double. C’est la façon de transformer une colonne ouverte en pénétration sur la septième.',
    sauf: 'Si l’adversaire contrôle la case d’entrée, doubler ne sert à rien tant qu’on ne l’a pas contestée.',
  },
  {
    famille: 'Jeu positionnel',
    regle: 'Les pions ne reviennent pas.',
    pourquoi:
      'Chaque poussée est définitive. C’est pour cela qu’une structure de pions raconte la suite de la partie mieux que la position des pièces.',
    sauf: 'Rien. C’est une règle du jeu, pas un principe.',
  },
  {
    famille: 'Jeu positionnel',
    regle: 'Bloque le pion passé de l’adversaire, de préférence avec un cavalier.',
    pourquoi:
      'Un pion bloqué ne va plus à dame, et le cavalier qui le bloque garde toute son activité — contrairement à une tour.',
    sauf: 'Si tu peux le gagner plutôt que le bloquer, gagne-le.',
  },
  {
    famille: 'Jeu positionnel',
    regle: 'Un roi exposé change tous les calculs.',
    pourquoi:
      'Face à un roi sans abri, le matériel compte moins que le nombre de pièces qui le regardent. C’est la seule situation où sacrifier se fait à l’instinct.',
    sauf: 'Un roi exposé mais bien défendu tient très bien : compte les attaquants et les défenseurs avant de donner.',
  },
  {
    famille: 'Jeu positionnel',
    regle: 'Les roques opposés veulent des pions, pas des pièces.',
    pourquoi:
      'Quand chacun attaque de son côté, les pions arrivent sans affaiblir son propre roi. Le plus rapide gagne.',
    sauf: 'Si son attaque est plus rapide que la tienne, il faut défendre — et ce calcul-là se fait coup par coup.',
  },
  {
    famille: 'Jeu positionnel',
    regle: 'Échange le fou qui défend la couleur de cases que tu attaques.',
    pourquoi:
      'Supprimer le défenseur des cases noires autour du roi rend toutes tes pièces noires soudainement utiles.',
    sauf: 'Pas au prix de deux temps si l’attaque est une course.',
  },
  {
    famille: 'Jeu positionnel',
    regle: 'Quand tu ne sais pas quoi faire, regarde les pions.',
    pourquoi:
      'La structure dit où attaquer, de quel côté l’espace se trouve et quelle finale t’attend. Elle répond quand plus rien ne répond.',
    sauf: 'Rien — c’est le principe de secours, il sert précisément quand les autres se taisent.',
  },
]

/** Les familles dans l'ordre où on les lit. */
export const FAMILLES_PRINCIPES: FamillePrincipe[] = [
  'Ouverture',
  'Milieu de partie',
  'Finale',
  'Jeu positionnel',
]

/** Combien de principes par famille, pour l'annoncer sans le compter à la main. */
export function comptePrincipes(famille: FamillePrincipe): number {
  return PRINCIPES.filter((principe) => principe.famille === famille).length
}
