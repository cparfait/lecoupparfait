#!/usr/bin/env node
/**
 * Vérifie le tournoi contre l'ordinateur.
 *
 * Un toutes rondes a des propriétés qu'on peut affirmer et qu'on ne peut pas
 * vérifier à l'œil : chacun rencontre chacun **exactement** une fois, les
 * couleurs s'équilibrent, le total des points égale le nombre de parties. Une
 * erreur d'un cran dans la rotation du cercle produit un calendrier qui a l'air
 * juste et où deux joueurs ne se rencontrent jamais.
 *
 * Le tirage des parties entre robots est vérifié séparément : il doit suivre la
 * formule d'Elo, ce qui se contrôle en tirant beaucoup et en comparant la
 * fréquence obtenue à l'espérance.
 *
 * Usage :  node scripts/check-tournoi.mjs
 */

const {
  HUMAIN,
  composerPlateau,
  composerCalendrier,
  tirerResultat,
  classement,
  enregistrer,
  prochainDuel,
  nombreDeRondes,
  estTermine,
  points,
} = await import('../packages/core/src/tournoi-solo.ts')
const { BOT_LEVELS } = await import('../packages/core/src/bots.ts')

let checks = 0
let failures = 0

function check(label, condition, detail = '') {
  checks++
  if (condition) return
  failures++
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
}

/** Tirage déterministe, pour que ce contrôle ne dépende pas du hasard. */
function des(graine) {
  let etat = graine
  return () => {
    etat = (etat * 1_103_515_245 + 12_345) % 2_147_483_648
    return etat / 2_147_483_648
  }
}

console.log('\n♟  Plateau\n')

for (const adversaires of [3, 5, 7]) {
  const plateau = composerPlateau({ adversaires, force: { type: 'fixe', niveau: 8 } }, des(7))
  check(`${adversaires} adversaires + le joueur`, plateau.length === adversaires + 1)
  check(`${adversaires} — le joueur est en tête`, plateau[0].id === HUMAIN)
  check(
    `${adversaires} — identifiants uniques`,
    new Set(plateau.map((c) => c.id)).size === plateau.length,
  )
  check(
    `${adversaires} — les bots sont classés du plus faible au plus fort`,
    plateau.slice(1).every((c, i, l) => i === 0 || l[i - 1].elo <= c.elo),
  )
}

const varie = composerPlateau({ adversaires: 6, force: { type: 'aleatoire', niveau: 12 } }, des(3))
const forces = new Set(varie.slice(1).map((c) => c.niveau))
check('en aléatoire, les forces diffèrent', forces.size >= 4, `${forces.size} niveaux distincts`)
check(
  'en aléatoire, les niveaux restent dans le barème',
  varie.slice(1).every((c) => c.niveau >= 1 && c.niveau <= BOT_LEVELS.length),
)
console.log(
  '  ✓ plateau aléatoire :',
  varie
    .slice(1)
    .map((c) => `${c.nom} ${c.elo}`)
    .join(' · '),
)

console.log('\n♟  Calendrier\n')

for (const adversaires of [3, 4, 5, 6, 7]) {
  const plateau = composerPlateau({ adversaires, force: { type: 'fixe', niveau: 8 } }, des(1))
  const duels = composerCalendrier(plateau)
  const n = plateau.length

  // Chacun rencontre chacun exactement une fois.
  const rencontres = new Map()
  for (const d of duels) {
    const cle = [d.blancs, d.noirs].sort().join('|')
    rencontres.set(cle, (rencontres.get(cle) ?? 0) + 1)
  }
  const attendues = (n * (n - 1)) / 2
  check(
    `${n} concurrents — ${attendues} rencontres`,
    duels.length === attendues,
    `${duels.length} produites`,
  )
  check(
    `${n} concurrents — aucune rencontre en double`,
    [...rencontres.values()].every((v) => v === 1),
  )
  check(`${n} concurrents — toutes les paires couvertes`, rencontres.size === attendues)
  check(
    `${n} concurrents — personne contre soi-même`,
    duels.every((d) => d.blancs !== d.noirs),
  )
  check(
    `${n} concurrents — ${n % 2 === 0 ? n - 1 : n} rondes`,
    nombreDeRondes({ duels }) === (n % 2 === 0 ? n - 1 : n),
  )

  // Une seule partie du joueur par ronde.
  const miennesParRonde = new Map()
  for (const d of duels) {
    if (d.blancs !== HUMAIN && d.noirs !== HUMAIN) continue
    miennesParRonde.set(d.ronde, (miennesParRonde.get(d.ronde) ?? 0) + 1)
  }
  check(
    `${n} concurrents — au plus une partie du joueur par ronde`,
    [...miennesParRonde.values()].every((v) => v === 1),
  )
  check(
    `${n} concurrents — le joueur affronte les ${n - 1} autres`,
    miennesParRonde.size === n - 1,
    `${miennesParRonde.size} rondes avec une partie`,
  )

  // Les couleurs du joueur s'équilibrent : jamais plus d'un écart de deux.
  const blancs = duels.filter((d) => d.blancs === HUMAIN).length
  const noirs = duels.filter((d) => d.noirs === HUMAIN).length
  check(
    `${n} concurrents — couleurs équilibrées pour le joueur`,
    Math.abs(blancs - noirs) <= 2,
    `${blancs} blancs / ${noirs} noirs`,
  )

  // Les parties du joueur ne sont jamais marquées comme simulées.
  check(
    `${n} concurrents — les parties du joueur se jouent`,
    duels.filter((d) => d.blancs === HUMAIN || d.noirs === HUMAIN).every((d) => !d.simule),
  )
  console.log(
    `  ✓ ${n} concurrents · ${duels.length} parties · ${nombreDeRondes({ duels })} rondes`,
  )
}

