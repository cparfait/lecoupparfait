#!/usr/bin/env node
/**
 * Étalonne la conversion entre l'échelle des puzzles et celle des parties.
 *
 * `puzzleVersPartie` vaut `300 + 0,6 c` — une droite calée sur deux ancrages
 * lus dans la littérature, et dont le commentaire d'origine annonçait un
 * troisième point qui ne tombait pas dessus. Cent points d'écart en bas
 * d'échelle, sur chaque résultat de test de niveau, selon la droite qu'on
 * retient.
 *
 * On ne tranche pas une question pareille à l'estime : on la mesure sur les
 * comptes qui ont **les deux** classements. Ce script sort la droite des
 * moindres carrés, sa corrélation, et ce qu'elle donnerait comparée à la
 * formule en place.
 *
 * ── Ce qu'il faut avant d'y croire ──────────────────────────────────────────
 *
 * Une trentaine de comptes, au bas mot, et des classements non provisoires des
 * deux côtés — sinon on ajuste une droite sur du bruit. Le script le dit
 * lui-même : il refuse de conclure en dessous, et se contente d'afficher ce
 * qu'il a trouvé.
 *
 * Usage :  node --experimental-strip-types --env-file=.env scripts/etalonner-conversion.mjs
 */

const { getDb, sql } = await import('../packages/db/src/index.ts')
const { RD_ETABLI } = await import('../packages/core/src/rating.ts')

/** En dessous, la droite ne mesure que le hasard du petit nombre. */
const MINIMUM_COMPTES = 30
/** Parties et tentatives minimales pour qu'un classement soit pris au sérieux. */
const MINIMUM_PARTIES = 10

const db = getDb()

/*
  Un compte, deux classements.

  Le classement de partie retenu est celui de la **catégorie la plus jouée**,
  comme partout ailleurs dans l'application : quelqu'un qui a 1 800 en bullet
  sur douze parties et 1 250 en rapide sur trois cents est un joueur de 1 250.
*/
const lignes = await db.execute(sql`
  with partie as (
    select distinct on (user_id) user_id, rating, games, deviation
      from ratings
     where category <> 'puzzle' and games >= ${MINIMUM_PARTIES}
     order by user_id, games desc
  ),
  puzzle as (
    select user_id, rating, games, deviation
      from ratings
     where category = 'puzzle' and games >= ${MINIMUM_PARTIES}
  )
  select p.user_id,
         z.rating as cote_puzzle,
         p.rating as cote_partie,
         z.games  as tentatives,
         p.games  as parties,
         z.deviation as rd_puzzle,
         p.deviation as rd_partie
    from partie p
    join puzzle z on z.user_id = p.user_id`)

const points = [...lignes].map((l) => ({
  puzzle: Number(l.cote_puzzle),
  partie: Number(l.cote_partie),
  etabli: Number(l.rd_puzzle) <= RD_ETABLI && Number(l.rd_partie) <= RD_ETABLI,
}))

console.log(
  `\n  ${points.length} compte(s) ont les deux classements avec au moins ${MINIMUM_PARTIES} parties.`,
)
const solides = points.filter((p) => p.etabli)
console.log(`  ${solides.length} d'entre eux ne sont plus provisoires des deux côtés.\n`)

if (points.length === 0) {
  console.log('  Rien à étalonner pour le moment. La formule en place reste la seule hypothèse.\n')
  process.exit(0)
}

/** Moindres carrés ordinaires : partie = a · puzzle + b. */
function droite(echantillon) {
  const n = echantillon.length
  const mx = echantillon.reduce((s, p) => s + p.puzzle, 0) / n
  const my = echantillon.reduce((s, p) => s + p.partie, 0) / n
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (const p of echantillon) {
    sxy += (p.puzzle - mx) * (p.partie - my)
    sxx += (p.puzzle - mx) ** 2
    syy += (p.partie - my) ** 2
  }
  if (sxx === 0) return null
  const a = sxy / sxx
  return { a, b: my - a * mx, r: sxy / Math.sqrt(sxx * syy), n }
}

const actuelle = (c) => Math.round(300 + 0.6 * c)

for (const [nom, echantillon] of [
  ['tous les comptes', points],
  ['classements établis seulement', solides],
]) {
  if (echantillon.length < 2) continue
  const d = droite(echantillon)
  if (!d) continue
  console.log(`  ── ${nom} (${d.n}) ──`)
  console.log(
    `     mesurée : partie = ${d.a.toFixed(3)} × puzzle ${d.b >= 0 ? '+' : '−'} ${Math.abs(d.b).toFixed(0)}`,
  )
  console.log(`     corrélation r = ${d.r.toFixed(3)}`)
  for (const c of [800, 1200, 1600, 2000]) {
    const mesuree = Math.round(d.a * c + d.b)
    console.log(
      `     ${c} en puzzles : ${String(mesuree).padStart(4)} mesuré contre ${String(actuelle(c)).padStart(4)} par la formule (${mesuree - actuelle(c) >= 0 ? '+' : ''}${mesuree - actuelle(c)})`,
    )
  }
  console.log()
}

if (solides.length < MINIMUM_COMPTES) {
  console.log(
    `  ⚠  Moins de ${MINIMUM_COMPTES} comptes établis : ces droites sont indicatives.\n     Ne pas toucher à \`puzzleVersPartie\` sur cette base.\n`,
  )
} else {
  console.log(
    `  ✅ Échantillon suffisant. La droite « classements établis » peut remplacer\n     \`puzzleVersPartie\` dans apps/web/src/lib/apprendre/palier.ts.\n`,
  )
}

process.exit(0)
