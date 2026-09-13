/**
 * Ce que les mots donnent à voir.
 *
 * Le glossaire définissait par des phrases, et rien d'autre : « le roi fait
 * deux pas vers une tour, qui saute par-dessus lui » demande de reconstituer un
 * échiquier de tête, ce qui est précisément l'exercice qu'un débutant ne sait
 * pas encore faire. Or ces mots-là désignent des positions ; une position se
 * montre.
 *
 * Chaque entrée porte donc, quand cela a du sens, une position et parfois un
 * coup à jouer dessus. Le coup compte autant que la position : le roque, la
 * prise en passant et la promotion ne sont pas des configurations mais des
 * *gestes*, et on ne les comprend qu'en les voyant se produire.
 *
 * Toutes ne sont pas illustrées, et ce n'est pas un manque à combler :
 * « Elo », « Précision » ou « Cadence » ne se dessinent pas sur soixante-quatre
 * cases, et une position inventée pour la forme apprendrait de travers.
 *
 * Les positions sont volontairement **nues** — deux rois, ce qu'il faut voir,
 * rien de plus. Une position de partie réelle porterait vingt pièces dont
 * dix-huit sans rapport avec le mot expliqué.
 *
 * Vérifiées une par une : `scripts/check-glossaire.mjs` charge chaque FEN et
 * rejoue chaque coup. Une position illisible ou un coup illégal échoue la
 * commande de test.
 */

import type { TranslationKey } from '@/lib/i18n/index.tsx'

export interface PositionIllustree {
  /** Position de départ. */
  fen: string
  /**
   * Les coups à jouer dessus, en notation algébrique.
   *
   * Vide pour ce qui se voit sans bouger — une structure de pions, un pat.
   */
  coups?: string[]
  /** Depuis quel camp on regarde. Les Blancs par défaut. */
  orientation?: 'w' | 'b'
  /** Cases mises en avant, pour ce qui n'est pas un coup. */
  cases?: string[]
  /** Une phrase sous l'échiquier : ce qu'il faut regarder, par clé. */
  legende: TranslationKey
}

/**
 * Indexées par le nom exact du terme, dans `glossaire.ts` ou dans les motifs du
 * cœur. Un nom qui n'existe pas ne casse rien : l'entrée n'est simplement
 * jamais atteinte.
 */
