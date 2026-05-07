const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const tenant = await prisma.tenant.findFirst({
    where: { name: 'SLX Imobiliária' }
  });

  if (!tenant) {
    console.log('Tenant not found');
    return;
  }

  // Update tenant logo (using a placeholder that looks like the screenshot)
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      logoUrl: 'https://img.logoipsum.com/296.svg' // Simple modern logo placeholder
    }
  });

  // Update user name and ensure CPF is correct
  await prisma.user.updateMany({
    where: { cpf: '20993460704' },
    data: {
      name: 'Daniel Maia Rocha'
    }
  });

  console.log('Data fixed: Name updated to Daniel Maia Rocha and Logo added to Tenant.');
  process.exit(0);
}

fix();
