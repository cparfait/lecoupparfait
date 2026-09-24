/**
 * Le texte des notifications poussées.
 *
 * Elles partaient toutes en français, quelle que soit la langue du compte. On
 * vérifie ici la règle de langue — français, anglais, et l'anglais pour tout le
 * reste — et que chaque sujet s'écrit dans les deux langues.
 */

import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import {
  langueDeNotification,
  texteDeNotification,
  type SujetDeNotification,
} from '../src/index.ts'

test('la langue du compte choisit le texte, et les autres langues lisent l’anglais', () => {
  assert.equal(langueDeNotification('fr'), 'fr')
  assert.equal(langueDeNotification('en'), 'en')
  assert.equal(langueDeNotification('ja'), 'en')
  // Un compte sans langue enregistrée garde le français d'avant.
  assert.equal(langueDeNotification(null), 'fr')
  assert.equal(langueDeNotification(undefined), 'fr')
})

test('le rappel du défi du jour n’est plus en français pour un compte anglais', () => {
  assert.equal(
    texteDeNotification({ sujet: 'defiDuJour' }, 'en').titre,
    'Your daily challenge is waiting',
  )
  assert.equal(texteDeNotification({ sujet: 'defiDuJour' }, 'fr').titre, 'Le défi du jour t’attend')
  assert.equal(
    texteDeNotification({ sujet: 'defiDuJour' }, 'de').titre,
    'Your daily challenge is waiting',
  )
})

test('chaque sujet s’écrit dans les deux langues, avec ses valeurs', () => {
  const sujets: SujetDeNotification[] = [
    { sujet: 'defi', auteur: 'Alice', minutes: 3, increment: 2 },
    { sujet: 'amiDemande', auteur: 'Alice' },
    { sujet: 'amiAccepte', auteur: 'Alice' },
    { sujet: 'correspondance', auteur: 'Alice', jours: 3 },
    { sujet: 'defiDuJour' },
    { sujet: 'essai' },
  ]
  for (const sujet of sujets) {
    const fr = texteDeNotification(sujet, 'fr')
    const en = texteDeNotification(sujet, 'en')
    assert.ok(fr.titre && fr.corps && en.titre && en.corps, sujet.sujet)
    if ('auteur' in sujet) assert.ok(en.titre.includes('Alice'), sujet.sujet)
    if (sujet.sujet !== 'essai') assert.notEqual(fr.corps, en.corps, sujet.sujet)
  }
  assert.match(texteDeNotification(sujets[0]!, 'en').corps, /^3 min \+ 2 s/)
  assert.match(texteDeNotification(sujets[3]!, 'en').corps, /3 days/)
  assert.match(
    texteDeNotification({ sujet: 'correspondance', auteur: 'A', jours: 1 }, 'fr').corps,
    /1 jour pour/,
  )
})
