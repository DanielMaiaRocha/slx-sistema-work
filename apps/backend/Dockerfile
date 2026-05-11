# apps/backend/Dockerfile
FROM node:22-slim AS base

# Instalar dependências necessárias para o Prisma e Puppeteer (se usado)
RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/database/package.json ./packages/database/
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Gerar o cliente Prisma e compilar o TypeScript
RUN npm run build -w backend

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copiar node_modules e arquivos compilados
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder /app/packages ./packages

EXPOSE 3001

# Iniciar o servidor
CMD ["node", "apps/backend/dist/server.js"]
