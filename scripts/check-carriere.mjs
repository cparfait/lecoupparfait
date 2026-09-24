#!/usr/bin/env node
/**
 * Vérifie que le mode carrière ne renvoie nulle part.
 *
 * Un chapitre référence une leçon par son identifiant, un thème de puzzle par
 * le sien, et un niveau du barème des bots. Ces trois liens sont des chaînes de
 * caractères : rien dans le typage n'empêche d'écrire `piece-en-prises` au
 * pluriel. La faute ne se verrait qu'au clic, en production, sur un écran vide
 * — et seulement pour qui a atteint ce chapitre-là.
 *
 * D'où ce contrôle. Il coûte une seconde et couvre le seul risque réel de ce
 * fichier de contenu : la faute de frappe silencieuse.
 *
 * Usage :  node scripts/check-carriere.mjs
 */

const {
  CHAPITRES,
  CARRIERE_TERMINEE,
  RANGS,
  HAUTS_FAITS,
  XP,
  rangPour,
  etoilesPour,
  etapesDe,
  prochaineEtape,
  detailXp,
  PROGRESSION_INITIALE,
  niveauAllege,
  niveauEffectif,
  SEUIL_COUP_DE_MAIN,
} = await import('../packages/core/src/carriere.ts')
const { BOT_LEVELS, BOT_PERSONALITIES, botLevelAvecStyle } =
  await import('../packages/core/src/bots.ts')
const { readFileSync } = await import('node:fs')
const { ALL_LESSONS } = await import('../apps/web/src/lib/lessons/index.ts')
const { fr } = await import('../apps/web/src/lib/i18n/fr.ts')

/**
 * Le texte d'une clé du cœur.
 *
 * Les noms d'adversaires vivent dans le dictionnaire depuis qu'ils existent en
 * plusieurs langues ; le cœur n'en porte plus que la clé. Ce contrôle affiche du
 * français, comme le reste de sa sortie.
 */
function resoudre(chemin) {
  let courant = fr
  for (const segment of String(chemin).split('.')) {
    if (!courant || typeof courant !== 'object') return String(chemin)
    courant = courant[segment]
  }
  return typeof courant === 'string' ? courant : String(chemin)
}

let checks = 0
let failures = 0

function check(label, condition, detail = '') {
  checks++
  if (condition) return
  failures++
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
}

/**
 * Les thèmes proposés par l'écran des puzzles.
 *
 * Recopiés à la main plutôt qu'importés : cet écran est un composant React et
 * l'importer traînerait tout Next.js dans un script Node. La liste bouge une
 * fois par an ; ce contrôle échouera bruyamment le jour où elle bougera, ce qui
 * est exactement le comportement voulu.
 */
const THEMES = new Set([
  'fork',
  'pin',
  'skewer',
  'discoveredAttack',
  'hangingPiece',
  'mateIn1',
  'mateIn2',
  'backRankMate',
  'sacrifice',
  'promotion',
  'zugzwang',
  'trappedPiece',
  'quietMove',
])

const lecons = new Set(ALL_LESSONS.map((l) => l.id))

console.log('\n♟  Chapitres\n')

check('douze chapitres', CHAPITRES.length === 12, `${CHAPITRES.length} trouvés`)
check(
  'numérotation continue de 1 à 12',
  CHAPITRES.every((c, i) => c.numero === i + 1),
)
check('carrière terminée = 13', CARRIERE_TERMINEE === 13)

