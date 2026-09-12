/**
 * Le catalogue des thèmes de séance.
 *
 * Séparé de `seance.ts`, et pour une raison précise : ce fichier ne dépend que
 * du cœur, sans le moindre alias `@/`. Il est donc lisible par un script Node
 * ordinaire — `scripts/check-seances.mjs` — alors que `seance.ts`, qui importe
 * les paliers, ne l'est pas. Les données d'un côté, ce qui s'en sert de l'autre.
 *
 * Ce n'est pas une précaution théorique : quatre des motifs listés ici
 * n'existaient que dans le type `MotifId` et n'étaient jamais produits par le
 * détecteur de position. Le bilan de ces séances annonçait « 0 pour toi, 0
 * contre toi » à chaque partie, sans que rien ne le signale. Le contrôle rejoue
 * de vraies parties et refuse un thème qu'il n'a jamais vu apparaître.
 */

import type { MotifId } from '@coupparfait/core'

export interface ThemeSeance {
  id: string
  /** Le thème, nommé comme on le dirait à voix haute. */
  nom: string
  /** L'emoji qui l'identifie dans la liste. */
  icone: string
  /** Ce qu'on cherche à faire pendant la partie. Une phrase, à l'impératif. */
  consigne: string
  /** Ce qu'on regarde pour savoir si ça marche. */
  aRegarder: string
  /**
   * Les motifs comptés dans le bilan.
   *
   * ⚠️ Ils doivent être **produits par `detectPositionMotifs`**, et pas
   * seulement exister dans `MotifId`. Le type en compte une soixantaine ; le
   * détecteur de position n'en émet qu'une trentaine — les autres viennent du
   * contexte d'un coup, pas d'une position. Un motif du mauvais côté de cette
   * frontière compile, passe la relecture, et ne compte jamais rien : le bilan
   * annonce sereinement « 0 pour toi, 0 contre toi » à chaque partie.
   *
   * C'est arrivé, sur quatre identifiants — `xRayAttack`, `tempo`,
   * `pawnMajority`, `weakSquare`. D'où `scripts/check-seances.mjs`, qui rejoue
   * de vraies parties et refuse un thème que le détecteur n'a jamais produit.
   */
  motifs: MotifId[]
  /** Les paliers auxquels ce thème a un sens. */
  paliers: string[]
}

