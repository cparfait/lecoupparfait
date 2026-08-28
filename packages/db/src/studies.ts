/**
 * Études : le classeur de positions commentées.
 *
 * Une étude appartient à quelqu'un et contient des chapitres ordonnés. Chaque
 * chapitre est une position de départ, une suite de coups, et des commentaires
 * indexés par demi-coup.
 *
 * Deux visibilités seulement. `private` : l'auteur seul. `unlisted` :
 * accessible à qui a l'adresse, ce qui permet d'envoyer une étude sans
 * demander de compte à personne. Pas de « public » listé — un annuaire
 * d'études appellerait une modération dont un cercle d'amis n'a pas besoin.
 */

import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { getDb } from './index.ts'
import { studies, studyChapters, users } from './schema.ts'

export interface Chapter {
  id: string
  title: string
  startFen: string | null
  moves: string[]
  comments: Record<string, string>
  position: number
}

export interface Study {
  id: string
  slug: string
  title: string
  description: string | null
  visibility: string
  owner: { id: string; username: string }
  updatedAt: Date
  chapters: Chapter[]
}

/** Résumé pour la liste : on ne charge pas les chapitres pour les compter. */
export interface StudySummary {
  id: string
  slug: string
  title: string
  description: string | null
  visibility: string
  updatedAt: Date
  chapters: number
}

const ALPHABET = 'bcdfghjkmnpqrstvwxyz23456789'

/** Même alphabet que les parties : sans voyelles, pour qu'aucun mot ne se forme. */
function makeSlug(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  return [...bytes].map((byte) => ALPHABET[byte % ALPHABET.length]).join('')
}

function toChapter(row: typeof studyChapters.$inferSelect): Chapter {
  return {
    id: row.id,
    title: row.title,
    startFen: row.startFen,
    moves: row.moves ? row.moves.split(' ').filter(Boolean) : [],
    comments: row.comments,
    position: row.position,
  }
}

/** Les études de quelqu'un, la plus récemment modifiée en tête. */
export async function listStudies(ownerId: string): Promise<StudySummary[]> {
  const db = getDb()
  const rows = await db
    .select({
      id: studies.id,
      slug: studies.slug,
      title: studies.title,
      description: studies.description,
      visibility: studies.visibility,
      updatedAt: studies.updatedAt,
      chapters: sql<number>`(select count(*) from ${studyChapters} where ${studyChapters.studyId} = ${studies.id})`,
    })
    .from(studies)
    .where(eq(studies.ownerId, ownerId))
    .orderBy(desc(studies.updatedAt))

  return rows.map((row) => ({ ...row, chapters: Number(row.chapters) }))
}

/**
 * Une étude et ses chapitres, si le demandeur a le droit de la voir.
 *
 * Une étude privée n'existe que pour son auteur : on renvoie `null` plutôt
 * qu'une erreur d'autorisation, qui apprendrait qu'elle existe.
 */
export async function getStudy(slug: string, viewerId: string | null): Promise<Study | null> {
  const db = getDb()
  const [row] = await db
    .select({ study: studies, ownerName: users.username })
    .from(studies)
    .innerJoin(users, eq(users.id, studies.ownerId))
    .where(eq(studies.slug, slug))
    .limit(1)

  if (!row) return null
  const own = viewerId !== null && viewerId === row.study.ownerId
  if (!own && row.study.visibility === 'private') return null

  const chapters = await db
    .select()
    .from(studyChapters)
    .where(eq(studyChapters.studyId, row.study.id))
    .orderBy(asc(studyChapters.position), asc(studyChapters.createdAt))

  return {
    id: row.study.id,
    slug: row.study.slug,
    title: row.study.title,
    description: row.study.description,
    visibility: row.study.visibility,
    owner: { id: row.study.ownerId, username: row.ownerName },
    updatedAt: row.study.updatedAt,
    chapters: chapters.map(toChapter),
  }
}

export async function createStudy(
  ownerId: string,
  title: string,
): Promise<{ slug: string } | null> {
  const db = getDb()
  const clean = title.trim().slice(0, 120) || 'Étude sans titre'
  const [row] = await db
    .insert(studies)
    .values({ slug: makeSlug(), ownerId, title: clean })
    .returning({ slug: studies.slug })
  return row ?? null
}

/**
 * Modifie l'étude elle-même. Renvoie faux si elle n'appartient pas au
 * demandeur — la vérification est dans la clause, pas avant : deux requêtes
 * laisseraient une fenêtre entre le contrôle et l'écriture.
 */
