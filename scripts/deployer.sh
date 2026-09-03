#!/usr/bin/env bash
#
# Mise à jour de la production, en réduisant la coupure au strict nécessaire.
#
#   ./scripts/deployer.sh              tout mettre à jour
#   ./scripts/deployer.sh --web-seul   ne toucher qu'à l'interface
#   ./scripts/deployer.sh --migrer     appliquer les migrations avant la bascule
#   ./scripts/deployer.sh --sans-git   ne pas récupérer le dépôt (code déjà à jour)
#   ./scripts/deployer.sh --etat       ne rien déployer, dire ce qui tourne
#
# ── Pourquoi ce script plutôt que la commande d'une ligne ────────────────────
#
# `docker compose up -d --build` fait la bonne chose, mais elle la fait en
# silence et sans distinguer ses deux moitiés :
#
#   1. la CONSTRUCTION, qui dure des minutes et pendant laquelle l'ancienne
#      version continue de servir — aucune coupure ;
#   2. la BASCULE, qui arrête l'ancien conteneur puis démarre le nouveau —
#      c'est là, et là seulement, que le site est indisponible.
#
# Les séparer ne rend pas la bascule plus rapide, mais elle permet de la
# déclencher au moment choisi, une fois l'image prête, plutôt que de découvrir
# au bout de six minutes de construction que le `git pull` n'avait rien ramené.
#
# ── Les garde-fous, et l'incident qui les a dictés ───────────────────────────
#
# Le 3 septembre 2026, la production a tourné une demi-heure sur du code que
# personne ne pouvait identifier. La construction avait réussi, la bascule non,
# et rien ne le disait : `up -d` s'était terminé sans un mot. Pire, la
# reconstruction avait fait disparaître du magasin l'image dont le conteneur
# était issu — `docker compose images` répondait `<none>`, `0B`, `N/A`.
#
# Trois vérifications en découlent, et le script échoue franchement sur chacune
# plutôt que de laisser croire à une réussite :
#
#   AVANT   l'arbre est-il propre ? Des modifications locales seraient cuites
#           dans l'image sans laisser de trace dans l'historique.
#   APRÈS   le conteneur porte-t-il bien la révision qu'on vient de déployer ?
#           C'est la question à laquelle on ne savait pas répondre. Chaque image
#           grave son commit dans une étiquette, et on la relit sur le conteneur.
#   APRÈS   le site répond-il vraiment, vu de dehors ? La sonde de santé
#           n'interroge que l'intérieur du conteneur ; elle ne dit rien du
#           chemin qui y mène.
#
# ── Ce que ce script ne résout pas ──────────────────────────────────────────
#
# Le service `server` héberge les parties en direct EN MÉMOIRE. Le redémarrer
# coupe toutes les parties en cours, et aucune ruse de déploiement n'y change
# quoi que ce soit — il faudrait persister l'état des salons en base. D'où
# `--web-seul` : la grande majorité des livraisons ne touchent qu'à
# l'interface, et n'ont aucune raison d'interrompre qui que ce soit.
#
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f docker-compose.yml ]]; then
  echo "✗ docker-compose.yml introuvable — ce script s'exécute depuis le dépôt." >&2
  exit 1
fi

WEB_SEUL=0
MIGRER=0
SANS_GIT=0
ETAT_SEUL=0
ARBRE_SALE=0

for arg in "$@"; do
  case "$arg" in
    --web-seul) WEB_SEUL=1 ;;
    --migrer) MIGRER=1 ;;
    --sans-git) SANS_GIT=1 ;;
    --etat) ETAT_SEUL=1 ;;
    --arbre-sale) ARBRE_SALE=1 ;;
    -h | --help)
      sed -n '2,10p' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *)
      echo "✗ option inconnue : $arg" >&2
      exit 1
      ;;
  esac
done

if [[ $WEB_SEUL -eq 1 ]]; then
  SERVICES=(web)
else
  SERVICES=(web server)
fi

ETIQUETTE='{{index .Config.Labels "org.opencontainers.image.revision"}}'

titre() { printf '\n\033[1m%s\033[0m\n' "$1"; }
echec() {
  printf '\n\033[1;31m✗ %s\033[0m\n' "$1" >&2
  shift
  # Par `sed` et non par `printf '  %s'` : certains arguments sont eux-mêmes
  # multilignes (une sortie de `git status`), et seule leur première ligne
  # serait alors indentée.
  for ligne in "$@"; do printf '%s\n' "$ligne" | sed 's/^/  /' >&2; done
  exit 1
}

