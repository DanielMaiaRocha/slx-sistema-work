const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function run() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: 'slx' } });
  const tenantId = tenant.id;

  // 1. Ensure user Sergio Henrique exists
  let user = await prisma.user.findFirst({
    where: { 
      OR: [
        { cpf: '02568746700' },
        { asaasId: 'cus_000174002040' }
      ]
    }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'SÉRGIO HENRIQUE DA COSTA SOUZA',
        email: 'sergiohcsouza99@gmail.com',
        cpf: '02568746700',
        phone: '21964990753',
        asaasId: 'cus_000174002040',
        role: 'TENANT',
        password: 'NO_PASSWORD_YET',
        tenantId
      }
    });
    console.log('User created:', user.id);
  } else {
    console.log('User exists:', user.id);
  }

  // 2. Mock file upload (copy to uploads folder)
  const uploadsDir = path.join(__dirname, 'public/uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const fileName = 'contrato-sergio-' + Date.now() + '.pdf';
  const destPath = path.join(uploadsDir, fileName);
  fs.copyFileSync(path.join(__dirname, 'contrato.pdf'), destPath);

  const fileUrl = `http://localhost:3001/uploads/${fileName}`;

  // 3. Create Document with Metadata
  const doc = await prisma.document.create({
    data: {
      name: 'Contrato de Locação Residencial',
      url: fileUrl,
      type: 'CONTRACT_LEASE',
      userId: user.id,
      tenantId,
      visibility: 'TENANT',
      amount: 4000.00,
      address: 'Estrada dos Três Rios, nº 1.200 Loja L, Freguesia - Rio de Janeiro – RJ',
      duration: '36 meses (01/05/2026 - 01/05/2029)'
    }
  });

  console.log('Document created with metadata:', JSON.stringify(doc, null, 2));
  process.exit(0);
}

run();
