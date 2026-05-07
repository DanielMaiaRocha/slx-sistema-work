# Instruções de Deploy na Railway - SLX Imobiliária

Este projeto está configurado como um monorepo utilizando **npm workspaces**. Para realizar o deploy na Railway, siga os passos abaixo:

## 1. Deploy do Backend (API)

No painel da Railway:
1. Crie um novo serviço apontando para este repositório.
2. Nas configurações do serviço (**Settings**):
   - **Root Directory**: `apps/backend`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run start`
3. Adicione as variáveis de ambiente (**Variables**):
   - `DATABASE_URL`: URL do seu banco de dados PostgreSQL.
   - `JWT_SECRET`: Uma chave secreta para tokens.
   - `PORT`: 3001 (ou deixe a Railway definir automaticamente).
   - `ASAAS_API_KEY`: Sua chave da API Asaas (opcional para testes).
   - `RESEND_API_KEY`: Sua chave da API Resend (opcional).

## 2. Deploy do Frontend (Portal)

No painel da Railway:
1. Crie outro serviço apontando para o mesmo repositório.
2. Nas configurações do serviço (**Settings**):
   - **Root Directory**: `apps/frontend`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run start`
3. Adicione as variáveis de ambiente (**Variables**):
   - `NEXT_PUBLIC_API_URL`: A URL pública gerada para o seu serviço de Backend (ex: `https://backend-production.up.railway.app/api`).
   - `PORT`: 3000 (ou deixe a Railway definir automaticamente).

## 3. Banco de Dados

A Railway oferece serviço de PostgreSQL nativo. Basta adicionar um serviço de PostgreSQL ao seu projeto e a Railway injetará automaticamente a `DATABASE_URL` se você conectar os serviços.

---
**Dica**: O sistema já possui gitingores configurados para evitar o envio de arquivos desnecessários e sensíveis.
