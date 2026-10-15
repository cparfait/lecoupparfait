#!/usr/bin/env node
/**
 * Construit l'AAB signé du Play Store, à téléverser à la main.
 *
 *   cd mobile && npm run aab
 *
 * Deux étapes, toujours dans cet ordre : `cap sync` recopie la configuration
 * (une configuration de test laissée dans `android/` partirait sinon dans
 * l'appli publiée), puis Gradle construit et signe.
 */

import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const mobile = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const android = join(mobile, 'android')
const windows = process.platform === 'win32'

/**
 * Sous Windows, `npx` et `gradlew` sont des scripts `.cmd`/`.bat` qu'on ne lance
 * qu'à travers le shell — et Node refuse désormais qu'on lui passe alors les
 * arguments en tableau, qu'il ne protège pas. On écrit donc la ligne entière,
 * en ne mettant entre guillemets que ce qui contient une espace : un `npx`
 * entre guillemets ne retrouve plus son propre dossier.
 */
function lancer(commande, args, cwd) {
  const ligne = [commande, ...args].map((m) => (/\s/.test(m) ? `"${m}"` : m)).join(' ')
  const resultat = windows
    ? spawnSync(ligne, { cwd, stdio: 'inherit', shell: true })
    : spawnSync(commande, args, { cwd, stdio: 'inherit' })
  if (resultat.status !== 0) process.exit(resultat.status ?? 1)
}

for (const [fichier, raison] of [
  ['signature/keystore.properties', 'l’appli sortirait non signée — « La clé de signature »'],
  ['android/app/google-services.json', 'elle ne recevrait aucune notification — « Prérequis »'],
]) {
  if (!existsSync(join(mobile, fichier))) {
    console.error(`✗ mobile/${fichier} manquant : ${raison} dans mobile/README.md.`)
    process.exit(1)
  }
}

lancer('npx', ['cap', 'sync', 'android'], mobile)
const gradlew = join(android, windows ? 'gradlew.bat' : 'gradlew')
const sorties = join(android, 'app', 'build', 'outputs')

lancer(gradlew, ['bundleRelease'], android)
const aab = join(sorties, 'bundle', 'release', 'app-release.aab')
console.log(`✓ AAB du Play Store : ${aab}`)
console.log('  À téléverser dans Play Console, Tester et publier → Créer une version.')