export const THEMES_SEANCE: ThemeSeance[] = [
  {
    id: 'rien-en-prise',
    nom: 'Ne rien laisser en prise',
    icone: '🎯',
    consigne:
      'Avant chaque coup, fais le tour de tes pièces : lesquelles sont attaquées, et par quoi. Tu ne joues pas tant que tu n’as pas répondu.',
    aRegarder:
      'Chaque fois que le commentaire parle d’une pièce en prise — à toi ou à lui — c’est le thème qui se présente.',
    motifs: ['hangingPiece'],
    paliers: ['regles', 'pieces-en-prise', 'voir-ladversaire'],
  },
  {
    id: 'fourchettes',
    nom: 'Les fourchettes',
    icone: '🍴',
    consigne:
      'Cherche les cases d’où un cavalier atteindrait deux pièces à la fois — les tiennes comme les siennes. Les dames et les pions en font aussi.',
    aRegarder:
      'Repère les paires de pièces sur des cases de même couleur, à distance de cavalier l’une de l’autre.',
    motifs: ['fork'],
    paliers: ['pieces-en-prise', 'voir-ladversaire', 'un-plan'],
  },
  {
    id: 'clouages',
    nom: 'Clouages et enfilades',
    icone: '📌',
    consigne:
      'Aligne tes pièces lourdes sur ses pièces, et évite d’aligner les tiennes devant ton roi ou ta dame.',
    aRegarder:
      'Les diagonales et les colonnes où se trouvent son roi et sa dame : c’est là que les clouages naissent.',
    motifs: ['pin', 'skewer'],
    paliers: ['voir-ladversaire', 'un-plan', 'technique'],
  },
  {
    id: 'couloir',
    nom: 'La dernière rangée',
    icone: '🚪',
    consigne:
      'Surveille les deux dernières rangées : la sienne pour y entrer, la tienne pour ne pas s’y faire enfermer. Une case d’air pour ton roi, tôt.',
    aRegarder:
      'Après chaque échange de pièces lourdes, demande-toi qui contrôle la huitième rangée.',
    motifs: ['backRankMate', 'seventhRank'],
    paliers: ['pieces-en-prise', 'voir-ladversaire', 'un-plan'],
  },
  {
    id: 'developpement',
    nom: 'Sortir toutes ses pièces',
    icone: '🚀',
    consigne:
      'Un pion au centre, puis une pièce nouvelle à chaque coup jusqu’à ce que tout soit dehors et le roi à l’abri. Aucune pièce jouée deux fois.',
    aRegarder:
      'Compte tes pièces développées au coup dix. Huit, c’est gagné ; quatre, c’est le thème de la prochaine séance aussi.',
    motifs: ['development', 'centreControl'],
    paliers: ['regles', 'pieces-en-prise', 'voir-ladversaire'],
  },
  {
    id: 'colonnes',
    nom: 'Les colonnes ouvertes',
    icone: '🏛️',
    consigne:
      'Trouve la colonne sans pion et mets-y une tour. Puis la seconde derrière la première, et entre sur la septième rangée.',
    aRegarder:
      'La structure de pions : la colonne ouverte est déjà dessinée dessus, il n’y a rien à calculer.',
    motifs: ['openFile', 'semiOpenFile', 'seventhRank'],
    paliers: ['voir-ladversaire', 'un-plan', 'technique'],
  },
  {
    id: 'avant-poste',
    nom: 'L’avant-poste',
    icone: '🏰',
    consigne:
      'Cherche une case avancée qu’aucun de ses pions ne peut attaquer, et installes-y un cavalier. Il y restera jusqu’à la fin.',
    aRegarder:
      'Les cases devant ses pions arriérés, et celles que sa structure a définitivement abandonnées.',
    motifs: ['outpost'],
    paliers: ['un-plan', 'technique', 'prophylaxie'],
  },
  {
    id: 'roi-expose',
    nom: 'Attaquer le roi',
    icone: '⚔️',
    consigne:
      'Avant de lancer l’attaque, compte les attaquants et les défenseurs. Trois contre deux suffit ; deux contre trois ne marche jamais.',
    aRegarder: 'Son abri de pions : dès qu’une case s’ouvre devant son roi, le thème est là.',
    // `exposedKing` seul, et c'est un arbitrage. `kingSafety` compterait « ton
    // roi est à l'abri » comme une réussite du thème, ce qui n'est pas
    // attaquer ; et `oppositeCastling` est toujours attribué aux Blancs par le
    // détecteur — un joueur noir l'aurait vu compté « contre lui » à chaque
    // partie à roques opposés, ce qui est faux et décourageant.
    motifs: ['exposedKing'],
    paliers: ['un-plan', 'technique', 'prophylaxie'],
  },
  {
    id: 'pion-passe',
    nom: 'Le pion passé',
    icone: '♟️',
    consigne:
      'Crée un pion passé du côté où tu as la majorité, pousse-le, et mets ta tour derrière. Bloque le sien avec un cavalier.',
    aRegarder:
      'Dès que les dames partent, compte les pions de chaque aile : la majorité dit de quel côté jouer.',
    motifs: ['passedPawn', 'protectedPassedPawn', 'rookBehindPasser'],
    paliers: ['un-plan', 'technique', 'prophylaxie'],
  },
  {
    id: 'deux-faiblesses',
    nom: 'Le principe des deux faiblesses',
    icone: '🪤',
    consigne:
      'Fixe une première faiblesse, puis ouvre un second front à l’autre bout. Sa défense ne peut pas couvrir les deux.',
    aRegarder:
      'Les pions isolés, doublés et arriérés des deux camps : ce sont les faiblesses qu’on fixe.',
    motifs: ['isolatedPawn', 'doubledPawns', 'backwardPawn'],
    paliers: ['technique', 'prophylaxie'],
  },
]
