#!/usr/bin/env node
/**
 * Construit l'APK signé et le dépose là où le site le sert.
 *
 *   cd mobile && npm run apk
 *
 * Trois étapes, toujours dans cet ordre : `cap sync` recopie la configuration
 * (une configuration de test laissée dans `android/` partirait sinon dans
 * l'APK publié), Gradle construit et signe, puis l'APK rejoint
 * `apps/web/public/telechargements/`, d'où la page `/appli` et la mise à jour
 * automatique le téléchargent.
 */

import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
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

if (!existsSync(join(mobile, 'signature', 'keystore.properties'))) {
  console.error('✗ mobile/signature/keystore.properties manquant : l’APK sortirait non signé.')
  console.error('  Voir mobile/README.md, « La clé de signature ».')
  process.exit(1)
}

lancer('npx', ['cap', 'sync', 'android'], mobile)
lancer(join(android, windows ? 'gradlew.bat' : 'gradlew'), ['assembleRelease'], android)

const cible = join(mobile, '..', 'apps', 'web', 'public', 'telechargements')
mkdirSync(cible, { recursive: true })
copyFileSync(
  join(android, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk'),
  join(cible, 'le-coup-parfait.apk'),
)
console.log('✓ APK déposé dans apps/web/public/telechargements/le-coup-parfait.apk')
