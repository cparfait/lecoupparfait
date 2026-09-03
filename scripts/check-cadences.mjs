#!/usr/bin/env node
/**
 * Vérifie qu'une cadence survit au voyage dans une adresse.
 *
 * Ce contrôle existe à cause d'un défaut qui a résisté à un premier
 * diagnostic. Les cadences circulent dans l'adresse — `?tc=1800+20` — et
 * l'identifiant contient un `+`. Or dans une chaîne de requête, `+` est
 * l'écriture historique de l'espace : `URLSearchParams` rend `1800 20`, que
 * plus rien ne reconnaît. La partie se réglait alors sur le repli, 10 | 5,
 * quelle que soit la cadence choisie à l'écran d'avant — et sans un mot, car
 * une pendule à dix minutes n'a l'air de rien d'anormal.
 *
 * Le symptôme avait déjà été chassé une fois, et attribué à `useSearchParams`,
 * qui peut rendre une collection vide au premier rendu. C'était une vraie
 * cause, mais pas la seule, et le correctif d'alors ne touchait pas celle-ci.
 * D'où ce fichier : la question « la cadence choisie est-elle celle qui est
 * jouée ? » se pose une fois pour toutes, sur les seize cadences, plutôt que
 * de se re-poser à chaque symptôme.
 *
 * C'est aussi ce qui règle les pendules côté serveur : le premier arrivant
 * annonce la cadence, le salon naît dessus, et un salon né sur le repli ne se
 * rattrape plus.
 *
 * Usage :  node scripts/check-cadences.mjs
 */

const { TIME_CONTROLS, normalizeTimeControlId, parseTimeControl } =
  await import('../packages/core/src/clock.ts')

let checks = 0
let failures = 0

function check(label, condition, detail = '') {
  checks++
  if (condition) {
    console.log(`  ✓ ${label}`)
    return
  }
  failures++
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
}

/**
 * Le trajet réel d'une cadence, reproduit à l'identique.
 *
 * On construit le lien comme les écrans le construisent — l'identifiant posé
 * tel quel derrière `?tc=` — puis on le relit comme la page le relit. Pas de
 * raccourci : c'est précisément entre les deux que la valeur se perdait.
 */
function allerRetour(id) {
  const url = new URL(`http://exemple.test/jouer/partie/abcdefgh?tc=${id}`)
  return new URLSearchParams(url.search).get('tc')
}

console.log('\n♟  Aller-retour par l’adresse\n')

for (const preset of TIME_CONTROLS) {
  const relu = allerRetour(preset.id)
  const cadence = parseTimeControl(relu ?? '')
  check(
    `${preset.label.padEnd(11)} (${preset.id})`,
    cadence !== null &&
      cadence.initial === preset.initial &&
      cadence.increment === preset.increment,
    `relu « ${relu} », compris ${cadence ? `${cadence.initial}+${cadence.increment}` : 'rien'}`,
  )
}

console.log('\n♟  Recherche par identifiant\n')

/*
  Deux écrans ne parsent pas la cadence : ils cherchent le barème par son
  identifiant, pour en afficher le nom et la catégorie. Un identifiant amputé
  de son `+` n'y correspond à rien, et l'écran retombe muet sur « Rapide ».
*/
for (const preset of TIME_CONTROLS) {
  const relu = normalizeTimeControlId(allerRetour(preset.id) ?? '')
  const trouve = TIME_CONTROLS.find((entry) => entry.id === relu)
  check(`${preset.label.padEnd(11)} se retrouve dans le barème`, trouve?.id === preset.id)
}

console.log('\n♟  Bornes\n')

// La normalisation ne doit pas inventer de cadence là où il n'y en a pas :
// une valeur illisible reste illisible, et l'appelant garde son repli.
check('une valeur vide reste illisible', parseTimeControl('') === null)
check('un texte quelconque reste illisible', parseTimeControl('rapide') === null)
check('un identifiant tronqué reste illisible', parseTimeControl('1800+') === null)
check('un identifiant intact traverse sans dommage', normalizeTimeControlId('300+3') === '300+3')

console.log(
  failures === 0
    ? `\n✓ ${checks} vérifications passées\n`
    : `\n✗ ${failures} échec(s) sur ${checks} vérifications\n`,
)
process.exit(failures === 0 ? 0 : 1)
