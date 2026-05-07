const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:C:/Users/crono/.gemini/antigravity/scratch/slx-imobiliaria/packages/database/prisma/dev.db'
    }
  }
});

async function main() {
  const docs = await prisma.document.findMany();
  const caboclosDocs = docs.filter(d => JSON.stringify(d).includes('Caboclos'));
  console.log('Docs:', caboclosDocs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
