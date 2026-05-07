import prisma from './src/config/prisma';
import { ParserService } from './src/services/parser.service';

async function fixDocumentUsers() {
  const documents = await prisma.document.findMany({
    where: { deletedAt: null }
  });

  console.log(`🔍 Checking ${documents.length} documents...`);

  for (const doc of documents) {
    console.log(`\n📄 Processing: ${doc.name}`);
    
    try {
      const metadata = await ParserService.parseContract(doc.url);
      
      if (metadata.tenantName) {
        console.log(`👤 Found Tenant Name in doc: ${metadata.tenantName}`);
        
        // Search for user by name (case-insensitive contains)
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
          console.log(`🔗 Linking document to correct user: ${user.name} (${user.id})`);
          await prisma.document.update({
            where: { id: doc.id },
            data: { userId: user.id }
          });
        } else {
          console.log(`✅ Already correctly linked to ${user.name}`);
        }
      } else {
        console.log(`⚠️ No tenant name found in document content.`);
      }
    } catch (err) {
      console.error(`❌ Error processing ${doc.name}:`, err);
    }
  }

  console.log('\n✅ Process complete!');
  process.exit(0);
}

fixDocumentUsers();
