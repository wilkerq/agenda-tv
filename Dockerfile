# Dockerfile

# 1. Base Image
FROM node:18-alpine AS base
WORKDIR /app

# 2. Build Stage
FROM base AS builder
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 3. Production Stage
FROM base AS production

# Adiciona a versão da aplicação como um label na imagem
LABEL org.opencontainers.image.version="0.1.0"
LABEL description="Agenda Alego - Sistema de gerenciamento de eventos da TV Assembleia Legislativa do Estado de Goiás."
LABEL author="Wilker Quirino"

COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Expose port and start server
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
