# Mettre à jour la production

Le README décrit l'installation initiale, qui n'a lieu qu'une fois. Ce document
décrit ce qu'on fait ensuite, cent fois.

---

## La procédure

Depuis le VPS, dans `~/docker/coupparfait` :

```bash
./scripts/deployer.sh --web-seul     # une correction d'interface — le cas courant
./scripts/deployer.sh                # web + serveur d'analyse
./scripts/deployer.sh --migrer       # si la livraison contient des migrations
```

C'est tout. Le script récupère le dépôt, construit, bascule, et dit ce qu'il a
réellement fait.

**`--web-seul` mérite d'être le réflexe.** Redémarrer `server` déconnecte
toutes les parties en direct, les salons vivant en mémoire. La grande majorité
des livraisons ne touchent qu'à l'interface et n'ont aucune raison
d'interrompre qui que ce soit.

---

## Où passe la coupure

`docker compose up -d --build` fait deux choses très différentes à la suite,
et une seule coupe le service :

| Étape          | Durée      | Le site est…                                                  |
| -------------- | ---------- | ------------------------------------------------------------- |
| Construction   | 2 à 20 min | **debout** — l'ancienne version sert                           |
| Bascule        | 2 à 5 s    | **coupé** — l'ancien conteneur s'arrête, le nouveau démarre     |
| Sonde de santé | ~10 s      | debout — il sert déjà, on ne fait que le vérifier               |

La construction ne coûte rien : Docker fabrique la nouvelle image pendant que
l'ancienne tourne. La coupure, c'est le passage de l'une à l'autre.

Les séparer ne la raccourcit pas, mais permet de la déclencher au moment choisi,
une fois l'image prête — plutôt que de découvrir au bout de six minutes de
construction que le `git pull` n'avait rien ramené.

Pendant ces quelques secondes, les visiteurs voient la page d'attente (plus
bas), qui se recharge d'elle-même dès le retour du site.

---

## Le piège du déploiement qui ne déploie rien

C'est de loin l'incident le plus fréquent, et le plus difficile à voir.

Si `git pull` ne rapporte rien — clé de déploiement expirée, branche pas encore
poussée, mauvaise branche — alors les images ne changent pas, `up -d` ne recrée
aucun conteneur, et **la commande se termine sans erreur**. Rien à l'écran ne
distingue « déployé » de « rien fait ». Le seul symptôme est un `uptime` qui ne
bouge pas, et on le cherche généralement une demi-heure plus tard, en se
demandant pourquoi le correctif n'a rien corrigé.

`scripts/deployer.sh` compare la révision avant et après le `pull`, compare les
identifiants de conteneurs avant et après la bascule, et le dit dans les deux
cas.

### Vérifier ce qui tourne vraiment

**L'image du conteneur correspond-elle à la dernière construite ?** Deux
empreintes différentes signifient qu'une image existe et n'a jamais été
déployée — le conteneur tourne encore sur la précédente.

```bash
docker inspect --format 'conteneur : {{.Image}}' coupparfait-web-1
docker image inspect --format 'latest    : {{.Id}}' coupparfait-web:latest
```

**Le code déployé contient-il ce que j'attends ?** L'image du serveur embarque
les sources TypeScript telles quelles (`--experimental-strip-types`), donc on
peut y chercher directement un symbole qu'on vient d'ajouter :

```bash
docker compose exec server grep -c <symbole> /app/apps/server/src/realtime/gameRoom.ts
```

**La clé de déploiement répond-elle encore ?**

```bash
ssh -T git@github-coupparfait    # « Hi cparfait/lecoupparfait! You've successfully authenticated »
```

---

## Les migrations

`--migrer` applique les migrations **avant** la bascule, sur un conteneur
jetable fabriqué à partir de la nouvelle image (`compose run --rm`). Elles
passent donc par le code qu'on s'apprête à déployer, jamais par celui qui tourne
encore.

Avant plutôt qu'après, et c'est le choix standard : pendant les quelques
secondes de bascule, c'est l'**ancien** code qui sert. Un schéma en avance ne le
gêne pas — à condition que les migrations soient **additives**. Ajouter une
colonne, une table, un index : sans danger. Renommer ou supprimer dans la même
livraison : l'ancien code casse pendant ces quelques secondes. La règle est
d'étaler sur deux livraisons — l'une qui ajoute, l'autre qui retire, une fois
que plus rien ne lit l'ancien nom.

Sur une base **déjà en service**, ne jamais rejouer la migration initiale : elle
crée les tables sans `IF NOT EXISTS` et échouera. Voir le README.

---

## La page d'attente

Pendant la bascule, Nginx Proxy Manager ne joint plus le conteneur. Plutôt que
son 502 par défaut, il sert `deploy/attente.html` : un 503 correct, une vraie
page, et une sonde qui recharge l'onglet dès que l'application répond.

