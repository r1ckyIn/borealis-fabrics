# ============================================================
# Stage 1: Builder
# Build NestJS application and generate Prisma client
# ============================================================
FROM node:22-slim AS builder

# Install openssl (required by Prisma) and ca-certificates
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Enable corepack for pnpm
RUN corepack enable

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy Prisma schema and generate client
COPY prisma/ ./prisma/
RUN npx prisma generate

# Copy source code and build
COPY . .
RUN pnpm build

# ============================================================
# Stage 2: Production
# Minimal runtime image with only production artifacts
# ============================================================
FROM node:22-slim AS production

# Install openssl (required by Prisma at runtime)
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Enable corepack for pnpm
RUN corepack enable

ENV NODE_ENV=production

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Create uploads directory for local storage fallback
RUN mkdir -p /app/uploads

# Expose NestJS port
EXPOSE 3000

# Health check using /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => {if(!r.ok) throw 1}).catch(() => process.exit(1))"

# Run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs && \
    chown -R nestjs:nodejs /app
USER nestjs

CMD ["node", "dist/main.js"]