for (const c of CHAPITRES) {
  const prefixe = `chapitre ${String(c.numero).padStart(2)} · ${c.titre}`
  check(`${prefixe} — leçon « ${c.lecon} »`, lecons.has(c.lecon), 'aucune leçon de cet identifiant')
  check(
    `${prefixe} — thème « ${c.theme} »`,
    THEMES.has(c.theme),
    'thème inconnu de l’écran des puzzles',
  )
  check(`${prefixe} — niveau ${c.niveau}`, c.niveau >= 1 && c.niveau <= BOT_LEVELS.length)
  check(`${prefixe} — adversaire`, Boolean(BOT_PERSONALITIES[c.adversaire]), c.adversaire)
  check(`${prefixe} — objectif rédigé`, c.objectif.length > 20 && c.objectif.endsWith('.'))
  check(`${prefixe} — teinte hexadécimale`, /^#[0-9a-f]{6}$/i.test(c.teinte), c.teinte)
  if (
    lecons.has(c.lecon) &&
    THEMES.has(c.theme) &&
    BOT_PERSONALITIES[c.adversaire] &&
    c.niveau <= BOT_LEVELS.length
  ) {
    const elo = BOT_LEVELS[c.niveau - 1].elo
    console.log(
      `  ✓ ${String(c.numero).padStart(2)}. ${c.titre.padEnd(30)} ${resoudre(BOT_PERSONALITIES[c.adversaire].name).padEnd(9)} ${String(elo).padStart(4)} Elo`,
    )
  }
}

// La difficulté doit monter. Un chapitre plus facile que le précédent casserait
// la seule promesse du mode : que le chemin mène quelque part. Seul le dernier
// peut garder la force de l'avant-dernier : il n'y a que onze échelons sous
// 1850, et ce qu'il ajoute est l'absence de filet — voir `CHAPITRES`. Ses
// puzzles, eux, doivent rester plus difficiles.
let croissant = true
for (let i = 1; i < CHAPITRES.length; i++) {
  const dernier = i === CHAPITRES.length - 1
  const avant = CHAPITRES[i - 1]
  const ici = CHAPITRES[i]
  if (dernier ? ici.niveau < avant.niveau : ici.niveau <= avant.niveau) croissant = false
  if (ici.cotePuzzles <= avant.cotePuzzles) croissant = false
}
check('la difficulté monte à chaque chapitre', croissant)

// La carrière finit à 1850 : c'est ce qu'annoncent son commentaire et
// `docs/mode-carriere.md`. Les rangs reportés à la main lors d'un changement
// d'échelle l'avaient emmenée jusqu'à 2250 sans que rien ne le signale.
const plafond = Math.max(...CHAPITRES.map((c) => BOT_LEVELS[c.niveau - 1]?.elo ?? Infinity))
check('la carrière finit à 1850 Elo', plafond === 1850, `${plafond} Elo au dernier chapitre`)
check(
  'le dernier chapitre a des puzzles au niveau de son adversaire',
  CHAPITRES.at(-1).cotePuzzles === plafond,
)

/*
  Le style annoncé doit être celui qui joue.

  Le chapitre impose une personnalité à un échelon qui en a une autre. Le choix
  du coup lit `engine.bias` : ne remplacer que le champ `personality` laissait
  jouer le style du niveau sous le nom du style imposé — on annonçait Brasier
  au chapitre 6 et c'était Rempart qui jouait. On vérifie donc le biais et le
  nom effectivement servis, et que le crochet du navigateur passe bien par la
  fonction qui les reconstruit.
*/
for (const c of CHAPITRES) {
  const joue = botLevelAvecStyle(c.niveau, c.adversaire)
  const attendu = BOT_PERSONALITIES[c.adversaire]
  check(
    `chapitre ${String(c.numero).padStart(2)} — le biais joué est celui de ${c.adversaire}`,
    JSON.stringify(joue.engine.bias) === JSON.stringify(attendu.bias) &&
      joue.nomKey === attendu.name &&
      joue.personality === c.adversaire,
    `${joue.personality} joue`,
  )
  check(
    `chapitre ${String(c.numero).padStart(2)} — la force reste celle de l’échelon`,
    joue.elo === BOT_LEVELS[c.niveau - 1].elo &&
      joue.engine.temperature === BOT_LEVELS[c.niveau - 1].engine.temperature,
  )
}
const crochet = readFileSync(
  new URL('../apps/web/src/lib/game/useBotPlayer.ts', import.meta.url),
  'utf8',
)
check(
  'useBotPlayer reconstruit le style imposé par botLevelAvecStyle',
  crochet.includes('botLevelAvecStyle(level, personality)'),
)

/*
  Le coup de main retire un cran, un seul, et jamais zéro en le prétendant.

  Il en retirait deux — près de cinq cents points au chapitre 6, un autre
  adversaire plutôt qu'un répit — et, au chapitre 1, `Math.max(1, …)` rendait
  le même adversaire en annonçant l'avoir allégé.
*/
const enDifficulte = { ...PROGRESSION_INITIALE, losingStreak: SEUIL_COUP_DE_MAIN }
for (const c of CHAPITRES) {
  const allege = niveauAllege(c)
  const effectif = niveauEffectif(c, enDifficulte)
  const juste =
    c.niveau === 1
      ? allege === null && effectif === c.niveau
      : allege === c.niveau - 1 && effectif === allege
  check(
    `chapitre ${String(c.numero).padStart(2)} — coup de main d’un seul cran`,
    juste,
    `niveau ${c.niveau} → ${allege}`,
  )
}

console.log('\n♟  Rangs et expérience\n')

check('six rangs', RANGS.length === 6)
check('le premier rang part de zéro', RANGS[0].seuil === 0)
check(
  'les seuils sont strictement croissants',
  RANGS.every((r, i) => i === 0 || r.seuil > RANGS[i - 1].seuil),
)

// Une carrière parfaite doit atteindre le dernier rang, sinon le sommet de
// l'échelle est décoratif. Une carrière minimale ne doit pas y arriver, sinon
// c'est l'échelle entière qui l'est.
const xpParfaite = CHAPITRES.reduce(
  (somme, c) =>
    somme +
    XP.lecon +
    XP.puzzle * c.puzzles +
    XP.victoire * c.victoires +
    XP.chapitre +
    XP.etoile * 3,
  0,
)
const xpMinimale = xpParfaite - CHAPITRES.length * XP.etoile * 2
check(
  'une carrière sans faute atteint le dernier rang',
  rangPour(xpParfaite).suivant === null,
  `${xpParfaite} points, rang « ${rangPour(xpParfaite).rang.id} »`,
)
check(
  'une carrière à une étoile ne l’atteint pas',
  rangPour(xpMinimale).suivant !== null,
  `${xpMinimale} points, rang « ${rangPour(xpMinimale).rang.id} »`,
)
console.log(`  ✓ carrière sans faute : ${xpParfaite} points → ${rangPour(xpParfaite).rang.id}`)
console.log(`  ✓ carrière minimale  : ${xpMinimale} points → ${rangPour(xpMinimale).rang.id}`)

check('la barre est pleine au dernier rang', rangPour(99999).fraction === 1)
check('la barre part de zéro', rangPour(0).fraction === 0)

/*
  Le détail des points doit faire le compte.

  `detailXp` reconstitue d'où viennent les points — la pastille de l'accueil
  l'ouvre et l'affiche ligne par ligne. Il ne lit aucun journal : il déduit tout
  des chapitres franchis. Si la route d'accueil se met un jour à accorder de
  l'expérience pour un geste que cette déduction ignore, la somme des lignes
  cessera de retomber sur le total, et le panneau affichera une ligne
  « non détaillés » à tout le monde. Autant s'en apercevoir ici.
*/
const carriereFinie = {
  ...PROGRESSION_INITIALE,
  chapter: CARRIERE_TERMINEE,
  stars: Object.fromEntries(CHAPITRES.map((c) => [String(c.numero), 3])),
}
check(
  'le détail des points retombe sur une carrière sans faute',
  detailXp(carriereFinie).total === xpParfaite,
  `${detailXp(carriereFinie).total} détaillés pour ${xpParfaite} accordés`,
)
check('une carrière vierge n’a aucune ligne de détail', detailXp(PROGRESSION_INITIALE).total === 0)

console.log('\n♟  Étoiles et hauts faits\n')

check('sans aide ni défaite : trois étoiles', etoilesPour({ aides: 0, defaites: 0 }) === 3)
check('deux aides : deux étoiles', etoilesPour({ aides: 2, defaites: 0 }) === 2)
check('trois aides : une étoile', etoilesPour({ aides: 3, defaites: 0 }) === 1)
check('deux défaites : une étoile', etoilesPour({ aides: 0, defaites: 2 }) === 1)
check('jamais zéro étoile', etoilesPour({ aides: 99, defaites: 99 }) >= 1)

check('onze hauts faits', HAUTS_FAITS.length === 11)
check('identifiants uniques', new Set(HAUTS_FAITS.map((h) => h.id)).size === HAUTS_FAITS.length)
check(
  'chaque haut fait annonce sa condition',
  HAUTS_FAITS.every((h) => h.condition.length > 10),
)

console.log('\n♟  Parcours\n')

// Sur une progression vierge, le premier chapitre doit proposer la leçon, et
// rien d'autre. C'est la promesse du mode : un seul bouton, et il sait où il va.
const premier = CHAPITRES[0]
const depart = prochaineEtape(premier, PROGRESSION_INITIALE)
check('on démarre par la leçon', depart?.cle === 'lecon', depart?.cle ?? 'aucune étape')
check('le lien de leçon porte le chapitre', depart?.lien.includes('carriere=1') === true)

const apresLecon = { ...PROGRESSION_INITIALE, lessonDone: true }
check('puis les puzzles', prochaineEtape(premier, apresLecon)?.cle === 'puzzles')

const apresPuzzles = { ...apresLecon, puzzlesDone: premier.puzzles }
check('puis le duel', prochaineEtape(premier, apresPuzzles)?.cle === 'duel')

const fini = { ...apresPuzzles, winsInChapter: premier.victoires }
check('puis plus rien à faire', prochaineEtape(premier, fini) === null)
check(
  'les trois étapes sont alors terminées',
  etapesDe(premier, fini).every((e) => e.termine),
)

console.log(
  failures === 0
    ? `\n✓ ${checks} vérifications passées\n`
    : `\n✗ ${failures} échec(s) sur ${checks} vérifications\n`,
)
process.exit(failures === 0 ? 0 : 1)
