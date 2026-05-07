const { PrismaClient } = require('@prisma/client');
const path = require('path');

process.env.DATABASE_URL = 'file:' + path.resolve('C:/Users/crono/.gemini/antigravity/scratch/slx-imobiliaria/packages/database/prisma/dev.db');

const prisma = new PrismaClient();

async function main() {
  const roomId = 'cmortz3ub000llo44ato2f2lg';
  const room = await prisma.inspectionRoom.findUnique({ where: { id: roomId } });
  console.log('Room:', JSON.stringify(room, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
