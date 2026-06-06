import axios from 'axios';
import { AsaasMonthCache } from '../models';

const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';

export const asaasApi = axios.create({
  baseURL: ASAAS_API_URL,
  headers: {
    'access_token': ASAAS_API_KEY,
    'Content-Type': 'application/json',
  },
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ymdToday = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Inclusive list of 'YYYY-MM' between two month keys.
function monthsBetween(startYM: string, endYM: string): string[] {
  const res: string[] = [];
  let [y, m] = startYM.split('-').map(Number);
  const [ey, em] = endYM.split('-').map(Number);
  let guard = 0;
  while ((y < ey || (y === ey && m <= em)) && guard++ < 1200) {
    res.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return res;
}

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

  static async getCustomerById(customerId: string) {
    try {
      const response = await asaasApi.get(`/customers/${customerId}`);
      return response.data;
    } catch (error: any) {
      console.error('Asaas getCustomerById error:', error.response?.data || error.message);
      throw new Error('Failed to fetch customer from Asaas');
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

  // Account statement (extrato). Each item carries a signed `value` (credit > 0,
  // debit < 0), a running `balance`, a `type` and a `date`.
  // Retries on Asaas rate-limiting (HTTP 429 / "limite de requisições") with
  // exponential backoff, so a long paginated pull doesn't fail or — worse —
  // silently drop pages and leave whole months missing from a reconciliation.
  static async listFinancialTransactions(
    params: {
      startDate?: string;
      finishDate?: string;
      offset?: number;
      limit?: number;
      order?: 'asc' | 'desc';
    },
    attempt = 0
  ): Promise<any> {
    try {
      const response = await asaasApi.get('/financialTransactions', { params });
      return response.data;
    } catch (error: any) {
      const status = error.response?.status;
      const body = JSON.stringify(error.response?.data || '');
      const rateLimited = status === 429 || /limite de requisi|temporariamente bloqueado/i.test(body);
      if (rateLimited && attempt < 6) {
        const wait = Math.min(30000, 2000 * 2 ** attempt); // 2s,4s,8s,16s,30s,30s
        await sleep(wait);
        return AsaasService.listFinancialTransactions(params, attempt + 1);
      }
      console.error('Asaas listFinancialTransactions error:', error.response?.data || error.message);
      throw new Error('Failed to fetch financial transactions from Asaas');
    }
  }

  // Pulls every statement entry in a date range, paginating in small parallel
  // batches with a gentle throttle between rounds. `startDate`/`finishDate` are
  // YYYY-MM-DD; omit startDate for all-time. A page that ultimately fails (after
  // retries) propagates and aborts the whole pull — we never return a partial
  // statement dressed up as complete.
  static async fetchAllTransactions(startDate?: string, finishDate?: string): Promise<any[]> {
    const PAGE = 100;
    const BATCH = 4; // parallel requests per round (respect Asaas rate limits)
    const ROUND_DELAY = 250; // ms between rounds
    const MAX_PAGES = 1200; // safety cap (~120k transactions)

    const baseParams: any = { order: 'asc' };
    if (startDate) baseParams.startDate = startDate;
    if (finishDate) baseParams.finishDate = finishDate;

    // First page to learn the total count.
    const first = await AsaasService.listFinancialTransactions({ ...baseParams, offset: 0, limit: PAGE });
    const all: any[] = first.data || [];
    const total: number = first.totalCount ?? all.length;

    const totalPages = Math.min(Math.ceil(total / PAGE), MAX_PAGES);
    for (let p = 1; p < totalPages; p += BATCH) {
      const rounds = [];
      for (let i = p; i < Math.min(p + BATCH, totalPages); i++) {
        rounds.push(
          AsaasService.listFinancialTransactions({ ...baseParams, offset: i * PAGE, limit: PAGE }).then(
            (r) => r.data || []
          )
        );
      }
      const results = await Promise.all(rounds);
      results.forEach((batch) => all.push(...batch));
      if (p + BATCH < totalPages) await sleep(ROUND_DELAY);
    }

    return all;
  }

  // Like fetchAllTransactions, but serves *closed* (fully-elapsed) calendar
  // months from the AsaasMonthCache collection — a past month never changes, so
  // it's fetched once and stored forever. Only the current month is pulled live.
  // Turns a 29k-transaction "desde o início" sweep into reading 40+ cached
  // months plus a few hundred live entries. `startDate` omitted = all-time.
  static async fetchTransactionsCached(startDate: string | undefined, finishDate: string): Promise<any[]> {
    // Resolve the window start. For all-time, anchor on the oldest entry.
    let start = startDate;
    if (!start) {
      const oldest = await AsaasService.listFinancialTransactions({ order: 'asc', offset: 0, limit: 1 });
      const first = (oldest.data || [])[0];
      if (!first) return [];
      start = first.date;
    }

    const todayYMD = ymdToday();
    const months = monthsBetween(start.slice(0, 7), finishDate.slice(0, 7));
    const out: any[] = [];

    for (const ym of months) {
      const [y, m] = ym.split('-').map(Number);
      const monthFirst = `${ym}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const monthLast = `${ym}-${String(lastDay).padStart(2, '0')}`;
      const closed = monthLast < todayYMD; // month fully in the past

      let txns: any[];
      if (closed) {
        const cached: any = await AsaasMonthCache.findOne({ month: ym }).lean();
        if (cached?.transactions) {
          txns = cached.transactions;
        } else {
          // Always fetch & cache the *whole* month, even if the request only
          // overlaps part of it — partial requests then filter from the cache.
          txns = await AsaasService.fetchAllTransactions(monthFirst, monthLast);
          await AsaasMonthCache.updateOne(
            { month: ym },
            { $set: { transactions: txns, count: txns.length, cachedAt: new Date() } },
            { upsert: true }
          ).catch(() => {});
        }
      } else {
        // Current (or future) month: always live, never cached.
        txns = await AsaasService.fetchAllTransactions(monthFirst, monthLast);
      }

      // Clamp to the requested [start..finishDate] window.
      for (const t of txns) {
        const d = (t.date || '').slice(0, 10);
        if (d >= start && d <= finishDate) out.push(t);
      }
    }

    return out;
  }

  static async getBalance(): Promise<number | null> {
    try {
      const response = await asaasApi.get('/finance/balance');
      return response.data?.balance ?? null;
    } catch (error: any) {
      console.error('Asaas getBalance error:', error.response?.data || error.message);
      return null;
    }
  }
}
