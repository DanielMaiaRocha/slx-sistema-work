const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'file:C:/Users/crono/.gemini/antigravity/scratch/slx-imobiliaria/packages/database/prisma/dev.db' } } });

prisma.document.findMany().then(docs => {
  docs.forEach(d => {
    console.log('ID:', d.id);
    console.log('Amount:', d.amount, '(type:', typeof d.amount, ')');
    console.log('Address:', d.address);
    console.log('Duration:', d.duration);
    console.log('---');
  });
  prisma.$disconnect();
});
