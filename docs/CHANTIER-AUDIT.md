# Chantier — suites de l'audit du 2 septembre 2026

Ce document dit **comment** faire chacune des corrections et chacun des ajouts
sortis de l'audit du projet. Il est écrit pour être suivi lot par lot, par
quelqu'un qui n'a pas lu l'audit, et pour qu'on n'ait pas à redécouvrir les
mêmes fichiers dans six mois.

État du dépôt au départ : `main` sur `56e1164`, arbre propre, `npm run
typecheck` et `npm test` passent (189 étapes de leçon, 274 vérifications).

Chaque point tient en trois parties : **ce qu'on a constaté**, avec le fichier
et la ligne ; **ce qu'il faut faire** ; **comment on sait que c'est fait**.
Les lignes sont celles de `56e1164` et bougeront ; les noms de fonctions, non.

---

## Règles de travail

Elles viennent des habitudes du dépôt, pas d'ailleurs. On les garde.

- **Un lot, une série de commits, chaque commit vert.** `npm run typecheck`
  puis `npm test` avant chaque commit, pris isolément. Le message décrit le
  symptôme, en français, en une phrase, comme les cent commits précédents :
  « La pendule re-rendait tout l'écran dix fois par seconde », pas « perf:
  clock ».
- **On constate à l'écran** ce qui se voit à l'écran. Un point de rendu n'est
  pas fait tant qu'il n'a pas été observé dans le navigateur, avec le
  profileur React quand il s'agit de re-rendus.
- **Aucune couleur littérale**, aucune animation sans `prefers-reduced-motion`,
  aucune lecture de `window` pendant le rendu. Voir
  `PROMPT-OPTIM-GRAPHIQUE.md` pour le détail, il reste valable.
- **Les commentaires disent pourquoi.** Quand un correctif retire un piège,
  le commentaire qui reste doit empêcher qu'on le remette.
- **On ne touche pas à ce qui n'est pas dans le lot.** Une découverte en
  passant va dans le journal en fin de fichier, pas dans le commit en cours.
- **Les migrations, jamais `db:push`** dès qu'un schéma change :
  `npm run db:generate`, relire le SQL produit, puis `node scripts/migrate.mjs`.
  Le README explique pourquoi.

---

## Lot A — Ce qui peut mentir ou se figer (serveur)

Ce lot passe avant tout le reste : il touche à la confiance qu'on peut avoir
dans le classement et dans l'analyse. Aucun point n'est visible à l'écran, tous
se vérifient par une requête.

### A1. Le résultat d'une partie contre l'ordinateur est cru sur parole

**Constat.** `POST /api/parties/terminee` rejoue les coups pour vérifier
qu'ils sont légaux (`apps/web/src/app/api/parties/terminee/route.ts:97-107`),
puis applique le Glicko sur le `result` **déclaré par le client** et le
`botLevel` **déclaré par le client** (`:161-168`). Rien ne recoupe l'un avec la
position atteinte, ni l'autre avec quoi que ce soit. Un `fetch` fabriqué à la
main crée une victoire contre le niveau 25, et rien ne limite la cadence.

**À faire.**

1. Après la boucle de `echiquier.move(san)`, calculer le résultat que la
   position **impose** :
   - `echiquier.isCheckmate()` : le camp au trait a perdu ;
   - `isStalemate()`, `isInsufficientMaterial()`, `isThreefoldRepetition()`,
     `isDrawByFiftyMoves()` : nulle ;
   - sinon la partie n'est pas finie sur l'échiquier : seuls l'abandon, la
     chute du drapeau et la nulle par accord sont possibles.
2. Confronter au `result` reçu :
   - si la position impose un résultat, il doit être **égal** au déclaré,
     sinon `400 { raison: 'résultat incohérent' }` ;
   - si elle n'en impose pas, n'accepter que ce qui **défavorise le joueur**
     (défaite pour le camp du joueur, ou nulle). Une victoire par abandon de
     l'ordinateur n'existe pas ; une victoire au temps contre l'ordinateur ne
     s'enregistre pas classée. Documenter ce choix dans le commentaire : on
     perd un cas rare et honnête pour fermer un cas facile et malhonnête.
3. Borner la fréquence : un compte ne peut pas archiver plus d'une partie
   classée par minute, et une partie classée doit compter au moins dix
   demi-coups. Reprendre le limiteur en mémoire de `api/auth/route.ts:40-54`
   plutôt qu'en écrire un troisième — le sortir dans
   `apps/web/src/lib/server/limiteur.ts` et l'appeler des deux endroits, plus
   de `api/defis/route.ts:106-113` qui a le sien.
4. Le `botLevel` : on ne peut pas le prouver. Le borner à `[1, 25]` est déjà
   fait ; ajouter dans la réponse le niveau réellement pris en compte, et
   côté client (`jouer/ordinateur/page.tsx`, `recordBotGame`) ne rien
   envoyer que le niveau effectivement joué. Ça ne ferme pas la porte, ça
   évite de l'ouvrir par erreur.

**Vérification.** Un script `scripts/check-partie-terminee.mjs`, ajouté à
`npm test`, qui appelle la fonction de cohérence extraite (la sortir dans
`packages/core/src/pgn.ts` sous le nom `resultatImpose(chess)`), avec au
moins : mat des Blancs déclaré `0-1` → refusé ; mat déclaré `1-0` → accepté ;
position vivante déclarée `1-0` pour le joueur → refusé ; position vivante
déclarée `0-1` pour le joueur → accepté ; pat déclaré `1-0` → refusé.
Puis un `curl` sur le serveur de dev avec une victoire inventée : `400`.

### A2. Un Stockfish muet fige la réserve pour toujours

**Constat.** `EngineProcess.search()` (`apps/server/src/engine/process.ts:207`)
pose `busy = true` et attend `bestmove`. Aucun délai de garde : seul le
`handshake` en a un. Un processus qui ne répond plus reste occupé
indéfiniment, la réserve (deux processus par défaut) se dégrade sans jamais se
rétablir, et `/health` continue de dire `available: 1` puis `0`.

**À faire.** Dans `search()`, après l'envoi de `go`, armer un `setTimeout` à
`(request.movetimeMs ?? 0) + GARDE_MS`, avec `GARDE_MS` à 30 s pour une
recherche en profondeur et 5 s pour une recherche en `movetime`. À
l'échéance : envoyer `stop`, attendre 2 s de plus, et si toujours rien,
**tuer le processus** (`this.child.kill()`), rejeter la promesse avec une
erreur explicite « moteur sans réponse, relancé », et laisser le mécanisme de
redémarrage existant (`pool.ts:87-98`) faire son travail. Annuler le
minuteur dans tous les chemins de sortie, y compris `onAbort`. Compter ces
relances dans `pool.stats` et les exposer dans `/health` sous `restarts`.

**Vérification.** Sans toucher au binaire : un test manuel en remplaçant
temporairement `STOCKFISH_PATH` par un script qui lit `stdin` et ne répond
qu'à `uci`/`isready` (dix lignes de shell suffisent). Lancer une analyse : la
requête doit échouer en moins de 35 s, `/health` doit montrer `restarts: 1`
puis `available` revenu à sa valeur. Retirer le script, vérifier que
l'analyse normale n'a pas changé. Le mettre dans le journal, pas dans le
dépôt.

### A3. Les routes HTTP du serveur d'analyse sont anonymes et sans limite

