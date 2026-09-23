/**
 * Le seau à jetons des sockets, puis l'adresse qu'on attribue au client.
 *
 * Ce qu'on veut garantir n'est pas un chiffre mais une forme : la rafale
 * passe, le débit soutenu ne passe pas, et le seau se remplit avec le temps —
 * pas d'un coup à la fenêtre suivante.
 */

import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { creerSeau, maillonDeConfiance, relaisDeConfiance } from '../src/limites.ts'
import { maillonDeConfiance as maillonCoteWeb } from '../../web/src/lib/server/ip.ts'

/** Une horloge qu'on avance à la main. */
function horloge(depart = 1_000_000) {
  let instant = depart
  return {
    now: () => instant,
    avancer(ms: number) {
      instant += ms
    },
  }
}

test('la rafale passe jusqu’à la capacité, puis plus rien', () => {
  const h = horloge()
  const seau = creerSeau(5, 60_000, h.now)
  for (let i = 0; i < 5; i++) assert.equal(seau.prendre(), true, `jeton ${i + 1}`)
  assert.equal(seau.prendre(), false, 'le sixième est refusé')
  assert.equal(seau.prendre(), false, 'et insister ne change rien')
})

test('le seau se remplit au rythme de la période, jeton par jeton', () => {
  const h = horloge()
  // Cinq par minute : un jeton toutes les douze secondes.
  const seau = creerSeau(5, 60_000, h.now)
  for (let i = 0; i < 5; i++) seau.prendre()

  h.avancer(11_000)
  assert.equal(seau.prendre(), false, 'à 11 s, rien n’est revenu')
  h.avancer(1_000)
  assert.equal(seau.prendre(), true, 'à 12 s, un jeton est revenu')
  assert.equal(seau.prendre(), false, 'un seul')
})

test('le seau ne déborde pas : une longue pause ne donne pas de crédit', () => {
  const h = horloge()
  const seau = creerSeau(3, 10_000, h.now)
  h.avancer(3_600_000)
  for (let i = 0; i < 3; i++) assert.equal(seau.prendre(), true)
  assert.equal(seau.prendre(), false, 'une heure de silence ne vaut pas plus que la capacité')
})

test('une horloge qui recule ne vide pas le seau', () => {
  const h = horloge()
  const seau = creerSeau(2, 10_000, h.now)
  assert.equal(seau.prendre(), true)
  h.avancer(-5_000)
  assert.equal(seau.prendre(), true, 'le jeton restant est toujours là')
})

// ─────────────────────────────────────────────────────────────────────────────
//  L'adresse du client derrière un proxy
// ─────────────────────────────────────────────────────────────────────────────

test('le premier maillon, écrit par le client, n’est jamais cru', () => {
  // Le client envoie « 1.2.3.4 » ; NPM ajoute l'adresse qu'il voit vraiment.
  const chaine = '1.2.3.4, 203.0.113.7'
  assert.equal(maillonDeConfiance(chaine, 1), '203.0.113.7')
  assert.equal(maillonCoteWeb(chaine, 1), '203.0.113.7')
})

test('forger l’en-tête ne donne plus un compteur neuf à chaque requête', () => {
  const vues = new Set(
    Array.from({ length: 50 }, (_, n) => maillonDeConfiance(`10.0.0.${n}, 198.51.100.9`, 1)),
  )
  assert.deepEqual([...vues], ['198.51.100.9'])
})

test('avec deux proxys de confiance, on remonte d’un maillon', () => {
  const chaine = 'forgé, 203.0.113.7, 172.18.0.2'
  assert.equal(maillonDeConfiance(chaine, 2), '203.0.113.7')
  assert.equal(maillonCoteWeb(chaine, 2), '203.0.113.7')
})

test('une chaîne plus courte que le nombre de proxys rend le maillon le plus à gauche', () => {
  assert.equal(maillonDeConfiance('203.0.113.7', 3), '203.0.113.7')
  assert.equal(maillonCoteWeb('203.0.113.7', 3), '203.0.113.7')
})

test('en-têtes répétés, vides ou blancs', () => {
  assert.equal(maillonDeConfiance(['1.1.1.1', '2.2.2.2'], 1), '2.2.2.2')
  assert.equal(maillonDeConfiance(' , ', 1), null)
  assert.equal(maillonCoteWeb(' , ', 1), null)
  assert.equal(maillonDeConfiance(undefined, 1), null)
})

test('sans TRUST_PROXY, le serveur ignore l’en-tête', () => {
  assert.equal(relaisDeConfiance(undefined), 0)
  assert.equal(relaisDeConfiance(''), 0)
  assert.equal(relaisDeConfiance('non'), 0)
  assert.equal(relaisDeConfiance('1'), 1)
  assert.equal(relaisDeConfiance('2'), 2)
  assert.equal(maillonDeConfiance('1.2.3.4', 0), null)
})
