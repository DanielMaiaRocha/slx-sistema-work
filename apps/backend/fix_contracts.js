const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

let pdf;
try {
  pdf = require('pdf-parse');
} catch (e) {
  console.error('pdf-parse not found');
  process.exit(1);
}

// Absolute path to the database
const dbPath = path.resolve(__dirname, '../../packages/database/prisma/dev.db');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}`
    }
  }
});

const monthMap = {
  janeiro: '01', fevereiro: '02', março: '03', marco: '03',
  abril: '04', maio: '05', junho: '06', julho: '07',
  agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12'
};

async function parseContract(fileUrl) {
  try {
    let targetPath = fileUrl;
    if (fileUrl.startsWith('http://localhost:3001/uploads/')) {
      const fileName = fileUrl.split('/').pop();
      targetPath = path.join(__dirname, 'public/uploads', fileName);
    }

    if (!fs.existsSync(targetPath)) {
      console.log(`  ⚠️  Arquivo não encontrado: ${targetPath}`);
      return null;
    }

    const dataBuffer = fs.readFileSync(targetPath);
    const data = await pdf(dataBuffer);
    const text = data.text;

    const metadata = {};

    // 1. Rent Amount
    const rentPatterns = [
      /valor\s+de\s+R\$\s*([\d.,]+)/i,
      /pagar.*?R\$\s*([\d.,]+)/i,
      /aluguel.*?R\$\s*([\d.,]+)/i,
    ];

    for (const pattern of rentPatterns) {
      const match = text.match(pattern);
      if (match) {
        const rawValue = match[1].trim();
        metadata.amount = parseFloat(rawValue.replace(/\./g, '').replace(',', '.'));
        break;
      }
    }

    // 2. Address
    const addressMatch = text.match(/situado\s+(?:na|no|à)\s+([\s\S]+?)(?=\.\s+(?:[A-Z]|Parágrafo|Cláusula|•|$))/i);
    if (addressMatch) {
      metadata.address = addressMatch[1].trim().replace(/\s+/g, ' ');
    }

    // 3. Duration
    const durationMatch = text.match(/prazo\s+de\s+loca[cç][aã]o\s+deste\s+contrato\s+[eé]\s+de\s+(\d+)/i);
    if (durationMatch) {
      const months = durationMatch[1];
      const dateRangeMatch = text.match(/iniciar.se\s+no\s+dia\s+(\d{2}[\w\s]+?\d{4})\s+e\s+findar.se\s+no\s+dia\s+(\d{2}[\w\s]+?\d{4})/is);
      
      const toDate = (s) => {
        const clean = s.replace(/\s+/g, ' ').trim();
        const parts = clean.split(' ');
        const day = parts[0].padStart(2, '0');
        const monthName = (parts[2] || '').toLowerCase();
        const year = parts[parts.length - 1];
        const month = monthMap[monthName] || '??';
        return `${day}/${month}/${year}`;
      };

      if (dateRangeMatch) {
        let startDate = toDate(dateRangeMatch[1]);
        let endDate = toDate(dateRangeMatch[2]);

        // Fix typo: same start/end date
        if (startDate === endDate && Number(months) > 0 && !startDate.includes('??')) {
          const [d, m, y] = startDate.split('/').map(Number);
          const date = new Date(y, m - 1, d);
          date.setMonth(date.getMonth() + Number(months));
          const dd = String(date.getDate()).padStart(2, '0');
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const yyyy = date.getFullYear();
          endDate = `${dd}/${mm}/${yyyy}`;
        }
        metadata.duration = `${months} meses (${startDate} - ${endDate})`;
      } else {
        metadata.duration = `${months} meses`;
      }
    }

    return metadata;
  } catch (err) {
    console.error(`  ❌ Erro ao parsear PDF:`, err.message);
    return null;
  }
}

async function main() {
  console.log('🔄 Iniciando correção completa de contratos...\n');
  console.log(`📂 Usando banco: ${dbPath}\n`);

  const contracts = await prisma.document.findMany({
    where: {
      type: { startsWith: 'CONTRACT' },
      deletedAt: null,
    }
  });

  console.log(`📄 ${contracts.length} contratos encontrados\n`);

  for (const doc of contracts) {
    console.log(`📋 Processando: ${doc.name} (ID: ${doc.id})`);
    
    const metadata = await parseContract(doc.url);

    if (metadata) {
      await prisma.document.update({
        where: { id: doc.id },
        data: {
          amount: metadata.amount || doc.amount,
          address: metadata.address || doc.address,
          duration: metadata.duration || doc.duration
        }
      });
      console.log(`   ✅ Banco atualizado:`);
      console.log(`      Valor: ${metadata.amount}`);
      console.log(`      Endereço: ${metadata.address}`);
      console.log(`      Vigência: ${metadata.duration}\n`);
    } else {
      console.log(`   ⚠️  Nenhuma informação extraída\n`);
    }
  }

  console.log('✅ Correção concluída!');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
