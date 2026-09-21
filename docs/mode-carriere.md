# Mode carrière — cahier des charges

État : **implémenté** le 30 août 2026.
Ce document a d'abord été une proposition ; il décrit maintenant ce qui existe,
et signale en fin de page ce qui a été tranché autrement que prévu.

---

## 1. Le problème

L'application sait déjà à peu près tout faire : jouer contre vingt-cinq niveaux
d'adversaires, expliquer chaque coup, analyser une partie, enseigner des
ouvertures, entraîner la tactique, résoudre des finales. Ce qu'elle ne sait pas
faire, c'est **dire quoi faire ensuite**.

Un débutant qui ouvre le site trouve six entrées de menu et aucune raison de
préférer l'une à l'autre. Il joue contre l'ordinateur, perd, recommence, et
progresse par accident ou pas du tout. Les rubriques d'apprentissage existent
mais restent à côté du jeu : rien ne dit « tu perds tes fous, va voir cette
leçon », rien ne fait revenir.

Le mode carrière est la réponse à une seule question, posée en boucle : **par
quoi je commence, et qu'est-ce que je fais après ?**

Ce n'est donc pas une couche de récompenses posée sur l'existant. C'est un
**ordre** donné à du contenu qui n'en a pas.

### Ce que ce n'est pas

- Pas un classement. Le classement Glicko-2 existe déjà et mesure autre chose,
  et **rien de la carrière ne l'alimente** : les duels sont enregistrés en
  parties non classées.
- Pas un remplacement des rubriques existantes. La carrière les **ordonne** et
  y renvoie ; elle ne les duplique pas.

> **Décision revue.** La proposition écartait « points, badges et niveaux
> d'expérience » au motif qu'on ne joue pas aux échecs pour collectionner des
> médailles. L'arbitrage a été rendu dans l'autre sens, et le mode est
> ouvertement gamifié : expérience, six rangs nommés, trois étoiles par
> chapitre, onze hauts faits, confettis. La réserve initiale reste consignée
> ici parce qu'elle porte un risque réel — un système de récompenses détourne
> l'attention de ce qui est enseigné — et parce qu'un document qui efface ses
> désaccords ne sert plus à rien. Deux garde-fous ont été retenus en
> conséquence : rien de tout cela ne touche au classement, et **aucune
> récompense n'est décidée par le client** (voir `/api/carriere`).

---

## 2. Ce sur quoi on s'appuie

Presque tout existe. C'est le principal argument en faveur de ce mode : il
assemble, il n'invente pas.

| Brique                                          | Où                                     | État |
| ----------------------------------------------- | -------------------------------------- | ---- |
| 15 niveaux d'adversaires, 320 → 3200 Elo        | `packages/core/src/bots.ts`            | fait |
| 7 personnalités avec biais de style et portrait | `BOT_PERSONALITIES`                    | fait |
| Adversaire à erreurs humaines (Maia)            | `apps/web/src/lib/engine`              | fait |
| Plus haut niveau battu, tentatives, victoires   | table `bot_progress`                   | fait |
| Leçons (bases, tactique, stratégie, répertoire) | `apps/web/src/lib/lessons/`            | fait |
| Progression de leçon                            | table `lesson_progress`                | fait |
| Puzzles et tentatives                           | tables `puzzles`, `puzzle_attempts`    | fait |
| Finales à 7 pièces, résolues parfaitement       | `/finales`                             | fait |
| 331 ouvertures répertoriées                     | `packages/core/src/openings.ts`        | fait |
| Analyse expliquée, motifs tactiques nommés      | `packages/core/src/explain.ts`         | fait |
| Quêtes du jour et série                         | table `daily_progress`, `useQuotidien` | fait |
| Historique des parties                          | table `games`                          | fait |
| Analyses conservées                             | table `saved_analyses`                 | fait |

**Ce qui manque est uniquement : la structure de saison, la règle de
déblocage, l'écran de carte, et le lien entre une faiblesse mesurée et le
contenu qui la corrige.**

---

## 3. Le principe

Une carrière est une **suite de chapitres**. Chaque chapitre a un adversaire
attitré, une leçon d'entrée, un thème de puzzles, et une condition de passage.
On avance chapitre par chapitre ; on ne saute pas.

Trois règles de conception, et elles priment sur le reste :

1. **On ne perd jamais un chapitre.** Perdre une partie fait rejouer, pas
   reculer. Un mode qui punit décourage exactement ceux à qui il s'adresse.
