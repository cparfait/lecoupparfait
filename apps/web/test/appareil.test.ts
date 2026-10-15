/**
 * L'appareil que le battement de présence déclare.
 *
 * La valeur vient du navigateur et finit dans une colonne de quarante
 * caractères : tout ce qui n'a pas exactement la forme prévue doit être
 * écarté, et ce qui l'a doit survivre à l'aller-retour.
 */

import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { encoderAppareil, lireAppareil, type Appareil } from '../src/lib/appareil.ts'

test('chaque appareil survit à l’aller-retour, sous quarante caractères', () => {
  const appareils: Appareil[] = [
    { genre: 'appli', version: '1.3.0', distribution: 'play' },
    { genre: 'appli', version: '1.0.0', distribution: 'site' },
    { genre: 'mobile' },
    { genre: 'ordinateur' },
  ]
  for (const appareil of appareils) {
    const brut = encoderAppareil(appareil)
    assert.ok(brut.length <= 40, brut)
    assert.deepEqual(lireAppareil(brut), appareil)
  }
})

test('ce qui n’a pas la forme prévue est écarté', () => {
  for (const brut of [
    undefined,
    null,
    42,
    '',
    'tablette',
    'appli',
    'appli:1.3.0',
    'appli:1.3.0:amazon',
    'appli:1.3.0:play:de-trop',
    'appli:<script>:play',
    'appli:1.3.0-beta:site',
  ]) {
    assert.equal(lireAppareil(brut), null, String(brut))
  }
})
