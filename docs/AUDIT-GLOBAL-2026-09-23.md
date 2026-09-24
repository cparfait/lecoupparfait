# Audit global — 23 septembre 2026

État du dépôt : `main` sur `826bdc3`, arbre propre. `npm run typecheck`,
`npm test` (98 tests du cœur, 15 scripts `check-*`, 36 tests serveur) et
`eslint .` passent sans erreur. Rien n'a été modifié pendant l'audit.

Quatre angles : les niveaux, les fonctionnalités, le design, la logique.
Sévérités : **bloquant** (faux, dangereux ou trompeur), **gênant** (visible ou
mesurable), **amélioration**. Les constats marqués ✔ ont été revérifiés à la
main dans le code après coup.

---

## 1. Niveaux et progression

### Bloquant

- **N1 ✔ — En carrière et en tournoi, l'adversaire ne joue pas avec le style
  annoncé.** `useBotPlayer.ts:96-98` remplace `personality`, mais le choix du
  coup lit `bot.engine` (`:166-179`), dont le biais vient du niveau. Huit
  chapitres sur douze sont concernés : au ch. 6, on annonce Brasier et c'est
  Rempart qui joue.
- **N2 — La carrière monte à 2 250, pas 1 850.** Ce plafond n'est ni celui de
  `carriere.ts:78` (« 100 à 1850 »), ni celui de `mode-carriere.md`, qui en
  annonce trois différents : 1 600, 1 900 et 1 850. Les chapitres 10 à 12 ont
  été décalés d'un cran de trop à la migration `0013`. Au ch. 12, les puzzles
  sont notés 1 850 et l'adversaire 2 250.
- **N3 ✔ — « Vingt-cinq niveaux » survit dans les fiches adversaires**
  (`fr.ts:163,167`, `en.ts:164,168`). L'échelle en compte 18.

### Gênant

- **N4 — Les marches sont inégales là où débutent les joueurs.** Entre 100 et
  320, l'écart mesuré est d'environ 750 Elo. Sous 1 000, il n'y a que deux
  échelons, contre cinq au-dessus de 2 250. Les niveaux 1 à 3 (étiquettes non
  mesurées) nourrissent pourtant le Glicko en partie classée
  (`terminee/route.ts:356`).
- **N5 — Deux calculs d'« adversaire conseillé ».** La séance utilise
  `palier.niveauBot`, le test et l'accueil utilisent `suggestedLevel`. Pour le
  même joueur, les deux diffèrent de 150 à 400 Elo.
- **N6 — Le même mot désigne des niveaux différents.** « Apprenti »,
  « Confirmé » et « Expert » ne couvrent pas la même tranche selon
  `ratingTitle` (profil) et les tranches du défi (`rating.ts:168-175` contre
  `:449-463`). `ratingTitle` renvoie en plus du texte en dur.
- **N7 — Six échelles nommées, sans table de correspondance.** Échelon
  ordinateur, Glicko par cadence, Elo classique, classement puzzle, niveau
  estimé, palier, rang carrière et titre de profil coexistent. Aucun placement
  en carrière : un joueur mesuré à 1 400 recommence contre un adversaire à 100.
  `/carriere` ne renvoie ni au test ni au palier.
- **N8 — Le coup de main retire deux niveaux** (`carriere.ts:399`). Au ch. 6,
  cela fait −490 Elo ; au ch. 1, rien du tout.
- **N9 — L'Elo de performance après une analyse a un plancher à 400.** Un
  débutant qui bat le niveau 1 lit donc « 400 ».
- **N10 — Les thèmes de puzzle de la carrière ne suivent pas les chapitres.**
  Le ch. 7 « Compter le matériel » donne des enfilades, le ch. 11 « Le plan »
  des zugzwangs. Le ch. 5 annonce les mats dame et tour, mais renvoie à
  `mat-escalier`.

### Amélioration

- **N11 ✔ — Les chiffres affichés ne s'accordent pas.** La page Apprendre
  compte **57 leçons, 457 étapes**. Le README (l. 19, 24, 181) et
  `fr.ts:99` (`lessonsHint`) disent 48 et 328.
