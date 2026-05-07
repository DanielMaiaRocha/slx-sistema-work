const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateBranding() {
  const tenants = await prisma.tenant.findMany();
  for (const tenant of tenants) {
    console.log(`Updating ${tenant.name}...`);
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        primaryColor: '#FFC107',
        secondaryColor: '#000000'
      }
    });
  }
  console.log('Branding updated to Yellow & Black!');
  process.exit(0);
}

updateBranding();
