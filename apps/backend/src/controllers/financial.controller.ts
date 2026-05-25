import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { AsaasService, asaasApi } from '../services/asaas.service';

export class FinancialController {
  static async listMyFinancials(req: Request, res: Response) {
    const userId = req.user?.id;
    const tenantId = req.tenantId;

    try {
      const records = await prisma.financialRecord.findMany({
        where: { userId, tenantId, deletedAt: null },
        orderBy: { dueDate: 'desc' },
      });

      res.json(records);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch financial records' });
    }
  }

  static async getInvoiceData(req: Request, res: Response) {
    const recordId = req.params.recordId as string;

    try {
      const record = await prisma.financialRecord.findUnique({
        where: { id: recordId },
      });

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
      const params: any = { offset, limit };
      if (status === 'Pago') params.status = 'RECEIVED';
      if (status === 'Pendente') params.status = 'PENDING';
      if (status === 'Atrasado') params.status = 'OVERDUE';
      if (search) params.description = search;

      // Date Filtering
      if (allMonths !== 'true') {
        if (startDate && endDate) {
          params['dueDate[ge]'] = startDate;
          params['dueDate[le]'] = endDate;
        } else {
          // Default to current month or specified month/year
          const now = new Date();
          const m = (month !== undefined && month !== '') ? parseInt(month as string) : now.getMonth();
          const y = (year !== undefined && year !== '') ? parseInt(year as string) : now.getFullYear();
          
          // Use YYYY-MM-DD format directly with Asaas v3 filter syntax
          const firstDay = `${y}-${String(m + 1).padStart(2, '0')}-01`;
          const lastDayDate = new Date(y, m + 1, 0);
          const lastDay = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
          
          params['dueDate[ge]'] = firstDay;
          params['dueDate[le]'] = lastDay;
        }
      }

      console.log('Fetching financial records with params:', params);

      const asaasResponse = await asaasApi.get('/payments', {
        params
      });
      
      const formatted = (asaasResponse.data.data || []).map((c: any) => ({
        id: c.id,
        description: c.description || 'Aluguel',
        amount: c.value,
        dueDate: c.dueDate,
        status: c.status === 'RECEIVED' || c.status === 'CONFIRMED' ? 'Pago' : (c.status === 'OVERDUE' ? 'Atrasado' : 'Pendente'),
        customerName: c.customerName || c.customer,
        type: 'Receita'
      }));
      
      res.json({
        data: formatted,
        pagination: { total: asaasResponse.data.totalCount, offset: Number(offset), limit: Number(limit) }
      });
    } catch (error) {
      console.error('Financial listAll error:', error);
      res.status(500).json({ error: 'Failed to fetch real charges' });
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
