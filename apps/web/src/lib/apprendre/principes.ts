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

import type { TranslationKey } from '@/lib/i18n/index.tsx'

/** Une question du mémo, avec ce qu'elle évite concrètement. */
export interface QuestionMemo {
  /**
   * Identifiant stable, qui nomme la clé de dictionnaire.
   *
   * Dérivé de l'énoncé et non du rang : sans lui, insérer une question au milieu
   * du mémo renommerait silencieusement toutes les suivantes, et chaque
   * traduction se retrouverait sur la mauvaise phrase.
   */
  id: string
  /** La question, formulée à la deuxième personne et tenant sur une ligne. */
  question: TranslationKey
  /** Ce qu'on regarde pour y répondre. */
  comment: TranslationKey
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
    id: 'qu-est-ce-que',
    question: 'memo.qu-est-ce-que.question',
    comment: 'memo.qu-est-ce-que.comment',
  },
  {
    id: 'qu-est-ce-qu',
    question: 'memo.qu-est-ce-qu.question',
    comment: 'memo.qu-est-ce-qu.comment',
  },
  {
    id: 'qu-est-ce-que-mon',
    question: 'memo.qu-est-ce-que-mon.question',
    comment: 'memo.qu-est-ce-que-mon.comment',
  },
  {
    id: 's-il-joue-le',
    question: 'memo.s-il-joue-le.question',
    comment: 'memo.s-il-joue-le.comment',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
//  Principes
// ─────────────────────────────────────────────────────────────────────────────

export type FamillePrincipe = 'Ouverture' | 'Milieu de partie' | 'Finale' | 'Jeu positionnel'

export interface Principe {
  /** Identifiant stable, qui nomme la clé. Voir `QuestionMemo`. */
  id: string
  famille: FamillePrincipe
  /** L'énoncé, à l'impératif : c'est une conduite, pas une observation. */
  regle: TranslationKey
  /** Pourquoi ça marche. Une phrase, concrète. */
  pourquoi: TranslationKey
  /**
   * Quand ça ne marche pas.
   *
   * Obligatoire. Un principe sans exception devient une règle, et une règle
   * qu'on applique sans regarder la position fait perdre des parties — c'est
   * exactement ce qui arrive à « développe avant d'attaquer » quand on est en
   * train d'être maté.
   */
  sauf: TranslationKey
}

export const PRINCIPES: Principe[] = [
  // ── Ouverture ─────────────────────────────────────────────────────────────
  {
    id: 'occupe-le-centre-avec',
    famille: 'Ouverture',
    regle: 'principesListe.occupe-le-centre-avec.regle',
    pourquoi: 'principesListe.occupe-le-centre-avec.pourquoi',
    sauf: 'principesListe.occupe-le-centre-avec.sauf',
  },
  {
    id: 'sors-les-cavaliers-avant',
    famille: 'Ouverture',
    regle: 'principesListe.sors-les-cavaliers-avant.regle',
    pourquoi: 'principesListe.sors-les-cavaliers-avant.pourquoi',
    sauf: 'principesListe.sors-les-cavaliers-avant.sauf',
  },
  {
    id: 'ne-bouge-pas-deux',
    famille: 'Ouverture',
    regle: 'principesListe.ne-bouge-pas-deux.regle',
    pourquoi: 'principesListe.ne-bouge-pas-deux.pourquoi',
    sauf: 'principesListe.ne-bouge-pas-deux.sauf',
  },
  {
    id: 'roque-tot-et-du',
    famille: 'Ouverture',
    regle: 'principesListe.roque-tot-et-du.regle',
    pourquoi: 'principesListe.roque-tot-et-du.pourquoi',
    sauf: 'principesListe.roque-tot-et-du.sauf',
  },
  {
    id: 'ne-sors-pas-la',
    famille: 'Ouverture',
    regle: 'principesListe.ne-sors-pas-la.regle',
    pourquoi: 'principesListe.ne-sors-pas-la.pourquoi',
    sauf: 'principesListe.ne-sors-pas-la.sauf',
  },
  {
    id: 'ne-pousse-pas-les',
    famille: 'Ouverture',
    regle: 'principesListe.ne-pousse-pas-les.regle',
    pourquoi: 'principesListe.ne-pousse-pas-les.pourquoi',
    sauf: 'principesListe.ne-pousse-pas-les.sauf',
  },
  {
    id: 'connecte-tes-tours',
    famille: 'Ouverture',
    regle: 'principesListe.connecte-tes-tours.regle',
    pourquoi: 'principesListe.connecte-tes-tours.pourquoi',
    sauf: 'principesListe.connecte-tes-tours.sauf',
  },
  {
    id: 'ne-cherche-pas-le',
    famille: 'Ouverture',
    regle: 'principesListe.ne-cherche-pas-le.regle',
    pourquoi: 'principesListe.ne-cherche-pas-le.pourquoi',
    sauf: 'principesListe.ne-cherche-pas-le.sauf',
  },

  // ── Milieu de partie ──────────────────────────────────────────────────────
  {
    id: 'ameliore-ta-pire-piece',
    famille: 'Milieu de partie',
    regle: 'principesListe.ameliore-ta-pire-piece.regle',
    pourquoi: 'principesListe.ameliore-ta-pire-piece.pourquoi',
    sauf: 'principesListe.ameliore-ta-pire-piece.sauf',
  },
  {
    id: 'les-tours-vont-sur',
    famille: 'Milieu de partie',
    regle: 'principesListe.les-tours-vont-sur.regle',
    pourquoi: 'principesListe.les-tours-vont-sur.pourquoi',
    sauf: 'principesListe.les-tours-vont-sur.sauf',
  },
  {
    id: 'attaque-du-cote-ou',
    famille: 'Milieu de partie',
    regle: 'principesListe.attaque-du-cote-ou.regle',
    pourquoi: 'principesListe.attaque-du-cote-ou.pourquoi',
    sauf: 'principesListe.attaque-du-cote-ou.sauf',
  },
  {
    id: 'avant-d-attaquer-sur',
    famille: 'Milieu de partie',
    regle: 'principesListe.avant-d-attaquer-sur.regle',
    pourquoi: 'principesListe.avant-d-attaquer-sur.pourquoi',
    sauf: 'principesListe.avant-d-attaquer-sur.sauf',
  },
  {
    id: 'n-echange-pas-sans',
    famille: 'Milieu de partie',
    regle: 'principesListe.n-echange-pas-sans.regle',
    pourquoi: 'principesListe.n-echange-pas-sans.pourquoi',
    sauf: 'principesListe.n-echange-pas-sans.sauf',
  },
  {
    id: 'deux-faiblesses-valent-mieux',
    famille: 'Milieu de partie',
    regle: 'principesListe.deux-faiblesses-valent-mieux.regle',
    pourquoi: 'principesListe.deux-faiblesses-valent-mieux.pourquoi',
    sauf: 'principesListe.deux-faiblesses-valent-mieux.sauf',
  },
  {
    id: 'regarde-le-coup-le',
    famille: 'Milieu de partie',
    regle: 'principesListe.regarde-le-coup-le.regle',
    pourquoi: 'principesListe.regarde-le-coup-le.pourquoi',
    sauf: 'principesListe.regarde-le-coup-le.sauf',
  },
  {
    id: 'quand-tu-as-gagne',
    famille: 'Milieu de partie',
    regle: 'principesListe.quand-tu-as-gagne.regle',
    pourquoi: 'principesListe.quand-tu-as-gagne.pourquoi',
    sauf: 'principesListe.quand-tu-as-gagne.sauf',
  },

  // ── Finale ────────────────────────────────────────────────────────────────
  {
    id: 'active-ton-roi',
    famille: 'Finale',
    regle: 'principesListe.active-ton-roi.regle',
    pourquoi: 'principesListe.active-ton-roi.pourquoi',
    sauf: 'principesListe.active-ton-roi.sauf',
  },
  {
    id: 'la-tour-se-place',
    famille: 'Finale',
    regle: 'principesListe.la-tour-se-place.regle',
    pourquoi: 'principesListe.la-tour-se-place.pourquoi',
    sauf: 'principesListe.la-tour-se-place.sauf',
  },
  {
    id: 'cree-un-pion-passe',
    famille: 'Finale',
    regle: 'principesListe.cree-un-pion-passe.regle',
    pourquoi: 'principesListe.cree-un-pion-passe.pourquoi',
    sauf: 'principesListe.cree-un-pion-passe.sauf',
  },
  {
    id: 'prends-l-opposition',
    famille: 'Finale',
    regle: 'principesListe.prends-l-opposition.regle',
    pourquoi: 'principesListe.prends-l-opposition.pourquoi',
    sauf: 'principesListe.prends-l-opposition.sauf',
  },
  {
    id: 'compte-avant-de-courir',
    famille: 'Finale',
    regle: 'principesListe.compte-avant-de-courir.regle',
    pourquoi: 'principesListe.compte-avant-de-courir.pourquoi',
    sauf: 'principesListe.compte-avant-de-courir.sauf',
  },
  {
    id: 'ne-te-precipite-pas',
    famille: 'Finale',
    regle: 'principesListe.ne-te-precipite-pas.regle',
    pourquoi: 'principesListe.ne-te-precipite-pas.pourquoi',
    sauf: 'principesListe.ne-te-precipite-pas.sauf',
  },
  {
    id: 'cherche-le-pat-quand',
    famille: 'Finale',
    regle: 'principesListe.cherche-le-pat-quand.regle',
    pourquoi: 'principesListe.cherche-le-pat-quand.pourquoi',
    sauf: 'principesListe.cherche-le-pat-quand.sauf',
  },
  {
    id: 'echange-les-pieces-pas',
    famille: 'Finale',
    regle: 'principesListe.echange-les-pieces-pas.regle',
    pourquoi: 'principesListe.echange-les-pieces-pas.pourquoi',
    sauf: 'principesListe.echange-les-pieces-pas.sauf',
  },

  // ── Jeu positionnel ───────────────────────────────────────────────────────
  {
    id: 'un-cavalier-veut-un',
    famille: 'Jeu positionnel',
    regle: 'principesListe.un-cavalier-veut-un.regle',
    pourquoi: 'principesListe.un-cavalier-veut-un.pourquoi',
    sauf: 'principesListe.un-cavalier-veut-un.sauf',
  },
  {
    id: 'un-fou-veut-des',
    famille: 'Jeu positionnel',
    regle: 'principesListe.un-fou-veut-des.regle',
    pourquoi: 'principesListe.un-fou-veut-des.pourquoi',
    sauf: 'principesListe.un-fou-veut-des.sauf',
  },
  {
    id: 'la-paire-de-fous',
    famille: 'Jeu positionnel',
    regle: 'principesListe.la-paire-de-fous.regle',
    pourquoi: 'principesListe.la-paire-de-fous.pourquoi',
    sauf: 'principesListe.la-paire-de-fous.sauf',
  },
  {
    id: 'ne-cree-pas-de',
    famille: 'Jeu positionnel',
    regle: 'principesListe.ne-cree-pas-de.regle',
    pourquoi: 'principesListe.ne-cree-pas-de.pourquoi',
    sauf: 'principesListe.ne-cree-pas-de.sauf',
  },
  {
    id: 'les-cases-faibles-se',
    famille: 'Jeu positionnel',
    regle: 'principesListe.les-cases-faibles-se.regle',
    pourquoi: 'principesListe.les-cases-faibles-se.pourquoi',
    sauf: 'principesListe.les-cases-faibles-se.sauf',
  },
  {
    id: 'empeche-avant-de-faire',
    famille: 'Jeu positionnel',
    regle: 'principesListe.empeche-avant-de-faire.regle',
    pourquoi: 'principesListe.empeche-avant-de-faire.pourquoi',
    sauf: 'principesListe.empeche-avant-de-faire.sauf',
  },
  {
    id: 'le-pion-passe-protege',
    famille: 'Jeu positionnel',
    regle: 'principesListe.le-pion-passe-protege.regle',
    pourquoi: 'principesListe.le-pion-passe-protege.pourquoi',
    sauf: 'principesListe.le-pion-passe-protege.sauf',
  },
  {
    id: 'une-colonne-se-prend',
    famille: 'Jeu positionnel',
    regle: 'principesListe.une-colonne-se-prend.regle',
    pourquoi: 'principesListe.une-colonne-se-prend.pourquoi',
    sauf: 'principesListe.une-colonne-se-prend.sauf',
  },
  {
    id: 'les-pions-ne-reviennent',
    famille: 'Jeu positionnel',
    regle: 'principesListe.les-pions-ne-reviennent.regle',
    pourquoi: 'principesListe.les-pions-ne-reviennent.pourquoi',
    sauf: 'principesListe.les-pions-ne-reviennent.sauf',
  },
  {
    id: 'bloque-le-pion-passe',
    famille: 'Jeu positionnel',
    regle: 'principesListe.bloque-le-pion-passe.regle',
    pourquoi: 'principesListe.bloque-le-pion-passe.pourquoi',
    sauf: 'principesListe.bloque-le-pion-passe.sauf',
  },
  {
    id: 'un-roi-expose-change',
    famille: 'Jeu positionnel',
    regle: 'principesListe.un-roi-expose-change.regle',
    pourquoi: 'principesListe.un-roi-expose-change.pourquoi',
    sauf: 'principesListe.un-roi-expose-change.sauf',
  },
  {
    id: 'les-roques-opposes-veulent',
    famille: 'Jeu positionnel',
    regle: 'principesListe.les-roques-opposes-veulent.regle',
    pourquoi: 'principesListe.les-roques-opposes-veulent.pourquoi',
    sauf: 'principesListe.les-roques-opposes-veulent.sauf',
  },
  {
    id: 'echange-le-fou-qui',
    famille: 'Jeu positionnel',
    regle: 'principesListe.echange-le-fou-qui.regle',
    pourquoi: 'principesListe.echange-le-fou-qui.pourquoi',
    sauf: 'principesListe.echange-le-fou-qui.sauf',
  },
  {
    id: 'quand-tu-ne-sais',
    famille: 'Jeu positionnel',
    regle: 'principesListe.quand-tu-ne-sais.regle',
    pourquoi: 'principesListe.quand-tu-ne-sais.pourquoi',
    sauf: 'principesListe.quand-tu-ne-sais.sauf',
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
