# Le Coup Parfait

**Apprendre, jouer, progresser aux échecs.** Une plateforme libre, gratuite et
auto-hébergeable — sans publicité, sans traqueur, sans compte obligatoire.

La différence avec un simple moteur d'analyse tient en une phrase : quand tu
fais une erreur, Le Coup Parfait ne se contente pas d'afficher `−2.4`, il t'explique en
français **ce que tu as raté**, avec les mots que les joueurs utilisent entre
eux — fourchette, clouage, mat du couloir — et il te le dit à voix haute.

---

## Ce que ça fait

| | |
|---|---|
| **Jouer** | 25 niveaux d'ordinateur (250 → 3200 Elo) avec 7 personnalités distinctes · parties entre amis en temps réel via un simple lien · partie locale à deux sur un écran |
| **Mode commenté** | après **chaque** coup, les trois meilleures options avec leur évaluation et la raison de chacune, le coup proposé fléché sur l'échiquier, et l'explication lue à voix haute — réécoutable |
| **Apprendre** | 36 leçons guidées en 7 chapitres, de « voici un échiquier » au répertoire d'ouvertures, avec un coach qui parle et un échiquier interactif |
| **S'entraîner** | jusqu'à 6 057 356 puzzles tactiques notés et étiquetés, avec classement Glicko-2 dédié |
| **Finales** | 3 568 positions classées en 8 familles : on donne l'objectif — gagner ou tenir la nulle — et l'ordinateur défend au mieux |
| **Analyser** | Stockfish 18 natif côté serveur · chaque coup classé (brillant → gaffe), meilleur coup fléché, **explication rédigée** |
| **Explorer** | 3 810 ouvertures nommées, reconnues même par transposition |
| **Progresser** | comptes, classement Glicko-2 par cadence, Elo classique affiché en parallèle, courbe de progression |

Et côté forme : quatre thèmes commutables, dix jeux de pièces, huit damiers,
un échiquier **2D et 3D** interchangeable en pleine partie avec mode plein
écran, une application installable sur téléphone (PWA), et une interface
entièrement navigable au clavier.

### Les aides à l'apprentissage — toutes désactivables

| Aide | Ce qu'elle fait |
|---|---|
| **Coups colorés** | à la sélection d'une pièce, chaque case d'arrivée se colore : vert si la pièce y est en sécurité, rouge si elle serait perdue, doré si le coup gagne du matériel. Le verdict vient d'un échange statique complet, pas d'un simple test « case attaquée ». |
| **Nom de l'ouverture** | affiché et mis à jour à chaque coup pendant la partie, y compris par transposition. On retient les noms parce qu'on les voit sur ses propres parties. |
| **Mode commenté** | l'analyse après chaque coup, avec les alternatives et le coup proposé. |
| **Voix du coach** | narration de toutes les explications, avec réécoute. Voix neuronale Piper si elle est installée, sinon celle du navigateur. |

Chacune se coupe d'un clic depuis les préférences ou depuis la partie. C'est
le but : on s'en sert le temps d'acquérir le réflexe, puis on s'en passe.

---

## Démarrage rapide

### En local

```bash
git clone <url-du-depot> gambit && cd gambit
npm install
npm run setup                    # ressources, moteur, ouvertures, icônes, .env
docker compose up -d db          # PostgreSQL
npm run db:push                  # crée les tables
npm run data:openings            # importe les 3 810 ouvertures
npm run data:puzzles             # importe 200 000 puzzles (~2 min)
```

Puis, dans un seul terminal :

```bash
npm run dev
```

Cette commande démarre les deux serveurs côte à côte — l'application web sur le
port 3000 et le serveur de parties et d'analyse sur le port 3001 — avec leurs
journaux préfixés `web` et `api`. Pour n'en lancer qu'un : `npm run dev:web` ou
`npm run dev:server`.

→ **http://localhost:3000**

