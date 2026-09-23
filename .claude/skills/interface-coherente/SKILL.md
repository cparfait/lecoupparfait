---
name: interface-coherente
description: Règles d'interface de Le Coup Parfait — textes via les dictionnaires i18n (jamais en dur), jetons de couleur et teintes de rubrique, composants de page imposés, icônes, accessibilité, RTL. À utiliser dès qu'on écrit ou modifie un composant React, un texte visible ou un style dans apps/web.
---

# Une interface cohérente

## Textes

- **Aucun texte visible en dur**, ni dans les attributs `placeholder`,
  `title` ou `aria-label`. On passe par `const t = useT()`
  (`apps/web/src/lib/i18n/index.tsx`) et une clé.
- On ajoute la clé dans **`fr.ts` et `en.ts`** (`apps/web/src/lib/i18n/`).
  Les autres langues (`langues/*.ts`) retombent sur l'anglais, phrase par
  phrase. On ne les invente pas.
- L'**interface** se traduit, le **contenu** (leçons, explications, fiches)
  n'existe qu'en français et en anglais.
- Un nombre qui dépend des données (leçons, niveaux, ouvertures) est
  **calculé et interpolé**, jamais écrit dans la phrase.
- Ton : tutoiement, phrases courtes et concrètes.
- Contrôles :

  ```bash
  npm run check:langues
  npm run check:textes
  npm run check:cles-coeur
  ```

## Couleurs et formes

- **Aucune couleur littérale** (`#…`, `rgb(…)`, classes Tailwind de couleur
  brute). Uniquement les jetons de `apps/web/src/app/globals.css` :
  - surfaces : `--bg`, `--surface`, `--border` ;
  - texte : `--text`, `--text-muted`, `--text-faint` ;
  - accent : `--accent`, `--accent-soft`, `--accent-text` ;
  - rubriques : `--rub-jouer`, `--rub-apprendre`, `--rub-entrainer`,
    `--rub-analyser`, `--rub-communaute`, `--rub-outils` ;
  - qualité des coups : `--q-*`.
- **Deux thèmes** seulement : `aurora` (sombre) et `clair`. Tout
  changement se vérifie dans les deux.
- **Le violet `--accent` est réservé à l'action** : bouton principal,
  sélection, onglet actif.
- **Une teinte de rubrique par page**, posée sur la pastille d'icône
  seulement. Pas de couleur secondaire par carte, pas de contour dégradé.
- Icônes : **lucide-react uniquement**. Pas d'emoji ni de glyphe Unicode
  comme icône d'interface.

## Structure d'une page

- Conteneur `page` ou `page-etroite`, titre par `TitreDePage`, liens vers
  d'autres pages par `CarteDestination`, sections par `TitreDeSection`.
- Composants de base dans `apps/web/src/components/ui/index.tsx` : `Button`,
  `ButtonLink`, `Card`, `Chip`, `Input`, `Toggle`, `Slider`,
  `SegmentedControl`, `EmptyState`, `Skeleton`. On n'en recrée pas un
  équivalent local.
- Toute nouvelle page va dans `apps/web/src/lib/navigation.ts`, avec sa
  rubrique, et reçoit un `layout.tsx` de métadonnées.

## Accessibilité et mise en page

- Cibles tactiles de 44 px minimum ; tout est atteignable au clavier, avec
  un focus visible.
- Aucune animation sans repli `prefers-reduced-motion`.
- Aucune lecture de `window` pendant le rendu (hydratation).
- Pas de `left`/`right` en dur quand `start`/`end` existe : l'arabe,
  l'hébreu et le persan retournent la page.
- Pas de défilement horizontal à 360 px.
