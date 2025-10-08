# Dockerfile

# --- Estágio de Dependências ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --only=production

# --- Estágio de Build ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- Estágio Final de Produção ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copia os artefatos da build standalone
COPY --from=builder /app/.next/standalone ./

# Define o usuário e a porta
USER node
EXPOSE 3050

# Inicia o servidor
CMD ["node", "server.js"]
