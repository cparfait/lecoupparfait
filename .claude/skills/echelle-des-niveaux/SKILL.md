---
name: echelle-des-niveaux
description: Carte des systèmes de niveau de Le Coup Parfait (échelle des adversaires, personnalités, carrière, paliers, test de niveau, séances, classements) et invariants à préserver. À utiliser avant de toucher à un bot, un Elo, un chapitre de carrière, un palier, un conseil d'adversaire ou tout texte qui cite un nombre de niveaux.
---

# L'échelle des niveaux

## Où vit chaque chose

| Sujet                                   | Source de vérité                                                  |
| --------------------------------------- | ----------------------------------------------------------------- |
| Échelons de l'ordinateur (Elo, réglages) | `LEVEL_TABLE` puis `BOT_LEVELS` dans `packages/core/src/bots.ts`  |
| Personnalités (style, biais)            | `BOT_PERSONALITIES` dans `bots.ts`                                |
| Adversaire conseillé                    | `suggestedLevel(elo)` dans `bots.ts`                              |
| Choix du coup du bot                    | `pickBotMove(fen, lignes, config)` dans `bots.ts`                 |
| Bot dans le navigateur                  | `apps/web/src/lib/game/useBotPlayer.ts`                           |
| Maia (niveaux humains)                  | `MAIA_MIN_ELO` / `MAIA_MAX_ELO` et `apps/server/src/engine/maia.ts` |
| Carrière (12 chapitres, XP, rangs)      | `CHAPITRES`, `RANGS`, `niveauEffectif` dans `packages/core/src/carriere.ts` |
| Paliers (6)                             | `PALIERS`, `palierPour` dans `apps/web/src/lib/apprendre/palier.ts` |
| Test de niveau                          | `apps/web/src/app/apprendre/niveau/`                              |
| Séances à thème                         | `apps/web/src/lib/game/seance.ts`, `themesSeance.ts`              |
| Glicko-2, Elo, titres                   | `packages/core/src/rating.ts`, `packages/db/src/ratings.ts`       |
| Archivage d'une partie classée          | `apps/web/src/app/api/parties/terminee/route.ts`                  |

## Invariants

1. **On ne recopie jamais un nombre de niveaux, de leçons ou d'étapes en
   dur** dans un texte : on le calcule (`BOT_LEVELS.length`,
   `CHAPITRES.length`, etc.) et on l'interpole. Chaque changement d'échelle
   a laissé derrière lui des « vingt-cinq » périmés.
2. **L'échelle est monotone** : chaque échelon est plus fort que le
   précédent, mesuré et pas seulement affiché. Après tout changement de
   `LEVEL_TABLE`, lance `scripts/etalonner-bots.mjs` sur les échelons
   touchés (il faut Stockfish) et consigne la mesure dans le commit.
3. **Un style imposé doit être celui qui joue.** Quand la carrière ou le
   tournoi impose une personnalité, le biais passé à `pickBotMove` est celui
   de la personnalité imposée, et pas celui du niveau.
4. **Une seule fonction dit quel adversaire conseiller** (`suggestedLevel`).
   Palier, séance, test et accueil passent par elle.
5. **Un seul vocabulaire de niveau face au joueur** : les six paliers. Les
   autres nombres (Glicko, rang de carrière) restent des nombres.
6. **Changer l'échelle, c'est aussi migrer.** La progression enregistrée
   (carrière, meilleur niveau battu) pointe vers des rangs : ajoute une
   migration (voir `0012_reset_bot_progress.sql`, `0013_training_rungs.sql`).
7. Les niveaux 1 à 3 portent des **étiquettes conventionnelles** (100, 180,
   250), pas des mesures.

## Contrôles

```bash
node --experimental-strip-types scripts/check-elo.mjs
node --experimental-strip-types scripts/check-carriere.mjs
node --experimental-strip-types scripts/check-seances.mjs
node --experimental-strip-types scripts/check-outils-elo.mjs
npm test -w @coupparfait/core
```

Puis vérifie à l'écran `/jouer/ordinateur`, `/jouer/adversaires`, `/carriere`
et `/apprendre/palier` (skill `constater-a-l-ecran`).
