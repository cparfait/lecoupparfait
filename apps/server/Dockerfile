# ─────────────────────────────────────────────────────────────────────────────
#  Serveur Le Coup Parfait : Stockfish natif + temps réel
#
#  Stockfish est compilé depuis les sources plutôt qu'installé depuis le dépôt
#  de la distribution : on obtient ainsi la version 19 (les paquets Debian ont
#  souvent plusieurs versions de retard) et surtout un binaire optimisé pour le
#  jeu d'instructions de la machine de destination.
# ─────────────────────────────────────────────────────────────────────────────

# ── Étape 1 : compilation de Stockfish ───────────────────────────────────────
FROM debian:bookworm-slim AS stockfish

ARG STOCKFISH_TAG=sf_19
# `x86-64-avx2` fonctionne sur tout processeur postérieur à 2013 environ.
# Pour un serveur récent, `x86-64-bmi2` ou `x86-64-avx512` sont plus rapides ;
# pour un ARM (Raspberry Pi, Ampere), utiliser `armv8`.
#
# Stockfish 19 ajoute `x86-64-universal`, qui compile tous les chemins de code
# et reconnaît le processeur au démarrage. On ne l'utilise **pas** ici, et ce
# n'est pas un oubli : `profile-build` rejoue `./stockfish bench` pour chaque
# sous-architecture afin d'en relever le profil, `avx512icl` comprise. Un
# constructeur sans AVX-512 s'arrête alors sur une instruction illégale — c'est
# pourquoi l'amont documente cette cible avec un `RUN_PREFIX` pointant sur
# l'émulateur Intel SDE. Échanger les 10 % certains de la compilation guidée
# contre une sélection à l'exécution dont cette image n'a pas besoin, au prix
# d'un émulateur dans l'étape de construction, serait un mauvais marché : le
# binaire est compilé pour la machine où il tournera, pas pour être distribué.
#
# C'est l'inverse pour `scripts/install-stockfish.mjs`, qui télécharge un
# binaire publié sans savoir sur quoi il atterrira : lui prend l'universel.
ARG STOCKFISH_ARCH=x86-64-avx2

# `curl` n'est pas un confort : la cible `net` du Makefile de Stockfish
# télécharge les réseaux NNUE, et elle refuse de démarrer sans `curl` ni `wget`
# — « Neither wget or curl is installed », puis « Error 1 » sans autre
# explication. `debian:bookworm-slim` ne fournit ni l'un ni l'autre, et l'oubli
# restait invisible tant qu'on ne construisait pas sur une machine neuve.
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential git ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
RUN git clone --depth 1 --branch ${STOCKFISH_TAG} \
      https://github.com/official-stockfish/Stockfish.git .

WORKDIR /build/src
# `net` télécharge le réseau de neurones NNUE, indispensable à la force du
# moteur. `profile-build` fait une compilation guidée par le profil : environ
# 10 % de vitesse en plus pour quelques minutes de compilation en plus.
RUN make -j"$(nproc)" net \
    && make -j"$(nproc)" profile-build ARCH=${STOCKFISH_ARCH} \
    && strip stockfish \
    && ./stockfish bench 2>&1 | tail -4

# ── Étape 1 bis : voix neuronale Piper ───────────────────────────────────────
#
#  Piper (MIT) synthétise une voix française de qualité neuronale, localement et
#  hors ligne. C'est ce qui distingue un coach qu'on écoute pendant une heure
#  d'une voix robotique qu'on coupe au bout de deux minutes.
#
#  Entièrement facultatif : sans cette étape, l'application retombe sur la
#  synthèse du navigateur, et rien d'autre ne change. Pour s'en passer,
#  construire avec `--build-arg PIPER_VOICES=""`.
FROM debian:bookworm-slim AS piper

ARG PIPER_VERSION=2023.11.14-2
ARG PIPER_PLATFORM=linux_x86_64
# Voix installées, séparées par des espaces. `siwis` (féminine) et `tom`
# (masculine) sont les deux meilleures voix françaises du catalogue ; `alba`
# assure la version anglaise. Toutes sont sous licence libre.
ARG PIPER_VOICES="fr/fr_FR/siwis/medium/fr_FR-siwis-medium fr/fr_FR/tom/medium/fr_FR-tom-medium en/en_GB/alba/medium/en_GB-alba-medium"

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt
RUN curl -fsSL -o piper.tar.gz \
      "https://github.com/rhasspy/piper/releases/download/${PIPER_VERSION}/piper_${PIPER_PLATFORM}.tar.gz" \
    && tar -xzf piper.tar.gz \
    && rm piper.tar.gz

