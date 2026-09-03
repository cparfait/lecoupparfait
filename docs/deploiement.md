# Mettre à jour la production

Le README décrit l'installation initiale. Ce document décrit ce qu'on fait
ensuite, cent fois : livrer une nouvelle version sans couper le service plus
longtemps qu'il ne faut.

```bash
cd ~/docker/coupparfait
./scripts/deployer.sh --web-seul     # une correction d'interface
./scripts/deployer.sh                # web + serveur d'analyse
./scripts/deployer.sh --migrer       # si la livraison contient des migrations
```

---

## Où passe réellement la coupure

`docker compose up -d --build` fait deux choses très différentes à la suite,
et une seule coupe le service :

| Étape         | Durée         | Le site est…                     |
| ------------- | ------------- | -------------------------------- |
| Construction  | 2 à 20 min    | **debout** — l'ancienne version sert |
| Bascule       | ~2 à 5 s      | **coupé** — l'ancien conteneur est arrêté, le nouveau démarre |
| Sonde de santé| 10 s          | debout — il sert déjà, on le vérifie |

La construction ne coûte rien : Docker fabrique la nouvelle image pendant que
l'ancienne tourne. La coupure, c'est le passage de l'une à l'autre, et il n'y a
qu'un moyen de la supprimer complètement — faire coexister les deux versions,
ce qui est un autre chantier (voir « Ce qui n'est pas résolu » plus bas).

Ce qu'on peut faire, en revanche :

1. **Séparer les deux étapes**, pour déclencher la bascule au moment choisi et
   non au bout de six minutes d'attente aveugle ;
2. **Ne basculer que ce qui change** — `--web-seul` ;
3. **Servir une vraie page** pendant les quelques secondes, au lieu d'un 502.

C'est ce que font `scripts/deployer.sh` et la page d'attente ci-dessous.

---

## Le piège du déploiement qui ne déploie rien

C'est de loin l'incident le plus fréquent, et le plus difficile à voir.

Si `git pull` ne rapporte rien — clé de déploiement expirée, branche pas encore
poussée, mauvaise branche — alors les images ne changent pas, `up -d` ne recrée
aucun conteneur, et **la commande se termine sans erreur**. Rien à l'écran ne
distingue « déployé » de « rien fait ». Le seul symptôme est un `uptime` qui ne
bouge pas, et on le cherche généralement une demi-heure après, en se demandant
pourquoi le correctif n'a rien corrigé.

`scripts/deployer.sh` compare la révision avant et après le `pull`, compare les
identifiants de conteneurs avant et après la bascule, et le dit dans les deux
cas. Si on soupçonne quand même quelque chose, l'image embarque les sources
TypeScript telles quelles (`--experimental-strip-types`), donc on peut y
chercher directement un symbole qu'on vient d'ajouter :

```bash
docker compose exec server grep -c <symbole> /app/apps/server/src/realtime/gameRoom.ts
```

---

## La page d'attente

Pendant les quelques secondes de bascule, Nginx Proxy Manager ne joint plus le
conteneur et sert son 502 par défaut. On peut lui faire servir une vraie page,
qui se recharge toute seule quand l'application revient.

La page doit être servie **par NPM**, pas par l'application : elle n'apparaît
précisément que lorsque l'application ne répond plus. Elle vit donc dans le
volume de NPM, et c'est une installation en une fois.

### 1. Déposer le fichier

```bash
docker exec npm-npm-1 mkdir -p /data/attente
docker cp deploy/attente.html npm-npm-1:/data/attente/attente.html
```

`/data` est un montage persistant : le fichier survit à une recréation du
conteneur NPM. Pour le retrouver côté hôte — utile pour le versionner avec le
reste de la configuration du serveur :

```bash
docker inspect npm-npm-1 --format '{{range .Mounts}}{{.Source}} → {{.Destination}}{{"\n"}}{{end}}'
```

**À refaire à chaque modification de `deploy/attente.html`.** Rien ne l'automatise :
le fichier appartient à ce dépôt, le volume appartient à la pile NPM, et les deux
n'ont volontairement aucun lien.

### 2. Brancher les deux hôtes

Dans NPM, pour `coupparfait.mondomaine.fr` **et** pour
`coupparfait-api.mondomaine.fr` : onglet **Advanced**, coller ceci.

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

### 3. Vérifier

Sans attendre la prochaine mise à jour :

```bash
docker compose stop web
curl -sI https://coupparfait.mondomaine.fr | head -3   # attendu : HTTP/2 503
docker compose start web
```

---

## Les migrations

`--migrer` applique les migrations **avant** la bascule, sur un conteneur
jetable fabriqué à partir de la nouvelle image (`compose run --rm`). Les
migrations passent donc par le code qu'on s'apprête à déployer, jamais par
celui qui tourne encore.

Avant plutôt qu'après, et c'est le choix standard : pendant les quelques
secondes de bascule, c'est l'**ancien** code qui sert. Un schéma en avance ne le
gêne pas — à condition que les migrations soient **additives**. Ajouter une
colonne, une table, un index : sans danger. Renommer ou supprimer dans la même
livraison : l'ancien code casse pendant ces quelques secondes. La règle est
d'étaler sur deux livraisons — l'une qui ajoute, l'autre qui retire, une fois
que plus rien ne lit l'ancien nom.

Sur une base **déjà en service**, ne jamais rejouer la migration initiale : elle
crée les tables sans `IF NOT EXISTS`. Voir le README.

---

## Ce qui n'est pas résolu

**`server` coupe les parties en cours.** Les salons vivent en mémoire. Le
redémarrer déconnecte toutes les parties en direct, et aucun aménagement du
déploiement n'y changera quoi que ce soit : même en faisant coexister deux
conteneurs, un joueur qui rafraîchit sa page atterrirait sur le nouveau et ne
retrouverait pas son salon. Le vrai correctif est de persister l'état des salons
en base — un chantier à part entière.

En attendant, la conduite à tenir est simple : `--web-seul` par défaut, et ne
toucher à `server` que lorsque c'est lui qu'on a modifié, à une heure creuse.

**La coupure n'est pas nulle, seulement courte.** Deux à cinq secondes, derrière
une page qui se recharge seule. Pour descendre à zéro il faudrait faire tourner
deux conteneurs `web` en parallèle et basculer l'alias réseau de l'un à l'autre
— NPM le permet (il résout `coupparfait-web` par variable, avec
`resolver 127.0.0.11 valid=10s`, donc il suivrait un changement d'IP en dix
secondes), mais cela impose que deux versions du code tournent simultanément à
chaque livraison, et donc la discipline des migrations additives en permanence,
sans exception possible.
