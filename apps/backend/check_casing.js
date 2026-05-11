const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findMany({ where: { asaasId: { not: null } } }).then(users => { 
  console.log(users.map(u => ({ id: u.id, asaasId: u.asaasId }))); 
  p.$disconnect(); 
});