La page est servie **par NPM et non par l'application**, puisqu'elle n'apparaît
précisément que lorsque l'application ne répond plus. Elle est donc autonome —
aucune police distante, aucune feuille de style, aucune image — et vit dans le
volume de NPM.

### Installé le 3 septembre 2026

Conservé ici pour une réinstallation, ou pour un nouvel hôte.

**1. Déposer le fichier** (à refaire à chaque modification de
`deploy/attente.html` — rien ne l'automatise : le fichier appartient à ce dépôt,
le volume appartient à la pile NPM, et les deux n'ont volontairement aucun lien).

```bash
docker exec npm-npm-1 mkdir -p /data/attente
docker cp deploy/attente.html npm-npm-1:/data/attente/attente.html
```

`/data` est un montage persistant : le fichier survit à une recréation du
conteneur NPM.

**2. Brancher l'hôte.** Il faut atteindre l'administration de NPM, qui n'est pas
publiée sur Internet. Depuis une machine de travail :

```bash
ssh -N -p 22222 -L 8181:127.0.0.1:81 debian@<adresse-du-vps>
```

Puis `http://localhost:8181` → **Proxy Hosts** → `coupparfait` → **Edit** →
onglet **Advanced**, et coller :

```nginx
# Page d'attente pendant les bascules de conteneur.
#
# « =503 » n'est pas décoratif : sans lui, nginx renverrait le code de la
# réponse servie, c'est-à-dire 200 — et un moteur de recherche retiendrait
# « Mise à jour en cours » comme étant le contenu de la page d'accueil.
error_page 502 503 504 =503 @attente;

location @attente {
  root /data/attente;
  add_header Retry-After 15 always;
  add_header Cache-Control "no-store" always;
  # « always » : sans ce mot, `add_header` ne s'applique pas aux réponses
  # d'erreur — c'est-à-dire à toutes celles qui passent ici.
  try_files /attente.html =503;
}
```

Ce que NPM enregistre là est injecté tel quel dans le bloc `server { }` du
fichier qu'il génère pour cet hôte. Rien n'est validé à la saisie : une faute de
syntaxe fait échouer le rechargement de nginx, et NPM le signale en rouge.

**Sur l'hôte de l'API, c'est facultatif** et l'effet est mince : il ne sert que
du JSON et des WebSockets à du code, jamais des pages à des humains. Le seul
gain est un 503 plus honnête qu'un 502.

### Vérifier

Que NPM a bien régénéré sa configuration (`8.conf` est l'hôte web,
`9.conf` l'API) :

```bash
docker exec npm-npm-1 grep -n -A8 "error_page 502" /data/nginx/proxy_host/8.conf
```

Que le fichier est en place — 5522 octets à ce jour, à comparer avec
`git cat-file -s HEAD:deploy/attente.html` :

```bash
docker exec npm-npm-1 ls -l /data/attente/
```

Et le test de bout en bout, le seul qui prouve que l'ensemble tient. Deux
secondes de coupure ; le domaine est extrait de la configuration plutôt
qu'écrit en dur :

```bash
docker compose stop web && curl -s -o /tmp/p.html -w '%{http_code}\n' \
  "https://$(docker exec npm-npm-1 sed -n 's/^ *server_name *\([^;]*\);/\1/p' /data/nginx/proxy_host/8.conf | head -1)"
head -c 200 /tmp/p.html
docker compose start web
```

Attendu : `503`, puis les premières lignes du HTML. Rien après le code, c'est
que le fichier manque et que `try_files` est retombé sur son `=503` de secours.

---

## Ce qui n'est pas résolu

**`server` coupe les parties en cours.** Les salons vivent en mémoire. Le
redémarrer déconnecte toutes les parties en direct, et aucun aménagement du
déploiement n'y changera quoi que ce soit : même en faisant coexister deux
conteneurs, un joueur qui rafraîchit sa page atterrirait sur le nouveau et ne
retrouverait pas son salon. Le vrai correctif est de persister l'état des salons
en base — un chantier à part entière.

En attendant : `--web-seul` par défaut, et ne toucher à `server` que lorsque
c'est lui qu'on a modifié, à une heure creuse.

**La coupure n'est pas nulle, seulement courte.** Deux à cinq secondes, derrière
une page qui se recharge seule.

Pour descendre à zéro il faudrait faire tourner deux conteneurs `web` en
parallèle et basculer l'alias réseau de l'un à l'autre. NPM le permettrait — il
résout `coupparfait-web` par variable, avec `resolver 127.0.0.11 valid=10s`
(vérifié par `docker exec npm-npm-1 nginx -T | grep resolver`), donc il suivrait
un changement d'IP en dix secondes. Mais cela imposerait que deux versions du
code tournent simultanément à chaque livraison, et donc la discipline des
migrations additives en permanence, sans exception possible. Ce n'est pas le
compromis retenu.
