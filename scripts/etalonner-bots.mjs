#!/usr/bin/env node
/**
 * Les adversaires jouent-ils au niveau qu'ils annoncent ?
 *
 * La question s'est posée en montant Stockfish de 18 à 19. L'échelle se coupe
 * en deux, et les deux moitiés ne courent pas le même risque :
 *
 *  - **au-dessus de 1320 Elo**, les niveaux passent par `UCI_LimitStrength` +
 *    `UCI_Elo`, le brideur officiel de Stockfish. L'amont le réétalonne à
 *    chaque version : cette moitié suit toute seule, c'est tout l'intérêt de
 *    s'appuyer dessus ;
 *  - **en dessous**, il n'y a plus de brideur. `Skill Level` 0–1, un ou deux
 *    demi-coups, quelques centaines de nœuds, et un tirage à température. À
 *    cette profondeur la force vient presque entièrement de l'évaluation,
 *    c'est-à-dire du réseau — celui-là même qui a changé d'architecture.
 *
 * Rien ne surveillait cette moitié : aucun test ne protesterait si un bot
 * « débutant » s'était mis à jouer deux cents points au-dessus de son étiquette.
 * Et c'est la tranche qui porte le public du projet.
 *
 * ── Comment on mesure ───────────────────────────────────────────────────────
 *
 * On ne peut pas confronter un bot de 550 à une référence de 1320 : il perdrait
 * toutes les parties, et un score de zéro ne dit rien d'autre que « plus
 * faible ». On procède donc **par proche voisin** : chaque niveau affronte le
 * suivant, ce qui donne un écart mesuré par couple. La chaîne est ensuite
 * ancrée sur le premier niveau bridé par `UCI_Elo`, dont l'Elo fait foi, et
 * l'on redescend d'écart en écart jusqu'en bas.
 *
 * L'écart se tire du score par la formule d'espérance Elo inversée :
 * `d = −400 log₁₀(1/s − 1)`. Un score nul ou parfait la fait diverger — on le
 * borne alors, et le rapport signale que le couple n'a rien mesuré : deux
 * niveaux trop éloignés ne se mesurent pas l'un par l'autre.
 *
 * ── Le moteur employé ───────────────────────────────────────────────────────
 *
 * Celui du **navigateur**, `lite` et son réseau réduit, via
 * `scripts/moteur-wasm.mjs`. C'est là que tournent les bots ; le binaire natif
 * du serveur porte le réseau complet et ne joue pas pareil. Mesurer l'un pour
 * conclure sur l'autre serait une erreur de méthode.
 *
 * ── Ce que ça ne dit pas ────────────────────────────────────────────────────
 *
 * Une mesure par couple sur quelques dizaines de parties porte une marge de
 * l'ordre de ±100 points ; la chaîne accumule en plus l'erreur de chaque
 * maillon. C'est un détecteur de dérive grossière — « ce bot joue deux cents
 * points trop haut » —, pas un étalon.
 *
 * Usage :
 *   node scripts/etalonner-bots.mjs [--parties=20] [--du=1] [--au=8]
 */

import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { Chess } from 'chess.js'

const { BOT_LEVELS } = await import('../packages/core/src/bots.ts')
const { pickBotMove, uciOptionsFor } = await import('../packages/core/src/bots.ts')
const { MultiPvCollector, positionCommand, goCommand } = await import('../packages/core/src/uci.ts')

// ── Réglages ────────────────────────────────────────────────────────────────

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [cle, valeur] = a.replace(/^--/, '').split('=')
    return [cle, valeur ?? 'true']
  }),
)

const PARTIES = Number(args.parties ?? 20)
const DU = Number(args.du ?? 1)
const AU = Number(args.au ?? 8)
/**
 * Le moteur à mesurer : nom court, ou chemin vers un autre paquet.
 *
 * Une échelle mesurée seule ne dit pas si elle a dérivé, seulement où elle en
 * est. Pointer une version antérieure — installée de côté, hors du dépôt —
 * donne le second point, et c'est la différence entre « l'échelle est mal
 * graduée » et « la montée de version l'a déréglée ».
 */
const MOTEUR = args.moteur ?? 'lite-single'
/** Au-delà, on déclare nulle : une partie qui s'éternise ne départage rien. */
const COUPS_MAX = 180

// ── Le moteur ───────────────────────────────────────────────────────────────