- **N12 — Le programme de leçons est déséquilibré.** 14 pièges d'ouverture
  passent avant 3 leçons de milieu de jeu et 4 de finales. Il manque le
  calcul (échecs, prises, menaces), la défense, les finales de tours, la
  structure de pions et le plan.
- **N13 — Commentaires restés sur l'ancienne échelle.** Voir `bots.ts`
  (l. 303, 554, 587-603), `useBotPlayer.ts:28` et `carriere.ts:9,83`.
- **N14 — Maia ne couvre que les niveaux 7 à 11.**

---

## 2. Fonctionnalités et parcours

Aucune page orpheline, aucun TODO, aucune page vide : les fonctions sont
finies. Le problème est leur **nombre**, avec 28 entrées de navigation
réparties dans 6 rubriques.

### Bloquant

- **F1 — Les langues sont annoncées complètes alors qu'elles ne le sont pas.**
  Le README affirme « Vingt sont complètes ». `check-langues` en compte **2
  complètes** (fr, en), 18 à environ 7 % et 21 à 0 %.
- **F2 — Le défi du jour est vanté au visiteur, puis refusé.** La carte de
  l'accueil renvoie vers `/connexion` (`DefiDuJour.tsx:313`). Le README dit
  pourtant « sans compte, si l'on veut ».

### Gênant

- **F3 — Trois programmes pour un même contenu** : Leçons (9 chapitres),
  Palier (6 paliers) et Carrière (12 chapitres). L'accueil connecté pousse la
  carrière, la page Apprendre pousse le palier.
- **F4 — Cinq façons de jouer contre l'ordinateur** : ordinateur, séance,
  duels de carrière, tournoi, galerie. À l'écran, choisir son adversaire se
  fait de **trois manières** à la fois : portraits, curseur « niveau fin » et
  puces « Je débute… Sans pitié ». La galerie de portraits commence au n° 5
  (630 Elo), si bien qu'un vrai débutant ne voit aucun adversaire à sa mesure
  sans toucher au curseur.
- **F5 — Le test de niveau est introuvable.** Il n'apparaît ni dans la
  navigation, ni sur le sommaire `/apprendre`, alors que c'est la porte
  d'entrée du palier.
- **F6 — Des rubriques mal placées.** Les statistiques personnelles sont
  rangées dans « Communauté », donc cachées dans « Plus » sur mobile. Les
  Outils (échiquier réel) pèsent autant que « Jouer » dans l'en-tête.
- **F7 — `check-textes-durs` laisse passer des textes.** Il ne voit ni les
  `placeholder`, ni le texte JSX mêlé d'expressions. Il reste 29 littéraux,
  dont « Bonjour » et « points du jour ».
- **F8 — Code mort : l'état `setImportOuvert`** (`analyse/page.tsx:451`) est
  écrit mais jamais lu. L'ouverture automatique de l'import ne fait donc rien.

### Ce qui manque face à Lichess / Chess.com (vérifié)

| Fonction                                  | État                      |
| ----------------------------------------- | ------------------------- |
| Révision espacée de ses erreurs           | absente                   |
| Puzzles tirés de ses propres parties      | absents                   |
| Entraîneur de répertoire personnel        | absent                    |
| Appariement rapide avec un inconnu        | absent (arènes seulement) |
| Variantes (Chess960…), échecs à l'aveugle | absents                   |
| Hors-ligne                                | absent, et assumé         |

---

## 3. Design (constaté à l'écran, 375×812 et 800 px, deux thèmes)

La refonte de septembre tient bien. Les deux thèmes sont cohérents, une teinte
par rubrique est posée sur la pastille, les cartes de destination sont
uniformes et la barre mobile disparaît en partie. Les points qui restent :

- **D1 — Choisir un adversaire demande trois contrôles pour un seul choix.**
  Portraits, curseur et puces coexistent (voir F4), en plus d'un en-tête de
  page, de huit cadences et de trois options. Le premier écran est chargé.
