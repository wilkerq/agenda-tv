# Fase 1: Builder - Instala dependências e faz o build da aplicação
FROM node:18-alpine AS builder

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de gerenciamento de pacotes
COPY package.json ./
COPY package-lock.json ./

# Instala as dependências de produção
RUN npm install

# Copia o restante do código da aplicação
COPY . .

# Copia o .env para que o build tenha acesso às variáveis de ambiente
COPY .env ./.env

# Executa o build de produção
RUN npm run build

# ---

# Fase 2: Runner - Executa a aplicação a partir do build otimizado
FROM node:18-alpine AS runner

WORKDIR /app

# Cria um usuário e grupo específicos para a aplicação
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copia os artefatos do build da fase anterior
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Define o usuário para rodar a aplicação
USER nextjs

# Expõe a porta 3050, que será usada para rodar a aplicação
EXPOSE 3050

# Define a variável de ambiente para a porta
ENV PORT 3050

# Comando para iniciar a aplicação na porta 3050
CMD ["npm", "start"]
