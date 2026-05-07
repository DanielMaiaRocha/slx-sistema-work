import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const pdf = require('pdf-parse');
const prisma = new PrismaClient();

async function parseAmount(fileUrl: string): Promise<number | null> {
  try {
    let targetPath = fileUrl;
    if (fileUrl.startsWith('http://localhost:3001/uploads/')) {
      const fileName = fileUrl.split('/').pop();
      targetPath = path.join(process.cwd(), 'public/uploads', fileName!);
    }

    if (!fs.existsSync(targetPath)) {
      console.log(`  ⚠️  Arquivo não encontrado: ${targetPath}`);
      return null;
    }

    const dataBuffer = fs.readFileSync(targetPath);
    const data = await pdf(dataBuffer);
    const text = data.text;

    // Multiple patterns to capture rent value
    const patterns = [
      /valor\s+de\s+R\$\s*([\d.,]+)/i,           // "valor de R$ 4.000,00"
      /pagar.*?R\$\s*([\d.,]+)/i,                 // "pagar ... R$ 4.000,00"
      /aluguel.*?R\$\s*([\d.,]+)/i,               // "aluguel ... R$ 4.000,00"
      /R\$\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/,  // Any R$ XXXX,XX pattern (first match)
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const rawValue = match[1].trim();
        // Remove thousand separators (dots) and convert decimal comma to dot
        const floatValue = parseFloat(rawValue.replace(/\./g, '').replace(',', '.'));
        if (!isNaN(floatValue) && floatValue > 0 && floatValue < 100000000) {
          console.log(`  ✅ Valor extraído: R$ ${rawValue} → ${floatValue}`);
          return floatValue;
        }
      }
    }

    console.log(`  ⚠️  Nenhum valor encontrado no PDF`);
    return null;
  } catch (err) {
    console.error(`  ❌ Erro ao parsear PDF:`, err);
    return null;
  }
}

async function main() {
  console.log('🔄 Iniciando re-parse de contratos...\n');

  const contracts = await prisma.document.findMany({
    where: {
      type: { startsWith: 'CONTRACT' },
      deletedAt: null,
    },
    select: { id: true, name: true, url: true, amount: true, address: true, duration: true }
  });

  console.log(`📄 ${contracts.length} contratos encontrados\n`);

  for (const doc of contracts) {
    console.log(`📋 Processando: ${doc.name}`);
    console.log(`   Valor atual no banco: ${doc.amount ?? 'null'}`);

    const amount = await parseAmount(doc.url);

    if (amount !== null) {
      await prisma.document.update({
        where: { id: doc.id },
        data: { amount }
      });
      console.log(`   ✅ Banco atualizado: ${amount}\n`);
    } else {
      console.log(`   ⚠️  Valor não atualizado\n`);
    }
  }

  console.log('✅ Re-parse concluído!');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
