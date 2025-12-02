# Estágio 1: Instalação das dependências
FROM node:20-alpine AS deps
WORKDIR /app

# Copia package.json e lockfiles
COPY package.json ./
# Descomentei a linha abaixo pois o arquivo existe e é importante para builds reprodutíveis
COPY package-lock.json ./ 

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
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Copia a pasta public para garantir que ícones e manifestos sejam servidos
COPY --from=builder /app/public ./public

# Muda o usuário para o usuário não-root criado
USER nextjs

# Expõe a porta que a aplicação vai rodar
EXPOSE 3050

# Comando para iniciar a aplicação otimizada
CMD ["node", "server.js"]