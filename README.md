# Le Coup Parfait

**Apprendre, jouer, progresser aux échecs.** Une plateforme libre, gratuite et
auto-hébergeable — sans publicité, sans traqueur, sans compte obligatoire.

La différence avec un simple moteur d'analyse tient en une phrase : quand tu
fais une erreur, Le Coup Parfait ne se contente pas d'afficher `−2.4`, il t'explique en
français **ce que tu as raté**, avec les mots que les joueurs utilisent entre
eux — fourchette, clouage, mat du couloir — et il te le dit à voix haute.

---

## Ce que ça fait

|                   |                                                                                                                                                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Jouer**         | 25 niveaux d'ordinateur (250 → 3200 Elo) avec 7 personnalités distinctes · parties entre amis en temps réel via un simple lien · partie locale à deux sur un écran                                                          |
| **Mode commenté** | après **chaque** coup, les trois meilleures options avec leur évaluation et la raison de chacune, le coup proposé fléché sur l'échiquier, et l'explication lue à voix haute — réécoutable                                   |
| **Apprendre**     | 36 leçons guidées en 7 chapitres, de « voici un échiquier » au répertoire d'ouvertures, avec un coach qui parle et un échiquier interactif                                                                                  |
| **S'entraîner**   | jusqu'à 6 057 356 puzzles tactiques notés et étiquetés, avec classement Glicko-2 dédié                                                                                                                                      |
| **Finales**       | 3 568 positions classées en 8 familles : on donne l'objectif — gagner ou tenir la nulle — et l'ordinateur défend au mieux                                                                                                   |
| **Analyser**      | Stockfish 18 natif côté serveur · chaque coup classé (brillant → gaffe), meilleur coup fléché, **explication rédigée**                                                                                                      |
| **Importer**      | tes parties Chess.com et Lichess, à partir du seul pseudo : rien à installer, aucun compte à créer, et rien n'est conservé                                                                                                  |
| **Explorer**      | 3 810 ouvertures nommées, reconnues même par transposition                                                                                                                                                                  |
| **Progresser**    | comptes, classement Glicko-2 par cadence, Elo classique affiché en parallèle, courbe de progression                                                                                                                         |
| **Revenir**       | un défi du jour, **le même pour tout le monde**, cinq quêtes courtes et une série de jours consécutifs — sans compte, si l'on veut                                                                                          |
| **Être prévenu**  | une notification quand un ami t'invite — un défi expire en cinq minutes — et un rappel du défi du jour, à ton heure. Rien d'autre, et les deux se coupent séparément. Voir [`docs/notifications.md`](docs/notifications.md) |

Et côté forme : quatre thèmes commutables, dix jeux de pièces, huit damiers,
un échiquier **2D et 3D** interchangeable en pleine partie avec mode plein
écran, une application installable sur téléphone (PWA), et une interface
entièrement navigable au clavier.

### Les aides à l'apprentissage — toutes désactivables

| Aide                   | Ce qu'elle fait                                                                                                                                                                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Coups colorés**      | à la sélection d'une pièce, chaque case d'arrivée se colore : vert si la pièce y est en sécurité, rouge si elle serait perdue, doré si le coup gagne du matériel. Le verdict vient d'un échange statique complet, pas d'un simple test « case attaquée ». |
| **Nom de l'ouverture** | affiché et mis à jour à chaque coup pendant la partie, y compris par transposition. On retient les noms parce qu'on les voit sur ses propres parties.                                                                                                     |
| **Mode commenté**      | l'analyse après chaque coup, avec les alternatives et le coup proposé.                                                                                                                                                                                    |
| **Pourquoi ce coup ?** | l'inverse du mode commenté : rien ne s'affiche tant qu'on ne demande pas. Même moteur, même explication — seul le déclencheur change.                                                                                                                     |
| **Voix du coach**      | narration de toutes les explications, avec réécoute. Voix neuronale Piper si elle est installée, sinon celle du navigateur.                                                                                                                               |

Chacune se coupe d'un clic depuis les préférences ou depuis la partie. C'est
le but : on s'en sert le temps d'acquérir le réflexe, puis on s'en passe.

