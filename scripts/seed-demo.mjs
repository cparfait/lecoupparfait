/**
 * Jeu de démonstration : des comptes, des parties, un carnet d'adresses.
 *
 * Une application vide ne se juge pas. Le classement affiche « aucun joueur »,
 * les profils n'ont pas de courbe, le carnet est désert : on ne voit ni la
 * densité de l'écran, ni ce qui déborde, ni ce qui manque. Ce script remplit
 * la base de quoi regarder.
 *
 *   node scripts/seed-demo.mjs           crée le jeu de démonstration
 *   node scripts/seed-demo.mjs --purge   l'efface, sans toucher au reste
 *
 * Les comptes portent tous le suffixe `_demo` : c'est ce qui permet de les
 * retrouver pour les effacer sans risquer d'emporter un vrai joueur.
 */

// Node ne lit pas `.env` de lui-même : les autres scripts sont lancés par
// Next ou par drizzle-kit, qui s'en chargent. Celui-ci tourne seul.
try {
  process.loadEnvFile(new URL('../.env', import.meta.url))
} catch {
  // Pas de fichier `.env` : la connexion viendra de l'environnement, ou
  // l'erreur suivante le dira clairement.
}

import { Chess } from 'chess.js'
import { createUser } from '@coupparfait/db/auth'
import { getDb, games, ratingHistory, ratings, users, friendships, challenges } from '@coupparfait/db'
import { eq, inArray, like } from 'drizzle-orm'

const SUFFIXE = '_demo'
const MOT_DE_PASSE = 'motdepasse1'

/**
 * Les habitants.
 *
 * Des niveaux étalés de 900 à 2000 : c'est ce qui rend le classement lisible,
 * et ce qui permet de voir comment se présente une ligne de débutant à côté
 * d'une ligne de joueur de club.
 */
const JOUEURS = [
  { pseudo: 'chris', avatar: '🦉', elo: 1240, pays: 'FR' },
  { pseudo: 'julien', avatar: '🐺', elo: 1642, pays: 'FR' },
  { pseudo: 'margaux', avatar: '🦊', elo: 1187, pays: 'FR' },
  { pseudo: 'theo', avatar: '🐉', elo: 1955, pays: 'BE' },
  { pseudo: 'salome', avatar: '🦋', elo: 1403, pays: 'FR' },
  { pseudo: 'nordine', avatar: '🐅', elo: 1290, pays: 'MA' },
  { pseudo: 'elodie', avatar: '🐧', elo: 1512, pays: 'CH' },
  { pseudo: 'lucas', avatar: '🦅', elo: 978, pays: 'FR' },
  { pseudo: 'amina', avatar: '🐬', elo: 1734, pays: 'DZ' },
  { pseudo: 'gaspard', avatar: '🦔', elo: 1096, pays: 'FR' },
  { pseudo: 'ines', avatar: '🐝', elo: 1868, pays: 'FR' },
  { pseudo: 'mathis', avatar: '🐢', elo: 1355, pays: 'CA' },
]

/**
 * Des parties entières, jouées et terminées.
 *
 * On rejoue de vraies suites plutôt que d'écrire des coups au hasard : le PGN
 * doit tenir debout si on l'ouvre dans l'analyse, et l'ouverture doit être
 * reconnue pour que la fiche de partie ne soit pas vide.
 */
