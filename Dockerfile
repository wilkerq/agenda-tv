# 1. Etapa de Instalação de Dependências
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
# Usa 'npm install' para resolver inconsistências no lock file
RUN npm install --only=production

# 2. Etapa de Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3. Etapa de Produção
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3050

ENV PORT 3050

# Inicia o servidor Next.js
CMD ["node", "server.js"]
