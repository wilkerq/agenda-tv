# 1. Estágio de Dependências: Instala as dependências do projeto
FROM node:20-alpine AS deps
WORKDIR /app

# Copia package.json e package-lock.json
COPY package.json package-lock.json ./

# Instala apenas as dependências de produção
RUN npm install --omit=dev

# 2. Estágio de Build: Constrói a aplicação Next.js
FROM node:20-alpine AS builder
WORKDIR /app

# Copia as dependências do estágio anterior
COPY --from=deps /app/node_modules ./node_modules
# Copia o restante do código da aplicação
COPY . .

# Faz o build da aplicação
RUN npm run build

# 3. Estágio Final: Prepara a imagem de produção
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copia os artefatos de build do estágio anterior
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3050

CMD ["node", "server.js"]
