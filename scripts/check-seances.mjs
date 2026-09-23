#!/usr/bin/env node
/**
 * Vérifie que les thèmes de séance sont réellement mesurables.
 *
 * Une séance pédagogique annonce un thème avant la partie et promet un bilan :
 * « le thème est apparu quatre fois pour toi, six fois contre toi ». Ce bilan
 * vient de `detectPositionMotifs`, qui lit une position et rend les motifs
 * présents.
 *
 * Le piège, et il s'est refermé : le type `MotifId` compte une soixantaine
 * d'identifiants, le détecteur de **position** n'en produit qu'une trentaine.
 * Les autres — `tempo`, `weakSquare`, `xRayAttack`, `pawnMajority` — ne se
 * déduisent que du contexte d'un coup, pas d'un plateau. Un thème qui les cite
 * compile, se relit très bien, et affiche « 0 pour toi, 0 contre toi » à chaque
 * partie, sans que rien ne le signale. C'est le pire cas : une fonctionnalité
 * qui a l'air de marcher.
 *
 * Le contrôle est donc **empirique** plutôt que déclaratif : on rejoue de
 * vraies parties et on regarde ce que le détecteur produit vraiment. Pas de
 * liste d'identifiants tenue à la main quelque part, qui dériverait du code le
 * jour où le détecteur gagne un motif.
 *
 * Une séance est refusée quand **aucun** de ses motifs n'a été observé une seule
 * fois dans tout le corpus. C'est un seuil volontairement bas : certains motifs
 * sont rares, et rien ne garantit qu'une partie donnée en contienne. Zéro sur
 * l'ensemble, en revanche, veut dire que le thème est aveugle.
 *
 * Usage :  node scripts/check-seances.mjs
 */

import { Chess } from 'chess.js'
import { detectPositionMotifs } from '../packages/core/src/motifs.ts'

const { THEMES_SEANCE } = await import('../apps/web/src/lib/game/themesSeance.ts')

/**
 * Le corpus.
 *
 * Des ouvertures jouées jusqu'au milieu de partie, et des positions construites
 * pour les phases qu'une ouverture n'atteint jamais. Les deux sont nécessaires :
 *
 *  - une partie réelle est le seul moyen de vérifier que les motifs d'ouverture
 *    et de milieu — développement, colonnes, avant-postes, clouages —
 *    apparaissent *en cours de route* et pas seulement dans un cas d'école ;
 *  - une position construite est le seul moyen raisonnable d'atteindre une
 *    finale de pions passés ou un roi dénudé. Y arriver par quarante coups
 *    légaux écrits à la main, c'est quarante occasions de se tromper de
 *    notation, et on l'a vérifié — deux des cinq suites de la première version
 *    contenaient un coup illégal.
 *
 * Ce sont des suites légales, pas des parties célèbres : ce qu'on mesure ici est
 * le détecteur, pas la qualité du jeu.
 */
const CORPUS = [
  // Italienne, centre ouvert, échanges au centre.
  {
    nom: 'italienne ouverte',
    coups: `e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5
            Qb3 Nce7 O-O O-O Rfe1 c6 a4 Qb6 Qxb6 axb6 Ne4 Bf5 Nc3 Nxc3 bxc3 Rfe8`,
  },
  // Française fermée : chaîne de pions, colonne c, fou enfermé.
  // `Ncxd4` et non `Nxd4` : les deux cavaliers noirs atteignent d4 à ce
  // moment-là, et la notation sans précision est ambiguë donc refusée.
  {
    nom: 'française fermée',
    coups: `e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3 Nh6 b4 cxd4 cxd4 Nf5 Bb2 Bd7 Bd3 Ncxd4
            Nxd4 Nxd4 Bxd4 Qxd4 Nd2 Bc6 O-O Be7 Nf3 Qb6`,
  },
  // Sicilienne, roques opposés pour de bon : les deux rois roquent, chacun de
  // son côté. La première version laissait le roi noir au centre, et le motif
  // `oppositeCastling` n'apparaissait donc jamais.
  {
    nom: 'sicilienne roques opposés',
    coups: `e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 O-O-O d5 exd5 Nxd5
            Nxc6 bxc6 Bd4 Bxd4 Qxd4 Qb6 Na4 Qc7 h4 h5 Qc5 Rb8`,
  },
  // Est-indienne : gros centre, avant-postes, attaque d'aile.
  {
    nom: 'est-indienne',
    coups: `d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 Ne1 Nd7 Nd3 f5
            Bd2 Nf6 f3 f4 c5 g5 Rc1 Ng6 Nb5 Rf7 Ba5 b6 cxd6 cxd6 Nxa7 Bf8 Nb5 h5`,
  },
  // Finale de pions passés : deux pions blancs que rien n'arrête.
  {
    nom: 'finale de pions passés',
    depart: '6k1/5ppp/8/8/1P6/8/P4PPP/6K1 w - - 0 1',
    coups: 'b5 Kf8 b6 Ke7 b7 Kd7 b8=Q Kc6',
  },
  // Tour derrière le pion passé, et deux rois sans abri : la configuration
  // exacte des finales, qu'aucune ouverture ne produit.
  {
    nom: 'tour derrière le passé',
    depart: '8/8/5k2/8/1P6/8/5K2/1R6 w - - 0 1',
    coups: 'b5 Ke6 b6 Kd6 Ke3 Kc6 Kd4 Kb7',
  },
  // Roi dénudé, dame et tour dessus : le cas du motif `exposedKing`.
  {
    nom: 'roi exposé',
    depart: '3r4/5kp1/8/4Q3/8/8/5PPP/3R2K1 w - - 0 1',
    coups: 'Rxd8 Kg6 Qe4+ Kh6 Rd6+ g6 Qf4+ Kh5',
  },
]

