import { Request, Response } from 'express';
import { FinancialRecord, User, Tenant } from '../models';
import { AsaasService, asaasApi } from '../services/asaas.service';
import { ReconciliationService } from '../services/reconciliation.service';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtBr = (iso: string) => iso.split('-').reverse().join('/');

// Turn the reconciliation query (?all | ?startDate&endDate | ?month&year) into
// an Asaas date window. startDate omitted = since the account's first entry.
function resolvePeriod(q: any): { startDate?: string; finishDate: string; label: string } {
  const today = new Date();
  const finishToday = ymd(today);

  if (q.all === 'true') {
    return { finishDate: finishToday, label: 'Desde o início' };
  }
  if (q.startDate && q.endDate) {
    return { startDate: q.startDate, finishDate: q.endDate, label: `${fmtBr(q.startDate)} a ${fmtBr(q.endDate)}` };
  }
  const m = q.month !== undefined && q.month !== '' ? parseInt(q.month) : today.getMonth();
  const y = q.year !== undefined && q.year !== '' ? parseInt(q.year) : today.getFullYear();
  const first = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const last = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { startDate: first, finishDate: last, label: `${MONTH_NAMES[m]}/${y}` };
}

async function loadBranding(tenantId?: string) {
  const t: any = await Tenant.findById(tenantId).lean();
  if (!t) return { name: 'SLX Imobiliária' };
  let config: any = {};
  try {
    config = typeof t.config === 'string' ? JSON.parse(t.config) : t.config || {};
  } catch {
    config = {};
  }
  return { name: t.name, logoUrl: t.logoUrl, primaryColor: t.primaryColor, secondaryColor: t.secondaryColor, config };
}

// Human-readable, filesystem-safe download name: "conciliacao - {período}".
// Accents are stripped (keeps HTTP Content-Disposition headers ASCII-safe) and
// illegal path chars (/ \ : * ? " < > |) become "-".
const safeFilename = (label: string) =>
  `conciliacao - ${label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()}`;

// Maps an Asaas payment (charge) into the shape the frontend's invoice/boleto
// views expect. Used both for the listing and for a single user's boletos.
function formatBill(c: any) {
  return {
    id: c.id,
    description: c.description || 'Aluguel',
    amount: c.value,
    dueDate: c.dueDate,
    paymentDate: c.paymentDate || null,
    status:
      c.status === 'RECEIVED' || c.status === 'RECEIVED_IN_CASH' || c.status === 'CONFIRMED'
        ? 'Pago'
        : c.status === 'OVERDUE' || (c.dueDate && new Date(c.dueDate) < new Date())
        ? 'Atrasado'
        : 'Pendente',
    billingType: c.billingType || null,
    invoiceUrl: c.invoiceUrl || null,
    bankSlipUrl: c.bankSlipUrl || null,
    type: 'Receita',
  };
}

// Resolve a user identifier (either an Asaas customer id `cus_...` or an
// internal cuid) into the Asaas customer id, so we can query Asaas by customer.
async function resolveAsaasCustomerId(userId: string, tenantId?: string): Promise<string | null> {
  if (userId.toUpperCase().startsWith('CUS_')) return userId;
  const user: any = await User.findOne({ _id: userId, tenantId, deletedAt: null }).lean();
  return user?.asaasId || null;
}

export class FinancialController {
  static async listMyFinancials(req: Request, res: Response) {
    const userId = req.user?.id;
    const tenantId = req.tenantId;

    try {
      const records = await FinancialRecord.find({ userId, tenantId, deletedAt: null })
        .sort({ dueDate: -1 })
        .lean();

      res.json(records);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch financial records' });
    }
  }

  static async getInvoiceData(req: Request, res: Response) {
    const recordId = req.params.recordId as string;

    try {
      const record: any = await FinancialRecord.findById(recordId).lean();

      if (!record || record.tenantId !== req.tenantId) {
        return res.status(404).json({ error: 'Record not found' });
      }

      if (!record.asaasId) {
        return res.status(400).json({ error: 'No Asaas integration for this record' });
      }

      const asaasData = await AsaasService.getPaymentById(record.asaasId);
      const boletoData = await AsaasService.getBoleto(record.asaasId);

      res.json({ ...record, asaas: asaasData, boleto: boletoData });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch invoice data' });
    }
  }

