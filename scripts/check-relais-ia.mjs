#!/usr/bin/env node
/**
 * Vérifie que le relais d'IA ne peut plus être retourné vers le réseau interne.
 *
 * Trois trous, trois familles de contrôles :
 *
 *  1. **Les formes d'adresse.** `estAdresseLocale` testait la chaîne brute par
 *     motifs : `::7f00:1`, `::127.0.0.1`, `64:ff9b::a9fe:a9fe` désignent la
 *     machine ou les métadonnées cloud, et passaient.
 *  2. **La redirection.** `fetch` suivait les `3xx` : un serveur public contrôlé
 *     répondait `302 → http://postgres:5432`, le relais y allait. `relayer()`
 *     doit rendre la `302` telle quelle.
 *  3. **Le rebinding.** La résolution DNS de la connexion doit elle-même
 *     refuser une adresse privée — ici `localhost`, qui résout en bouclage.
 *
 * Usage :  node --experimental-strip-types scripts/check-relais-ia.mjs
 */

import { createServer } from 'node:http'

const { estAdresseLocale } = await import('../apps/web/src/lib/ia/hote.ts')
const { relayer, CibleRefusee } = await import('../apps/web/src/lib/ia/relais.ts')

let checks = 0
let failures = 0

function check(label, condition, detail = '') {
  checks++
  if (condition) {
    console.log(`  ✓ ${label}`)
    return
  }
  failures++
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
}

console.log('\n🔒  Adresses privées, sous toutes leurs formes\n')

const privees = [
  '127.0.0.1',
  '10.1.2.3',
  '169.254.169.254',
  '::1',
  '::',
  '[::1]',
  '0:0:0:0:0:0:0:1',
  'fe80::1%eth0',
  'fd12:3456::1',
  'ff02::1',
  '::127.0.0.1', // compatible IPv4
  '::7f00:1', // la même, en hexadécimal — c'est ainsi que `new URL` la réécrit
  '::ffff:127.0.0.1',
  '::ffff:7f00:1',
  '::ffff:a9fe:a9fe', // 169.254.169.254, les métadonnées cloud
  '::ffff:0:10.0.0.1', // IPv4 traduite
  '64:ff9b::169.254.169.254', // NAT64
  '64:ff9b::a9fe:a9fe',
  '64:ff9b:1::1',
  '2002:7f00:1::', // 6to4 vers 127.0.0.1
  '2002:c0a8:101::1', // 6to4 vers 192.168.1.1
  '2001:0:4136:e378:8000:63bf:80ff:fffe', // Teredo vers 127.0.0.1
]
for (const adresse of privees) check(`${adresse} est privée`, estAdresseLocale(adresse) === true)

const publiques = [
  '8.8.8.8',
  '1.1.1.1',
  '2606:4700:4700::1111',
  '::ffff:8.8.8.8',
  '64:ff9b::8.8.8.8',
  '2002:808:808::1',
  'api.openai.com',
  'fe7f::1',
]
for (const adresse of publiques)
  check(`${adresse} n’est pas privée`, estAdresseLocale(adresse) === false)

check(
  '`new URL` réécrit bien ::127.0.0.1 en ::7f00:1 — d’où le décodage',
  new URL('http://[::127.0.0.1]/').hostname === '[::7f00:1]',
)

console.log('\n🔒  Redirections et rebinding\n')

// Un serveur qui redirige vers une adresse interne, sauf sur `/ok` où il
// répond normalement — pour s'assurer que le relais relaie encore.
const serveur = createServer((requete, reponse) => {
  if (requete.url === '/ok') {
    let recu = ''
    requete.on('data', (morceau) => (recu += morceau))
    requete.on('end', () => {
      reponse.writeHead(200, { 'Content-Type': 'application/json' })
      reponse.end(JSON.stringify({ recu, type: requete.headers['content-type'] }))
    })
    return
  }
  reponse.writeHead(302, { Location: 'http://169.254.169.254/latest/meta-data/' })
  reponse.end('ailleurs')
})
await new Promise((resoudre) => serveur.listen(0, '127.0.0.1', resoudre))
const { port } = serveur.address()

try {
  const signal = AbortSignal.timeout(5_000)
  // Adresse littérale : pas de résolution, donc le contrôle DNS ne s'applique
  // pas — c'est `verifierCible` qui écarte ce cas en production. On s'en sert
  // ici pour observer la redirection seule.
  const reponse = await relayer(`http://127.0.0.1:${port}/v1/models`, {
    method: 'GET',
    entetes: [],
    signal,
  })
  check(
    'une 302 revient telle quelle, sans être suivie',
    reponse.status === 302,
    `${reponse.status}`,
  )
  await reponse.body?.cancel()
} catch (erreur) {
  check('une 302 revient telle quelle, sans être suivie', false, String(erreur))
}

try {
  const reponse = await relayer(`http://127.0.0.1:${port}/ok`, {
    method: 'POST',
    entetes: [['Content-Type', 'application/json']],
    corps: '{"question":"e4 ?"}',
    signal: AbortSignal.timeout(5_000),
  })
  const lu = await reponse.json()
  check(
    'une réponse ordinaire est relayée, corps et en-têtes compris',
    reponse.ok && lu.recu === '{"question":"e4 ?"}' && lu.type === 'application/json',
    JSON.stringify(lu),
  )
} catch (erreur) {
  check('une réponse ordinaire est relayée, corps et en-têtes compris', false, String(erreur))
}

try {
  await relayer(`http://localhost:${port}/`, {
    method: 'GET',
    entetes: [],
    signal: AbortSignal.timeout(5_000),
  })
  check('un nom qui résout en bouclage est refusé à la connexion', false, 'la requête est partie')
} catch (erreur) {
  check(
    'un nom qui résout en bouclage est refusé à la connexion',
    erreur instanceof CibleRefusee,
    String(erreur),
  )
}

serveur.close()

console.log(
  failures === 0
    ? `\n✓ ${checks} vérifications passées\n`
    : `\n✗ ${failures} échec(s) sur ${checks} vérifications\n`,
)
process.exit(failures === 0 ? 0 : 1)
