const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

async function parseContract(fileUrl) {
  try {
    let targetPath = fileUrl;
    if (fileUrl.startsWith('http://localhost:3001/uploads/')) {
      const fileName = fileUrl.split('/').pop();
      targetPath = path.join(process.cwd(), 'public/uploads', fileName);
    }

    if (!fs.existsSync(targetPath)) return {};

    const dataBuffer = fs.readFileSync(targetPath);
    const data = await pdf(dataBuffer);
    const text = data.text;

    const metadata = {};
    const patterns = {
      tenant: /LOCAT[AÁ]RIO[^\w:]*[:]\s*([A-Z\sÀ-Ú]+?)(?:,|\s+brasileir|\s+residente)/i
    };

    const tenantMatch = text.match(patterns.tenant);
    if (tenantMatch) {
      metadata.tenantName = tenantMatch[1].trim();
    }

    return metadata;
  } catch (error) {
    return {};
  }
}

async function fixDocumentUsers() {
  const documents = await prisma.document.findMany({
    where: { deletedAt: null }
  });

  console.log(`🔍 Checking ${documents.length} documents...`);

  for (const doc of documents) {
    console.log(`\n📄 Processing: ${doc.name}`);
    
    try {
      const metadata = await parseContract(doc.url);
      
      if (metadata.tenantName) {
        console.log(`👤 Found Tenant Name in doc: ${metadata.tenantName}`);
        
        let user = await prisma.user.findFirst({
          where: { 
            tenantId: doc.tenantId,
            name: { contains: metadata.tenantName }
          }
        });

        if (!user) {
          console.log(`✨ User not found. Creating ghost user for ${metadata.tenantName}...`);
          const email = `${metadata.tenantName.toLowerCase().replace(/\s+/g, '.')}@system.slx`;
          user = await prisma.user.create({
            data: {
              name: metadata.tenantName,
              email: email,
              password: 'system_auto_generated',
              role: 'TENANT',
              tenantId: doc.tenantId
            }
          });
        }

        if (user.id !== doc.userId) {
          console.log(`🔗 Linking document to correct user: ${user.name}`);
          await prisma.document.update({
            where: { id: doc.id },
            data: { userId: user.id }
          });
        } else {
          console.log(`✅ Already correctly linked.`);
        }
      } else {
        console.log(`⚠️ No tenant name found.`);
      }
    } catch (err) {
      console.error(`❌ Error:`, err);
    }
  }

  console.log('\n✅ Process complete!');
  process.exit(0);
}

fixDocumentUsers();
