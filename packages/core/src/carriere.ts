/**
 * Le mode carrière.
 *
 * Douze chapitres, de « les pièces et leur route » à « sans filet ». Chacun a
 * une leçon d'entrée, cinq puzzles d'un thème, un adversaire attitré et une
 * condition de passage.
 *
 * **Pourquoi ce mode existe.** L'application sait déjà presque tout faire :
 * jouer contre vingt-cinq niveaux, expliquer chaque coup, enseigner des
 * ouvertures, entraîner la tactique. Ce qu'elle ne savait pas faire, c'est
 * dire *par quoi commencer et quoi faire ensuite*. Six entrées de menu et
 * aucune raison de préférer l'une à l'autre : la carrière est un **ordre**
 * donné à du contenu qui n'en avait pas.
 *
 * **Pourquoi l'adversaire ne suit pas le barème.** On affronte Brasier au
 * chapitre « tenir face à une attaque » parce qu'il attaque, et Mirage à celui
 * des gambits parce qu'il en offre. C'est ce qui distingue un chapitre d'un
 * simple palier de difficulté : le style de l'adversaire *est* l'exercice.
 *
 * Ce fichier est du code et non des données en base. Le contenu ne change pas
 * d'un joueur à l'autre, il doit être typé, et une table imposerait une
 * migration à chaque retouche de formulation. `scripts/check-carriere.mjs`
 * vérifie que chaque leçon et chaque thème référencés existent vraiment.
 */

import type { BotPersonalityId } from './types.ts'

// ─────────────────────────────────────────────────────────────────────────────
//  Les chapitres
// ─────────────────────────────────────────────────────────────────────────────

export interface Chapitre {
  /** Rang, de 1 à 12. Sert de clé partout. */
  numero: number
  titre: string
  /**
   * L'objectif, en une phrase, à la deuxième personne.
   *
   * Affiché avant de commencer. Un objectif qu'on ne sait pas formuler est un
   * objectif qu'on n'atteindra pas — c'est la raison d'être de ce champ, et
   * c'est pourquoi il est obligatoire.
   */
  objectif: string
  /** Identifiant de la leçon d'entrée, dans `apps/web/src/lib/lessons`. */
  lecon: string
  /** Thème des puzzles, tel que l'API `/api/puzzles` l'attend. */
  theme: string
  /** Nombre de puzzles à réussir. */
  puzzles: number
  /** Personnalité de l'adversaire. */
  adversaire: BotPersonalityId
  /** Niveau du barème des bots, 1 à 25. */
  niveau: number
  /**
   * Difficulté des puzzles du chapitre, en Elo, la même pour tout le monde.
   *
   * Elle ne se déduit ni du classement du joueur ni du palier de l'adversaire.
   * Un parcours qui s'adapte à celui qui le suit n'est plus un parcours : deux
   * personnes au chapitre 1 doivent y rencontrer la même difficulté, sinon la
   * progression annoncée sur la carte ne veut rien dire et l'on ne peut plus
   * dire à quelqu'un « j'en suis au chapitre 4 ».
   *
   * Le service de puzzles vise autrement le classement du joueur plus
   * cinquante points, ce qui convient à l'entraînement libre — on y cherche à
   * progresser — et pas ici.
   *
   * L'échelle commence à 500 : en dessous, la base de puzzles est
   * pratiquement vide, et demander 250 revient à demander 500 en obtenant en
   * prime une recherche élargie.
   */
  cotePuzzles: number
  /** Victoires nécessaires pour passer. */
  victoires: number
  /** Couleur d'accent du chapitre, pour la carte. */
  teinte: string
  emoji: string
}

/**
 * Douze chapitres, de 250 à 1900 Elo.
 *
 * Douze et non vingt-cinq comme le barème des bots : un chapitre doit durer
 * plusieurs séances pour qu'on sente la progression, et vingt-cinq paliers
 * donneraient l'impression de piétiner. Au-delà de 1900, un joueur sait ce
 * qu'il doit travailler et n'a plus besoin qu'on le lui dise.
 */
