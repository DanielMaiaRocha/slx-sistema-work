const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findFirst({
    where: { cpf: '20993460704' }
  });
  console.log('User ID:', user ? user.id : 'NOT FOUND');
  console.log('Asaas ID:', user ? user.asaasId : 'N/A');

  if (user) {
    const docs = await prisma.document.findMany({
      where: { userId: user.id }
    });
    console.log('Documents Found:', JSON.stringify(docs, null, 2));
  }
  process.exit(0);
}

run();
