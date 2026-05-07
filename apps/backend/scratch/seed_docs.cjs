const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'file:C:/Users/crono/.gemini/antigravity/scratch/slx-imobiliaria/packages/database/prisma/dev.db' } } });

async function main() {
  const userId = 'cmou5gdr70004loo0nzsyuoxl'; // Daniel Maia Rocha
  const tenantId = 'cmou5gbow0000loo04qgrzhmb'; // SLX

  const docs = [
    {
      name: 'Contrato de Aluguel - Unidade 402.pdf',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      type: 'CONTRATO',
      visibility: 'ALL'
    },
    {
      name: 'Termo de Vistoria Entrada.docx',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      type: 'VISTORIA',
      visibility: 'ALL'
    },
    {
      name: 'Comprovante de IPTU - 2026.pdf',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      type: 'FINANCEIRO',
      visibility: 'ALL'
    },
    {
      name: 'Seguro Fiança - Apólice.pdf',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      type: 'SEGURO',
      visibility: 'ALL'
    }
  ];

  console.log('🌱 Seeding documents for Daniel...');

  for (const doc of docs) {
    await prisma.document.create({
      data: {
        ...doc,
        userId,
        tenantId
      }
    });
    console.log(`✅ Created: ${doc.name}`);
  }

  console.log('✨ Seeding complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
