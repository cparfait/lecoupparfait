/**
 * La coque publiée, et ce que le site en annonce.
 *
 * `APPLI_ANDROID` dit au site, et à l'administration, quelle est la dernière
 * coque parue sur le Play Store : une coque installée plus ancienne y est
 * signalée. Un numéro oublié d'un côté, et tout le monde paraîtrait en retard
 * — ou personne.
 */

import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
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
