/**
 * Les statistiques d'usage.
 *
 *   GET /api/admin/statistiques?jours=30
 *
 * **Ce que cette route cherche à répondre.** Trois questions, et chaque mesure
 * en sert une : *est-ce que ça vit* (les courbes du jour le jour), *à quoi ça
 * sert* (modes, cadences, ouvertures, issues), *qui s'en sert* (comptes actifs,
 * rétention, niveaux). Une mesure qui n'aide à répondre à aucune des trois n'a
 * rien à faire ici : un tableau de bord se lit en entier ou ne se lit pas.
 *
 * **Tout est calculé en base, rien en mémoire.** Agréger cent mille parties en
 * JavaScript demanderait de les transporter d'abord ; PostgreSQL les compte là
 * où elles sont. Les requêtes rendent donc des lignes déjà groupées, et le seul
 * travail fait ici est de reboucher les jours vides — un jour sans partie n'a
 * pas de ligne, et une courbe qui saute ce jour-là ment sur sa pente.
 *
 * **Les dates partent en texte ISO transtypé.** Dans un fragment `sql` brut,
 * drizzle n'a plus le type de colonne pour guider la liaison et postgres.js
 * refuse net un objet `Date` — l'erreur ne survient qu'à l'exécution, le
 * typage ne la voit pas. Voir la même précaution dans la purge des comptes
 * vides, `api/admin/contenus`.
 */

import { NextResponse } from 'next/server'
import { getDb, sql } from '@coupparfait/db'
import { getAdmin } from '@/lib/server/admin.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Le fuseau des regroupements par jour et par heure.
 *
 * Sans lui, les journées seraient découpées en UTC : sur un serveur français,
 * les parties jouées après 22 h en été compteraient pour le lendemain, et le
 * pic du soir apparaîtrait à une heure où personne ne joue. Le public de ce
 * site est en France ; c'est son horloge qui doit découper ses journées.
 */
const FUSEAU = 'Europe/Paris'

/** Les fenêtres proposées. Au-delà de 365 jours, la courbe n'est plus lisible. */
const FENETRES = new Set([7, 30, 90, 365])

interface LigneJour {
  jour: string
  n: number
}

