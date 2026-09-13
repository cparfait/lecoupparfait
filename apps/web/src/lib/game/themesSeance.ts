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
import type { TranslationKey } from '@/lib/i18n/index.tsx'

export interface ThemeSeance {
  id: string
  /** Le thème, nommé comme on le dirait à voix haute. */
  nom: TranslationKey
  /** L'emoji qui l'identifie dans la liste. */
  icone: string
  /** Ce qu'on cherche à faire pendant la partie. Une phrase, à l'impératif. */
  consigne: TranslationKey
  /** Ce qu'on regarde pour savoir si ça marche. */
  aRegarder: TranslationKey
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
    nom: 'seances.rien-en-prise.nom',
    icone: '🎯',
    consigne: 'seances.rien-en-prise.consigne',
    aRegarder: 'seances.rien-en-prise.aRegarder',
    motifs: ['hangingPiece'],
    paliers: ['regles', 'pieces-en-prise', 'voir-ladversaire'],
  },
  {
    id: 'fourchettes',
    nom: 'seances.fourchettes.nom',
    icone: '🍴',
    consigne: 'seances.fourchettes.consigne',
    aRegarder: 'seances.fourchettes.aRegarder',
    motifs: ['fork'],
    paliers: ['pieces-en-prise', 'voir-ladversaire', 'un-plan'],
  },
  {
    id: 'clouages',
    nom: 'seances.clouages.nom',
    icone: '📌',
    consigne: 'seances.clouages.consigne',
    aRegarder: 'seances.clouages.aRegarder',
    motifs: ['pin', 'skewer'],
    paliers: ['voir-ladversaire', 'un-plan', 'technique'],
  },
  {
    id: 'couloir',
    nom: 'seances.couloir.nom',
    icone: '🚪',
    consigne: 'seances.couloir.consigne',
    aRegarder: 'seances.couloir.aRegarder',
    motifs: ['backRankMate', 'seventhRank'],
    paliers: ['pieces-en-prise', 'voir-ladversaire', 'un-plan'],
  },
  {
    id: 'developpement',
    nom: 'seances.developpement.nom',
    icone: '🚀',
    consigne: 'seances.developpement.consigne',
    aRegarder: 'seances.developpement.aRegarder',
    motifs: ['development', 'centreControl'],
    paliers: ['regles', 'pieces-en-prise', 'voir-ladversaire'],
  },
  {
    id: 'colonnes',
    nom: 'seances.colonnes.nom',
    icone: '🏛️',
    consigne: 'seances.colonnes.consigne',
    aRegarder: 'seances.colonnes.aRegarder',
    motifs: ['openFile', 'semiOpenFile', 'seventhRank'],
    paliers: ['voir-ladversaire', 'un-plan', 'technique'],
  },
  {
    id: 'avant-poste',
    nom: 'seances.avant-poste.nom',
    icone: '🏰',
    consigne: 'seances.avant-poste.consigne',
    aRegarder: 'seances.avant-poste.aRegarder',
    motifs: ['outpost'],
    paliers: ['un-plan', 'technique', 'prophylaxie'],
  },
  {
    id: 'roi-expose',
    nom: 'seances.roi-expose.nom',
    icone: '⚔️',
    consigne: 'seances.roi-expose.consigne',
    aRegarder: 'seances.roi-expose.aRegarder',
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
    nom: 'seances.pion-passe.nom',
    icone: '♟️',
    consigne: 'seances.pion-passe.consigne',
    aRegarder: 'seances.pion-passe.aRegarder',
    motifs: ['passedPawn', 'protectedPassedPawn', 'rookBehindPasser'],
    paliers: ['un-plan', 'technique', 'prophylaxie'],
  },
  {
    id: 'deux-faiblesses',
    nom: 'seances.deux-faiblesses.nom',
    icone: '🪤',
    consigne: 'seances.deux-faiblesses.consigne',
    aRegarder: 'seances.deux-faiblesses.aRegarder',
    motifs: ['isolatedPawn', 'doubledPawns', 'backwardPawn'],
    paliers: ['technique', 'prophylaxie'],
  },
]
