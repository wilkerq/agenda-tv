# Estágio 1: Build da aplicação Next.js
FROM node:20-slim AS builder
WORKDIR /app

# Copia os arquivos de manifesto de dependências
COPY package.json ./
COPY package-lock.json ./

# Instala as dependências de produção
RUN npm install --omit=dev

# Copia o restante do código da aplicação
COPY . .

# Constrói a aplicação Next.js
RUN npm run build

# Estágio 2: Criação da imagem de produção
FROM node:20-slim AS runner
WORKDIR /app

# Define o ambiente como produção
ENV NODE_ENV=production

# Copia o build do Next.js do estágio 'builder'
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

# Expõe a porta que a aplicação vai rodar
EXPOSE 3050

# Comando para iniciar a aplicação
CMD ["npm", "start"]
