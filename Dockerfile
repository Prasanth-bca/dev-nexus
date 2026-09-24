# Dev Nexus — multi-stage Dockerfile for production standalone build
# Build: docker build -t dev-nexus .
# Run:   docker run -p 3000:3000 --env-file .env.local -e MONGODB_URI=... dev-nexus

# Use Debian-based slim image for glibc (required by onnxruntime-node / transformers.js)
# ---- Base stage: shared dependencies ----
FROM node:20-slim AS base
WORKDIR /app

# ---- Deps stage: install npm dependencies ----
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# ---- Builder stage: build the Next.js application ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build produces .next/standalone with server.js and traced dependencies
RUN npm run build

# ---- Runner stage: minimal production image ----
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Install wget (for healthcheck) and ONNX runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends wget && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user and writable directories for var/
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /data/var/file-vault /data/var/avatars /data/var/temp /data/var/logs /data/var/exports /data/var/backups && \
    chown -R nextjs:nodejs /data/var

# Copy standalone output (includes node_modules, server.js, .next/ required chunks)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Copy static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Copy public assets
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Copy ONNX runtime native binaries (not included in standalone by default)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/onnxruntime-node ./node_modules/onnxruntime-node

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]