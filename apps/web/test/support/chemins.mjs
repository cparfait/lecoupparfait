/**
 * Chargé par `--import` avant chaque fichier de test : branche les crochets de
 * `resolution.mjs` (alias `@/`, `server-only`, `next/server`). Voir ce fichier.
 *
 * Les tests des routes web (`npm test -w @coupparfait/web`) appellent
 * directement `POST(request)` ou `GET(request)` avec une `Request` construite à
 * la main — pas de serveur Next, pas de navigateur. Les options de Node, dans
 * `apps/web/package.json` :
 *
 *  - `--experimental-strip-types` : le code est exécuté tel qu'il est écrit,
 *    comme les scripts `check-*` ;
 *  - `--experimental-test-module-mocks` : `mock.module` remplace la session
 *    (`support/session.ts`) et, selon le fichier, un module dont la route
 *    dépend mais qui n'est pas le sujet du test. Disponible depuis Node 22.3 ;
 *  - la base, elle, n'est pas un module simulé : voir `support/base.ts`.
 *
 * Chaque fichier de test tourne dans son propre processus (comportement par
 * défaut de `node --test`) : les modules simulés et les limiteurs en mémoire
 * d'un fichier ne débordent pas sur le suivant.
 */

import { register } from 'node:module'

register('./resolution.mjs', import.meta.url)
