#!/usr/bin/env node
/**
 * Compile la base de finales.
 *
 * Source : supertorpe/chessendgametraining (GPL-3.0)
 *   3 571 positions classées en 8 familles et 132 configurations de matériel,
 *   chacune avec son objectif — mater, ou tenir la nulle — et le nombre de
 *   coups nécessaires.
 *
 * Ce que ce script ajoute :
 *  - **la traduction française** des noms de familles et de configurations ;
 *  - **un niveau de difficulté** déduit du nombre de coups au mat et du
 *    matériel restant, pour proposer une progression plutôt qu'une liste ;
 *  - **une vérification de chaque position** : toute FEN illégale est écartée
 *    plutôt que de faire échouer l'entraînement en pleine session ;
 *  - **deux configurations qui manquaient à la base amont** : les deux fous et
 *    le fou et cavalier contre roi seul, sans quoi « Mats élémentaires » n'en
 *    proposait que trois sur cinq. Voir `SUPPLEMENTS`.
 *
 * Sortie : apps/web/public/data/endgames.json — 3 597 positions, 8 familles,
 * 134 configurations.
 *
 * Usage :  node scripts/build-endgames.mjs
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Chess } from 'chess.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const sourcePath = join(root, 'data', 'endgames', 'source.json')

if (!existsSync(sourcePath)) {
  console.error(`✗ Fichier source introuvable : ${sourcePath}`)
  console.error('  Télécharge-le depuis :')
  console.error(
    '  https://raw.githubusercontent.com/supertorpe/chessendgametraining/master/code/src/static/endgamedatabase.json',
  )
  process.exit(1)
}

/** Familles de finales, traduites et décrites. */
const FAMILIES = {
  Basic: {
    fr: 'Mats élémentaires',
    blurb:
      'Mater un roi seul : à la dame, à la tour, à deux tours, aux deux fous, et enfin au fou et cavalier — le seul qui demande une vraie méthode. Sans ces techniques, gagner du matériel ne sert à rien.',
    icon: '👑',
    order: 1,
  },
  Pawn: {
    fr: 'Finales de pions',
    blurb:
      'Rois et pions seuls. Les plus simples en apparence et les plus impitoyables : un seul coup imprécis transforme un gain en nulle. C’est là qu’on apprend l’opposition et la règle du carré.',
    icon: '♙',
    order: 2,
  },
  Bishop: {
    fr: 'Finales de fous',
    blurb:
      'Le fou est fort en position ouverte mais ne contrôle que la moitié des cases. D’où le piège du fou de mauvaise couleur, qui annule des finales pourtant gagnées d’un pion.',
    icon: '♝',
    order: 3,
  },
  Knight: {
    fr: 'Finales de cavaliers',
    blurb:
      'Le cavalier est lent : il lui faut plusieurs coups pour traverser l’échiquier. Ces finales se jouent donc sur le placement du roi bien plus que sur celui du cavalier.',
    icon: '♞',
    order: 4,
  },
  'Knight-Bishop': {
    fr: 'Fou contre cavalier',
    blurb:
      'La confrontation classique. Position ouverte et pions sur les deux ailes : le fou domine. Position fermée et pions bloqués : le cavalier prend l’avantage.',
    icon: '⚔️',
    order: 5,
  },
  'Rook-Pawn': {
    fr: 'Finales de tours et pions',
    blurb:
      'De loin les plus fréquentes de toute la pratique. Lucena, Philidor, la tour derrière le pion passé : quelques positions clés suffisent à sauver ou gagner des centaines de parties.',
    icon: '♜',
    order: 6,
  },
  'Rook-Pieces': {
    fr: 'Tour contre pièces',
    blurb:
      'Tour contre fou, contre cavalier, contre deux pièces légères. Des rapports de force déséquilibrés où le compte de points ne dit presque rien.',
    icon: '⚖️',
    order: 7,
  },
  Queen: {
    fr: 'Finales de dames',
    blurb:
      'La dame donne échec sans arrêt : ces finales se jouent au fil de l’épée, entre gain forcé et échec perpétuel.',
    icon: '♛',
    order: 8,
  },
}