export async function GET(request: Request) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const demandes = Number(new URL(request.url).searchParams.get('jours') ?? 30)
  const jours = FENETRES.has(demandes) ? demandes : 30
  const depuis = new Date(Date.now() - jours * 24 * 3600 * 1000).toISOString()

  try {
    const base = getDb()

    const parJour = (table: string, colonne = 'created_at') =>
      sql.raw(`
      select to_char(${colonne} at time zone '${FUSEAU}', 'YYYY-MM-DD') as jour,
             count(*)::int as n
        from ${table}
       where ${colonne} >= '${depuis}'::timestamptz
       group by 1`)

    const [
      inscriptions,
      partiesParJour,
      puzzlesParJour,
      actifsParJour,
      modes,
      cadences,
      issues,
      ouvertures,
      heures,
      niveaux,
      meilleursJoueurs,
      puzzlesResume,
      retention,
      apprentissage,
    ] = await Promise.all([
      base.execute(parJour('users')),
      base.execute(parJour('games')),
      base.execute(parJour('puzzle_attempts')),

      // « Actifs » = comptes distincts vus ce jour-là. `last_seen_at` ne garde
      // que la dernière visite : cette courbe ne peut donc pas remonter le
      // passé, elle ne dit vrai que pour aujourd'hui et se creuse en arrière.
      // On la nomme donc pour ce qu'elle est côté client — « dernière visite »
      // — plutôt que de la faire passer pour une fréquentation quotidienne.
      base.execute(parJour('users', 'last_seen_at')),

      base.execute(sql`
        select mode, count(*)::int as n
          from games where created_at >= ${depuis}::timestamptz
         group by 1 order by n desc`),

      base.execute(sql`
        select speed, rated, count(*)::int as n
          from games where created_at >= ${depuis}::timestamptz
         group by 1, 2 order by n desc`),

      base.execute(sql`
        select status, result, count(*)::int as n
          from games where created_at >= ${depuis}::timestamptz
         group by 1, 2 order by n desc`),

      // Les ouvertures se comptent sur toute l'histoire et non sur la fenêtre :
      // c'est un répertoire, pas une actualité, et trente jours de parties n'en
      // disent rien de stable.
      base.execute(sql`
        select coalesce(eco, '—') as eco, opening, count(*)::int as n
          from games where opening is not null
         group by 1, 2 order by n desc limit 10`),

      base.execute(
        sql.raw(`
        select extract(hour from created_at at time zone '${FUSEAU}')::int as heure,
               count(*)::int as n
          from games where created_at >= '${depuis}'::timestamptz
         group by 1`),
      ),

      // La répartition des niveaux, par tranches de cent points. Elle dit si le
      // classement sépare vraiment les joueurs ou s'ils s'entassent au départ.
      base.execute(sql`
        select category, (rating / 100) * 100 as tranche, count(*)::int as n
          from ratings where games > 0
         group by 1, 2 order by 1, 2`),

      base.execute(sql`
        select u.username,
               count(g.id)::int as parties,
               max(g.created_at) as derniere
          from users u
          join games g on (g.white_id = u.id or g.black_id = u.id)
         where g.created_at >= ${depuis}::timestamptz
         group by 1 order by parties desc limit 10`),

      base.execute(sql`
        select count(*)::int as tentatives,
               count(*) filter (where solved)::int as reussies,
               count(distinct user_id)::int as joueurs,
               percentile_cont(0.5) within group (order by time_ms)::int as "tempsMedian"
          from puzzle_attempts where created_at >= ${depuis}::timestamptz`),

      // La rétention, mesurée simplement : parmi les comptes créés dans la
      // fenêtre, combien ont joué au moins une partie, et combien sont revenus
      // au moins un jour après leur inscription. Deux nombres qui disent, l'un,
      // si l'accueil mène au jeu, l'autre, s'il donne envie de revenir.
      base.execute(sql`
        select count(*)::int as inscrits,
               count(*) filter (
                 where exists (select 1 from games g
                                where g.white_id = u.id or g.black_id = u.id))::int as "ontJoue",
               count(*) filter (
                 where u.last_seen_at > u.created_at + interval '1 day')::int as revenus,
               count(*) filter (where u.email is not null)::int as "avecAdresse",
               count(*) filter (where u.email_verified_at is not null)::int as "adresseConfirmee"
          from users u where u.created_at >= ${depuis}::timestamptz`),

      base.execute(sql`
        select count(*)::int as suivies,
               count(*) filter (where completed)::int as terminees,
               count(distinct user_id)::int as joueurs
          from lesson_progress`),
    ])

    const heuresParHeure = typer<{ heure: number; n: number }>(heures)

    return NextResponse.json({
      jours,
      courbes: {
        jours: calendrier(jours),
        inscriptions: aligner(typer<LigneJour>(inscriptions), jours),
        parties: aligner(typer<LigneJour>(partiesParJour), jours),
        puzzles: aligner(typer<LigneJour>(puzzlesParJour), jours),
        dernieresVisites: aligner(typer<LigneJour>(actifsParJour), jours),
      },
      modes: typer<{ mode: string; n: number }>(modes).map((ligne) => ({
        cle: ligne.mode,
        n: Number(ligne.n),
      })),
      cadences: typer<{ speed: string; rated: boolean; n: number }>(cadences).map((ligne) => ({
        cle: ligne.speed,
        classee: ligne.rated,
        n: Number(ligne.n),
      })),
      issues: typer<{ status: string; result: string; n: number }>(issues).map((ligne) => ({
        statut: ligne.status,
        resultat: ligne.result,
        n: Number(ligne.n),
      })),
      ouvertures: typer<{ eco: string; opening: string; n: number }>(ouvertures).map((ligne) => ({
        eco: ligne.eco,
        nom: ligne.opening,
        n: Number(ligne.n),
      })),
      // Vingt-quatre cases toujours, même vides : `heures` ne rend de ligne que
      // pour les heures où quelqu'un a joué, et une nuit sans partie doit
      // apparaître comme un creux et non comme une absence de barre.
      heures: Array.from({ length: 24 }, (_, heure) =>
        Number(heuresParHeure.find((ligne) => Number(ligne.heure) === heure)?.n ?? 0),
      ),
      niveaux: typer<{ category: string; tranche: number; n: number }>(niveaux).map((ligne) => ({
        categorie: ligne.category,
        tranche: Number(ligne.tranche),
        n: Number(ligne.n),
      })),
      meilleursJoueurs: typer<{ username: string; parties: number; derniere: Date | string }>(
        meilleursJoueurs,
      ).map((ligne) => ({
        pseudo: ligne.username,
        parties: Number(ligne.parties),
        derniere: new Date(ligne.derniere).toISOString(),
      })),
      puzzles: premiere(puzzlesResume, {
        tentatives: 0,
        reussies: 0,
        joueurs: 0,
        tempsMedian: null,
      }),
      retention: premiere(retention, {
        inscrits: 0,
        ontJoue: 0,
        revenus: 0,
        avecAdresse: 0,
        adresseConfirmee: 0,
      }),
      apprentissage: premiere(apprentissage, { suivies: 0, terminees: 0, joueurs: 0 }),
    })
  } catch (error) {
    console.error('[admin/statistiques]', error)
    return NextResponse.json({ error: 'Calcul impossible.' }, { status: 503 })
  }
}

