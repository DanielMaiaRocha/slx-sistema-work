import { Request, Response } from 'express';
import { asaasApi } from '../services/asaas.service';
import prisma from '../config/prisma';
import { Role } from '@prisma/client';

export class DashboardController {
  static async getStats(req: Request, res: Response) {
    try {
      console.log('📊 Starting dashboard stats generation...');
      const { month, year } = req.query;
      const now = new Date();
      const m = (month !== undefined && month !== '') ? parseInt(month as string) : now.getMonth();
      const y = (year !== undefined && year !== '') ? parseInt(year as string) : now.getFullYear();

      const firstDay = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      const lastDayDate = new Date(y, m + 1, 0);
      const lastDay = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;

      console.log(`🔍 Filtering month: ${m+1}/${y} (${firstDay} to ${lastDay})`);

      // 1. Total Boletos (Robust fetch)
      let totalBoletos = 0;
      try {
        const asaasResponse = await asaasApi.get('/payments', {
          params: { 'dueDate[ge]': firstDay, 'dueDate[le]': lastDay, limit: 1 }
        });
        totalBoletos = asaasResponse.data.totalCount || 0;
      } catch (err: any) {
        console.error('⚠️ Failed to fetch boletos count:', err.message);
      }

      // 2. Fetch User counts
      let asaasTotal = 0;
      try {
        const asaasCustomersRes = await asaasApi.get('/customers', { params: { limit: 1 } });
        asaasTotal = asaasCustomersRes.data.totalCount || 0;
      } catch (err: any) {
        console.error('⚠️ Failed to fetch asaas customers:', err.message);
      }

      let totalOwners = 0;
      let totalAdmins = 0;
      try {
        const [o, a] = await Promise.all([
          prisma.user.count({ where: { tenantId: req.tenantId, role: Role.OWNER } }),
          prisma.user.count({ where: { tenantId: req.tenantId, role: Role.ADMIN } }),
        ]);
        totalOwners = o;
        totalAdmins = a;
      } catch (err: any) {
        console.error('⚠️ Failed to fetch local counts:', err.message);
      }

      const totalUsers = asaasTotal || 0; 
      const totalTenants = Math.max(0, asaasTotal - totalOwners);

      // 3. Sync time
      let lastSyncLog = null;
      try {
        lastSyncLog = await prisma.log.findFirst({
          where: { tenantId: req.tenantId, action: 'SYNC_SUCCESS' },
          orderBy: { createdAt: 'desc' }
        });
      } catch (err: any) {}

      // 4. Financial totals
      let receivedValue = 0;
      let pendingValue = 0;
      let overdueValue = 0;
      try {
        const paymentsResponse = await asaasApi.get('/payments', {
          params: { 'dueDate[ge]': firstDay, 'dueDate[le]': lastDay, limit: 100 }
        });
        const payments = paymentsResponse.data.data || [];
        payments.forEach((p: any) => {
          if (p.status === 'RECEIVED' || p.status === 'CONFIRMED') receivedValue += p.value;
          else if (p.status === 'PENDING') pendingValue += p.value;
          else if (p.status === 'OVERDUE') overdueValue += p.value;
        });
      } catch (err: any) {
        console.error('⚠️ Failed to fetch financial totals:', err.message);
      }

      let walletBalance = 0;
      try {
        const balanceRes = await asaasApi.get('/finance/balance');
        walletBalance = balanceRes.data.balance || 0;
      } catch (err: any) {
        console.error('⚠️ Failed to fetch wallet balance:', err.message);
      }

      console.log('✅ Dashboard stats generated (with fallbacks if needed)');

      res.json({
        welcomeName: req.user?.name || 'Administrador',
        lastSync: lastSyncLog?.createdAt || new Date(Date.now() - 5 * 60000).toISOString(),
        counts: {
          boletos: totalBoletos,
          users: totalUsers,
          owners: totalOwners,
          tenants: totalTenants
        },
        financial: {
          balance: walletBalance,
          received: receivedValue,
          pending: pendingValue,
          overdue: overdueValue
        },
        debug: {
          asaasTotal,
          totalOwners,
          tenantId: req.tenantId
        }
      });
    } catch (error: any) {
      console.error('❌ [Dashboard Critical Error]:', error.message);
      res.status(500).json({ 
        error: 'Erro crítico ao carregar estatísticas',
        details: error.message
      });
    }
  }
}
