---
name: livrer-un-lot
description: Règles de travail du dépôt Le Coup Parfait pour corriger ou livrer une série de changements — contrôles avant chaque commit, message de commit en français décrivant le symptôme, migrations, commentaires. À utiliser avant tout commit dans ce dépôt, et pour découper un chantier en lots.
---

# Livrer un lot

Ces règles viennent des habitudes du dépôt (voir `docs/CHANTIER-AUDIT.md`).
Elles s'appliquent à chaque commit.

## Avant chaque commit

Lance les contrôles depuis la racine et attends qu'ils soient verts. Aucun
commit rouge, même intermédiaire.

```bash
npm run typecheck
npm test
npx prettier --check <fichiers modifiés>
npx eslint <fichiers modifiés>
```

`npm test` enchaîne les tests du cœur, les scripts `scripts/check-*.mjs` et
les tests du serveur, en une à deux minutes. Si tu as touché un domaine
couvert par un `check-*`, lance-le d'abord seul pour itérer vite, par exemple
`npm run check:lessons` ou
`node --experimental-strip-types scripts/check-carriere.mjs`.

## Le message de commit

- En français, une phrase au passé qui décrit **le symptôme** tel qu'un
  joueur l'aurait vu. C'est le style des cent derniers commits :
  - « Le plus faible des adversaires battait les débutants, et ce depuis la 19 »
  - « Le violet écrivait illisible sur le sombre, et le sélecteur gardait son
    rectangle »
  - Jamais « fix: bot level » ni « perf: clock ».
- Le corps explique **la cause**, puis ce qui a changé et comment on l'a
  vérifié, avec des mesures quand il y en a. Des intertitres
  `── Titre ──` séparent les parties d'un long corps.
- Terminer par la ligne d'attribution demandée par la session.

## Découper

- **Un lot = une série de commits, chacun vert pris isolément.** Un commit
  corrige un symptôme. Deux symptômes sans lien font deux commits.
- On ne touche pas à ce qui n'est pas dans le lot. Une découverte en passant
  se note (dans le doc de chantier ou le rapport final) et ne rejoint pas le
  commit en cours.
- On ne commite pas sur `main` sans que l'utilisateur l'ait demandé.

## Code

- **Les commentaires disent pourquoi**, en français, en phrases. Quand un
  correctif retire un piège, le commentaire qui reste doit empêcher qu'on le
  remette.
- **Schéma de base** : jamais `db:push` dès qu'un schéma change. On lance
  `npm run db:generate`, on relit le SQL produit dans
  `packages/db/migrations/`, puis `node scripts/migrate.mjs`.
- Aucune couleur littérale, aucun texte d'interface en dur : voir le skill
  `interface-coherente`.
- Next.js 16 diffère de ce que tu connais : lis
  `node_modules/next/dist/docs/` (ou context7) avant d'écrire une API Next
  inhabituelle.

## Vérifier

Un changement visible n'est pas fait tant qu'il n'a pas été vu à l'écran :
voir le skill `constater-a-l-ecran`.