/**
 * Le résultat d'une requête brute, vu comme la forme qu'on en attend.
 *
 * `execute` rend des `Record<string, unknown>` : drizzle ne peut pas deviner le
 * schéma d'une requête écrite à la main. La conversion doit donc passer par
 * `unknown`, et la faire ici une fois évite de la répéter dix fois — chaque
 * répétition étant une occasion de se tromper de forme sans que rien ne le
 * signale.
 */
function typer<T>(resultat: unknown): T[] {
  return resultat as unknown as T[]
}

/**
 * La première ligne d'un agrégat, ou le défaut si la requête n'a rien rendu.
 *
 * Les alias en casse mixte sont entre guillemets dans le SQL : sans eux,
 * PostgreSQL replierait `ontJoue` en `ontjoue` et la clé ne correspondrait plus
 * à celle attendue ici — une erreur muette, qui rendrait des zéros plausibles.
 */
function premiere<T extends Record<string, unknown>>(lignes: unknown, defaut: T): T {
  const ligne = (lignes as Array<Record<string, unknown>> | null)?.[0]
  if (!ligne) return defaut

  // `count` est un `bigint` côté serveur : selon le transtypage, postgres.js le
  // rend en nombre ou en chaîne. On force donc, sauf pour ce qui vaut `null`.
  const propre: Record<string, unknown> = {}
  for (const [cle, valeur] of Object.entries(defaut)) {
    propre[cle] = ligne[cle] == null ? valeur : Number(ligne[cle])
  }
  return propre as T
}

/** `fr-CA` rend précisément `AAAA-MM-JJ`, le format que produit aussi le SQL. */
const FORMAT_JOUR = new Intl.DateTimeFormat('fr-CA', {
  timeZone: FUSEAU,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * Les `n` derniers jours, du plus ancien au plus récent, en `AAAA-MM-JJ`.
 *
 * Les jours sont ceux de Paris, comme ceux qu'a découpés le SQL : sur un
 * conteneur réglé en UTC — c'est le cas — un simple `toISOString` daterait la
 * soirée d'hier au jour d'aujourd'hui, et la moitié des points ne trouveraient
 * plus leur case.
 *
 * On recule ensuite par journées entières depuis midi UTC. Partir de l'heure
 * courante ferait sauter ou doubler un jour lors des changements d'heure, où
 * une « journée » ne dure pas vingt-quatre heures.
 */
function calendrier(jours: number): string[] {
  const [annee, mois, jour] = FORMAT_JOUR.format(new Date()).split('-').map(Number)
  const midi = Date.UTC(annee!, mois! - 1, jour!, 12)
  return Array.from({ length: jours }, (_, index) =>
    new Date(midi - (jours - 1 - index) * 24 * 3600 * 1000).toISOString().slice(0, 10),
  )
}

/**
 * Une série alignée sur le calendrier, trous compris.
 *
 * PostgreSQL ne rend pas de ligne pour un jour sans événement. Tracer la courbe
 * telle quelle rapprocherait deux points distants d'une semaine et donnerait à
 * une semaine morte l'allure d'une pente douce.
 */
function aligner(lignes: LigneJour[], jours: number): number[] {
  const parJour = new Map(lignes.map((ligne) => [ligne.jour, Number(ligne.n)]))
  return calendrier(jours).map((jour) => parJour.get(jour) ?? 0)
}