**Constat.** `/analyse`, `/analyse/partie`, `/voix`, `/maia`
(`apps/server/src/index.ts:240` et suivantes) ne demandent rien. La seule
protection est la file de la réserve, plafonnée à 16 (`pool.ts:169`), et elle
est **globale** : seize requêtes en vol et tout le monde reçoit un refus. Le
CORS ne protège pas d'un `curl`.

**À faire.**

1. Un limiteur par adresse IP dans le serveur, en mémoire, fenêtre glissante :
   `/analyse` 30 par minute, `/analyse/partie` 3 par minute, `/voix` 60 par
   minute, `/maia` 60 par minute. Derrière Nginx Proxy Manager, l'adresse est
   dans `X-Forwarded-For` : ne la lire **que** si `TRUST_PROXY=1` (nouvelle
   variable, à documenter dans `.env.example`), sinon `socket.remoteAddress`.
   Réponse `429` avec `Retry-After`.
2. Une **file par IP** dans la réserve : au plus 2 recherches en attente par
   adresse. Au-delà, refus immédiat, sans toucher au plafond global. Ça se
   fait dans `EnginePool.enqueue` en portant l'IP dans la requête.
3. Priorité : un client authentifié (jeton passé comme sur `/parties/miennes`)
   obtient la priorité `interactive` ; un anonyme reste en `batch`. Le
   mécanisme de priorité existe déjà (`pool.ts:142-229`), il suffit de
   choisir la valeur d'après l'identité.

**Vérification.** Un `for` de vingt `curl` en parallèle sur `/analyse` : les
premiers passent, les suivants reçoivent `429`, et un client sur une autre
adresse (la boucle locale en IPv6 contre IPv4 suffit en local) n'est pas
affecté. `npm run test:realtime` toujours vert.

### A4. Les parties en direct meurent avec le processus

**Constat.** Les salons vivent dans une `Map` (`index.ts:54`). Une partie n'est
écrite en base qu'à sa fin (`persistence.ts:20`). `shutdown()` annule tout
salon en cours (`index.ts:572-574`). Un redéploiement, un plantage, ou un
`docker compose up -d --build` pendant une partie la perd, et le joueur
découvre un salon vide au retour.

**À faire.**

1. La table `active_games` existe déjà (elle sert au côté solo, voir le
   commentaire de `parties/terminee/route.ts:91`). L'étendre, par migration,
   d'une colonne `salon jsonb` nullable : l'instantané complet du salon —
   coups, pendules en horodatages absolus, joueurs avec leur `clientId`,
   cadence, `rated`, statut.
2. Dans `GameRoom`, après chaque coup accepté et à chaque changement de
   statut, écrire l'instantané (`snapshot()` existe déjà). Débit : une
   écriture par coup, c'est négligeable. Ne pas attendre l'écriture pour
   répondre au client.
3. Au démarrage du serveur, relire les salons `playing` de moins de deux
   heures et les reconstruire dans la `Map`. Les pendules étant en
   horodatages absolus, le temps écoulé pendant l'arrêt est **décompté** : le
   choisir et le dire dans un commentaire, c'est la règle des tournois en
   salle. Un salon dont le drapeau est tombé pendant l'arrêt se termine au
   temps au premier `join`.
