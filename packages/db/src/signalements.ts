/**
 * Les signalements du tchat.
 *
 * Un joueur signale un message ; le serveur temps réel, qui seul sait qui l'a
 * écrit, l'enregistre ici (`enregistrerSignalement`). L'administration les lit
 * dans l'onglet « Contenus » et les marque traités. Le ménage quotidien efface
 * ce qui a plus de quatre-vingt-dix jours — voir la table `signalements`.
 *
 * Le navigateur ne désigne jamais un auteur : il n'apporte que le numéro d'un
 * message que le salon a lui-même distribué. Il ne peut donc pas faire porter
 * un signalement sur quelqu'un qui n'a rien écrit.
 */

import { and, desc, eq, isNull, lt, or, sql } from 'drizzle-orm'
import { getDb } from './index.ts'
import { signalements, users } from './schema.ts'

/** Quatre-vingt-dix jours : le temps d'y répondre, pas une archive. */
export const CONSERVATION_SIGNALEMENTS_JOURS = 90

export interface NouveauSignalement {
  partie: string
  texte: string
  auteurNom: string
  auteurId: string | null
  auteurNavigateur: string | null
  parId: string | null
  parNavigateur: string | null
}

export async function enregistrerSignalement(signalement: NouveauSignalement): Promise<void> {
  await getDb()
    .insert(signalements)
    .values({
      ...signalement,
      texte: signalement.texte.slice(0, 300),
      auteurNom: signalement.auteurNom.slice(0, 40),
    })
}

export interface SignalementATraiter {
  id: string
  createdAt: Date
  partie: string
  texte: string
  auteurNom: string
  auteurId: string | null
  /** Le pseudo actuel du compte, s'il en a un : il a pu changer depuis. */
  auteurPseudo: string | null
  auteurDesactive: boolean
  /** Combien de signalements, traités ou non, visent ce même auteur. */
  visantLAuteur: number
}

/** Les signalements pas encore traités, du plus récent au plus ancien. */
export async function signalementsATraiter(limite = 50): Promise<SignalementATraiter[]> {
  const base = getDb()
  const lignes = await base
    .select({
      id: signalements.id,
      createdAt: signalements.createdAt,
      partie: signalements.partie,
      texte: signalements.texte,
      auteurNom: signalements.auteurNom,
      auteurId: signalements.auteurId,
      auteurNavigateur: signalements.auteurNavigateur,
      auteurPseudo: users.username,
      auteurDesactive: users.disabled,
    })
    .from(signalements)
    .leftJoin(users, eq(users.id, signalements.auteurId))
    .where(isNull(signalements.traiteLe))
    .orderBy(desc(signalements.createdAt))
    .limit(limite)

  // Un auteur signalé dix fois n'est pas un auteur signalé une fois : le
  // compte se fait sur tout ce qui est encore en base, traité compris.
  const parAuteur = new Map<string, number>()
  const cles = [...new Set(lignes.map(cleAuteur).filter((cle) => cle !== null))]
  if (cles.length > 0) {
    const comptes = await base
      .select({
        auteurId: signalements.auteurId,
        auteurNavigateur: signalements.auteurNavigateur,
        total: sql<number>`count(*)::int`,
      })
      .from(signalements)
      .where(
        or(
          ...lignes.map((ligne) =>
            ligne.auteurId
              ? eq(signalements.auteurId, ligne.auteurId)
              : eq(signalements.auteurNavigateur, ligne.auteurNavigateur ?? ''),
          ),
        ),
      )
      .groupBy(signalements.auteurId, signalements.auteurNavigateur)
    for (const compte of comptes) {
      const cle = cleAuteur(compte)
      if (cle) parAuteur.set(cle, (parAuteur.get(cle) ?? 0) + Number(compte.total))
    }
  }

  return lignes.map((ligne) => ({
    id: ligne.id,
    createdAt: ligne.createdAt,
    partie: ligne.partie,
    texte: ligne.texte,
    auteurNom: ligne.auteurNom,
    auteurId: ligne.auteurId,
    auteurPseudo: ligne.auteurPseudo ?? null,
    auteurDesactive: Boolean(ligne.auteurDesactive),
    visantLAuteur: parAuteur.get(cleAuteur(ligne) ?? '') ?? 1,
  }))
}

function cleAuteur(ligne: {
  auteurId: string | null
  auteurNavigateur: string | null
}): string | null {
  if (ligne.auteurId) return `compte:${ligne.auteurId}`
  if (ligne.auteurNavigateur) return `navigateur:${ligne.auteurNavigateur}`
  return null
}

/** Marque un signalement comme regardé. Rend `false` s'il n'existe pas ou l'était déjà. */
export async function traiterSignalement(id: string): Promise<boolean> {
  const lignes = await getDb()
    .update(signalements)
    .set({ traiteLe: new Date() })
    .where(and(eq(signalements.id, id), isNull(signalements.traiteLe)))
    .returning({ id: signalements.id })
  return lignes.length > 0
}

/** Efface ce qui a dépassé la durée de conservation. Rend le nombre de lignes effacées. */
export async function oublierSignalements(
  joursDeConservation = CONSERVATION_SIGNALEMENTS_JOURS,
): Promise<number> {
  const limite = new Date(Date.now() - joursDeConservation * 24 * 60 * 60 * 1000)
  const effaces = await getDb()
    .delete(signalements)
    .where(lt(signalements.createdAt, limite))
    .returning({ id: signalements.id })
  return effaces.length
}
