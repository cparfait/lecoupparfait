/**
 * Ce qu'une passerelle vers le serveur d'analyse doit transmettre.
 *
 * Trois routes de cette application relaient vers lui — `/api/analyse`,
 * `/api/voix`, `/api/maia` — et il compte ses requêtes **par adresse**. Vues de
 * lui, elles venaient toutes d'ici, c'est-à-dire d'une seule adresse : le quota
 * d'une route se serait partagé entre tous les joueurs, et le premier à lancer
 * une analyse aurait fermé la porte aux autres.
 *
 * On lui passe donc l'adresse d'origine. Il ne l'écoute que si `TRUST_PROXY=1`,
 * sans quoi n'importe qui pourrait s'inventer une adresse neuve à chaque
 * requête et rendre le compteur inutile. Voir `apps/server/src/limites.ts`.
 */
export function entetesDeRelais(request: Request): Record<string, string> {
  const origine =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    null
  return {
    'Content-Type': 'application/json',
    ...(origine ? { 'X-Forwarded-For': origine } : {}),
  }
}
