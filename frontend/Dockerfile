# ============================================================================
# Production Multi-Stage Dockerfile for Angular 22 + TailwindCSS v4
# ============================================================================

# Stage 1: Build the SPA with Node 24
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Hardened non-root Nginx web server
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

# Copy compiled browser bundle
COPY --from=builder /app/dist/frontend/browser ./
# Nginx's official entrypoint renders this runtime configuration before serving the SPA.
COPY glitchtip-config.template.js /etc/nginx/templates/glitchtip-config.js.template
ENV NGINX_ENVSUBST_OUTPUT_DIR=/tmp
# Copy Nginx configuration with gzip, rate limiting, and SPA routing
COPY nginx.conf /etc/nginx/nginx.conf

# Allow non-root execution on port 80
RUN apk add --no-cache libcap && \
    setcap 'cap_net_bind_service=+ep' /usr/sbin/nginx && \
    chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d

EXPOSE 80

USER nginx

CMD ["nginx", "-g", "daemon off;"]
