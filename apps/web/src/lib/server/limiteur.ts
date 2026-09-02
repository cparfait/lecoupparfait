/**
 * Limitation du rythme des requêtes, en mémoire.
 *
 * Trois routes s'étaient écrit chacune la leur — la connexion, les invitations
 * sans compte, puis l'archivage des parties. Trois copies de sept lignes, trois
 * `Map` qui ne se purgeaient pas toutes, et trois occasions de se tromper de
 * fenêtre. Il n'y en a plus qu'une.
 *
 * En mémoire, donc remise à zéro à chaque redémarrage : c'est volontaire.
 * L'objectif est de ralentir un abus, pas de tenir un registre. Une plateforme
 * auto-hébergée pour un cercle d'amis n'a pas besoin de Redis pour ça. Le
 * corollaire, à garder en tête : avec plusieurs instances Node, chacune compte
 * pour elle. Le jour où l'on en met deux, ce fichier est le premier à revoir.
 */

interface Compteur {
  count: number
  resetAt: number
}

export interface Limiteur {
  /** `true` si l'appel dépasse le quota. L'appel compte, dépassement compris. */
  depasse(cle: string): boolean
  /** Secondes à attendre avant que la fenêtre se rouvre, pour `Retry-After`. */
  attente(cle: string): number
  /** Efface un compteur : à appeler quand une tentative a réussi. */
  oublie(cle: string): void
}

/**
 * Fenêtre fixe, pas glissante : au bout de `fenetreMs` le compteur repart de
 * zéro. Un abus peut donc passer deux quotas à cheval sur la bascule. C'est
 * assumé — le glissant demande de garder les horodatages de chaque appel, pour
 * une précision dont aucun de ces usages n'a besoin.
 */
export function creerLimiteur(fenetreMs: number, maximum: number): Limiteur {
  const compteurs = new Map<string, Compteur>()

  // Sans purge, la table garde une entrée par adresse IP vue depuis le
  // démarrage : une fuite lente, mais une fuite.
  setInterval(() => {
    const maintenant = Date.now()
    for (const [cle, compteur] of compteurs) {
      if (compteur.resetAt < maintenant) compteurs.delete(cle)
    }
  }, fenetreMs).unref?.()

  return {
    depasse(cle) {
      const maintenant = Date.now()
      const compteur = compteurs.get(cle)
      if (!compteur || compteur.resetAt < maintenant) {
        compteurs.set(cle, { count: 1, resetAt: maintenant + fenetreMs })
        return false
      }
      compteur.count++
      return compteur.count > maximum
    },
    attente(cle) {
      const compteur = compteurs.get(cle)
      if (!compteur) return 0
      return Math.max(0, Math.ceil((compteur.resetAt - Date.now()) / 1000))
    },
    oublie(cle) {
      compteurs.delete(cle)
    },
  }
}
