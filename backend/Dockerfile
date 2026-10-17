# ============================================================================
# Multi-stage Dockerfile de Producción para NestJS 12
# ============================================================================

# Etapa 1: Dependencias para desarrollo y build
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Etapa 2: Compilación de TypeScript y poda de dependencias de desarrollo
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npm prune --omit=dev

# Etapa 3: Runtime de producción ultraligero y seguro (non-root user)
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Usuario no privilegiado para cumplimiento de seguridad
USER node

COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
