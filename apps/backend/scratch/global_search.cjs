const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { OR: [ { name: { contains: 'Caboclos' } }, { email: { contains: 'Caboclos' } } ] }
  });
  console.log('Users:', users);

  const tenants = await prisma.tenant.findMany({
    where: { name: { contains: 'Caboclos' } }
  });
  console.log('Tenants:', tenants);

  // Search in all documents again but without filter, then grep in output
  const allDocs = await prisma.document.findMany();
  const caboclosDocs = allDocs.filter(d => JSON.stringify(d).includes('Caboclos'));
  console.log('Docs:', caboclosDocs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
