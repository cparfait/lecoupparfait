/**
 * ESLint, en mode « recommandé » et rien de plus.
 *
 * Le code était propre parce que quelqu'un y veillait, pas parce qu'un outil le
 * faisait. C'est fragile de deux façons : ça ne survit pas à un jour de
 * fatigue, et ça ne dit rien à qui arrive.
 *
 * **Recommandé uniquement, volontairement.** Les jeux de règles « strict » ou
 * « stylistic » de typescript-eslint produiraient des centaines d'avertissements
 * sur un code existant et parfaitement lisible — et un outil qui crie tout le
 * temps finit par ne plus être lu du tout. On prend ce qui attrape de vraies
 * erreurs, et on ajoutera au cas par cas si le besoin s'en fait sentir.
 *
 * Ce qui compte le plus ici est `react-hooks/exhaustive-deps`, qui vient avec
 * la configuration Next : c'est la règle qui aurait signalé les dépendances
 * manquantes du lot B avant qu'elles ne coûtent cent rendus par seconde.
 */

import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import next from 'eslint-config-next'
import unusedImports from 'eslint-plugin-unused-imports'

export default tseslint.config(
  {
    // Ce qui n'est pas écrit à la main n'a pas à être relu par un outil.
    ignores: [
      '**/node_modules/**',
      // Copies de travail d'un agent : ce sont des doubles du dépôt, pas des
      // fichiers du dépôt. Les relire double chaque avertissement.
      '.claude/**',
      '**/.next/**',
      '**/dist/**',
      'packages/db/migrations/**',
      'packages/core/src/data/*.generated.ts',
      'apps/web/public/**',
      'data/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...next,

  {
    plugins: { 'unused-imports': unusedImports },
    rules: {
      /*
        Les nouvelles règles du compilateur React, éteintes — et c'est un choix.

        `eslint-config-next` 16 embarque une famille de règles écrites pour le
        **compilateur React** : `set-state-in-effect`, `refs`, `purity`,
        `immutability`, `preserve-manual-memoization`, `react/use`. Elles
        signalaient cent quatre-vingt-quinze endroits d'un code qui fonctionne,
        essentiellement des `setState` dans un effet — le moyen ordinaire de
        déposer le résultat d'une requête, et ce que fait tout le projet.

        Ce projet n'utilise pas le compilateur. Un outil qui crie deux cents
        fois n'est plus lu, et les quelques vraies trouvailles se noieraient.
        Le jour où l'on activera le compilateur, on les rallumera une par une —
        c'est à ce moment-là qu'elles auront quelque chose à dire.
      */
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react/use': 'off',

      /*
        Les imports morts s'enlèvent tout seuls (`npm run lint -- --fix`), ce
        que ne sait pas faire la règle équivalente de typescript-eslint. Il y en
        avait une quarantaine, dont quelques-uns laissés par le dédoublonnage
        du lot C.
      */
      'unused-imports/no-unused-imports': 'error',

      /*
        Les dix `eslint-disable` déjà posés dans le code restent.

        Chacun est commenté et dit pourquoi il est là — une dépendance qu'on
        exclut sciemment parce que l'inclure relancerait un effet en boucle.
        Les rétablir maintenant reviendrait à refaire dix choix qui ont déjà
        été faits, sans le contexte qui les a motivés.
      */
      'react-hooks/exhaustive-deps': 'warn',

      /*
        `_` en tête d'un paramètre veut dire « je sais qu'il est là et je ne
        m'en sers pas ». C'est la convention du dépôt — voir les
        gestionnaires de route, qui reçoivent une requête dont ils n'ont que
        faire.
      */
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],

      /*
        `<img>` plutôt que `next/image` : un avertissement, pas une erreur.

        Trois de ces balises méritent la conversion (les images de marque, qui
        pèsent) ; les autres servent des pièces d'échecs en SVG, où
        l'optimisation d'image n'a rien à optimiser et où le composant ajoute
        une couche pour rien.
      */
      '@next/next/no-img-element': 'warn',
    },
  },

  {
    // Les scripts et les tests tournent dans Node, pas dans un navigateur.
    files: ['scripts/**/*.mjs', '**/test/**/*.ts', '**/*.test.ts'],
    rules: {
      'no-console': 'off',
    },
  },
)