4. `shutdown()` n'annule plus : il envoie `Le serveur redémarre, la partie
reprend dans un instant` et laisse la persistance faire. Le client
   (`useLiveGame.ts`) se reconnecte déjà, il retrouvera son salon.
5. Supprimer la ligne de `active_games` quand la partie se termine, en même
   temps que `persistFinishedGame`.

**Vérification.** Deux onglets, la recette de « jouer les deux côtés » de
`RESTE-A-FAIRE.md`. Cinq coups joués, `Ctrl+C` sur le serveur, relance : les
deux onglets retrouvent la position, les pendules ont avancé du temps de
l'arrêt, et le sixième coup passe.

### A5. Arrêt brutal et exception non gérée

**Constat.** `shutdown()` (`index.ts:570-584`) appelle `io.close()` et
`httpServer.close()` sans en attendre les rappels, puis `process.exit(0)`. Les
requêtes en vol sont coupées. Et `uncaughtException` n'est pas écouté : une
exception synchrone dans un rappel de socket tue le processus sans passer par
`shutdown()`, donc sans prévenir personne.

**À faire.** Envelopper les deux `close()` dans des promesses et les
attendre avec un plafond de 5 s (`Promise.race` contre un `setTimeout`).
Ajouter `process.on('uncaughtException', ...)` qui journalise puis appelle
`shutdown('uncaughtException')`, et garder un garde-fou pour que `shutdown`
ne s'exécute qu'une fois.

**Vérification.** Lancer une analyse longue, envoyer `SIGTERM` pendant : la
réponse arrive, puis le processus sort. Journal : « arrêt en cours » puis
« arrêté » avec la durée.

### A6. Purges qui n'ont lieu que si l'admin y pense

**Constat.** `pruneSessions` (`packages/db/src/auth.ts:573`) n'est appelé que
depuis un bouton de l'admin (`api/admin/contenus/route.ts:168`). Les tables
`evaluations` et `position_evals` ne sont jamais purgées ; `admin/sante` se
contente de les mesurer.

**À faire.** Dans le serveur, à côté de la boucle d'arènes (`index.ts:606`),
une tâche quotidienne à 4 h locale qui appelle `pruneSessions()` et une
nouvelle `pruneEvaluations(joursDeConservation)` dans `packages/db`, qui
supprime les lignes d'`evaluations` de plus de 90 jours. La table n'a qu'un
`created_at` (`schema.ts:548`), pas de date de dernière lecture : une
évaluation relue chaque semaine sera recalculée une fois par trimestre, c'est
acceptable et ça évite une écriture à chaque lecture. `position_evals`
est un import statique : on ne la purge pas, on le dit dans le commentaire.
Journaliser le nombre de lignes retirées. Réutiliser l'anti-spam des pannes
répétées (`index.ts:664-687`) pour cette tâche aussi.

**Vérification.** Forcer l'heure par une variable `PURGE_HEURE` non
documentée, lire le journal, compter dans `db:studio`.

---

## Lot B — L'écran de jeu re-rend tout, dix fois par seconde

Tout ce lot tient dans `apps/web/src/app/jouer/ordinateur/page.tsx` et les
deux composants d'échiquier. Il se mesure au profileur React, onglet
_Profiler_, en enregistrant dix secondes de partie sans jouer de coup :
**avant**, on doit voir `GameScreen` et `Board2D` se rendre environ cent
fois ; **après**, `GameScreen` moins de quinze fois et `Board2D` zéro.

### B1. La pendule

**Constat.** `setInterval(..., 100)` à la ligne `1404`, qui fait un
`setDisplayClock` dix fois par seconde, dans un effet dont les dépendances
(`[clock, ...]`) le recréent à chaque coup. Or `formatClock`
(`packages/core/src/clock.ts:199-211`) n'affiche les dixièmes que sous dix
secondes.

**À faire.** Sortir l'affichage de la pendule dans un composant `PenduleVive`
qui reçoit la pendule figée (`clock`) et **tient lui-même son minuteur** :
1 000 ms tant que le camp au trait a plus de dix secondes, 100 ms en
dessous. `GameScreen` ne porte plus `displayClock` dans son état ; il ne se
rend plus qu'au coup. La détection de chute du drapeau, qui vit dans le même
intervalle, reste dans `GameScreen` mais sur son propre minuteur calé sur
l'**échéance calculée** (`setTimeout` à `tempsRestant` ms, réarmé au coup)
plutôt que sur un sondage.

### B2. Le verdict qui casse la mémoïsation du plateau

**Constat.** `verdictDuCoup` (`:1742`) est un littéral d'objet, recréé à
chaque rendu, passé en prop à `ChessBoard`. `Board2D` est en `memo`, mais une
prop nouvelle à chaque rendu le rend inutile. `conseilDuCoup` (`:1764`)
dépend du même objet et perd aussi son `useMemo`.

**À faire.** `useMemo` sur `verdictDuCoup` avec
`[commentaryMode, commentary?.quality, commentaryStale, state.lastMove?.to]`.
Et `ChessBoard` (`components/board/ChessBoard.tsx:94`) doit lui-même être
en `memo` : il ne l'est pas, ce qui annule celui de ses enfants.

### B3. Le calcul de sûreté refait à chaque rendu

**Constat.** `Board2D.tsx:661` : `const selectedTargets = selected ?
targetsFor(selected) : []`, un tableau neuf par rendu, qui sert de
dépendance au `useMemo` de `safety` (`:670`). Résultat : `evaluateMoveSafety`,
une trentaine d'échanges statiques, tourne à **chaque** rendu dès qu'une pièce
est sélectionnée. Le commentaire juste au-dessus affirme le contraire.

**À faire.** `useMemo` sur `selectedTargets` avec `[selected, targetsFor]`
(vérifier que `targetsFor` est bien un `useCallback` stable ; sinon dépendre
de `legalMoves` et `selected`). Corriger le commentaire pour qu'il dise
comment on a su que c'était faux.

### B4. Le store de préférences lu en entier

**Constat.** `usePreferences()` sans sélecteur dans `Board2D.tsx:210`,
`Board3D.tsx:93,523,679`, `jouer/ordinateur/page.tsx:1142`,
`vision/page.tsx:52`. Le plateau se re-rend quand on change le volume.

**À faire.** Un sélecteur par usage, comme partout ailleurs dans le code.
Pour le plateau, les champs lus sont peu nombreux : les regrouper en un
sélecteur mémoïsé avec `useShallow` de `zustand/react/shallow`.

**Vérification du lot.** L'enregistrement du profileur décrit en tête, avant
et après, joint au journal en deux chiffres. Puis une partie complète en
blitz 3+2 contre le niveau 8 sans rien d'anormal : pendule, dixièmes sous dix
secondes, chute du drapeau, verdict et flèche du mode commenté.

---

## Lot C — Cinq fois le même code

Aucun changement de comportement dans ce lot. Chaque point se vérifie en
rejouant l'écran touché et en constatant que rien n'a bougé.

### C1. La carte des coups légaux

**Constat.** `useChessGame.ts:103` construit `Map<Square, Square[]>` depuis
`chess.moves({ verbose: true })`. La même boucle est réécrite dans
`analyse/page.tsx:1096`, `puzzles/page.tsx:1119`,
`jouer/partie/[slug]/page.tsx:291`, `apprendre/[lessonId]/page.tsx:205`,
`ouvertures/page.tsx:69`. Celle des puzzles passe par `useState` +
`useEffect` : un rendu de plus, et un premier rendu où le plateau ne
répond pas.

**À faire.** Extraire `useLegalMoves(fen: string | null, actif = true)` dans
`apps/web/src/lib/game/useLegalMoves.ts`, en `useMemo`, avec le `try/catch`
qui rend une carte vide sur un FEN illisible. `useChessGame` l'appelle ; les
cinq pages aussi. Supprimer les cinq copies.

### C2. Le son du coup

**Constat.** L'adaptateur vers `playMoveSound({ isCapture, isCheck, ... })`
(`lib/sound.ts:163`) est recopié huit fois : `jouer/local/page.tsx:83`,
`jouer/ordinateur/page.tsx:1217`, `jouer/partie/[slug]/page.tsx:139`,
`apprendre/[lessonId]/page.tsx:129,251,282`, `ouvertures/page.tsx:106,128`,
`puzzles/page.tsx:537,578`.

**À faire.** Dans `sound.ts`, `playMoveFor(move: Move)` qui prend le coup
de chess.js (`move.captured`, `move.san.endsWith('+')`, `'#'`,
`move.flags` pour roque et promotion) et appelle `playMoveSound`. Remplacer
les huit blocs.

### C3. L'identité demandée en brut

**Constat.** `fetch('/api/auth')` dans sept fichiers
(`jouer/ordinateur/page.tsx:487`, `amis/page.tsx:109`,
`jouer/ami/page.tsx:103`, `profil/[username]/page.tsx:104`,
`tournois/page.tsx:49`, `tournois/[slug]/page.tsx:71`,
`social/ChallengeWatcher.tsx:71`), alors que `lib/auth/useIdentite.ts` existe
pour partager l'appel et son résultat entre composants.

**À faire.** Remplacer par `useIdentite()`. Là où le code fait quelque chose
**après** la réponse (rediriger, charger la progression), passer par un effet
sur l'identité rendue. Vérifier que `useIdentite` expose bien un état
« chargement » distinct de « anonyme » : sinon l'ajouter, c'est ce qui manque
pour les redirections.

### C4. Le commentaire en direct qui pilote le moteur lui-même

**Constat.** `LiveCommentary.tsx:205-230` refait sa séquence
`start/setOptions/analyse` au lieu de passer par `lib/analysis/runner.ts`.

**À faire.** Passer par le `runner`. Si une option lui manque (le `multiPv`
à 3, probablement), l'ajouter au `runner` plutôt que garder la copie.

---

## Lot D — Ce que Next attend et qu'on ne lui donne pas

### D1. Erreur, absence, chargement

**Constat.** Aucun `error.tsx`, `not-found.tsx`, `loading.tsx` dans
`apps/web/src/app`. Une exception dans un composant donne l'écran gris de
Next ; `/profil/inexistant` ne dit rien de propre.

**À faire.** À la racine de `app/` : `error.tsx` (client, bouton « réessayer »
qui appelle `reset()`, texte dans le ton du site), `not-found.tsx`, et un
`global-error.tsx` minimal. `loading.tsx` seulement là où une page attend
vraiment des données côté serveur, c'est-à-dire pour l'instant nulle part :
ne pas en poser un vide « parce qu'il faut ». Dans `profil/[username]` et
`jouer/partie/[slug]`, appeler `notFound()` quand la ressource n'existe pas.

### D2. Métadonnées

**Constat.** 3 pages sur 37 déclarent un titre. Les autres affichent celui du
`layout`. Un onglet d'analyse et un onglet de puzzle portent le même nom.

**À faire.** Comme les pages sont `'use client'`, elles ne peuvent pas
exporter `metadata` : créer un `layout.tsx` serveur d'une ligne par dossier de
page avec `export const metadata = { title: '...' }`. Une trentaine de
fichiers de cinq lignes ; on les fait tous d'un coup. Titre au format
« Puzzles · Le Coup Parfait », le suffixe étant posé par `title.template` dans
le layout racine.

### D3. Les fetch qui survivent au composant

**Constat.** `AbortController` dans deux fichiers seulement ; un seul garde
`cancelled`. Les autres effets peuvent poser un état sur un composant
démonté, ou afficher une réponse arrivée après une plus récente.

**À faire.** Un hook `useFetchJson<T>(url | null, options)` dans
`lib/useFetchJson.ts`, qui porte l'`AbortController`, l'état
`{ data, erreur, chargement }`, et abandonne au démontage et au changement
d'URL. Pas de bibliothèque : ce que fait le projet tient en quarante lignes,
et on n'ajoute pas SWR pour ça. Migrer d'abord les quatre appels de montage
de `jouer/ordinateur/page.tsx` (`:268,487,527,536`), puis les autres au fil
des lots.

### D4. Cache des réponses

**Constat.** 6 routes sur 36 posent `Cache-Control`. `/api/classement`,
`/api/joueurs`, `/api/ouvertures` servent la même chose à tout le monde
pendant des minutes.

**À faire.** Sur les routes **sans session** et sans paramètre personnel :
`Cache-Control: public, s-maxage=60, stale-while-revalidate=300`. Sur les
routes avec session : `private, no-store`, explicitement, pour qu'un proxy ne
puisse pas se tromper. Lister les routes dans le journal avec la valeur
choisie.

---

## Lot E — Un filet

### E1. Les tests du cœur

**Constat.** `packages/core/package.json` déclare `"test": "node --test
--experimental-strip-types test/*.test.ts"` et **le dossier `test/` n'existe
pas**. Le `npm test` racine ne l'appelle pas. `explain.ts` (1 869 lignes),
`motifs.ts`, `classify.ts`, `rating.ts`, l'échange statique de `board.ts` : rien.

**À faire.**

1. Créer `packages/core/test/` avec `node:test`, un fichier par module,
   d'abord pour ce qui a une vérité connue : `board.test.ts` (SEE sur cinq
   positions, dont un rayon X), `motifs.test.ts` (une position par motif,
   prises dans les leçons, qui les décrivent déjà), `rating.test.ts` (Glicko
   contre l'exemple de l'article de Glickman, et l'Elo contre une table),
   `pgn.test.ts` (aller-retour, `resultatImpose` de A1), `clock.test.ts`
   (les seize cadences, en reprenant `check-cadences.mjs`).
2. Brancher `npm test -w @coupparfait/core` dans le `test` racine, **avant**
   les scripts de contrôle.
3. `apps/server` : un test du `pool` avec un faux moteur (celui de A2, rendu
   permanent sous `apps/server/test/faux-stockfish.mjs`) pour la file, les
   priorités et le délai de garde.

**Vérification.** `npm test` échoue si on casse l'échange statique
volontairement.

### E2. Lint et formateur

**Constat.** Aucun ESLint, aucun Prettier, aucun `.editorconfig`. Le code est
propre parce que quelqu'un y veille, pas parce qu'un outil le fait.

**À faire.** `eslint` avec `eslint-config-next` et `typescript-eslint` en
mode `recommended` uniquement, et Prettier avec les réglages qu'on lit déjà
dans le code (pas de point-virgule, guillemets simples, largeur 100). Une
commande `npm run lint`. La règle `react-hooks/exhaustive-deps` remontera les
dix `eslint-disable` existants : les laisser, ils sont commentés.

### E3. Intégration continue

**Constat.** Pas de `.github/`.

**À faire.** Un flux `ci.yml` sur `push` et `pull_request` : `npm ci`,
`npm run typecheck`, `npm run lint`, `npm test`, puis `npm run build` de
l'application web. Sans base de données : les tests n'en ont pas besoin et
`build` non plus. Le dépôt est privé et le flux est léger, les minutes
gratuites suffisent.

---

## Lot F — Ce qui manque à l'écran

### F1. Le coup adverse n'est pas annoncé

**Constat.** `aria-live` n'existe que sur `OpeningBanner.tsx:78` et
`Toast.tsx:113`. Un lecteur d'écran ne sait pas que l'adversaire a joué. La
préférence `announceMoves` (`lib/store/preferences.ts:134`) existe pour ça
et n'est lue nulle part.

**À faire.** Une région `aria-live="polite"` visuellement masquée dans
`ChessBoard`, qui reçoit le dernier coup en SAN traduit en toutes lettres
(« cavalier f3 », « prend en e5 », « échec ») : la fonction de lecture à voix
haute de `lib/speech.ts` produit déjà ce texte, la réutiliser. Brancher
`announceMoves` : si elle est vraie, en plus de la région, lire le coup à
voix haute. Ajouter la case à cocher dans les préférences, section Voix.

### F2. Le sélecteur de promotion piège le clavier

**Constat.** `PromotionPicker.tsx:68` est `role="dialog" aria-modal="true"`
sans focus initial, sans Échap, sans piège de focus. Au clavier, on promeut
depuis le plateau et le focus reste sur la case : Tab part ailleurs, Entrée
ne choisit rien. `GameOverDialog.tsx:88` ne gère qu'Échap.

**À faire.** Un hook `useDialogue(ref, { onFermer })` dans `lib/` : au
montage, mémorise `document.activeElement`, donne le focus au premier bouton,
piège Tab et Maj+Tab dans le conteneur, ferme sur Échap, et rend le focus au
démontage. L'appliquer aux dix dialogues (`grep -rn 'aria-modal'`). Pour la
promotion, le choix par défaut (dame) prend le focus ; Échap annule le coup.

### F3. Copier le FEN

**Constat.** Le FEN n'est visible que dans `/editeur`. Sur l'analyse et les
écrans de partie, aucun moyen de le copier, alors que c'est le premier geste
pour poser une question ailleurs.

**À faire.** Un bouton « Copier la position » dans `GameNav` (déjà présent
sur tous les écrans qui naviguent dans les coups), qui copie le FEN de la
position **affichée**, pas de la position réelle. Confirmation par le
`Toast` existant. Raccourci : `Ctrl+Maj+C`.

### F4. Partager une analyse

**Constat.** Les analyses enregistrées sont privées
(`lib/analysis/enregistrees.ts`). Seules les études ont un lien public.

**À faire.** Sur `saved_analyses`, une colonne `partage varchar(12)`
nullable, unique, posée à la demande (bouton « Partager », qui engendre un
identifiant court comme les slugs de partie). Une route `GET
/api/analyses/partagee/[partage]` sans session, et une page
`/analyse/p/[partage]` en lecture seule qui réutilise `ReviewScreen` avec
les commandes d'enregistrement masquées. Le bouton se retire du même
endroit, ce qui remet la colonne à `null`. C'est la même mécanique que les
études : la copier, pas en inventer une autre.

### F5. Hors ligne, ou cesser de le promettre

**Constat.** `public/sw.js` ne met rien en cache, par choix documenté et
défendable. Mais le commentaire de `next.config.ts` affirme que
« l'application fonctionne hors ligne », et le manifeste PWA le laisse
croire.

**À faire.** Décider. Si l'on veut un hors-ligne, il est modeste et il se
limite à ce qui ne change pas : la coque, les pièces, les sons, le moteur
WebAssembly, les leçons, la page `/jouer/ordinateur` et `/jouer/local`.
Stratégie _cache first_ sur `/engine/*`, `/pieces/*`, `/sounds/*` ; _network
first_ avec repli sur la coque ; jamais sur `/api/*`. Une page `/hors-ligne`
comme repli. Si on ne veut pas, retirer la phrase de `next.config.ts` et
l'ajouter en toutes lettres dans le README, rubrique « Ce que ça ne fait
pas ». Dans les deux cas, ce point se ferme.

---

## Lot G — Ce qui est écrit et qui n'est plus vrai

Un après-midi. À faire en dernier, parce que les lots précédents changent ce
qu'il faut écrire.

- **`.env.example`** ignore une vingtaine de variables lues par le code :
  `ADMIN_USERNAMES`, `STOCKFISH_PATH`, `INTERNAL_SERVER_URL`,
  `DATABASE_POOL_MAX`, `ENGINE_MAX_QUEUE`, `GAME_IDLE_ABORT_MS`, `MAIA_PATH`,
  `LC0_PATH`, `PIPER_BIN`, `PIPER_VOICES_DIR`, `COMFY_URL`, `EVAL_*`,
  `OPENING_STATS_*`, `PUZZLE_MIN_PLAYS`, `PUZZLE_SOURCE`, plus `SMTP_*` et
  `VAPID_*` documentées ailleurs, plus `TRUST_PROXY` de A3. Et il documente
  `AUTH_SECRET`, que rien ne lit (l'authentification n'a pas de secret
  partagé), et `LICHESS_EXPLORER_URL`, jamais lue. Pour chaque variable : une
  ligne de commentaire qui dit à quoi elle sert et sa valeur par défaut,
  commentée si elle n'est utile qu'en Docker. `scripts/setup.mjs` engendre
  `AUTH_SECRET` : retirer.
- **`docs/tournois.md`** commence par « rien n'est implémenté ». Les tournois
  existent : `packages/db/src/tournaments.ts`, trois pages, la boucle
  d'arènes du serveur. Réécrire l'en-tête comme celui de `mode-carriere.md` :
  état, date, et en fin de page ce qui a été tranché autrement.
- **`RESTE-A-FAIRE.md`** se dit non suivi et il est versionné. Ses deux points
  « demandent un compte » sont toujours ouverts : les vérifier avec le
  compte de démonstration (`npm run seed:demo`), puis supprimer le fichier et
  reporter ce qui reste dans le journal ci-dessous.
- **Deux affichages mentent sur une position composée** (signalé dans
  `RESTE-A-FAIRE.md`) : le bandeau d'ouverture et la barre des pièces prises.
  Les masquer quand `startFen` n'est pas la position initiale. Deux
  conditions, pas plus.
- **`public/brand`** pèse 12 Mo de PNG sources, embarqués dans l'image
  Docker. Les convertir en WebP à la taille réellement affichée, garder les
  sources dans `data/brand-sources/` hors dépôt. Remplacer les trois `<img>`
  bruts (`preferences/page.tsx:267,268`, `game/PlayerBar.tsx:92`) par
  `next/image`.
- **Le dictionnaire** (`lib/i18n/dictionary.ts:764`) exporte `fr` et `en`
  dans le même module. Séparer en `fr.ts` et `en.ts`, charger `en` par
  `import()` seulement quand la langue est choisie. Tant qu'il n'y a pas de
  routage par langue, `<html lang>` doit au moins suivre la préférence.

---

## Ordre, et ce que ça coûte

| Lot    | Contenu                                      | Ordre de grandeur                               |
| ------ | -------------------------------------------- | ----------------------------------------------- |
| A      | Intégrité et robustesse serveur              | 2 à 3 jours, A4 en fait la moitié               |
| B      | Écran de jeu                                 | 1 jour, mesures comprises                       |
| C      | Dédoublonnage                                | 1 jour                                          |
| E1     | Tests du cœur                                | 2 jours, le SEE et les motifs prennent le temps |
| D      | Next : erreurs, métadonnées, fetch, cache    | 1 jour                                          |
| F      | Annonce, dialogues, FEN, partage, hors-ligne | 2 à 3 jours selon F5                            |
| E2, E3 | Lint et CI                                   | ½ journée                                       |
| G      | Documentation et poids                       | ½ journée                                       |

A avant tout : c'est le seul lot où quelque chose de faux peut s'inscrire en
base. B et C ensuite, parce qu'ils touchent les mêmes fichiers et qu'on ne
veut pas les rouvrir deux fois. E1 avant D et F, pour que les lots suivants
se fassent avec un filet. G ferme.

Si l'on ne fait que trois choses : **A1, A2, et B1 à B3**. Les deux premiers
sont des correctifs d'une trentaine de lignes chacun, le troisième est
l'écran principal du site.

---

## Journal

À tenir ici, lot par lot : la date, ce qui a été fait, ce qui a été constaté
à l'écran ou par la mesure, et ce qu'on a trouvé en passant sans le traiter.
C'est la partie du document qui compte le plus dans six mois.

### Lot A — 3 septembre 2026

**A1.** `resultatImpose(chess)` est dans `packages/core/src/pgn.ts`, la route la
confronte au résultat déclaré. Écart assumé sur le point 2 : quand la position
n'impose rien et que le joueur annonce sa victoire, la partie **s'archive quand
même**, seul le drapeau `rated` tombe. Le document demandait un `400` en un
endroit et « ne s'enregistre pas classée » en un autre ; on a retenu le second,
qui ne prive personne de son historique. `scripts/check-partie-terminee.mjs`,
quatorze vérifications, dans `npm test`. Le limiteur des trois routes est
maintenant unique (`apps/web/src/lib/server/limiteur.ts`).

_Trouvé en passant, non traité :_ le client peut changer de niveau en cours de
partie (`setLevel`), et c'est le dernier niveau choisi qui part à l'archivage.
Ça ne se voit pas dans une partie classée — les aides sont retirées — mais la
valeur envoyée n'est pas rigoureusement « le niveau joué ».

**A2.** Garde armée après le `go` : `movetime + 5 s`, ou 30 s en profondeur,
puis `stop`, deux secondes d'insistance, `SIGKILL`. `restarts` dans `/health`.
Mesuré : abandon en 7,1 s pour un moteur sourd, 5,1 s pour un moteur qui obéit
à `stop`. Le faux moteur est permanent (`apps/server/test/faux-stockfish.mjs`,
E1 le demandait) et se lance par `process.execPath` — d'où une option `args`
ajoutée à `EngineProcess` : un script à shebang ne se lance pas sous Windows.

**A3.** Trente `curl` en parallèle : 30 × 200 puis 429 avec `Retry-After: 51`.
`X-Forwarded-For` forgé sans `TRUST_PROXY` : ignoré, avertissement au journal.
Avec `TRUST_PROXY=1`, deux adresses forgées ont bien deux compteurs. Part de
file par adresse : six analyses profondes simultanées → quatre servies, deux
refusées en 429. `npm run test:realtime` vert.

_Le piège, à ne pas réintroduire :_ les analyses du navigateur passent par la
passerelle `/api/analyse`, donc arrivent toutes de la même adresse. Sans les
en-têtes de relais (`apps/web/src/lib/server/passerelle.ts`) et sans
`TRUST_PROXY=1`, le quota d'une route se partage entre tous les joueurs.
`docker-compose.yml` pose la variable.

**A4.** Écart assumé : table dédiée `live_games` (clé = `slug`) et non une
colonne de `active_games`, dont la clé primaire est `user_id` — inutilisable
pour un salon à deux joueurs dont l'un peut être un invité sans compte.
Recette faite avec `scripts/essai-reprise.mjs` : cinq coups, serveur tué
brutalement, relancé. Position identique, statut `playing`, pendules 185,0 s /
125,0 s contre 185,0 s / 183,0 s avant l'arrêt — les 58 secondes de coupure
décomptées au camp au trait, comme voulu. Sixième coup accepté.

_Trouvé et traité en passant :_ un salon repris que personne ne rejoint ne
finissait jamais (ses joueurs n'ont pas d'horodatage de déconnexion, exprès).
Le ramassage périodique le relâche au-delà de deux heures.

_Trouvé et corrigé :_ `purgerSalonsPerimes` liait sa date par un fragment `sql`
brut, que le pilote refusait à l'exécution — invisible au typage. Repassé par
`lt()`.

**A5.** Fait dans le même commit qu'A4, même fonction. `shutdown` attend les
deux `close()` avec un plafond de 5 s, ne s'exécute qu'une fois, journalise sa
durée, et `uncaughtException` est écouté. **Non vérifié à l'exécution :** Node
sous Windows n'émet pas `SIGTERM` depuis `process.kill`, la recette du document
n'y est pas reproductible. À refaire sur le serveur.

**A6.** Tâche à 4 h locales, forcée par `PURGE_HEURE` pour l'essai. Journal
observé : « sessions expirées : 0 · évaluations de plus de 90 jours : 1 ·
salons périmés : 0 », puis silence au tour suivant — elle ne passe qu'une fois
par jour. `position_evals` n'est pas purgée, c'est dit dans le commentaire.

### Lot B — 3 septembre 2026

**Les deux chiffres.** Mesure prise avec un compteur de rendus posé dans le
corps de `GameScreen` et de `Board2D`, sur dix secondes de partie en cours
sans jouer de coup. Compteur, et non l'onglet _Profiler_ : il n'est pas
pilotable depuis le navigateur intégré, et il rend le même nombre.

|              | avant | après |
| ------------ | ----- | ----- |
| `GameScreen` | 200   | **0** |
| `Board2D`    | 0     | **0** |

Les 200 sont bien 100 battements : le mode strict de React rend deux fois en
développement. L'objectif du document — moins de quinze — est donc dépassé de
loin, puisqu'il n'en reste aucun : l'écran ne se rend plus qu'au coup.

**B2 et B3 : mesure impossible sur cet écran, correction faite quand même.**
`Board2D` est resté à zéro dans toutes les configurations essayées, y compris
en retirant le `memo` de `ChessBoard` **et** en rendant `verdictDuCoup` à
nouveau littéral, mode commenté activé. Son propre `memo` tenait. Les deux
corrections restent justes — un littéral d'objet en prop et un tableau neuf en
dépendance de `useMemo` sont des défauts qu'on lit dans le code —, mais elles
n'ont pas de « avant » chiffré à opposer, et le commentaire de `Board2D` a été
réécrit pour ne pas prétendre le contraire.

**Recette.** Partie 3 minutes contre le niveau 1, sans jouer, jusqu'à la chute
du drapeau. Relevé de l'affichage toutes les 200 ms : `0:12`, `0:11`, `0:10`,
puis `9.0`, `8.8`, `8.6`… jusqu'à `0.0`, puis « Défaite au temps ». Le passage
à la seconde près et le passage aux dixièmes se font au bon seuil, et le
minuteur à échéance calculée tombe à l'heure. Aucune erreur de console
imputable à l'application — deux `503` sur le serveur d'analyse, qui ne
tournait pas.

_Trouvé en passant, non traité :_ `jouer/partie/[slug]` a exactement le même
défaut de pendule et passe encore par `timeMs`. `PlayerBar` accepte désormais
les deux formes, la bascule ne coûtera que quelques lignes — mais c'est un
autre écran, donc un autre lot.

_Ajouté au passage :_ `usePreferencesDe(...cles)` dans le store, qui
enveloppe `useShallow`. Les six lectures sans sélecteur passent par lui.
Attention en l'utilisant : une lecture **indirecte** compte aussi, et l'oubli
ne se voit pas toujours au typage — `resolvePieceColours` lit trois champs
dans `Board3D` qui n'étaient pas dans la liste.

### Lot C — 3 septembre 2026

Aucun changement de comportement **voulu**. Mais le dédoublonnage en a révélé
un : les copies avaient divergé.

**C1.** `useLegalMoves(fen, actif)` dans `lib/game/`, six copies supprimées —
`useChessGame` comprise, qui construisait la carte depuis l'instance `chess`
plutôt que depuis la position. La garde `isGameOver()` qu'elle portait était
redondante : un mat ne rend aucun coup légal de toute façon.

**C2.** `playMoveFor(move)` et `playMoveForSan(san)` dans `sound.ts`, huit
copies supprimées. _Écart trouvé entre copies_ : celle des ouvertures posait
`isCheckmate: false` en dur, si bien qu'un mat joué dans une ligne du livre
faisait le bruit d'un coup ordinaire. Les autres se partageaient entre lire
l'échec dans `board.inCheck()` et le lire dans le SAN — même résultat, deux
façons de l'obtenir.

_Corrigé au passage :_ `PlayedMove` gagne `isPromotion`, ce qui le rend
directement acceptable par `playMoveSound`. Le typage a alors désigné deux
autres endroits qui reconstruisaient un `PlayedMove` à la main ; `toPlayedMove`
est exportée et l'un des deux la réutilise.

**C3.** Les sept `fetch('/api/auth')` passent par `useIdentite`, qui savait
déjà distinguer « chargement » (`undefined`) d'« anonyme » (`null`) — le
document se demandait s'il fallait l'ajouter, c'était déjà fait. Le statut du
courriel est rangé dans le même store : il voyage dans la même réponse, et
l'écran de profil refaisait la requête entière pour ce seul champ. Mesuré :
**un** appel par chargement de page.

**C4.** `analyserAvecLeNavigateur` sort dans le `runner` ; `LiveCommentary` ne
touche plus au moteur. Le `multiPv` à 3 que le document soupçonnait manquant
n'était pas en cause : le commentaire calcule son propre nombre de variantes
d'après le réglage « alternatives », et le passe en paramètre.

**Recette.** Ouvertures : `e4` joué à la souris, ouverture identifiée, son émis.
Puzzles : le plateau répond au premier clic — c'était le défaut du hook à
`useState`. Tournois et « jouer contre quelqu'un » : l'état visiteur s'affiche
sans clignoter. Aucune erreur de console imputable à l'application.

### Lot E1 — 3 septembre 2026

Cinquante-six vérifications dans `packages/core/test/`, branchées **en tête**
de `npm test` comme demandé, plus six dans `apps/server/test/`.

| fichier          | ce qu'il couvre                                            |
| ---------------- | ---------------------------------------------------------- |
| `board.test.ts`  | l'échange statique, rayon X compris                        |
| `motifs.test.ts` | clouage, enfilade, fourchette, mats, couloir, pièce piégée |
| `rating.test.ts` | Elo contre la table, Glicko-2 contre l'article de Glickman |
| `pgn.test.ts`    | import tolérant, aller-retour, `resultatImpose`            |
| `clock.test.ts`  | barème, décompte, drapeau, affichage                       |

**Le filet tient.** Vérifié comme le document le demande : en remplaçant le
`Math.max(0, …)` de l'échange statique par `Math.max(-1, …)`, `npm test`
échoue sur deux vérifications et sort en code 1. Le plafond restauré, tout
repasse.

**Ce que les tests ont appris sur le code, et qui n'a pas été corrigé** — c'est
la règle du chantier, une découverte va au journal et non dans le commit :

1. ~~**`hasOpposition` teste la mauvaise parité.**~~ **Corrigé.** Elle exigeait
   une distance impaire entre les rois ; l'opposition directe — e4 contre e6,
   une case entre les deux — est une distance de **2**, et une distance impaire
   ne se produit qu'à distance 1, soit deux rois collés, ce qui est illégal. La
   fonction ne rendait donc _jamais_ vrai, et le motif « opposition » n'a jamais
   été signalé à personne. Le test n'est plus `todo`, et deux cas s'y ajoutent :
   l'opposition à distance et l'opposition diagonale, que la première faute
   masquait. Le motif est en outre réservé aux finales — sans quoi la
   correction l'aurait fait apparaître au milieu de parties complètes.
2. **Deux barèmes de cadence coexistent.** `speedCategory` dans le cœur suit la
   formule de Lichess (`initial + 40 × incrément`, seuils 30/180/480/1500) ;
   `cadence()` dans `api/parties/terminee` ne regarde que le temps initial
   (seuils 180/600/1800). Entre 480 et 600 secondes ils divergent : une partie
   de 8 minutes est classée « rapide » contre un ami et « blitz » contre
   l'ordinateur, donc dans deux catégories de classement différentes. Le test
   fige la formule du cœur, qui est la bonne.

_Ajouté au passage, et assumé :_ `EngineProcess` puis `EnginePool` acceptent
des `args`. C'est la seule façon de lancer un faux moteur écrit en JavaScript
sur les trois systèmes — un script à shebang ne se lance pas sous Windows, et
Node refuse un `.cmd` sans interpréteur. Sans ça, ni A2 ni E1 n'auraient de
preuve exécutable ailleurs que sous Linux.

_Corrigé au passage :_ `packages/core/tsconfig.json` avait un `rootDir` sur
`src` qui rendait le dossier `test/` intypable. Il ne servait à rien —
`noEmit` est posé, il n'y a pas de sortie à cadrer.

### Lot D — 3 septembre 2026

**D1.** `error.tsx`, `not-found.tsx` et `global-error.tsx` à la racine de
`app/`. Aucun `loading.tsx`, conformément au document : aucune page n'attend
de données côté serveur.

_Écart nécessaire, dû à la version :_ le document dit « bouton réessayer qui
appelle `reset()` ». Next 16 a renommé la prop en **`retry`**, qui refait la
requête _et_ le rendu ; `reset` existe encore mais se contente de vider l'état
de la frontière, ce qui ne répare rien ici. Vérifié dans
`node_modules/next/dist/docs/…/error.md`, comme l'impose `apps/web/AGENTS.md`.

_Point non fait, et pourquoi :_ « appeler `notFound()` dans `profil/[username]`
et `jouer/partie/[slug]` ». Les deux pages sont des composants **client**, et
la documentation de Next 16 est explicite : `notFound()` s'appelle depuis un
composant serveur, une fonction serveur ou un gestionnaire de route, et « dans
le chemin de rendu » — un appel depuis un `.then()` lève là où rien ne
l'attrape, et aucune interface d'introuvable ne s'affiche. Le faire supposerait
de convertir les deux écrans en composants serveur, ce qui déborde largement du
lot. À noter aussi : l'écran de profil affiche **déjà** un état distinct et
plus précis (« Aucun compte au pseudo « X » »), le constat du document est en
partie périmé.

**D2.** Trente-quatre mises en page d'une ligne. Piège rencontré et corrigé :
les cinq dossiers qui ont des pages en dessous d'eux — `jouer`, `apprendre`,
`puzzles`, `etudes`, `tournois` — ne peuvent pas poser un `title` en chaîne.
Elle consomme le gabarit de la racine sans en reposer aucun, et l'onglet de
`/jouer/ordinateur` s'appelait « Contre l'ordinateur » tout court. Ils
déclarent donc `{ default, template }`. Vérifié route par route au `curl`.

**D3.** `lib/useFetchJson.ts`. Trois des quatre appels de montage de l'écran
contre l'ordinateur y passent ; le quatrième (`:268`, la progression de
carrière) n'est pas un appel de montage mais une action déclenchée par un
choix, avec un enchaînement de rappels — le migrer n'aurait rien apporté.

**D4.** _Écart de méthode assumé._ Le document dit de poser l'en-tête sur les
routes. C'est ce qui a été fait d'abord, et **ça ne marche pas** : les en-têtes
de `next.config.ts` écrasent ceux de la réponse. Mesuré — `/api/classement`
rendait toujours `private, no-store`. Tout est donc dans la configuration, où
la **dernière** règle qui correspond l'emporte :

| routes                           | valeur                                            |
| -------------------------------- | ------------------------------------------------- |
| `/api/*` (défaut)                | `private, no-store`                               |
| `classement`, `joueurs`, `sante` | `public, s-maxage=60, stale-while-revalidate=300` |
| `profil/:username`               | idem                                              |
| `parties`                        | `public, s-maxage=15, stale-while-revalidate=60`  |

Le défaut est le prudent : le risque n'est pas le gaspillage, c'est qu'un
relais partagé garde une réponse personnelle et la ressorte à quelqu'un
d'autre. Vérifié au `curl` sur les neuf routes, publiques et privées.

_`/api/ouvertures` n'existe pas_ — le document la cite, le livre d'ouvertures
est servi en statique.

### Lot F — 3 septembre 2026

**F1.** Région `aria-live="polite"` dans `ChessBoard`, alimentée par
`sanToSpeech` — la fonction qui produisait déjà ce texte pour la voix. Observé
au navigateur : après le premier coup de l'ordinateur, la région contient
« pion c 4 ». `announceMoves` est branchée et sa case posée dans Préférences →
Son et voix. Deux gardes : on ne relit pas le même coup deux fois, et on
n'annonce pas le coup **déjà présent** à l'arrivée sur l'écran.

_Une prop en plus :_ `dernierCoupSan`. `lastMove` ne porte que deux cases, de
quoi flécher mais pas de quoi dire « cavalier f3 ». Les trois écrans de jeu la
passent ; les autres n'annoncent rien, ce qui est correct.

**F2.** `lib/useDialogue.ts`, appliqué au sélecteur de promotion, à la boîte de
fin de partie et à la porte du compte. **Pas** à `Celebration` : elle n'a aucun
élément focalisable — un piège à focus y serait vide — et elle gère déjà Échap,
Entrée et Espace. Trois dialogues sur quatre, donc, et le quatrième n'en a pas
besoin.

**F3.** Bouton dans `GameNav`, séparé des flèches par un trait, plus
`Ctrl+Maj+C`. Mesuré au navigateur : la FEN copiée est bien celle **affichée**.
La branche d'échec a été observée pour de vrai — le navigateur piloté refuse
le presse-papiers, et le message le dit sans prétendre avoir copié.

**F4.** Colonne `partage varchar(12)` unique, migration `0005`, route publique
`GET /api/analyses/partagee/[partage]` qui ne lit aucune session, page
`/analyse/p/[partage]` en lecture seule. Recette : ligne posée à la main en
base, lien ouvert **sans compte**, rapport complet affiché — échiquier,
explications, précision, navigation. Lien inconnu : `404`.

_Un import entre pages, le seul du projet :_ `ReviewScreen` est exportée depuis
`analyse/page.tsx`. La sortir dans `components/` demanderait de déplacer sept
cents lignes et tous les fragments avec lesquels elle partage ce fichier, pour
un gain de rangement seul.

**F5. Décision prise : pas de hors-ligne, et on le dit.** Le document laissait
le choix. `public/sw.js` argumente lui-même, longuement, pourquoi il ne met
rien en cache — un moteur WebAssembly de plusieurs mégaoctets et des données
qui doivent rester d'accord entre elles. Passer outre pour tenir une phrase de
commentaire aurait été le mauvais sens de la correction. La phrase est donc
retirée de `next.config.ts`, de `layout.tsx` et de `Board3D.tsx` — elle y était
trois fois —, et le README gagne une rubrique **« Ce que ça ne fait pas »** qui
l'énonce, avec deux autres limites tant qu'à faire : une seule instance du
serveur temps réel, et la triche contre soi-même en partie solo.

Le manifeste PWA, lui, ne promettait rien : il déclare `display: standalone`,
ce qui n'est pas une promesse de hors-ligne.

### Lots E2 et E3 — 3 septembre 2026

**E2. Deux écarts au document, tous deux dus à la version des outils.**

1. **Les nouvelles règles du compilateur React sont éteintes.**
   `eslint-config-next` 16 embarque une famille écrite pour le compilateur —
   `set-state-in-effect`, `refs`, `purity`, `immutability`,
   `preserve-manual-memoization`, `react/use`. Elle signalait **195** endroits
   d'un code qui fonctionne, essentiellement des `setState` dans un effet,
   c'est-à-dire la façon ordinaire de déposer le résultat d'une requête. Ce
   projet n'utilise pas le compilateur ; le jour où il le fera, on les
   rallumera une par une.
2. **`.claude/` est ignoré.** Il contient des copies de travail du dépôt :
   sans cette exclusion, chaque avertissement comptait double (578 au lieu
   de 202).

Le document annonçait « une dizaine » de remontées, le compte final est de
**zéro erreur et dix-neuf avertissements**, dont onze `exhaustive-deps` — les
dix `eslint-disable` déjà commentés, plus trois dépendances superflues dans
`useChessGame`, laissées telles quelles.

_Corrigé au passage, parce que l'outil l'a désigné :_ une quarantaine
d'imports morts (dont plusieurs laissés par le lot C), deux variables assignées
et jamais relues, deux fonctions d'explication orphelines, une apostrophe
droite. La référence à l'énoncé vocal est **gardée** avec un `eslint-disable`
qui dit pourquoi : sans elle, Chrome coupe les phrases longues au milieu.

_Le passage de Prettier est un commit à lui seul_, avec `.git-blame-ignore-revs`
qui le désigne. 187 fichiers dont la seule différence est un retour à la ligne,
mêlés à du vrai travail, rendraient les deux illisibles.

_Piège rencontré :_ sans `endOfLine: auto`, Prettier voulait réécrire **515**
fichiers sous Windows — l'intégralité du dépôt, pour cause de CRLF.

**E3.** `.github/workflows/ci.yml` : `npm ci`, typage, lint, mise en forme,
tests, construction. Sans base, comme prévu. `npm run build` a été lancé en
local avant d'être demandé à la machine : il passe.

_À savoir :_ `next build` réécrit `apps/web/next-env.d.ts` sous une forme
différente de celle qu'écrit `next dev`. Le fichier est versionné et bascule
donc d'une commande à l'autre. Il a été exclu du commit ; si l'arbre paraît
sale après une construction, c'est lui.

### Lot G — 3 septembre 2026

**`.env.example`.** Une vingtaine de variables ajoutées, chacune avec une ligne
qui dit à quoi elle sert et sa valeur par défaut. Deux retirées, et vérifié
par recherche qu'aucun fichier ne les lit :

- **`AUTH_SECRET`** était **obligatoire** dans `docker-compose.yml` (`:?`),
  engendré par `npm run setup`, cité deux fois au README — et lu par personne.
  Cette authentification n'a pas de secret partagé : une session est un jeton
  aléatoire dont seule l'empreinte est en base. Retirée des quatre endroits.
- **`LICHESS_EXPLORER_URL`** : le livre d'ouvertures est embarqué, rien
  n'appelle Lichess.

**`docs/tournois.md`** : en-tête refait sur le modèle de `mode-carriere.md`, et
une section « ce qui a été tranché autrement » — dont le **tournoi contre
l'ordinateur**, qui n'était pas prévu du tout et qui est le plus joué. Reste
ouvert et noté : la notification à l'ouverture d'une arène n'est pas branchée.

**`RESTE-A-FAIRE.md` supprimé**, ses deux points vérifiés au compte de
démonstration :

- la **carte de carrière** s'affiche (douze chapitres, rang « Poulain »), et
  le dépôt d'XP marche — `POST /api/carriere` fait passer l'XP de 0 à 100, une
  victoire comptée, deux hauts faits attribués ;
- la **progression après une position composée** ne bouge pas : mat joué
  depuis un `?fen=…`, `defeated`, `attempts` et `wins` restent à zéro.

_Méthode :_ pas de saisie de mot de passe. Forçage temporaire de l'identité
dans `getCurrentUser`, puis retrait vérifié — `/api/progression` répond de
nouveau `tracked: false`. Les comptes de démonstration sont purgés.

_Deux recettes de ce fichier valaient d'être gardées, elles sont ici :_
**jouer les deux côtés d'une partie en direct** demande un `clientId` distinct
posé **avant** l'entrée du second onglet
(`localStorage.setItem('coupparfait.clientId', '…')`) ; et le serveur temps réel
n'autorise que l'origine `NEXT_PUBLIC_APP_URL`, si bien qu'un port 3000 occupé
fait tourner l'interface sur un autre port mais **pas** les parties en direct.

**Les deux affichages qui mentaient** sur une position composée sont masqués.
Constaté sur une finale de pions : aucun bandeau d'ouverture, aucune pièce
prise annoncée.

**`public/brand` : 11,3 Mo → 0,2 Mo**, soit 98 % de moins. Sept portraits de
536 × 960 étaient servis pour être affichés à quarante-huit pixels. Les sources
sortent du dépôt (`data/brand-sources/`, ignoré) et `npm run brand:images` en
tire des WebP à deux fois la taille d'affichage. Mesuré au navigateur : la page
« Jouer » charge ses sept portraits en **11 ko**, aucune image cassée.

_Écart au document :_ « remplacer les trois `<img>` bruts par `next/image` » n'a
pas été fait, parce que ce n'en sont pas les bons. Deux servent des **SVG** de
pièces à 28 px — l'optimiseur redimensionne des pixels, un SVG n'en a pas — et
le troisième est un **avatar d'adresse libre**, que `next/image` refuserait
faute d'hôte déclaré dans `remotePatterns` ; les déclarer tous ferait de ce
serveur un optimiseur d'images pour le web entier. Les trois gardent un
`eslint-disable` qui dit pourquoi.

**Le dictionnaire** est séparé en `fr.ts` et `en.ts`. Le chargement de
l'anglais par `import()` n'est **pas** fait, et c'est mesuré : il pèse **4 ko
gzippés**. Le différer ferait afficher le français une fraction de seconde à
qui a choisi l'anglais, pour 4 ko. À revoir le jour où un routage par langue
permettra au serveur de savoir quoi servir.

_`<html lang>` suivait déjà la préférence_, et même avant le premier rendu :
le script d'amorçage du thème le pose depuis le stockage local. Vérifié à
l'écran dans les deux sens.

---

## Le chantier est fini

Les huit lots sont faits. Ce qui reste ouvert, dans l'ordre où je le
reprendrais :

1. **Deux barèmes de cadence divergent** entre 8 et 10 minutes (lot E1) : une
   partie change de catégorie de classement selon l'écran où elle a été jouée.
2. **`jouer/partie/[slug]` a le même défaut de pendule** que l'écran contre
   l'ordinateur (lot B). `PlayerBar` accepte déjà la bonne forme.
3. **L'arrêt sur `SIGTERM` n'a pas été vérifié à l'exécution** (lot A5) : Node
   sous Windows ne l'émet pas depuis `process.kill`. À refaire sur le serveur.
4. **La notification d'ouverture d'arène** n'est pas branchée (lot G).
