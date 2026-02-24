# ── Stage 1: Build dashboard ─────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json* ./

# Copy package manifests for both workspaces
COPY packages/server/package.json packages/server/
COPY packages/dashboard/package.json packages/dashboard/

# Install all dependencies (including dev for build)
RUN npm install --legacy-peer-deps

# Copy source
COPY packages/server/ packages/server/
COPY packages/dashboard/ packages/dashboard/

# Build dashboard (Vite)
RUN npm run build --workspace=packages/dashboard

# ── Stage 2: Production server ───────────────────────────────
FROM node:20-alpine AS production

LABEL org.opencontainers.image.source="https://github.com/enishoca/LobbyHA"
LABEL org.opencontainers.image.description="LobbyHA — Guest Dashboard for Home Assistant"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app

# Copy workspace root
COPY package.json package-lock.json* ./
COPY packages/server/package.json packages/server/

# Install production dependencies only
RUN npm install --workspace=packages/server --omit=dev --legacy-peer-deps && \
    npm cache clean --force

# Copy server source (runs via tsx at runtime)
COPY packages/server/ packages/server/

# Copy built dashboard from build stage
COPY --from=build /app/packages/dashboard/dist packages/dashboard/dist/

# Create data directory
RUN mkdir -p /data

# Runtime config
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/health || exit 1

CMD ["node", "--import", "tsx", "packages/server/src/server.ts"]
