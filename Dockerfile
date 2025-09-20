# Estágio de Dependências (builder-deps)
FROM node:20-alpine AS builder-deps
WORKDIR /app
COPY src/package.json ./src/
COPY package.json .
RUN npm install

# Estágio de Build (builder)
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=builder-deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Estágio Final (runner)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copiar arquivos de build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copiar o arquivo .env para o contêiner
COPY .env .

# Expor a porta e definir o comando de inicialização
EXPOSE 3050
CMD ["node", "server.js"]