/**
 * Les deux mats élémentaires que la base amont ne contient pas.
 *
 * « Mats élémentaires » s'arrêtait à la dame, la tour et les deux tours. Le
 * canon en compte cinq : il manquait **les deux fous** et **le fou et
 * cavalier**. L'annonce de la famille promettait pourtant les premières
 * techniques à connaître par cœur, et deux des cinq n'étaient nulle part —
 * ni ici, ni dans les leçons.
 *
 * Ces positions sont écrites à la main, et leur `mateIn` **n'est pas estimé** :
 * chacun vient des tables de finales Syzygy, interrogées une fois via le
 * service public de Lichess — le même que `apps/server/src/engine/tablebase.ts`
 * utilise pour l'analyse. Les valeurs sont figées ici pour que la compilation
 * reste hors ligne et déterministe, comme le reste du script.
 *
 * La conversion, vérifiée sur trois positions amont dont le `mateIn` était
 * connu : les tables renvoient une distance en demi-coups qui compte le coup
 * de mat, d'où `mateIn = (dtm + 1) / 2`. Un mateIn de 6 correspond à dtm 11,
 * 8 à 15, 9 à 17.
 *
 * Le classement par difficulté est ensuite celui de tout le monde, calculé par
 * `difficultyOf`. Les deux fous vont de 1 à 3 étoiles, le fou et cavalier de 1
 * à 4 : c'est la seule technique élémentaire qui dépasse vingt coups, et elle
 * se joue sous la menace de la règle des cinquante coups. Les positions les
 * plus dures partent d'un roi noir au centre et d'un cavalier mal placé.
 */