> Le serveur d'analyse a besoin d'un binaire Stockfish. S'il est absent,
> l'application le signale et bascule automatiquement sur le moteur WebAssembly
> du navigateur : tout reste utilisable, simplement moins profond.

### En production (Docker)

```bash
cp .env.example .env             # renseigne POSTGRES_PASSWORD et AUTH_SECRET
docker compose up -d --build
docker compose exec web node scripts/import-openings.mjs
docker compose exec web node scripts/import-puzzles.mjs
```

L'image du serveur **compile Stockfish 18 depuis les sources**, avec
optimisation guidée par le profil et réseau NNUE complet. Comptez une dizaine
de minutes pour la première construction.

Derrière **Nginx Proxy Manager**, créer deux hôtes mandataires :

| Domaine | Cible | WebSocket |
|---|---|---|
| `gambit.mondomaine.fr` | `web:3000` | oui |
| `gambit-api.mondomaine.fr` | `server:3001` | **indispensable** |

Puis renseigner `NEXT_PUBLIC_APP_URL` et `NEXT_PUBLIC_SERVER_URL` dans `.env`.

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

| | Navigateur | Serveur |
|---|---|---|
| Version | Stockfish 18 Lite (WebAssembly, 7 Mo) | Stockfish 18 natif, NNUE complet |
| Rôle | avis instantané, adversaires artificiels, repli | analyse de partie en profondeur |
| Profondeur | 14–18 | 20–30 |
| Confidentialité | rien ne sort du navigateur | requêtes via l'API interne |

Le navigateur charge par défaut la variante **mono-fil** : la variante
multi-fils est plus rapide mais repose sur des *workers* imbriqués que plusieurs
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

| Commande | Effet |
|---|---|
| `npm run setup` | installation complète après un clone |
| `npm run dev` | démarre les deux serveurs de développement ensemble |
| `npm run dev:web` / `npm run dev:server` | n'en démarrer qu'un seul |
| `npm run build` | construction de production |
| `npm run typecheck` | vérification des types sur tout le dépôt |
| `npm run check:lessons` | **valide les 149 étapes de leçons** : positions légales, coups jouables |
| `npm run test:realtime` | test de bout en bout du serveur de parties |
| `npm run db:push` | applique le schéma à PostgreSQL |
| `npm run data:openings` | importe les ouvertures en base |
| `npm run data:puzzles` | importe les puzzles (`PUZZLE_IMPORT_LIMIT=0` pour les 6 millions) |
| `npm run data:endgames` | compile les 3 568 positions de finales |
| `npm run voice:install` | installe la voix neuronale Piper en local (facultatif) |
| `npm run engine:install` | installe Stockfish natif en local (facultatif) |

---

## Configuration

Tout se règle dans `.env` à la racine (voir `.env.example`). Les variables qui
comptent :

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | connexion PostgreSQL |
| `AUTH_SECRET` | secret de session — **à changer**, généré par `npm run setup` |
| `NEXT_PUBLIC_SERVER_URL` | adresse publique du serveur temps réel |
| `STOCKFISH_PATH` | chemin du binaire Stockfish |
| `ENGINE_POOL_SIZE` / `ENGINE_THREADS` | processus moteur et fils par processus |
| `ENGINE_MAX_DEPTH` | profondeur maximale autorisée (protège le processeur) |
| `PUZZLE_IMPORT_LIMIT` | nombre de puzzles à importer (`0` = tous) |

---

## Vie privée

- Aucun traqueur, aucune publicité, aucun outil de mesure d'audience.
- **Aucune requête vers un domaine tiers** : les polices sont auto-hébergées,
  précisément pour que l'adresse IP des joueurs ne parte nulle part.
- Les préférences vivent dans le navigateur. Un compte ne stocke qu'un pseudo,
  une empreinte de mot de passe (scrypt), des classements et des parties.
- L'adresse e-mail est facultative et ne sert qu'à la récupération de mot de
  passe.
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
