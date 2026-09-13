#!/usr/bin/env node
/**
 * Vérifie qu'un résultat déclaré ne peut plus contredire l'échiquier.
 *
 * `POST /api/parties/terminee` rejouait les coups pour s'assurer qu'ils
 * étaient légaux, puis appliquait le Glicko sur le résultat **annoncé par le
 * client**, sans jamais recouper l'un avec l'autre. Un `fetch` écrit à la main
 * — dix coups d'ouverture légaux, `result: '1-0'`, `botLevel: 25` — remontait
 * le classement sans qu'aucune partie ait eu lieu.
 *
 * La règle tient en deux temps, et c'est elle qu'on contrôle ici :
 *
 *  1. Si la position **impose** un résultat (mat, pat, matériel insuffisant,
 *     répétition, cinquante coups), le déclaré doit lui être égal.
 *  2. Sinon la partie s'est terminée hors de l'échiquier — abandon, drapeau,
 *     accord — et rien ne peut le prouver : seul ce qui **défavorise** le
 *     joueur est accepté au classement.
 *
 * Ce fichier ne teste pas la route, il teste `resultatImpose()`, la fonction
 * du cœur sur laquelle elle repose, plus la règle du point 2 reproduite ici à
 * l'identique. La route elle-même se vérifie par un `curl` — voir le journal
 * de `docs/CHANTIER-AUDIT.md`.
 *
 * Usage :  node --experimental-strip-types scripts/check-partie-terminee.mjs
 */

const { Chess } = await import('chess.js')
const { resultatImpose } = await import('../packages/core/src/pgn.ts')
const { START_FEN } = await import('../packages/core/src/index.ts')

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

/** Rejoue une suite de coups, comme la route le fait avant de vérifier. */
function apres(coups, fen) {
  const echiquier = new Chess(fen)
  for (const san of coups) echiquier.move(san)
  return echiquier
}

/**
 * La décision de la route, reproduite ligne pour ligne.
 *
 * Rend `'refusé'`, `'classée'` ou `'archivée'` — ce troisième cas étant la
 * partie qu'on garde dans l'historique mais qu'on ne compte pas au classement.
 */
function decision(echiquier, declare, camp, startFen = null) {
  const impose = resultatImpose(echiquier)
  if (impose && impose !== declare) return 'refusé'
  const gagneeParLeJoueur = declare !== '1/2-1/2' && (declare === '1-0') === (camp === 'w')
  const verifiable = impose !== null || !gagneeParLeJoueur
  const depuisLeDebut = startFen ? memePosition(startFen, START_FEN) : true
  return verifiable && depuisLeDebut ? 'classée' : 'archivée'
}

/** `memePosition` de la route : les quatre premiers champs, pas les compteurs. */
function memePosition(a, b) {
  const champs = (fen) => fen.trim().split(/\s+/).slice(0, 4).join(' ')
  return champs(a) === champs(b)
}

console.log('\n♟  Ce que la position impose\n')

// Le mat du berger : les Noirs sont matés, donc « 1-0 » et rien d'autre.
const berger = ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#']
check('un mat des Blancs impose 1-0', resultatImpose(apres(berger)) === '1-0')

// Le mat du lion, quatre demi-coups : ce sont les Blancs qui sont matés.
const fou = ['f3', 'e5', 'g4', 'Qh4#']
check('un mat des Noirs impose 0-1', resultatImpose(apres(fou)) === '0-1')

// Pat classique : les Noirs ont le trait et aucun coup légal, sans être en échec.
const pat = '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'
check('un pat impose la nulle', resultatImpose(new Chess(pat)) === '1/2-1/2')

check(
  'roi contre roi impose la nulle',
  resultatImpose(new Chess('7k/8/6K1/8/8/8/8/8 w - - 0 1')) === '1/2-1/2',
)

check(
  'la règle des cinquante coups impose la nulle',
  // Le compteur de demi-coups est à 100 : la nulle est acquise.
  resultatImpose(new Chess('7k/8/6K1/8/8/8/5R2/r7 w - - 100 80')) === '1/2-1/2',
)

check(
  'une position vivante n’impose rien',
  resultatImpose(apres(['e4', 'e5', 'Nf3', 'Nc6'])) === null,
)

console.log('\n♟  Ce que la route accepte\n')

const matDesNoirs = apres(berger) // les Blancs ont maté
const vivante = apres(['e4', 'e5', 'Nf3', 'Nc6'])

check('mat des Blancs déclaré 0-1 → refusé', decision(matDesNoirs, '0-1', 'w') === 'refusé')
check('mat des Blancs déclaré 1-0 → accepté', decision(matDesNoirs, '1-0', 'w') === 'classée')
check('pat déclaré 1-0 → refusé', decision(new Chess(pat), '1-0', 'w') === 'refusé')
check('pat déclaré nulle → accepté', decision(new Chess(pat), '1/2-1/2', 'w') === 'classée')

// Le cœur du correctif : une victoire que rien ne prouve ne compte plus.
check(
  'position vivante, victoire du joueur → archivée sans classement',
  decision(vivante, '1-0', 'w') === 'archivée',
)
check(
  'position vivante, victoire du joueur noir → archivée sans classement',
  decision(vivante, '0-1', 'b') === 'archivée',
)
check('position vivante, défaite du joueur → classée', decision(vivante, '0-1', 'w') === 'classée')
check('position vivante, nulle → classée', decision(vivante, '1/2-1/2', 'w') === 'classée')

console.log('\n♟  D’où part une partie classée\n')

/*
  Le mat le moins cher du monde : dame et roi contre roi seul, une position
  qu'on écrit dans l'éditeur en dix secondes. Les coups sont légaux, le mat est
  réel, la position impose « 1-0 » — tout ce que la route vérifiait était vrai.
  Seul le point de départ trahit la partie.
*/
const depart = '7k/8/8/8/8/8/6Q1/6K1 w - - 0 1'
const matExpress = apres(
  ['Kf2', 'Kh7', 'Kf3', 'Kh8', 'Kf4', 'Kh7', 'Kf5', 'Kh8', 'Kf6', 'Kh7', 'Qg7#'],
  depart,
)

// Onze demi-coups : la partie passe aussi le minimum, ce qui est bien le
// problème — aucune des autres bornes ne la retenait.
check('le mat est bien un mat', resultatImpose(matExpress) === '1-0')
check(
  'victoire depuis une position d’éditeur → archivée sans classement',
  decision(matExpress, '1-0', 'w', depart) === 'archivée',
)
check(
  'la même victoire depuis le début resterait classée',
  decision(matDesNoirs, '1-0', 'w', START_FEN) === 'classée',
)
check(
  'une FEN initiale aux compteurs différents reste la position initiale',
  decision(matDesNoirs, '1-0', 'w', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 0') ===
    'classée',
)
check('pas de startFen du tout → classée', decision(matDesNoirs, '1-0', 'w', null) === 'classée')

console.log(
  failures === 0
    ? `\n✓ ${checks} vérifications passées\n`
    : `\n✗ ${failures} échec(s) sur ${checks} vérifications\n`,
)
process.exit(failures === 0 ? 0 : 1)
