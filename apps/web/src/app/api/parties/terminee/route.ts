/**
 * Enregistre une partie jouée dans le navigateur.
 *
 *   POST /api/parties/terminee
 *
 * Les parties entre amis passent par le serveur temps réel, qui les écrit
 * lui-même (`apps/server/src/persistence.ts`). Celles contre l'ordinateur, non :
 * elles se déroulent entièrement chez le joueur, et n'existaient donc nulle
 * part une fois terminées — « Parties récentes » restait vide pour quelqu'un
 * qui avait joué toute la soirée. La table `games` prévoyait pourtant `mode` et
 * `botLevel` depuis le début.
 *
 * **Classé seulement si on l'a demandé avant.** Une partie contre l'ordinateur
 * ne compte pas par défaut, et c'est justifié : on y dispose d'« Annuler »,
 * d'« Indice » et du mode commenté, qui montre le meilleur coup par une
 * flèche. Un classement gagné avec ces outils ne mesurerait rien.
 *
 * Le joueur peut donc cocher « partie classée » **avant** de commencer, et
 * l'écran de jeu lui retire alors les trois aides. L'adversaire a un
 * classement annoncé — c'est tout l'objet du barème des niveaux —,
 * il fait donc un adversaire valable, avec un écart-type large : ce barème
 * reste une approximation, et l'incertitude doit se voir dans le calcul plutôt
 * que d'être passée sous silence.
 *
 * On fait confiance au client pour les coups, et il n'y a pas de moyen de faire
 * autrement — la partie s'est jouée chez lui. Mais on ne le croit plus sur le
 * *résultat* : un `fetch` fabriqué à la main annonçait une victoire contre le
 * niveau 25 sans avoir joué la moindre partie, et le classement l'enregistrait.
 * Voir `coherent()` plus bas.
 */

import { NextResponse } from 'next/server'
import { Chess } from 'chess.js'
import {
  botLevel,
  categorieDeClassement,
  resultatImpose,
  speedCategory,
  START_FEN,
} from '@coupparfait/core'
import { and, desc, eq, games, getDb, ratedIntents, sql, type RatedIntent } from '@coupparfait/db'
import { applyGameResult } from '@coupparfait/db/ratings'
import { creerLimiteur } from '@/lib/server/limiteur.ts'
// Importées, et non écrites ici : `scripts/check-partie-terminee.mjs` teste
// ces deux fonctions-là, et une copie locale pourrait s'en écarter en silence.
import { memePosition, resultatVerifiable } from '@/lib/server/regle-partie-terminee.ts'
import { getCurrentUser } from '@/lib/server/session.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_COUPS = 400

/**
 * Bornes du corps et du PGN. Quatre cents demi-coups en SAN, horloges
 * comprises, tiennent dans une vingtaine de kilo-octets : les plafonds
 * laissent une marge large, et ferment la porte à la colonne remplie de
 * mégaoctets.
 */
const TAILLE_MAX_PGN = 64 * 1024
const TAILLE_MAX_CORPS = 128 * 1024

/**
 * Une partie classée compte au moins dix demi-coups, et une par minute.
 *
 * Deux bornes, deux abus différents. Les dix demi-coups ferment la partie
 * fabriquée en trois coups — un mat du berger monté à la main coûte alors dix
 * coups légaux à écrire plutôt que quatre, ce qui ne l'empêche pas mais lui
 * retire tout intérêt. La minute ferme la boucle : cent parties gagnées en dix
 * secondes ne remontent plus un classement.
 *
 * Ces deux limites ne s'appliquent qu'au **classement**. Une partie courte ou
 * une deuxième partie dans la minute s'archivent normalement : c'est
 * l'historique du joueur, il n'y a rien à en protéger.
 */
const MIN_COUPS_CLASSEE = 10
const partiesClassees = creerLimiteur(60 * 1000, 1)
/** Durée plancher d'un demi-coup dans une partie classée — voir `assezLente`. */
const MS_MIN_PAR_DEMI_COUP = 100
const ALPHABET = 'abcdefghijkmnopqrstuvwxyz23456789'
const MODES = new Set(['computer', 'local'])
const RESULTATS = new Set(['1-0', '0-1', '1/2-1/2'])