export async function updateStudy(
  ownerId: string,
  id: string,
  patch: { title?: string; description?: string; visibility?: string },
): Promise<boolean> {
  const db = getDb()
  const values: Record<string, unknown> = { updatedAt: new Date() }
  if (patch.title !== undefined) values.title = patch.title.trim().slice(0, 120)
  if (patch.description !== undefined) values.description = patch.description.trim().slice(0, 500)
  if (patch.visibility === 'private' || patch.visibility === 'unlisted') {
    values.visibility = patch.visibility
  }

  const done = await db
    .update(studies)
    .set(values)
    .where(and(eq(studies.id, id), eq(studies.ownerId, ownerId)))
    .returning({ id: studies.id })
  return done.length > 0
}

export async function deleteStudy(ownerId: string, id: string): Promise<boolean> {
  const db = getDb()
  const done = await db
    .delete(studies)
    .where(and(eq(studies.id, id), eq(studies.ownerId, ownerId)))
    .returning({ id: studies.id })
  return done.length > 0
}

/** L'étude appartient-elle bien à ce compte ? Vérifié avant tout chapitre. */
async function owns(ownerId: string, studyId: string): Promise<boolean> {
  const db = getDb()
  const [row] = await db
    .select({ id: studies.id })
    .from(studies)
    .where(and(eq(studies.id, studyId), eq(studies.ownerId, ownerId)))
    .limit(1)
  return row != null
}

export async function addChapter(
  ownerId: string,
  studyId: string,
  chapter: { title: string; startFen?: string | null; moves?: string[] },
): Promise<Chapter | null> {
  if (!(await owns(ownerId, studyId))) return null
  const db = getDb()

  const [rank] = await db
    .select({ next: sql<number>`coalesce(max(${studyChapters.position}), -1) + 1` })
    .from(studyChapters)
    .where(eq(studyChapters.studyId, studyId))

  const [row] = await db
    .insert(studyChapters)
    .values({
      studyId,
      title: chapter.title.trim().slice(0, 120) || 'Chapitre',
      startFen: chapter.startFen ?? null,
      moves: (chapter.moves ?? []).join(' '),
      position: Number(rank?.next ?? 0),
    })
    .returning()

  await db.update(studies).set({ updatedAt: new Date() }).where(eq(studies.id, studyId))
  return row ? toChapter(row) : null
}

/**
 * Enregistre un chapitre : ses coups, ses commentaires, son titre.
 *
 * L'appartenance se vérifie par une jointure sur l'étude plutôt que par une
 * lecture préalable : un chapitre ne se modifie que si l'étude qui le contient
 * est bien celle de son auteur.
 */
export async function saveChapter(
  ownerId: string,
  chapterId: string,
  patch: { title?: string; moves?: string[]; comments?: Record<string, string> },
): Promise<boolean> {
  const db = getDb()

  const [row] = await db
    .select({ studyId: studyChapters.studyId })
    .from(studyChapters)
    .innerJoin(studies, eq(studies.id, studyChapters.studyId))
    .where(and(eq(studyChapters.id, chapterId), eq(studies.ownerId, ownerId)))
    .limit(1)

  if (!row) return false

  const values: Record<string, unknown> = {}
  if (patch.title !== undefined) values.title = patch.title.trim().slice(0, 120)
  if (patch.moves !== undefined) values.moves = patch.moves.join(' ')
  if (patch.comments !== undefined) {
    // Un commentaire vide est retiré plutôt qu'enregistré : sinon la carte des
    // commentaires enfle de clés qui ne disent rien.
    const cleaned: Record<string, string> = {}
    for (const [ply, text] of Object.entries(patch.comments)) {
      const trimmed = text.trim().slice(0, 2000)
      if (trimmed) cleaned[ply] = trimmed
    }
    values.comments = cleaned
  }
  if (Object.keys(values).length === 0) return true

  await db.update(studyChapters).set(values).where(eq(studyChapters.id, chapterId))
  await db.update(studies).set({ updatedAt: new Date() }).where(eq(studies.id, row.studyId))
  return true
}

export async function deleteChapter(ownerId: string, chapterId: string): Promise<boolean> {
  const db = getDb()
  const [row] = await db
    .select({ id: studyChapters.id })
    .from(studyChapters)
    .innerJoin(studies, eq(studies.id, studyChapters.studyId))
    .where(and(eq(studyChapters.id, chapterId), eq(studies.ownerId, ownerId)))
    .limit(1)

  if (!row) return false
  await db.delete(studyChapters).where(eq(studyChapters.id, chapterId))
  return true
}
