/**
 * L'inventaire des outils, et ce qui existe de plus récent.
 *
 *   GET /api/admin/outils          → le catalogue confronté au dépôt
 *   GET /api/admin/outils?maj=1    → la même chose, plus les versions publiées
 *
 * **La recherche de mises à jour est séparée, et c'est délibéré.** Le projet ne
 * fait aucune requête vers un tiers ; celle-ci en fait une trentaine — vers le
 * registre npm et l'API de GitHub. Elle part du serveur, jamais du navigateur
 * d'un joueur, elle ne transporte rien d'autre que des noms de paquets publics,
 * et elle ne part que si un administrateur clique. Elle n'est donc pas dans le
 * chargement de la page.
 *
 * Aucune de ces requêtes ne peut faire échouer la réponse : un registre
 * injoignable rend `derniere: null`, et l'écran dit « inconnue » plutôt que de
 * ne rien afficher.
 */

import { NextResponse } from 'next/server'
import { CREDITS } from '@/lib/credits/catalogue.ts'
import { inventorier } from '@/lib/credits/inventaire.ts'
import { getAdmin } from '@/lib/server/admin.ts'
import { tDeLaRequete } from '@/lib/i18n/serveur.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Au-delà, on renonce : l'écran vaut mieux à moitié rempli qu'en attente. */
const DELAI_MS = 6000

async function json(url: string, entetes?: Record<string, string>): Promise<unknown | null> {
  try {
    const reponse = await fetch(url, {
      signal: AbortSignal.timeout(DELAI_MS),
      headers: { accept: 'application/json', ...entetes },
      cache: 'no-store',
    })
    if (!reponse.ok) return null
    return await reponse.json()
  } catch {
    return null
  }
}

/** Dernière version publiée sur npm. */
async function dernierePubliee(paquet: string): Promise<string | null> {
  const donnees = (await json(
    `https://registry.npmjs.org/${paquet.replace('/', '%2f')}/latest`,
  )) as { version?: string } | null
  return donnees?.version ?? null
}

/** Dernière version étiquetée sur GitHub, pour ce qui ne vient pas de npm. */
async function derniereEtiquette(depot: string): Promise<string | null> {
  const donnees = (await json(`https://api.github.com/repos/${depot}/releases/latest`, {
    // L'API le demande, et sans lui elle répond parfois en 403.
    'user-agent': 'lecoupparfait-admin',
  })) as { tag_name?: string } | null
  return donnees?.tag_name ?? null
}

export async function GET(requete: Request) {
  const t = tDeLaRequete(requete)
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: t('api.notFound') }, { status: 404 })

  const inventaire = inventorier()
  const chercherMaj = new URL(requete.url).searchParams.get('maj') === '1'

  // Le catalogue est toujours rendu en entier : c'est lui la liste des outils.
  // L'inventaire ne fait qu'y ajouter ce que le dépôt sait en dire.
  const parPaquet = new Map(inventaire.paquets.map((entree) => [entree.paquet, entree]))

  const outils = await Promise.all(
    CREDITS.map(async (credit) => {
      const inventorie = credit.paquet ? (parPaquet.get(credit.paquet) ?? null) : null
      let derniere: string | null = null
      if (chercherMaj) {
        derniere = credit.paquet
          ? await dernierePubliee(credit.paquet)
          : credit.github
            ? await derniereEtiquette(credit.github)
            : null
      }
      return {
        nom: credit.nom,
        auteur: credit.auteur,
        licence: credit.licence,
        url: credit.url,
        categorie: credit.categorie,
        paquet: credit.paquet ?? null,
        github: credit.github ?? null,
        /** Ce qui est écrit dans le catalogue, pour ce qui ne vient pas de npm. */
        versionCatalogue: credit.version ?? null,
        plage: inventorie?.plage ?? null,
        installee: inventorie?.installee ?? null,
        licenceReelle: inventorie?.licenceReelle ?? null,
        derniere,
      }
    }),
  )

  return NextResponse.json({
    outils,
    /** Déclarés par un espace de travail, absents du catalogue. */
    nonCredites: inventaire.paquets
      .filter((entree) => !entree.credit)
      .map((entree) => ({
        paquet: entree.paquet,
        plage: entree.plage,
        installee: entree.installee,
        licenceReelle: entree.licenceReelle,
        espaces: entree.espaces,
      })),
    orphelins: inventaire.orphelins.map((credit) => ({ nom: credit.nom, paquet: credit.paquet })),
    versionsDivergentes: inventaire.versionsDivergentes,
    depot: {
      lu: inventaire.racine !== null,
      espacesLus: inventaire.espacesLus,
      espacesIllisibles: inventaire.espacesIllisibles,
    },
    majCherchees: chercherMaj,
  })
}