function slug(): string {
  const octets = crypto.getRandomValues(new Uint8Array(8))
  return [...octets].map((octet) => ALPHABET[octet % ALPHABET.length]).join('')
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  // Silencieux : la plateforme s'utilise sans compte, et l'appel part à chaque
  // fin de partie sans que le joueur l'ait demandé.
  if (!user) return NextResponse.json({ ok: false, raison: 'anonyme' })

  let body: {
    mode?: string
    moves?: string[]
    pgn?: string
    result?: string
    status?: string
    playerColor?: string
    opponentName?: string
    botLevel?: number
    initialTime?: number
    increment?: number
    startFen?: string | null
    eco?: string | null
    opening?: string | null
    startedAt?: string
    /** Le joueur a demandé une partie classée avant de commencer. */
    classee?: boolean
  }
  // Le corps est lu en texte pour être mesuré avant d'être analysé : une
  // partie de quatre cents coups tient en quelques kilo-octets, et rien ne
  // justifie d'en accepter des mégas.
  const tailleAnnoncee = Number(request.headers.get('content-length') ?? 0)
  if (tailleAnnoncee > TAILLE_MAX_CORPS) {
    return NextResponse.json({ ok: false, raison: 'corps trop grand' }, { status: 413 })
  }
  try {
    const brut = await request.text()
    if (brut.length > TAILLE_MAX_CORPS) {
      return NextResponse.json({ ok: false, raison: 'corps trop grand' }, { status: 413 })
    }
    body = JSON.parse(brut) as typeof body
  } catch {
    return NextResponse.json({ ok: false, raison: 'corps illisible' }, { status: 400 })
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, raison: 'corps illisible' }, { status: 400 })
  }

  /*
    Les champs texte, vérifiés avant usage.

    Le type annoncé plus haut n'est qu'une promesse du client. `eco: 42`
    atteignait `body.eco?.slice(0, 3)` et levait une exception, rendue en
    500 ; un `pgn` de plusieurs mégaoctets s'écrivait tel quel en base. Un
    champ du mauvais type devient `null` — ce sont des informations
    d'affichage, la partie reste valable sans elles —, un PGN trop long est
    refusé.
  */
  const texte = (valeur: unknown, max: number) =>
    typeof valeur === 'string' ? valeur.slice(0, max) : null
  if (typeof body.pgn === 'string' && body.pgn.length > TAILLE_MAX_PGN) {
    return NextResponse.json({ ok: false, raison: 'pgn trop long' }, { status: 400 })
  }
  if (body.startFen != null && typeof body.startFen !== 'string') {
    return NextResponse.json({ ok: false, raison: 'position de départ invalide' }, { status: 400 })
  }

  const moves = Array.isArray(body.moves) ? body.moves.filter((m) => typeof m === 'string') : []
  if (moves.length === 0 || moves.length > MAX_COUPS) {
    return NextResponse.json({ ok: false, raison: 'coups invalides' }, { status: 400 })
  }
  if (!MODES.has(String(body.mode))) {
    return NextResponse.json({ ok: false, raison: 'mode inconnu' }, { status: 400 })
  }
  const result = RESULTATS.has(String(body.result)) ? String(body.result) : null
  if (!result) {
    // Une partie abandonnée en cours de route se reprend, elle ne s'archive pas :
    // c'est le rôle d'`active_games`.
    return NextResponse.json({ ok: false, raison: 'partie non terminée' }, { status: 400 })
  }

  // Les coups doivent former une partie légale. Ce n'est pas de la défiance
  // envers le joueur mais envers le code : une liste tronquée ou décalée
  // produirait un PGN qui ne se rejoue pas, et l'on ne s'en apercevrait qu'en
  // essayant de l'analyser, des semaines plus tard.
  //
  // La FEN de départ se lit dans le même esprit : `new Chess` lève sur une
  // FEN malformée, et cette ligne, hors de tout `try`, rendait un 500.
  let echiquier: Chess
  try {
    echiquier = new Chess(body.startFen || undefined)
  } catch {
    return NextResponse.json({ ok: false, raison: 'position de départ invalide' }, { status: 400 })
  }
  for (const san of moves) {
    try {
      echiquier.move(san)
    } catch {
      return NextResponse.json({ ok: false, raison: 'coups illégaux' }, { status: 400 })
    }
  }

  const camp = body.playerColor === 'b' ? 'b' : 'w'
  const adversaire = texte(body.opponentName, 40) ?? 'Ordinateur'
  // Une date illisible vaut « maintenant » : la colonne est `notNull`, et une
  // partie sans début connu reste une partie.
  const annonceeLe = body.startedAt ? new Date(body.startedAt) : new Date()
  const debut = Number.isNaN(annonceeLe.getTime()) ? new Date() : annonceeLe

  /*
    Le résultat, recoupé avec la position atteinte.

    Un mat, un pat, une nulle par matériel, par répétition ou par les cinquante
    coups se lisent sur l'échiquier : le déclaré doit alors être **égal** à
    l'imposé, sans quoi la liste de coups et le résultat ne parlent pas de la
    même partie. Ce refus-là vaut pour toutes les parties, classées ou non :
    ce n'est pas une question de triche, c'est une incohérence.
  */
  const impose = resultatImpose(echiquier)
  if (impose && impose !== result) {
    return NextResponse.json({ ok: false, raison: 'résultat incohérent' }, { status: 400 })
  }

  /*
    Quand la position n'impose rien, la partie s'est terminée par un abandon,
    une chute du drapeau ou une nulle par accord — trois choses qui ne se
    lisent nulle part et qu'aucune vérification ne peut départager d'une
    invention. On n'accepte alors, **pour le classement**, que ce qui
    défavorise le joueur : sa défaite, ou la nulle.

    Ce qu'on y perd : une victoire honnête au temps contre l'ordinateur ne
    comptera pas au classement. Ce qu'on y gagne : « l'ordinateur a abandonné »
    n'existe plus comme moyen de se fabriquer une cote, et c'était la porte la
    plus large. Un cas rare et honnête contre un cas facile et malhonnête.

    La partie, elle, s'archive quand même, avec son vrai résultat : c'est son
    historique. Seul le drapeau `rated` tombe.
  */
  const verifiable = resultatVerifiable(impose, result, camp)

  /*
    Une partie classée part de la position initiale.

    `startFen` existe pour l'éditeur de position et les parties thématiques, et
    il traversait tout ce qui précède sans être regardé une seule fois. Une dame
    contre un roi nu, dix demi-coups, un mat : la position *imposait* bel et
    bien le résultat déclaré, `verifiable` était vrai, et la victoire comptait
    au classement — contre le niveau 25 si on le demandait.

    L'écran de jeu applique déjà cette règle pour les statistiques d'adversaire
    (`if (!startFen) recordBotGame(...)`) : une partie commencée ailleurs qu'au
    début ne dit rien de la force de personne. Elle ne valait simplement pas
    pour le classement, qui est pourtant ce qu'on a le plus de raisons de
    protéger.

    La comparaison porte sur les quatre premiers champs : le compteur de
    demi-coups et le numéro de coup ne décrivent pas une position.
  */
  const depuisLeDebut = body.startFen ? memePosition(body.startFen, START_FEN) : true

  /*
    Classée ? Seulement contre l'ordinateur, seulement si on l'a demandé, et
    seulement avec un niveau d'adversaire connu — c'est lui qui fournit le
    classement d'en face.
  */
  const niveau = typeof body.botLevel === 'number' ? Math.round(body.botLevel) : null
  // Le barème est lu une fois : il donne le niveau ramené dans l'échelle et la
  // cote annoncée de l'adversaire, qui doivent parler du même palier.
  const bareme = niveau === null ? null : botLevel(niveau)
  const niveauRetenu = bareme?.level ?? null
  // Un nombre, ou zéro : `"abc"` donnait `NaN`, que la colonne entière refusait.
  const duree = (valeur: unknown) =>
    typeof valeur === 'number' && Number.isFinite(valeur) ? Math.max(0, Math.round(valeur)) : 0
  const initialTime = duree(body.initialTime)
  const increment = duree(body.increment)

  /*
    L'annonce faite avant la partie, et consommée ici.

    Voir `POST /api/parties/classee` : c'est elle qui arrête le niveau, la
    cadence et le camp pendant qu'on ignore encore le résultat. La fin de
    partie ne fait plus que constater si ce qui arrive ressemble à ce qui a été
    annoncé.

    La lecture est une **suppression** : elle rend la ligne au plus une fois,
    donc la même partie envoyée deux fois n'est classée qu'une, et deux parties
    classées ne peuvent pas se chevaucher. On ne la consomme que si le
    classement est demandé — l'archivage ordinaire n'a pas à brûler l'annonce
    d'une partie encore en cours dans un autre onglet.
  */
  const annonce = body.classee === true ? await consommerAnnonce(user.userId) : null
  const conforme =
    annonce !== null &&
    annonce.botLevel === niveauRetenu &&
    annonce.playerColor === camp &&
    annonce.initialTime === initialTime &&
    annonce.increment === increment
  /*
    Le temps réellement écoulé depuis l'annonce.

    Cent millisecondes par demi-coup, c'est-à-dire très en dessous de ce que
    n'importe qui peut jouer : ce n'est pas un contrôle de cadence, mais un
    plancher contre la boucle « j'annonce, j'envoie une partie, je recommence »,
    qui sans cela produirait des parties classées aussi vite que le réseau le
    permet. Une partie d'une minute en garde toute la marge.
  */
  const assezLente =
    annonce !== null &&
    Date.now() - annonce.openedAt.getTime() >= moves.length * MS_MIN_PAR_DEMI_COUP

  const classee =
    body.classee === true &&
    body.mode === 'computer' &&
    niveau !== null &&
    niveau >= 1 &&
    verifiable &&
    depuisLeDebut &&
    conforme &&
    assezLente &&
    moves.length >= MIN_COUPS_CLASSEE &&
    // Compté en dernier : le limiteur consomme un jeton dès qu'on l'interroge,
    // et une partie recalée pour une autre raison n'a pas à en brûler un.
    !partiesClassees.depasse(user.userId)

  /*
    Pourquoi une partie annoncée classée ne l'est pas.

    Le joueur a coché la case avant de commencer et a joué sans « Annuler »,
    sans « Indice » et sans le mode commenté : un silence, ici, passerait pour
    une panne. On ne le renvoie que s'il a demandé le classement — dans tous
    les autres cas il n'y a rien à expliquer.

    **Un code, et non une phrase.** Ces valeurs étaient des phrases françaises,
    et elles n'étaient lues par personne : l'écran de fin jetait la réponse.
    Maintenant qu'il l'affiche, elle doit exister dans les vingt langues de
    l'interface — donc être une clé, traduite côté client, et non du texte
    fabriqué ici.
  */
  const raison =
    classee || body.classee !== true
      ? undefined
      : body.mode !== 'computer' || niveau === null || niveau < 1
        ? 'adversaire-sans-classement'
        : !verifiable
          ? 'resultat-non-verifiable'
          : !depuisLeDebut
            ? 'position-imposee'
            : annonce === null
              ? 'non-annoncee'
              : !conforme
                ? 'annonce-differente'
                : !assezLente
                  ? 'trop-rapide'
                  : moves.length < MIN_COUPS_CLASSEE
                    ? 'trop-courte'
                    : 'trop-frequente'

  try {
    const rangee = await getDb()
      .insert(games)
      .values({
        slug: slug(),
        mode: String(body.mode),
        /*
          La cadence selon la règle du cœur, `speedCategory` : temps initial
          + 40 × incrément. Il y avait ici un barème à part, sur le seul temps
          initial, si bien qu'un 2+3 était rangé bullet quand le serveur
          temps réel le rangeait blitz — et classé dans l'un ou l'autre selon
          l'adversaire. Ne pas en réécrire une copie locale.
        */
        speed: speedCategory({ initial: initialTime, increment }),
        rated: classee,
        whiteId: camp === 'w' ? user.userId : null,
        blackId: camp === 'b' ? user.userId : null,
        whiteName: camp === 'w' ? user.username : adversaire,
        blackName: camp === 'b' ? user.username : adversaire,
        // La cote annoncée de l'adversaire, du côté qu'il tient. C'est une
        // information de la partie, pas du classement : la fiche disait
        // « Ordinateur » sans jamais dire quel Ordinateur.
        whiteRating: camp === 'w' ? null : (bareme?.elo ?? null),
        blackRating: camp === 'b' ? null : (bareme?.elo ?? null),
        // Le niveau borné, et pas celui reçu : la colonne servait d'écho fidèle
        // à ce que le client avait bien voulu dire, y compris un niveau 900.
        botLevel: niveauRetenu,
        initialTime,
        increment,
        startFen: body.startFen || null,
        moves: moves.join(' '),
        pgn: texte(body.pgn, TAILLE_MAX_PGN),
        status: texte(body.status, 24) ?? 'finished',
        result,
        winner: result === '1-0' ? 'w' : result === '0-1' ? 'b' : null,
        eco: texte(body.eco, 3),
        opening: texte(body.opening, 120),
        // L'heure de l'annonce prime sur celle du client quand il y en a une :
        // c'est la seule des deux qu'on ait vue passer.
        startedAt: classee && annonce ? annonce.openedAt : debut,
        endedAt: new Date(),
      })
      /*
        L'identifiant de la ligne, qui manquait.

        Sans lui, `rating_history.game_id` restait `null` pour toutes les
        parties contre l'ordinateur : une variation de classement n'était
        rattachée à aucune partie, et défaire les gains de quelqu'un demandait
        de deviner lesquels. Le chemin des parties entre amis le fait depuis
        toujours (`apps/server/src/persistence.ts`) ; celui-ci ne le faisait
        pas.
      */
      .returning({ id: games.id })
    const partieId = rangee[0]?.id

    // `niveau` accompagne toujours la réponse : le client saura ainsi qu'un
    // niveau hors barème a été ramené dans le barème, au lieu de croire que
    // sa demande a été suivie.
    if (!classee) {
      return NextResponse.json({ ok: true, classee: false, niveau: niveauRetenu, raison })
    }

    /*
      Le classement, une fois la partie rangée.

      L'écart-type de l'adversaire vaut 100 — le double de celui d'un puzzle.
      Un puzzle a une cote établie par des milliers de tentatives ; le niveau
      d'un bot est une déclaration de notre part, appuyée sur des mesures mais
      pas sur une population. Une incertitude plus large fait moins bouger le
      classement du joueur, ce qui est exactement ce qu'on veut d'un adversaire
      dont on n'est pas tout à fait sûr.
    */
    const score = result === '1/2-1/2' ? 0.5 : (result === '1-0') === (camp === 'w') ? 1 : 0

    let variation
    try {
      variation = await applyGameResult({
        userId: user.userId,
        // La catégorie vient de la cadence **annoncée**, qui a été comparée à
        // celle de la partie juste au-dessus : choisir sa catégorie une fois le
        // résultat connu n'est plus possible.
        // L'ultra-bullet n'a pas de classement à lui : il compte en bullet,
        // comme au serveur temps réel.
        category: categorieDeClassement(
          speedCategory({ initial: annonce!.initialTime, increment: annonce!.increment }),
        ),
        opponentRating: bareme!.elo,
        opponentDeviation: 100,
        score,
        gameId: partieId,
      })
    } catch (error) {
      /*
        Le classement a échoué alors que la partie est déjà rangée.

        Les deux écritures ne partagent pas de transaction — la partie
        s'archive même quand elle n'est pas classée, c'est le cas courant. Il
        reste donc ce cas-ci, où la ligne porterait `rated: true` sans qu'aucun
        classement ait bougé : une partie qui se présente comme comptée et qui
        ne l'est pas. On la remet à ce qu'elle est vraiment plutôt que de
        laisser l'incohérence en base.
      */
      console.error('[parties/terminee] classement non appliqué', error)
      if (partieId) {
        await getDb().update(games).set({ rated: false }).where(eq(games.id, partieId))
      }
      return NextResponse.json({
        ok: true,
        classee: false,
        niveau: niveauRetenu,
        raison: 'classement-indisponible',
      })
    }

    // Le classement d'avant et sa variation, écrits sur la partie elle-même :
    // c'est ce que `/api/profil/<pseudo>` lit pour afficher « +12 » sous une
    // partie, et ces colonnes restaient vides hors des parties entre amis.
    if (partieId) {
      await getDb()
        .update(games)
        .set(
          camp === 'w'
            ? { whiteRating: variation.before, whiteRatingDelta: variation.delta }
            : { blackRating: variation.before, blackRatingDelta: variation.delta },
        )
        .where(eq(games.id, partieId))
    }

    return NextResponse.json({
      ok: true,
      classee: true,
      niveau: niveauRetenu,
      classement: {
        avant: variation.before,
        apres: variation.after,
        variation: variation.delta,
      },
    })
  } catch (error) {
    console.error('[parties/terminee]', error)
    // La partie a été jouée et son résultat affiché : ne pas savoir la ranger
    // ne doit pas ressembler à un incident.
    return NextResponse.json({ ok: false, raison: 'enregistrement impossible' })
  }
}