# ── Ce qui tourne réellement ────────────────────────────────────────────────
#
# La seule réponse fiable à « qu'est-ce qui tourne ? ». Pas l'empreinte de
# l'image — elle dit « c'est bien la dernière construite », jamais « c'est bien
# le commit que je crois », et elle disparaît à la reconstruction suivante.

revision_du_conteneur() {
  local conteneur
  # `|| true` : sous `set -e`, un démon Docker injoignable ferait sortir le
  # script d'ici — au lieu de quoi on veut qu'il le rapporte.
  conteneur="$(docker compose ps -q "$1" 2>/dev/null || true)"
  [[ -z "$conteneur" ]] && {
    echo "conteneur-absent"
    return
  }
  docker inspect --format "$ETIQUETTE" "$conteneur" 2>/dev/null || echo "illisible"
}

etat() {
  local svc rev
  for svc in "${SERVICES[@]}"; do
    rev="$(revision_du_conteneur "$svc")"
    case "$rev" in
      conteneur-absent) printf '  %-8s aucun conteneur\n' "$svc" ;;
      '' | inconnue | illisible)
        printf '  %-8s révision inconnue — image antérieure aux étiquettes\n' "$svc"
        ;;
      *) printf '  %-8s %s\n' "$svc" "${rev:0:12}" ;;
    esac
  done
}

if [[ $ETAT_SEUL -eq 1 ]]; then
  titre "Ce qui tourne"
  etat
  printf '\n  dépôt    %s  %s\n' "$(git rev-parse --short HEAD)" "$(git log -1 --format=%s)"
  exit 0
fi

# ── 1. Récupérer le code, et vérifier que c'est vrai ─────────────────────────

titre "1/5  Dépôt"

if [[ $SANS_GIT -eq 1 ]]; then
  echo "     (--sans-git) récupération ignorée"
else
  AVANT="$(git rev-parse HEAD)"
  git pull --ff-only
  APRES="$(git rev-parse HEAD)"

  if [[ "$AVANT" == "$APRES" ]]; then
    # Ce n'est pas forcément une erreur — on peut redéployer volontairement la
    # même révision — mais c'est le symptôme numéro un d'un déploiement qui
    # semble réussir sans rien déployer. On le dit, et on continue.
    echo "     ⚠ rien de nouveau : le dépôt est déjà sur $(git rev-parse --short HEAD)"
    echo "       Si tu attendais une nouveauté : la branche est-elle poussée ?"
    echo "       la clé de déploiement répond-elle ? (ssh -T git@github-coupparfait)"
  fi
fi

# GARDE-FOU — un arbre sale produit une image dont l'étiquette ment : elle
# annonce un commit, elle contient autre chose. Et cette différence-là ne se
# retrouve plus jamais, puisqu'elle n'est nulle part dans l'historique.
if [[ -n "$(git status --porcelain)" ]]; then
  if [[ $ARBRE_SALE -eq 1 ]]; then
    echo "     ⚠ (--arbre-sale) modifications locales embarquées dans l'image :"
    git status --short | sed 's/^/       /'
  else
    echec "Le dépôt a des modifications locales." \
      "L'image porterait l'étiquette $(git rev-parse --short HEAD) sans en" \
      "contenir le code — et l'écart ne serait retrouvable nulle part." \
      "" \
      "$(git status --short)" \
      "" \
      "Commiter, ou remiser (git stash), ou assumer avec --arbre-sale."
  fi
fi

GIT_REVISION="$(git rev-parse HEAD)"
export GIT_REVISION

echo "     révision à déployer : $(git log --oneline -1)"

titre "     Avant la bascule, tournent :"
etat

# ── 2. Construire — l'ancienne version sert toujours pendant ce temps ────────

titre "2/5  Construction (aucune coupure — l'ancienne version continue de servir)"

docker compose build "${SERVICES[@]}"

# ── 3. Migrations, avant la bascule ──────────────────────────────────────────
#
# Avant plutôt qu'après, et c'est le choix standard : pendant les quelques
# secondes de bascule, c'est l'ANCIEN code qui tourne. Un schéma en avance ne
# le gêne pas tant que les migrations sont additives — ajouter une colonne,
# jamais renommer ni supprimer dans la même livraison. Un schéma en retard,
# lui, casse tout de suite le nouveau code.
#
# `run --rm` fabrique un conteneur jetable sur la nouvelle image : les
# migrations passent donc par le code qu'on s'apprête à déployer, et non par
# celui qui tourne encore.

