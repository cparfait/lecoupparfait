import 'server-only'

/**
 * Le journal des actes d'administration.
 *
 * **Pourquoi une table plutôt que la sortie standard.** Les actions étaient
 * écrites au `console.warn`, ce qui les confiait aux journaux du conteneur.
 * C'est suffisant pour enquêter quand on a un accès SSH et qu'on sait déjà quoi
 * chercher ; c'est inutile pour la personne qui administre depuis la page et
 * qui, trois semaines plus tard, se demande simplement qui a désactivé ce
 * compte. La seule trace qu'on relit est celle qui s'affiche sans quitter
 * l'écran où l'on a agi.
 *
 * On garde le `console.warn` en plus : les journaux du conteneur survivent à
 * une base perdue, et une trace en double ne coûte rien.
 *
 * **Écrire au journal ne peut pas faire échouer l'acte.** Quand on arrive ici,
 * le compte est déjà désactivé et la partie déjà supprimée : renvoyer une
 * erreur ferait croire à l'appelant que rien ne s'est passé, et l'inviterait à
 * recommencer. L'échec est donc signalé sur la sortie standard, là où le reste
 * des incidents est déjà lu.
 */

import { adminAudit, getDb } from '@coupparfait/db'
import type { Administrateur } from './admin.ts'

export interface ActeAdministratif {
  /** Le verbe, tel qu'il figure dans la route : `desactiver`, `purge`… */
  action: string
  cible?: 'compte' | 'partie' | 'analyse' | 'systeme'
  cibleId?: string | null
  /** De quoi reconnaître la cible sans avoir à la retrouver. */
  cibleNom?: string | null
  /** Le détail utile. Jamais de mot de passe, jamais d'empreinte. */
  detail?: Record<string, unknown>
}

export async function journaliser(admin: Administrateur, acte: ActeAdministratif): Promise<void> {
  console.warn(
    `[admin] ${admin.username} → ${acte.action}${acte.cibleNom ? ` sur ${acte.cibleNom}` : ''}`,
  )

  try {
    await getDb()
      .insert(adminAudit)
      .values({
        actorId: admin.userId,
        actorName: admin.username,
        action: acte.action,
        targetKind: acte.cible ?? null,
        // Tronqué à la largeur de la colonne : un identifiant hors format ne
        // doit pas faire échouer l'insertion de la ligne qui le décrit.
        targetId: acte.cibleId?.slice(0, 64) ?? null,
        targetLabel: acte.cibleNom?.slice(0, 120) ?? null,
        detail: acte.detail ?? null,
      })
  } catch (error) {
    console.error('[admin/journal] écriture impossible', error)
  }
}
