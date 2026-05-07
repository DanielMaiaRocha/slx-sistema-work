const axios = require('axios');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'slx-secret-key-123';
const token = jwt.sign(
  { id: 'mock-id', email: 'admin@slx.com', role: 'ADMIN', tenantId: 'slx-default-id' },
  JWT_SECRET,
  { expiresIn: '7d' }
);

async function test() {
  try {
    const res = await axios.get('http://localhost:3001/api/dashboard/stats', {
      headers: { 
        'x-tenant-slug': 'slx', 
        'Authorization': `Bearer ${token}` 
      }
    });
    console.log('Dashboard Stats Response Success');
  } catch (e) {
    console.error('Test failed:', e.response?.data || e.message);
  }
}
test();
