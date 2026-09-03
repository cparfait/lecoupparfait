/**
 * Pendules et cadences.
 *
 * Deux sujets distincts dans un même fichier, parce qu'ils se cassent
 * ensemble : la **cadence** est un identifiant qui voyage dans une adresse, la
 * **pendule** est un état qui se calcule à partir d'horodatages absolus.
 *
 * L'aller-retour d'une cadence par l'adresse est déjà couvert par
 * `scripts/check-cadences.mjs`, né d'un défaut qui avait résisté à un premier
 * diagnostic — le `+` de `1800+20` qu'une chaîne de requête relit comme un
 * espace. On ne le refait pas ici ; on couvre le reste, à commencer par la
 * pendule, dont plus rien ne dépendait d'un test.
 */

import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import {
  TIME_CONTROLS,
  applyMove,
  clockUrgency,
  createClock,
  flaggedColor,
  formatClock,
  formatTimeControl,
  parseTimeControl,
  remainingAt,
  speedCategory,
  stopClock,
} from '../src/clock.ts'

const TROIS_MINUTES = { initial: 180, increment: 2 }

// ─────────────────────────────────────────────────────────────────────────────
//  Le barème
// ─────────────────────────────────────────────────────────────────────────────

test('chaque cadence du barème se relit elle-même', () => {
  assert.ok(TIME_CONTROLS.length > 0)
  for (const preset of TIME_CONTROLS) {
    const relu = parseTimeControl(preset.id)
    assert.ok(relu, `${preset.id} devrait être lisible`)
    assert.equal(relu.initial, preset.initial, preset.id)
    assert.equal(relu.increment, preset.increment, preset.id)
  }
})

test('chaque cadence tombe dans une catégorie, et la même deux fois de suite', () => {
  for (const preset of TIME_CONTROLS) {
    const categorie = speedCategory(preset)
    assert.ok(categorie, preset.id)
    assert.equal(speedCategory(preset), categorie)
  }
})

test('les seuils de catégorie sont ceux de la formule de Lichess', () => {
  /*
    La durée estimée est `initial + 40 × incrément`, et non le temps initial
    seul : c'est ce qui fait qu'une partie 3 | 2 se classe comme une 5 minutes,
    ce qu'elle est en pratique.

    **Attention, divergence connue.** La route d'archivage des parties contre
    l'ordinateur (`api/parties/terminee`) a sa propre fonction `cadence()`, qui
    ne regarde que le temps initial avec des bornes 180 / 600 / 1800. Les deux
    ne s'accordent pas entre 480 et 600 secondes : une partie de 8 minutes est
    « rapide » ici et « blitz » là-bas, donc classée dans deux catégories
    différentes selon qu'on l'a jouée contre l'ordinateur ou contre un ami. Ce
    test fige la formule du cœur, qui est la bonne ; le rapprochement est noté
    au journal du chantier.
  */
  assert.equal(speedCategory({ initial: 29, increment: 0 }), 'ultraBullet')
  assert.equal(speedCategory({ initial: 60, increment: 0 }), 'bullet')
  assert.equal(speedCategory({ initial: 179, increment: 0 }), 'bullet')
  assert.equal(speedCategory({ initial: 180, increment: 0 }), 'blitz')
  assert.equal(speedCategory({ initial: 479, increment: 0 }), 'blitz')
  assert.equal(speedCategory({ initial: 480, increment: 0 }), 'rapid')
  assert.equal(speedCategory({ initial: 1499, increment: 0 }), 'rapid')
  assert.equal(speedCategory({ initial: 1500, increment: 0 }), 'classical')
  // L'incrément compte quarante fois : 3 | 2 dure autant qu'une 5 minutes.
  assert.equal(speedCategory({ initial: 180, increment: 2 }), 'blitz')
  assert.equal(speedCategory({ initial: 180, increment: 8 }), 'rapid')
  // Sans limite du tout : correspondance.
  assert.equal(speedCategory({ initial: 0, increment: 0 }), 'correspondence')
})

test('une cadence illisible reste illisible', () => {
  assert.equal(parseTimeControl(''), null)
  assert.equal(parseTimeControl('rapide'), null)
  assert.equal(parseTimeControl('1800+'), null)
})

test('la cadence s’écrit comme on la lit à l’écran', () => {
  assert.equal(formatTimeControl({ initial: 180, increment: 2 }), '3|2')
  assert.equal(formatTimeControl({ initial: 600, increment: 0 }), '10 min')
})

// ─────────────────────────────────────────────────────────────────────────────
//  La pendule
// ─────────────────────────────────────────────────────────────────────────────

test('une pendule neuve ne tourne pour personne', () => {
  const pendule = createClock(TROIS_MINUTES, 1_000_000)
  assert.equal(pendule.running, null)
  // Personne ne perd de temps avant le premier coup : celui qui attend son
  // adversaire ne doit pas voir sa pendule descendre.
  const dansUneMinute = remainingAt(pendule, 1_060_000)
  assert.equal(dansUneMinute.w, 180_000)
  assert.equal(dansUneMinute.b, 180_000)
})