### L'assistant IA — facultatif, avec ta clé

Tout ce qui précède fonctionne **sans le moindre appel à un service
extérieur** : les explications sont écrites par l'application, pas par un
modèle de langue. C'est un choix de fond, et il ne change pas.

Reste une chose qu'un texte pré-rédigé ne saura jamais faire : répondre à _ta_
question. « Et si j'avais joué autre chose ? », « pourquoi cette case est
faible ? ». Pour ça, et seulement pour ça, tu peux brancher ton propre compte
chez un fournisseur d'IA — OpenAI, Anthropic, Google, Mistral, DeepSeek,
OpenRouter, ou **Ollama sur ta machine**. N'importe quel service compatible
OpenAI s'ajoute avec un nom et une adresse.

Ce qu'il faut savoir avant de saisir une clé :

- **Elle reste dans ton navigateur.** Jamais en base, jamais attachée à ton
  compte, jamais dans la synchronisation des préférences.
- **Pour un fournisseur distant, la requête passe par le serveur de
  l'instance** — les navigateurs interdisent d'appeler ces API directement. Le
  serveur recopie l'appel sans rien en conserver, mais sur une instance que tu
  n'héberges pas toi-même, cela suppose de faire confiance à l'hébergeur.
- **Avec Ollama ou tout service local, rien ne passe par nos serveurs** : ton
  navigateur lui parle directement. C'est l'option qui n'expose la clé à
  personne, pour la bonne raison qu'elle n'en demande aucune.
- Le modèle ne calcule rien. On lui transmet l'évaluation de Stockfish et
  l'explication déjà rédigée ; il n'a le droit ni d'inventer une variante, ni
  de proposer sa propre évaluation. C'est la seule façon connue d'empêcher un
  modèle de langue de raconter des coups qui n'existent pas.

Tout cela se règle dans **Préférences → Assistant IA**, et se désactive du même
endroit. Par défaut, c'est éteint.

### Ce que ça ne fait pas

Autant le dire ici plutôt que de le laisser découvrir.

- **Ça ne fonctionne pas hors ligne.** L'application s'installe sur l'écran
  d'accueil et se comporte comme une application, mais elle a besoin du réseau :
  `public/sw.js` ne met délibérément rien en cache. La raison est dans l'en-tête
  de ce fichier — un moteur WebAssembly de plusieurs mégaoctets, des réseaux de
  neurones et une base de puzzles, et un cache écrit à la légère finirait par
  servir une version du plateau qui ne parle plus à une version du moteur. Un
  hors-ligne modeste serait possible (la coque, les pièces, les sons, le moteur,
  les leçons, les deux écrans de jeu solo) ; il n'est pas fait.
- **Ça ne tient pas la charge à plusieurs instances.** Une seule instance du
  serveur temps réel : la boucle des tournois créerait deux fois les mêmes
  paires, et les limiteurs de rythme comptent chacun pour soi.
- **Ça n'empêche pas quelqu'un de tricher contre lui-même.** Les parties contre
  l'ordinateur se jouent dans le navigateur. Le résultat est recoupé avec la
  position atteinte, ce qui ferme les cas faciles, mais quelqu'un de déterminé y
  arrivera — sur une plateforme qu'il héberge lui-même.

---

## Installation

### Prérequis

|                   | Version    | Pour quoi faire                                                                |
| ----------------- | ---------- | ------------------------------------------------------------------------------ |
| **Node.js**       | 22 ou plus | l'application ; le serveur exécute du TypeScript directement, sans compilation |
| **Docker**        | récent     | PostgreSQL. Une base installée à la main convient aussi                        |
| **Git**           | —          | récupérer le dépôt                                                             |
| **Espace disque** | ~1,5 Go    | dont 1 Go de dépendances npm et 330 Mo de jeux de données                      |

Aucune clé d'API, aucun compte à créer nulle part : tout ce que l'application
utilise est libre et se télécharge sans identification. L'assistant IA est la
seule exception, et il est facultatif — c'est l'utilisateur qui apporte sa
propre clé, s'il en veut un.