2. **Chaque chapitre s'explique en une phrase**, affichée avant de commencer :
   « Chapitre 3 — ne plus laisser de pièces en prise ». Un objectif qu'on ne
   sait pas formuler est un objectif qu'on n'atteindra pas.
3. **La carrière se joue aussi bien en dix minutes qu'en deux heures.** Chaque
   chapitre se découpe en étapes courtes, indépendantes, reprises là où on les
   a laissées.

### La saison

Une carrière complète = **12 chapitres**, de 250 à 1600 Elo environ. C'est le
segment où l'aide change tout ; au-delà, un joueur sait ce qu'il doit
travailler et n'a plus besoin qu'on le lui dise.

Douze, et pas vingt-cinq comme le barème des bots : un chapitre doit durer
plusieurs séances pour qu'on sente la progression, et vingt-cinq paliers
donneraient l'impression de piétiner.

---

## 4. Le contenu des chapitres

Chaque chapitre suit la même trame en quatre temps. La régularité est
délibérée : on doit savoir à quoi s'attendre sans relire les règles.

```
① La leçon      2 à 5 minutes, existante, jouée sur l'échiquier
② L'exercice    5 puzzles du thème du chapitre
③ Le duel       2 parties gagnées contre l'adversaire du chapitre
④ Le bilan      analyse automatique de la dernière partie + verdict
```

### Découpage proposé

| #   | Titre                         | Adversaire  | Elo  | Ce qu'on y apprend                     |
| --- | ----------------------------- | ----------- | ---- | -------------------------------------- |
| 1   | Les pièces et leur route      | Pion 🐣     | 250  | déplacements, échec et mat élémentaire |
| 2   | Ne rien laisser en prise      | Pion 🐣     | 400  | pièces défendues, prises gratuites     |
| 3   | Sortir ses pièces             | Rempart 🛡️  | 550  | développement, roque, centre           |
| 4   | La fourchette et le clouage   | Éclair ⚡   | 700  | motifs tactiques de base               |
| 5   | Mater avec la dame et la tour | Rempart 🛡️  | 850  | mats élémentaires, opposition          |
| 6   | Tenir face à une attaque      | Brasier 🔥  | 1000 | défense, contre-attaque au centre      |
| 7   | Compter le matériel           | Éclair ⚡   | 1150 | échanges, valeur des pièces            |
| 8   | Une ouverture à soi           | Boussole 🧭 | 1300 | un répertoire minimal, blancs et noirs |
| 9   | Accepter ou refuser un gambit | Mirage 🎭   | 1450 | initiative contre matériel             |
| 10  | Les finales de pions          | Boussole 🧭 | 1600 | opposition, pion passé, carré          |
| 11  | Le plan, pas le coup          | Boussole 🧭 | 1750 | jeu positionnel, faiblesses            |
| 12  | Sans filet                    | Oracle 🜛    | 1900 | sans indice, sans commentaire          |

Les adversaires ne suivent pas l'ordre du barème : le style sert la leçon.
On affronte **Brasier** au chapitre « tenir face à une attaque » parce qu'il
attaque ; **Mirage** au chapitre des gambits parce qu'il en offre. C'est ce qui
distingue un chapitre d'un simple palier de difficulté.

### Condition de passage

Deux victoires contre l'adversaire du chapitre, **et** les cinq puzzles
résolus, **et** la leçon vue. Pas de note minimale, pas de précision à
atteindre : ces critères-là punissent le hasard autant que la faiblesse.

Une exception au chapitre 12 : une seule victoire suffit. À ce niveau, gagner
deux fois de suite relève d'un autre exercice.

### Filet de sécurité

