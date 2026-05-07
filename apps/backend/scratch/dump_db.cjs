const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:C:/Users/crono/.gemini/antigravity/scratch/slx-imobiliaria/packages/database/prisma/dev.db'
    }
  }
});

async function main() {
  const users = await prisma.user.findMany({
    include: { documents: true }
  });
  console.log(JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
