const { PrismaClient } = require('@prisma/client');
const { ParserService } = require('./dist/services/parser.service');
const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findFirst({
    where: { cpf: '20993460704' }
  });

  if (!user) {
    console.log('User not found');
    process.exit(1);
  }

  const contracts = await prisma.document.findMany({
    where: { 
      userId: user.id,
      type: { startsWith: 'CONTRACT' }
    }
  });

  console.log(`Found ${contracts.length} contracts to re-parse.`);

  for (const doc of contracts) {
    console.log(`Processing: ${doc.name} (${doc.url})`);
    try {
      // Resolve local path from URL
      const fileName = doc.url.split('/').pop();
      const path = require('path');
      const targetPath = path.join(process.cwd(), 'public/uploads', fileName);
      
      const metadata = await ParserService.parseContract(doc.url);
      console.log('Extracted Metadata:', metadata);

      await prisma.document.update({
        where: { id: doc.id },
        data: {
          amount: metadata.amount || null,
          address: metadata.address || null,
          duration: metadata.duration || null
        }
      });
      console.log('✅ Updated DB');
    } catch (err) {
      console.error(`❌ Error parsing ${doc.name}:`, err);
    }
  }

  process.exit(0);
}

run();
