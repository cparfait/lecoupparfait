/**
 * L'APK publié, et ce que le site en annonce.
 *
 * La mise à jour de l'appli repose sur une seule comparaison : la version que
 * le site dit avoir publiée (`APPLI_ANDROID`) contre celle que la coque
 * installée déclare. Un numéro oublié d'un côté, et les téléphones déjà
 * équipés ne se voient jamais rien proposer — ou se le voient proposer en
 * boucle, la version téléchargée ne valant pas celle annoncée.
 */

import { strict as assert } from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { APPLI_ANDROID } from '../src/lib/appliAndroid.ts'

const gradle = readFileSync(
  new URL('../../../mobile/android/app/build.gradle', import.meta.url),
  'utf8',
)

test('le site annonce la version que construit Gradle', () => {
  assert.equal(Number(/versionCode (\d+)/.exec(gradle)?.[1]), APPLI_ANDROID.versionCode)
  assert.equal(/versionName "([^"]+)"/.exec(gradle)?.[1], APPLI_ANDROID.versionName)
})

test('l’APK annoncé est servi par le site', () => {
  assert.ok(existsSync(new URL(`../public${APPLI_ANDROID.fichier}`, import.meta.url)))
})
