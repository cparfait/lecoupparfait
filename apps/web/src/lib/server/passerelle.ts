import { ipClient } from './ip.ts'

/**
 * Ce qu'une passerelle vers le serveur d'analyse doit transmettre.
 *
 * Trois routes de cette application relaient vers lui — `/api/analyse`,
 * `/api/voix`, `/api/maia` — et il compte ses requêtes **par adresse**. Vues de
 * lui, elles venaient toutes d'ici, c'est-à-dire d'une seule adresse : le quota
 * d'une route se serait partagé entre tous les joueurs, et le premier à lancer
 * une analyse aurait fermé la porte aux autres.
 *
 * On lui passe donc l'adresse d'origine, **déjà démêlée** par `ipClient` et
 * seule dans l'en-tête : le serveur prend le dernier maillon (`TRUST_PROXY=1`),
 * qui est alors celui-ci. Recopier la chaîne reçue lui aurait transmis les
 * maillons écrits par le client. Il ne l'écoute que si `TRUST_PROXY` est posé
 * de son côté. Voir `apps/server/src/limites.ts`.
 */
export function entetesDeRelais(request: Request): Record<string, string> {
  const origine = ipClient(request)
  return {
    'Content-Type': 'application/json',
    // Sans adresse connue, rien : « inconnu » transmis ferait de tous les
    // appels sans en-tête un seul et même client côté serveur.
    ...(origine !== 'inconnu' ? { 'X-Forwarded-For': origine } : {}),
  }
}
