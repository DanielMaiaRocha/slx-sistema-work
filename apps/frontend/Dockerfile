# apps/frontend/Dockerfile
FROM node:22-slim AS base

# 1. Instalar dependências apenas quando necessário
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/
# Usamos install em vez de ci para evitar erros de sincronia do lockfile no monorepo
RUN npm install

# 2. Reconstruir o código-fonte apenas quando necessário
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variáveis de ambiente de build (necessárias para o Next.js)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Executa o build a partir da raiz usando workspaces
RUN npm run build -w frontend

# 3. Imagem de produção
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Copiar arquivos necessários do builder
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public
COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static

EXPOSE 3000

# O standalone em monorepos fica nessa estrutura
CMD ["node", "apps/frontend/server.js"]
