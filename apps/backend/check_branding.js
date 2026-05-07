const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBranding() {
  const tenants = await prisma.tenant.findMany();
  console.log('--- Current Tenants Branding ---');
  tenants.forEach(t => {
    console.log(`ID: ${t.id} | Name: ${t.name}`);
    console.log(`Primary: ${t.primaryColor} | Secondary: ${t.secondaryColor}`);
  });
  process.exit(0);
}

checkBranding();