const SUPPLEMENTS = {
  Basic: [
    {
      name: 'Two Bishops',
      nameFr: 'deux fous',
      // dtm relevés : 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31.
      games: [
        { fen: '8/8/8/8/8/3BB3/4K3/7k w - - 0 1', target: 'checkmate', mateIn: 4 },
        { fen: '8/8/8/3BB3/4K3/8/8/7k w - - 0 1', target: 'checkmate', mateIn: 5 },
        { fen: '8/8/8/8/8/8/2BB4/k3K3 w - - 0 1', target: 'checkmate', mateIn: 6 },
        { fen: '8/8/8/7k/8/3BB3/4K3/8 w - - 0 1', target: 'checkmate', mateIn: 7 },
        { fen: '8/8/8/8/7k/8/2BB4/4K3 w - - 0 1', target: 'checkmate', mateIn: 8 },
        { fen: '3k4/8/8/3BB3/4K3/8/8/8 w - - 0 1', target: 'checkmate', mateIn: 9 },
        { fen: '7k/8/8/8/8/8/2BB4/4K3 w - - 0 1', target: 'checkmate', mateIn: 10 },
        { fen: '6k1/8/8/8/8/3BB3/4K3/8 w - - 0 1', target: 'checkmate', mateIn: 11 },
        { fen: '8/1k6/8/8/8/3BB3/4K3/8 w - - 0 1', target: 'checkmate', mateIn: 12 },
        { fen: '8/8/2k5/8/2BB4/4K3/8/8 w - - 0 1', target: 'checkmate', mateIn: 13 },
        { fen: '8/8/8/3k4/8/3BB3/4K3/8 w - - 0 1', target: 'checkmate', mateIn: 14 },
        { fen: '8/8/8/4k3/8/3BB3/4K3/8 w - - 0 1', target: 'checkmate', mateIn: 15 },
        { fen: '8/8/8/4k3/8/8/2BB4/4K3 w - - 0 1', target: 'checkmate', mateIn: 16 },
      ],
    },
    {
      name: 'Bishop and Knight',
      nameFr: 'fou et cavalier',
      // dtm relevés : 11, 13, 15, 17, 19, 23, 25, 27, 31, 33, 35, 39, 41, 45,
      // 53, 57.
      games: [
        { fen: '8/8/8/8/8/5N2/4K3/1kB5 w - - 0 1', target: 'checkmate', mateIn: 6 },
        { fen: '8/8/8/8/8/8/3BN3/k3K3 w - - 0 1', target: 'checkmate', mateIn: 7 },
        { fen: '8/8/8/8/8/3B1N2/4K3/7k w - - 0 1', target: 'checkmate', mateIn: 8 },
        { fen: '8/8/8/8/2B1N3/3K4/8/7k w - - 0 1', target: 'checkmate', mateIn: 9 },
        { fen: '7k/8/8/3KN3/3B4/8/8/8 w - - 0 1', target: 'checkmate', mateIn: 10 },
        { fen: '8/8/8/3KN3/3B4/8/8/1k6 w - - 0 1', target: 'checkmate', mateIn: 12 },
        { fen: '8/8/8/8/k7/8/3BN3/4K3 w - - 0 1', target: 'checkmate', mateIn: 13 },
        { fen: '7k/8/8/8/5BN1/5K2/8/8 w - - 0 1', target: 'checkmate', mateIn: 14 },
        { fen: 'k7/8/8/8/8/1BN5/2K5/8 w - - 0 1', target: 'checkmate', mateIn: 16 },
        { fen: '8/8/8/7k/5BN1/5K2/8/8 w - - 0 1', target: 'checkmate', mateIn: 17 },
        { fen: '4k3/8/8/3KN3/3B4/8/8/8 w - - 0 1', target: 'checkmate', mateIn: 18 },
        { fen: '4k3/8/8/8/5BN1/5K2/8/8 w - - 0 1', target: 'checkmate', mateIn: 20 },
        { fen: '3k4/8/8/8/2B1N3/3K4/8/8 w - - 0 1', target: 'checkmate', mateIn: 21 },
        { fen: 'k7/8/8/8/8/3B1N2/4K3/8 w - - 0 1', target: 'checkmate', mateIn: 23 },
        { fen: '4k3/8/8/8/8/5N2/4K3/2B5 w - - 0 1', target: 'checkmate', mateIn: 27 },
        { fen: '8/8/8/4k3/8/8/3BN3/4K3 w - - 0 1', target: 'checkmate', mateIn: 29 },
      ],
    },
  ],
}

/** Traduction mot à mot des configurations de matériel. */
const TERMS = {
  Queen: 'dame',
  Rook: 'tour',
  Bishop: 'fou',
  Knight: 'cavalier',
  Pawn: 'pion',
  Pawns: 'pions',
  Rooks: 'tours',
  Bishops: 'fous',
  Knights: 'cavaliers',
  King: 'roi',
  Two: 'deux',
  Three: 'trois',
  Four: 'quatre',
  Five: 'cinq',
  vs: 'contre',
}