- **D2 — Les icônes mélangent trois familles.** Les cadences utilisent des
  emojis (⚡ 🐇 🐢 ✉️), la couleur des glyphes Unicode et 🎲, et le reste
  lucide-react. Ce sont trois langages visuels sur un même écran.
- **D3 — La barre mobile compte six onglets.** Accueil, Jouer, Apprendre,
  S'entraîner, Analyse, Plus : les libellés sont serrés à 375 px, et la
  décision de refonte en prévoyait cinq.
- **D4 — Les en-têtes de page ne suivent pas tous le même gabarit.** Jouer,
  S'entraîner et Plus ont une carte d'en-tête illustrée ; Apprendre a un titre
  nu.
- **D5 — La grille des paliers laisse un orphelin.** À 800 px, elle en place
  cinq sur une ligne et le sixième seul sur la suivante.
- **D6 — En partie, « Abandonner » est en rouge.** Il se trouve entre Options
  et Indice, au même poids visuel qu'eux, et c'est l'action la plus
  destructrice de l'écran.
- **D7 — L'écran de partie affiche « Stockfish · niveau 6 » sous le
  personnage.** Cela casse l'incarnation que donnent les portraits.
- **D8 — Un bloc vide est visible au défilement de l'accueil.** La section
  à révéler est invisible tant que l'animation n'a pas démarré. Il faut
  vérifier sur un vrai appareil qu'elle ne reste pas vide avec
  `prefers-reduced-motion`.

---

## 4. Logique et qualité technique

### Bloquant

- **L1 ✔ — Le relais IA est une porte SSRF.** `api/ia/chat/route.ts:55` et
  `ia/modeles/route.ts:38` suivent les redirections, alors que
  `verifierCible` ne contrôle que la première cible. Une réponse
  `302 → http://postgres:5432` (ou le service de métadonnées) passe, et le
  corps revient au client. S'y ajoutent le rebinding DNS et des formes IPv6
  non reconnues. Les deux routes sont anonymes et sans limiteur.
- **L2 ✔ — Tous les limiteurs se contournent en forgeant `X-Forwarded-For`.**
  Ils prennent le premier maillon, celui que le client choisit
  (`auth/route.ts:157,211`, `passerelle.ts:16`, `server/src/limites.ts:81`).
  Le quota anti-force-brute de la connexion tombe.
- **L3 — Un classement contre l'ordinateur peut encore être fabriqué.** Les
  coups « du bot » ne sont jamais vérifiés, et une partie où le bot joue les
  pires coups passe. C'est la limite structurelle déjà notée en A1.

### Gênant

- **L4 ✔ — La correspondance a une course entre coup et abandon.** L'`UPDATE`
  ne porte que sur `id` (`correspondence.ts:291,323`), si bien qu'un abandon
  simultané peut être écrasé et la partie ressusciter.
- **L5 — Deux barèmes de cadence coexistent.** `terminee/route.ts:622` ignore
  l'incrément, contrairement à `speedCategory`. C'est le « reste 1 » ouvert de
  CHANTIER-AUDIT.
- **L6 — `terminee` renvoie un 500 sur un FEN invalide.** Le type de `eco` et
  la taille du `pgn` ne sont pas non plus vérifiés.
- **L7 — Les salons temps réel ne sont pas plafonnés,** et le `rated` d'un
  salon est fixé par le premier arrivant.
- **L8 — Environ 300 Ko gzippés de dictionnaires sur chaque page.** Les 20
  langues sont importées statiquement (`dictionary.ts:30`).
- **L9 — `/api/import` est anonyme et sans limite,** alors que chaque appel
  déclenche jusqu'à 7 requêtes sortantes.
- **L10 — La web app n'a aucun test de route.** `check-partie-terminee`
  recopie la règle au lieu de l'importer.

### Amélioration

- **L11 — Dix fichiers dépassent 1 000 lignes.** En tête :
  `jouer/ordinateur/page.tsx` (3 246 lignes, 36 `useState`, 16 `useEffect`)
  et `analyse/page.tsx` (2 214).
- **L12 — D3 est partiel.** Il reste 88 `fetch(` bruts, contre 2 usages de
  `useFetchJson`.

