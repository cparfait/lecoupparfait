import 'server-only'

/**
 * Qui a le droit d'administrer.
 *
 * Deux sources, et l'ordre compte.
 *
 *  1. **`ADMIN_USERNAMES`**, une liste de pseudos séparés par des virgules dans
 *     l'environnement. Elle prime sur la base et ne peut pas en être délogée.
 *  2. **`users.role = 'admin'`**, écrit depuis cette même interface pour les
 *     administrateurs suivants.
 *
 * **Pourquoi la variable d'environnement d'abord.** La colonne `role` existait
 * depuis le début et ne valait « admin » pour personne : sans premier
 * administrateur, une interface d'administration ne s'ouvre jamais. On aurait
 * pu régler ça par une commande à lancer une fois, mais l'accès dépendrait
 * alors d'une ligne de base de données — et restaurer une sauvegarde antérieure
 * à la promotion suffirait à s'enfermer dehors de son propre serveur. Une
 * variable d'environnement survit à une restauration, se change sans SQL, et
 * se retire aussi vite qu'elle se pose.
 *
 * Elle est comparée sur le pseudo normalisé, comme partout ailleurs : c'est
 * `usernameLower` qui porte l'unicité, et un administrateur qui devrait deviner
 * la casse exacte de son propre pseudo serait une farce.
 */

import { eq, getDb, users } from '@coupparfait/db'
import type { SessionIdentity } from '@coupparfait/db/auth'
import { getCurrentUser } from './session.ts'

/** Les pseudos promus par l'environnement, normalisés. */
function pseudosPrivilegies(): Set<string> {
  return new Set(
    (process.env.ADMIN_USERNAMES ?? '')
      .split(',')
      .map((pseudo) => pseudo.trim().toLowerCase())
      .filter(Boolean),
  )
}

export interface Administrateur extends SessionIdentity {
  /** Vrai quand le droit vient de l'environnement et non de la base. */
  parEnvironnement: boolean
}

/**
 * L'administrateur courant, ou `null`.
 *
 * `null` couvre les trois cas — pas de session, session ordinaire, compte
 * désactivé — et c'est voulu : une interface d'administration ne doit pas
 * expliquer *pourquoi* elle refuse. Distinguer « tu n'es pas connecté » de
 * « tu n'es pas administrateur » apprend à un visiteur qu'il existe ici un
 * compte administrateur à trouver.
 */
export async function getAdmin(): Promise<Administrateur | null> {
  const utilisateur = await getCurrentUser()
  if (!utilisateur) return null

  const privilegies = pseudosPrivilegies()
  if (privilegies.has(utilisateur.username.toLowerCase())) {
    return { ...utilisateur, parEnvironnement: true }
  }

  // La session ne porte pas le rôle : on le relit, plutôt que de l'y ajouter.
  // Un rôle mis en cache dans une session de trente jours resterait « admin »
  // trente jours après une rétrogradation, ce qui est exactement le genre de
  // délai qu'on ne veut pas sur un privilège.
  const lignes = await getDb()
    .select({ role: users.role, disabled: users.disabled })
    .from(users)
    .where(eq(users.id, utilisateur.userId))
    .limit(1)

  const ligne = lignes[0]
  if (!ligne || ligne.disabled || ligne.role !== 'admin') return null
  return { ...utilisateur, parEnvironnement: false }
}

/** Y a-t-il au moins un administrateur possible ? Sert au diagnostic. */
export function administrationConfiguree(): boolean {
  return pseudosPrivilegies().size > 0
}
