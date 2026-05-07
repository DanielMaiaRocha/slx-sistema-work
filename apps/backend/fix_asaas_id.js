const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  await prisma.user.updateMany({
    where: { cpf: '20993460704' },
    data: {
      asaasId: 'CUS_000174472803'
    }
  });

  console.log('AsaasID updated to CUS_000174472803 for user with CPF 20993460704.');
  process.exit(0);
}

fix();
