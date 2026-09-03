# ─────────────────────────────────────────────────────────────────────────────
#  Interface web Le Coup Parfait (Next.js)
#
#  Construction en trois étapes pour que l'image finale ne contienne ni le code
#  source, ni les dépendances de développement, ni le cache de construction.
# ─────────────────────────────────────────────────────────────────────────────

# ── Étape 1 : dépendances ────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS deps

WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/

RUN npm ci --ignore-scripts

# ── Étape 2 : construction ───────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prépare les ressources qui ne sont pas versionnées : le moteur WebAssembly
# (14 Mo copiés depuis node_modules) et l'index des ouvertures.
#
# `build-icons.mjs` n'est pas de la partie, et ne devrait jamais l'avoir été.
# Il compose la marque à partir de `brand/cavale-club.png`, le tirage pleine
# résolution de la sculpture — une source de travail, sortie du dépôt le jour
# où l'on a cessé d'embarquer 12 Mo de PNG dans chaque image. La construction
# s'arrêtait donc sur « Input file is missing ». Or ce qu'il produit — favicon,
# icônes 192 et 512, insigne des notifications, image de partage — est
# versionné : il n'y avait rien à régénérer ici. C'est un script d'atelier,
# comme `build-cavale.mjs` et `build-brand.mjs` : on le lance à la main quand
# la marque change, et l'on verse le résultat.
RUN node scripts/setup-engine.mjs \
    && node scripts/build-openings.mjs

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# L'adresse publique du serveur de parties, et il la faut ICI.
#
# `NEXT_PUBLIC_SERVER_URL` est lue par du code qui tourne dans le navigateur —
# `useLiveGame`, qui ouvre le socket. Next remplace ces références par leur
# valeur **au moment du `next build`** et la grave dans le lot JavaScript
# envoyé au client ; la déclarer dans l'environnement du conteneur, comme le
# fait `docker-compose.yml`, n'atteint que le rendu serveur.
#
# Sans elle, le client se rabattait sur `<protocole>//<hôte>:3001` : un port
# que la pile ne publie volontairement pas, et qui n'est donc joignable de
# nulle part. Les parties en direct affichaient « Serveur de parties
# injoignable » en production, alors que le conteneur `server` était sain — il
# n'a jamais reçu la moindre connexion.
#
# Conséquence assumée : l'image web est propre à un domaine. Changer l'adresse
# du temps réel demande une reconstruction, pas un redémarrage.
ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}

# Refus franc plutôt qu'une image silencieusement cassée : l'oubli ne se voit
# pas à la construction, ne se voit pas au démarrage, et ne se voit qu'au
# moment où quelqu'un essaie de jouer.
RUN test -n "$NEXT_PUBLIC_SERVER_URL" || { \
      echo "✗ NEXT_PUBLIC_SERVER_URL est vide." >&2; \
      echo "  Cette adresse est gravée dans le lot du navigateur : sans elle," >&2; \
      echo "  les parties en direct ne se connecteront à rien." >&2; \
      echo "  La renseigner dans .env — l'adresse PUBLIQUE du temps réel," >&2; \
      echo "  p. ex. https://coupparfait-api.mondomaine.fr — puis reconstruire." >&2; \
      exit 1; \
    }

RUN npm run build -w @coupparfait/web

# ── Étape 3 : exécution ──────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --create-home --uid 10001 coupparfait

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# La sortie « standalone » de Next embarque uniquement les modules réellement
# utilisés : quelques dizaines de mégaoctets au lieu de plusieurs centaines.
COPY --from=builder --chown=coupparfait:coupparfait /app/apps/web/.next/standalone ./
COPY --from=builder --chown=coupparfait:coupparfait /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=coupparfait:coupparfait /app/apps/web/public ./apps/web/public

# Les scripts d'import de données restent disponibles dans le conteneur :
#   docker compose exec web node scripts/import-openings.mjs
COPY --from=builder --chown=coupparfait:coupparfait /app/scripts ./scripts
COPY --from=builder --chown=coupparfait:coupparfait /app/data/openings ./data/openings
COPY --from=builder --chown=coupparfait:coupparfait /app/packages ./packages

# Les deux modules dont ces scripts ont besoin.
#
# La sortie « standalone » de Next ne contient que ce que l'*application* trace,
# rangé pour être résolu depuis `apps/web/server.js`. Les scripts, eux, vivent
# dans `/app/scripts` et n'ont donc rien à leur disposition : la première mise
# en production s'est arrêtée sur « Cannot find package 'drizzle-orm' imported
# from /app/scripts/migrate.mjs », c'est-à-dire avant même de créer le schéma.
#
# On copie les deux paquets plutôt que tout `node_modules`, ce qui ruinerait
# l'intérêt du standalone. Ils n'ont aucune dépendance à leur tour — vérifié —
# donc deux dossiers suffisent.
#
# Après la copie du standalone, jamais avant : celle-ci écrase `node_modules`.
COPY --from=deps --chown=coupparfait:coupparfait /app/node_modules/postgres ./node_modules/postgres
COPY --from=deps --chown=coupparfait:coupparfait /app/node_modules/drizzle-orm ./node_modules/drizzle-orm

USER coupparfait

# La révision qui a produit cette image, gravée dedans.
#
# Sans elle, la seule façon de savoir ce qui tourne en production est de
# comparer l'empreinte du conteneur à celle de l'image étiquetée — ce qui dit
# « c'est bien la dernière construite », jamais « c'est bien le commit que je
# crois ». Une image reconstruite fait disparaître la précédente du magasin, et
# le conteneur qui en est issu devient alors littéralement inidentifiable :
# `docker compose images` répond `<none>`, `0B`, `N/A`.
#
# C'est arrivé le 3 septembre 2026, et la question « qu'est-ce qui tourne ? »
# est restée sans réponse une bonne demi-heure. Avec cette étiquette elle se
# résout en une commande, y compris sur une image que plus rien n'étiquette :
#
#   docker inspect coupparfait-web-1 \
#     --format '{{index .Config.Labels "org.opencontainers.image.revision"}}'
#
# `ARG` ici et non plus haut : une variable de construction n'existe que dans
# l'étape qui la déclare. La valeur par défaut permet un `docker build` à la
# main sans rien passer — c'est `scripts/deployer.sh` qui la renseigne.
ARG GIT_REVISION=inconnue
LABEL org.opencontainers.image.revision=$GIT_REVISION
LABEL org.opencontainers.image.title="Le Coup Parfait — web"

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
