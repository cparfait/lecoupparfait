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
 *    plutôt que de faire échouer l'entraînement en pleine session.
 *
 * Sortie : apps/web/public/data/endgames.json
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
      'Mater un roi seul avec une dame, une tour, ou deux tours. Ce sont les premières techniques à connaître par cœur : sans elles, gagner du matériel ne sert à rien.',
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

  const groups = []
  for (const subcategory of category.subcategories ?? []) {
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
      nameFr: translateConfiguration(subcategory.name),
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
console.log(`  ${families.length} familles · ${families.reduce((a, f) => a + f.groups.length, 0)} configurations`)
console.log(`  objectifs : ${byTarget.checkmate} à gagner · ${byTarget.draw} à tenir en nulle`)
console.log(
  `  difficulté : ${byDifficulty.slice(1).map((n, i) => `${i + 1}★=${n}`).join('  ')}`,
)
console.log(`  → apps/web/public/data/endgames.json (${Math.round(size / 1024)} Ko)`)