/**
 * Les parties déjà jouées, prêtes à être analysées.
 *
 *   GET /api/parties/terminee
 *
 * **Pourquoi cette route existe.** L'écran d'analyse proposait d'aller chercher
 * ses parties chez chess.com ou chez Lichess, et nulle part celles qu'on venait
 * de jouer *ici* : quelqu'un qui terminait une partie contre l'ordinateur, puis
 * ouvrait « Analyse », ne trouvait aucune trace de ce qu'il avait joué. Les
 * parties étaient bien archivées — `/api/profil/<pseudo>` les listait — mais
 * cette liste ne rendait ni les coups ni le PGN : elle savait dire qu'une
 * partie avait eu lieu, pas la rouvrir. Un historique sans porte d'entrée.
 *
 * On renvoie donc le PGN complet, assemblé ici. Le stocké est repris tel quel
 * quand il existe (parties du serveur temps réel) ; sinon il est reconstruit à
 * partir de la colonne `moves`, qui est la seule à être toujours remplie.
 *
 * Réservé à ses propres parties : `whiteId` ou `blackId` doit être le compte
 * connecté. L'historique de quelqu'un d'autre se consulte par son profil
 * public, qui n'expose pas les coups.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ parties: [] })

  const parametres = new URL(request.url).searchParams
  const demandees = Number(parametres.get('limite'))
  const limite = Number.isFinite(demandees) ? Math.min(60, Math.max(1, demandees)) : 30
  // Une partie précise, pour la rouvrir depuis un historique qui remonte plus
  // loin que cette liste : sans quoi seules les trente dernières seraient
  // analysables, ce qui n'est une règle nulle part.
  const recherchee = parametres.get('slug')

  try {
    const lignes = await getDb()
      .select({
        slug: games.slug,
        mode: games.mode,
        speed: games.speed,
        rated: games.rated,
        whiteId: games.whiteId,
        whiteName: games.whiteName,
        blackName: games.blackName,
        botLevel: games.botLevel,
        result: games.result,
        status: games.status,
        eco: games.eco,
        opening: games.opening,
        startFen: games.startFen,
        moves: games.moves,
        pgn: games.pgn,
        createdAt: games.createdAt,
      })
      .from(games)
      .where(
        recherchee
          ? and(
              eq(games.slug, recherchee),
              sql`(${games.whiteId} = ${user.userId} or ${games.blackId} = ${user.userId})`,
            )
          : sql`${games.whiteId} = ${user.userId} or ${games.blackId} = ${user.userId}`,
      )
      .orderBy(desc(games.createdAt))
      .limit(recherchee ? 1 : limite)

    return NextResponse.json({
      parties: lignes.map((partie) => {
        const camp = partie.whiteId === user.userId ? 'w' : 'b'
        const coups = partie.moves ? partie.moves.split(' ').filter(Boolean) : []
        return {
          slug: partie.slug,
          mode: partie.mode,
          speed: partie.speed,
          rated: partie.rated,
          camp,
          adversaire: camp === 'w' ? partie.blackName : partie.whiteName,
          botLevel: partie.botLevel,
          result: partie.result,
          // « gagnée » du point de vue de celui qui demande, et pas du point de
          // vue des Blancs : c'est son historique, pas un bulletin d'arbitrage.
          issue:
            partie.result === '1/2-1/2'
              ? 'nulle'
              : (partie.result === '1-0') === (camp === 'w')
                ? 'gagnee'
                : 'perdue',
          status: partie.status,
          eco: partie.eco,
          opening: partie.opening,
          coups: coups.length,
          jouee: partie.createdAt.toISOString(),
          pgn: partie.pgn ?? enPgn(partie, coups),
        }
      }),
    })
  } catch (error) {
    console.error('[parties/terminee]', error)
    return NextResponse.json({ parties: [], erreur: 'indisponible' }, { status: 503 })
  }
}

/**
 * Reconstruit un PGN à partir des coups enregistrés.
 *
 * Les en-têtes comptent autant que les coups : sans `White`, `Black` et
 * `Result`, l'écran d'analyse ne sait ni à qui il s'adresse ni qui a gagné, et
 * la relecture perd les deux informations que le joueur cherche en premier.
 */
