/**
 * Qui peut ouvrir un salon temps réel, et le rendre classé.
 *
 * Les salons n'étaient pas plafonnés, et `rated` était celui du premier
 * arrivant, connecté ou non. On vérifie la règle sans socket : un registre,
 * une fonction qui dit si un salon existe encore.
 */

import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { classementAccorde, creerRegistre } from '../src/salons.ts'

function monde(limites: { total: number; parAdresse: number }) {
  const salons = new Set<string>()
  const registre = creerRegistre((slug) => salons.has(slug), limites)
  const ouvrir = (slug: string, adresse: string) => {
    const admission = registre.admettre(adresse, salons.size)
    if (admission === 'ok') {
      salons.add(slug)
      registre.noter(slug, adresse)
    }
    return admission
  }
  return { salons, ouvrir }
}

test('une adresse ne peut pas ouvrir plus que son quota', () => {
  const { ouvrir } = monde({ total: 100, parAdresse: 3 })
  for (let i = 0; i < 3; i++) assert.equal(ouvrir(`a${i}`, '203.0.113.7'), 'ok')
  assert.equal(ouvrir('a3', '203.0.113.7'), 'tropParAdresse')
  assert.equal(ouvrir('b0', '198.51.100.9'), 'ok', 'une autre adresse n’en pâtit pas')
})

test('un salon fermé rend sa place à son adresse', () => {
  const { salons, ouvrir } = monde({ total: 100, parAdresse: 2 })
  ouvrir('a0', '203.0.113.7')
  ouvrir('a1', '203.0.113.7')
  assert.equal(ouvrir('a2', '203.0.113.7'), 'tropParAdresse')
  salons.delete('a0')
  assert.equal(ouvrir('a2', '203.0.113.7'), 'ok')
})

test('le plafond global vaut pour tout le monde', () => {
  const { ouvrir } = monde({ total: 5, parAdresse: 100 })
  for (let i = 0; i < 5; i++) assert.equal(ouvrir(`s${i}`, `10.0.0.${i}`), 'ok')
  assert.equal(ouvrir('s5', '10.0.0.99'), 'plein')
})

test('seul un hôte connecté obtient une partie classée', () => {
  assert.equal(classementAccorde(true, true), true)
  assert.equal(classementAccorde(true, false), false, 'un anonyme ne classe rien')
  assert.equal(classementAccorde(false, true), false)
  assert.equal(classementAccorde(undefined, true), false)
  assert.equal(classementAccorde('true', true), false, 'une chaîne n’est pas un booléen')
})