**Statut de CHANTIER-AUDIT :** les lots A à F sont faits. Restent ouverts A3,
contournable par L2, D3, partiel, et le « reste 1 » (L5).

---

## 5. Propositions, par ordre de priorité

### Lot 1 — Sécurité (petit, urgent)

1. SSRF : `redirect: 'manual'`, IP épinglée via un `lookup` qui refuse le
   privé, IPv6 normalisé, session obligatoire et limiteur sur `ia/*`.
2. Une fonction `ipClient()` unique, qui lit le maillon de droite selon
   `TRUSTED_HOPS`, plus un quota par pseudo seul à la connexion.
3. Correspondance : `WHERE result = '*' AND moves = ?`, puis vérifier
   `rowCount`.
4. `terminee` durcie (try/catch, types, borne de taille) et limiteur sur
   `/api/import`.

### Lot 2 — Justesse des niveaux (petit, visible)

5. Corriger le style imposé (N1) et ajouter un contrôle dans
   `check-carriere`.
6. Recaler les chapitres 10 à 12, purger « vingt-cinq » et les chiffres de
   leçons, et faire vérifier les nombres annoncés par un `check-*`.
7. Une seule fonction « adversaire conseillé » et un seul vocabulaire de
   niveaux, celui des six paliers.

### Lot 3 — Simplifier le parcours (moyen, fort impact)

8. **Un seul fil conducteur :** test de niveau → palier → carrière (placement
   au bon chapitre). Le test entre dans la navigation Apprendre.
9. **Un seul écran « Contre l'ordinateur » :** portraits couvrant les 18
   niveaux (ou un curseur seul), la séance devenant une option « avec thème et
   bilan ». Tournoi et galerie passent en liens secondaires.
10. Défi du jour jouable sans compte, le compte ne gardant que la série.
11. Accueil visiteur : un bouton principal « Par où commencer ? » vers la
    leçon 1 ou le test.
12. Langues : afficher la couverture réelle, masquer ou marquer « en anglais »
    celles à 0 %, et corriger le README.

### Lot 4 — Design (après validation, voir le prompt Claude Design)

13. Une seule famille d'icônes : cadences et couleurs passent en lucide.
14. Barre mobile ramenée à cinq onglets, en fusionnant Accueil et un onglet
    ou en passant Analyse dans S'entraîner.
15. Gabarit d'en-tête unique, grille des paliers en 3×2 ou 6×1, Abandonner
    en bouton discret avec confirmation, « Stockfish » retiré sous le
    personnage.

### Lot 5 — Nouvelles fonctions à forte valeur

16. **« Mes erreurs à revoir »** : puzzles tirés des gaffes de ses propres
    parties analysées, en révision espacée (Leitner). C'est l'écart le plus
    rentable face à la concurrence.
17. Leçons manquantes : calcul (échecs, prises, menaces), défense, finales de
    tours. Les pièges d'ouverture passent en annexe, après les finales.
18. Échelons supplémentaires vers 450 et 800 Elo, et pas de classement
    contre les niveaux 1 à 3.

### Lot 6 — Dette

19. Découper `jouer/ordinateur/page.tsx` en hooks (bot, pendule, fin de
    partie, aides).
20. Charger les langues à la demande et généraliser `useFetchJson`.
21. Tests de routes web (`terminee`, `auth`, `ia/chat`) avec `node:test`.

---

## 6. Suivi — branche `audit/corrections-2026-09`

Tout ce qui suit est commité sur la branche, un commit par symptôme. Après
chaque fusion, typecheck, tests, prettier et eslint passent.

### Fait

