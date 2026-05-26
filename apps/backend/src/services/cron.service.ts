import cron from 'node-cron';
import { SyncService } from './sync.service';
import { Tenant } from '../models';

export class CronService {
  static init() {
    console.log('📅 Cron Service initialized: Sync scheduled for every 12 hours.');

    cron.schedule('0 0,12 * * *', async () => {
      console.log('⏰ Starting automated sync with Asaas...');

      try {
        const tenants: any[] = await Tenant.find({ deletedAt: null }).lean();
        for (const tenant of tenants) {
          await SyncService.syncAll(tenant._id);
          console.log(`✅ Automated sync completed for tenant: ${tenant.name}`);
        }
      } catch (error) {
        console.error('❌ Error during automated sync:', error);
      }
    });
  }
}