Après **cinq défaites consécutives** dans un chapitre, on propose — sans
l'imposer — de baisser d'un cran l'adversaire pour cette tentative, et l'on
renvoie vers la leçon du chapitre en désignant la faute la plus fréquente des
cinq parties (l'analyse la connaît déjà : `report.counts` et `weakestPhase`).

C'est le point le plus important du cahier des charges. Un mode carrière rate
sa cible s'il laisse quelqu'un bloqué au chapitre 4 sans lui dire pourquoi.

---

## 5. La carte

Écran d'accueil du mode, à `/carriere`.

- Une **colonne verticale** de douze étapes, la courante au centre, les passées
  au-dessus, les suivantes en dessous et estompées. Verticale et non
  horizontale : ça descend au doigt sur un téléphone.
- L'étape courante est développée : titre, phrase d'objectif, les quatre temps
  avec leur état, et un unique bouton d'action — **« Continuer »** — qui mène à
  la prochaine chose à faire, quelle qu'elle soit.
- Les étapes passées se replient sur une ligne : titre, adversaire, coche.
- Aucune étape future n'est cliquable, mais toutes sont **lisibles** : on doit
  voir où mène le chemin.

Un seul bouton par écran. Le mode existe pour supprimer le choix, pas pour en
ajouter un treizième.

---

## 6. Modèle de données

Une table, et elle est petite. La progression est un **curseur**, pas un
journal : ce qui a été joué vit déjà dans `games`, `puzzle_attempts` et
`lesson_progress`.

```ts
export const careerProgress = pgTable('career_progress', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  /** Chapitre en cours, 1 à 12. 13 = carrière terminée. */
  chapter: smallint('chapter').notNull().default(1),
  /** Étapes du chapitre courant déjà validées. */
  lessonDone: boolean('lesson_done').notNull().default(false),
  puzzlesDone: smallint('puzzles_done').notNull().default(0),
  winsInChapter: smallint('wins_in_chapter').notNull().default(0),
  /** Défaites d'affilée, pour déclencher le filet de sécurité. */
  losingStreak: smallint('losing_streak').notNull().default(0),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
```

Le contenu des douze chapitres est **du code, pas des données** : un tableau
`CHAPITRES` dans `packages/core/src/carriere.ts`, à côté de `bots.ts`. Il ne
change pas d'un utilisateur à l'autre, il doit être typé, et une table de
contenu imposerait une migration à chaque retouche de formulation.

### Sans compte

La carrière **exige un compte**, et c'est la seule rubrique dans ce cas avec le
défi du jour. Une progression sur douze chapitres n'a aucun sens si elle
disparaît en fermant l'onglet, et la promettre pour la perdre serait pire que
de ne pas la proposer.

L'écran reste visible pour un visiteur anonyme, avec la carte complète et un
message qui explique qu'un compte — gratuit, un pseudo et un mot de passe —
conserve l'avancement. Même traitement que le défi du jour.

---

## 7. API

```
GET    /api/carriere            → chapitre courant, étapes faites, prochaine action
POST   /api/carriere/etape      → valide une étape (leçon, puzzle, victoire)
DELETE /api/carriere            → recommencer de zéro
```

`POST /api/carriere/etape` est **le seul point d'écriture**, et il est
idempotent par étape : rejouer une leçon déjà vue ne fait pas avancer deux
fois. Le serveur recalcule le passage au chapitre suivant lui-même ; le client
ne lui dit jamais « passe au chapitre 5 ».

Les victoires ne sont pas déclarées par le client sur parole. Une partie de
carrière porte `mode: 'career'` et le chapitre dans `games`, et l'étape est
validée à partir de la ligne écrite par `/api/parties/terminee`, qui vérifie
déjà la légalité des coups.

---

## 8. Ce qui reste hors périmètre

À écrire une fois, pour ne pas y revenir :

- **Pas de deuxième saison** au-delà de 1900 Elo dans cette version.
- **Pas de carrière personnalisée** par les faiblesses mesurées. Séduisant,
  mais un parcours différent pour chacun est impossible à tester et impossible
  à expliquer. On garde un chemin unique, et l'adaptation se limite au filet de
  sécurité.
- **Pas de classement de carrière** entre joueurs. La comparaison ramènerait
  exactement la pression qu'on cherche à retirer.
- **Pas de contenu neuf.** Chaque chapitre réutilise une leçon, des puzzles et
  un adversaire existants. Si un chapitre n'a pas de leçon correspondante, on
  ajuste le chapitre, pas le catalogue.

---

## 9. Découpage

| Lot | Contenu                                                                                                                              | Estimation |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| 1   | `carriere.ts` : les 12 chapitres, typés, avec un contrôle automatique que chaque leçon et chaque thème de puzzle référencés existent | 0,5 j      |
| 2   | Table, migration, les trois routes d'API                                                                                             | 0,5 j      |
| 3   | Écran `/carriere` : la carte, l'étape courante, le bouton unique                                                                     | 1,5 j      |
| 4   | Branchements : leçon, puzzles et partie renvoient à la carrière et valident l'étape                                                  | 1 j        |
| 5   | Filet de sécurité : détection des cinq défaites, désignation de la faute dominante, proposition                                      | 0,5 j      |
| 6   | Entrée dans la navigation, état anonyme, reprise, fin de carrière                                                                    | 0,5 j      |

**Environ 4,5 jours**, en s'appuyant sur l'existant. Le lot 3 est le plus
lourd et le seul entièrement neuf.

Ordre conseillé : 1 → 2 → 3 → 4 → 6 → 5. Le filet de sécurité en dernier parce
qu'il demande de voir de vraies séries de défaites pour être réglé
correctement, ce qui suppose que le reste tourne.

---

## 10. Décisions à trancher avant de commencer

1. **Douze chapitres ou moins ?** Douze couvre 250 → 1900 Elo. Six chapitres
   jusqu'à 1000 sortiraient trois fois plus vite et toucheraient le public le
   plus nombreux.
2. ~~**La carrière remplace-t-elle « Jouer contre l'ordinateur » ?**~~
   **Tranché : elle s'ajoute, sous « Jouer ».** Voir le § 11.
3. ~~**Le mode commenté est-il imposé** dans les premiers chapitres ?~~
   **Tranché : non.** On laisse le choix — voir le § 11.
4. **Que se passe-t-il à la fin ?** Rien, un message, ou l'ouverture du
   classement en ligne comme suite naturelle.

---

## 11. Ce qui a été livré, et ce qui a changé en route

Implémenté :

- `packages/core/src/carriere.ts` — douze chapitres, expérience, six rangs,
  étoiles, onze hauts faits, calcul de la prochaine étape ;
- `scripts/check-carriere.mjs` — 97 vérifications, dans `npm test` ;
- table `career_progress`, et les routes `GET`/`POST`/`DELETE /api/carriere` ;
- `/carriere` — la carte, le bandeau de rang, la célébration ;
- branchements dans la leçon, les puzzles et la partie contre l'ordinateur.

Écarts avec la proposition, et pourquoi :

1. **Gamification complète** plutôt qu'aucune. Voir l'encadré du § 1.
2. **Coup de main à trois défaites** et non cinq : à cinq, l'onglet est déjà
   refermé.
3. **Le style de l'adversaire est imposé**, en dépit de celui que le barème
   associe au niveau. Sans cela le chapitre 6, « tenir face à une attaque »,
   aurait envoyé un adversaire prudent — le contraire de l'exercice.
   `useBotPlayer` a gagné une option `personality` pour cela.
4. **Le haut fait « chirurgien » a changé de condition.** Il demandait 90 % de
   précision, que seule l'analyse calcule et que la partie ne connaît pas : une
   condition invérifiable ne s'obtient jamais. Il récompense désormais une
   victoire sans aide, que le serveur sait compter.
5. **Le chapitre 12 pointait vers une leçon inexistante** (`milieu` est un
   chapitre de leçons, pas une leçon). Attrapé par `check-carriere.mjs` avant
   toute mise en ligne — c'est exactement le risque pour lequel ce script a été
   écrit.
6. **Les seuils de rang ont été recalibrés** : les premiers, choisis à vue de
   nez, donnaient le titre suprême à une carrière bâclée à une étoile par
   chapitre. Ils sont désormais calés sur ce que rapporte un parcours réel, et
   le contrôle le vérifie.

Reste ouvert :

- la carrière vit sous **« Jouer »**, en tête de section, et comme première
  carte de `/jouer`. Elle était d'abord rangée dans « Apprendre » ; le
  déplacement a été décidé après coup, et il se tient : ce sont douze duels
  contre des adversaires choisis, avec une leçon et des puzzles autour. On y
  vient pour jouer. Elle ne remplace pas « Contre l'ordinateur », qui reste la
  porte de ceux qui savent déjà quel adversaire ils veulent ;
- **le mode commenté reste un réglage libre**, et c'est tranché : il n'est
  imposé à aucun chapitre. Il aide énormément un débutant et ralentit beaucoup
  les parties ; qui veut l'un accepte l'autre, et c'est à lui de le décider, pas
  au parcours. C'est aussi cohérent avec le reste de la plateforme, où rien
  n'est imposé — même la voix se coupe ;
- **pas de deuxième saison au-delà de 1850 Elo**, et c'est laissé ouvert plutôt
  que fermé : la question ne se posera vraiment que le jour où quelqu'un aura
  terminé les douze chapitres. Décider maintenant reviendrait à concevoir pour
  un joueur qui n'existe pas encore.