const PARTIES = [
  {
    eco: 'C57', nom: 'Deux cavaliers, attaque Fried Liver',
    coups: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+ Ke6 Nc3 Ncb4 Qe4 c6 a3 Na6 d4 Nac7 Bxd5+ cxd5 Qxd5+ Ke7 Bg5+ Kd6 Qxd8+',
    resultat: '1-0', fin: 'resign',
  },
  {
    eco: 'C50', nom: 'Partie italienne',
    coups: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5 Qb3 Nce7 O-O O-O Rfe1 c6 a4 Qb6 Qxb6 axb6',
    resultat: '1/2-1/2', fin: 'agreement',
  },
  {
    eco: 'B01', nom: 'Défense scandinave',
    coups: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5 Bd2 e6 Qe2 Bb4 O-O-O Nbd7 a3 O-O-O axb4 Qxa1+ Nb1 Qxb1+ Kd2 Qxd1+',
    resultat: '0-1', fin: 'resign',
  },
  {
    eco: 'D02', nom: 'Système London',
    coups: 'd4 Nf6 Bf4 d5 Nf3 Bf5 e3 Nc6 Nc3 Nh5 Bb5 e6 O-O Nxf4 exf4 Bd6 g3 O-O Ne5 Qh4 Nxc6 bxc6 Bxc6 Rab8 Bxd5 exd5 Qxd5',
    resultat: '1-0', fin: 'timeout',
  },
  {
    eco: 'C00', nom: 'Défense française',
    coups: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 Bxe7 Qxe7 f4 O-O Nf3 c5 Qd2 Nc6 dxc5 Qxc5 O-O-O a6 Kb1 b5 Nd4 Nxd4 Qxd4 Qxd4 Rxd4',
    resultat: '1/2-1/2', fin: 'agreement',
  },
  {
    eco: 'B20', nom: 'Défense sicilienne',
    coups: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O O-O-O Nbd7 g4 b5 g5 b4 Ne2 Ne8 f4 a5',
    resultat: '0-1', fin: 'checkmate',
  },
  {
    eco: 'A40', nom: 'Ouverture du pion dame',
    coups: 'd4 e6 c4 b6 Nc3 Bb7 e4 Bb4 Bd3 f5 Qh5+ g6 Qe2 Nf6 exf5 gxf5 Bg5 O-O O-O-O Bxc3 bxc3 Qe8',
    resultat: '1-0', fin: 'resign',
  },
  {
    eco: 'C41', nom: 'Défense Philidor',
    coups: 'e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6 Bg5 b5 Nxb5 cxb5 Bxb5+ Nbd7 O-O-O Rd8 Rxd7 Rxd7 Rd1 Qe6 Bxd7+ Nxd7 Qb8+ Nxb8 Rd8#',
    resultat: '1-0', fin: 'checkmate',
  },
]

const CADENCES = [
  { initial: 180, increment: 0, speed: 'blitz' },
  { initial: 300, increment: 3, speed: 'blitz' },
  { initial: 600, increment: 5, speed: 'rapid' },
  { initial: 900, increment: 10, speed: 'rapid' },
]

/**
 * Suite pseudo-aléatoire reproductible.
 *
 * Deux exécutions doivent produire le même jeu : autrement, comparer deux
 * captures d'écran ne veut plus rien dire.
 */
function tirage(graine) {
  let etat = graine
  return () => {
    etat = (etat * 1664525 + 1013904223) % 4294967296
    return etat / 4294967296
  }
}

const alea = tirage(20260828)
const choisir = (liste) => liste[Math.floor(alea() * liste.length)]

/** Slug de partie, même alphabet que le reste de l'application. */
function slug() {
  const lettres = 'bcdfghjkmnpqrstvwxyz23456789'
  let out = ''
  for (let i = 0; i < 8; i++) out += lettres[Math.floor(alea() * lettres.length)]
  return out
}

async function purger(db) {
  const comptes = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(like(users.usernameLower, `%${SUFFIXE}`))

  if (comptes.length === 0) {
    console.log('Rien à effacer.')
    return
  }

  const ids = comptes.map((c) => c.id)
  // Les parties gardent `set null` sur les joueurs : on les efface donc à part,
  // sinon elles resteraient sans personne, dans le classement de personne.
  const parties = await db.select({ id: games.id, w: games.whiteId, b: games.blackId }).from(games)
  const aEffacer = parties.filter((g) => ids.includes(g.w) || ids.includes(g.b)).map((g) => g.id)
  if (aEffacer.length > 0) await db.delete(games).where(inArray(games.id, aEffacer))

  await db.delete(users).where(inArray(users.id, ids))
  console.log(`Effacé : ${comptes.length} comptes, ${aEffacer.length} parties.`)
}