### En local

```bash
git clone https://github.com/cparfait/lecoupparfait.git
cd lecoupparfait
npm install
```

Puis une seule commande prépare tout le reste :

```bash
npm run setup
```

Elle crée le fichier `.env` **avec des secrets engendrés aléatoirement**, puis
télécharge les jeux de pièces et bruitages, le moteur Stockfish WebAssembly,
l'index des 3 810 ouvertures, les 3 568 finales, et engendre les icônes. Elle
finit par valider les 189 étapes de leçons. Chaque étape est facultative :
si l'une échoue, l'application démarre quand même, avec cette ressource en
moins.

Reste la base de données :

```bash
docker compose up -d db          # PostgreSQL sur le port 5432
npm run db:push                  # crée les tables
npm run data:openings            # importe les ouvertures
npm run data:puzzles             # importe 200 000 puzzles (~2 min)
```

> Pour les **six millions** de puzzles plutôt que deux cent mille :
> `PUZZLE_IMPORT_LIMIT=0 npm run data:puzzles`. Comptez une trentaine de
> minutes et 4 Go en base.

Enfin :

```bash
npm run dev
```

Cette commande démarre les deux serveurs côte à côte — l'application web sur le
port 3000, le serveur de parties et d'analyse sur le port 3001 — avec leurs
journaux préfixés `web` et `api`. Un Ctrl+C arrête les deux.

→ **http://localhost:3000**

### Deux ajouts facultatifs

Ni l'un ni l'autre n'est nécessaire : sans eux, l'application fonctionne, en
retombant sur le moteur du navigateur et sur sa voix de synthèse.

```bash
npm run engine:install     # Stockfish natif — analyse plusieurs fois plus rapide
npm run voice:install      # voix neuronale Piper — le coach devient écoutable
```

Chaque script télécharge la version correspondant à ta machine, la range dans
`data/`, vérifie qu'elle répond, et affiche les deux lignes à ajouter au `.env`
si le chemin n'est pas détecté tout seul.

En Docker, les deux sont déjà dans l'image : rien à faire.

### En production (Docker)

**Le dépôt est privé : il faut d'abord donner au serveur le moyen de le lire.**
Une _clé de déploiement_, c'est-à-dire une paire SSH rattachée à ce dépôt-là et
à aucun autre, en lecture seule.

Pas de jeton personnel dans l'URL de clonage : il donne accès à _tous_ vos
dépôts, apparaît en clair dans `git remote -v` et dans les journaux, et expire —
un matin, le `git pull` du serveur échoue sans qu'on comprenne pourquoi.

```bash
ssh-keygen -t ed25519 -C "vps-coupparfait" -f ~/.ssh/coupparfait_deploy -N ""
cat ~/.ssh/coupparfait_deploy.pub
```

Sur GitHub : dépôt → **Settings** → **Deploy keys** → _Add deploy key_, coller
la clé publique. **Ne pas cocher « Allow write access »** : le serveur n'a jamais
à écrire, et une clé en lecture seule qui fuite ne permet pas de pousser du code
sur ce qui sera déployé.

Dans `~/.ssh/config` :

```
Host github-coupparfait
  HostName github.com
  User git
  IdentityFile ~/.ssh/coupparfait_deploy
  IdentitiesOnly yes
```

`IdentitiesOnly yes` n'est pas décoratif : sans lui, SSH présente d'abord les
autres clés de la machine — celle de `laeti`, celle de `monplandeclasse` —
GitHub les refuse, et au bout de cinq essais ferme la connexion, avec un message
qui ne dit rien du vrai problème.

```bash
ssh -T git@github-coupparfait    # « Hi cparfait/lecoupparfait! You've successfully authenticated »
```

Puis l'installation elle-même :

```bash
cd ~/docker                              # là où vivent les applications
git clone git@github-coupparfait:cparfait/lecoupparfait.git coupparfait
cd coupparfait

cp .env.example .env                     # renseigne POSTGRES_PASSWORD
docker network create web-coupparfait    # la façade, une seule fois
docker compose up -d --build
docker compose exec web node scripts/migrate.mjs   # crée le schéma
docker compose exec web node scripts/import-openings.mjs
docker compose exec web node scripts/import-puzzles.mjs
```

