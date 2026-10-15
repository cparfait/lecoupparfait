/**
 * Le battement de présence.
 *
 *   POST /api/presence   → « je suis là, devant l'écran, maintenant »
 *
 * **Le défaut qu'il corrige.** `users.last_seen_at` n'était écrit qu'au moment
 * de s'authentifier, et l'administration disait « connecté » dès qu'un compte
 * avait une session non expirée. Or une session dure trente jours et l'on ne se
 * déconnecte jamais d'une application installée sur l'écran d'accueil : au bout
 * de quelques semaines, tout le monde était affiché connecté en permanence, et
 * la pastille verte du carnet d'amis ne valait pas mieux. Un cookie valide dit
 * qu'on *pourrait* revenir, pas qu'on est là.
 *
 * **Pourquoi une route dédiée plutôt qu'une marque à chaque requête.** Marquer
 * dans `resolveSession` aurait rendu présent tout ce qui parle au serveur — y
 * compris l'interrogation des défis d'un onglet oublié en arrière-plan, ou une
 * application installée qui continue de vivre pendant qu'on téléphone. Le
 * battement, lui, ne part que d'un onglet **visible** : c'est la seule chose
 * dont le navigateur puisse témoigner de la présence de quelqu'un.
 *
 * La réponse ne dit rien — pas même si la session est valide. C'est voulu : le
 * client bat sans lire, et une route de mesure n'a pas à devenir un moyen de
 * tester des cookies.
 */

import { NextResponse } from 'next/server'
import { touchPresence } from '@coupparfait/db/auth'
import { encoderAppareil, lireAppareil } from '@/lib/appareil.ts'
import { getCurrentUser } from '@/lib/server/session.ts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const utilisateur = await getCurrentUser()
    if (utilisateur) {
      // L'appareil est facultatif : un onglet resté ouvert depuis avant ce
      // champ bat encore sans corps, et la présence doit compter quand même.
      const corps: unknown = await request.json().catch(() => null)
      const appareil = lireAppareil((corps as { appareil?: unknown } | null)?.appareil)
      await touchPresence(utilisateur.userId, appareil ? encoderAppareil(appareil) : undefined)
    }
  } catch (error) {
    // Base injoignable : la présence est la dernière chose dont on veuille
    // qu'elle fasse échouer quoi que ce soit. Le prochain battement réessaiera.
    console.error('[presence]', error)
  }

  return new NextResponse(null, { status: 204 })
}