/** Un moteur WebAssembly piloté en UCI, comme celui du navigateur. */
function ouvrirMoteur(quel = MOTEUR) {
  const enfant = spawn(process.execPath, ['scripts/moteur-wasm.mjs', quel], {
    stdio: ['pipe', 'pipe', 'inherit'],
  })
  const lecteur = createInterface({ input: enfant.stdout })
  /** Les abonnés à la ligne suivante. */
  let ecouteurs = []

  lecteur.on('line', (ligne) => {
    for (const ecouteur of ecouteurs) ecouteur(ligne)
  })

  const envoyer = (commande) => enfant.stdin.write(`${commande}\n`)

  /** Attend une ligne qui satisfait `predicat`, en collectant tout le reste. */
  const attendre = (predicat) =>
    new Promise((resolve) => {
      const collecte = []
      const ecouteur = (ligne) => {
        collecte.push(ligne)
        if (!predicat(ligne)) return
        ecouteurs = ecouteurs.filter((e) => e !== ecouteur)
        resolve(collecte)
      }
      ecouteurs.push(ecouteur)
    })

  return {
    async demarrer() {
      envoyer('uci')
      await attendre((l) => l === 'uciok')
      envoyer('setoption name Threads value 1')
      envoyer('setoption name Hash value 16')
    },
    async nouvellePartie() {
      envoyer('ucinewgame')
      envoyer('isready')
      await attendre((l) => l === 'readyok')
    },
    async reglages(config) {
      for (const [nom, valeur] of uciOptionsFor(config)) {
        envoyer(`setoption name ${nom} value ${valeur}`)
      }
      envoyer('isready')
      await attendre((l) => l === 'readyok')
    },
    /**
     * Les lignes MultiPV de la position, telles que le bot les verra.
     *
     * Par `MultiPvCollector`, et surtout pas en relisant `parseInfoLine` soi-
     * même. La première version de ce script le faisait, et la mesure était
     * fausse sans en avoir l'air : un moteur annonce son évaluation **du point
     * de vue du trait**, quand `pickBotMove` attend des scores côté blancs.
     * C'est le collecteur qui opère cette conversion — la sauter inversait le
     * classement des coups pour les noirs, qui choisissaient donc le pire coup
     * à chaque fois. Tous les couples rendaient alors exactement 0,50 : les
     * blancs gagnaient toujours, et l'alternance des couleurs recopiait
     * proprement cette symétrie en une fausse égalité.
     *
     * La leçon vaut d'être écrite ici : on mesure avec le code de production,
     * pas avec une relecture de ce qu'il est censé faire.
     */
    async chercher(fen, moves, config) {
      const collecteur = new MultiPvCollector(fen)
      envoyer(positionCommand(fen, moves))
      envoyer(
        goCommand({ depth: config.depth, nodes: config.nodes, movetimeMs: config.movetimeMs }),
      )
      const brut = await attendre((l) => /^bestmove/.test(l))
      for (const ligne of brut) collecteur.ingest(ligne)
      return collecteur.result()
    },
    fermer() {
      envoyer('quit')
      enfant.kill()
    },
  }
}

// ── Une partie ──────────────────────────────────────────────────────────────

/**
 * Fait jouer `blancs` contre `noirs`.
 *
 * Retourne le score du point de vue des blancs, **et comment la partie s'est
 * terminée**. Le second point n'est pas du confort : un harnais qui ne rend
 * qu'un score ne permet pas de distinguer une mesure d'un artefact. Une série
 * de nulles peut être un plateau équilibré — ou des parties avortées au premier
 * coup parce que le moteur n'a rien répondu, ce qui ne mesure plus rien du
 * tout. Le rapport compte donc les fins, et c'est ce qu'on lit en premier.
 */
async function jouerUnePartie(moteur, blancs, noirs) {
  const partie = new Chess()
  await moteur.nouvellePartie()
  const coups = []
  let fin = null

  while (!partie.isGameOver() && coups.length < COUPS_MAX) {
    const config = (partie.turn() === 'w' ? blancs : noirs).engine
    await moteur.reglages(config)
    const lignes = await moteur.chercher(partie.fen(), [], config)
    if (lignes.length === 0) {
      fin = 'moteur muet'
      break
    }

    const choix = pickBotMove(partie.fen(), lignes, config)
    if (!choix) {
      fin = 'aucun coup choisi'
      break
    }

    try {
      partie.move({
        from: choix.uci.slice(0, 2),
        to: choix.uci.slice(2, 4),
        promotion: choix.uci[4] ?? undefined,
      })
    } catch {
      fin = 'coup illégal'
      break
    }
    coups.push(choix.uci)
  }

  if (fin === null) {
    if (partie.isCheckmate()) fin = 'mat'
    else if (partie.isStalemate()) fin = 'pat'
    else if (partie.isInsufficientMaterial()) fin = 'matériel insuffisant'
    else if (partie.isDraw()) fin = 'nulle (50 coups ou répétition)'
    else fin = 'limite de coups'
  }

  const score = partie.isCheckmate() ? (partie.turn() === 'w' ? 0 : 1) : 0.5
  return { score, coups: coups.length, fin }
}

// ── L'écart mesuré ──────────────────────────────────────────────────────────

/** L'écart Elo qu'implique un score, ou `null` quand le score est extrême. */
function ecartDepuisScore(score) {
  if (score <= 0 || score >= 1) return null
  return -400 * Math.log10(1 / score - 1)
}

// ── Le déroulé ──────────────────────────────────────────────────────────────

console.log('\n♟  Étalonnage des adversaires artificiels')
console.log(`   moteur : ${MOTEUR}`)
console.log(`   ${PARTIES} parties par couple · niveaux ${DU} à ${AU}\n`)

const moteur = ouvrirMoteur()
await moteur.demarrer()

const couples = []