console.log('\n♟  Tirage entre robots\n')

// Un écart de 400 points donne une espérance de 0,91 pour le favori.
for (const [fort, faible, esperance] of [
  [1600, 1600, 0.5],
  [1600, 1200, 0.909],
  [1200, 1600, 0.091],
]) {
  const de = des(42)
  let score = 0
  const tirages = 20000
  for (let i = 0; i < tirages; i++) {
    const r = tirerResultat(fort, faible, de)
    score += r === '1-0' ? 1 : r === '1/2-1/2' ? 0.5 : 0
  }
  const obtenu = score / tirages
  check(
    `${fort} contre ${faible} → espérance ${esperance.toFixed(2)}`,
    Math.abs(obtenu - esperance) < 0.03,
    `obtenu ${obtenu.toFixed(3)}`,
  )
  console.log(
    `  ✓ ${fort} vs ${faible} : score moyen ${obtenu.toFixed(3)} (théorie ${esperance.toFixed(3)})`,
  )
}

console.log('\n♟  Déroulement\n')

const plateau = composerPlateau({ adversaires: 5, force: { type: 'fixe', niveau: 10 } }, des(9))
let tournoi = {
  cadence: '600+5',
  concurrents: plateau,
  duels: composerCalendrier(plateau),
  ronde: 1,
  commenceLe: '2026-08-30',
}

check(
  'au départ, rien n’est joué',
  tournoi.duels.every((d) => d.resultat === '*'),
)
check('au départ, le joueur a un duel', prochainDuel(tournoi) !== null)

const de = des(21)
let tours = 0
while (prochainDuel(tournoi) && tours < 20) {
  tournoi = enregistrer(tournoi, ['1-0', '0-1', '1/2-1/2'][tours % 3], de)
  tours++
}
check('le joueur a disputé ses cinq parties', tours === 5, `${tours} parties`)
check('le tournoi est terminé', estTermine(tournoi))
check(
  'plus aucun duel en attente',
  tournoi.duels.every((d) => d.resultat !== '*'),
)

// Le total des points doit égaler le nombre de parties : chacune en distribue un.
const total = tournoi.concurrents.reduce((s, c) => s + points(tournoi.duels, c.id), 0)
check(
  'un point distribué par partie',
  Math.abs(total - tournoi.duels.length) < 1e-9,
  `${total} points pour ${tournoi.duels.length} parties`,
)

const table = classement(tournoi)
check('le classement contient tout le monde', table.length === tournoi.concurrents.length)
check(
  'les rangs vont de 1 à n',
  table.every((l, i) => l.rang === i + 1),
)
check(
  'le classement est décroissant en points',
  table.every((l, i) => i === 0 || table[i - 1].points >= l.points),
)
console.log(
  '  ✓ classement final :',
  table.map((l) => `${l.rang}. ${l.concurrent.nom} ${l.points}`).join(' · '),
)

console.log(
  failures === 0
    ? `\n✓ ${checks} vérifications passées\n`
    : `\n✗ ${failures} échec(s) sur ${checks} vérifications\n`,
)
process.exit(failures === 0 ? 0 : 1)
