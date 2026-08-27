#!/usr/bin/env node
/**
 * Démarre les deux serveurs de développement, ensemble.
 *
 * `npm run dev --workspaces` les lance **l'un après l'autre** : le premier étant
 * un serveur qui ne rend jamais la main, le second n'était jamais atteint. On
 * les lance donc côte à côte, avec leurs journaux préfixés pour savoir qui
 * parle.
 *
 * Écrit à la main plutôt qu'avec `concurrently` : quarante lignes contre une
 * dépendance de plus, pour une commande que l'on tape dix fois par jour.
 *
 * Usage :  npm run dev
 */

import { spawn, spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline'

const SERVICES = [
  { name: 'web', workspace: '@coupparfait/web', colour: '[36m' },
  { name: 'api', workspace: '@coupparfait/server', colour: '[35m' },
]

const RESET = '[0m'
const GREY = '[90m'
const width = Math.max(...SERVICES.map((service) => service.name.length))

const children = []
let stopping = false

for (const service of SERVICES) {
  // `npm` est un script d'enrobage — `npm.cmd` sous Windows — que Node refuse
  // de lancer directement depuis les versions corrigeant la CVE-2024-27980. Il
  // faut donc un interpréteur de commandes, et la commande passée **en une
  // seule chaîne** : mêler `shell: true` et un tableau d'arguments concatène
  // sans échapper, ce que Node signale à juste titre.
  //
  // Aucune donnée extérieure n'entre ici : les noms de paquets sont écrits en
  // toutes lettres quelques lignes plus haut.
  const child = spawn(`npm run dev -w ${service.workspace}`, {
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
    // Hors Windows, l'enfant dirige son propre groupe de processus : c'est ce
    // qui permet ensuite d'arrêter toute sa descendance d'un seul signal.
    detached: process.platform !== 'win32',
  })

  const label = `${service.colour}${service.name.padEnd(width)}${RESET} ${GREY}│${RESET} `
  for (const stream of [child.stdout, child.stderr]) {
    if (!stream) continue
    createInterface({ input: stream }).on('line', (line) => {
      // Pendant l'arrêt, npm déverse une dizaine de lignes d'erreur pour dire
      // que son enfant a été tué — ce qu'on vient précisément de demander. Les
      // afficher donnerait l'impression que quelque chose a mal tourné.
      if (stopping) return
      console.log(`${label}${line}`)
    })
  }

  child.on('exit', (code) => {
    if (stopping) return
    console.log(`${label}arrêté (code ${code ?? 0})`)
    // Un serveur mort seul laisse une application à moitié fonctionnelle, et
    // des symptômes déroutants. On arrête tout : l'erreur est visible et le
    // redémarrage est explicite.
    stopAll()
    process.exitCode = code ?? 0
  })

  children.push(child)
}

/**
 * Arrête les deux serveurs, **et leur descendance**.
 *
 * `child.kill()` ne suffit pas : chaque service est lancé via un interpréteur
 * de commandes, qui lance `npm`, qui lance le serveur. Tuer le premier maillon
 * laisse les autres en vie — on se retrouve avec des serveurs fantômes qui
 * gardent les ports 3000 et 3001, et un `npm run dev` suivant qui échoue ou
 * bascule discrètement sur le port 3002.
 */
function stopAll() {
  if (stopping) return
  stopping = true

  for (const child of children) {
    if (child.pid === undefined || child.exitCode !== null) continue

    if (process.platform === 'win32') {
      // `/T` étend l'arrêt à toute l'arborescence, `/F` ne demande pas la
      // permission — un serveur de développement n'a rien à sauvegarder.
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    } else {
      // Ailleurs, chaque enfant dirige son propre groupe de processus : le
      // signal négatif l'atteint tout entier.
      try {
        process.kill(-child.pid, 'SIGTERM')
      } catch {
        child.kill('SIGTERM')
      }
    }
  }
}

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) {
  process.on(signal, () => {
    stopAll()
    process.exit(0)
  })
}

// Dernier filet : quelle que soit la façon dont ce script se termine — fin
// normale, exception, fermeture du terminal — aucun serveur ne doit survivre.
process.on('exit', stopAll)
process.on('uncaughtException', (error) => {
  console.error(error)
  stopAll()
  process.exit(1)
})