test('le temps écoulé se décompte à celui qui a le trait, et à lui seul', () => {
  const debut = 1_000_000
  let pendule = createClock(TROIS_MINUTES, debut)
  // Premier coup des Blancs : leur pendule ne démarre qu'ensuite.
  pendule = applyMove(pendule, 'w', debut, true)
  assert.equal(pendule.running, 'b')

  const dixSecondes = remainingAt(pendule, debut + 10_000)
  // L'incrément revient à **celui qui vient de jouer**, donc aux Blancs.
  assert.equal(dixSecondes.b, 180_000 - 10_000, 'les Noirs jouent, donc décomptent')
  assert.equal(dixSecondes.w, 180_000 + 2_000, 'les Blancs attendent, donc ne décomptent pas')
})

test('l’incrément s’ajoute au coup, pas au tour', () => {
  const debut = 1_000_000
  let pendule = createClock({ initial: 60, increment: 5 }, debut)
  pendule = applyMove(pendule, 'w', debut, true)
  // Les Noirs réfléchissent trois secondes puis jouent : −3 s, +5 s.
  pendule = applyMove(pendule, 'b', debut + 3_000, false)
  const restant = remainingAt(pendule, debut + 3_000)
  assert.equal(restant.b, 60_000 - 3_000 + 5_000)
})

test('une pendule arrêtée ne descend plus', () => {
  const debut = 1_000_000
  let pendule = createClock(TROIS_MINUTES, debut)
  pendule = applyMove(pendule, 'w', debut, true)
  pendule = stopClock(pendule, debut + 5_000)
  const avant = remainingAt(pendule, debut + 5_000)
  const bienPlusTard = remainingAt(pendule, debut + 5_000 + 3_600_000)
  assert.deepEqual(avant, bienPlusTard, 'une heure plus tard, rien n’a bougé')
})

test('le drapeau tombe pour le camp au trait, à l’heure dite', () => {
  const debut = 1_000_000
  let pendule = createClock({ initial: 10, increment: 0 }, debut)
  pendule = applyMove(pendule, 'w', debut, true)

  assert.equal(flaggedColor(pendule, debut + 9_000), null, 'à 9 s, rien n’est tombé')
  assert.equal(flaggedColor(pendule, debut + 10_001), 'b', 'à 10 s, les Noirs sont tombés')
  // Et personne ne tombe sur une pendule arrêtée.
  assert.equal(flaggedColor(stopClock(pendule, debut + 5_000), debut + 3_600_000), null)
})

test('le temps de l’arrêt est décompté quand on relit une pendule', () => {
  /*
    C'est la propriété sur laquelle repose la reprise des parties en direct
    après un redémarrage du serveur : la pendule ne contient pas un compte à
    rebours mais des horodatages absolus, si bien que la relire plus tard
    décompte d'elle-même le temps passé hors ligne.
  */
  const debut = 1_000_000
  let pendule = createClock(TROIS_MINUTES, debut)
  pendule = applyMove(pendule, 'w', debut, true)

  // Le serveur meurt, revient une minute plus tard avec le même objet.
  const releu = JSON.parse(JSON.stringify(pendule)) as typeof pendule
  const restant = remainingAt(releu, debut + 60_000)
  assert.equal(restant.b, 180_000 - 60_000, 'la minute d’arrêt est prise au camp au trait')
  assert.equal(restant.w, 180_000 + 2_000, 'et à lui seul')
})

// ─────────────────────────────────────────────────────────────────────────────
//  Affichage
// ─────────────────────────────────────────────────────────────────────────────

test('l’affichage passe aux dixièmes sous dix secondes, et pas avant', () => {
  // C'est ce seuil, et lui seul, qui justifie le rythme de `PenduleVive` :
  // au-dessus, battre plus d'une fois par seconde ne change rien à l'écran.
  assert.equal(formatClock(10_000), '0:10')
  assert.equal(formatClock(9_900), '9.9')
  assert.equal(formatClock(1_500), '1.5')
  assert.equal(formatClock(0), '0:00')
  assert.equal(formatClock(-1), '0:00', 'un temps négatif reste zéro')
})

test('les heures s’affichent quand il y en a', () => {
  assert.equal(formatClock(3_600_000), '1:00:00')
  assert.equal(formatClock(65_000), '1:05')
})

test('l’urgence monte en approchant de zéro', () => {
  const controle = { initial: 600, increment: 0 }
  assert.equal(clockUrgency(600_000, controle), 'calm')
  assert.equal(clockUrgency(60_000, controle), 'low')
  assert.equal(clockUrgency(5_000, controle), 'critical')
  // Sans limite de temps, il n'y a pas d'urgence.
  assert.equal(clockUrgency(1_000, { initial: 0, increment: 0 }), 'calm')
})
