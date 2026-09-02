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
 * classement annoncé — c'est tout l'objet du barème des vingt-cinq niveaux —,
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
import { botLevel, resultatImpose } from '@coupparfait/core'
import { and, desc, eq, games, getDb, sql } from '@coupparfait/db'
import { applyGameResult, type RatingCategory } from '@coupparfait/db/ratings'
import { creerLimiteur } from '@/lib/server/limiteur.ts'
import { getCurrentUser } from '@/lib/server/session.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_COUPS = 400

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
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, raison: 'corps illisible' }, { status: 400 })
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
  const echiquier = new Chess(body.startFen || undefined)
  for (const san of moves) {
    try {
      echiquier.move(san)
    } catch {
      return NextResponse.json({ ok: false, raison: 'coups illégaux' }, { status: 400 })
    }
  }

  const camp = body.playerColor === 'b' ? 'b' : 'w'
  const adversaire = (body.opponentName ?? 'Ordinateur').slice(0, 40)
  const debut = body.startedAt ? new Date(body.startedAt) : new Date()

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
  const gagneeParLeJoueur = result !== '1/2-1/2' && (result === '1-0') === (camp === 'w')
  const verifiable = impose !== null || !gagneeParLeJoueur

  /*
    Classée ? Seulement contre l'ordinateur, seulement si on l'a demandé, et
    seulement avec un niveau d'adversaire connu — c'est lui qui fournit le
    classement d'en face.
  */
  const niveau = typeof body.botLevel === 'number' ? Math.round(body.botLevel) : null
  const niveauRetenu = niveau === null ? null : botLevel(niveau).level
  const classee =
    body.classee === true &&
    body.mode === 'computer' &&
    niveau !== null &&
    niveau >= 1 &&
    verifiable &&
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
  */
  const raison =
    classee || body.classee !== true
      ? undefined
      : body.mode !== 'computer' || niveau === null || niveau < 1
        ? 'adversaire sans classement'
        : !verifiable
          ? 'résultat non vérifiable'
          : moves.length < MIN_COUPS_CLASSEE
            ? 'partie trop courte'
            : 'une partie classée par minute'

  try {
    await getDb()
      .insert(games)
      .values({
        slug: slug(),
        mode: String(body.mode),
        speed: cadence(body.initialTime ?? 0),
        rated: classee,
        whiteId: camp === 'w' ? user.userId : null,
        blackId: camp === 'b' ? user.userId : null,
        whiteName: camp === 'w' ? user.username : adversaire,
        blackName: camp === 'b' ? user.username : adversaire,
        // Le niveau borné, et pas celui reçu : la colonne servait d'écho fidèle
        // à ce que le client avait bien voulu dire, y compris un niveau 900.
        botLevel: niveauRetenu,
        initialTime: Math.max(0, Math.round(body.initialTime ?? 0)),
        increment: Math.max(0, Math.round(body.increment ?? 0)),
        startFen: body.startFen || null,
        moves: moves.join(' '),
        pgn: typeof body.pgn === 'string' ? body.pgn : null,
        status: (body.status ?? 'finished').slice(0, 24),
        result,
        winner: result === '1-0' ? 'w' : result === '0-1' ? 'b' : null,
        eco: body.eco?.slice(0, 3) ?? null,
        opening: body.opening?.slice(0, 120) ?? null,
        startedAt: Number.isNaN(debut.getTime()) ? new Date() : debut,
        endedAt: new Date(),
      })

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
    const variation = await applyGameResult({
      userId: user.userId,
      category: cadence(body.initialTime ?? 0) as RatingCategory,
      opponentRating: botLevel(niveau!).elo,
      opponentDeviation: 100,
      score,
    })

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
 * Catégorie de cadence, pour la colonne `speed`.
 *
 * Mêmes seuils que le serveur temps réel. Elle ne sert ici qu'à l'affichage,
 * puisque rien de ce qu'on écrit n'est classé.
 */
function cadence(initialTime: number): string {
  if (initialTime === 0) return 'correspondence'
  if (initialTime < 180) return 'bullet'
  if (initialTime < 600) return 'blitz'
  if (initialTime < 1800) return 'rapid'
  return 'classical'
}
