const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const docs = await prisma.document.findMany({
    where: { 
      OR: [
        { address: { contains: 'Caboclos' } },
        { name: { contains: 'Caboclos' } },
        { url: { contains: 'Caboclos' } }
      ]
    }
  });
  console.log(JSON.stringify(docs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
