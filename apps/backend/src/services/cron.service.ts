import cron from 'node-cron';
import { SyncService } from './sync.service';
import prisma from '../config/prisma';

export class CronService {
  static init() {
    console.log('📅 Cron Service initialized: Sync scheduled for every 12 hours.');

    // Schedule: Every 12 hours (00:00 and 12:00)
    // cron.schedule('0 */12 * * *', async () => {
    
    // For testing/demonstration, we can run every minute, but as per user request:
    cron.schedule('0 0,12 * * *', async () => {
      console.log('⏰ Starting automated sync with Asaas...');
      
      try {
        // Fetch all tenants to sync each one
        const tenants = await prisma.tenant.findMany({ where: { deletedAt: null } });
        
        for (const tenant of tenants) {
          await SyncService.syncAll(tenant.id);
          console.log(`✅ Automated sync completed for tenant: ${tenant.name}`);
        }
      } catch (error) {
        console.error('❌ Error during automated sync:', error);
      }
    });
  }
}
