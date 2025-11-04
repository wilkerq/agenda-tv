# Estágio 1: Instalação das dependências
FROM node:20-alpine AS deps
WORKDIR /app

# Copia os arquivos de gerenciamento de pacotes
COPY package.json package-lock.json* ./
# Instala as dependências
RUN npm install

# Estágio 2: Build da aplicação
FROM node:20-alpine AS builder
WORKDIR /app
# Copia as dependências do estágio anterior
COPY --from=deps /app/node_modules ./node_modules
# Copia o restante do código da aplicação
COPY . .

# Constrói a aplicação Next.js para produção
RUN npm run build

# Estágio 3: Imagem final de produção
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copia os arquivos de build do estágio anterior
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Expõe a porta que a aplicação irá rodar
EXPOSE 3050

# Comando para iniciar a aplicação
CMD ["node", "server.js"]
