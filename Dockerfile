# syntax=docker/dockerfile:1

# ---- Build stage: install everything and build the Node server -------------
FROM node:22-slim AS build
WORKDIR /app

# Install deps with the lockfile for reproducible builds.
COPY package.json package-lock.json ./
RUN npm ci

# Build the SvelteKit app (adapter-node → /app/build).
# DATABASE_URL is the one required env var; it's only *validated* at build time
# (the DB client is lazy and never connects during build), so a placeholder is
# enough. Real values are injected at runtime by docker-compose.
ENV DATABASE_URL=postgres://build:build@localhost:5432/build
COPY . .
RUN npm run build

# ---- Migrate stage: runs drizzle-kit migrations (has dev deps) -------------
# Used by the one-off `migrate` service in docker-compose. Keeps drizzle-kit,
# drizzle.config.ts and the drizzle/ SQL files available.
FROM build AS migrate
ENV NODE_ENV=production
CMD ["npm", "run", "db:migrate"]

# ---- Prune stage: strip dev dependencies for a lean runtime ----------------
FROM build AS prod-deps
RUN npm prune --omit=dev

# ---- Runtime stage: minimal image that just runs the server ----------------
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./package.json

EXPOSE 3000
USER node
CMD ["node", "build"]