/** « Two Pawns vs Rook Bishop » → « deux pions contre tour fou ». */
function translateConfiguration(name) {
  return name
    .split(/\s+/)
    .map((word) => TERMS[word] ?? word.toLowerCase())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Difficulté d'une position, de 1 à 5.
 *
 * Le nombre de coups au mat est le meilleur indicateur disponible : un mat en 8
 * s'apprend en une séance, un mat en 40 demande une vraie technique. Les
 * positions à tenir en nulle sont d'office considérées comme difficiles — il
 * faut trouver *tous* les coups justes, pas seulement un.
 */
function difficultyOf(position, pieceCount) {
  if (position.target === 'draw') return pieceCount <= 5 ? 3 : 4

  const mateIn = position.mateIn ?? 0
  if (mateIn <= 6) return 1
  if (mateIn <= 12) return 2
  if (mateIn <= 20) return 3
  if (mateIn <= 32) return 4
  return 5
}

function countPieces(fen) {
  const placement = fen.split(' ')[0] ?? ''
  let count = 0
  for (const character of placement) {
    if (/[pnbrqkPNBRQK]/.test(character)) count++
  }
  return count
}

// ─────────────────────────────────────────────────────────────────────────────

const source = JSON.parse(readFileSync(sourcePath, 'utf8'))
const families = []
let kept = 0
let rejected = 0

for (const category of source.categories ?? []) {
  const meta = FAMILIES[category.name]
  if (!meta) {
    console.warn(`  ! famille inconnue, ignorée : ${category.name}`)
    continue
  }

  // Les configurations ajoutées à la main passent par la même boucle que
  // celles de la base amont : même vérification de légalité, même calcul de
  // difficulté, même tri. Les traiter à part aurait produit des positions
  // notées autrement que leurs voisines.
  const subcategories = [...(category.subcategories ?? []), ...(SUPPLEMENTS[category.name] ?? [])]

  const groups = []
  for (const subcategory of subcategories) {
    const positions = []

    for (const game of subcategory.games ?? []) {
      // Vérification : une FEN illégale casserait l'entraînement en pleine
      // session, autant l'écarter maintenant.
      let board
      try {
        board = new Chess(game.fen)
      } catch {
        rejected++
        continue
      }
      if (board.isGameOver()) {
        rejected++
        continue
      }

      const pieceCount = countPieces(game.fen)
      positions.push({
        fen: game.fen,
        target: game.target,
        mateIn: game.mateIn ?? null,
        pieces: pieceCount,
        difficulty: difficultyOf(game, pieceCount),
        // À sept pièces ou moins, les tables de finales donnent la réponse
        // parfaite : l'entraînement peut valider chaque coup avec certitude.
        tablebase: pieceCount <= 7,
      })
      kept++
    }

    if (positions.length === 0) continue

    positions.sort((a, b) => a.difficulty - b.difficulty || (a.mateIn ?? 99) - (b.mateIn ?? 99))

    groups.push({
      id: slug(subcategory.name),
      name: subcategory.name,
      // La traduction mot à mot suffit pour les cent trente-deux
      // configurations amont, dont les noms sont des listes de pièces. Elle
      // achoppe sur les nôtres : « Bishop and Knight » donnerait « fou and
      // cavalier ». D'où le nom français facultatif, porté par la
      // configuration elle-même.
      nameFr: subcategory.nameFr ?? translateConfiguration(subcategory.name),
      positions,
    })
  }

  families.push({
    id: slug(category.name),
    name: category.name,
    nameFr: meta.fr,
    blurb: meta.blurb,
    icon: meta.icon,
    order: meta.order,
    groups,
  })
}

families.sort((a, b) => a.order - b.order)

function slug(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const output = {
  format: 'coupparfait-endgames-v1',
  source: 'supertorpe/chessendgametraining (GPL-3.0)',
  families,
}

const targetDir = join(root, 'apps', 'web', 'public', 'data')
mkdirSync(targetDir, { recursive: true })
writeFileSync(join(targetDir, 'endgames.json'), JSON.stringify(output))

const size = Buffer.byteLength(JSON.stringify(output))
const byDifficulty = [0, 0, 0, 0, 0, 0]
const byTarget = { checkmate: 0, draw: 0 }
for (const family of families) {
  for (const group of family.groups) {
    for (const position of group.positions) {
      byDifficulty[position.difficulty]++
      byTarget[position.target]++
    }
  }
}

console.log(`✓ ${kept} positions de finale compilées`)
if (rejected) console.log(`  ${rejected} positions écartées (illégales ou déjà terminées)`)
console.log(
  `  ${families.length} familles · ${families.reduce((a, f) => a + f.groups.length, 0)} configurations`,
)
console.log(`  objectifs : ${byTarget.checkmate} à gagner · ${byTarget.draw} à tenir en nulle`)
console.log(
  `  difficulté : ${byDifficulty
    .slice(1)
    .map((n, i) => `${i + 1}★=${n}`)
    .join('  ')}`,
)
console.log(`  → apps/web/public/data/endgames.json (${Math.round(size / 1024)} Ko)`)
