#!/usr/bin/env node
/**
 * Un moteur UCI qui répond à la poignée de main et à rien d'autre.
 *
 * Il existe pour reproduire la seule panne que la réserve ne savait pas voir :
 * un Stockfish qui démarre, s'annonce, se déclare prêt, puis n'envoie jamais
 * `bestmove`. Le vrai binaire fait ça quand il est suspendu par le système, ou
 * bloqué sur une lecture de réseau NNUE. Vu de la réserve, le processus est
 * parfaitement sain : il est simplement occupé, pour toujours.
 *
 * Il se lance par `process.execPath` avec ce fichier en argument, et non par
 * son shebang : c'est la seule forme qui marche aussi sous Windows.
 *
 *   node faux-stockfish.mjs muet     ne rend jamais `bestmove`, mais obéit à `stop`
 *   node faux-stockfish.mjs sourd    n'obéit pas non plus à `stop` — il faut le tuer
 *   node faux-stockfish.mjs bavard   répond aussitôt : c'est le témoin
 *
 * Le mode passe par un argument et non par l'environnement : deux moteurs de
 * modes différents peuvent alors tourner dans le même processus de test.
 */

import { createInterface } from 'node:readline'

const mode = process.argv[2] ?? 'muet'
const muet = mode !== 'bavard'
const sourdAuStop = mode === 'sourd'

const dire = (ligne) => process.stdout.write(`${ligne}\n`)

createInterface({ input: process.stdin }).on('line', (brut) => {
  const ligne = brut.trim()

  if (ligne === 'uci') {
    dire('id name FauxStockfish')
    dire('id author Le Coup Parfait')
    dire('uciok')
    return
  }
  if (ligne === 'isready') {
    dire('readyok')
    return
  }
  if (ligne === 'quit') {
    process.exit(0)
  }
  if (ligne.startsWith('go')) {
    // Un peu d'`info` avant de se taire : sans elle, on testerait un moteur
    // mort plutôt qu'un moteur qui travaille et ne rend jamais son travail.
    dire('info depth 1 seldepth 1 multipv 1 score cp 21 nodes 20 pv e2e4')
    if (!muet) dire('bestmove e2e4')
    return
  }
  if (ligne === 'stop' && !sourdAuStop && muet) {
    dire('bestmove e2e4')
  }
})