async function semer(db) {
  // ── Comptes ─────────────────────────────────────────────────────────────
  const crees = []
  for (const joueur of JOUEURS) {
    const pseudo = joueur.pseudo + SUFFIXE
    const resultat = await createUser({ username: pseudo, password: MOT_DE_PASSE })
    if (!resultat.ok) {
      // Déjà présent : on le retrouve plutôt que d'échouer.
      const [existant] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.usernameLower, pseudo.toLowerCase()))
        .limit(1)
      if (!existant) throw new Error(`Compte ${pseudo} impossible : ${resultat.error}`)
      crees.push({ ...joueur, id: existant.id, pseudo })
      continue
    }
    crees.push({ ...joueur, id: resultat.user.id, pseudo })
  }

  // Avatars, pays, et une présence étalée : tout le monde connecté à la
  // seconde donnerait une liste d'amis irréaliste.
  for (const [index, joueur] of crees.entries()) {
    const minutes = index % 3 === 0 ? 1 : index % 3 === 1 ? 90 : 4000
    await db
      .update(users)
      .set({
        avatar: joueur.avatar,
        countryCode: joueur.pays,
        lastSeenAt: new Date(Date.now() - minutes * 60_000),
      })
      .where(eq(users.id, joueur.id))
  }
  console.log(`${crees.length} comptes.`)

  // ── Parties ─────────────────────────────────────────────────────────────
  //
  // Chacun doit en avoir au moins cinq : c'est le seuil en dessous duquel le
  // classement ne montre personne.
  const compteur = new Map(crees.map((j) => [j.id, 0]))
  const lignes = []
  let jour = 60

  for (let tour = 0; tour < 7; tour++) {
    for (let i = 0; i < crees.length; i++) {
      const blanc = crees[i]
      const noir = crees[(i + 1 + tour) % crees.length]
      if (blanc.id === noir.id) continue

      const modele = PARTIES[(i + tour) % PARTIES.length]
      const cadence = choisir(CADENCES)

      // On rejoue la partie pour obtenir un PGN valide et le nombre de coups.
      const board = new Chess()
      const sans = modele.coups.split(' ')
      for (const san of sans) {
        try {
          board.move(san)
        } catch {
          break
        }
      }

      const gagnant = modele.resultat === '1-0' ? 'w' : modele.resultat === '0-1' ? 'b' : null
      const ecart = gagnant === null ? 2 : 12 + Math.floor(alea() * 10)
      jour -= 0.4
      const fin = new Date(Date.now() - jour * 24 * 3600 * 1000)

      lignes.push({
        slug: slug(),
        mode: 'friend',
        speed: cadence.speed,
        rated: true,
        whiteId: blanc.id,
        blackId: noir.id,
        whiteName: blanc.pseudo,
        blackName: noir.pseudo,
        whiteRating: blanc.elo,
        blackRating: noir.elo,
        whiteRatingDelta: gagnant === 'w' ? ecart : gagnant === 'b' ? -ecart : 0,
        blackRatingDelta: gagnant === 'b' ? ecart : gagnant === 'w' ? -ecart : 0,
        initialTime: cadence.initial,
        increment: cadence.increment,
        moves: board.history().join(' '),
        pgn: board.pgn(),
        status: modele.fin === 'checkmate' ? 'checkmate' : modele.fin === 'timeout' ? 'timeout' : modele.fin === 'agreement' ? 'draw' : 'resigned',
        result: modele.resultat,
        winner: gagnant,
        eco: modele.eco,
        opening: modele.nom,
        // `createdAt` vaut `now()` par défaut : sans le poser, les listes
        // triées dessus affichaient quatre-vingts parties « aujourd'hui ».
        createdAt: new Date(fin.getTime() - 20 * 60_000),
        startedAt: new Date(fin.getTime() - 20 * 60_000),
        endedAt: fin,
      })

      compteur.set(blanc.id, compteur.get(blanc.id) + 1)
      compteur.set(noir.id, compteur.get(noir.id) + 1)
    }
  }

  await db.insert(games).values(lignes)
  console.log(`${lignes.length} parties.`)

  // ── Classements et courbes ──────────────────────────────────────────────
  for (const joueur of crees) {
    const parties = compteur.get(joueur.id) ?? 0
    const victoires = Math.round(parties * (0.3 + alea() * 0.4))
    const nulles = Math.round(parties * 0.15)

    for (const categorie of ['blitz', 'rapid']) {
      const note = joueur.elo + (categorie === 'blitz' ? -40 : 0)
      // Glicko-2 et Elo sont deux calculs distincts : les poser égaux donnait
      // un écran où le même nombre apparaissait deux fois, ce qui laissait
      // croire à une redite. En partie réelle ils s'écartent d'une trentaine
      // de points, l'un tenant compte de l'incertitude et l'autre non.
      const eloClassique = note + Math.round((alea() - 0.5) * 60)
      await db
        .insert(ratings)
        .values({
          userId: joueur.id,
          category: categorie,
          rating: note,
          deviation: 60 + Math.floor(alea() * 40),
          elo: eloClassique,
          games: parties,
          wins: victoires,
          losses: parties - victoires - nulles,
          draws: nulles,
          peak: note + 30,
          peakAt: new Date(),
        })
        // `createUser` crée déjà une ligne de classement par défaut : sans
        // reprendre *tous* les champs ici, le profil affichait un Elo à 1500
        // à côté d'un classement Glicko à 1955.
        .onConflictDoUpdate({
          target: [ratings.userId, ratings.category],
          set: {
            rating: note,
            elo: eloClassique,
            deviation: 60 + Math.floor(alea() * 40),
            games: parties,
            wins: victoires,
            losses: parties - victoires - nulles,
            draws: nulles,
            peak: note + 30,
            peakAt: new Date(),
          },
        })
    }

    // Une courbe de progression, sinon le profil affiche un graphique vide.
    const courbe = []
    let niveau = joueur.elo - 120
    for (let i = 0; i < 20; i++) {
      const delta = Math.round((alea() - 0.42) * 26)
      niveau += delta
      courbe.push({
        userId: joueur.id,
        category: 'rapid',
        rating: niveau,
        deviation: 70,
        delta,
        createdAt: new Date(Date.now() - (20 - i) * 3 * 24 * 3600 * 1000),
      })
    }
    await db.insert(ratingHistory).values(courbe)
  }
  console.log('Classements et courbes de progression.')

  // ── Carnet d'adresses de chris_demo ─────────────────────────────────────
  const chris = crees.find((j) => j.pseudo === 'chris' + SUFFIXE)
  const amis = crees.filter((j) => ['julien', 'margaux', 'theo', 'salome', 'amina', 'ines'].includes(j.pseudo.replace(SUFFIXE, '')))
  for (const ami of amis) {
    await db
      .insert(friendships)
      .values({ requesterId: chris.id, addresseeId: ami.id, status: 'accepted', respondedAt: new Date() })
      .onConflictDoNothing()
  }
  // Une demande reçue et une envoyée, pour voir les deux états.
  const nordine = crees.find((j) => j.pseudo === 'nordine' + SUFFIXE)
  const lucas = crees.find((j) => j.pseudo === 'lucas' + SUFFIXE)
  await db.insert(friendships).values({ requesterId: nordine.id, addresseeId: chris.id }).onConflictDoNothing()
  await db.insert(friendships).values({ requesterId: chris.id, addresseeId: lucas.id }).onConflictDoNothing()
  console.log(`Carnet de chris${SUFFIXE} : ${amis.length} amis, 1 demande reçue, 1 envoyée.`)

  // Un défi qui attend, pour voir la notification au premier chargement.
  await db.insert(challenges).values({
    slug: slug(),
    creatorId: amis[0].id,
    creatorName: amis[0].pseudo,
    creatorColor: 'random',
    initialTime: 300,
    increment: 3,
    rated: false,
    kind: 'direct',
    targetId: chris.id,
    expiresAt: new Date(Date.now() + 5 * 60_000),
  })

  console.log('')
  console.log(`Connecte-toi : chris${SUFFIXE} / ${MOT_DE_PASSE}`)
}

const db = getDb()
if (process.argv.includes('--purge')) await purger(db)
else await semer(db)
process.exit(0)
