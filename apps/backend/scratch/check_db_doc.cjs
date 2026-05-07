const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const doc = await prisma.document.findFirst({
    where: { address: { contains: 'Caboclos' } }
  });
  console.log(JSON.stringify(doc, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
