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
 * ── Pourquoi on peut lui passer un chemin ───────────────────────────────────
 *
 * Mesurer l'échelle des adversaires ne dit rien tant qu'on n'a qu'un point : un
 * désétalonnage constaté aujourd'hui peut dater d'hier. Comparer deux versions
 * du moteur demande d'en charger une qui n'est pas celle du dépôt — installée
 * de côté, sans toucher aux dépendances. D'où l'argument : une variante par son
 * nom court pour l'usage courant, un chemin complet pour la comparaison.
 *
 * Usage :
 *   node scripts/moteur-wasm.mjs                        # lite-single du dépôt
 *   node scripts/moteur-wasm.mjs lite                   # autre variante
 *   node scripts/moteur-wasm.mjs /chemin/stockfish-18-lite-single.js
 */

import { createRequire } from 'node:module'
import { createInterface } from 'node:readline'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const initEngine = require('stockfish')

const argument = process.argv[2] ?? 'lite-single'

/**
 * Le fichier à charger.
 *
 * Un chemin est pris tel quel. Un nom court est cherché dans le paquet du
 * dépôt, dont on **lit** le numéro de version au lieu de l'écrire : le jour où
 * `stockfish` livre du 20, ce fichier n'a pas à le savoir.
 */
function trouverMoteur(valeur) {
  if (isAbsolute(valeur) || valeur.includes('/') || valeur.includes('\\')) {
    const chemin = resolve(process.cwd(), valeur)
    if (!existsSync(chemin)) {
      console.error(`✗ Moteur introuvable : ${chemin}`)
      process.exit(1)
    }
    return chemin
  }

  const dossier = resolve(process.cwd(), 'node_modules', 'stockfish', 'bin')
  const motif = new RegExp(`^stockfish-(\\d+)-${valeur}\\.js$`)
  const trouve = readdirSync(dossier).find((nom) => motif.test(nom))
  if (!trouve) {
    console.error(`✗ Variante introuvable : stockfish-<version>-${valeur}.js`)
    process.exit(1)
  }
  return join(dossier, trouve)
}

const chemin = trouverMoteur(argument)

/*
  Le paquet `stockfish` résout son `.wasm` à côté du `.js` qu'on lui donne, mais
  il faut que `require` sache d'où charger le module. Un moteur posé hors du
  dépôt ne se trouve pas depuis ici : on l'exige par son chemin absolu, ce que
  `initEngine` accepte.
*/
if (!existsSync(chemin.replace(/\.js$/, '.wasm'))) {
  console.error(`✗ Le fichier .wasm manque à côté de ${dirname(chemin)}`)
  process.exit(1)
}

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

/*
  `sendCommand` passe par `setImmediate`, et le moteur écrit depuis son propre
  ordonnancement : quitter au premier `quit` coupe la parole à ce qui n'est pas
  encore sorti. Invisible tant qu'une commande longue précède — un `go` laisse
  tout le temps de vider —, flagrant sur `uci` suivi de `quit`, qui ne rendait
  alors pas une ligne. On laisse un court délai plutôt que de perdre la fin.
*/
await new Promise((resolve) => setTimeout(resolve, 300))
process.exit(0)
