/**
 * L'inventaire des outils, et ce qui existe de plus récent.
 *
 *   GET /api/admin/outils          → le catalogue confronté au dépôt, plus le
 *                                    dernier relevé des versions s'il y en a un
 *   GET /api/admin/outils?maj=1    → la même chose, avec un relevé neuf
 *
 * Le chargement ne touche jamais au réseau : il rend le relevé que la pastille
 * du compte a déjà fait (voir `lib/server/misesAJour.ts`), pour que
 * l'administrateur qui la suit trouve aussitôt les lignes concernées. Le bouton,
 * lui, en force un neuf.
 */

import { NextResponse } from 'next/server'
import { CREDITS } from '@/lib/credits/catalogue.ts'
import { inventorier } from '@/lib/credits/inventaire.ts'
import { getAdmin } from '@/lib/server/admin.ts'
import { releveDesVersions } from '@/lib/server/misesAJour.ts'
import { tDeLaRequete } from '@/lib/i18n/serveur.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(requete: Request) {
  const t = tDeLaRequete(requete)
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: t('api.notFound') }, { status: 404 })

  const inventaire = inventorier()
  const chercherMaj = new URL(requete.url).searchParams.get('maj') === '1'

  // Le catalogue est toujours rendu en entier : c'est lui la liste des outils.
  // L'inventaire ne fait qu'y ajouter ce que le dépôt sait en dire.
  const parPaquet = new Map(inventaire.paquets.map((entree) => [entree.paquet, entree]))

  const releve = await releveDesVersions(chercherMaj ? 'forcer' : 'memoire')

  const outils = CREDITS.map((credit) => {
    const inventorie = credit.paquet ? (parPaquet.get(credit.paquet) ?? null) : null
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
      derniere: releve?.dernieres.get(credit.id) ?? null,
    }
  })

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
    /** Crédits qu'un espace de travail manquant empêche de trancher. */
    indetermines: inventaire.indetermines.map((credit) => ({
      nom: credit.nom,
      paquet: credit.paquet,
    })),
    versionsDivergentes: inventaire.versionsDivergentes,
    depot: {
      lu: inventaire.racine !== null,
      espacesLus: inventaire.espacesLus,
      espacesIllisibles: inventaire.espacesIllisibles,
    },
    majCherchees: releve !== null,
  })
}
