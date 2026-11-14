# ============================================================================
# Multi-stage Dockerfile de Producción para Notification-Service (NestJS 12)
# ============================================================================

# Etapa 1: Dependencias
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Etapa 2: Compilación de TypeScript
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npm prune --omit=dev

# Etapa 3: Runtime de producción ultraligero y seguro (non-root)
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3005

USER node

COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist

EXPOSE 3005

HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=3 CMD node -e "fetch('http://127.0.0.1:3005/api/notifications/health/liveness').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/src/main.js"]