export const CHAPITRES: readonly Chapitre[] = [
  {
    numero: 1,
    titre: 'Les pièces et leur route',
    objectif: 'Savoir déplacer chaque pièce, et reconnaître un échec et mat.',
    lecon: 'echiquier',
    theme: 'mateIn1',
    puzzles: 3,
    adversaire: 'novice',
    niveau: 1,
    cotePuzzles: 500,
    victoires: 1,
    teinte: '#7c5cff',
    emoji: '♟',
  },
  {
    numero: 2,
    titre: 'Ne rien laisser en prise',
    objectif: 'Vérifier, avant chaque coup, ce que l’adversaire peut prendre.',
    lecon: 'piece-en-prise',
    theme: 'hangingPiece',
    puzzles: 5,
    adversaire: 'novice',
    niveau: 2,
    cotePuzzles: 600,
    victoires: 2,
    teinte: '#22b8cf',
    emoji: '👀',
  },
  {
    numero: 3,
    titre: 'Sortir ses pièces',
    objectif: 'Développer, roquer, occuper le centre — dans cet ordre.',
    lecon: 'principes-ouverture',
    theme: 'hangingPiece',
    puzzles: 5,
    adversaire: 'prudent',
    niveau: 3,
    cotePuzzles: 700,
    victoires: 2,
    teinte: '#51cf66',
    emoji: '🏇',
  },
  {
    numero: 4,
    titre: 'La fourchette et le clouage',
    objectif: 'Repérer les deux motifs qui gagnent le plus de parties.',
    lecon: 'fourchette',
    theme: 'fork',
    puzzles: 5,
    adversaire: 'tacticien',
    niveau: 4,
    cotePuzzles: 800,
    victoires: 2,
    teinte: '#fcc419',
    emoji: '🍴',
  },
  {
    numero: 5,
    titre: 'Conclure une partie gagnée',
    objectif: 'Mater avec une dame, puis avec une tour. Sans hésiter.',
    lecon: 'mat-escalier',
    theme: 'mateIn2',
    puzzles: 5,
    adversaire: 'prudent',
    niveau: 5,
    cotePuzzles: 900,
    victoires: 2,
    teinte: '#ff922b',
    emoji: '👑',
  },
  {
    numero: 6,
    titre: 'Tenir face à une attaque',
    objectif: 'Ne pas paniquer : défendre, puis frapper au centre.',
    lecon: 'securite-roi',
    theme: 'backRankMate',
    puzzles: 5,
    adversaire: 'fonceur',
    niveau: 6,
    cotePuzzles: 1000,
    victoires: 2,
    teinte: '#ff6b6b',
    emoji: '🛡️',
  },
  {
    numero: 7,
    titre: 'Compter le matériel',
    objectif: 'Savoir si un échange est bon avant de le faire.',
    lecon: 'valeurs',
    theme: 'skewer',
    puzzles: 5,
    adversaire: 'tacticien',
    niveau: 7,
    cotePuzzles: 1100,
    victoires: 2,
    teinte: '#845ef7',
    emoji: '⚖️',
  },
  {
    numero: 8,
    titre: 'Une ouverture à soi',
    objectif: 'Jouer les huit premiers coups sans réfléchir, des deux couleurs.',
    lecon: 'italienne',
    theme: 'discoveredAttack',
    puzzles: 5,
    adversaire: 'positionnel',
    niveau: 8,
    cotePuzzles: 1250,
    victoires: 2,
    teinte: '#20c997',
    emoji: '📖',
  },
  {
    numero: 9,
    titre: 'Accepter ou refuser un gambit',
    objectif: 'Décider entre le pion offert et le temps qu’il coûte.',
    lecon: 'gambit-dame',
    theme: 'sacrifice',
    puzzles: 5,
    adversaire: 'gambiteur',
    niveau: 9,
    cotePuzzles: 1400,
    victoires: 2,
    teinte: '#e64980',
    emoji: '🎭',
  },
  {
    numero: 10,
    titre: 'Les finales de pions',
    objectif: 'Gagner la finale que tout le monde perd : roi et pions.',
    lecon: 'opposition',
    theme: 'promotion',
    puzzles: 5,
    adversaire: 'positionnel',
    niveau: 10,
    cotePuzzles: 1550,
    victoires: 2,
    teinte: '#4dabf7',
    emoji: '🏁',
  },
  {
    numero: 11,
    titre: 'Le plan, pas le coup',
    objectif: 'Choisir une faiblesse adverse, et jouer trois coups vers elle.',
    lecon: 'avant-poste',
    theme: 'zugzwang',
    puzzles: 5,
    adversaire: 'positionnel',
    niveau: 11,
    cotePuzzles: 1700,
    victoires: 2,
    teinte: '#00b894',
    emoji: '🧭',
  },
  {
    numero: 12,
    titre: 'Sans filet',
    objectif: 'Une partie entière, sans indice et sans commentaire. Juste toi.',
    lecon: 'elimination-defenseur',
    theme: 'mateIn2',
    puzzles: 5,
    adversaire: 'machine',
    niveau: 13,
    cotePuzzles: 1850,
    victoires: 1,
    teinte: '#f03e3e',
    emoji: '🜛',
  },
] as const

