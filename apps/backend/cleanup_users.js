const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  const s1 = "cmoua5wse0001lo04k401pu4y"; // Clean name
  const s2 = "cmouyq8540001lotcqrfy0v4l"; // Double space name
  
  // Link all documents from s2 to s1
  await prisma.document.updateMany({
    where: { userId: s2 },
    data: { userId: s1 }
  });
  
  // Delete s2
  await prisma.user.delete({ where: { id: s2 } });
  
  console.log("✅ Merged duplicate Sergio users.");
  process.exit(0);
}

cleanup();
