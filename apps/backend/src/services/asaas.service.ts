import axios from 'axios';

const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';

export const asaasApi = axios.create({
  baseURL: ASAAS_API_URL,
  headers: {
    'access_token': ASAAS_API_KEY,
    'Content-Type': 'application/json',
  },
});

export class AsaasService {
  static async listCharges(customerId?: string) {
    try {
      const response = await asaasApi.get('/payments', {
        params: customerId ? { customer: customerId } : {},
      });
      return response.data;
    } catch (error: any) {
      console.error('Asaas listCharges error:', error.response?.data || error.message);
      throw new Error('Failed to fetch charges from Asaas');
    }
  }

  static async createCustomer(data: { name: string, email: string, cpfCnpj: string }) {
    try {
      const response = await asaasApi.post('/customers', data);
      return response.data;
    } catch (error: any) {
      console.error('Asaas createCustomer error:', error.response?.data || error.message);
      throw new Error('Failed to create customer in Asaas');
    }
  }

  static async findCustomerByCpf(cpf: string) {
    try {
      const response = await asaasApi.get('/customers', {
        params: { cpfCnpj: cpf.replace(/\D/g, '') },
      });
      return response.data.data?.[0] || null;
    } catch (error: any) {
      console.error('Asaas findCustomerByCpf error:', error.response?.data || error.message);
      throw new Error('Failed to find customer in Asaas');
    }
  }

  static async createPayment(data: any) {
    try {
      const response = await asaasApi.post('/payments', data);
      return response.data;
    } catch (error: any) {
      console.error('Asaas createPayment error:', error.response?.data || error.message);
      throw new Error('Failed to create payment in Asaas');
    }
  }

  static async getPaymentById(paymentId: string) {
    try {
      const response = await asaasApi.get(`/payments/${paymentId}`);
      return response.data;
    } catch (error: any) {
      console.error('Asaas getPaymentById error:', error.response?.data || error.message);
      throw new Error('Failed to fetch payment from Asaas');
    }
  }

  static async getBoleto(paymentId: string) {
    try {
      const response = await asaasApi.get(`/payments/${paymentId}/identificationField`);
      return response.data;
    } catch (error: any) {
      console.error('Asaas getBoleto error:', error.response?.data || error.message);
      throw new Error('Failed to fetch boleto from Asaas');
    }
  }

  static async getPaymentLink(paymentId: string) {
    try {
      const response = await asaasApi.get(`/payments/${paymentId}/paymentLink`);
      return response.data;
    } catch (error: any) {
      console.error('Asaas getPaymentLink error:', error.response?.data || error.message);
      throw new Error('Failed to fetch payment link from Asaas');
    }
  }
}
