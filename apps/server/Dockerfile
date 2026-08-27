# ─────────────────────────────────────────────────────────────────────────────
#  Serveur Le Coup Parfait : Stockfish natif + temps réel
#
#  Stockfish est compilé depuis les sources plutôt qu'installé depuis le dépôt
#  de la distribution : on obtient ainsi la version 18 (les paquets Debian ont
#  souvent plusieurs versions de retard) et surtout un binaire optimisé pour le
#  jeu d'instructions de la machine de destination.
# ─────────────────────────────────────────────────────────────────────────────

# ── Étape 1 : compilation de Stockfish ───────────────────────────────────────
FROM debian:bookworm-slim AS stockfish

ARG STOCKFISH_TAG=sf_18
# `x86-64-avx2` fonctionne sur tout processeur postérieur à 2013 environ.
# Pour un serveur récent, `x86-64-bmi2` ou `x86-64-avx512` sont plus rapides ;
# pour un ARM (Raspberry Pi, Ampere), utiliser `armv8`.
ARG STOCKFISH_ARCH=x86-64-avx2

RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential git ca-certificates \
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
COPY --from=piper /opt/voices /app/voices
ENV PIPER_BIN=/opt/piper/piper
ENV PIPER_VOICES_DIR=/app/voices
ENV LD_LIBRARY_PATH=/opt/piper
ENV ESPEAK_DATA_PATH=/opt/piper/espeak-ng-data

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY packages/core ./packages/core
COPY packages/db ./packages/db
COPY apps/server ./apps/server

USER coupparfait

ENV NODE_ENV=production
ENV SERVER_PORT=3001
EXPOSE 3001

# `--experimental-strip-types` permet d'exécuter les fichiers `.ts` sans
# compilation préalable : moins d'étapes, moins de risques de décalage entre le
# code lu et le code exécuté.
CMD ["node", "--experimental-strip-types", "apps/server/src/index.ts"]
