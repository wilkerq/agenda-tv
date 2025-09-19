# 1. Instalar dependências
FROM node:18-alpine AS deps
WORKDIR /app

# Copia package.json e package-lock.json (se existir)
COPY package.json ./
COPY package-lock.json* ./

# Instala as dependências
RUN npm install

# 2. Build da Aplicação
FROM node:18-alpine AS builder
WORKDIR /app

# Copia as dependências instaladas
COPY --from=deps /app/node_modules ./node_modules

# Copia o restante do código da aplicação
COPY . .

# Executa o build da aplicação
RUN npm run build

# 3. Imagem Final de Execução
FROM node:18-alpine AS runner
WORKDIR /app

# Define o ambiente como produção
ENV NODE_ENV=production

# Adiciona um usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia os artefatos de build necessários da etapa 'builder'
# A pasta 'public' não é usada neste projeto, então sua cópia foi removida.
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Adiciona metadados à imagem
LABEL author="Wilker Quirino"
LABEL version="0.1.0"
LABEL description="Agenda Alego - Gerenciador de eventos da TV Assembleia."

# Define o usuário para executar a aplicação
USER nextjs

# Expõe a porta que o Next.js usará
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]
