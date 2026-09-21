#!/usr/bin/env node
/**
 * Le moteur WebAssembly, parlant UCI sur stdio.
 *
 * Le paquet `stockfish` s'adresse au navigateur : il expose `sendCommand` et
 * écrit ses réponses là où Emscripten les envoie, sans qu'on puisse détourner
 * `print` après coup — essayé, zéro ligne capturée. Ce fichier retourne donc le
 * problème : il laisse le moteur écrire sur la sortie standard, et se contente
 * de lui passer ce qui arrive sur l'entrée. On obtient un moteur UCI ordinaire,
 * pilotable comme le binaire natif.
 *
 * À quoi ça sert : mesurer les adversaires artificiels sur **le moteur que les
 * joueurs ont vraiment**. Les bots tournent dans le navigateur, sur la variante
 * `lite` et son réseau réduit ; le binaire natif du serveur porte le réseau
 * complet et ne joue pas pareil. Mesurer l'un pour conclure sur l'autre serait
 * une erreur de méthode.
 *
 * Usage :  node scripts/moteur-wasm.mjs [lite-single|lite]
 */

import { createRequire } from 'node:module'
import { createInterface } from 'node:readline'
import { resolve } from 'node:path'

const require = createRequire(import.meta.url)
const initEngine = require('stockfish')

const variante = process.argv[2] ?? 'lite-single'
const chemin = resolve(
  process.cwd(),
  'node_modules',
  'stockfish',
  'bin',
  `stockfish-19-${variante}.js`,
)

const moteur = await initEngine(chemin)

/*
  Le moteur écrit lui-même sur stdout. On ne relaie que l'entrée, et l'on quitte
  sur `quit` : sans ça le processus reste en vie, le module WebAssembly n'ayant
  aucune raison de se terminer tout seul.
*/
const entree = createInterface({ input: process.stdin })

for await (const ligne of entree) {
  const commande = ligne.trim()
  if (!commande) continue
  if (commande === 'quit') break
  moteur.sendCommand(commande)
}

process.exit(0)
