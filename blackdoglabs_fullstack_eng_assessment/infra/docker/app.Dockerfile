# infra/docker/app.Dockerfile
# Multi-stage Dockerfile for the Next.js Analytics Dashboard
# TODO: Complete this Dockerfile

# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY src/app/package*.json ./
# RUN npm ci

# =============================================================================
# Stage 2: Build
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY src/app/ .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
# RUN npm run build

# =============================================================================
# Stage 3: Production
# =============================================================================
# Option A: Node.js server (for SSR)
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets
# COPY --from=builder /app/public ./public
# COPY --from=builder /app/.next/standalone ./
# COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# CMD ["node", "server.js"]

# =============================================================================
# Option B: Static export with nginx (uncomment if using static export)
# =============================================================================
# FROM nginx:alpine AS static
# COPY --from=builder /app/out /usr/share/nginx/html
# COPY infra/docker/nginx.conf /etc/nginx/nginx.conf
# EXPOSE 80
# CMD ["nginx", "-g", "daemon off;"]

