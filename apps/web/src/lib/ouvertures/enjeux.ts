/**
 * Les enjeux des ouvertures — ce qu'on cherche, pas ce qu'on joue.
 *
 * L'explorateur reconnaît 3 810 ouvertures et sait en donner le nom, le code
 * ECO et les statistiques. Ce qu'il ne disait pas, c'est **ce qu'on essaie de
 * faire** : on pouvait connaître le nom de sa propre ouverture, ses dix
 * premiers coups de théorie, et n'avoir aucune idée de quoi jouer au onzième.
 * Or c'est toujours au onzième que commence la partie.
 *
 * ── Vingt-cinq, et pas trois mille huit cent dix ─────────────────────────────
 *
 * Écrire une fiche par ouverture nommée serait absurde : la plupart sont des
 * variantes à six coups de profondeur, et celui qui les atteint n'a pas besoin
 * qu'on lui explique le plan. Vingt-cinq suffisent à couvrir la quasi-totalité
 * de ce qui se joue en club, et chacune est écrite pour être lue **avant** de
 * connaître la théorie.
 *
 * ── Ce que porte chaque fiche ────────────────────────────────────────────────
 *
 * Cinq champs, toujours les mêmes, et le dernier n'est pas décoratif :
 *
 *  - **l'idée** : la raison d'être de l'ouverture, en une phrase ;
 *  - **la structure** : à quoi ressemblent les pions, puisque ce sont eux qui
 *    décident de quel côté jouer et quelle finale attend ;
 *  - **les deux plans**, un par camp : une ouverture n'a pas de plan, elle en a
 *    deux qui s'opposent, et ne connaître que le sien suffit à perdre ;
 *  - **le piège** : celui qu'on tend ou qu'on subit dans les dix premiers
 *    coups. C'est ce qui décide les parties en club, bien avant la théorie.
 *
 * La suite de coups sert à reconnaître la fiche depuis l'échiquier : quand on
 * joue l'ouverture dans l'explorateur, la fiche apparaît d'elle-même. C'est la
 * seule façon de lire « ce que cherche la sicilienne » au moment où la question
 * se pose, c'est-à-dire la main sur les pièces.
 */

import type { TranslationKey } from '@/lib/i18n/index.tsx'

export interface FicheEnjeux {
  id: string
  /**
   * Nom de catalogue, par clé de dictionnaire.
   *
   * Les vingt-cinq fiches étaient écrites en français, et elles n'existaient
   * qu'en français : c'est le seul endroit de l'application qui explique ce
   * qu'une ouverture *cherche à faire*, et il n'était lisible que pour un
   * francophone.
   */
  nom: TranslationKey
  /** Code ECO de la position de référence. */
  eco: string
  /**
   * La suite qui définit l'ouverture, en notation algébrique depuis le départ.
   *
   * Sert à reconnaître la fiche sur un échiquier : on garde la plus longue
   * suite qui soit un début de la partie jouée. Volontairement courte — trois à
   * cinq coups — parce qu'une fiche qui ne s'afficherait qu'après huit coups
   * exacts ne s'afficherait jamais.
   */
  coups: string[]
  /**
   * Les autres noms sous lesquels l'ouverture se dit dans un texte.
   *
   * Le champ `nom` est celui d'un catalogue — « Défense sicilienne », « Partie
   * italienne ». Personne n'écrit cela dans une phrase : on écrit « la
   * sicilienne », « l'italienne », « l'est-indienne ». Sans ces formes-là, un
   * nom d'ouverture rencontré au milieu d'un principe ou d'un levier resterait
   * un mot mort, alors que sa fiche existe à un clic.
   *
   * Écrits en minuscules et sans article : la reconnaissance ignore la casse, et
   * l'article reste en dehors du lien.
   *
   * Par clé de dictionnaire, et séparés par des virgules. Ce ne sont pas des
   * intitulés mais des formes de reconnaissance, et elles ne pouvaient
   * reconnaître que du français : la prose devenant traduite, les liens vers les
   * fiches disparaissaient de toute l'application dès qu'on changeait de langue.
   * Une liste dans une chaîne plutôt qu'un tableau, parce que le dictionnaire ne
   * porte que des chaînes — couper sur la virgule au chargement coûte moins
   * qu'une structure de plus.
   */
  aliasKey: TranslationKey
  /** Qui choisit cette ouverture. */
  pour: 'Blancs' | 'Noirs'
  idee: TranslationKey
  structure: TranslationKey
  planBlancs: TranslationKey
  planNoirs: TranslationKey
  piege: TranslationKey
  /** Leçon guidée correspondante, quand il y en a une. */
  lecon?: string
}

