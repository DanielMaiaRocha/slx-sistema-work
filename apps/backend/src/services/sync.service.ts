import { AsaasService } from './asaas.service';
import { User, FinancialRecord, Role, FinancialStatus, FinancialType, FinancialStatusType } from '../models';
import bcrypt from 'bcryptjs';

export class SyncService {
  static async syncAll(tenantId: string) {
    console.log(`Starting full sync for tenant: ${tenantId}`);
    const customersResult = await this.syncUsers(tenantId);
    const paymentsResult = await this.syncPayments(tenantId);
    return { users: customersResult, payments: paymentsResult };
  }

  private static async syncUsers(tenantId: string) {
    try {
      const response = await (AsaasService as any).asaasApi.get('/customers');
      const customers = response.data.data;

      let imported = 0;
      for (const customer of customers) {
        const cleanCpf = customer.cpfCnpj ? customer.cpfCnpj.replace(/\D/g, '') : null;
        const existingUser: any = await User.findOne({
          $or: [
            customer.email ? { email: customer.email } : null,
            cleanCpf ? { cpf: cleanCpf } : null,
            { asaasId: customer.id },
          ].filter(Boolean),
          tenantId,
        }).lean();

        if (!existingUser) {
          await User.create({
            email: customer.email || `${customer.id}@asaas-sync.com`,
            name: customer.name,
            cpf: cleanCpf,
            phone: customer.mobilePhone || customer.phone,
            password: await bcrypt.hash('SLX_SYNC_TEMP_PWD', 10),
            role: Role.TENANT,
            tenantId,
            asaasId: customer.id,
          });
          imported++;
        } else if (!existingUser.asaasId || !existingUser.cpf) {
          await User.findByIdAndUpdate(existingUser._id, {
            asaasId: customer.id,
            cpf: existingUser.cpf || cleanCpf,
            phone: existingUser.phone || customer.mobilePhone || customer.phone,
          });
        }
      }
      return { total: customers.length, imported };
    } catch (error) {
      console.error('Sync users error:', error);
      throw error;
    }
  }

  private static async syncPayments(tenantId: string) {
    try {
      const response = await (AsaasService as any).asaasApi.get('/payments');
      const payments = response.data.data;

      let imported = 0;
      for (const payment of payments) {
        try {
          const existingRecord: any = await FinancialRecord.findOne({ asaasId: payment.id }).lean();
          if (!existingRecord) {
            const user: any = await User.findOne({ asaasId: payment.customer }).lean();
            if (!user) {
              console.warn(`⚠️ Sync: Skipping payment ${payment.id} - Customer ${payment.customer} not found locally.`);
              continue;
            }

            await FinancialRecord.create({
              description: payment.description || 'Cobrança Asaas',
              amount: payment.value,
              dueDate: new Date(payment.dueDate),
              status: this.mapStatus(payment.status),
              type: FinancialType.INCOME,
              asaasId: payment.id,
              asaasUrl: payment.invoiceUrl,
              tenantId,
              userId: user._id,
            });
            imported++;
          }
        } catch (dbError) {
          console.warn('⚠️ Sync: Could not save record to database. Continuing...');
        }
      }
      return { total: payments.length, imported };
    } catch (error) {
      console.error('Sync payments error:', error);
      throw error;
    }
  }

  private static mapStatus(asaasStatus: string): FinancialStatusType {
    switch (asaasStatus) {
      case 'RECEIVED':
      case 'CONFIRMED':
        return FinancialStatus.PAID;
      case 'OVERDUE':
        return FinancialStatus.OVERDUE;
      case 'CANCELLED':
        return FinancialStatus.CANCELLED;
      default:
        return FinancialStatus.PENDING;
    }
  }
}
