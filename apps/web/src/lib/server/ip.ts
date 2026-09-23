/**
 * L'adresse du client, telle qu'on accepte de la croire.
 *
 * Tous les limiteurs de l'application comptent par adresse — connexion,
 * invitations, relais d'IA, passerelle d'analyse. Ils lisaient chacun le
 * **premier** maillon de `X-Forwarded-For`, et c'est précisément celui que le
 * client écrit lui-même : un proxy ne remplace pas l'en-tête, il *ajoute*
 * l'adresse qu'il voit à la fin. `curl -H 'X-Forwarded-For: 1.2.3.<n>'`
 * donnait donc un compteur neuf à chaque requête, et le quota anti-force-brute
 * de la connexion ne retenait plus rien.
 *
 * Le seul maillon digne de foi est celui qu'a écrit **notre** proxy : en
 * partant de la droite, on saute autant de maillons qu'il y a de proxys de
 * confiance, moins un. Avec un seul proxy (Nginx Proxy Manager), c'est le
 * dernier.
 *
 * Jumeau de `adresseDe` dans `apps/server/src/limites.ts` : même règle, même
 * variable. `apps/server/test/limites.test.ts` vérifie qu'ils s'accordent.
 */

/**
 * Nombre de proxys de confiance devant l'application, lu dans `TRUST_PROXY`.
 *
 * Défaut **1**, et jamais moins : l'application Next ne voit pas la socket du
 * client, elle n'a que les en-têtes, et elle tourne toujours derrière un
 * proxy (NPM en production, rien en développement — où l'en-tête est
 * simplement absent). Le serveur temps réel, lui, garde 0 par défaut : il voit
 * la socket, et peut s'en contenter.
 */
function relaisDeConfiance(): number {
  const lu = Number.parseInt(process.env.TRUST_PROXY ?? '', 10)
  return Number.isFinite(lu) && lu >= 1 ? lu : 1
}

/**
 * Le maillon de `X-Forwarded-For` posé par le plus lointain des proxys de
 * confiance. Pure, pour les tests.
 *
 * Une chaîne plus courte que le nombre de proxys annoncé veut dire qu'on en a
 * compté un de trop : on prend alors le maillon le plus à gauche, qui reste
 * une adresse vue par l'un d'eux.
 */
export function maillonDeConfiance(transmise: string, relais: number): string | null {
  const maillons = transmise
    .split(',')
    .map((maillon) => maillon.trim())
    .filter(Boolean)
  if (maillons.length === 0) return null
  return maillons[Math.max(0, maillons.length - Math.max(1, relais))] ?? null
}

/**
 * L'adresse de l'appelant, pour les limiteurs et la passerelle d'analyse.
 *
 * `X-Real-IP` ne sert qu'en l'absence de `X-Forwarded-For` : NPM le pose, et
 * le remplace au passage, ce qui le rend sûr derrière lui — mais il n'est
 * qu'une valeur, et la chaîne dit mieux qui l'a écrite.
 */
export function ipClient(request: Request): string {
  const transmise = request.headers.get('x-forwarded-for')
  const maillon = transmise ? maillonDeConfiance(transmise, relaisDeConfiance()) : null
  return maillon ?? request.headers.get('x-real-ip')?.trim() ?? 'inconnu'
}
