# 1. Fase de Instalação de Dependências
FROM node:18-alpine AS deps
WORKDIR /app

# Copia package.json e lockfiles
COPY package.json package-lock.json* ./

# Instala dependências de produção
RUN npm ci --only=production

# 2. Fase de Build do Projeto
FROM node:18-alpine AS builder
WORKDIR /app

# Copia dependências da fase anterior
COPY --from=deps /app/node_modules ./node_modules
# Copia todo o código-fonte
COPY . .

# Gera o build de produção otimizado
RUN npm run build

# 3. Fase Final de Produção
FROM node:18-alpine AS runner
WORKDIR /app

# Define o ambiente para produção
ENV NODE_ENV=production

# Copia os artefatos do build standalone
COPY --from=builder /app/.next/standalone ./
# Copia a pasta public para servir arquivos estáticos
COPY --from=builder /app/public ./public
# Copia a pasta de assets do Next.js
COPY --from=builder /app/.next/static ./.next/static

# Expõe a porta em que o app vai rodar
EXPOSE 3050

# Comando para iniciar o servidor Next.js
CMD ["node", "server.js"]
