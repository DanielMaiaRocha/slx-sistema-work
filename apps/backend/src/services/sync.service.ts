import { AsaasService } from './asaas.service';
import prisma from '../config/prisma';
import { Role, FinancialStatus, FinancialType } from '@prisma/client';
import bcrypt from 'bcryptjs';

export class SyncService {
  static async syncAll(tenantId: string) {
    console.log(`Starting full sync for tenant: ${tenantId}`);
    
    const customersResult = await this.syncUsers(tenantId);
    const paymentsResult = await this.syncPayments(tenantId);

    return {
      users: customersResult,
      payments: paymentsResult,
    };
  }

  private static async syncUsers(tenantId: string) {
    try {
      // In a real scenario, we'd paginate through all customers
      const response = await (AsaasService as any).asaasApi.get('/customers');
      const customers = response.data.data;

      let imported = 0;
      for (const customer of customers) {
        // Find or create user by email or CPF
        const existingUser = await prisma.user.findFirst({
          where: { 
            OR: [
              { email: customer.email },
              { cpf: customer.cpfCnpj ? customer.cpfCnpj.replace(/\D/g, '') : undefined },
              { asaasId: customer.id }
            ],
            tenantId 
          }
        });

        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: customer.email || `${customer.id}@asaas-sync.com`,
              name: customer.name,
              cpf: customer.cpfCnpj ? customer.cpfCnpj.replace(/\D/g, '') : null,
              phone: customer.mobilePhone || customer.phone,
              password: await bcrypt.hash('SLX_SYNC_TEMP_PWD', 10),
              role: Role.TENANT,
              tenantId,
              asaasId: customer.id
            }
          });
          imported++;
        } else if (!existingUser.asaasId || !existingUser.cpf) {
          // Update existing user with Asaas data if missing
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              asaasId: customer.id,
              cpf: existingUser.cpf || (customer.cpfCnpj ? customer.cpfCnpj.replace(/\D/g, '') : null),
              phone: existingUser.phone || (customer.mobilePhone || customer.phone)
            }
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
          const existingRecord = await prisma.financialRecord.findUnique({
            where: { asaasId: payment.id }
          });

          if (!existingRecord) {
            // Find local user for this payment
            const user = await prisma.user.findFirst({
              where: { asaasId: payment.customer }
            });

            if (!user) {
              console.warn(`⚠️ Sync: Skipping payment ${payment.id} - Customer ${payment.customer} not found locally.`);
              continue;
            }

            await prisma.financialRecord.create({
              data: {
                description: payment.description || 'Cobrança Asaas',
                amount: payment.value,
                dueDate: new Date(payment.dueDate),
                status: this.mapStatus(payment.status),
                type: FinancialType.INCOME,
                asaasId: payment.id,
                asaasUrl: payment.invoiceUrl,
                tenantId,
                userId: user.id,
              }
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

  private static mapStatus(asaasStatus: string): FinancialStatus {
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
