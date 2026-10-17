# ============================================================================
# Multi-stage Dockerfile de Producción para Angular 21 + TailwindCSS v4
# ============================================================================

# Etapa 1: Compilación de la SPA con Node 24
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Etapa 2: Servidor Web Nginx de alto rendimiento
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

# Copiar artefactos compilados del browser
COPY --from=builder /app/dist/frontend/browser ./
# Copiar configuración Nginx con gzip, rate limiting y SPA routing
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
