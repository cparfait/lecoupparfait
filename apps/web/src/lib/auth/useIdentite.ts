'use client'

/**
 * Qui est connecté, pour toute l'interface.
 *
 * L'identité était lue par `AccountButton`, et par lui seul. Le jour où un
 * second composant en a eu besoin — la pastille de série, qui n'a de sens que
 * pour un compte — la question s'est posée de refaire le même `fetch` ailleurs.
 * Deux requêtes identiques à chaque navigation pour une réponse qui ne change
 * pas entre elles : c'est le genre de duplication qui ne se voit pas et qui se
 * multiplie.
 *
 * L'état est donc **partagé**, comme celui de la journée dans `quotidien.ts` :
 * un seul appel, plusieurs lecteurs, et une mise à jour qui les atteint tous
 * dans le même rendu.
 *
 * `undefined` tant qu'on ne sait pas, et cette troisième valeur est le cœur du
 * sujet. Sans elle, un composant afficherait « Se connecter » pendant un
 * dixième de seconde à quelqu'un qui l'est déjà, ou ferait clignoter la série
 * de celui qui en a une. On ne montre rien tant qu'on ne sait pas.
 */

import { useEffect, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'

export interface Identite {
  username: string
  avatar: string | null
}

export interface StatutCourriel {
  email: string | null
  verified: boolean
}

let identite: Identite | null | undefined = undefined
/**
 * Le serveur sait-il envoyer un courriel ?
 *
 * Rangé ici parce que la réponse voyage déjà dans `/api/auth` : la lire
 * ailleurs voudrait dire refaire la même requête, ce que ce fichier existe
 * précisément pour éviter. `undefined` tant qu'on ne sait pas, comme
 * l'identité — on ne masque pas le lien de récupération avant d'avoir la
 * réponse, sinon il clignoterait à chaque chargement.
 */
let courriel: boolean | undefined = undefined
/**
 * État de sa propre adresse : absente, en attente de confirmation, confirmée.
 *
 * Rangé ici pour la même raison que `courriel` : `/api/auth` le renvoie déjà.
 * L'écran de profil refaisait la requête entière pour ce seul champ.
 */
let adresse: StatutCourriel | null | undefined = undefined
let enCours: Promise<void> | null = null
const abonnes = new Set<() => void>()

function souscrire(rappel: () => void): () => void {
  abonnes.add(rappel)
  return () => abonnes.delete(rappel)
}

const instantane = () => identite
/** Le rendu serveur ne connaît pas la session : rien à afficher. */
const instantaneServeur = () => undefined

/**
 * Relit l'identité auprès du serveur.
 *
 * Les appels concurrents partagent la même requête : au premier rendu, deux
 * composants montés ensemble en déclencheraient sinon deux.
 */
export function rafraichirIdentite(): Promise<void> {
  if (enCours) return enCours
  enCours = fetch('/api/auth')
    .then((reponse) => reponse.json())
    .then((donnees: { user: Identite | null; courriel?: boolean; email?: StatutCourriel }) => {
      identite = donnees.user
      courriel = donnees.courriel ?? false
      adresse = donnees.email ?? null
    })
    .catch(() => {
      // Serveur injoignable : on considère qu'il n'y a pas de session plutôt
      // que de rester indéfiniment dans l'état « on ne sait pas », qui
      // masquerait le bouton de connexion pour de bon.
      identite = null
      // Même raisonnement en sens inverse : on ne prétend pas savoir envoyer un
      // courriel auprès d'un serveur qu'on ne joint pas.
      courriel = false
      adresse = null
    })
    .finally(() => {
      enCours = null
      for (const rappel of abonnes) rappel()
    })
  return enCours
}

export function useIdentite(): Identite | null | undefined {
  const valeur = useSyncExternalStore(souscrire, instantane, instantaneServeur)

  // La navigation relit l'identité : c'est ce qui met l'en-tête à jour après
  // une connexion, une inscription ou une déconnexion, sans rechargement.
  const pathname = usePathname()
  useEffect(() => {
    void rafraichirIdentite()
  }, [pathname])

  return valeur
}

const instantaneCourriel = () => courriel
const instantaneCourrielServeur = () => undefined

/**
 * Le serveur peut-il envoyer un courriel ?
 *
 * `undefined` tant qu'on l'ignore : les écrans qui s'en servent masquent une
 * porte de récupération, et la faire disparaître après coup est pire que de
 * l'afficher un instant de trop.
 */
export function useCourrielDisponible(): boolean | undefined {
  const valeur = useSyncExternalStore(souscrire, instantaneCourriel, instantaneCourrielServeur)
  useEffect(() => {
    void rafraichirIdentite()
  }, [])
  return valeur
}

const instantaneAdresse = () => adresse
const instantaneAdresseServeur = () => undefined

/**
 * L'état de sa propre adresse électronique.
 *
 * `undefined` tant qu'on ne sait pas, `null` pour un visiteur. Ne concerne
 * jamais que soi : la fiche publique d'un joueur n'expose pas son adresse, ni
 * même qu'il en a une — c'est la route qui s'en charge, pas cet appel.
 */
export function useStatutCourriel(): StatutCourriel | null | undefined {
  const valeur = useSyncExternalStore(souscrire, instantaneAdresse, instantaneAdresseServeur)
  useEffect(() => {
    void rafraichirIdentite()
  }, [])
  return valeur
}
