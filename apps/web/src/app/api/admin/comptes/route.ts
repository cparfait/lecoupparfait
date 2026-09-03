/**
 * Les comptes, vus par l'administration.
 *
 *   GET  /api/admin/comptes?q=      liste et recherche
 *   POST /api/admin/comptes         désactiver, réactiver, promouvoir,
 *                                   rétrograder, anonymiser, changer le mot
 *                                   de passe
 *
 * Toutes les actions sont journalisées deux fois : sur la sortie standard, qui
 * survit à une base perdue, et dans `admin_audit`, que l'onglet « Journal »
 * relit. La table a été ajoutée après coup, contre l'avis d'origine — « personne
 * ne la relirait jamais ». C'était vrai tant que la relire demandait un accès
 * SSH ; ça ne l'est plus depuis qu'elle s'affiche sur l'écran où l'on agit.
 *
 * **Ce qui n'existe pas, et pourquoi.** Aucune route ne rend un mot de passe,
 * aucune ne rend l'empreinte, et « changer le mot de passe » ne permet pas de
 * lire l'ancien. C'est le minimum : un administrateur doit pouvoir redonner
 * l'accès à quelqu'un qui l'a perdu — c'est précisément ce que la page de
 * récupération conseille quand la messagerie n'est pas configurée — sans que
 * l'interface devienne un moyen d'entrer dans les comptes à l'insu de leurs
 * propriétaires.
 */

import { NextResponse } from 'next/server'
import {
  and,
  asc,
  count,
  desc,
  eq,
  games,
  getDb,
  ilike,
  or,
  ratings,
  sql,
  users,
} from '@coupparfait/db'
import { destroyAllSessions, hashPassword, validatePassword } from '@coupparfait/db/auth'
import { getAdmin } from '@/lib/server/admin.ts'
import { journaliser } from '@/lib/server/audit.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Au-delà, la liste ne se lit plus : c'est aux filtres et au tri de trancher. */
const PAR_PAGE = 25

/**
 * Les tris proposés, et leur colonne.
 *
 * Une table de correspondance plutôt qu'un nom de colonne reçu tel quel : le
 * paramètre vient de l'extérieur, et il finirait sinon dans la clause `order
 * by`. C'est aussi ce qui garantit qu'un tri retiré du schéma casse ici, à la
 * compilation, plutôt qu'en production.
 */
/**
 * Les sous-requêtes de la liste sont écrites en SQL nu, colonnes qualifiées.
 *
 * Ce n'est pas une négligence : dans la **liste des colonnes** — et là seulement
 * — drizzle rend `users.id` sans son préfixe, simplement `"id"`. À l'intérieur
 * d'un `select … from games`, ce `"id"` désigne alors `games.id`, la corrélation
 * disparaît, et le compte vaut zéro pour tout le monde. La requête reste valide,
 * PostgreSQL ne dit rien, le typage non plus : le seul symptôme est un chiffre
 * faux. On qualifie donc à la main.
 *
 * Dans un `where`, drizzle qualifie correctement — c'est pourquoi les purges de
 * `api/admin/contenus`, elles, peuvent garder leurs interpolations.
 */

const TRIS = {
  vu: users.lastSeenAt,
  inscrit: users.createdAt,
  pseudo: users.usernameLower,
} as const

type Tri = keyof typeof TRIS