  static async listAll(req: Request, res: Response) {
    const { offset = 0, limit = 20, status, search, startDate, endDate, month, year, allMonths } = req.query;
    try {
      // Status + date filters are shared by both search paths below.
      const baseParams: any = {};
      if (status === 'Pago') baseParams.status = 'RECEIVED';
      if (status === 'Pendente') baseParams.status = 'PENDING';
      if (status === 'Atrasado') baseParams.status = 'OVERDUE';

      // Date Filtering
      if (allMonths !== 'true') {
        if (startDate && endDate) {
          baseParams['dueDate[ge]'] = startDate;
          baseParams['dueDate[le]'] = endDate;
        } else {
          // Default to current month or specified month/year
          const now = new Date();
          const m = (month !== undefined && month !== '') ? parseInt(month as string) : now.getMonth();
          const y = (year !== undefined && year !== '') ? parseInt(year as string) : now.getFullYear();

          // Use YYYY-MM-DD format directly with Asaas v3 filter syntax
          const firstDay = `${y}-${String(m + 1).padStart(2, '0')}-01`;
          const lastDayDate = new Date(y, m + 1, 0);
          const lastDay = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;

          baseParams['dueDate[ge]'] = firstDay;
          baseParams['dueDate[le]'] = lastDay;
        }
      }

      let charges: any[] = [];
      let totalCount = 0;

      if (search && String(search).trim()) {
        // ── Unified search: by description AND by inquilino/cliente name ──
        // Asaas /payments can filter by description but not by customer name, so
        // we resolve the typed term into matching customer ids (local users +
        // Asaas customers), pull every boleto in the period, then keep the ones
        // whose description contains the term OR whose customer is a match.
        const term = String(search).trim();
        const termLower = term.toLowerCase();

        const candidateIds = new Set<string>();
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const localMatches: any[] = await User.find({
          tenantId: req.tenantId,
          deletedAt: null,
          name: { $regex: escaped, $options: 'i' },
          asaasId: { $exists: true, $ne: null },
        }).lean();
        localMatches.forEach((u) => u.asaasId && candidateIds.add(u.asaasId.toUpperCase()));

        try {
          const custResp = await asaasApi.get('/customers', { params: { name: term, limit: 100 } });
          (custResp.data.data || []).forEach((c: any) => c.id && candidateIds.add(c.id.toUpperCase()));
        } catch (e) {
          console.error('Customer name lookup failed:', e);
        }

        // Pull all boletos in the period (status + date already in baseParams),
        // capped so a broad date range can't pull an unbounded amount.
        const PAGE = 100;
        const MAX = 2000;
        const all: any[] = [];
        for (let off = 0; off < MAX; off += PAGE) {
          const r = await asaasApi.get('/payments', { params: { ...baseParams, offset: off, limit: PAGE } });
          const batch = r.data.data || [];
          all.push(...batch);
          if (batch.length < PAGE) break;
        }

        const filtered = all.filter(
          (p: any) =>
            (p.description && p.description.toLowerCase().includes(termLower)) ||
            (p.customer && candidateIds.has(p.customer.toUpperCase()))
        );
        filtered.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

        totalCount = filtered.length;
        const off = Number(offset);
        charges = filtered.slice(off, off + Number(limit));
      } else {
        const params: any = { ...baseParams, offset, limit };

        console.log('Fetching financial records with params:', params);

        const asaasResponse = await asaasApi.get('/payments', { params });
        charges = asaasResponse.data.data || [];
        totalCount = asaasResponse.data.totalCount;
      }

      // ── Resolve each charge's customer (Asaas id) → tenant/inquilino name ──
      // Asaas /payments only returns the customer id, not the name, so a boleto
      // by itself doesn't tell you whose it is. We map ids to people: first via
      // the local User collection (matched by asaasId), then falling back to the
      // Asaas customer record for ids we don't have locally.
      const customerIds: string[] = Array.from(
        new Set(charges.map((c: any) => c.customer).filter(Boolean))
      );

      const nameMap = new Map<string, { name: string; role: string; userId: string | null }>();

      if (customerIds.length > 0) {
        const localUsers: any[] = await User.find({
          tenantId: req.tenantId,
          asaasId: { $in: [...customerIds, ...customerIds.map((id) => id.toUpperCase())] },
        }).lean();
        for (const u of localUsers) {
          if (u.asaasId) {
            nameMap.set(u.asaasId.toUpperCase(), { name: u.name, role: u.role, userId: u._id });
          }
        }

        const missing = customerIds.filter((id) => !nameMap.has(id.toUpperCase()));
        await Promise.all(
          missing.map(async (id) => {
            try {
              const cust = await AsaasService.getCustomerById(id);
              nameMap.set(id.toUpperCase(), { name: cust?.name || id, role: '', userId: null });
            } catch {
              /* leave unresolved; we fall back to the raw id below */
            }
          })
        );
      }

      const formatted = charges.map((c: any) => {
        const info = c.customer ? nameMap.get(c.customer.toUpperCase()) : null;
        return {
          ...formatBill(c),
          customerName: info?.name || c.customer || 'Cliente',
          customerId: c.customer || null,
          customerRole: info?.role || null,
          userId: info?.userId || null,
        };
      });

      res.json({
        data: formatted,
        pagination: { total: totalCount, offset: Number(offset), limit: Number(limit) }
      });
    } catch (error) {
      console.error('Financial listAll error:', error);
      res.status(500).json({ error: 'Failed to fetch real charges' });
    }
  }

