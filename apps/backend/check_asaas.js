const axios = require('axios');
require('dotenv').config({ path: '.env' });

const asaasApi = axios.create({
  baseURL: process.env.ASAAS_API_URL || 'https://api.asaas.com/v3',
  headers: { 'access_token': process.env.ASAAS_API_KEY }
});

async function check() {
  try {
    const res = await asaasApi.get('/customers', { params: { cpfCnpj: '02568746700' } });
    console.log('Asaas Customers:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

check();
