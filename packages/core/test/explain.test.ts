/**
 * Épellation des coups pour la voix.
 *
 * Un coup mal épelé s'entend tout de suite et n'est rattrapé par rien : la voix
 * annonce une pièce qui n'a pas bougé, et l'apprenant cherche sur l'échiquier
 * ce qu'on vient de lui décrire.
 *
 * Le piège tient à une lettre : `R` est la **tour** en notation anglaise et le
 * **roi** en notation française. Toutes les autres sont propres à l'une ou à
 * l'autre, donc se reconnaissent seules ; celle-là exige de savoir d'où vient
 * le coup, d'où le troisième paramètre de `sanToSpeech`.
 */

import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { sanToSpeech } from '../src/explain.ts'

test('la notation anglaise se lit comme telle', () => {
  assert.equal(sanToSpeech('Rxd5', 'fr'), 'tour prend en d 5')
  assert.equal(sanToSpeech('Kxd5', 'fr'), 'roi prend en d 5')
  assert.equal(sanToSpeech('Nf3', 'fr'), 'cavalier f 3')
  assert.equal(sanToSpeech('Qh4+', 'fr'), 'dame h 4 échec')
  assert.equal(sanToSpeech('e4', 'fr'), 'pion e 4')
})

test('un coup déjà traduit garde son roi', () => {
  // Le cas signalé : la solution d'un puzzle, écrite en français, s'annonçait
  // « tour prend en d 5 » alors que le roi prenait en d5.
  assert.equal(sanToSpeech('Rxd5', 'fr', 'fr'), 'roi prend en d 5')
  assert.equal(sanToSpeech('Td5', 'fr', 'fr'), 'tour d 5')
  assert.equal(sanToSpeech('Cf3', 'fr', 'fr'), 'cavalier f 3')
  assert.equal(sanToSpeech('Dh4#', 'fr', 'fr'), 'dame h 4 échec et mat')
})

test('une notation anglaise restée dans un texte français reste lisible', () => {
  // `N`, `B`, `Q`, `K` n'existent pas en notation française : les chercher en
  // second suffit, et aucun coup ne retombe sur « pion ».
  assert.equal(sanToSpeech('Nf3', 'fr', 'fr'), 'cavalier f 3')
  assert.equal(sanToSpeech('Kg1', 'fr', 'fr'), 'roi g 1')
  assert.equal(sanToSpeech('Bxf7+', 'fr', 'fr'), 'fou prend en f 7 échec')
})

test('le roque et l’anglais ne dépendent pas du dialecte', () => {
  assert.equal(sanToSpeech('O-O', 'fr', 'fr'), 'petit roque')
  assert.equal(sanToSpeech('O-O-O', 'en'), 'queenside castles')
  assert.equal(sanToSpeech('Rxd5', 'en'), 'rook takes on d 5')
  assert.equal(sanToSpeech('Kxd5', 'en'), 'king takes on d 5')
})
