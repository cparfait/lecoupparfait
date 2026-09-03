/**
 * Le mode carrière.
 *
 *   GET    → où en est le joueur, et quelle est la prochaine chose à faire
 *   POST   → valide une étape (leçon vue, puzzle réussi, partie terminée)
 *   DELETE → tout recommencer
 *
 * **Le client ne dit jamais « passe au chapitre 5 ».** Il annonce un fait
 * — « j'ai réussi un puzzle », « j'ai gagné » — et c'est le serveur qui en tire
 * les conséquences : expérience gagnée, étoiles, hauts faits, passage au
 * chapitre suivant. Laisser le client calculer sa propre progression revient à
 * la lui offrir, et surtout à la dupliquer : deux endroits qui appliquent les
 * mêmes règles finissent toujours par diverger.
 *
 * La carrière **exige un compte**, seule rubrique dans ce cas avec le défi du
 * jour. Une progression sur douze chapitres n'a aucun sens si elle disparaît en
 * fermant l'onglet, et la promettre pour la perdre serait pire que de ne pas la
 * proposer. Un visiteur anonyme reçoit `progression: null` sans que ce soit une
 * erreur : l'écran affiche alors la carte complète et invite à créer un compte.
 */

import { NextResponse } from 'next/server'
import {
  CARRIERE_TERMINEE,
  CHAPITRES,
  HAUTS_FAITS,
  PROGRESSION_INITIALE,
  XP,
  chapitre as chapitreNumero,
  chapitreAcheve,
  etoilesPour,
  type Progression,
} from '@coupparfait/core'
import { careerProgress, eq, getDb } from '@coupparfait/db'
import { getCurrentUser } from '@/lib/server/session.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Fait =
  | { type: 'lecon' }
  | { type: 'puzzle' }
  | { type: 'aide' }
  | { type: 'partie'; gagnee: boolean; coups?: number }