**La façade est un réseau à part, et c'est délibéré.** Le montage habituel
derrière Nginx Proxy Manager consiste à créer un réseau `proxy` partagé et à y
brancher toutes les applications du serveur. Le défaut n'est pas théorique : sur
un réseau Docker, tout le monde se joint. N'importe quel conteneur d'une autre
application pourrait ouvrir une connexion vers `coupparfait-web:3000` — sans
TLS, sans journal du proxy, sans aucune des règles configurées dans NPM.

Chaque application a donc sa propre façade, et Nginx Proxy Manager est le seul
service branché sur plusieurs : c'est son rôle, et c'est le seul chemin entre
deux applications.

**Aucun port n'est publié sur l'hôte**, pas même sur la boucle locale — ni la
base, ni les deux applications. Un port sur `127.0.0.1` reste un accès sans TLS
et sans journal offert à quiconque obtient un shell sur la machine. Pour une
inspection ponctuelle, `docker compose exec db psql` passe par le conteneur et
ne laisse rien d'ouvert derrière lui.

**La base n'a pas accès à Internet.** Elle et son service de sauvegarde vivent
sur un réseau `internal: true` : ils n'ont aucune raison de sortir, et une base
qui ne peut pas sortir ne peut rien exfiltrer. Les deux applications gardent la
leur par la façade — elles en ont besoin pour les tables de finales de Lichess,
l'import chess.com et Lichess, et l'assistant s'il est configuré.

**Une sauvegarde par jour**, quinze jours de conservation, dans `./backups`.
Attention : ces fichiers vivent sur la machine qu'ils sauvegardent. Tant qu'ils
n'ont pas été recopiés ailleurs, ils protègent d'une fausse manœuvre, pas d'une
perte du serveur.

**Des migrations, et non `db:push`.** Les deux mènent au même schéma, par deux
chemins qui ne se valent pas ici. `push` compare le schéma à la base et applique
la différence : c'est commode en développement, où l'on tâtonne, et c'est
inutilisable en production — il pose des questions auxquelles personne ne
répondra, et il propose de supprimer ce qu'il ne comprend pas. Les migrations
rejouent des fichiers SQL versionnés dans `packages/db/migrations`, dans l'ordre,
sans rien demander et sans rien deviner.

`scripts/migrate.mjs` et non `npm run db:migrate` : cette commande-là passe par
`drizzle-kit`, une dépendance de développement, absente de l'image de production
qui n'embarque que les modules réellement utilisés par l'application. Le script,
lui, ne se sert que de `drizzle-orm` et `postgres`, présents à l'exécution. Il
tient le même journal et se relance sans risque.

Sur une base **déjà en service**, ne pas rejouer la migration initiale : elle
crée les tables sans `IF NOT EXISTS` et échouera. Il faut d'abord la marquer
comme appliquée — c'est le rôle de la table `__drizzle_migrations`.

L'image du serveur **compile Stockfish 18 depuis les sources**, avec
optimisation guidée par le profil et réseau NNUE complet, et installe la voix
neuronale Piper. Comptez une vingtaine de minutes pour la première
construction.

Derrière **Nginx Proxy Manager**, créer deux hôtes mandataires :

| Domaine                         | Forward Hostname  | Port | WebSocket         |
| ------------------------------- | ----------------- | ---- | ----------------- |
| `coupparfait.mondomaine.fr`     | `coupparfait-web` | 3000 | oui               |
| `coupparfait-api.mondomaine.fr` | `coupparfait-api` | 3001 | **indispensable** |

Ce sont les alias déclarés sur la façade, et non les noms de service `web` et
`server` : NPM voit passer toutes les applications du serveur, où « web » et
« server » ne désigneraient rien. Le conteneur NPM doit être branché sur
`web-coupparfait` — dans son interface, onglet _Networks_, ou par
`docker network connect web-coupparfait <conteneur-npm>`.

