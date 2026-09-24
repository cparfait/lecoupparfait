/**
 * Crochets de résolution pour exécuter les routes de l'application sous Node,
 * sans passer par Next.
 *
 * Trois choses que Node ne sait pas faire seul et que Next fait à la
 * construction :
 *
 *  - **l'alias `@/`**, déclaré dans `apps/web/tsconfig.json` (`@/*` →
 *    `./src/*`). Les imports portent déjà leur extension `.ts`, il suffit donc
 *    de remplacer le préfixe : aucune recherche d'extension, aucun index
 *    implicite ;
 *  - **`server-only`**, qui lève à l'import hors de la condition
 *    `react-server`. Next la pose pour le code serveur ; ici, on lui fait
 *    rendre le même module vide. Passer `--conditions=react-server` à Node
 *    aurait le même effet sur ce paquet, mais changerait aussi ce que
 *    résolvent `react` et `next` ;
 *  - **`next/server`** sans extension (voir plus bas).
 *
 * Tout le reste est résolu par Node, comme en production.
 */

const SOURCES = new URL('../../src/', import.meta.url)

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    return nextResolve(new URL(specifier.slice(2), SOURCES).href, context)
  }
  if (specifier === 'server-only') {
    return { url: 'data:text/javascript,export {}', shortCircuit: true }
  }
  // `next` ne déclare pas de table `exports` : ses points d'entrée
  // (`next/server`, `next/headers`) sont des fichiers `.js` à la racine du
  // paquet, que le résolveur ESM de Node ne complète pas.
  if (/^next\/[\w-]+$/.test(specifier)) {
    return nextResolve(`${specifier}.js`, context)
  }
  return nextResolve(specifier, context)
}