function enPgn(
  partie: {
    whiteName: string | null
    blackName: string | null
    result: string | null
    startFen: string | null
    eco: string | null
    opening: string | null
    createdAt: Date
  },
  coups: string[],
): string {
  const entetes: Array<[string, string]> = [
    ['Event', 'Partie Le Coup Parfait'],
    ['Site', 'Le Coup Parfait'],
    ['Date', partie.createdAt.toISOString().slice(0, 10).replace(/-/g, '.')],
    ['Round', '-'],
    ['White', partie.whiteName ?? 'Blancs'],
    ['Black', partie.blackName ?? 'Noirs'],
    ['Result', partie.result ?? '*'],
  ]
  if (partie.eco) entetes.push(['ECO', partie.eco])
  if (partie.opening) entetes.push(['Opening', partie.opening])
  // Une partie qui ne part pas de la position initiale est illisible sans ces
  // deux balises : le lecteur rejouerait les coups depuis le mauvais échiquier.
  if (partie.startFen) {
    entetes.push(['SetUp', '1'])
    entetes.push(['FEN', partie.startFen])
  }

  // Le premier coup n'est pas forcément le premier coup des Blancs : une partie
  // reprise depuis l'éditeur de position démarre où l'on veut. On lit donc le
  // trait et le numéro dans la FEN plutôt que de les supposer.
  const champs = partie.startFen?.split(' ') ?? []
  let numero = Number(champs[5]) || 1
  let blancs = champs[1] !== 'b'

  const corps: string[] = []
  for (const san of coups) {
    if (blancs) corps.push(`${numero}.`)
    else if (corps.length === 0) corps.push(`${numero}...`)
    corps.push(san)
    if (!blancs) numero += 1
    blancs = !blancs
  }
  corps.push(partie.result ?? '*')

  return [
    ...entetes.map(([tag, valeur]) => `[${tag} "${valeur.replace(/"/g, '\\"')}"]`),
    '',
    corps.join(' '),
  ].join('\n')
}

/**
 * Reprend l'annonce de partie classée du joueur, et l'efface du même geste.
 *
 * `DELETE ... RETURNING` plutôt qu'un `SELECT` suivi d'un `DELETE` : la ligne
 * n'est rendue qu'à un seul appelant, même si deux arrivent ensemble. C'est ce
 * qui rend la route idempotente — renvoyer deux fois la même partie ne la
 * classe pas deux fois.
 *
 * Une panne de base rend `null` : la partie s'archivera sans être classée, ce
 * qui est le bon sens de l'échec pour tout ce fichier.
 */
async function consommerAnnonce(userId: string): Promise<RatedIntent | null> {
  try {
    const lignes = await getDb()
      .delete(ratedIntents)
      .where(eq(ratedIntents.userId, userId))
      .returning()
    return lignes[0] ?? null
  } catch (error) {
    console.error('[parties/terminee] annonce illisible', error)
    return null
  }
}
