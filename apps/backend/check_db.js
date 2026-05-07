const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findFirst({
    where: { name: { contains: 'COSTA SOUZA' } }
  });
  console.log('User Found:', JSON.stringify(user, null, 2));
  process.exit(0);
}

check();
