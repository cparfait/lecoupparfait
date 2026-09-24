/**
 * Les annonces du salon dans le tchat d'une partie en direct.
 *
 * Le serveur les écrivait en français, lues telles quelles dans toutes les
 * langues. Il envoie maintenant un code et un nom ; on vérifie que le client
 * les traduit, et qu'un ancien message sans code garde son texte.
 */

import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { texteDuMessage, type ChatMessage } from '../src/lib/game/annoncesDuSalon.ts'
import { fabriquerT } from '../src/lib/i18n/resoudre.ts'

const annonce = (code: string, name?: string): ChatMessage => ({
  from: 'Le Coup Parfait',
  text: 'texte français du serveur',
  at: 1,
  system: true,
  code,
  ...(name ? { name } : {}),
})

test('une annonce se lit dans la langue de l’interface, avec le nom du joueur', () => {
  assert.equal(texteDuMessage(fabriquerT('en'), annonce('joined', 'Bob')), 'Bob joined the game.')
  assert.equal(texteDuMessage(fabriquerT('fr'), annonce('joined', 'Bob')), 'Bob rejoint la partie.')
  assert.equal(texteDuMessage(fabriquerT('en'), annonce('aborted')), 'Game cancelled.')
  assert.equal(
    texteDuMessage(fabriquerT('en'), annonce('hint')),
    'A player asked the engine for a hint.',
  )
})

test('un message sans code, ou d’un code inconnu, garde son texte', () => {
  const ancien: ChatMessage = { from: 'Le Coup Parfait', text: 'Coup repris.', at: 1, system: true }
  assert.equal(texteDuMessage(fabriquerT('en'), ancien), 'Coup repris.')
  assert.equal(texteDuMessage(fabriquerT('en'), annonce('inconnu')), 'texte français du serveur')
  // Un joueur qui écrit n'est jamais une annonce, quoi que porte le message.
  const parole: ChatMessage = { from: 'Bob', text: 'salut', at: 2, code: 'joined' }
  assert.equal(texteDuMessage(fabriquerT('en'), parole), 'salut')
})