export const POSITIONS_DU_GLOSSAIRE: Record<string, PositionIllustree> = {
  roque: {
    fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
    coups: ['O-O'],
    legende: 'positions.roque.legende',
  },
  'prise-en-passant': {
    fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2',
    coups: ['exd6'],
    legende: 'positions.prise-en-passant.legende',
  },
  promotion: {
    fen: '4k3/P7/8/8/8/8/8/4K3 w - - 0 1',
    coups: ['a8=Q'],
    legende: 'positions.promotion.legende',
  },
  'echec-et-mat': {
    fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
    coups: ['Ra8#'],
    legende: 'positions.echec-et-mat.legende',
  },
  pat: {
    fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',
    cases: ['g8', 'g7', 'h7'],
    legende: 'positions.pat.legende',
  },
  'pion-passe': {
    fen: '4k3/pp6/8/3P4/8/8/8/4K3 w - - 0 1',
    cases: ['d5', 'd6', 'd7', 'd8'],
    legende: 'positions.pion-passe.legende',
  },
  'pions-doubles': {
    fen: '4k3/8/8/8/8/2P5/2P5/4K3 w - - 0 1',
    cases: ['c2', 'c3'],
    legende: 'positions.pions-doubles.legende',
  },
  'pion-isole': {
    fen: '4k3/8/8/8/3P4/8/PP4PP/4K3 w - - 0 1',
    cases: ['d4'],
    legende: 'positions.pion-isole.legende',
  },
  'mauvais-fou': {
    fen: '4k3/8/8/8/2P1P3/3B4/8/4K3 w - - 0 1',
    cases: ['c4', 'e4'],
    legende: 'positions.mauvais-fou.legende',
  },
  zugzwang: {
    fen: '8/8/8/4k3/8/4K3/4P3/8 b - - 0 1',
    legende: 'positions.zugzwang.legende',
  },
  'paire-de-fous': {
    fen: '4k3/8/8/8/8/8/8/2B1KB2 w - - 0 1',
    cases: ['c1', 'f1'],
    legende: 'positions.paire-de-fous.legende',
  },

  // ── Les motifs tactiques ────────────────────────────────────────────────
  //
  // Ce sont les mots que le coach emploie dans ses explications, et ceux des
  // filtres de puzzles. Ils désignent tous une géométrie : une fourchette est
  // une forme avant d'être une idée, et une phrase la décrit d'autant plus mal
  // qu'elle est simple à voir.
  fork: {
    fen: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1',
    coups: ['Nc7+'],
    legende: 'positions.fork.legende',
  },
  pin: {
    fen: '4k3/8/4n3/8/8/8/8/R5K1 w - - 0 1',
    coups: ['Re1'],
    legende: 'positions.pin.legende',
  },
  skewer: {
    fen: '7q/6k1/8/8/8/8/8/B5K1 w - - 0 1',
    coups: ['Bb2+', 'Kf7', 'Bxh8'],
    legende: 'positions.skewer.legende',
  },
  discoveredAttack: {
    fen: '4k3/1q6/8/8/4N3/8/8/4R1K1 w - - 0 1',
    coups: ['Nc5'],
    legende: 'positions.discoveredAttack.legende',
  },
  doubleCheck: {
    fen: '4k3/8/8/8/4N3/8/8/4R1K1 w - - 0 1',
    coups: ['Nf6+'],
    legende: 'positions.doubleCheck.legende',
  },
  smotheredMate: {
    fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1',
    coups: ['Nf7#'],
    legende: 'positions.smotheredMate.legende',
  },
  backRankMate: {
    fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
    coups: ['Ra8#'],
    legende: 'positions.backRankMate.legende',
  },
  mateIn1: {
    fen: '6k1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1',
    coups: ['Rb8#'],
    legende: 'positions.mateIn1.legende',
  },
  removingTheDefender: {
    fen: '3r2k1/1n3ppp/8/8/8/8/5PPP/3RR1K1 w - - 0 1',
    coups: ['Rxd8+', 'Nxd8', 'Re8#'],
    legende: 'positions.removingTheDefender.legende',
  },
  hangingPiece: {
    fen: '4k3/8/8/3n4/8/1B6/8/4K3 w - - 0 1',
    cases: ['d5'],
    legende: 'positions.hangingPiece.legende',
  },
  xRayAttack: {
    fen: '3rk3/8/8/8/8/8/8/3RK3 w - - 0 1',
    cases: ['d1', 'd8'],
    legende: 'positions.xRayAttack.legende',
  },
  underPromotion: {
    fen: '5rk1/6P1/8/8/8/8/8/6K1 w - - 0 1',
    coups: ['gxf8=N+'],
    legende: 'positions.underPromotion.legende',
  },
  opposition: {
    fen: '4k3/8/4K3/8/8/8/8/8 b - - 0 1',
    cases: ['e7'],
    legende: 'positions.opposition.legende',
  },
  fianchetto: {
    fen: '4k3/8/8/8/8/6P1/5PBP/6K1 w - - 0 1',
    cases: ['g2'],
    legende: 'positions.fianchetto.legende',
  },
  outpost: {
    fen: '4k3/8/3N4/4P3/8/8/8/4K3 w - - 0 1',
    cases: ['d6', 'e5'],
    legende: 'positions.outpost.legende',
  },
  openFile: {
    fen: '4k3/pp3ppp/8/8/8/8/PP3PPP/3RK3 w - - 0 1',
    cases: ['d1'],
    legende: 'positions.openFile.legende',
  },
  seventhRank: {
    fen: '4k3/1p3ppp/8/8/8/8/8/R5K1 w - - 0 1',
    coups: ['Ra7'],
    legende: 'positions.seventhRank.legende',
  },
  protectedPassedPawn: {
    fen: '4k3/8/8/2PP4/2P5/8/8/4K3 w - - 0 1',
    cases: ['d5', 'c4'],
    legende: 'positions.protectedPassedPawn.legende',
  },
  rookBehindPasser: {
    fen: '4k3/8/8/3P4/8/8/8/3RK3 w - - 0 1',
    cases: ['d1', 'd5'],
    legende: 'positions.rookBehindPasser.legende',
  },
  backwardPawn: {
    fen: '4k3/8/8/8/1P1P4/2P5/8/4K3 w - - 0 1',
    cases: ['c3'],
    legende: 'positions.backwardPawn.legende',
  },
}