| Point            | Correction                                                                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1               | Relais IA : redirections refusées, IP épinglée, IPv6 normalisée, limiteur (`scripts/check-relais-ia.mjs`)                                                   |
| L2               | `ipClient` / `adresseDe` unique selon `TRUST_PROXY`, quota de connexion par pseudo seul                                                                     |
| L4               | Correspondance : écriture conditionnelle, plus de résurrection                                                                                              |
| L5               | Un seul barème de cadence ; `check-partie-terminee` importe la vraie règle                                                                                  |
| L6               | `terminee` : 400 sur FEN invalide, types et tailles bornés                                                                                                  |
| L7               | Salons plafonnés (`MAX_ROOMS`, `MAX_ROOMS_PER_IP`), `rated` réservé à un hôte connecté                                                                      |
| L9               | `/api/import` limité                                                                                                                                        |
| N1               | `botLevelAvecStyle` : le style imposé est celui qui joue                                                                                                    |
| N2               | Carrière de 100 à 1 850 ; le ch. 12 garde la force du 11 (voir « À trancher »)                                                                              |
| N3, N11, N13     | « Vingt-cinq » purgé, nombres interpolés, `check-lessons` compare README et menu au réel                                                                    |
| N5               | Une seule fonction d'adversaire conseillé (`suggestedLevel`)                                                                                                |
| N6               | `ratingTitle` aligné sur les tranches du défi, par clés i18n                                                                                                |
| N8, N9, N10      | Coup de main d'un cran, plancher de performance à 100, thèmes de puzzle des chapitres 5, 7 et 11                                                            |
| F1               | README : deux langues complètes, dix-huit partielles                                                                                                        |
| F2               | README corrigé : le défi du jour demande un compte, par choix (4cadff0)                                                                                     |
| F5               | Test de niveau dans la rubrique Apprendre                                                                                                                   |
| F7               | `check-textes-durs` corrigé sous Windows (84 textes vus au lieu de 29), tous traités                                                                        |
| F8               | État mort retiré de l'analyse                                                                                                                               |
| D5, D6           | Paliers en grille sans orphelin ; abandon contre l'ordinateur confirmé                                                                                      |
| Signalé en cours | Rappel du défi du jour envoyé à qui l'avait fait : défi résolu après une erreur non compté, envoi perdu à la fermeture, défi abandonné non noté comme tenté |

### Laissé volontairement

- **D3** (six onglets) et **D7** (« Stockfish · niveau N ») : choix
  documentés dans le code (`navigation.ts`, `jouer/ordinateur/page.tsx`).
- **D1, D2, D4, F3, F4, F6** : ce sont des changements de parcours ou de
  langage visuel. Ils attendent les maquettes de Claude Design
  (`PROMPT-CLAUDE-DESIGN.md`).

### Ouvert

- **L3** : les coups du bot ne sont pas vérifiés côté serveur ; limite
  structurelle.
- **L8, L10 à L12** : dette (dictionnaires chargés à la demande, tests de
  routes, découpage de `jouer/ordinateur/page.tsx`, `useFetchJson`).
- **N4** : échelons supplémentaires vers 450 et 800 ; il faut Stockfish pour
  étalonner.
- **N12** : leçons de calcul, de défense et de finales de tours ; c'est un
  travail de rédaction.
- **Lot 5** : « Mes erreurs à revoir », appariement rapide.
- Textes que le contrôle ne voit pas encore : `FlammeSerie`, les onglets
  « Rapide » et « Classique » du classement, « j restants » en correspondance,
  les noms de rangs de carrière. Les messages d'erreur de la correspondance et
  des salons sont en français, comme leurs voisins.

### Tranché le 24 septembre

- **Chapitre 12** : il reste à 1 850, comme le 11. Au-delà, la carrière
  sortirait de son public ; ce qu'il ajoute tient à l'absence d'aide, à un
  adversaire sans penchant à exploiter et à des puzzles plus durs.
  `check-carriere` n'autorise cette égalité qu'au dernier chapitre.
- **Profil** : pas de tranche au-dessus d'« Expert » (2 100 et plus). Le même
  mot doit désigner le même niveau au profil et au défi du jour, et une
  tranche propre au profil recréerait l'écart qu'on vient de fermer.
- **Chapitre 5** : il reste relié à la seule leçon « mat dame et roi » ; un
  chapitre porte une leçon, et la tour vient naturellement après la dame.
- **Branche** : fusionnée dans `main` une fois les derniers lots (textes, tests
  de routes, découpage de l'écran contre l'ordinateur) vérifiés.