export async function GET(request: Request) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const parametres = new URL(request.url).searchParams
  const recherche = (parametres.get('q') ?? '').trim()
  const filtre = parametres.get('filtre') ?? 'tous'
  const demande = parametres.get('tri') ?? 'vu'
  const tri: Tri = demande in TRIS ? (demande as Tri) : 'vu'
  const sens = parametres.get('sens') === 'asc' ? asc : desc
  const page = Math.max(0, Number(parametres.get('page') ?? 0) || 0)

  try {
    const base = getDb()
    const motif = `%${recherche}%`

    // Chaque filtre décrit une question qu'on se pose vraiment devant une liste
    // de comptes : qui est bloqué, qui a des droits, qui n'a jamais joué, qui
    // ne pourra pas récupérer son mot de passe faute d'adresse confirmée.
    const conditions = [
      recherche ? or(ilike(users.username, motif), ilike(users.email, motif)) : undefined,
      filtre === 'admins' ? eq(users.role, 'admin') : undefined,
      filtre === 'desactives' ? eq(users.disabled, true) : undefined,
      filtre === 'sansAdresse' ? sql`${users.emailVerifiedAt} is null` : undefined,
      filtre === 'inactifs'
        ? sql`not exists (select 1 from ${games}
                           where ${games.whiteId} = ${users.id}
                              or ${games.blackId} = ${users.id})`
        : undefined,
    ].filter((condition) => condition !== undefined)

    const ou = conditions.length > 0 ? and(...conditions) : sql`true`

    const [lignes, [total], [general]] = await Promise.all([
      base
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          emailVerifiedAt: users.emailVerifiedAt,
          role: users.role,
          disabled: users.disabled,
          avatar: users.avatar,
          countryCode: users.countryCode,
          createdAt: users.createdAt,
          lastSeenAt: users.lastSeenAt,
          // Le nombre de parties dit en un coup d'œil si un compte est vivant ou
          // s'il a été créé puis abandonné — la distinction qu'on cherche quand
          // on regarde une liste de comptes.
          parties: sql<number>`(
            select count(*) from games
            where games.white_id = users.id or games.black_id = users.id
          )`,
          // Le meilleur classement toutes cadences confondues : de quoi
          // distinguer un joueur régulier d'un compte qui a fait trois parties
          // amicales.
          classement: sql<number | null>`(
            select max(ratings.rating) from ratings
            where ratings.user_id = users.id and ratings.games > 0
          )`,
          // Une session encore valide signale quelqu'un connecté en ce moment,
          // ce qui change la lecture d'une désactivation : elle le déconnecte.
          sessions: sql<number>`(
            select count(*) from sessions
            where sessions.user_id = users.id and sessions.expires_at > now()
          )`,
        })
        .from(users)
        .where(ou)
        .orderBy(sens(TRIS[tri]))
        .limit(PAR_PAGE)
        .offset(page * PAR_PAGE),

      base.select({ n: count() }).from(users).where(ou),
      base.select({ n: count() }).from(users),
    ])

    return NextResponse.json({
      comptes: lignes.map((ligne) => ({
        id: ligne.id,
        username: ligne.username,
        // L'adresse est visible ici et nulle part ailleurs : c'est la seule
        // information personnelle que porte un compte, et la seule raison de
        // la montrer est de pouvoir répondre à quelqu'un qui écrit.
        email: ligne.email,
        emailVerifie: ligne.emailVerifiedAt !== null,
        role: ligne.role,
        disabled: ligne.disabled,
        avatar: ligne.avatar,
        pays: ligne.countryCode,
        parties: Number(ligne.parties),
        classement: ligne.classement == null ? null : Number(ligne.classement),
        sessions: Number(ligne.sessions),
        inscrit: ligne.createdAt.toISOString(),
        vu: ligne.lastSeenAt.toISOString(),
      })),
      // Deux totaux, parce qu'ils répondent à deux questions : « combien pour
      // cette recherche » et « combien en tout ». N'en montrer qu'un laisserait
      // croire, après un filtre, que les autres comptes ont disparu.
      total: Number(total?.n ?? 0),
      totalGeneral: Number(general?.n ?? 0),
      page,
      parPage: PAR_PAGE,
      moi: admin.username,
    })
  } catch (error) {
    console.error('[admin/comptes]', error)
    return NextResponse.json({ error: 'Lecture impossible.' }, { status: 503 })
  }
}

const ACTIONS = new Set([
  'desactiver',
  'reactiver',
  'promouvoir',
  'retrograder',
  'anonymiser',
  'motDePasse',
])

