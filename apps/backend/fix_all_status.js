const { PrismaClient } = require('@prisma/client');
const path = require('path');

process.env.DATABASE_URL = 'file:' + path.resolve('C:/Users/crono/.gemini/antigravity/scratch/slx-imobiliaria/packages/database/prisma/dev.db');

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.inspection.updateMany({
    data: { status: 'FINALIZED' }
  });
  console.log('Updated:', result.count, 'inspections');
}

main().catch(console.error).finally(() => prisma.$disconnect());
