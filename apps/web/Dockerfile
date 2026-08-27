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
RUN node scripts/setup-engine.mjs \
    && node scripts/build-openings.mjs \
    && node scripts/build-icons.mjs

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
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

USER coupparfait

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
