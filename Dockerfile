# 1. Estágio de Instalação de Dependências
FROM node:18-alpine AS deps
WORKDIR /app

# Copia package.json e lockfile
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
# Instala as dependências
RUN \
  if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# 2. Estágio de Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build do Next.js
RUN npm run build

# 3. Estágio de Produção
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copia os artefatos do build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
