const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed (JS)...');

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'slx' },
    update: {},
    create: {
      name: 'SLX Imobiliária',
      slug: 'slx',
      primaryColor: '#6D28D9',
      secondaryColor: '#06B6D4',
    },
  });

  console.log(`✅ Tenant: ${tenant.name}`);

  const adminEmail = 'contatodanielmrocha@gmail.com';
  const adminPassword = await bcrypt.hash('8520147we', 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: adminPassword, role: 'ADMIN' },
    create: {
      email: adminEmail,
      password: adminPassword,
      name: 'Daniel Rocha (Admin)',
      role: 'ADMIN',
      tenantId: tenant.id,
      isEmailVerified: true,
    },
  });

  console.log(`✅ Admin: ${admin.email}`);
  console.log('✨ Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
