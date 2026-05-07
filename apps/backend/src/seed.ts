// @ts-nocheck
/* eslint-disable */
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from './config/prisma';

async function main() {
  console.log('🌱 Starting seed...');

  // 1. Create Default Tenant
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

  console.log(`✅ Tenant created/found: ${tenant.name} (${tenant.id})`);

  // 2. Create Initial Admin User
  const adminEmail = 'contatodanielmrocha@gmail.com';
  const adminPassword = await bcrypt.hash('8520147we', 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: adminPassword,
      role: Role.ADMIN,
    },
    create: {
      email: adminEmail,
      password: adminPassword,
      name: 'Daniel Rocha (Admin)',
      role: Role.ADMIN,
      tenantId: tenant.id,
      isEmailVerified: true,
    },
  });

  console.log(`✅ Admin user created/found: ${admin.name} (${admin.email})`);

  // 3. Create Test Tenant User (Inquilino)
  const tenantCpf = '20993460704';
  const tenantPassword = await bcrypt.hash('8520147we', 10);
  
  const testTenant = await prisma.user.upsert({
    where: { cpf: tenantCpf },
    update: {
      password: tenantPassword,
      role: Role.TENANT
    },
    create: {
      cpf: tenantCpf,
      email: 'inquilino_teste@slx.com',
      password: tenantPassword,
      name: 'Inquilino de Teste',
      role: Role.TENANT,
      tenantId: tenant.id,
      asaasId: 'cus_000006200000', // Mock Asaas ID for testing
      isEmailVerified: true,
      phone: '5511999999999'
    }
  });

  console.log(`✅ Test tenant user created/found: ${testTenant.name} (${testTenant.cpf})`);

  console.log('✨ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
