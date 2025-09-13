# Estágio 1: Instalar dependências
FROM node:20 AS deps
WORKDIR /app
COPY package.json ./
RUN npm install

# Estágio 2: Construir a aplicação
FROM node:20 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Estágio 3: Executar a aplicação
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copiar a saída autônoma
COPY --from=builder /app/.next/standalone ./

# Copiar os assets estáticos
COPY --from=builder /app/.next/static ./.next/static


EXPOSE 3000

CMD ["node", "server.js"]
