# Estágio 1: Builder - Instala dependências e compila a aplicação
FROM node:20-alpine AS builder

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de gerenciamento de pacotes
COPY package.json ./
COPY src/package.json ./src/

# Instala as dependências
# Usamos --frozen-lockfile para garantir que as versões exatas do package-lock.json sejam usadas
RUN npm install --frozen-lockfile

# Copia o restante do código da aplicação
COPY . .

# Compila a aplicação para produção
# O Next.js com output: 'standalone' criará uma pasta .next/standalone
RUN npm run build

# Estágio 2: Runner - Executa a aplicação otimizada
FROM node:20-alpine AS runner

WORKDIR /app

# Cria um usuário não-root para aumentar a segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia os artefatos da compilação do estágio 'builder'
# A pasta .next/standalone contém tudo o que é necessário para rodar
COPY --from=builder /app/.next/standalone ./
# Copia a pasta de assets públicos
COPY --from=builder /app/public ./public

# Muda o proprietário dos arquivos para o usuário não-root
RUN chown -R nextjs:nodejs /app

# Muda para o usuário não-root
USER nextjs

# Expõe a porta que a aplicação vai rodar
EXPOSE 9002

# Define a variável de ambiente para a porta
ENV PORT=9002

# O comando para iniciar a aplicação
# O servidor do Next.js standalone está em server.js
CMD ["node", "server.js"]