if [[ $MIGRER -eq 1 ]]; then
  titre "3/5  Migrations"
  docker compose run --rm --no-deps web node scripts/migrate.mjs
else
  titre "3/5  Migrations — ignorées (ajouter --migrer si la livraison en contient)"
fi

# ── 4. Bascule ───────────────────────────────────────────────────────────────
#
# `--no-build` : l'image est déjà prête, on ne veut surtout pas que Compose
# reparte pour un tour de construction ici.
#
# `--wait` : rend la main quand les conteneurs sont sains, pas quand ils sont
# lancés. Sans lui le script se termine pendant que Next démarre encore, et
# annonce une réussite qu'il n'a pas vérifiée.

titre "4/5  Bascule"

# À partir d'ici, un échec laisse la production dans un état intermédiaire :
# le message de sortie doit le dire, sans quoi on croira que rien n'a bougé.
BASCULE_ENGAGEE=1
trap '[[ $? -ne 0 && ${BASCULE_ENGAGEE:-0} -eq 1 ]] && printf "\n\033[1;31m  La bascule a échoué EN COURS — la production est dans un état intermédiaire.\n  Vérifier : ./scripts/deployer.sh --etat\033[0m\n" >&2' EXIT

docker compose up -d --no-build --wait --wait-timeout 180 "${SERVICES[@]}"

# ── 5. Vérifications ─────────────────────────────────────────────────────────

titre "5/5  Vérifications"

# GARDE-FOU — le conteneur porte-t-il la révision qu'on vient de construire ?
#
# C'est la question à laquelle on ne savait pas répondre. Une image peut être
# construite sans que le conteneur suive : `up -d` se termine alors sans un
# mot, et le site continue de servir l'ancienne version.

for svc in "${SERVICES[@]}"; do
  rev="$(revision_du_conteneur "$svc")"
  if [[ "$rev" != "$GIT_REVISION" ]]; then
    echec "Le conteneur « $svc » ne porte pas la révision déployée." \
      "attendu : $GIT_REVISION" \
      "trouvé  : ${rev:-<vide>}" \
      "" \
      "L'image a été construite mais le conteneur n'a pas été remplacé." \
      "Forcer :  docker compose up -d --force-recreate --no-build --wait $svc"
  fi
  printf '     ✓ %-8s porte %s\n' "$svc" "${rev:0:12}"
done

# GARDE-FOU — le site répond-il vu de dehors ?
#
# La sonde de santé n'interroge que l'intérieur du conteneur, sur sa boucle
# locale. Elle ne dit rien du chemin qui y mène : le proxy peut viser une
# ancienne adresse, un certificat peut avoir expiré, le conteneur peut ne plus
# être branché sur la façade. Une requête publique traverse toute la chaîne.

URL="$(sed -n 's/^NEXT_PUBLIC_APP_URL=//p' .env 2>/dev/null | head -1 | tr -d '"'"'"'[:space:]')"

if [[ -z "$URL" ]]; then
  echo "     · NEXT_PUBLIC_APP_URL absente de .env — vérification publique ignorée"
else
  CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$URL" || echo 000)"
  case "$CODE" in
    200 | 30[0-8])
      printf '     ✓ %s répond %s\n' "$URL" "$CODE"
      ;;
    503)
      echec "$URL répond 503 — c'est la page d'attente." \
        "Le proxy ne joint pas le conteneur alors que celui-ci est sain." \
        "Piste : le conteneur est-il bien sur le réseau « web-coupparfait » ?"
      ;;
    *)
      echec "$URL répond $CODE." \
        "Le conteneur est sain mais la chaîne publique ne l'est pas." \
        "Piste : Nginx Proxy Manager, certificat, réseau de façade."
      ;;
  esac
fi

BASCULE_ENGAGEE=0

titre "Résultat"
docker compose ps --format 'table {{.Service}}\t{{.Status}}' "${SERVICES[@]}"

if [[ $WEB_SEUL -eq 1 ]]; then
  printf '\n     `server` n%s a pas été touché : les parties en cours continuent.\n' "'"
fi
