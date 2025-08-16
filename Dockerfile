# 1. Estágio de Instalação de Dependências
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install

# 2. Estágio de Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3. Estágio de Produção
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 9002

ENV PORT=9002

CMD ["node", "server.js"]
