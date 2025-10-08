# Dockerfile

# 1. Estágio de Build
# Usa uma imagem Node.js completa para instalar dependências e fazer o build
FROM node:20-alpine AS builder
WORKDIR /app

# Copia os arquivos de manifesto de pacotes e instala dependências
COPY package*.json ./
RUN npm install

# Copia o resto do código da aplicação
COPY . .

# Executa o script de build do Next.js
RUN npm run build

# 2. Estágio de Produção
# Usa uma imagem Node.js menor (alpine) para a aplicação final
FROM node:20-alpine AS runner
WORKDIR /app

# Define o ambiente para produção
ENV NODE_ENV=production

# Copia o build otimizado (standalone) do estágio anterior
COPY --from=builder /app/.next/standalone ./

# Expõe a porta que a aplicação vai rodar
EXPOSE 3050

# Comando para iniciar a aplicação
CMD ["node", "server.js"]
