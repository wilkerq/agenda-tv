# 1. Estágio de Instalação/Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copia os arquivos de definição de pacotes
COPY package.json ./
COPY package-lock.json* ./
COPY next.config.ts ./
COPY tsconfig.json ./

# Instala as dependências
RUN npm install

# Copia o restante do código-fonte da aplicação
COPY . .

# Constrói a aplicação Next.js
RUN npm run build

# 2. Estágio de Produção/Execução
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copia o diretório .next/standalone do estágio de builder
COPY --from=builder /app/.next/standalone ./

# Copia o diretório .next/static do estágio de builder
COPY --from=builder /app/.next/static ./.next/static

# Copia o diretório public (opcionalmente)
# Usar --chown=nextjs:nodejs e um usuário não-root é uma boa prática de segurança.
# A cópia é opcional para não quebrar se a pasta não existir.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public || true


# Define o usuário não-root
USER nextjs

EXPOSE 3050

ENV PORT 3050

# O comando para iniciar o servidor Next.js em modo standalone
CMD ["node", "server.js"]
