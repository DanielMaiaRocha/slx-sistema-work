const { PrismaClient } = require('@prisma/client');
const path = require('path');

process.env.DATABASE_URL = 'file:' + path.resolve('C:/Users/crono/.gemini/antigravity/scratch/slx-imobiliaria/packages/database/prisma/dev.db');

const prisma = new PrismaClient();

async function main() {
  const data = await prisma.inspection.findMany({
    select: {
      id: true,
      status: true,
      propertyAddress: true
    }
  });
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
