// @ts-nocheck
/* eslint-disable */
import bcrypt from 'bcryptjs';
import { connectDB } from './config/db';
import { Tenant, User, Role } from './models';

async function main() {
  console.log('🌱 Starting seed...');
  await connectDB();

  // 1. Tenant
  let tenant: any = await Tenant.findOne({ slug: 'slx' });
  if (!tenant) {
    tenant = await Tenant.create({
      name: 'SLX Imobiliária',
      slug: 'slx',
      primaryColor: '#6D28D9',
      secondaryColor: '#06B6D4',
    });
  }
  console.log(`✅ Tenant created/found: ${tenant.name} (${tenant._id})`);

  // 2. Admin User
  const adminEmail = 'contatodanielmrocha@gmail.com';
  const adminPassword = await bcrypt.hash('8520147we', 10);
  const admin: any = await User.findOneAndUpdate(
    { email: adminEmail },
    {
      $set: { password: adminPassword, role: Role.ADMIN },
      $setOnInsert: {
        email: adminEmail,
        name: 'Daniel Rocha (Admin)',
        tenantId: tenant._id,
        isEmailVerified: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(`✅ Admin user created/found: ${admin.name} (${admin.email})`);

  // 3. Test Tenant User
  const tenantCpf = '20993460704';
  const tenantPassword = await bcrypt.hash('8520147we', 10);
  const testTenant: any = await User.findOneAndUpdate(
    { cpf: tenantCpf },
    {
      $set: { password: tenantPassword, role: Role.TENANT },
      $setOnInsert: {
        cpf: tenantCpf,
        email: 'inquilino_teste@slx.com',
        name: 'Inquilino de Teste',
        tenantId: tenant._id,
        asaasId: 'cus_000006200000',
        isEmailVerified: true,
        phone: '5511999999999',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(`✅ Test tenant user created/found: ${testTenant.name} (${testTenant.cpf})`);

  console.log('✨ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    const mongoose = (await import('mongoose')).default;
    await mongoose.disconnect();
  });