Puis renseigner `NEXT_PUBLIC_APP_URL` et `NEXT_PUBLIC_SERVER_URL` dans `.env`.

### Si quelque chose cloche

| Symptôme                                              | Cause probable                                                                                                                                        |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| « moteur d'analyse : indisponible » au démarrage      | Stockfish natif absent — normal en local. `npm run engine:install`, ou ignorer : le navigateur prend le relais                                        |
| L'analyse tourne sans fin                             | Serveur d'analyse injoignable. Il refuse désormais en quelques millisecondes ; si le symptôme revient, vérifier que le port 3001 répond               |
| La voix reste celle du navigateur                     | Piper absent ou serveur muet. Préférences → « Tester la voix » annonce qui a parlé                                                                    |
| Tout échoue en local après avoir copié `.env.example` | `INTERNAL_SERVER_URL` et `STOCKFISH_PATH` doivent rester **commentés** : ce sont les chemins internes à Docker, `docker compose` les fournit lui-même |
| Le port 3000 est déjà pris                            | Un serveur d'une session précédente. `npm run dev` arrête proprement toute sa descendance, mais un lancement manuel peut laisser un processus         |

---

## Architecture

```
gambit/
├── packages/
│   ├── core/     règles, évaluation, motifs tactiques, explications, Elo & Glicko-2
│   └── db/       schéma PostgreSQL (Drizzle), comptes, classements
├── apps/
│   ├── web/      interface Next.js 16 · échiquiers 2D et 3D · API REST
│   └── server/   Stockfish natif (réserve de processus) · temps réel Socket.IO
├── scripts/      installation, imports de données, vérifications
└── data/         jeux de données libres (ouvertures ECO)
```

### Les deux moteurs

|                 | Navigateur                                      | Serveur                          |
| --------------- | ----------------------------------------------- | -------------------------------- |
| Version         | Stockfish 18 Lite (WebAssembly, 7 Mo)           | Stockfish 18 natif, NNUE complet |
| Rôle            | avis instantané, adversaires artificiels, repli | analyse de partie en profondeur  |
| Profondeur      | 14–18                                           | 20–30                            |
| Confidentialité | rien ne sort du navigateur                      | requêtes via l'API interne       |

Le navigateur charge par défaut la variante **mono-fil** : la variante
multi-fils est plus rapide mais repose sur des _workers_ imbriqués que plusieurs
environnements refusent de créer. Elle reste activable, avec repli automatique.

### Comment les explications sont produites

Elles ne viennent **pas** d'un modèle de langue. `packages/core` contient un
analyseur géométrique qui reconnaît une quarantaine de motifs directement sur
l'échiquier :

- **tactique** — fourchettes, clouages absolus et relatifs, enfilades, attaques
  à la découverte, échecs doubles, pièces piégées, défenseurs surchargés, mats
  du couloir et étouffés, sacrifices (via échange statique) ;
- **stratégie** — pions passés, isolés, doublés, arriérés, avant-postes, paire
  de fous, mauvais fous, colonnes ouvertes, tours en septième, sécurité du roi ;
- **finales** — opposition, tour derrière le pion passé, fou de mauvaise
  couleur, activité du roi.