# Chaque voix est un couple `.onnx` (le modèle) et `.onnx.json` (sa
# configuration : fréquence d'échantillonnage, phonèmes, langue).
RUN mkdir -p /opt/voices \
    && for voice in ${PIPER_VOICES}; do \
         name="$(basename "${voice}")"; \
         base="https://huggingface.co/rhasspy/piper-voices/resolve/main/${voice}"; \
         curl -fsSL -o "/opt/voices/${name}.onnx"      "${base}.onnx?download=true"; \
         curl -fsSL -o "/opt/voices/${name}.onnx.json" "${base}.onnx.json?download=true"; \
       done \
    && ls -lh /opt/voices

# ── Étape 1 ter : Lc0 et les poids Maia ──────────────────────────────────────
#
# Maia fait jouer l'ordinateur comme un humain de tel niveau, au lieu d'un
# Stockfish bridé qui joue parfaitement puis bâcle un coup au hasard.
#
# Lc0 ne publie aucun binaire Linux et Debian ne le paquetage pas : on le
# compile, comme Stockfish plus haut. La variante Eigen suffit — on fait tourner
# le réseau **sans recherche**, un seul nœud par coup, ce qui coûte moins qu'une
# analyse et rend tout accélérateur inutile.

FROM debian:bookworm-slim AS lc0

ARG LC0_TAG=v0.32.1
# Neuf paliers de cent en cent, environ 1,3 Mo chacun.
ARG MAIA_RATINGS="1100 1200 1300 1400 1500 1600 1700 1800 1900"

RUN apt-get update && apt-get install -y --no-install-recommends       ca-certificates curl git g++ meson ninja-build       libeigen3-dev zlib1g-dev python3 pkg-config     && rm -rf /var/lib/apt/lists/*

WORKDIR /build
RUN git clone --depth 1 --branch ${LC0_TAG} --recurse-submodules       https://github.com/LeelaChessZero/lc0.git .

# `-Ddnnl=false -Dblas=true` : on s'en tient à Eigen, sans bibliothèque
# propriétaire ni dépendance graphique.
RUN meson setup build --buildtype=release -Ddnnl=false -Dgtest=false     && ninja -C build lc0     && strip build/lc0     && ./build/lc0 --version

RUN mkdir -p /opt/maia     && for elo in ${MAIA_RATINGS}; do          curl -fsSL -o "/opt/maia/maia-${elo}.pb.gz"            "https://github.com/CSSLab/maia-chess/raw/master/maia_weights/maia-${elo}.pb.gz";        done     && ls -lh /opt/maia

# ── Étape 2 : dépendances Node ───────────────────────────────────────────────
FROM node:22-bookworm-slim AS deps

WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/

# `--omit=dev` : le serveur exécute du TypeScript directement grâce à
# l'effacement de types natif de Node 22, aucun compilateur n'est nécessaire.
RUN npm ci --omit=dev --ignore-scripts

# ── Étape 3 : image finale ───────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --create-home --uid 10001 coupparfait

COPY --from=stockfish /build/src/stockfish /usr/local/bin/stockfish
COPY --from=stockfish /build/Copying.txt /usr/share/doc/stockfish/COPYING.txt

# Piper apporte ses propres bibliothèques (onnxruntime, espeak-ng) : on garde
# l'arborescence telle quelle et on pointe l'éditeur de liens dessus, plutôt
# que d'éparpiller les fichiers dans /usr/local/lib.
COPY --from=piper /opt/piper /opt/piper
COPY --from=lc0 /build/build/lc0 /usr/local/bin/lc0
COPY --from=lc0 /opt/maia /opt/maia
COPY --from=piper /opt/voices /app/voices
ENV PIPER_BIN=/opt/piper/piper
ENV PIPER_VOICES_DIR=/app/voices
ENV LD_LIBRARY_PATH=/opt/piper
ENV ESPEAK_DATA_PATH=/opt/piper/espeak-ng-data

# Maia : le binaire compilé à l'étape précédente, et ses poids.
ENV LC0_PATH=/usr/local/bin/lc0
ENV MAIA_PATH=/opt/maia

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY packages/core ./packages/core
COPY packages/db ./packages/db
COPY apps/server ./apps/server

USER coupparfait

# La révision qui a produit cette image — voir la note détaillée dans
# `apps/web/Dockerfile`. En deux mots : l'empreinte d'une image dit « c'est la
# dernière construite », jamais « c'est le commit que je crois ».
ARG GIT_REVISION=inconnue
LABEL org.opencontainers.image.revision=$GIT_REVISION
LABEL org.opencontainers.image.title="Le Coup Parfait — serveur"

ENV NODE_ENV=production
ENV SERVER_PORT=3001
EXPOSE 3001

# `--experimental-strip-types` permet d'exécuter les fichiers `.ts` sans
# compilation préalable : moins d'étapes, moins de risques de décalage entre le
# code lu et le code exécuté.
CMD ["node", "--experimental-strip-types", "apps/server/src/index.ts"]
