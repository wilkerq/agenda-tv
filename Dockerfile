# Estágio 1: Instalação das dependências
FROM node:20-alpine AS deps
WORKDIR /app

# Copia package.json e lockfiles
COPY package.json ./
# O ideal seria copiar o package-lock.json também, mas ele não está presente
# COPY package-lock.json ./ 

# Instala as dependências
RUN npm install

# Estágio 2: Build da aplicação
FROM node:20-alpine AS builder
WORKDIR /app

# Copia as dependências do estágio anterior
COPY --from=deps /app/node_modules ./node_modules
# Copia o restante do código da aplicação
COPY . .

# Executa o script de build
RUN npm run build

# Estágio 3: Produção
FROM node:20-alpine AS runner
WORKDIR /app

# Define o ambiente como produção
ENV NODE_ENV=production

# Cria um usuário, grupo e diretório para a aplicação
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia os artefatos de build do estágio anterior
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# O diretório .next/standalone já contém as dependências necessárias (node_modules)
# e o server.js otimizado, graças à configuração `output: 'standalone'` em next.config.ts.
# Vamos copiar esse diretório otimizado.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Muda o usuário para o usuário não-root criado
USER nextjs

# Expõe a porta que a aplicação vai rodar
EXPOSE 3050

# Comando para iniciar a aplicação
# O `npm run start` no docker-compose.yml irá sobrepor este CMD,
# mas é uma boa prática tê-lo aqui para clareza.
CMD ["node", "server.js"]
