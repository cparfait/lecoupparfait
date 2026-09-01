#!/usr/bin/env node
/**
 * Fabrique la paire de clés qui signe les notifications.
 *
 * VAPID — « Voluntary Application Server Identification » — est ce qui permet
 * à un service de messagerie de navigateur (Google, Mozilla, Apple) de savoir
 * de quel serveur vient une notification, sans qu'on ait à s'inscrire chez
 * eux ni à leur demander une clé. On génère une paire une fois pour toutes :
 * la publique part dans le navigateur au moment de l'abonnement, la privée
 * reste sur le serveur et signe chaque envoi.
 *
 * Deux conséquences pratiques, qui expliquent pourquoi ce script écrit dans
 * `.env` au lieu d'afficher les clés et de laisser faire :
 *
 *  - **La paire ne se change pas à la légère.** Un abonnement est lié à la clé
 *    publique avec laquelle il a été pris. Regénérer, c'est rendre muets tous
 *    les appareils déjà abonnés, qui devront se réabonner sans savoir qu'ils
 *    doivent le faire. Le script refuse donc d'écraser des clés existantes à
 *    moins qu'on insiste avec `--force`.
 *  - **La clé privée est un secret.** Elle ne va pas dans le dépôt, elle va
 *    dans `.env`, qui est ignoré par git.
 *
 *     node scripts/vapid.mjs
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import webpush from 'web-push'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = resolve(root, '.env')
const force = process.argv.includes('--force')

if (!existsSync(envPath)) {
  console.error('✗ Aucun fichier .env. Commence par : cp .env.example .env')
  process.exit(1)
}

const contenu = readFileSync(envPath, 'utf8')
const dejaLa = /^\s*VAPID_PRIVATE_KEY=\S/m.test(contenu)

if (dejaLa && !force) {
  console.log('Des clés VAPID sont déjà en place — rien à faire.')
  console.log(
    'Pour en générer de nouvelles malgré tout : node scripts/vapid.mjs --force\n' +
      '⚠ Tous les appareils déjà abonnés cesseront de recevoir les notifications.',
  )
  process.exit(0)
}

const { publicKey, privateKey } = webpush.generateVAPIDKeys()

/**
 * Remplace une ligne si elle existe, l'ajoute sinon.
 *
 * On réécrit `.env` plutôt que d'ajouter à la fin : après un `--force`, deux
 * lignes `VAPID_PRIVATE_KEY=` se retrouveraient dans le fichier et la dernière
 * lue gagnerait — comportement qui dépend de l'outil qui charge le fichier.
 */
function poser(texte, cle, valeur) {
  const ligne = `${cle}=${valeur}`
  const motif = new RegExp(`^\\s*#?\\s*${cle}=.*$`, 'm')
  return motif.test(texte) ? texte.replace(motif, ligne) : `${texte.trimEnd()}\n${ligne}\n`
}

let sortie = contenu
if (!/# ── Notifications/.test(sortie)) {
  sortie = `${sortie.trimEnd()}\n\n\n# ── Notifications poussées ───────────────────────────────────\n\n# Générées par : node scripts/vapid.mjs\n`
}
sortie = poser(sortie, 'VAPID_PUBLIC_KEY', publicKey)
sortie = poser(sortie, 'VAPID_PRIVATE_KEY', privateKey)

writeFileSync(envPath, sortie)

console.log('✓ Clés VAPID écrites dans .env')
console.log(`  VAPID_PUBLIC_KEY=${publicKey}`)
console.log('  VAPID_PRIVATE_KEY=… (gardée secrète)')
console.log(
  '\nEn Docker :  docker compose up -d web server\n' +
    'Les deux conteneurs lisent les clés au démarrage — rien à reconstruire.',
)
