const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Force path to the correct DB
process.env.DATABASE_URL = 'file:' + path.resolve('C:/Users/crono/.gemini/antigravity/scratch/slx-imobiliaria/packages/database/prisma/dev.db');

const prisma = new PrismaClient();

async function main() {
  const photos = await prisma.inspectionPhoto.findMany();
  console.log(JSON.stringify(photos, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
