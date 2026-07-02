# apps/frontend/Dockerfile
FROM node:22-slim AS base

# Estágio de build. Instalamos as dependências AQUI mesmo (antes de copiar o
# código, para aproveitar o cache de camada) em vez de copiar a node_modules de
# um estágio separado — assim não dependemos de o npm "hoistar" tudo para a raiz.
# (O npm às vezes aninha o `next` em apps/frontend/node_modules; copiar só a
# node_modules da raiz deixava o `next` de fora → "next: not found".)
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/backend/package.json ./apps/backend/
RUN npm install --ignore-scripts

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
