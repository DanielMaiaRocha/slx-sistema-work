const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { id: 'cmou5gdnt0002loo0382v0jyc', email: 'contatodanielmrocha@gmail.com', role: 'ADMIN', tenantId: 'cmou5gbow0000loo04qgrzhmb', permissions: {} },
  'slx-secret-key-123',
  { expiresIn: '1h' }
);

const { execSync } = require('child_process');
const result = execSync(
  `curl.exe -s -X POST http://localhost:3001/api/documents/reparse/all -H "Authorization: Bearer ${token}" -H "x-tenant-slug: slx"`,
  { encoding: 'utf8' }
);
console.log(JSON.parse(result).results?.map(r => ({
  user: r.userName,
  doc: r.docName,
  status: r.status,
  amount: r.metadata?.amount,
  duration: r.metadata?.duration,
  address: r.metadata?.address
})));