for (let niveau = DU; niveau < AU; niveau++) {
  const bas = BOT_LEVELS[niveau - 1]
  const haut = BOT_LEVELS[niveau]
  if (!bas || !haut) break

  let points = 0
  const fins = new Map()
  let totalCoups = 0

  for (let partie = 0; partie < PARTIES; partie++) {
    // Couleurs alternées : le trait vaut quelques dizaines de points.
    const basEstBlanc = partie % 2 === 0
    const issue = basEstBlanc
      ? await jouerUnePartie(moteur, bas, haut)
      : await jouerUnePartie(moteur, haut, bas)
    points += basEstBlanc ? issue.score : 1 - issue.score
    fins.set(issue.fin, (fins.get(issue.fin) ?? 0) + 1)
    totalCoups += issue.coups
    process.stdout.write(`\r   ${bas.elo} vs ${haut.elo} … ${partie + 1}/${PARTIES}   `)
  }

  const score = points / PARTIES
  const mesure = ecartDepuisScore(score)
  const annonce = haut.elo - bas.elo
  const resume = [...fins.entries()].map(([f, n]) => `${n} ${f}`).join(', ')
  couples.push({ bas, haut, score, mesure, annonce, fins, resume })
  process.stdout.write('\r' + ' '.repeat(50) + '\r')
  console.log(
    `   ${String(bas.elo).padStart(4)} vs ${String(haut.elo).padEnd(4)}` +
      ` · score ${score.toFixed(2)}` +
      ` · annoncé ${String(annonce).padStart(4)}` +
      ` · mesuré ${mesure === null ? '  — ' : String(Math.round(-mesure)).padStart(4)}` +
      ` · ${Math.round(totalCoups / PARTIES)} coups/partie`,
  )
  console.log(`        fins : ${resume}`)
}

moteur.fermer()

// ── Ce qu'on en conclut ─────────────────────────────────────────────────────

console.log('\n   Écarts entre niveaux voisins — « mesuré » est la force du niveau bas')
console.log('   relative au niveau haut. Un écart mesuré nettement plus petit que')
console.log('   l’annoncé signifie que les deux niveaux se ressemblent trop.\n')

const exploitables = couples.filter((c) => c.mesure !== null)
if (exploitables.length === 0) {
  console.log('   ✗ Aucun couple exploitable : tous les scores sont extrêmes.')
  console.log('     Augmente `--parties`, ou compare des niveaux plus proches.\n')
  process.exit(1)
}

const derives = exploitables.filter((c) => Math.abs(-c.mesure - c.annonce) > 150)
for (const c of derives) {
  console.log(
    `   ⚠  ${c.bas.elo} → ${c.haut.elo} : annoncé ${c.annonce}, mesuré ${Math.round(-c.mesure)}`,
  )
}

/*
  ── La chaîne, ancrée ────────────────────────────────────────────────────────

  Les écarts par couple ne disent rien d'absolu. On les raccroche donc au
  premier niveau bridé par `UCI_Elo` — celui dont l'Elo fait foi, puisque c'est
  Stockfish lui-même qui le tient — et l'on redescend : la force d'un niveau est
  celle de son voisin du dessus, plus l'écart mesuré entre les deux.

  L'erreur s'accumule à chaque maillon, et le rapport le dit plutôt que de le
  taire : plus on descend, plus le chiffre est mou. Un maillon manquant — score
  extrême, donc écart incalculable — casse la chaîne, et tout ce qui est en
  dessous devient inconnu.
*/
const ancre = couples.find((c) => c.haut.engine.uciElo !== undefined)
if (ancre) {
  console.log('\n   Force mesurée, chaînée depuis l’ancre UCI_Elo\n')
  console.log('   niveau   annoncé   mesuré   dérive')

  const mesures = new Map([[ancre.haut.level, ancre.haut.elo]])
  for (const couple of [...couples].reverse()) {
    const reference = mesures.get(couple.haut.level)
    if (reference === undefined || couple.mesure === null) continue
    mesures.set(couple.bas.level, reference + couple.mesure)
  }

  let rompue = false
  for (const couple of [...couples].reverse()) {
    const mesuree = mesures.get(couple.bas.level)
    if (mesuree === undefined) {
      rompue = true
      console.log(
        `   ${String(couple.bas.level).padStart(6)}   ${String(couple.bas.elo).padStart(7)}        —   chaîne rompue`,
      )
      continue
    }
    const derive = Math.round(mesuree - couple.bas.elo)
    const marque = Math.abs(derive) > 150 ? '  ⚠' : ''
    console.log(
      `   ${String(couple.bas.level).padStart(6)}   ${String(couple.bas.elo).padStart(7)}   ${String(Math.round(mesuree)).padStart(6)}   ${(derive > 0 ? '+' : '') + derive}${marque}`,
    )
  }

  if (rompue) {
    console.log('\n   Un maillon n’a pas pu être mesuré : tout ce qui est en dessous est inconnu.')
  }
  console.log('\n   Rappel : ±100 points de marge par maillon, qui s’accumulent en descendant.')
}

console.log(
  `\n   ${exploitables.length}/${couples.length} couples exploitables · ${derives.length} écart(s) au-delà de 150 points\n`,
)