export const FICHES_ENJEUX: FicheEnjeux[] = [
  // ── Après 1.e4 e5 ───────────────────────────────────────────────────────
  {
    id: 'italienne',
    nom: 'fiches.italienne.nom',
    eco: 'C50',
    coups: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
    aliasKey: 'fiches.italienne.alias',
    pour: 'Blancs',
    lecon: 'italienne',
    idee: 'fiches.italienne.idee',
    structure: 'fiches.italienne.structure',
    planBlancs: 'fiches.italienne.planBlancs',
    planNoirs: 'fiches.italienne.planNoirs',
    piege: 'fiches.italienne.piege',
  },
  {
    id: 'espagnole',
    nom: 'fiches.espagnole.nom',
    eco: 'C60',
    coups: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
    aliasKey: 'fiches.espagnole.alias',
    pour: 'Blancs',
    lecon: 'espagnole',
    idee: 'fiches.espagnole.idee',
    structure: 'fiches.espagnole.structure',
    planBlancs: 'fiches.espagnole.planBlancs',
    planNoirs: 'fiches.espagnole.planNoirs',
    piege: 'fiches.espagnole.piege',
  },
  {
    id: 'deux-cavaliers',
    nom: 'fiches.deux-cavaliers.nom',
    eco: 'C55',
    coups: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'],
    aliasKey: 'fiches.deux-cavaliers.alias',
    pour: 'Noirs',
    idee: 'fiches.deux-cavaliers.idee',
    structure: 'fiches.deux-cavaliers.structure',
    planBlancs: 'fiches.deux-cavaliers.planBlancs',
    planNoirs: 'fiches.deux-cavaliers.planNoirs',
    piege: 'fiches.deux-cavaliers.piege',
  },
  {
    id: 'ecossaise',
    nom: 'fiches.ecossaise.nom',
    eco: 'C45',
    coups: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'],
    aliasKey: 'fiches.ecossaise.alias',
    pour: 'Blancs',
    idee: 'fiches.ecossaise.idee',
    structure: 'fiches.ecossaise.structure',
    planBlancs: 'fiches.ecossaise.planBlancs',
    planNoirs: 'fiches.ecossaise.planNoirs',
    piege: 'fiches.ecossaise.piege',
  },
  {
    id: 'gambit-roi',
    nom: 'fiches.gambit-roi.nom',
    eco: 'C33',
    coups: ['e4', 'e5', 'f4'],
    aliasKey: 'fiches.gambit-roi.alias',
    pour: 'Blancs',
    idee: 'fiches.gambit-roi.idee',
    structure: 'fiches.gambit-roi.structure',
    planBlancs: 'fiches.gambit-roi.planBlancs',
    planNoirs: 'fiches.gambit-roi.planNoirs',
    piege: 'fiches.gambit-roi.piege',
  },
  {
    id: 'petroff',
    nom: 'fiches.petroff.nom',
    eco: 'C42',
    coups: ['e4', 'e5', 'Nf3', 'Nf6'],
    aliasKey: 'fiches.petroff.alias',
    pour: 'Noirs',
    idee: 'fiches.petroff.idee',
    structure: 'fiches.petroff.structure',
    planBlancs: 'fiches.petroff.planBlancs',
    planNoirs: 'fiches.petroff.planNoirs',
    piege: 'fiches.petroff.piege',
  },
  {
    id: 'philidor',
    nom: 'fiches.philidor.nom',
    eco: 'C41',
    coups: ['e4', 'e5', 'Nf3', 'd6'],
    aliasKey: 'fiches.philidor.alias',
    pour: 'Noirs',
    idee: 'fiches.philidor.idee',
    structure: 'fiches.philidor.structure',
    planBlancs: 'fiches.philidor.planBlancs',
    planNoirs: 'fiches.philidor.planNoirs',
    piege: 'fiches.philidor.piege',
    lecon: 'mat-legal',
  },

  // ── Après 1.e4, réponses asymétriques ───────────────────────────────────
  {
    id: 'sicilienne',
    nom: 'fiches.sicilienne.nom',
    eco: 'B20',
    coups: ['e4', 'c5'],
    aliasKey: 'fiches.sicilienne.alias',
    pour: 'Noirs',
    lecon: 'sicilienne',
    idee: 'fiches.sicilienne.idee',
    structure: 'fiches.sicilienne.structure',
    planBlancs: 'fiches.sicilienne.planBlancs',
    planNoirs: 'fiches.sicilienne.planNoirs',
    piege: 'fiches.sicilienne.piege',
  },
  {
    id: 'najdorf',
    nom: 'fiches.najdorf.nom',
    eco: 'B90',
    coups: ['e4', 'c5', 'Nf3', 'd6', 'd4'],
    aliasKey: 'fiches.najdorf.alias',
    pour: 'Noirs',
    idee: 'fiches.najdorf.idee',
    structure: 'fiches.najdorf.structure',
    planBlancs: 'fiches.najdorf.planBlancs',
    planNoirs: 'fiches.najdorf.planNoirs',
    piege: 'fiches.najdorf.piege',
  },
  {
    id: 'francaise',
    nom: 'fiches.francaise.nom',
    eco: 'C00',
    coups: ['e4', 'e6'],
    aliasKey: 'fiches.francaise.alias',
    pour: 'Noirs',
    lecon: 'francaise',
    idee: 'fiches.francaise.idee',
    structure: 'fiches.francaise.structure',
    planBlancs: 'fiches.francaise.planBlancs',
    planNoirs: 'fiches.francaise.planNoirs',
    piege: 'fiches.francaise.piege',
  },
  {
    id: 'caro-kann',
    nom: 'fiches.caro-kann.nom',
    eco: 'B10',
    coups: ['e4', 'c6'],
    aliasKey: 'fiches.caro-kann.alias',
    pour: 'Noirs',
    idee: 'fiches.caro-kann.idee',
    structure: 'fiches.caro-kann.structure',
    planBlancs: 'fiches.caro-kann.planBlancs',
    planNoirs: 'fiches.caro-kann.planNoirs',
    piege: 'fiches.caro-kann.piege',
  },
  {
    id: 'scandinave',
    nom: 'fiches.scandinave.nom',
    eco: 'B01',
    coups: ['e4', 'd5'],
    aliasKey: 'fiches.scandinave.alias',
    pour: 'Noirs',
    idee: 'fiches.scandinave.idee',
    structure: 'fiches.scandinave.structure',
    planBlancs: 'fiches.scandinave.planBlancs',
    planNoirs: 'fiches.scandinave.planNoirs',
    piege: 'fiches.scandinave.piege',
  },
  {
    id: 'pirc',
    nom: 'fiches.pirc.nom',
    eco: 'B07',
    coups: ['e4', 'd6', 'd4', 'Nf6'],
    aliasKey: 'fiches.pirc.alias',
    pour: 'Noirs',
    idee: 'fiches.pirc.idee',
    structure: 'fiches.pirc.structure',
    planBlancs: 'fiches.pirc.planBlancs',
    planNoirs: 'fiches.pirc.planNoirs',
    piege: 'fiches.pirc.piege',
  },
  {
    id: 'alekhine',
    nom: 'fiches.alekhine.nom',
    eco: 'B02',
    coups: ['e4', 'Nf6'],
    aliasKey: 'fiches.alekhine.alias',
    pour: 'Noirs',
    idee: 'fiches.alekhine.idee',
    structure: 'fiches.alekhine.structure',
    planBlancs: 'fiches.alekhine.planBlancs',
    planNoirs: 'fiches.alekhine.planNoirs',
    piege: 'fiches.alekhine.piege',
  },

  // ── Après 1.d4 ──────────────────────────────────────────────────────────
  {
    id: 'gambit-dame',
    nom: 'fiches.gambit-dame.nom',
    eco: 'D06',
    coups: ['d4', 'd5', 'c4'],
    aliasKey: 'fiches.gambit-dame.alias',
    pour: 'Blancs',
    lecon: 'gambit-dame',
    idee: 'fiches.gambit-dame.idee',
    structure: 'fiches.gambit-dame.structure',
    planBlancs: 'fiches.gambit-dame.planBlancs',
    planNoirs: 'fiches.gambit-dame.planNoirs',
    piege: 'fiches.gambit-dame.piege',
  },
  {
    id: 'gambit-dame-accepte',
    nom: 'fiches.gambit-dame-accepte.nom',
    eco: 'D20',
    coups: ['d4', 'd5', 'c4', 'dxc4'],
    aliasKey: 'fiches.gambit-dame-accepte.alias',
    pour: 'Noirs',
    idee: 'fiches.gambit-dame-accepte.idee',
    structure: 'fiches.gambit-dame-accepte.structure',
    planBlancs: 'fiches.gambit-dame-accepte.planBlancs',
    planNoirs: 'fiches.gambit-dame-accepte.planNoirs',
    piege: 'fiches.gambit-dame-accepte.piege',
  },
  {
    id: 'slave',
    nom: 'fiches.slave.nom',
    eco: 'D10',
    coups: ['d4', 'd5', 'c4', 'c6'],
    aliasKey: 'fiches.slave.alias',
    pour: 'Noirs',
    idee: 'fiches.slave.idee',
    structure: 'fiches.slave.structure',
    planBlancs: 'fiches.slave.planBlancs',
    planNoirs: 'fiches.slave.planNoirs',
    piege: 'fiches.slave.piege',
  },
  {
    id: 'londres',
    nom: 'fiches.londres.nom',
    eco: 'D02',
    coups: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4'],
    aliasKey: 'fiches.londres.alias',
    pour: 'Blancs',
    idee: 'fiches.londres.idee',
    structure: 'fiches.londres.structure',
    planBlancs: 'fiches.londres.planBlancs',
    planNoirs: 'fiches.londres.planNoirs',
    piege: 'fiches.londres.piege',
  },
  {
    id: 'nimzo-indienne',
    nom: 'fiches.nimzo-indienne.nom',
    eco: 'E20',
    coups: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'],
    aliasKey: 'fiches.nimzo-indienne.alias',
    pour: 'Noirs',
    idee: 'fiches.nimzo-indienne.idee',
    structure: 'fiches.nimzo-indienne.structure',
    planBlancs: 'fiches.nimzo-indienne.planBlancs',
    planNoirs: 'fiches.nimzo-indienne.planNoirs',
    piege: 'fiches.nimzo-indienne.piege',
  },
  {
    id: 'est-indienne',
    nom: 'fiches.est-indienne.nom',
    eco: 'E60',
    coups: ['d4', 'Nf6', 'c4', 'g6'],
    aliasKey: 'fiches.est-indienne.alias',
    pour: 'Noirs',
    lecon: 'est-indienne',
    idee: 'fiches.est-indienne.idee',
    structure: 'fiches.est-indienne.structure',
    planBlancs: 'fiches.est-indienne.planBlancs',
    planNoirs: 'fiches.est-indienne.planNoirs',
    piege: 'fiches.est-indienne.piege',
  },
  {
    id: 'grunfeld',
    nom: 'fiches.grunfeld.nom',
    eco: 'D80',
    coups: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5'],
    aliasKey: 'fiches.grunfeld.alias',
    pour: 'Noirs',
    idee: 'fiches.grunfeld.idee',
    structure: 'fiches.grunfeld.structure',
    planBlancs: 'fiches.grunfeld.planBlancs',
    planNoirs: 'fiches.grunfeld.planNoirs',
    piege: 'fiches.grunfeld.piege',
  },
  {
    id: 'catalane',
    nom: 'fiches.catalane.nom',
    eco: 'E00',
    coups: ['d4', 'Nf6', 'c4', 'e6', 'g3'],
    aliasKey: 'fiches.catalane.alias',
    pour: 'Blancs',
    idee: 'fiches.catalane.idee',
    structure: 'fiches.catalane.structure',
    planBlancs: 'fiches.catalane.planBlancs',
    planNoirs: 'fiches.catalane.planNoirs',
    piege: 'fiches.catalane.piege',
  },
  {
    id: 'hollandaise',
    nom: 'fiches.hollandaise.nom',
    eco: 'A80',
    coups: ['d4', 'f5'],
    aliasKey: 'fiches.hollandaise.alias',
    pour: 'Noirs',
    idee: 'fiches.hollandaise.idee',
    structure: 'fiches.hollandaise.structure',
    planBlancs: 'fiches.hollandaise.planBlancs',
    planNoirs: 'fiches.hollandaise.planNoirs',
    piege: 'fiches.hollandaise.piege',
  },
  {
    id: 'anglaise',
    nom: 'fiches.anglaise.nom',
    eco: 'A10',
    coups: ['c4'],
    aliasKey: 'fiches.anglaise.alias',
    pour: 'Blancs',
    idee: 'fiches.anglaise.idee',
    structure: 'fiches.anglaise.structure',
    planBlancs: 'fiches.anglaise.planBlancs',
    planNoirs: 'fiches.anglaise.planNoirs',
    piege: 'fiches.anglaise.piege',
  },
  {
    id: 'reti',
    nom: 'fiches.reti.nom',
    eco: 'A09',
    coups: ['Nf3', 'd5', 'c4'],
    aliasKey: 'fiches.reti.alias',
    pour: 'Blancs',
    idee: 'fiches.reti.idee',
    structure: 'fiches.reti.structure',
    planBlancs: 'fiches.reti.planBlancs',
    planNoirs: 'fiches.reti.planNoirs',
    piege: 'fiches.reti.piege',
  },
]

/**
 * La fiche qui correspond à une partie jouée.
 *
 * On garde la **plus longue** suite qui soit un début de la partie : sans cela,
 * 1.e4 e5 2.Cf3 Cc6 3.Fb5 afficherait la fiche de l'italienne si elle venait
 * d'abord dans la liste, puisqu'aucune des deux n'est plus « vraie » que l'autre
 * au deuxième coup. La plus longue est la plus précise, toujours.
 *
 * La comparaison porte sur la notation algébrique brute telle que chess.js la
 * produit : c'est celle des fiches, et c'est celle que l'explorateur a dans son
 * historique.
 */
export function ficheDeLaPartie(coups: string[]): FicheEnjeux | null {
  let meilleure: FicheEnjeux | null = null

  for (const fiche of FICHES_ENJEUX) {
    if (fiche.coups.length > coups.length) continue
    const correspond = fiche.coups.every((coup, index) => coup === coups[index])
    if (!correspond) continue
    if (!meilleure || fiche.coups.length > meilleure.coups.length) meilleure = fiche
  }

  return meilleure
}

export function ficheEnjeux(id: string): FicheEnjeux | null {
  return FICHES_ENJEUX.find((fiche) => fiche.id === id) ?? null
}