/** Lit la ligne du joueur, ou la crée à la volée. */
async function lire(userId: string): Promise<Progression> {
  const database = getDb()
  const lignes = await database
    .select()
    .from(careerProgress)
    .where(eq(careerProgress.userId, userId))
    .limit(1)

  const ligne = lignes[0]
  if (ligne) {
    return {
      chapter: ligne.chapter,
      lessonDone: ligne.lessonDone,
      puzzlesDone: ligne.puzzlesDone,
      winsInChapter: ligne.winsInChapter,
      losingStreak: ligne.losingStreak,
      helpUsed: ligne.helpUsed,
      stars: ligne.stars,
      xp: ligne.xp,
      badges: ligne.badges,
    }
  }

  // Première visite : on crée la ligne tout de suite plutôt qu'au premier
  // geste. Sans elle, l'écran ne saurait pas distinguer « pas encore commencé »
  // de « pas de compte », et afficherait l'invitation à s'inscrire à quelqu'un
  // qui est connecté.
  await database.insert(careerProgress).values({ userId }).onConflictDoNothing()
  return { ...PROGRESSION_INITIALE }
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ progression: null })

  try {
    return NextResponse.json({ progression: await lire(user.userId) })
  } catch (error) {
    console.error('[carriere]', error)
    // Une panne de base ne doit pas afficher « crée un compte » à quelqu'un qui
    // en a un : on renvoie une progression vierge, l'écran reste lisible.
    return NextResponse.json({ progression: { ...PROGRESSION_INITIALE }, degrade: true })
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ ok: false, raison: 'anonyme' })

  let fait: Fait
  try {
    fait = (await request.json()) as Fait
  } catch {
    return NextResponse.json({ ok: false, raison: 'corps illisible' }, { status: 400 })
  }

  try {
    const avant = await lire(user.userId)
    if (avant.chapter >= CARRIERE_TERMINEE) {
      return NextResponse.json({ ok: true, progression: avant, gains: null })
    }

    const chap = chapitreNumero(avant.chapter)
    if (!chap) return NextResponse.json({ ok: false, raison: 'chapitre inconnu' }, { status: 400 })

    const apres: Progression = { ...avant, stars: { ...avant.stars }, badges: [...avant.badges] }
    /** Ce qui vient d'être gagné, pour que l'écran puisse le célébrer. */
    const gains = { xp: 0, etoiles: 0, badges: [] as string[], chapitreTermine: false }

    switch (fait.type) {
      case 'lecon':
        // Idempotent : revoir une leçon ne rapporte pas deux fois.
        if (!apres.lessonDone) {
          apres.lessonDone = true
          gains.xp += XP.lecon
        }
        break

      case 'puzzle':
        if (apres.puzzlesDone < chap.puzzles) {
          apres.puzzlesDone += 1
          gains.xp += XP.puzzle
        }
        break

      case 'aide':
        // L'aide ne coûte pas d'expérience : elle coûte une étoile, ce qui se
        // voit à la fin. Punir sur-le-champ dissuaderait de demander de l'aide
        // exactement quand on en a besoin.
        apres.helpUsed += 1
        break

      case 'partie': {
        if (fait.gagnee) {
          if (apres.winsInChapter < chap.victoires) {
            apres.winsInChapter += 1
            gains.xp += XP.victoire
          }
          if (avant.losingStreak >= 3) debloquer(apres, gains, 'revanche')
          if (typeof fait.coups === 'number' && fait.coups > 0 && fait.coups < 50) {
            debloquer(apres, gains, 'expeditif')
          }
          // Gagner sans avoir demandé d'indice ni bénéficié du coup de main.
          // Vérifié ici et non chez le client : c'est le serveur qui compte les
          // aides, et c'est le seul à pouvoir garantir qu'il n'y en a pas eu.
          if (apres.helpUsed === 0) debloquer(apres, gains, 'chirurgien')
          apres.losingStreak = 0
        } else {
          apres.losingStreak += 1
        }
        break
      }

      default:
        return NextResponse.json({ ok: false, raison: 'fait inconnu' }, { status: 400 })
    }

    // ── Passage au chapitre suivant ──────────────────────────────────────
    if (chapitreAcheve(chap, apres)) {
      const etoiles = etoilesPour({ aides: apres.helpUsed, defaites: apres.losingStreak })
      apres.stars[String(chap.numero)] = Math.max(apres.stars[String(chap.numero)] ?? 0, etoiles)
      gains.etoiles = etoiles
      gains.xp += XP.chapitre + XP.etoile * etoiles
      gains.chapitreTermine = true

      if (chap.numero === 1) debloquer(apres, gains, 'premier-pas')
      if (etoiles === 3) debloquer(apres, gains, 'sans-faute')
      if (Object.values(apres.stars).filter((e) => e === 3).length >= 3) {
        debloquer(apres, gains, 'triplette')
      }
      if (chap.numero + 1 >= 7) debloquer(apres, gains, 'mi-chemin')
      if (chap.numero === CHAPITRES.length) {
        debloquer(apres, gains, 'sans-filet')
        debloquer(apres, gains, 'couronne')
      }

      apres.chapter = chap.numero + 1
      apres.lessonDone = false
      apres.puzzlesDone = 0
      apres.winsInChapter = 0
      apres.helpUsed = 0
      apres.losingStreak = 0
    }

    // Hauts faits cumulatifs, évalués après coup pour ne pas dépendre de
    // l'ordre des cas ci-dessus.
    const leconsVues = apres.chapter - 1 + (apres.lessonDone ? 1 : 0)
    if (leconsVues >= CHAPITRES.length) debloquer(apres, gains, 'erudit')
    if (puzzlesCumules(apres) >= 25) debloquer(apres, gains, 'tacticien')

    apres.xp += gains.xp

    await getDb()
      .update(careerProgress)
      .set({
        chapter: apres.chapter,
        lessonDone: apres.lessonDone,
        puzzlesDone: apres.puzzlesDone,
        winsInChapter: apres.winsInChapter,
        losingStreak: apres.losingStreak,
        helpUsed: apres.helpUsed,
        stars: apres.stars,
        xp: apres.xp,
        badges: apres.badges,
        updatedAt: new Date(),
      })
      .where(eq(careerProgress.userId, user.userId))

    return NextResponse.json({ ok: true, progression: apres, gains })
  } catch (error) {
    console.error('[carriere]', error)
    return NextResponse.json({ ok: false, raison: 'enregistrement impossible' })
  }
}

export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  try {
    // On efface la ligne plutôt que de la remettre à zéro champ par champ :
    // c'est la même chose, en une instruction, et il n'y a aucun risque
    // d'oublier une colonne le jour où l'on en ajoute une.
    await getDb().delete(careerProgress).where(eq(careerProgress.userId, user.userId))
    return NextResponse.json({ ok: true, progression: { ...PROGRESSION_INITIALE } })
  } catch (error) {
    console.error('[carriere]', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

/** Ajoute un haut fait s'il n'est pas déjà acquis, et le signale à l'écran. */
function debloquer(progression: Progression, gains: { badges: string[] }, id: string): void {
  if (progression.badges.includes(id)) return
  if (!HAUTS_FAITS.some((h) => h.id === id)) return
  progression.badges.push(id)
  gains.badges.push(id)
}

/**
 * Puzzles réussis depuis le début de la carrière.
 *
 * Reconstitué à partir du chapitre atteint plutôt que compté à part : les
 * chapitres franchis ont forcément vu tous leurs puzzles réussis, puisque
 * c'était la condition pour les franchir. Un compteur de plus serait un
 * compteur de plus à maintenir juste.
 */
function puzzlesCumules(progression: Progression): number {
  const franchis = CHAPITRES.filter((c) => c.numero < progression.chapter)
  return franchis.reduce((somme, c) => somme + c.puzzles, 0) + progression.puzzlesDone
}
