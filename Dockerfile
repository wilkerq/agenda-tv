# Estágio 1: Instalação de dependências
FROM node:20 AS deps
# Instala o libc6-compat para compatibilidade com o Genkit/gRPC no Alpine
# RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copia os arquivos de definição de pacotes
COPY package.json ./
# O ideal é usar um lockfile (package-lock.json, yarn.lock, etc.) para builds consistentes
# COPY package-lock.json ./

# Instala as dependências
RUN npm install

# Estágio 2: Build da aplicação
FROM node:20 AS builder
WORKDIR /app
# Copia as dependências do estágio anterior
COPY --from=deps /app/node_modules ./node_modules
# Copia o restante do código da aplicação
COPY . .

# Executa o script de build do Next.js
RUN npm run build

# Estágio 3: Produção
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copia os artefatos de build do estágio "builder"
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# O Next.js por padrão inicia na porta 3000
EXPOSE 3000

# Comando para iniciar a aplicação
# O "next start" é otimizado para produção
CMD ["npm", "start"]
