#!/usr/bin/env bash
#
# Mise à jour de la production, en réduisant la coupure au strict nécessaire.
#
#   ./scripts/deployer.sh              tout mettre à jour
#   ./scripts/deployer.sh --web-seul   ne toucher qu'à l'interface
#   ./scripts/deployer.sh --migrer     appliquer les migrations avant la bascule
#   ./scripts/deployer.sh --sans-git   ne pas récupérer le dépôt (code déjà à jour)
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
# Car c'est le piège de la commande d'une ligne : si `git pull` ne rapporte
# rien — clé de déploiement expirée, branche pas encore poussée —, `up -d`
# constate que les images n'ont pas changé, ne recrée aucun conteneur, et se
# termine sans un mot. Rien ne distingue « déployé » de « rien fait ». Ce
# script compare la révision avant et après, et le dit.
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

for arg in "$@"; do
  case "$arg" in
    --web-seul) WEB_SEUL=1 ;;
    --migrer) MIGRER=1 ;;
    --sans-git) SANS_GIT=1 ;;
    -h | --help)
      sed -n '2,8p' "$0" | sed 's/^# \?//'
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

titre() { printf '\n\033[1m%s\033[0m\n' "$1"; }

# ── 1. Récupérer le code, et vérifier que c'est vrai ─────────────────────────

titre "1/4  Dépôt"

if [[ $SANS_GIT -eq 1 ]]; then
  echo "     (--sans-git) récupération ignorée"
  AVANT=""
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

echo "     révision à déployer : $(git log --oneline -1)"

# ── 2. Construire — l'ancienne version sert toujours pendant ce temps ────────

titre "2/4  Construction (aucune coupure — l'ancienne version continue de servir)"

docker compose build "${SERVICES[@]}"

# ── 3. Migrations, avant la bascule ──────────────────────────────────────────
#
# Avant plutôt qu'après, et c'est le choix standard : pendant les quelques
# secondes de bascule, c'est l'ANCIEN code qui tourne. Un schéma en avance
# ne le gêne pas tant que les migrations sont additives — ajouter une colonne,
# jamais renommer ni supprimer dans la même livraison. Un schéma en retard,
# lui, casse tout de suite le nouveau code.
#
# `run --rm` fabrique un conteneur jetable sur la nouvelle image : les
# migrations passent donc par le code qu'on s'apprête à déployer, et non par
# celui qui tourne encore.

if [[ $MIGRER -eq 1 ]]; then
  titre "3/4  Migrations"
  docker compose run --rm --no-deps web node scripts/migrate.mjs
else
  titre "3/4  Migrations — ignorées (ajouter --migrer si la livraison en contient)"
fi

# ── 4. Bascule ───────────────────────────────────────────────────────────────
#
# `--no-build` : l'image est déjà prête, on ne veut surtout pas que Compose
# reparte pour un tour de construction ici.
#
# `--wait` : rend la main quand les conteneurs sont sains, pas quand ils sont
# lancés. Sans lui le script se termine pendant que Next démarre encore, et
# annonce une réussite qu'il n'a pas vérifiée. Avec lui, un conteneur qui
# refuse de démarrer fait échouer le script — ce qu'on veut.

titre "4/4  Bascule"

AVANT_IDS="$(docker compose ps -q "${SERVICES[@]}" | sort)"

docker compose up -d --no-build --wait --wait-timeout 180 "${SERVICES[@]}"

APRES_IDS="$(docker compose ps -q "${SERVICES[@]}" | sort)"

# ── Vérification ─────────────────────────────────────────────────────────────
#
# Un conteneur dont l'identifiant n'a pas changé n'a PAS été recréé : il porte
# encore l'ancien code. C'est exactement le cas que la commande d'une ligne
# passe sous silence.

titre "Résultat"

if [[ "$AVANT_IDS" == "$APRES_IDS" ]]; then
  echo "     ⚠ aucun conteneur recréé — la production tourne toujours sur l'ancien code."
  echo "       Attendu si tu redéployais la même révision ; suspect sinon."
else
  echo "     conteneurs recréés :"
fi

docker compose ps --format 'table {{.Service}}\t{{.Status}}' "${SERVICES[@]}"

if [[ $WEB_SEUL -eq 1 ]]; then
  printf '\n     `server` n%s a pas été touché : les parties en cours continuent.\n' "'"
fi
