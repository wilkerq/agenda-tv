# 1. Instalação de dependências
FROM node:20-alpine AS deps
WORKDIR /app

# Copia o package.json e o package-lock.json
COPY package.json ./
COPY package-lock.json ./

# Instala as dependências de produção
RUN npm install

# 2. Build da aplicação
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Roda o script de build do Next.js
RUN npm run build

# 3. Imagem final de produção
FROM node:20-alpine AS runner
WORKDIR /app

# Define o ambiente para produção
ENV NODE_ENV=production

# Copia os artefatos da etapa de build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3050

ENV PORT 3050

# Inicia o servidor Next.js
CMD ["node", "server.js"]