  static async listByUser(req: Request, res: Response) {
    const userId = req.params.userId as string;
    const tenantId = req.tenantId;

    try {
      const asaasId = await resolveAsaasCustomerId(userId, tenantId);
      if (!asaasId) {
        // User exists but has no Asaas integration → no boletos.
        return res.json([]);
      }

      const response = await asaasApi.get('/payments', {
        params: { customer: asaasId, limit: 100, order: 'desc' },
      });

      const bills = (response.data.data || []).map(formatBill);
      res.json(bills);
    } catch (error) {
      console.error('Financial listByUser error:', error);
      res.status(500).json({ error: 'Falha ao buscar boletos do usuário.' });
    }
  }

  // ── Bank reconciliation (extrato Asaas) ──
  static async getReconciliation(req: Request, res: Response) {
    try {
      const { startDate, finishDate, label } = resolvePeriod(req.query);
      const [transactions, currentBalance] = await Promise.all([
        AsaasService.fetchTransactionsCached(startDate, finishDate),
        AsaasService.getBalance(),
      ]);
      const report = ReconciliationService.aggregate(transactions, {
        startDate: startDate ?? null,
        finishDate,
        label,
        currentBalance,
      });
      res.json(report);
    } catch (error) {
      console.error('Reconciliation error:', error);
      res.status(500).json({ error: 'Falha ao gerar conciliação bancária.' });
    }
  }

  static async exportReconciliationPdf(req: Request, res: Response) {
    try {
      const { startDate, finishDate, label } = resolvePeriod(req.query);
      const [transactions, currentBalance, branding] = await Promise.all([
        AsaasService.fetchTransactionsCached(startDate, finishDate),
        AsaasService.getBalance(),
        loadBranding(req.tenantId),
      ]);
      const report = ReconciliationService.aggregate(transactions, {
        startDate: startDate ?? null,
        finishDate,
        label,
        currentBalance,
      });
      const pdf = await ReconciliationService.generatePdf(report, branding);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename(label)}.pdf"`,
        'Content-Length': String(pdf.length),
      });
      res.send(pdf);
    } catch (error) {
      console.error('Reconciliation PDF error:', error);
      res.status(500).json({ error: 'Falha ao gerar PDF da conciliação.' });
    }
  }

  static async exportReconciliationExcel(req: Request, res: Response) {
    try {
      const { startDate, finishDate, label } = resolvePeriod(req.query);
      const [transactions, currentBalance, branding] = await Promise.all([
        AsaasService.fetchTransactionsCached(startDate, finishDate),
        AsaasService.getBalance(),
        loadBranding(req.tenantId),
      ]);
      const report = ReconciliationService.aggregate(transactions, {
        startDate: startDate ?? null,
        finishDate,
        label,
        currentBalance,
      });
      const xlsx = await ReconciliationService.generateExcel(report, branding);
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${safeFilename(label)}.xlsx"`,
        'Content-Length': String(xlsx.length),
      });
      res.send(xlsx);
    } catch (error) {
      console.error('Reconciliation Excel error:', error);
      res.status(500).json({ error: 'Falha ao gerar Excel da conciliação.' });
    }
  }

  static async syncWithAsaas(req: Request, res: Response) {
    try {
      const charges = await AsaasService.listCharges();
      // Logic to sync with Prisma would go here
      res.json({ message: 'Sync successful', charges: charges.data });
    } catch (error) {
      res.status(500).json({ error: 'Sync failed' });
    }
  }
}