export async function POST(request: Request) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  let corps: { action?: string; id?: string; motDePasse?: string }
  try {
    corps = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 })
  }

  const action = String(corps.action ?? '')
  const cible = String(corps.id ?? '')
  if (!ACTIONS.has(action) || !cible) {
    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
  }

  const base = getDb()
  const lignes = await base
    .select({ id: users.id, username: users.username, role: users.role, disabled: users.disabled })
    .from(users)
    .where(eq(users.id, cible))
    .limit(1)
  const compte = lignes[0]
  if (!compte) return NextResponse.json({ error: 'Compte introuvable.' }, { status: 404 })

  // On ne se retire pas soi-même les droits, et l'on ne se désactive pas soi-
  // même : c'est le moyen le plus simple de fermer la porte en étant dedans.
  // Le garde-fou vaut aussi pour un administrateur qui en a d'autres sous la
  // main — il n'y a jamais de raison de le faire sur soi plutôt que de
  // demander à un collègue, et beaucoup de raisons de l'avoir fait par erreur.
  const surSoiMeme = compte.id === admin.userId
  if (surSoiMeme && action !== 'motDePasse') {
    return NextResponse.json(
      { error: 'Cette action ne s’applique pas à ton propre compte.' },
      { status: 400 },
    )
  }

  // Ce que le journal retiendra en plus du verbe. On note l'état *avant*, seule
  // information que l'acte va détruire : « rétrogradé » se relit sans peine,
  // « rétrogradé depuis admin » se vérifie.
  const detail: Record<string, unknown> = {
    avant: { role: compte.role, disabled: compte.disabled },
  }

  try {
    switch (action) {
      case 'desactiver':
        await base.update(users).set({ disabled: true }).where(eq(users.id, cible))
        // Désactiver sans fermer les sessions ouvertes ne désactive rien : le
        // compte resterait utilisable jusqu'à expiration du cookie, trente
        // jours plus tard.
        await destroyAllSessions(cible)
        break

      case 'reactiver':
        await base.update(users).set({ disabled: false }).where(eq(users.id, cible))
        break

      case 'promouvoir':
        await base.update(users).set({ role: 'admin' }).where(eq(users.id, cible))
        break

      case 'retrograder':
        await base.update(users).set({ role: 'player' }).where(eq(users.id, cible))
        break

      case 'motDePasse': {
        const nouveau = String(corps.motDePasse ?? '')
        // `validatePassword` rend un code, pas une phrase — il n'en a qu'un
        // seul, et le traduire ici évite d'importer la table complète des
        // messages pour une valeur unique.
        if (validatePassword(nouveau)) {
          return NextResponse.json(
            { error: 'Mot de passe trop court (8 caractères minimum).' },
            { status: 400 },
          )
        }
        await base
          .update(users)
          .set({
            passwordHash: await hashPassword(nouveau),
            // Les jetons en cours tombent avec l'ancien mot de passe : en
            // laisser un valide rouvrirait ce qu'on vient de refermer.
            resetTokenHash: null,
            resetTokenExpiresAt: null,
          })
          .where(eq(users.id, cible))
        // Toutes les sessions sauf, éventuellement, celle de l'administrateur
        // qui change le sien : `destroyAllSessions` ferme tout, et le cas de
        // soi-même est assumé — se reconnecter après avoir changé son mot de
        // passe est le comportement attendu partout ailleurs.
        await destroyAllSessions(cible)
        break
      }

      case 'anonymiser':
        detail.devenu = await anonymiser(cible, compte.username)
        break
    }

    await journaliser(admin, {
      action,
      cible: 'compte',
      cibleId: compte.id,
      cibleNom: compte.username,
      detail,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[admin/comptes]', error)
    return NextResponse.json({ error: 'Action impossible.' }, { status: 500 })
  }
}

/**
 * Anonymiser plutôt qu'effacer.
 *
 * Une partie appartient à **deux** joueurs. Effacer un compte en cascade
 * emporterait les parties qu'il a jouées contre d'autres, c'est-à-dire creuse
 * des trous dans l'historique et le classement de gens qui n'ont rien demandé
 * — et rend inexplicables des points gagnés contre un adversaire disparu.
 *
 * On retire donc ce qui identifie : le pseudo devient `joueur-xxxxxx`,
 * l'adresse part, le mot de passe est remplacé par une empreinte inutilisable,
 * les sessions tombent. Ce qui reste — les coups joués — n'identifie plus
 * personne, et continue de faire tenir l'histoire des autres.
 *
 * Les colonnes `whiteName` / `blackName` des parties sont réécrites aussi :
 * sans cela, le pseudo d'origine resterait lisible dans chaque partie, et
 * l'anonymisation ne serait qu'un mot.
 *
 * Rend le nouveau pseudo, que le journal conserve : sans lui, la ligne d'audit
 * désignerait un compte qu'on ne peut plus retrouver, et l'on ne saurait plus
 * répondre à quelqu'un qui réclame ses parties.
 */
async function anonymiser(id: string, ancienPseudo: string): Promise<string> {
  const base = getDb()
  const suffixe = crypto.randomUUID().slice(0, 8)
  const pseudo = `joueur-${suffixe}`

  await base
    .update(users)
    .set({
      username: pseudo,
      usernameLower: pseudo,
      email: null,
      emailVerifiedAt: null,
      emailTokenHash: null,
      emailTokenExpiresAt: null,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
      // Une empreinte qui ne correspond à aucun mot de passe : le compte
      // existe encore pour les parties, personne ne peut y entrer.
      passwordHash: `anonymise:${crypto.randomUUID()}`,
      avatar: '♟️',
      bio: null,
      countryCode: null,
      preferences: {},
      role: 'player',
      disabled: true,
    })
    .where(eq(users.id, id))

  await base.update(games).set({ whiteName: pseudo }).where(eq(games.whiteId, id))
  await base.update(games).set({ blackName: pseudo }).where(eq(games.blackId, id))
  await base.delete(ratings).where(eq(ratings.userId, id))
  await destroyAllSessions(id)

  console.warn(`[admin] ${ancienPseudo} anonymisé en ${pseudo}`)
  return pseudo
}
