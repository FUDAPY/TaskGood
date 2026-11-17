# ==============================================================================
# Dockerfile - TaskGood (Dokploy Production Deployment)
# ZETTI DIGITAL PY - Arquitectura Full-Stack Monorepo (NestJS + Vite React)
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Compilación del Frontend (Vite + React)
# ------------------------------------------------------------------------------
FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci --no-audit

COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# 2. Compilación del Backend (NestJS + TypeScript)
# ------------------------------------------------------------------------------
FROM node:20-bookworm-slim AS backend-builder
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --no-audit

COPY backend/ ./
RUN npm run build
RUN npm prune --production

# ------------------------------------------------------------------------------
# 3. Contenedor de Ejecución (Puppeteer Headless + Google Chrome + NestJS Server)
# ------------------------------------------------------------------------------
FROM node:20-bookworm-slim AS runner

# Instalar dependencias necesarias para que Puppeteer (Chromium) corra en Docker sin UI
RUN apt-get update \
    && apt-get install -y wget gnupg ca-certificates \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Copiar artefactos compilados del frontend
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Copiar backend compilado y dependencias de producción
COPY --from=backend-builder /app/backend/dist /app/backend/dist
COPY --from=backend-builder /app/backend/node_modules /app/backend/node_modules
COPY --from=backend-builder /app/backend/package.json /app/backend/package.json

WORKDIR /app/backend

# Crear directorio persistente para credenciales de WhatsApp
RUN mkdir -p /app/backend/.wwebjs_auth /app/backend/.wwebjs_cache

EXPOSE 3000

CMD ["node", "dist/main"]