let erreurs = 0

console.log(`\n🎣  Séances pédagogiques — ${THEMES_SEANCE.length} thèmes`)

/** Tout ce que le détecteur a produit sur le corpus, avec son compte. */
const observes = new Map()

for (const partie of CORPUS) {
  const echiquier = partie.depart ? new Chess(partie.depart) : new Chess()
  let joues = 0

  // La position de départ compte elle aussi : une finale construite porte
  // souvent son motif dès le premier regard, avant qu'aucun coup ne soit joué.
  for (const motif of detectPositionMotifs(echiquier, { minWeight: 0.25 })) {
    observes.set(motif.id, (observes.get(motif.id) ?? 0) + 1)
  }

  for (const san of partie.coups.split(/\s+/).filter(Boolean)) {
    try {
      echiquier.move(san)
    } catch (erreur) {
      erreurs++
      console.error(`  ✗ ${partie.nom} — coup ${joues + 1} injouable : ${san} (${erreur.message})`)
      break
    }
    joues++

    for (const motif of detectPositionMotifs(echiquier, { minWeight: 0.25 })) {
      observes.set(motif.id, (observes.get(motif.id) ?? 0) + 1)
    }
  }

  if (joues > 0) console.log(`  · ${partie.nom} — ${joues} demi-coups`)
}

console.log('')

const identifiants = new Set()
for (const theme of THEMES_SEANCE) {
  // Un identifiant en double entre deux thèmes est parfaitement légitime — les
  // colonnes ouvertes et la dernière rangée partagent `seventhRank`. Seul le
  // doublon **dans un même thème** est une faute de recopie, et il gonflerait
  // les compteurs du bilan.
  const vus = new Set()
  for (const motif of theme.motifs) {
    if (vus.has(motif)) {
      erreurs++
      console.error(`  ✗ ${theme.id} — motif « ${motif} » listé deux fois`)
    }
    vus.add(motif)
  }

  if (identifiants.has(theme.id)) {
    erreurs++
    console.error(`  ✗ identifiant de thème en double : ${theme.id}`)
  }
  identifiants.add(theme.id)

  if (theme.motifs.length === 0) {
    erreurs++
    console.error(`  ✗ ${theme.id} — aucun motif : le bilan n'aurait rien à compter`)
    continue
  }

  const total = theme.motifs.reduce((somme, motif) => somme + (observes.get(motif) ?? 0), 0)
  const muets = theme.motifs.filter((motif) => !observes.has(motif))

  if (total === 0) {
    erreurs++
    console.error(
      `  ✗ ${theme.id} — aucun de ses motifs (${theme.motifs.join(', ')}) n'apparaît dans le corpus : le bilan affichera toujours zéro`,
    )
    continue
  }

  const detail = muets.length > 0 ? `  (jamais vus ici : ${muets.join(', ')})` : ''
  console.log(`  ✓ ${theme.icone} ${theme.nom} — ${total} apparitions${detail}`)
}

// Les paliers cités doivent exister, sinon le thème n'est proposé nulle part.
// `palier.ts` n'emprunte l'alias `@/` que pour des types, que Node efface : on
// lit donc la vraie liste plutôt qu'une copie qui pourrait dériver.
const { PALIERS, palierPour, niveauBotPour, eloRepere } =
  await import('../apps/web/src/lib/apprendre/palier.ts')
const PALIERS_CONNUS = new Set(PALIERS.map((palier) => palier.id))
for (const theme of THEMES_SEANCE) {
  for (const palier of theme.paliers) {
    if (!PALIERS_CONNUS.has(palier)) {
      erreurs++
      console.error(`  ✗ ${theme.id} — palier inconnu : ${palier}`)
    }
  }
}
for (const palier of PALIERS_CONNUS) {
  if (!THEMES_SEANCE.some((theme) => theme.paliers.includes(palier))) {
    erreurs++
    console.error(`  ✗ le palier « ${palier} » n'a aucun thème de séance`)
  }
}

/*
  L'adversaire d'une séance est celui que conseille `suggestedLevel`.

  Chaque palier portait son niveau d'ordinateur écrit à la main, pendant que le
  test de niveau, l'accueil et le bienvenue passaient par `suggestedLevel`. Pour
  un même joueur, les deux s'écartaient de 150 à 400 Elo. On vérifie, sur toute
  l'échelle, que la séance conseille le même adversaire que le test pour un
  joueur de ce palier, et que sans mesure elle prend celui du milieu du palier.
*/
const { suggestedLevel, botLevel } = await import('../packages/core/src/bots.ts')
console.log('')
for (let elo = 0; elo <= 3000; elo += 10) {
  if (niveauBotPour(palierPour(elo), elo) !== suggestedLevel(elo)) {
    erreurs++
    console.error(`  ✗ à ${elo} Elo, la séance et le test ne conseillent pas le même adversaire`)
  }
}
for (const palier of PALIERS) {
  const niveau = niveauBotPour(palier)
  if (niveau !== suggestedLevel(eloRepere(palier))) {
    erreurs++
    console.error(`  ✗ ${palier.id} — sans mesure, l'adversaire n'est pas celui du milieu`)
  }
  console.log(`  ✓ palier ${palier.id.padEnd(17)} → adversaire à ${botLevel(niveau).elo} Elo`)
}

if (erreurs > 0) {
  console.error(`\n❌  ${erreurs} problème${erreurs > 1 ? 's' : ''} dans les séances.\n`)
  process.exit(1)
}

console.log(`\n✅  ${THEMES_SEANCE.length} thèmes mesurables, tous les paliers couverts.\n`)
