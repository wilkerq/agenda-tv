# 1. Estágio de Dependências: Instala as dependências
FROM node:20 AS deps
WORKDIR /app

COPY package.json ./
RUN npm install

# 2. Estágio de Build: Constrói a aplicação
FROM node:20 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3. Estágio de Execução: Roda a aplicação
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copia os artefatos de build do Next.js
# Veja: https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# O servidor será iniciado em 0.0.0.0 para aceitar conexões de fora do contêiner.
# A porta padrão do Next.js é 3000.
EXPOSE 3000
CMD ["node", "server.js"]