/** Le dernier chapitre plus un : la valeur de `chapter` quand tout est fini. */
export const CARRIERE_TERMINEE = CHAPITRES.length + 1

export function chapitre(numero: number): Chapitre | null {
  return CHAPITRES.find((c) => c.numero === numero) ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
//  Expérience et rangs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ce que rapporte chaque geste.
 *
 * Les valeurs sont volontairement rondes et lisibles : quelqu'un doit pouvoir
 * additionner de tête et prévoir ce qu'il va gagner. Un barème opaque ne
 * récompense pas, il intrigue — et une fois l'intrigue passée, il ne reste rien.
 */
export const XP = {
  lecon: 50,
  puzzle: 20,
  victoire: 100,
  /** Bonus de fin de chapitre, avant les étoiles. */
  chapitre: 250,
  /** Par étoile obtenue à la fin d'un chapitre. */
  etoile: 100,
} as const

export interface Rang {
  seuil: number
  nom: string
  emoji: string
}

/**
 * Les rangs.
 *
 * Nommés d'après la mascotte — une cavale — plutôt que « niveau 4 ». Un rang
 * qui porte un nom se retient et se raconte ; un numéro ne se raconte pas.
 * Six paliers seulement : au-delà, on obtient une échelle qu'on ne mémorise
 * plus, ce qui revient à ne pas en avoir.
 *
 * Les seuils ne sont pas ronds par hasard : ils sont calés sur ce que rapporte
 * une carrière réelle. Le dernier rang doit être hors de portée d'un parcours
 * bâclé à une étoile par chapitre, et atteint par un parcours sans faute. Les
 * premières valeurs, choisies à vue de nez, donnaient le titre suprême à qui
 * avait tout fait au minimum syndical — `check-carriere.mjs` le vérifie
 * désormais à chaque exécution des tests.
 */
export const RANGS: readonly Rang[] = [
  { seuil: 0, nom: 'Poulain', emoji: '🐣' },
  { seuil: 800, nom: 'Cavale', emoji: '🐎' },
  { seuil: 2000, nom: 'Éclaireur', emoji: '🏇' },
  { seuil: 4000, nom: 'Franc-tireur', emoji: '⚔️' },
  { seuil: 6500, nom: 'Stratège', emoji: '🧠' },
  { seuil: 9500, nom: 'Maître de la Cavale', emoji: '👑' },
] as const

export interface EtatDuRang {
  rang: Rang
  suivant: Rang | null
  /** Expérience acquise dans le rang courant. */
  acquis: number
  /** Expérience nécessaire pour passer au suivant, `null` au dernier rang. */
  requis: number | null
  /** Avancement dans le rang courant, de 0 à 1. */
  fraction: number
}

export function rangPour(xp: number): EtatDuRang {
  let index = 0
  for (let i = 0; i < RANGS.length; i++) {
    if (xp >= RANGS[i]!.seuil) index = i
  }
  const rang = RANGS[index]!
  const suivant = RANGS[index + 1] ?? null
  const acquis = xp - rang.seuil
  const requis = suivant ? suivant.seuil - rang.seuil : null
  return {
    rang,
    suivant,
    acquis,
    requis,
    // Au dernier rang la barre est pleine, et c'est le bon message : il n'y a
    // plus rien à atteindre, pas « zéro pour cent d'un palier inexistant ».
    fraction: requis === null ? 1 : Math.min(1, acquis / requis),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Étoiles
// ─────────────────────────────────────────────────────────────────────────────

/**
 * De une à trois étoiles à la fin d'un chapitre.
 *
 * Une simple coche ne donne aucune raison de refaire un chapitre passé. Les
 * étoiles en donnent une, et elles récompensent la seule chose qui compte
 * vraiment ici : avoir réussi **sans aide**.
 *
 *  - 3 ★ aucun indice, aucun coup de main, aucune défaite ;
 *  - 2 ★ au plus deux aides, ou une défaite ;
 *  - 1 ★ dans tous les autres cas — parce qu'on a terminé, et que terminer
 *        mérite toujours quelque chose.
 */
export function etoilesPour(options: { aides: number; defaites: number }): number {
  const { aides, defaites } = options
  if (aides === 0 && defaites === 0) return 3
  if (aides <= 2 && defaites <= 1) return 2
  return 1
}

// ─────────────────────────────────────────────────────────────────────────────
//  Hauts faits
// ─────────────────────────────────────────────────────────────────────────────

export interface HautFait {
  id: string
  nom: string
  /** Ce qu'il faut faire, dit à l'avance. Un secret ne motive personne. */
  condition: string
  emoji: string
}

/**
 * Onze hauts faits, tous annoncés d'avance.
 *
 * Un haut fait caché ne récompense pas un effort, il récompense un hasard :
 * on l'obtient sans savoir pourquoi, ou on ne l'obtient jamais faute d'avoir
 * su qu'il existait. La condition est donc affichée dès le premier jour, y
 * compris pour ceux qu'on n'a pas encore.
 */
export const HAUTS_FAITS: readonly HautFait[] = [
  { id: 'premier-pas', nom: 'Premier pas', condition: 'Terminer le chapitre 1', emoji: '🌱' },
  { id: 'sans-faute', nom: 'Sans faute', condition: 'Décrocher trois étoiles sur un chapitre', emoji: '⭐' },
  { id: 'triplette', nom: 'Triplette', condition: 'Trois étoiles sur trois chapitres', emoji: '✨' },
  { id: 'tacticien', nom: 'Tacticien', condition: 'Réussir 25 puzzles en carrière', emoji: '⚡' },
  { id: 'erudit', nom: 'Érudit', condition: 'Voir les douze leçons de la carrière', emoji: '📚' },
  { id: 'revanche', nom: 'Revanche', condition: 'Gagner après trois défaites d’affilée', emoji: '🔥' },
  { id: 'expeditif', nom: 'Expéditif', condition: 'Gagner une partie en moins de 25 coups', emoji: '💨' },
  { id: 'chirurgien', nom: 'Chirurgien', condition: 'Gagner un duel sans avoir demandé d’aide', emoji: '🎯' },
  { id: 'mi-chemin', nom: 'À mi-chemin', condition: 'Atteindre le chapitre 7', emoji: '🧗' },
  { id: 'sans-filet', nom: 'Sans filet', condition: 'Terminer le chapitre 12', emoji: '🜛' },
  { id: 'couronne', nom: 'La couronne', condition: 'Terminer la carrière entière', emoji: '👑' },
] as const

export function hautFait(id: string): HautFait | null {
  return HAUTS_FAITS.find((h) => h.id === id) ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
//  Progression
// ─────────────────────────────────────────────────────────────────────────────

/** L'avancement tel qu'il est stocké, sans mise en forme. */
export interface Progression {
  chapter: number
  lessonDone: boolean
  puzzlesDone: number
  winsInChapter: number
  losingStreak: number
  helpUsed: number
  stars: Record<string, number>
  xp: number
  badges: string[]
}

export const PROGRESSION_INITIALE: Progression = {
  chapter: 1,
  lessonDone: false,
  puzzlesDone: 0,
  winsInChapter: 0,
  losingStreak: 0,
  helpUsed: 0,
  stars: {},
  xp: 0,
  badges: [],
}

/** Les quatre temps d'un chapitre, et où l'on en est. */
export interface Etape {
  cle: 'lecon' | 'puzzles' | 'duel' | 'bilan'
  titre: string
  detail: string
  fait: number
  total: number
  termine: boolean
}

export function etapesDe(chapitre: Chapitre, progression: Progression): Etape[] {
  const lecon = progression.lessonDone
  const puzzles = Math.min(progression.puzzlesDone, chapitre.puzzles)
  const duels = Math.min(progression.winsInChapter, chapitre.victoires)
  return [
    {
      cle: 'lecon',
      titre: 'La leçon',
      detail: 'Deux à cinq minutes, sur l’échiquier',
      fait: lecon ? 1 : 0,
      total: 1,
      termine: lecon,
    },
    {
      cle: 'puzzles',
      titre: 'L’entraînement',
      detail: `${chapitre.puzzles} puzzles du thème`,
      fait: puzzles,
      total: chapitre.puzzles,
      termine: puzzles >= chapitre.puzzles,
    },
    {
      cle: 'duel',
      titre: 'Le duel',
      detail: `${chapitre.victoires} victoire${chapitre.victoires > 1 ? 's' : ''} à décrocher`,
      fait: duels,
      total: chapitre.victoires,
      termine: duels >= chapitre.victoires,
    },
  ]
}

/** Vrai quand les trois temps du chapitre courant sont remplis. */
export function chapitreAcheve(chapitre: Chapitre, progression: Progression): boolean {
  return (
    progression.lessonDone &&
    progression.puzzlesDone >= chapitre.puzzles &&
    progression.winsInChapter >= chapitre.victoires
  )
}

/**
 * La prochaine chose à faire.
 *
 * Un seul bouton par écran, et c'est lui qui décide où il mène. Le mode existe
 * pour supprimer le choix, pas pour en ajouter un treizième.
 */
export function prochaineEtape(
  chapitre: Chapitre,
  progression: Progression,
): { cle: Etape['cle']; libelle: string; lien: string } | null {
  if (!progression.lessonDone) {
    return {
      cle: 'lecon',
      libelle: 'Commencer la leçon',
      lien: `/apprendre/${chapitre.lecon}?carriere=${chapitre.numero}`,
    }
  }
  if (progression.puzzlesDone < chapitre.puzzles) {
    const reste = chapitre.puzzles - progression.puzzlesDone
    return {
      cle: 'puzzles',
      libelle: reste === chapitre.puzzles ? 'Passer aux puzzles' : `Encore ${reste} puzzle${reste > 1 ? 's' : ''}`,
      /*
        La cote du chapitre voyage avec le thème.

        Sans elle, le service de puzzles vise le classement du joueur plus
        cinquante points — ce qui est juste pour l'entraînement libre, et faux
        pour un parcours. Le chapitre 1 apprend à déplacer les pièces ; il
        servait des positions à 1 150 Elo à qui n'a encore rien appris, parce
        que c'est là qu'un classement de puzzles se trouve après quelques
        réussites ailleurs. Un chapitre a sa propre difficulté, annoncée sur sa
        carte : c'est elle qui doit commander.

        Elle est propre au chapitre — voir `cotePuzzles` — et non empruntée au
        palier de l'adversaire qu'on y affronte : rien ne dit qu'une position à
        résoudre et un adversaire à battre se calibrent de la même façon.
      */
      lien: `/puzzles?theme=${chapitre.theme}&carriere=${chapitre.numero}&cote=${chapitre.cotePuzzles}`,
    }
  }
  if (progression.winsInChapter < chapitre.victoires) {
    return {
      cle: 'duel',
      libelle: progression.winsInChapter === 0 ? 'Affronter l’adversaire' : 'Encore une victoire',
      lien: `/jouer/ordinateur?carriere=${chapitre.numero}`,
    }
  }
  return null
}

/**
 * Le coup de main, après trois défaites d'affilée.
 *
 * C'est le point le plus important du mode. Un parcours rate sa cible s'il
 * laisse quelqu'un bloqué au chapitre 4 sans lui dire pourquoi : on propose
 * alors — sans l'imposer — de baisser l'adversaire d'un cran, et l'on renvoie
 * vers la leçon. Trois défaites et non cinq : à cinq, on a déjà refermé
 * l'onglet.
 */
export const SEUIL_COUP_DE_MAIN = 3

export function coupDeMainPropose(progression: Progression): boolean {
  return progression.losingStreak >= SEUIL_COUP_DE_MAIN
}

/** Niveau effectif de l'adversaire, allégé quand le coup de main est actif. */
export function niveauEffectif(chapitre: Chapitre, progression: Progression): number {
  return coupDeMainPropose(progression) ? Math.max(1, chapitre.niveau - 2) : chapitre.niveau
}

/** Nombre total d'étoiles décrochées. */
export function totalEtoiles(progression: Progression): number {
  return Object.values(progression.stars).reduce((somme, valeur) => somme + valeur, 0)
}