Trois conséquences : c'est **instantané** (aucun appel réseau), c'est
**toujours vrai** (chaque affirmation est vérifiable sur l'échiquier), et c'est
**reproductible** (la même position donne toujours la même explication, ce qui
aide à mémoriser).

L'échange statique (SEE) est implémenté récursivement et validé sur des
positions de contrôle, y compris les attaques en rayon X.

---

## Commandes

| Commande                                 | Effet                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `npm run setup`                          | installation complète après un clone                                    |
| `npm run dev`                            | démarre les deux serveurs de développement ensemble                     |
| `npm run dev:web` / `npm run dev:server` | n'en démarrer qu'un seul                                                |
| `npm run build`                          | construction de production                                              |
| `npm run typecheck`                      | vérification des types sur tout le dépôt                                |
| `npm run check:lessons`                  | **valide les 149 étapes de leçons** : positions légales, coups jouables |
| `npm run test:realtime`                  | test de bout en bout du serveur de parties                              |
| `npm run db:push`                        | applique le schéma à PostgreSQL, en développement                       |
| `npm run db:generate`                    | fabrique un fichier de migration à partir du schéma                     |
| `node scripts/migrate.mjs`               | rejoue les migrations — c'est la voie de la production                  |
| `npm run data:openings`                  | importe les ouvertures en base                                          |
| `npm run data:puzzles`                   | importe les puzzles (`PUZZLE_IMPORT_LIMIT=0` pour les 6 millions)       |
| `npm run data:endgames`                  | compile les 3 568 positions de finales                                  |
| `npm run data:opening-stats`             | calcule ce que les joueurs jouent vraiment, depuis un mois de parties   |
| `npm run data:evals`                     | importe les évaluations pré-calculées de Lichess                        |
| `npm run voice:install`                  | installe la voix neuronale Piper en local (facultatif)                  |
| `npm run engine:install`                 | installe Stockfish natif en local (facultatif)                          |
| `npm run vapid`                          | fabrique la paire de clés des notifications (facultatif)                |

---

## Configuration

Tout se règle dans `.env` à la racine (voir `.env.example`). Les variables qui
comptent :

| Variable                                 | Rôle                                                  |
| ---------------------------------------- | ----------------------------------------------------- |
| `DATABASE_URL`                           | connexion PostgreSQL                                  |
| `NEXT_PUBLIC_SERVER_URL`                 | adresse publique du serveur temps réel                |
| `STOCKFISH_PATH`                         | chemin du binaire Stockfish                           |
| `ENGINE_POOL_SIZE` / `ENGINE_THREADS`    | processus moteur et fils par processus                |
| `ENGINE_MAX_DEPTH`                       | profondeur maximale autorisée (protège le processeur) |
| `PUZZLE_IMPORT_LIMIT`                    | nombre de puzzles à importer (`0` = tous)             |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | notifications — sans elles, le réglage n'apparaît pas |

---

## Vie privée

- Aucun traqueur, aucune publicité, aucun outil de mesure d'audience.
- **Aucune requête vers un domaine tiers** : les polices sont auto-hébergées,
  précisément pour que l'adresse IP des joueurs ne parte nulle part.
- Les préférences vivent dans le navigateur. Un compte ne stocke qu'un pseudo,
  une empreinte de mot de passe (scrypt), des classements et des parties.
- L'adresse e-mail est facultative et ne sert qu'à la récupération de mot de
  passe.
- Les notifications sont **chiffrées pour ton navigateur** : le service qui les
  relaie — Google, Mozilla, Apple — ne peut pas les lire. Un abonnement se
  révoque d'un bouton, et ne conserve que l'adresse de l'appareil, deux clés de
  chiffrement et ton fuseau horaire.
- La synthèse vocale tourne **sur ta machine** : soit celle du système
  d'exploitation, soit Piper installé sur ton propre serveur. Aucun texte ne
  part vers un service de synthèse, et aucune clé d'API n'est nécessaire.

Les seuls appels sortants possibles sont vers les tables de finales de Lichess,
désactivables en vidant `LICHESS_TABLEBASE_URL`.

---

## Licence

**AGPL-3.0-or-later.**

Ce n'est pas un choix militant mais une nécessité : Le Coup Parfait intègre Stockfish,
publié sous GPL, ce qui impose une licence compatible. L'AGPL ajoute une clause
adaptée à un service en ligne — quiconque héberge une version modifiée doit en
publier le code.

Concrètement : utilise-le, modifie-le, héberge-le pour tes amis, redistribue-le.
La seule obligation est de laisser les suivants en faire autant.

Les ressources réutilisées (moteur, jeux de données, pièces, sons) conservent
leur licence d'origine — voir [`ATTRIBUTION.md`](ATTRIBUTION.md) et la page
« Crédits » de l'application. Les jeux de pièces sous licence **CC BY-NC-SA**
ont été délibérément écartés : leur clause non commerciale empêcherait la
redistribution libre du projet.
